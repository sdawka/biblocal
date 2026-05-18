import type { APIRoute } from 'astro';

export const prerender = false;
import { eq } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { getDb } from '../../../db/client';
import { connectionRequests } from '../../../db/schema';
import { getUserId } from '../../../lib/auth';

type Env = { DB: D1Database };

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  try {
    const userId = getUserId(locals);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { id } = params;
    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing request id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { status } = (await request.json()) as { status: 'accepted' | 'declined' };
    if (!status || !['accepted', 'declined'].includes(status)) {
      return new Response(JSON.stringify({ error: 'Invalid status' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDb((env as Env).DB);

    // Get the request
    const [existing] = await db
      .select()
      .from(connectionRequests)
      .where(eq(connectionRequests.id, id))
      .limit(1);

    if (!existing) {
      return new Response(JSON.stringify({ error: 'Request not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Only the recipient can respond
    if (existing.toUserId !== userId) {
      return new Response(JSON.stringify({ error: 'Not authorized' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Can only respond to pending requests
    if (existing.status !== 'pending') {
      return new Response(JSON.stringify({ error: 'Request already responded to' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update the request
    await db
      .update(connectionRequests)
      .set({ status, respondedAt: new Date() })
      .where(eq(connectionRequests.id, id));

    return new Response(JSON.stringify({ success: true, status }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Update connection error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
