import type { APIRoute } from 'astro';

export const prerender = false;
import { eq, and } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { getDb } from '../../../../db/client';
import { books } from '../../../../db/schema';
import { getUserId } from '../../../../lib/auth';
import { isUploadedCoverUrl, ownedCoverKey, newCoverKey, coverUrlForKey } from '../../../../lib/coverImages';

const MAX_COVER_BYTES = 10 * 1024 * 1024;
// Multipart framing (boundaries, part headers) around a max-size file; a
// Content-Length above this can never contain an acceptable image.
const MAX_BODY_BYTES = MAX_COVER_BYTES + 64 * 1024;
// Covers render at card/sheet sizes; scale larger uploads down once on upload.
const MAX_COVER_WIDTH = 800;
const MAX_COVER_HEIGHT = 1200;
// Raster formats only: covers are served from our own origin, so scriptable
// formats like SVG must never be stored.
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/heic']);

// Structural type for the Images transform binding, independent of the
// generated worker types' version.
interface ImagesTransformer {
  input(stream: ReadableStream<Uint8Array>): {
    transform(t: Record<string, unknown>): {
      output(o: { format: string; quality: number }): Promise<{ response(): Response }>;
    };
  };
}
type Env = { DB: D1Database; COVERS?: R2Bucket; IMAGES?: ImagesTransformer };

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Scale down and re-encode as WebP; falls back to the original bytes. */
async function optimizeCover(
  images: ImagesTransformer | undefined,
  file: File
): Promise<{ body: ArrayBuffer; contentType: string }> {
  const original = await file.arrayBuffer();
  if (!images) return { body: original, contentType: file.type };
  try {
    const result = await images
      .input(new Response(original).body!)
      .transform({ width: MAX_COVER_WIDTH, height: MAX_COVER_HEIGHT, fit: 'scale-down' })
      .output({ format: 'image/webp', quality: 82 });
    return { body: await result.response().arrayBuffer(), contentType: 'image/webp' };
  } catch (e) {
    console.error('Cover transform failed, storing original:', e);
    return { body: original, contentType: file.type };
  }
}

async function deleteCover(bucket: R2Bucket, url: string, bookId: string): Promise<void> {
  const key = ownedCoverKey(url, bookId);
  if (!key) return;
  try {
    await bucket.delete(key);
  } catch (e) {
    // Cleanup is best-effort; an orphaned object must never fail the request.
    console.error('Cover cleanup failed:', e);
  }
}

// POST /api/books/:id/cover — upload a custom cover (owner only)
export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    const userId = getUserId(locals);
    if (!userId) return json({ error: 'Not authenticated' }, 401);

    const bookId = params.id;
    if (!bookId) return json({ error: 'Book ID required' }, 400);

    const { COVERS: bucket, IMAGES: images } = env as unknown as Env;
    if (!bucket) return json({ error: 'Cover upload is not available in this environment' }, 503);

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
    if (!ALLOWED_TYPES.has(file.type)) return json({ error: 'Only JPEG, PNG, WebP, GIF, AVIF or HEIC images are allowed' }, 400);
    if (file.size > MAX_COVER_BYTES) return json({ error: 'Image too large (max 10 MB)' }, 413);

    const { body, contentType } = await optimizeCover(images, file);
    const key = newCoverKey(bookId);
    await bucket.put(key, body, {
      httpMetadata: { contentType },
      customMetadata: { userId, bookId },
    });
    const coverUrl = coverUrlForKey(new URL(request.url).origin, key);

    const prev = existing[0];
    // First custom upload preserves the fetched cover as the reset fallback.
    const fetchedCoverUrl =
      prev.fetchedCoverUrl ?? (prev.coverUrl && !isUploadedCoverUrl(prev.coverUrl) ? prev.coverUrl : null);

    try {
      const updateResult = await db
        .update(books)
        .set({ coverUrl, fetchedCoverUrl, updatedAt: new Date() })
        .where(and(eq(books.id, bookId), eq(books.userId, userId)));
      if (updateResult.meta.changes === 0) {
        await bucket.delete(key).catch(() => {});
        return json({ error: 'Book was removed during cover upload' }, 409);
      }
    } catch (e) {
      // The DB never saw the new URL, so the fresh object would leak as an
      // orphan in R2. Best-effort cleanup, then fail.
      console.error('Cover DB update failed, removing uploaded image:', e);
      await bucket.delete(key).catch(() => {});
      return json({ error: 'Server error' }, 500);
    }

    if (prev.coverUrl) await deleteCover(bucket, prev.coverUrl, bookId);

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

    const bucket = (env as unknown as Env).COVERS;
    if (bucket && prev.coverUrl) await deleteCover(bucket, prev.coverUrl, bookId);

    return json({ coverUrl }, 200);
  } catch (e) {
    console.error('Reset cover error:', e);
    return json({ error: 'Server error' }, 500);
  }
};
