import type { APIRoute } from 'astro';

export const prerender = false;
import { env } from 'cloudflare:workers';

type Env = { DB: D1Database };

import { eq, and } from 'drizzle-orm';
import { getDb } from '../../../db/client';
import { users, books } from '../../../db/schema';
import { getUserId } from '../../../lib/auth';
import { safeExternalUrl } from '../../../lib/url';
import { safeJsonArray } from '../../../lib/validation';

const MAX_STORE_NAME_LEN = 120;
const MAX_NEIGHBORHOOD_LEN = 120;
const MAX_ADDRESS_LEN = 200;
const MAX_CITY_LEN = 120;
const MAX_PHONE_LEN = 30;

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

    // Only surface visible books on public store pages; private books are owner-only.
    const storeBooks = await db
      .select()
      .from(books)
      .where(and(eq(books.userId, storeId), eq(books.visibility, 'visible')));

    const userId = getUserId(locals);
    // Null-safe: two null userIds must not equal each other (unauthenticated visitor).
    const canEdit = userId !== null && userId === store.addedBy;

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

    if (body.name !== undefined && body.name.length > MAX_STORE_NAME_LEN) {
      return new Response(JSON.stringify({ error: `Store name must be at most ${MAX_STORE_NAME_LEN} characters` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (body.neighborhood !== undefined && body.neighborhood.length > MAX_NEIGHBORHOOD_LEN) {
      return new Response(JSON.stringify({ error: `Neighborhood must be at most ${MAX_NEIGHBORHOOD_LEN} characters` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (body.address !== undefined && body.address.length > MAX_ADDRESS_LEN) {
      return new Response(JSON.stringify({ error: `Address must be at most ${MAX_ADDRESS_LEN} characters` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (body.city !== undefined && body.city.length > MAX_CITY_LEN) {
      return new Response(JSON.stringify({ error: `City must be at most ${MAX_CITY_LEN} characters` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (body.phone !== undefined && body.phone.length > MAX_PHONE_LEN) {
      return new Response(JSON.stringify({ error: `Phone must be at most ${MAX_PHONE_LEN} characters` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

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
