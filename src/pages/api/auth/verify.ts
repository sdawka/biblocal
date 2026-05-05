import type { APIRoute } from 'astro';

export const prerender = false;
import { getDb } from '../../../db/client';
import {
  verifyAuthCode,
  getOrCreateUser,
  createSession,
  setSessionCookie,
} from '../../../lib/auth';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const { email, code } = (await request.json()) as { email?: string; code?: string };

    if (!email || !code) {
      return new Response(JSON.stringify({ error: 'Email and code required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDb(locals.runtime.env.DB);
    const valid = await verifyAuthCode(db, email, code);

    if (!valid) {
      return new Response(JSON.stringify({ error: 'Invalid or expired code' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = await getOrCreateUser(db, email);
    const session = await createSession(db, user.id);

    return new Response(JSON.stringify({ success: true, user }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': setSessionCookie(session.id),
      },
    });
  } catch (e) {
    console.error('Verify error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
