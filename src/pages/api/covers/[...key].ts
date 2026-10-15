import type { APIRoute } from 'astro';

export const prerender = false;
import { env } from 'cloudflare:workers';

type Env = { COVERS?: R2Bucket };

// GET /api/covers/:bookId/:id — serve an uploaded cover from R2. Keys are
// never reused (a new upload gets a new key), so responses are immutable.
export const GET: APIRoute = async ({ params, request }) => {
  const key = params.key;
  const bucket = (env as unknown as Env).COVERS;
  if (!key || !bucket) return new Response('Not found', { status: 404 });

  const object = await bucket.get(key);
  if (!object) return new Response('Not found', { status: 404 });

  if (request.headers.get('if-none-match') === object.httpEtag) {
    return new Response(null, { status: 304, headers: { ETag: object.httpEtag } });
  }

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
      ETag: object.httpEtag,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    },
  });
};
