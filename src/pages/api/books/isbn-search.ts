import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getUserId } from '../../../lib/auth';
import { hasValidIsbnChecksum, isbnVariants, normalizeIsbn, isBookEan13 } from '../../../lib/openLibrary';
import { IsbnSearchError, searchIsbn } from '../../../lib/searxng';

export const prerender = false;

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      ...(status === 429 || status === 503 ? { 'Retry-After': '60' } : {}),
    },
  });
}

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const userId = getUserId(locals);
    if (!userId) return json({ error: 'Not authenticated' }, 401);
    const url = new URL(request.url);
    const raw = url.searchParams.get('isbn') ?? '';
    const isbn = normalizeIsbn(raw);
    if (raw.length > 32 || !hasValidIsbnChecksum(isbn)
      || (isbn.length === 13 && !isBookEan13(isbn))) {
      return json({ error: 'A valid ISBN is required' }, 400);
    }
    // Never expose a general search proxy, including when a binding is missing.
    if (!env.SEARXNG || !env.ISBN_SEARCH_LIMIT) return json({ error: 'ISBN search temporarily unavailable' }, 503);
    const { success } = await env.ISBN_SEARCH_LIMIT.limit({ key: `isbn:${userId}` });
    if (!success) return json({ error: 'Too many lookups. Please try again shortly.' }, 429);

    const canonical = isbnVariants(isbn).find((variant) => variant.length === 13) ?? isbn;
    const cacheKey = new URL(`/__isbn-search/v1/${canonical}`, url.origin).href;
    const cache = typeof caches !== 'undefined'
      ? await caches.open('isbn-search-v1').catch(() => undefined) : undefined;
    try {
      const cached = await cache?.match(cacheKey);
      if (cached) return json(await cached.json());
    } catch {
      // Cache availability must not prevent a bounded, rate-limited lookup.
    }
    const candidate = await searchIsbn(env.SEARXNG, canonical);
    const body = { candidate };
    try {
      await cache?.put(cacheKey, Response.json(body, {
        headers: { 'Cache-Control': `public, max-age=${candidate ? 3600 : 300}` },
      }));
    } catch {
      // A successful lookup remains usable even when cache storage fails.
    }
    return json(body);
  } catch (error) {
    // Log bounded categories only: no private host details, query, or user data.
    console.warn('isbn_search_unavailable', {
      reason: error instanceof IsbnSearchError ? error.reason : 'binding',
      status: error instanceof IsbnSearchError ? error.status : undefined,
    });
    return json({ error: 'ISBN search temporarily unavailable' }, 503);
  }
};
