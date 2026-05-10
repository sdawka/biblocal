import type { APIRoute } from 'astro';

export const prerender = false;

import { eq } from 'drizzle-orm';
import { getDb } from '../../../db/client';
import { users, books } from '../../../db/schema';

export const GET: APIRoute = async ({ params, locals }) => {
  try {
    const db = getDb(locals.runtime.env.DB);
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

    const storeBooks = await db
      .select()
      .from(books)
      .where(eq(books.userId, storeId));

    const auth = locals.auth();
    const canEdit = auth.userId === store.addedBy;

    return new Response(
      JSON.stringify({
        store: {
          ...store,
          specialties: store.specialties ? JSON.parse(store.specialties) : [],
        },
        books: storeBooks.map((b) => ({
          ...b,
          subjects: b.subjects ? JSON.parse(b.subjects) : [],
        })),
        canEdit,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (e) {
    console.error('Get store error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
