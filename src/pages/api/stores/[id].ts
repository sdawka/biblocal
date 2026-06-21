import type { APIRoute } from 'astro';

export const prerender = false;
import { env } from 'cloudflare:workers';

type Env = { DB: D1Database };

import { eq } from 'drizzle-orm';
import { getDb } from '../../../db/client';
import { users, books } from '../../../db/schema';
import { getUserId } from '../../../lib/auth';
import { safeExternalUrl } from '../../../lib/url';
import { safeJsonArray } from '../../../lib/validation';

export const GET: APIRoute = async ({ params, locals }) => {
  try {
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

    const storeBooks = await db
      .select()
      .from(books)
      .where(eq(books.userId, storeId));

    const userId = getUserId(locals);
    const canEdit = userId === store.addedBy;

    return new Response(
      JSON.stringify({
        store: {
          id: store.id,
          name: store.name,
          city: store.city,
          type: store.type,
          // Business-public contact fields surfaced by the store-detail UI.
          neighborhood: store.neighborhood,
          address: store.address,
          website: store.website,
          phone: store.phone,
          specialties: safeJsonArray(store.specialties),
        },
        books: storeBooks.map((b) => ({
          id: b.id,
          title: b.title,
          author: b.author,
          isbn: b.isbn,
          coverUrl: b.coverUrl,
          visibility: b.visibility,
          ownership: b.ownership,
          intents: safeJsonArray(b.intents),
          subjects: safeJsonArray(b.subjects),
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

interface UpdateStoreBody {
  name?: string;
  neighborhood?: string;
  address?: string;
  website?: string;
  phone?: string;
  specialties?: string[];
  city?: string;
}

// PATCH /api/stores/[id] - update store (owner only)
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

    if (store.addedBy !== userId) {
      return new Response(JSON.stringify({ error: 'Not authorized to update this store' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = (await request.json()) as UpdateStoreBody;
    const allowedFields = ['name', 'neighborhood', 'address', 'website', 'phone', 'specialties', 'city'];
    const updates: Record<string, unknown> = { updatedAt: new Date() };

    for (const field of allowedFields) {
      if (body[field as keyof UpdateStoreBody] !== undefined) {
        const value = body[field as keyof UpdateStoreBody];
        if (field === 'specialties' && Array.isArray(value)) {
          updates[field] = JSON.stringify(value);
        } else if (field === 'website') {
          // Never persist an unsafe URL scheme (javascript:/data:/etc).
          updates[field] = typeof value === 'string' ? safeExternalUrl(value) : null;
        } else {
          updates[field] = value;
        }
      }
    }

    await db.update(users).set(updates).where(eq(users.id, storeId));

    const updated = await db.select().from(users).where(eq(users.id, storeId)).limit(1);

    const row = updated[0];
    return new Response(
      JSON.stringify({
        // Mirror the GET projection — never spread the raw user row.
        store: {
          id: row.id,
          name: row.name,
          city: row.city,
          type: row.type,
          neighborhood: row.neighborhood,
          address: row.address,
          website: row.website,
          phone: row.phone,
          specialties: safeJsonArray(row.specialties),
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (e) {
    console.error('Update store error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// DELETE /api/stores/[id] - delete store (owner only, cascades books)
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

    if (store.addedBy !== userId) {
      return new Response(JSON.stringify({ error: 'Not authorized to delete this store' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Delete books first (cascade)
    await db.delete(books).where(eq(books.userId, storeId));

    // Delete the store
    await db.delete(users).where(eq(users.id, storeId));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Delete store error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
