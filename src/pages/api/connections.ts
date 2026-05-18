import type { APIRoute } from 'astro';

export const prerender = false;
import { eq, or, and, desc, sql } from 'drizzle-orm';
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

    return new Response(JSON.stringify({ connections: requests }), {
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

    if (existing.length > 0) {
      const req = existing[0];
      if (req.status === 'declined') {
        const dayAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        if (req.respondedAt && req.respondedAt.getTime() > dayAgo) {
          return new Response(
            JSON.stringify({ error: 'Request was declined. Please wait before trying again.' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
      } else {
        return new Response(JSON.stringify({ error: 'Connection request already exists' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Rate limit: max 5 requests per day
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentRequests = await db
      .select({ count: sql<number>`count(*)` })
      .from(connectionRequests)
      .where(
        and(
          eq(connectionRequests.fromUserId, userId),
          sql`${connectionRequests.createdAt} > ${dayAgo}`
        )
      );

    if (recentRequests[0]?.count >= MAX_REQUESTS_PER_DAY) {
      return new Response(
        JSON.stringify({ error: `Maximum ${MAX_REQUESTS_PER_DAY} requests per day` }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create the request
    const id = crypto.randomUUID();
    await db.insert(connectionRequests).values({
      id,
      fromUserId: userId,
      toUserId,
      status: 'pending',
      createdAt: new Date(),
    });

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
