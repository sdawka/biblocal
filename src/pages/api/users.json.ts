import type { APIRoute } from 'astro';
import { and, asc, desc, eq, isNotNull, lte, ne, sql } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { getDb } from '../../db/client';
import { books, users } from '../../db/schema';
import { getUserId } from '../../lib/auth';
import type { Book, BookIntent, BookOwnership, BookVisibility, UserProfile } from '../../lib/types';
import { safeJsonArray } from '../../lib/validation';
import { getCityCoordinates } from '../../lib/geo';

export const prerender = false;

type Env = { DB: D1Database };
const PROFILE_LIMIT = 500;
const BOOKS_PER_OWNER_LIMIT = 100;
type DiscoveryUserRow = Pick<
  typeof users.$inferSelect,
  'id' | 'name' | 'city' | 'radiusKm' | 'borrowStyle' | 'currentObsessions' | 'topicsCurated' | 'topicsFreeform' | 'type' | 'address' | 'neighborhood' | 'website' | 'specialties' | 'latitude' | 'longitude' | 'locationPrecision' | 'contactMethod' | 'contactValue' | 'contactVisibility'
>;
type DiscoveryBookRow = Pick<
  typeof books.$inferSelect,
  'id' | 'userId' | 'isbn' | 'title' | 'author' | 'visibility' | 'ownership' | 'intents' | 'subjects' | 'coverUrl' | 'addedVia' | 'createdAt'
>;

const isBookIntent = (value: unknown): value is BookIntent =>
  value === 'borrowable' || value === 'discussable' || value === 'giftable';
const isBookVisibility = (value: unknown): value is BookVisibility => value === 'private' || value === 'visible';
const isBookOwnership = (value: unknown): value is BookOwnership => value === 'have' || value === 'seeking';

function stringArray(value: string | null): string[] {
  return safeJsonArray(value).filter((item): item is string => typeof item === 'string');
}

function projectBook(book: DiscoveryBookRow): Book {
  return {
    id: book.id,
    isbn: book.isbn ?? undefined,
    title: book.title,
    author: book.author,
    visibility: isBookVisibility(book.visibility) ? book.visibility : 'visible',
    ownership: isBookOwnership(book.ownership) ? book.ownership : 'have',
    intents: safeJsonArray(book.intents).filter(isBookIntent),
    subjects: stringArray(book.subjects),
    coverUrl: book.coverUrl ?? undefined,
    addedVia: book.addedVia === 'scan' || book.addedVia === 'goodreads' ? book.addedVia : 'manual',
    addedAt: book.createdAt.getTime(),
  };
}

function projectUser(user: DiscoveryUserRow, shelf: Book[]): UserProfile {
  const profile: UserProfile = {
    id: user.id,
    name: user.name!,
    city: user.city ?? '',
    radiusKm: user.radiusKm ?? 5,
    topics: {
      curated: stringArray(user.topicsCurated),
      freeform: stringArray(user.topicsFreeform),
      inferred: [],
    },
    borrowStyle: user.borrowStyle ?? undefined,
    currentObsessions: stringArray(user.currentObsessions),
    type: user.type === 'bookstore' ? 'bookstore' : 'person',
    shelf,
  };

  if (profile.type === 'bookstore') {
    profile.neighborhood = user.neighborhood ?? undefined;
    profile.address = user.address ?? undefined;
    profile.website = user.website ?? undefined;
    profile.specialties = stringArray(user.specialties);
    profile.latitude = user.latitude ?? undefined;
    profile.longitude = user.longitude ?? undefined;
    profile.locationPrecision =
      user.locationPrecision === 'exact' || user.locationPrecision === 'approximate' || user.locationPrecision === 'city'
        ? user.locationPrecision
        : undefined;
  } else {
    if (user.latitude !== null && user.longitude !== null) {
      const cityCoordinates = getCityCoordinates(profile.city);
      if (cityCoordinates) {
        profile.latitude = cityCoordinates.lat;
        profile.longitude = cityCoordinates.lng;
        profile.locationPrecision = 'city';
      }
    }
  }

  if (user.contactVisibility === 'public') {
    profile.contactVisibility = 'public';
    if (user.contactMethod === 'email' || user.contactMethod === 'social' || user.contactMethod === 'custom') {
      profile.contactMethod = user.contactMethod;
    }
    if (user.contactValue) profile.contactValue = user.contactValue;
  } else if (user.contactVisibility === 'hidden' || user.contactVisibility === 'on-request') {
    profile.contactVisibility = user.contactVisibility;
  }

  return profile;
}

