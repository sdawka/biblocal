import type { APIRoute } from 'astro';

export const prerender = false;
import { eq, like, and, sql } from 'drizzle-orm';
import { env } from 'cloudflare:workers';

type Env = { DB: D1Database };

import { getDb } from '../../db/client';
import { users } from '../../db/schema';
import { getUserId } from '../../lib/auth';
import { safeExternalUrl } from '../../lib/url';
import {
  safeJsonArray,
  MAX_STORE_NAME_LEN,
  MAX_NEIGHBORHOOD_LEN,
  MAX_ADDRESS_LEN,
  MAX_CITY_LEN,
  MAX_PHONE_LEN,
} from '../../lib/validation';
import { readJsonBody } from '../../lib/request';

interface CreateStoreBody {
  name: string;
  neighborhood: string;
  address: string;
  website?: string;
  phone?: string;
  specialties?: string[];
  city?: string;
}

// GET /api/stores - list stores with pagination and filters
export const GET: APIRoute = async ({ url }) => {
  try {
    const db = getDb((env as Env).DB);

    // Parse query params
    const city = url.searchParams.get('city');
    const neighborhood = url.searchParams.get('neighborhood');
    const search = url.searchParams.get('search');
    // NaN or non-positive params must never reach the query builder
    // (page=0/-5 gives a negative offset, which 500s in drizzle).
    const rawPage = parseInt(url.searchParams.get('page') || '1', 10);
    const rawLimit = parseInt(url.searchParams.get('limit') || '20', 10);
    const page = Number.isFinite(rawPage) ? Math.max(rawPage, 1) : 1;
    const limit = Math.min(Number.isFinite(rawLimit) ? Math.max(rawLimit, 1) : 20, 100);
    const offset = (page - 1) * limit;

    // Build conditions
    const conditions = [eq(users.type, 'bookstore')];
    if (city) {
      conditions.push(eq(users.city, city));
    }
    if (neighborhood) {
      conditions.push(eq(users.neighborhood, neighborhood));
    }
    if (search) {
      conditions.push(like(users.name, `%${search}%`));
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(and(...conditions));
    const total = countResult[0]?.count || 0;

    // Get stores
    const stores = await db
      .select()
      .from(users)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset);

    return new Response(
      JSON.stringify({
        stores: stores.map((s) => ({
          id: s.id,
          name: s.name,
          city: s.city,
          type: s.type,
          neighborhood: s.neighborhood,
          address: s.address,
          website: s.website,
          phone: s.phone,
          specialties: safeJsonArray(s.specialties),
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (e) {
    console.error('List stores error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const userId = getUserId(locals);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const parsed = await readJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const body = parsed.body as CreateStoreBody;

    if (!body.name || !body.neighborhood || !body.address) {
      return new Response(
        JSON.stringify({ error: 'Name, neighborhood, and address are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Length checks below assume strings; a non-string (e.g. numeric name)
    // would bypass them and be persisted raw.
    for (const field of ['name', 'neighborhood', 'address', 'website', 'phone', 'city'] as const) {
      const value = body[field];
      if (value !== undefined && typeof value !== 'string') {
        return new Response(JSON.stringify({ error: `${field} must be a string` }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
    if (body.specialties !== undefined && !Array.isArray(body.specialties)) {
      return new Response(JSON.stringify({ error: 'specialties must be an array' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (body.name.length > MAX_STORE_NAME_LEN) {
      return new Response(JSON.stringify({ error: `Store name must be at most ${MAX_STORE_NAME_LEN} characters` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (body.neighborhood.length > MAX_NEIGHBORHOOD_LEN) {
      return new Response(JSON.stringify({ error: `Neighborhood must be at most ${MAX_NEIGHBORHOOD_LEN} characters` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (body.address.length > MAX_ADDRESS_LEN) {
      return new Response(JSON.stringify({ error: `Address must be at most ${MAX_ADDRESS_LEN} characters` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (body.city && body.city.length > MAX_CITY_LEN) {
      return new Response(JSON.stringify({ error: `City must be at most ${MAX_CITY_LEN} characters` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (body.phone && body.phone.length > MAX_PHONE_LEN) {
      return new Response(JSON.stringify({ error: `Phone must be at most ${MAX_PHONE_LEN} characters` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const db = getDb((env as Env).DB);
    const now = new Date();
    const storeId = `store-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    await db.insert(users).values({
      id: storeId,
      email: `${storeId}@biblocal.local`,
      name: body.name,
      city: body.city || 'Montreal',
      type: 'bookstore',
      neighborhood: body.neighborhood,
      address: body.address,
      website: body.website ? safeExternalUrl(body.website) : null,
      phone: body.phone || null,
      specialties: body.specialties ? JSON.stringify(body.specialties) : null,
      addedBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    return new Response(JSON.stringify({ id: storeId, success: true }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Create store error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
