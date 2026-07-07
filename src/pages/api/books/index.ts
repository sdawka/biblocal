import type { APIRoute } from 'astro';

export const prerender = false;
import { eq, and, inArray } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { getDb } from '../../../db/client';
import { books, bookNotes } from '../../../db/schema';
import type { Database } from '../../../db/client';
import { getUserId } from '../../../lib/auth';
import { getOrCreateUser } from '../../../db/users';
import {
  validateEnum,
  validateIntents,
  VALID_VISIBILITY,
  VALID_OWNERSHIP,
  VALID_STATUS,
  VALID_ADDED_VIA,
} from '../../../lib/validation';

type Env = { DB: D1Database };

function generateId(): string {
  return crypto.randomUUID();
}

// Attach a `notes` array to each book. When `publicOnly` is true, only notes
// marked visible are included (private notes never leave the server).
async function withNotes<T extends { id: string }>(
  db: Database,
  rows: T[],
  publicOnly: boolean
): Promise<(T & { notes: unknown[] })[]> {
  const ids = rows.map((b) => b.id);
  if (ids.length === 0) return rows.map((b) => ({ ...b, notes: [] }));

  const where = publicOnly
    ? and(inArray(bookNotes.bookId, ids), eq(bookNotes.visibility, 'visible'))
    : inArray(bookNotes.bookId, ids);

  const notes = await db
    .select({
      id: bookNotes.id,
      bookId: bookNotes.bookId,
      text: bookNotes.text,
      visibility: bookNotes.visibility,
      createdAt: bookNotes.createdAt,
    })
    .from(bookNotes)
    .where(where);

  const byBook = new Map<string, unknown[]>();
  for (const n of notes) {
    const { bookId, ...note } = n;
    if (!byBook.has(bookId)) byBook.set(bookId, []);
    byBook.get(bookId)!.push(note);
  }

  return rows.map((b) => ({ ...b, notes: byBook.get(b.id) ?? [] }));
}

// GET /api/books - all books (public)
// GET /api/books?mine=true - only my books (requires auth)
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const db = getDb((env as Env).DB);
    const url = new URL(request.url);
    const mine = url.searchParams.get('mine') === 'true';

    if (mine) {
      const userId = getUserId(locals);
      if (!userId) {
        return new Response(JSON.stringify({ error: 'Not authenticated' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const userBooks = await db
        .select()
        .from(books)
        .where(eq(books.userId, userId));

      // Owner sees all their notes (private + visible)
      const withUserNotes = await withNotes(db, userBooks, false);

      return new Response(JSON.stringify({ books: withUserNotes }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Public - all visible books with pagination (excludes private books)
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 500);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    const allBooks = await db
      .select()
      .from(books)
      .where(eq(books.visibility, 'visible'))
      .limit(limit)
      .offset(offset);
    // Public listing: only visible notes are exposed
    const withPublicNotes = await withNotes(db, allBooks, true);
    return new Response(JSON.stringify({ books: withPublicNotes, pagination: { limit, offset } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Get books error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST /api/books - add book (requires auth)
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const userId = getUserId(locals);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDb((env as Env).DB);
    await getOrCreateUser(db, userId);

    const body = (await request.json()) as {
      id?: string;
      title?: string;
      author?: string;
      isbn?: string;
      coverUrl?: string;
      status?: string;
      visibility?: 'private' | 'visible';
      ownership?: 'have' | 'seeking';
      intents?: string[] | string;
      addedVia?: string;
      subjects?: string[];
      notes?: string;
    };

    if (!body.title || !body.author) {
      return new Response(JSON.stringify({ error: 'Title and author required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate enum fields: default when omitted, reject when present-but-invalid.
    let visibility: string = 'visible';
    if (body.visibility !== undefined) {
      const valid = validateEnum(body.visibility, VALID_VISIBILITY);
      if (valid === null) {
        return new Response(
          JSON.stringify({ error: `Invalid visibility value. Must be one of: ${VALID_VISIBILITY.join(', ')}` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      visibility = valid;
    }

    let ownership: string = 'have';
    if (body.ownership !== undefined) {
      const valid = validateEnum(body.ownership, VALID_OWNERSHIP);
      if (valid === null) {
        return new Response(
          JSON.stringify({ error: `Invalid ownership value. Must be one of: ${VALID_OWNERSHIP.join(', ')}` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      ownership = valid;
    }

    let status: string = 'visible';
    if (body.status !== undefined) {
      const valid = validateEnum(body.status, VALID_STATUS);
      if (valid === null) {
        return new Response(
          JSON.stringify({ error: `Invalid status value. Must be one of: ${VALID_STATUS.join(', ')}` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      status = valid;
    }

    // Server-side dedup: if this user already has a book with the same ISBN,
    // return it instead of inserting a duplicate (idempotent re-adds).
    if (body.isbn) {
      const dupes = await db
        .select()
        .from(books)
        .where(and(eq(books.userId, userId), eq(books.isbn, body.isbn)))
        .limit(1);
      if (dupes.length > 0) {
        // Attach notes so the shape matches every other book response.
        const [withDupeNotes] = await withNotes(db, dupes, false);
        return new Response(JSON.stringify({ book: withDupeNotes }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    const now = new Date();

    // If the client supplied an id, check whether it already exists.
    // Same user re-posting the same id → return the existing book (idempotent).
    // A different user owns that id → generate a fresh one so we don't leak its existence.
    let bookId = body.id || generateId();
    if (body.id) {
      const [existingById] = await db.select().from(books).where(eq(books.id, body.id)).limit(1);
      if (existingById) {
        if (existingById.userId === userId) {
          const [withExistingNotes] = await withNotes(db, [existingById], false);
          return new Response(JSON.stringify({ book: withExistingNotes }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        bookId = generateId();
      }
    }

    // Coerce invalid addedVia to 'manual' (same as import.ts does for visibility/ownership).
    // addedVia is a provenance field, not a user-facing control, so coercion is preferable
    // to rejecting the whole create request.
    const addedVia = body.addedVia
      ? (validateEnum(body.addedVia, VALID_ADDED_VIA) ?? 'manual')
      : 'manual';

    const book = {
      id: bookId,
      userId: userId,
      title: body.title,
      author: body.author,
      isbn: body.isbn || null,
      coverUrl: body.coverUrl || null,
      status,
      visibility,
      ownership,
      intents: JSON.stringify(validateIntents(body.intents)),
      addedVia,
      subjects: body.subjects ? JSON.stringify(body.subjects) : null,
      notes: body.notes || null,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(books).values(book);

    // Fetch the persisted DB row and attach structured notes (BookNote[]) so
    // the 201 response shape matches GET /api/books?mine=true. Without this,
    // `notes` in the response is the legacy books.notes text column (null on
    // create) while GET returns `notes` as a BookNote[] via withNotes().
    const insertedRows = await db.select().from(books).where(eq(books.id, bookId)).limit(1);
    const noteRows = await db
      .select({
        id: bookNotes.id,
        bookId: bookNotes.bookId,
        text: bookNotes.text,
        visibility: bookNotes.visibility,
        createdAt: bookNotes.createdAt,
      })
      .from(bookNotes)
      .where(eq(bookNotes.bookId, bookId));
    const notes = noteRows.map(({ bookId: _bkId, ...n }) => n);

    return new Response(JSON.stringify({ book: { ...insertedRows[0], notes } }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Add book error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
