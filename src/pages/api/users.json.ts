import type { APIRoute } from 'astro';
import type { Book, UserProfile } from '../../lib/types';
import seedUsers from '../../data/seed-users.json';

// This endpoint is intentionally PUBLIC — it powers the production discovery map.
// To make sure no sensitive field can ever leak through (e.g. a raw email or an
// on-request/hidden contact value left in source data), we project each record
// through an explicit allowlist of map-safe fields rather than spreading the
// source object. Contact details are only emitted when the user opted into
// `public` visibility, and raw email is never emitted.

// Only the book fields the map / match algorithm actually read.
function projectBook(book: Partial<Book>): Partial<Book> {
  return {
    id: book.id,
    isbn: book.isbn,
    title: book.title,
    author: book.author,
    visibility: book.visibility,
    ownership: book.ownership,
    intents: book.intents,
    subjects: book.subjects,
    coverUrl: book.coverUrl,
    addedVia: book.addedVia,
    addedAt: book.addedAt,
  };
}

function projectUser(user: Partial<UserProfile>): Partial<UserProfile> {
  const out: Partial<UserProfile> = {
    id: user.id,
    name: user.name,
    city: user.city,
    radiusKm: user.radiusKm,
    latitude: user.latitude,
    longitude: user.longitude,
    locationPrecision: user.locationPrecision,
    topics: user.topics,
    borrowStyle: user.borrowStyle,
    currentObsessions: user.currentObsessions,
    type: user.type,
    // Store-specific public fields the map card renders.
    neighborhood: user.neighborhood,
    address: user.address,
    website: user.website,
    specialties: user.specialties,
    shelf: Array.isArray(user.shelf) ? user.shelf.map(projectBook) as Book[] : undefined,
  };

  // Contact: surface it only when the person has chosen `public`. Anything else
  // (hidden / on-request) and the raw email are never sent to the client.
  if (user.contactVisibility) {
    out.contactVisibility = user.contactVisibility;
    if (user.contactVisibility === 'public') {
      out.contactMethod = user.contactMethod;
      out.contactValue = user.contactValue;
    }
  }

  return out;
}

export const GET: APIRoute = () => {
  const safeUsers = (seedUsers as Partial<UserProfile>[]).map(projectUser);
  return new Response(JSON.stringify(safeUsers), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
};
