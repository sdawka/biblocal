import type { APIRoute } from 'astro';

export const prerender = false;
import { eq, or, and, desc, sql, inArray } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { getDb } from '../../db/client';
import { connectionRequests, users } from '../../db/schema';
import { getUserId } from '../../lib/auth';
import { getOrCreateUser } from '../../db/users';

type Env = { DB: D1Database };

const MAX_REQUESTS_PER_DAY = 5;

function isConnectionPairConstraintError(error: unknown): boolean {
  return error instanceof Error
    && /connection_requests_pair_unique|UNIQUE constraint failed: connection_requests\.from_user_id, connection_requests\.to_user_id/.test(error.message);
}

function acceptsConnectionRequests(contactVisibility: string | null): boolean {
  return contactVisibility === 'public' || contactVisibility === 'on-request';
}

function hiddenRecipientResponse(): Response {
  return new Response(JSON.stringify({ error: 'This user does not accept connection requests' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });
}

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

    // Ensure sender row exists before any FK insert; auto-create on first interaction.
    const sender = await getOrCreateUser(db, userId);
    if (!sender?.contactValue) {
      return new Response(
        JSON.stringify({ error: 'Set your contact info before sending requests' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Recipient must genuinely exist — do not auto-create.
    const [recipient] = await db
      .select({ id: users.id, contactVisibility: users.contactVisibility })
      .from(users)
      .where(eq(users.id, toUserId))
      .limit(1);
    if (!recipient) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (!acceptsConnectionRequests(recipient.contactVisibility)) {
      return hiddenRecipientResponse();
    }

    // Check every relationship row. Older versions could create reciprocal
    // declined history, which must remain recoverable without deleting data.
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
      .orderBy(desc(connectionRequests.createdAt));

    // A stale-declined request is reactivated in place. Reorienting it when the
    // decliner starts the next request preserves a single active relationship;
    // reciprocal declined history remains intact for non-destructive recovery.
    let reactivateId: string | null = null;
    if (existing.some((request) => request.status !== 'declined')) {
      return new Response(JSON.stringify({ error: 'Connection request already exists' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (existing.length > 0) {
      // Prefer the caller's original row when legacy reciprocal declines exist.
      // Updating that row keeps the ordered-pair unique index satisfied.
      const req = existing.find(
        (request) => request.fromUserId === userId && request.toUserId === toUserId
      ) ?? existing[0];
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
      }
      reactivateId = req.id;
    }

    // Both guards have to execute with their write. D1 serializes each SQL
    // statement, while independent preflight reads can interleave before a
    // later insert/update and let reciprocal requests or a sixth request through.
    const nowSec = Math.floor(Date.now() / 1000);
    const dayAgoSec = nowSec - 24 * 60 * 60;
    const cooldownStartSec = nowSec - 30 * 24 * 60 * 60;

    if (reactivateId) {
      const result = await (env as Env).DB.prepare(
        `UPDATE connection_requests
         SET from_user_id = ?, to_user_id = ?, status = 'pending', created_at = ?, responded_at = NULL
         WHERE id = ?
           AND status = 'declined'
           AND (from_user_id <> ? OR responded_at IS NULL OR responded_at <= ?)
           AND EXISTS (
             SELECT 1 FROM users
             WHERE id = ? AND contact_visibility IN ('public', 'on-request')
           )
           AND NOT EXISTS (
             SELECT 1 FROM connection_requests AS other
             WHERE other.id <> ?
               AND other.status <> 'declined'
               AND ((other.from_user_id = ? AND other.to_user_id = ?)
                 OR (other.from_user_id = ? AND other.to_user_id = ?))
           )
           AND (SELECT COUNT(*) FROM connection_requests
                WHERE from_user_id = ? AND created_at > ?) < ?`
      ).bind(
        userId,
        toUserId,
        nowSec,
        reactivateId,
        userId,
        cooldownStartSec,
        toUserId,
        reactivateId,
        userId,
        toUserId,
        toUserId,
        userId,
        userId,
        dayAgoSec,
        MAX_REQUESTS_PER_DAY
      ).run();

      if (result.meta.changes === 1) {
        return new Response(JSON.stringify({ success: true, id: reactivateId }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } else {
      const id = crypto.randomUUID();
      const result = await (env as Env).DB.prepare(
        `INSERT INTO connection_requests (id, from_user_id, to_user_id, status, created_at, responded_at)
         SELECT ?, ?, ?, 'pending', ?, NULL
         WHERE NOT EXISTS (
           SELECT 1 FROM connection_requests
           WHERE (from_user_id = ? AND to_user_id = ?)
              OR (from_user_id = ? AND to_user_id = ?)
         )
           AND EXISTS (
             SELECT 1 FROM users
             WHERE id = ? AND contact_visibility IN ('public', 'on-request')
           )
           AND (SELECT COUNT(*) FROM connection_requests
                WHERE from_user_id = ? AND created_at > ?) < ?`
      ).bind(
        id,
        userId,
        toUserId,
        nowSec,
        userId,
        toUserId,
        toUserId,
        userId,
        toUserId,
        userId,
        dayAgoSec,
        MAX_REQUESTS_PER_DAY
      ).run();

      if (result.meta.changes === 1) {
        return new Response(JSON.stringify({ success: true, id }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // A conditional write can lose either to an existing relationship or to a
    // request that filled the quota. Resolve the client-facing outcome only
    // after the failed write; it does not participate in enforcing invariants.
    const [currentRecipient] = await db
      .select({ contactVisibility: users.contactVisibility })
      .from(users)
      .where(eq(users.id, toUserId))
      .limit(1);
    if (!currentRecipient || !acceptsConnectionRequests(currentRecipient.contactVisibility)) {
      return hiddenRecipientResponse();
    }

    const relationship = await db
      .select({ status: connectionRequests.status })
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
    if (relationship.some((request) => request.status !== 'declined')) {
      return new Response(JSON.stringify({ error: 'Connection request already exists' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

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

    return new Response(JSON.stringify({ error: 'Connection request already exists' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Create connection error:', e);
    if (isConnectionPairConstraintError(e)) {
      return new Response(JSON.stringify({ error: 'Connection request already exists' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
