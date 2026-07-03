import type { APIRoute } from 'astro';

export const prerender = false;
import { eq, or, and, desc, sql, inArray } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { getDb } from '../../db/client';
import { connectionRequests, users } from '../../db/schema';
import { getUserId } from '../../lib/auth';

type Env = { DB: D1Database };

const MAX_REQUESTS_PER_DAY = 5;

export const GET: APIRoute = async ({ locals }) => {
  try {
    const userId = getUserId(locals);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDb((env as Env).DB);
    const requests = await db
      .select()
      .from(connectionRequests)
      .where(
        or(
          eq(connectionRequests.fromUserId, userId),
          eq(connectionRequests.toUserId, userId)
        )
      )
      .orderBy(desc(connectionRequests.createdAt));

    const userIds = [...new Set(requests.flatMap((r) => [r.fromUserId, r.toUserId]))];
    const userMap = new Map<string, { id: string; name: string | null }>();
    if (userIds.length > 0) {
      const userRows = await db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(inArray(users.id, userIds));
      for (const u of userRows) userMap.set(u.id, u);
    }

    const enriched = requests.map((r) => ({
      ...r,
      fromUser: userMap.get(r.fromUserId) ?? null,
      toUser: userMap.get(r.toUserId) ?? null,
    }));

    return new Response(JSON.stringify({ connections: enriched }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Get connections error:', e);
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

    const { toUserId } = (await request.json()) as { toUserId: string };
    if (!toUserId) {
      return new Response(JSON.stringify({ error: 'Missing toUserId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (toUserId === userId) {
      return new Response(JSON.stringify({ error: 'Cannot connect with yourself' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDb((env as Env).DB);

    // Check if user has contact info set
    const [sender] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!sender?.contactValue) {
      return new Response(
        JSON.stringify({ error: 'Set your contact info before sending requests' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check for existing request
    const existing = await db
      .select()
      .from(connectionRequests)
      .where(
        or(
          and(
            eq(connectionRequests.fromUserId, userId),
            eq(connectionRequests.toUserId, toUserId)
          ),
          and(
            eq(connectionRequests.fromUserId, toUserId),
            eq(connectionRequests.toUserId, userId)
          )
        )
      )
      .limit(1);

    // A stale-declined request for the SAME ordered (from,to) pair must be
    // reactivated in place — the unique index would reject a fresh insert.
    let reactivateId: string | null = null;
    if (existing.length > 0) {
      const req = existing[0];
      if (req.status === 'declined') {
        // Only the original requester is subject to the 30-day cooldown.
        // The decliner (req.fromUserId !== userId) can initiate a new request freely.
        if (req.fromUserId === userId) {
          const cooldownStart = Date.now() - 30 * 24 * 60 * 60 * 1000;
          if (req.respondedAt && req.respondedAt.getTime() > cooldownStart) {
            return new Response(
              JSON.stringify({ error: 'Request was declined. Please wait before trying again.' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
          }
          if (req.toUserId === toUserId) {
            reactivateId = req.id;
          }
        }
      } else {
        return new Response(JSON.stringify({ error: 'Connection request already exists' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Rate limit: max 5 requests per day.
    // created_at is stored as INTEGER (Unix epoch seconds), so compare numerically.
    const dayAgoSec = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
    const recentRequests = await db
      .select({ count: sql<number>`count(*)` })
      .from(connectionRequests)
      .where(
        and(
          eq(connectionRequests.fromUserId, userId),
          sql`${connectionRequests.createdAt} > ${dayAgoSec}`
        )
      );

    if (recentRequests[0]?.count >= MAX_REQUESTS_PER_DAY) {
      return new Response(
        JSON.stringify({ error: `Maximum ${MAX_REQUESTS_PER_DAY} requests per day` }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create the request. The existence check above can be raced by a
    // concurrent request (double-click, or A and B in the same tick), so the
    // insert is made resilient by the connection_requests_pair_unique index +
    // onConflictDoNothing(). `returning()` is empty when the insert was a no-op
    // due to that conflict, in which case the row already exists.
    // Reactivate a stale-declined request in place rather than inserting a
    // duplicate that would collide with the unique (from,to) index.
    if (reactivateId) {
      await db
        .update(connectionRequests)
        .set({ status: 'pending', createdAt: new Date(), respondedAt: null })
        .where(eq(connectionRequests.id, reactivateId));
      return new Response(JSON.stringify({ success: true, id: reactivateId }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const id = crypto.randomUUID();
    const inserted = await db
      .insert(connectionRequests)
      .values({
        id,
        fromUserId: userId,
        toUserId,
        status: 'pending',
        createdAt: new Date(),
      })
      .onConflictDoNothing()
      .returning({ id: connectionRequests.id });

    if (inserted.length === 0) {
      // Lost the race: an identical (from, to) request already exists.
      return new Response(JSON.stringify({ error: 'Connection request already exists' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, id }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Create connection error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