// Public discovery feed. It projects database records through an allowlist so
// credentials and private profile/book metadata never reach the map.
export const GET: APIRoute = async ({ locals }) => {
  try {
    const db = getDb((env as Env).DB);
    const viewerId = getUserId(locals);
    const conditions = [isNotNull(users.name), sql`trim(${users.name}) <> ''`];
    if (viewerId) conditions.push(ne(users.id, viewerId));

    const candidateUsersQuery = db
      .select({
        id: users.id,
        name: users.name,
        city: users.city,
        radiusKm: users.radiusKm,
        borrowStyle: users.borrowStyle,
        currentObsessions: users.currentObsessions,
        topicsCurated: users.topicsCurated,
        topicsFreeform: users.topicsFreeform,
        type: users.type,
        address: users.address,
        neighborhood: users.neighborhood,
        website: users.website,
        specialties: users.specialties,
        latitude: users.latitude,
        longitude: users.longitude,
        locationPrecision: users.locationPrecision,
        contactMethod: users.contactMethod,
        contactValue: users.contactValue,
        contactVisibility: users.contactVisibility,
      })
      .from(users)
      .where(and(...conditions))
      .orderBy(asc(users.name), asc(users.id))
      .limit(PROFILE_LIMIT);

    // Reuse the bounded eligible-user query as a SQL subquery. This stays
    // below D1's parameter cap, avoids N+1 reads, and never reads books from
    // owners outside the discovery profile limit.
    const eligibleCandidates = db
      .select({ id: users.id })
      .from(users)
      .where(and(...conditions))
      .orderBy(asc(users.name), asc(users.id))
      .limit(PROFILE_LIMIT)
      .as('eligible_candidates');
    const rankedVisibleBooks = db
      .select({
        id: books.id,
        userId: books.userId,
        isbn: books.isbn,
        title: books.title,
        author: books.author,
        visibility: books.visibility,
        ownership: books.ownership,
        intents: books.intents,
        subjects: books.subjects,
        coverUrl: books.coverUrl,
        addedVia: books.addedVia,
        createdAt: books.createdAt,
        ownerBookRank: sql<number>`row_number() over (partition by ${books.userId} order by ${books.createdAt} desc, ${books.id} desc)`.as('owner_book_rank'),
      })
      .from(books)
      .innerJoin(eligibleCandidates, eq(books.userId, eligibleCandidates.id))
      .where(eq(books.visibility, 'visible'))
      .as('ranked_visible_books');
    const visibleBooksQuery = db
      .select({
        id: rankedVisibleBooks.id,
        userId: rankedVisibleBooks.userId,
        isbn: rankedVisibleBooks.isbn,
        title: rankedVisibleBooks.title,
        author: rankedVisibleBooks.author,
        visibility: rankedVisibleBooks.visibility,
        ownership: rankedVisibleBooks.ownership,
        intents: rankedVisibleBooks.intents,
        subjects: rankedVisibleBooks.subjects,
        coverUrl: rankedVisibleBooks.coverUrl,
        addedVia: rankedVisibleBooks.addedVia,
        createdAt: rankedVisibleBooks.createdAt,
      })
      .from(rankedVisibleBooks)
      .where(lte(rankedVisibleBooks.ownerBookRank, BOOKS_PER_OWNER_LIMIT))
      .orderBy(asc(rankedVisibleBooks.userId), desc(rankedVisibleBooks.createdAt), desc(rankedVisibleBooks.id));
    const [candidateUsers, visibleBooks] = await db.batch([candidateUsersQuery, visibleBooksQuery]);
    if (candidateUsers.length === 0) return Response.json([]);

    const shelfByOwner = new Map<string, Book[]>();
    for (const book of visibleBooks) {
      const shelf = shelfByOwner.get(book.userId) ?? [];
      shelf.push(projectBook(book));
      shelfByOwner.set(book.userId, shelf);
    }

    return Response.json(candidateUsers.map((user) => projectUser(user, shelfByOwner.get(user.id) ?? [])));
  } catch (error) {
    console.error('Get discovery users error:', error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
};
