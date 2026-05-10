import type { APIRoute } from 'astro';

export const prerender = false;
import { eq, and } from 'drizzle-orm';
import { getDb } from '../../../db/client';
import { books } from '../../../db/schema';

// PATCH /api/books/:id - update book (owner only)
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  try {
    const auth = locals.auth();
    if (!auth.userId) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDb(locals.runtime.env.DB);
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
      .where(and(eq(books.id, bookId), eq(books.userId, auth.userId)))
      .limit(1);

    if (existing.length === 0) {
      return new Response(JSON.stringify({ error: 'Book not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const updates = (await request.json()) as Record<string, unknown>;
    const allowedFields = ['title', 'author', 'isbn', 'coverUrl', 'status', 'notes'];
    const filtered: Record<string, unknown> = { updatedAt: new Date() };

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filtered[field] = updates[field];
      }
    }
    if (updates.subjects !== undefined) {
      filtered.subjects = Array.isArray(updates.subjects) ? JSON.stringify(updates.subjects) : updates.subjects;
    }

    await db.update(books).set(filtered).where(eq(books.id, bookId));

    const updated = await db.select().from(books).where(eq(books.id, bookId)).limit(1);

    return new Response(JSON.stringify({ book: updated[0] }), {
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
    const auth = locals.auth();
    if (!auth.userId) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDb(locals.runtime.env.DB);
    const bookId = params.id;
    if (!bookId) {
      return new Response(JSON.stringify({ error: 'Book ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Delete only if owned by user
    await db
      .delete(books)
      .where(and(eq(books.id, bookId), eq(books.userId, auth.userId)));

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
