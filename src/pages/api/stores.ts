import type { APIRoute } from 'astro';

export const prerender = false;

import { getDb } from '../../db/client';
import { users } from '../../db/schema';

interface CreateStoreBody {
  name: string;
  neighborhood: string;
  address: string;
  website?: string;
  phone?: string;
  specialties?: string[];
  city?: string;
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const auth = locals.auth();
    if (!auth.userId) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = (await request.json()) as CreateStoreBody;

    if (!body.name || !body.neighborhood || !body.address) {
      return new Response(
        JSON.stringify({ error: 'Name, neighborhood, and address are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const db = getDb(locals.runtime.env.DB);
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
      website: body.website || null,
      phone: body.phone || null,
      specialties: body.specialties ? JSON.stringify(body.specialties) : null,
      addedBy: auth.userId,
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
