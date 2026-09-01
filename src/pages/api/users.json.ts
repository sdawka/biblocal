import type { APIRoute } from 'astro';
import { and, eq, isNotNull, ne } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { getDb } from '../../db/client';
import { books, users } from '../../db/schema';
import { getUserId } from '../../lib/auth';
import type { Book, BookIntent, BookOwnership, BookVisibility, UserProfile } from '../../lib/types';
import { safeJsonArray } from '../../lib/validation';

export const prerender = false;

type Env = { DB: D1Database };

const isBookIntent = (value: unknown): value is BookIntent =>
  value === 'borrowable' || value === 'discussable' || value === 'giftable';
const isBookVisibility = (value: unknown): value is BookVisibility => value === 'private' || value === 'visible';
const isBookOwnership = (value: unknown): value is BookOwnership => value === 'have' || value === 'seeking';

function stringArray(value: string | null): string[] {
  return safeJsonArray(value).filter((item): item is string => typeof item === 'string');
}

function projectBook(book: typeof books.$inferSelect): Book {
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

function projectUser(user: typeof users.$inferSelect, shelf: Book[]): UserProfile {
  const profile: UserProfile = {
    id: user.id,
    name: user.name!,
    city: user.city ?? '',
    radiusKm: user.radiusKm ?? 5,
    latitude: user.latitude ?? undefined,
    longitude: user.longitude ?? undefined,
    locationPrecision:
      user.locationPrecision === 'exact' || user.locationPrecision === 'approximate' || user.locationPrecision === 'city'
        ? user.locationPrecision
        : undefined,
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
    const conditions = [isNotNull(users.name), ne(users.name, '')];
    if (viewerId) conditions.push(ne(users.id, viewerId));

    const candidateUsers = await db.select().from(users).where(and(...conditions));
    if (candidateUsers.length === 0) return Response.json([]);

    // D1 permits at most 100 bound parameters. Query all visible books once,
    // then retain only discovery candidates in memory rather than expanding an
    // `IN` list per candidate. This stays two queries and avoids N+1 reads.
    const candidateIds = new Set(candidateUsers.map((user) => user.id));
    const visibleBooks = await db.select().from(books).where(eq(books.visibility, 'visible'));

    const shelfByOwner = new Map<string, Book[]>();
    for (const book of visibleBooks) {
      if (!candidateIds.has(book.userId)) continue;
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
