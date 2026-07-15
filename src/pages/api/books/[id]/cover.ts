import type { APIRoute } from 'astro';

export const prerender = false;
import { eq, and } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { getDb } from '../../../../db/client';
import { books } from '../../../../db/schema';
import { getUserId } from '../../../../lib/auth';
import { isHostedCoverUrl, hostedImageIdFromUrl, pickCoverVariant } from '../../../../lib/coverImages';

const MAX_COVER_BYTES = 10 * 1024 * 1024;
// Multipart framing (boundaries, part headers) around a max-size file; a
// Content-Length above this can never contain an acceptable image.
const MAX_BODY_BYTES = MAX_COVER_BYTES + 64 * 1024;

// Structural type for the hosted-images namespace (June 2026 Images binding),
// independent of the generated worker types' version.
interface HostedImagesNamespace {
  upload(
    image: ArrayBuffer | ReadableStream<Uint8Array>,
    options?: { filename?: string; metadata?: Record<string, string> }
  ): Promise<{ id: string; variants: string[] }>;
  image(imageId: string): { delete(): Promise<boolean> };
}
type Env = { DB: D1Database; IMAGES?: { hosted: HostedImagesNamespace } };

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function deleteHostedImage(images: { hosted: HostedImagesNamespace }, url: string): Promise<void> {
  const imageId = hostedImageIdFromUrl(url);
  if (!imageId) return;
  try {
    await images.hosted.image(imageId).delete();
  } catch (e) {
    // Cleanup is best-effort; an orphaned image must never fail the request.
    console.error('Hosted cover cleanup failed:', e);
  }
}

// POST /api/books/:id/cover — upload a custom cover (owner only)
export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    const userId = getUserId(locals);
    if (!userId) return json({ error: 'Not authenticated' }, 401);

    const bookId = params.id;
    if (!bookId) return json({ error: 'Book ID required' }, 400);

    const images = (env as unknown as Env).IMAGES;
    if (!images) return json({ error: 'Cover upload is not available in this environment' }, 503);

    const db = getDb((env as unknown as Env).DB);
    const existing = await db
      .select()
      .from(books)
      .where(and(eq(books.id, bookId), eq(books.userId, userId)))
      .limit(1);
    if (existing.length === 0) return json({ error: 'Book not found' }, 404);

    // Reject oversized uploads before parsing: platform formData() failures on
    // huge bodies would otherwise surface as a generic 400 instead of 413.
    const contentLength = Number(request.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return json({ error: 'Image too large (max 10 MB)' }, 413);
    }

    const form = await request.formData().catch(() => null);
    const file = form?.get('file');
    if (!(file instanceof File)) return json({ error: 'file field required' }, 400);
    if (!file.type.startsWith('image/')) return json({ error: 'Only image uploads are allowed' }, 400);
    if (file.size > MAX_COVER_BYTES) return json({ error: 'Image too large (max 10 MB)' }, 413);

    const uploaded = await images.hosted.upload(await file.arrayBuffer(), {
      filename: file.name,
      metadata: { userId, bookId },
    });
    const coverUrl = pickCoverVariant(uploaded.variants);
    if (!coverUrl) {
      await images.hosted.image(uploaded.id).delete().catch(() => {});
      return json({ error: 'Upload produced no delivery URL' }, 502);
    }

    const prev = existing[0];
    // First custom upload preserves the fetched cover as the reset fallback.
    const fetchedCoverUrl =
      prev.fetchedCoverUrl ?? (prev.coverUrl && !isHostedCoverUrl(prev.coverUrl) ? prev.coverUrl : null);

    try {
      await db
        .update(books)
        .set({ coverUrl, fetchedCoverUrl, updatedAt: new Date() })
        .where(and(eq(books.id, bookId), eq(books.userId, userId)));
    } catch (e) {
      // The DB never saw the new URL, so the fresh upload would leak as an
      // orphan on the Images account. Best-effort cleanup, then fail.
      console.error('Cover DB update failed, removing uploaded image:', e);
      await images.hosted.image(uploaded.id).delete().catch(() => {});
      return json({ error: 'Server error' }, 500);
    }

    if (prev.coverUrl && isHostedCoverUrl(prev.coverUrl)) {
      await deleteHostedImage(images, prev.coverUrl);
    }

    return json({ coverUrl, fetchedCoverUrl }, 200);
  } catch (e) {
    console.error('Upload cover error:', e);
    return json({ error: 'Server error' }, 500);
  }
};

// DELETE /api/books/:id/cover — reset to the originally-fetched cover
export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    const userId = getUserId(locals);
    if (!userId) return json({ error: 'Not authenticated' }, 401);

    const bookId = params.id;
    if (!bookId) return json({ error: 'Book ID required' }, 400);

    const db = getDb((env as unknown as Env).DB);
    const existing = await db
      .select()
      .from(books)
      .where(and(eq(books.id, bookId), eq(books.userId, userId)))
      .limit(1);
    if (existing.length === 0) return json({ error: 'Book not found' }, 404);

    const prev = existing[0];
    const coverUrl = prev.fetchedCoverUrl ?? null;
    await db
      .update(books)
      .set({ coverUrl, updatedAt: new Date() })
      .where(and(eq(books.id, bookId), eq(books.userId, userId)));

    const images = (env as unknown as Env).IMAGES;
    if (images && prev.coverUrl && isHostedCoverUrl(prev.coverUrl)) {
      await deleteHostedImage(images, prev.coverUrl);
    }

    return json({ coverUrl }, 200);
  } catch (e) {
    console.error('Reset cover error:', e);
    return json({ error: 'Server error' }, 500);
  }
};
