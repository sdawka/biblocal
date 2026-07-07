import type { APIRoute } from 'astro';

export const prerender = false;
import { eq, and } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { getDb } from '../../../../../db/client';
import { books, bookNotes } from '../../../../../db/schema';
import { getUserId } from '../../../../../lib/auth';
import { validateEnum, VALID_VISIBILITY } from '../../../../../lib/validation';

type Env = { DB: D1Database };

const MAX_NOTE_TEXT_LEN = 5000;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// POST /api/books/:id/notes - add a note to a book (owner only)
export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    const userId = getUserId(locals);
    if (!userId) return json({ error: 'Not authenticated' }, 401);

    const db = getDb((env as Env).DB);
    const bookId = params.id;
    if (!bookId) return json({ error: 'Book ID required' }, 400);

    // Verify the book exists and belongs to this user
    const owned = await db
      .select()
      .from(books)
      .where(and(eq(books.id, bookId), eq(books.userId, userId)))
      .limit(1);
    if (owned.length === 0) return json({ error: 'Book not found' }, 404);

    const body = (await request.json()) as { id?: string; text?: string; visibility?: string };

    const text = body.text?.trim();
    if (!text) return json({ error: 'Note text required' }, 400);
    if (text.length > MAX_NOTE_TEXT_LEN) {
      return json({ error: `Note text must be at most ${MAX_NOTE_TEXT_LEN} characters` }, 400);
    }

    const visibility = body.visibility !== undefined ? validateEnum(body.visibility, VALID_VISIBILITY) : 'private';
    if (visibility === null) {
      return json({ error: `Invalid visibility value. Must be one of: ${VALID_VISIBILITY.join(', ')}` }, 400);
    }

    // Idempotency: if a client-supplied id already exists for this user+book,
    // return the existing note rather than crashing on the PRIMARY KEY constraint.
    // A different user/book owning that id gets a fresh UUID (no leak).
    let noteId = body.id || crypto.randomUUID();
    if (body.id) {
      const [existingNote] = await db
        .select()
        .from(bookNotes)
        .where(eq(bookNotes.id, body.id))
        .limit(1);
      if (existingNote) {
        if (existingNote.userId === userId && existingNote.bookId === bookId) {
          // 200 (not 201): nothing was created; clients must key off res.ok.
          return json({ note: existingNote }, 200);
        }
        noteId = crypto.randomUUID();
      }
    }

    const now = new Date();
    const note = {
      id: noteId,
      bookId,
      userId,
      text,
      visibility,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(bookNotes).values(note);

    return json({ note }, 201);
  } catch (e) {
    console.error('Add note error:', e);
    return json({ error: 'Server error' }, 500);
  }
};
