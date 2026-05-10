import type { APIRoute } from 'astro';

export const prerender = false;
import { env } from 'cloudflare:workers';

type Env = { DB: D1Database };

import { eq } from 'drizzle-orm';
import { getDb } from '../../../../db/client';
import { users, books } from '../../../../db/schema';

interface AddBookBody {
  title: string;
  author: string;
  isbn?: string;
  coverUrl?: string;
  status?: string;
  subjects?: string[];
}

export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    const auth = locals.auth();
    if (!auth.userId) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDb((env as Env).DB);
    const storeId = params.id;

    if (!storeId) {
      return new Response(JSON.stringify({ error: 'Store ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const storeResults = await db
      .select()
      .from(users)
      .where(eq(users.id, storeId))
      .limit(1);

    if (storeResults.length === 0 || storeResults[0].type !== 'bookstore') {
      return new Response(JSON.stringify({ error: 'Store not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const store = storeResults[0];

    if (store.addedBy !== auth.userId) {
      return new Response(JSON.stringify({ error: 'Not authorized to add books to this store' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = (await request.json()) as AddBookBody;

    if (!body.title || !body.author) {
      return new Response(JSON.stringify({ error: 'Title and author are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const now = new Date();
    const bookId = `book-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    await db.insert(books).values({
      id: bookId,
      userId: storeId,
      title: body.title,
      author: body.author,
      isbn: body.isbn || null,
      coverUrl: body.coverUrl || null,
      status: body.status || 'visible',
      addedVia: 'manual',
      subjects: body.subjects ? JSON.stringify(body.subjects) : null,
      createdAt: now,
      updatedAt: now,
    });

    const created = await db.select().from(books).where(eq(books.id, bookId)).limit(1);

    return new Response(JSON.stringify({ book: created[0] }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Add store book error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
