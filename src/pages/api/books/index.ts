import type { APIRoute } from 'astro';

export const prerender = false;
import { eq } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { getDb } from '../../../db/client';
import { books } from '../../../db/schema';
import { getUserId } from '../../../lib/auth';

type Env = { DB: D1Database };

function generateId(): string {
  return crypto.randomUUID();
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

      return new Response(JSON.stringify({ books: userBooks }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Public - all books
    const allBooks = await db.select().from(books);
    return new Response(JSON.stringify({ books: allBooks }), {
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

    const body = (await request.json()) as {
      id?: string;
      title?: string;
      author?: string;
      isbn?: string;
      coverUrl?: string;
      status?: string;
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

    const now = new Date();
    const book = {
      id: body.id || generateId(),
      userId: userId,
      title: body.title,
      author: body.author,
      isbn: body.isbn || null,
      coverUrl: body.coverUrl || null,
      status: body.status || 'visible',
      addedVia: body.addedVia || 'manual',
      subjects: body.subjects ? JSON.stringify(body.subjects) : null,
      notes: body.notes || null,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(books).values(book);

    return new Response(JSON.stringify({ book }), {
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
