import type { APIRoute } from 'astro';

export const prerender = false;
import { eq } from 'drizzle-orm';
import { getDb } from '../../db/client';
import { users } from '../../db/schema';
import { getSessionIdFromCookie, getUserFromSession } from '../../lib/auth';

// GET /api/profile - get own profile (requires auth)
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const sessionId = getSessionIdFromCookie(request.headers.get('cookie'));
    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDb(locals.runtime.env.DB);
    const user = await getUserFromSession(db, sessionId);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ profile: user }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Get profile error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// PATCH /api/profile - update own profile (requires auth)
export const PATCH: APIRoute = async ({ request, locals }) => {
  try {
    const sessionId = getSessionIdFromCookie(request.headers.get('cookie'));
    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDb(locals.runtime.env.DB);
    const user = await getUserFromSession(db, sessionId);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const updates = (await request.json()) as Record<string, unknown>;
    const allowedFields = [
      'name',
      'city',
      'radiusKm',
      'borrowStyle',
      'currentObsessions',
      'topicsCurated',
      'topicsFreeform',
    ];

    const filtered: Record<string, unknown> = { updatedAt: new Date() };

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        // JSON stringify arrays
        if (Array.isArray(updates[field])) {
          filtered[field] = JSON.stringify(updates[field]);
        } else {
          filtered[field] = updates[field];
        }
      }
    }

    await db.update(users).set(filtered).where(eq(users.id, user.id));

    const updated = await db.select().from(users).where(eq(users.id, user.id)).limit(1);

    return new Response(JSON.stringify({ profile: updated[0] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Update profile error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
