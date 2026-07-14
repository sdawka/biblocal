import type { APIRoute } from 'astro';

export const prerender = false;
import { eq, and } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { getDb } from '../../../db/client';
import { books, bookNotes } from '../../../db/schema';
import { getUserId } from '../../../lib/auth';
import {
  validateEnum,
  validateIntents,
  VALID_VISIBILITY,
  VALID_OWNERSHIP,
  VALID_INTENTS,
  VALID_STATUS,
} from '../../../lib/validation';
import { isHostedCoverUrl, hostedImageIdFromUrl } from '../../../lib/coverImages';

type Env = { DB: D1Database };

type ImagesEnv = {
  IMAGES?: { hosted: { image(id: string): { delete(): Promise<boolean> } } };
};

// PATCH /api/books/:id - update book (owner only)
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  try {
    const userId = getUserId(locals);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDb((env as Env).DB);
    const bookId = params.id;
    if (!bookId) {
      return new Response(JSON.stringify({ error: 'Book ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check ownership
    const existing = await db
      .select()
      .from(books)
      .where(and(eq(books.id, bookId), eq(books.userId, userId)))
      .limit(1);

    if (existing.length === 0) {
      return new Response(JSON.stringify({ error: 'Book not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const updates = (await request.json()) as Record<string, unknown>;

    // Validate enum fields before processing
    if (updates.visibility !== undefined) {
      const valid = validateEnum(updates.visibility, VALID_VISIBILITY);
      if (valid === null) {
        return new Response(
          JSON.stringify({ error: `Invalid visibility value. Must be one of: ${VALID_VISIBILITY.join(', ')}` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    if (updates.ownership !== undefined) {
      const valid = validateEnum(updates.ownership, VALID_OWNERSHIP);
      if (valid === null) {
        return new Response(
          JSON.stringify({ error: `Invalid ownership value. Must be one of: ${VALID_OWNERSHIP.join(', ')}` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    if (updates.status !== undefined) {
      const valid = validateEnum(updates.status, VALID_STATUS);
      if (valid === null) {
        return new Response(
          JSON.stringify({ error: `Invalid status value. Must be one of: ${VALID_STATUS.join(', ')}` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    if (updates.intents !== undefined) {
      if (!Array.isArray(updates.intents)) {
        return new Response(
          JSON.stringify({ error: 'intents must be an array' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      const invalidIntents = updates.intents.filter((i: unknown) => validateEnum(i, VALID_INTENTS) === null);
      if (invalidIntents.length > 0) {
        return new Response(
          JSON.stringify({ error: `Invalid intent values: ${invalidIntents.join(', ')}. Must be one of: ${VALID_INTENTS.join(', ')}` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    if (updates.subjects !== undefined && !Array.isArray(updates.subjects)) {
      return new Response(
        JSON.stringify({ error: 'subjects must be an array' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const allowedFields = ['title', 'author', 'isbn', 'coverUrl', 'status', 'visibility', 'ownership', 'notes'];
    const filtered: Record<string, unknown> = { updatedAt: new Date() };

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filtered[field] = updates[field];
      }
    }
    if (updates.subjects !== undefined) {
      filtered.subjects = JSON.stringify(updates.subjects);
    }
    if (updates.intents !== undefined) {
      filtered.intents = JSON.stringify(validateIntents(updates.intents));
    }

    // Include userId in WHERE for defense-in-depth (ownership already verified above).
    await db.update(books).set(filtered).where(and(eq(books.id, bookId), eq(books.userId, userId)));

    const updatedRows = await db.select().from(books).where(eq(books.id, bookId)).limit(1);

    // Attach structured notes (BookNote[]) so the PATCH response shape matches
    // GET /api/books?mine=true, which also runs rows through withNotes(). Without
    // this, `notes` in the response is the legacy books.notes text column (null)
    // and a client that merges the PATCH response into local state would clobber
    // the user's structured notes with null.
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

    return new Response(JSON.stringify({ book: { ...updatedRows[0], notes } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Update book error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// DELETE /api/books/:id - delete book (owner only)
export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    const userId = getUserId(locals);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDb((env as Env).DB);
    const bookId = params.id;
    if (!bookId) {
      return new Response(JSON.stringify({ error: 'Book ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check ownership before deleting
    const existing = await db
      .select()
      .from(books)
      .where(and(eq(books.id, bookId), eq(books.userId, userId)))
      .limit(1);

    if (existing.length === 0) {
      return new Response(JSON.stringify({ error: 'Book not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Delete the book and its notes atomically so no orphan notes are left.
    // Ownership is already verified above; the notes delete is also scoped by
    // userId for defense in depth.
    await db.batch([
      db.delete(bookNotes).where(and(eq(bookNotes.bookId, bookId), eq(bookNotes.userId, userId))),
      db.delete(books).where(and(eq(books.id, bookId), eq(books.userId, userId))),
    ]);

    // Best-effort: free the hosted cover's storage. Never fails the delete.
    const coverUrl = existing[0].coverUrl;
    if (coverUrl && isHostedCoverUrl(coverUrl)) {
      const images = (env as ImagesEnv).IMAGES;
      const imageId = hostedImageIdFromUrl(coverUrl);
      if (images && imageId) {
        try {
          await images.hosted.image(imageId).delete();
        } catch (err) {
          console.error('Hosted cover cleanup failed:', err);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Delete book error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
