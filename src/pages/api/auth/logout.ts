import type { APIRoute } from 'astro';

export const prerender = false;
import { getDb } from '../../../db/client';
import {
  getSessionIdFromCookie,
  deleteSession,
  clearSessionCookie,
} from '../../../lib/auth';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const sessionId = getSessionIdFromCookie(request.headers.get('cookie'));

    if (sessionId) {
      const db = getDb(locals.runtime.env.DB);
      await deleteSession(db, sessionId);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': clearSessionCookie(),
      },
    });
  } catch (e) {
    console.error('Logout error:', e);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': clearSessionCookie(),
      },
    });
  }
};
