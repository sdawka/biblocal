import type { APIRoute } from 'astro';

export const prerender = false;
import { eq, and } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { getDb } from '../../../../../db/client';
import { bookNotes } from '../../../../../db/schema';
import { getUserId } from '../../../../../lib/auth';
import { validateEnum, VALID_VISIBILITY } from '../../../../../lib/validation';

type Env = { DB: D1Database };

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// PATCH /api/books/:id/notes/:noteId - update a note's text/visibility (owner only)
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  try {
    const userId = getUserId(locals);
    if (!userId) return json({ error: 'Not authenticated' }, 401);

    const db = getDb((env as Env).DB);
    const noteId = params.noteId;
    if (!noteId) return json({ error: 'Note ID required' }, 400);

    // Ownership is enforced via user_id on the note itself
    const existing = await db
      .select()
      .from(bookNotes)
      .where(and(eq(bookNotes.id, noteId), eq(bookNotes.userId, userId)))
      .limit(1);
    if (existing.length === 0) return json({ error: 'Note not found' }, 404);

    const updates = (await request.json()) as { text?: string; visibility?: string };
    const filtered: Record<string, unknown> = { updatedAt: new Date() };

    if (updates.text !== undefined) {
      const text = updates.text.trim();
      if (!text) return json({ error: 'Note text required' }, 400);
      filtered.text = text;
    }
    if (updates.visibility !== undefined) {
      const valid = validateEnum(updates.visibility, VALID_VISIBILITY);
      if (valid === null) {
        return json({ error: `Invalid visibility value. Must be one of: ${VALID_VISIBILITY.join(', ')}` }, 400);
      }
      filtered.visibility = valid;
    }

    await db.update(bookNotes).set(filtered).where(eq(bookNotes.id, noteId));

    const updated = await db.select().from(bookNotes).where(eq(bookNotes.id, noteId)).limit(1);
    return json({ note: updated[0] }, 200);
  } catch (e) {
    console.error('Update note error:', e);
    return json({ error: 'Server error' }, 500);
  }
};

// DELETE /api/books/:id/notes/:noteId - remove a note (owner only)
export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    const userId = getUserId(locals);
    if (!userId) return json({ error: 'Not authenticated' }, 401);

    const db = getDb((env as Env).DB);
    const noteId = params.noteId;
    if (!noteId) return json({ error: 'Note ID required' }, 400);

    const existing = await db
      .select()
      .from(bookNotes)
      .where(and(eq(bookNotes.id, noteId), eq(bookNotes.userId, userId)))
      .limit(1);
    if (existing.length === 0) return json({ error: 'Note not found' }, 404);

    await db.delete(bookNotes).where(and(eq(bookNotes.id, noteId), eq(bookNotes.userId, userId)));

    return json({ success: true }, 200);
  } catch (e) {
    console.error('Delete note error:', e);
    return json({ error: 'Server error' }, 500);
  }
};
