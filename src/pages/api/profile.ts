import type { APIRoute } from 'astro';

export const prerender = false;
import { eq } from 'drizzle-orm';
import { getDb } from '../../db/client';
import { users } from '../../db/schema';

async function getOrCreateUser(db: ReturnType<typeof getDb>, userId: string) {
  const existing = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (existing.length > 0) return existing[0];

  const now = new Date();
  await db.insert(users).values({
    id: userId,
    email: `${userId}@clerk.user`,
    createdAt: now,
    updatedAt: now,
  });
  const created = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return created[0];
}

// GET /api/profile - get own profile (requires auth)
export const GET: APIRoute = async ({ locals }) => {
  try {
    const auth = locals.auth();
    if (!auth.userId) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDb(locals.runtime.env.DB);
    const user = await getOrCreateUser(db, auth.userId);

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
    const auth = locals.auth();
    if (!auth.userId) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDb(locals.runtime.env.DB);
    await getOrCreateUser(db, auth.userId);

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
        if (Array.isArray(updates[field])) {
          filtered[field] = JSON.stringify(updates[field]);
        } else {
          filtered[field] = updates[field];
        }
      }
    }

    await db.update(users).set(filtered).where(eq(users.id, auth.userId));

    const updated = await db.select().from(users).where(eq(users.id, auth.userId)).limit(1);

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
