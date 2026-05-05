import type { APIRoute } from 'astro';

export const prerender = false;
import { getDb } from '../../../db/client';
import { createAuthCode } from '../../../lib/auth';
import { sendEmail, loginCodeEmail } from '../../../lib/email';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const { email } = (await request.json()) as { email?: string };

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'Valid email required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDb(locals.runtime.env.DB);
    const code = await createAuthCode(db, email);

    const emailContent = loginCodeEmail(code);
    const result = await sendEmail(locals.runtime.env.EMAIL, {
      to: email,
      ...emailContent,
    });

    if (!result.success) {
      console.error('Email send failed:', result.error);
      return new Response(JSON.stringify({ error: 'Failed to send email' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Send code error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
