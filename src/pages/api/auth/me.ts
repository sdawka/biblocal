import type { APIRoute } from 'astro';

export const prerender = false;
import { getDb } from '../../../db/client';
import { getSessionIdFromCookie, getUserFromSession } from '../../../lib/auth';

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const sessionId = getSessionIdFromCookie(request.headers.get('cookie'));

    if (!sessionId) {
      return new Response(JSON.stringify({ user: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDb(locals.runtime.env.DB);
    const user = await getUserFromSession(db, sessionId);

    return new Response(JSON.stringify({ user }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Me error:', e);
    return new Response(JSON.stringify({ user: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
