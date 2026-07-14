# Compact Unified Book Cards + Cover Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Book cards become compact, uniform-size doors to a single full-editor modal in both Biblio views; users can upload custom covers stored on Cloudflare Images; the bulky filter card becomes a slim toolbar with a filter popover.

**Architecture:** UI-only changes ride the existing optimistic `updateBook` → PATCH path. Cover upload adds one Worker endpoint using the Cloudflare Images `hosted` binding (`env.IMAGES.hosted`), one nullable D1 column (`fetched_cover_url`) to remember the pre-custom cover for "reset", and pure URL helpers in `src/lib/coverImages.ts`.

**Tech Stack:** Astro 6 (SSR on Cloudflare Workers), Svelte 5 (runes), nanostores, Drizzle + D1, Cloudflare Images binding, Vitest.

## Global Constraints

- Svelte 5 runes syntax (`$props()`, `$state`, `$derived`, `$effect`) — match existing components.
- Every user-facing string goes in BOTH `src/i18n/en/shelf.ts` and `src/i18n/fr/shelf.ts` (same key paths).
- No store `.get()` / `setTimeout` at module top level (Cloudflare Workers cold-start 500s).
- `src/lib/` stays framework-free (pure TS only).
- Commit messages clean and concise; no attribution footers.
- Spec: `docs/superpowers/specs/2026-07-14-compact-cards-cover-upload-design.md`.
- Test commands: `npm run test:run` (vitest), `npx astro check` (types).

---

### Task 1: Cover URL helpers (`src/lib/coverImages.ts`)

**Files:**
- Create: `src/lib/coverImages.ts`
- Test: `tests/lib/cover-images.test.ts`

**Interfaces:**
- Produces: `isHostedCoverUrl(url: string | null | undefined): boolean`, `hostedImageIdFromUrl(url: string): string | null`, `pickCoverVariant(variants: string[]): string | null` — used by Task 3 (endpoint) and Task 7 (sheet).

- [ ] **Step 1: Write the failing test**

```ts
// tests/lib/cover-images.test.ts
import { describe, it, expect } from 'vitest';
import { isHostedCoverUrl, hostedImageIdFromUrl, pickCoverVariant } from '../../src/lib/coverImages';

const HOSTED = 'https://imagedelivery.net/AbC123hash/019a4b2c-uuid/public';
const OPENLIB = 'https://covers.openlibrary.org/b/id/12345-M.jpg';

describe('isHostedCoverUrl', () => {
  it('matches imagedelivery.net variant URLs', () => {
    expect(isHostedCoverUrl(HOSTED)).toBe(true);
  });
  it('rejects OpenLibrary URLs, null, undefined, and empty', () => {
    expect(isHostedCoverUrl(OPENLIB)).toBe(false);
    expect(isHostedCoverUrl(null)).toBe(false);
    expect(isHostedCoverUrl(undefined)).toBe(false);
    expect(isHostedCoverUrl('')).toBe(false);
  });
});

describe('hostedImageIdFromUrl', () => {
  it('extracts the image id from a hosted URL', () => {
    expect(hostedImageIdFromUrl(HOSTED)).toBe('019a4b2c-uuid');
  });
  it('returns null for non-hosted URLs', () => {
    expect(hostedImageIdFromUrl(OPENLIB)).toBeNull();
  });
});

describe('pickCoverVariant', () => {
  it('prefers the public variant', () => {
    const variants = [
      'https://imagedelivery.net/h/id/thumbnail',
      'https://imagedelivery.net/h/id/public',
    ];
    expect(pickCoverVariant(variants)).toBe('https://imagedelivery.net/h/id/public');
  });
  it('falls back to the first variant', () => {
    expect(pickCoverVariant(['https://imagedelivery.net/h/id/cover'])).toBe(
      'https://imagedelivery.net/h/id/cover'
    );
  });
  it('returns null for an empty list', () => {
    expect(pickCoverVariant([])).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/cover-images.test.ts`
Expected: FAIL — cannot resolve `src/lib/coverImages`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/coverImages.ts
// Helpers for covers hosted on Cloudflare Images. Delivery URLs look like
// https://imagedelivery.net/<account-hash>/<image-id>/<variant>.

const HOSTED_COVER_RE = /^https:\/\/imagedelivery\.net\/[^/]+\/([^/]+)\/[^/]+$/;

export function isHostedCoverUrl(url: string | null | undefined): boolean {
  return !!url && HOSTED_COVER_RE.test(url);
}

export function hostedImageIdFromUrl(url: string): string | null {
  const match = url.match(HOSTED_COVER_RE);
  return match ? match[1] : null;
}

export function pickCoverVariant(variants: string[]): string | null {
  if (variants.length === 0) return null;
  return variants.find((v) => /\/public$/.test(v)) ?? variants[0];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/cover-images.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/coverImages.ts tests/lib/cover-images.test.ts
git commit -m "feat: cover image URL helpers for Cloudflare Images"
```

---

### Task 2: `fetched_cover_url` column + Book type plumbing

**Files:**
- Create: `drizzle/0008_fetched_cover_url.sql`
- Modify: `drizzle/meta/_journal.json` (append entry)
- Modify: `src/db/schema.ts` (books table)
- Modify: `src/lib/types.ts:42` (Book)
- Modify: `src/stores/shelf.ts` (`ServerBook` + `loadBooksFromServer` mapping)

**Interfaces:**
- Produces: `Book.fetchedCoverUrl?: string` and DB column `books.fetchedCoverUrl` — consumed by Tasks 3, 4, 7.

- [ ] **Step 1: Write the migration**

```sql
-- drizzle/0008_fetched_cover_url.sql
-- Remembers the originally-fetched (OpenLibrary) cover so a custom uploaded
-- cover can be reset back to it.
ALTER TABLE `books` ADD `fetched_cover_url` text;
```

Append to `drizzle/meta/_journal.json` `entries` (after the idx 7 entry):

```json
{
  "idx": 8,
  "version": "6",
  "when": 1784000000000,
  "tag": "0008_fetched_cover_url",
  "breakpoints": true
}
```

- [ ] **Step 2: Update schema and types**

In `src/db/schema.ts`, in the `books` table after `coverUrl`:

```ts
  coverUrl: text('cover_url'),
  // Original externally-fetched cover (OpenLibrary); lets a custom uploaded
  // cover be reset without re-querying the lookup service.
  fetchedCoverUrl: text('fetched_cover_url'),
```

In `src/lib/types.ts`, in `Book` after `coverUrl?: string;`:

```ts
  coverUrl?: string;
  fetchedCoverUrl?: string;
```

In `src/stores/shelf.ts`, add to `ServerBook` after `coverUrl`:

```ts
  coverUrl: string | null;
  fetchedCoverUrl: string | null;
```

and in `loadBooksFromServer()`'s mapping after `coverUrl: b.coverUrl || undefined,`:

```ts
        coverUrl: b.coverUrl || undefined,
        fetchedCoverUrl: b.fetchedCoverUrl || undefined,
```

(GET `/api/books` uses bare `db.select()`, so the new column flows through automatically.)

- [ ] **Step 3: Apply migration locally and type-check**

Run: `npx wrangler d1 migrations apply DB --local && npx astro check`
Expected: migration `0008_fetched_cover_url.sql` applied; astro check passes with no new errors.

- [ ] **Step 4: Run the store test suite**

Run: `npm run test:run`
Expected: PASS (no behavior change; mapping is additive). If the suite fails with a `NODE_MODULE_VERSION` mismatch, run `npm rebuild better-sqlite3` first — environment issue, not a regression.

- [ ] **Step 5: Commit**

```bash
git add drizzle/0008_fetched_cover_url.sql drizzle/meta/_journal.json src/db/schema.ts src/lib/types.ts src/stores/shelf.ts
git commit -m "feat: fetched_cover_url column to remember pre-custom covers"
```

---

### Task 3: Images binding + cover upload/reset endpoint

**Files:**
- Modify: `wrangler.jsonc`
- Create: `src/pages/api/books/[id]/cover.ts`
- Modify: `src/pages/api/books/[id].ts` (DELETE: best-effort hosted-cover cleanup)

**Interfaces:**
- Consumes: Task 1 helpers, Task 2 column.
- Produces: `POST /api/books/:id/cover` (multipart field `file`) → `200 {coverUrl, fetchedCoverUrl}` | `400/401/404/413/503`; `DELETE /api/books/:id/cover` → `200 {coverUrl: string | null}`. Consumed by Task 4 store actions.

- [ ] **Step 1: Add the Images binding to wrangler.jsonc**

Add a top-level key (after `"d1_databases"`) and the same key inside `"env" → "qa"` (after its `"d1_databases"`):

```jsonc
	"images": {
		"binding": "IMAGES"
	},
```

Then run: `npm run generate-types` (regenerates worker types; OK if the generated file is gitignored).

- [ ] **Step 2: Create the endpoint**

```ts
// src/pages/api/books/[id]/cover.ts
import type { APIRoute } from 'astro';

export const prerender = false;
import { eq, and } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { getDb } from '../../../../db/client';
import { books } from '../../../../db/schema';
import { getUserId } from '../../../../lib/auth';
import { isHostedCoverUrl, hostedImageIdFromUrl, pickCoverVariant } from '../../../../lib/coverImages';

const MAX_COVER_BYTES = 10 * 1024 * 1024;

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

    const images = (env as Env).IMAGES;
    if (!images) return json({ error: 'Cover upload is not available in this environment' }, 503);

    const db = getDb((env as Env).DB);
    const existing = await db
      .select()
      .from(books)
      .where(and(eq(books.id, bookId), eq(books.userId, userId)))
      .limit(1);
    if (existing.length === 0) return json({ error: 'Book not found' }, 404);

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

    await db
      .update(books)
      .set({ coverUrl, fetchedCoverUrl, updatedAt: new Date() })
      .where(and(eq(books.id, bookId), eq(books.userId, userId)));

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

    const db = getDb((env as Env).DB);
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

    const images = (env as Env).IMAGES;
    if (images && prev.coverUrl && isHostedCoverUrl(prev.coverUrl)) {
      await deleteHostedImage(images, prev.coverUrl);
    }

    return json({ coverUrl }, 200);
  } catch (e) {
    console.error('Reset cover error:', e);
    return json({ error: 'Server error' }, 500);
  }
};
```

- [ ] **Step 3: Clean up hosted covers on book deletion**

In `src/pages/api/books/[id].ts` DELETE handler, after the `db.batch([...])` call (line ~196), add:

```ts
    // Best-effort: free the hosted cover's storage. Never fails the delete.
    const coverUrl = existing[0].coverUrl;
    if (coverUrl && isHostedCoverUrl(coverUrl)) {
      const images = (env as ImagesEnv).IMAGES;
      const imageId = hostedImageIdFromUrl(coverUrl);
      if (images && imageId) {
        try {
          await images.hosted.image(imageId).delete();
        } catch (err) {
          console.error('Hosted cover cleanup failed:', err);
        }
      }
    }
```

with imports at the top of the file:

```ts
import { isHostedCoverUrl, hostedImageIdFromUrl } from '../../../lib/coverImages';

type ImagesEnv = {
  IMAGES?: { hosted: { image(id: string): { delete(): Promise<boolean> } } };
};
```

- [ ] **Step 4: Verify types and build**

Run: `npx astro check && npm run build`
Expected: both pass.

- [ ] **Step 5: Smoke-test locally**

Run `npm run dev` in the background, then (after creating the user row via `curl -s http://localhost:4321/api/profile` — see local-dev D1 memory):

```bash
curl -s -X POST http://localhost:4321/api/books \
  -H 'Content-Type: application/json' \
  -d '{"title":"Cover Test","author":"Tester","visibility":"visible","ownership":"have","intents":[]}'
# note the returned book id, then upload any small real image (grab a seed cover):
cp public/covers/*.jpg /tmp/test-cover.jpg 2>/dev/null || sips -s format jpeg /System/Library/Desktop\ Pictures/Solid\ Colors/*.png --out /tmp/test-cover.jpg
curl -s -X POST "http://localhost:4321/api/books/<BOOK_ID>/cover" -F "file=@/tmp/test-cover.jpg;type=image/jpeg"
```

Expected: `200 {"coverUrl":"https://imagedelivery.net/...","fetchedCoverUrl":null}` (local mock), or `503` if the dev platform proxy doesn't expose the binding — a 503 here is acceptable; note it and verify on QA in Task 8 instead. A non-image upload must return 400.

- [ ] **Step 6: Commit**

```bash
git add wrangler.jsonc src/pages/api/books/[id]/cover.ts src/pages/api/books/[id].ts
git commit -m "feat: cover upload/reset endpoint via Cloudflare Images hosted binding"
```

---

### Task 4: Store actions `uploadCover` / `resetCover`

**Files:**
- Modify: `src/stores/shelf.ts`
- Test: `tests/stores/cover-upload.test.ts`

**Interfaces:**
- Consumes: Task 3 endpoints.
- Produces: `uploadCover(id: string, file: File): Promise<boolean>`, `resetCover(id: string): Promise<boolean>` — consumed by Task 7.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/stores/cover-upload.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

let _mockUserId: string | null = 'test-user-123';

vi.mock('../../src/stores/auth', () => ({
  currentUserId: { get: () => _mockUserId },
}));
vi.mock('../../src/stores/topics', () => ({
  inferTopicsFromSubjects: (subjects: string[]) => subjects.slice(0, 3),
}));
vi.mock('../../src/stores/sync-status', () => ({
  reportSyncError: vi.fn(),
}));

import { shelf, uploadCover, resetCover } from '../../src/stores/shelf';
import { reportSyncError } from '../../src/stores/sync-status';
import type { Book } from '../../src/lib/types';

const BOOK: Book = {
  id: 'b1',
  title: 'Dune',
  author: 'Frank Herbert',
  visibility: 'visible',
  ownership: 'have',
  intents: [],
  coverUrl: 'https://covers.openlibrary.org/b/id/1-M.jpg',
  addedVia: 'manual',
  addedAt: 1,
};

function mockFetchOnce(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(JSON.stringify(body)),
    })
  );
}

describe('uploadCover', () => {
  beforeEach(() => {
    _mockUserId = 'test-user-123';
    shelf.set({ b1: { ...BOOK } });
    vi.mocked(reportSyncError).mockClear();
  });

  it('POSTs multipart form data and applies the returned URLs', async () => {
    mockFetchOnce(200, {
      coverUrl: 'https://imagedelivery.net/h/img1/public',
      fetchedCoverUrl: 'https://covers.openlibrary.org/b/id/1-M.jpg',
    });
    const file = new File(['x'], 'cover.png', { type: 'image/png' });

    const ok = await uploadCover('b1', file);

    expect(ok).toBe(true);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe('/api/books/b1/cover');
    expect((init as RequestInit).method).toBe('POST');
    expect((init as RequestInit).body).toBeInstanceOf(FormData);
    expect(shelf.get()['b1'].coverUrl).toBe('https://imagedelivery.net/h/img1/public');
    expect(shelf.get()['b1'].fetchedCoverUrl).toBe('https://covers.openlibrary.org/b/id/1-M.jpg');
  });

  it('reports a sync error and leaves the book untouched on failure', async () => {
    mockFetchOnce(413, { error: 'too large' });
    const ok = await uploadCover('b1', new File(['x'], 'c.png', { type: 'image/png' }));

    expect(ok).toBe(false);
    expect(reportSyncError).toHaveBeenCalled();
    expect(shelf.get()['b1'].coverUrl).toBe(BOOK.coverUrl);
  });

  it('returns false without fetching when the book is missing', async () => {
    vi.stubGlobal('fetch', vi.fn());
    const ok = await uploadCover('nope', new File(['x'], 'c.png', { type: 'image/png' }));
    expect(ok).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('resetCover', () => {
  beforeEach(() => {
    _mockUserId = 'test-user-123';
    shelf.set({
      b1: {
        ...BOOK,
        coverUrl: 'https://imagedelivery.net/h/img1/public',
        fetchedCoverUrl: 'https://covers.openlibrary.org/b/id/1-M.jpg',
      },
    });
    vi.mocked(reportSyncError).mockClear();
  });

  it('DELETEs and applies the returned fallback cover', async () => {
    mockFetchOnce(200, { coverUrl: 'https://covers.openlibrary.org/b/id/1-M.jpg' });

    const ok = await resetCover('b1');

    expect(ok).toBe(true);
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe('/api/books/b1/cover');
    expect((vi.mocked(fetch).mock.calls[0][1] as RequestInit).method).toBe('DELETE');
    expect(shelf.get()['b1'].coverUrl).toBe('https://covers.openlibrary.org/b/id/1-M.jpg');
  });

  it('reports a sync error on failure', async () => {
    mockFetchOnce(500, { error: 'boom' });
    const ok = await resetCover('b1');
    expect(ok).toBe(false);
    expect(reportSyncError).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/stores/cover-upload.test.ts`
Expected: FAIL — `uploadCover`/`resetCover` not exported.

- [ ] **Step 3: Implement in `src/stores/shelf.ts`**

Add near the other message constants (top of file):

```ts
const COVER_SYNC_ERROR_MESSAGE = 'Could not update the cover. Please try again.';
```

Add after `removeBook` (before the notes section):

```ts
// ─── Custom covers ───────────────────────────────────────────────────────────
// Cover changes are NOT optimistic: the server owns the delivery URL, so the
// store is updated only after a 2xx response. Callers show their own
// in-progress state (the detail sheet disables its buttons while awaiting).

function applyCoverResult(id: string, coverUrl: string | undefined, fetchedCoverUrl?: string | null): void {
  const current = shelf.get();
  const book = current[id];
  if (!book) return;
  const next: Book = { ...book, coverUrl };
  if (fetchedCoverUrl !== undefined) {
    next.fetchedCoverUrl = fetchedCoverUrl ?? undefined;
  }
  shelf.set({ ...current, [id]: next });
}

export async function uploadCover(id: string, file: File): Promise<boolean> {
  if (!shelf.get()[id] || !currentUserId.get()) return false;
  try {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`/api/books/${id}/cover`, { method: 'POST', body: form });
    if (!res.ok) {
      console.error('Failed to upload cover:', await res.text());
      reportSyncError(COVER_SYNC_ERROR_MESSAGE);
      return false;
    }
    const data = await res.json() as { coverUrl: string; fetchedCoverUrl: string | null };
    applyCoverResult(id, data.coverUrl, data.fetchedCoverUrl);
    return true;
  } catch (e) {
    console.error('Failed to upload cover:', e);
    reportSyncError(COVER_SYNC_ERROR_MESSAGE);
    return false;
  }
}

export async function resetCover(id: string): Promise<boolean> {
  if (!shelf.get()[id] || !currentUserId.get()) return false;
  try {
    const res = await fetch(`/api/books/${id}/cover`, { method: 'DELETE' });
    if (!res.ok) {
      console.error('Failed to reset cover:', await res.text());
      reportSyncError(COVER_SYNC_ERROR_MESSAGE);
      return false;
    }
    const data = await res.json() as { coverUrl: string | null };
    applyCoverResult(id, data.coverUrl ?? undefined);
    return true;
  } catch (e) {
    console.error('Failed to reset cover:', e);
    reportSyncError(COVER_SYNC_ERROR_MESSAGE);
    return false;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/stores/cover-upload.test.ts && npm run test:run`
Expected: new file PASS; full suite PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stores/shelf.ts tests/stores/cover-upload.test.ts
git commit -m "feat: uploadCover/resetCover store actions"
```

---

### Task 5: Compact fixed-size BookCard (details view)

**Files:**
- Rewrite: `src/components/BookCard.svelte`
- Modify: `src/components/ShelfIsland.svelte` (BookCard usage ×2, `.grid` CSS)

**Interfaces:**
- Produces: `BookCard` props become `{ book: Book; lang?: Lang; onOpen: (id: string) => void }` (same shape as `BookSpine`). Inline-edit props are deleted.
- Before rewriting, run `grep -rn "BookCard" src/` — if any consumer besides `ShelfIsland.svelte` passes the old props, update it the same way (expected: none).

- [ ] **Step 1: Rewrite BookCard.svelte**

```svelte
<script lang="ts">
  import type { Book } from '../lib/types';
  import { useTranslations, type Lang } from '../i18n';

  interface Props {
    book: Book;
    lang?: Lang;
    onOpen: (id: string) => void;
  }

  let { book, lang = 'en' as Lang, onOpen }: Props = $props();

  const t = $derived(useTranslations(lang).shelf.card);
  const intentLabels = $derived(useTranslations(lang).shelf.intents.labels);

  // Mirror BookSpine: fold visual status (edge tick, dots, lock) into the
  // accessible name so the button reads the same as the card looks.
  const statusSuffix = $derived.by(() => {
    const parts: string[] = [];
    if (book.ownership === 'seeking') parts.push(t.seeking);
    if (book.visibility === 'private') parts.push(t.private);
    if (book.intents.length > 0) {
      parts.push(book.intents.map((intent) => intentLabels[intent]).join(', '));
    }
    return parts.length > 0 ? ` — ${parts.join(' · ')}` : '';
  });
  const openLabel = $derived(t.openDetailAria.replace('{title}', book.title) + statusSuffix);
</script>

<button
  class="book-card card"
  class:seeking={book.ownership === 'seeking'}
  data-book-id={book.id}
  onclick={() => onOpen(book.id)}
  aria-label={openLabel}
  aria-haspopup="dialog"
>
  {#if book.coverUrl}
    <img src={book.coverUrl} alt="" class="cover" width="52" height="78" loading="lazy" decoding="async" />
  {:else}
    <span class="cover placeholder" aria-hidden="true">
      <span>{book.title.charAt(0)}</span>
    </span>
  {/if}

  <span class="info">
    <span class="title serif">{book.title}</span>
    <span class="author muted">{book.author}</span>
    <span class="meta" aria-hidden="true">
      {#if book.ownership === 'seeking'}
        <span class="dot" data-status="seeking"></span>
      {/if}
      {#each book.intents as intent}
        <span class="dot" data-status={intent}></span>
      {/each}
      {#if book.visibility === 'private'}
        <svg class="lock" width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2.5" y="5.5" width="7" height="5" rx="1" />
          <path d="M4 5.5V4a2 2 0 0 1 4 0v1.5" />
        </svg>
      {/if}
    </span>
  </span>
</button>

<style>
  .book-card {
    display: flex;
    align-items: flex-start;
    gap: var(--s-3);
    width: 100%;
    height: 102px; /* 78px cover + 2 × var(--s-3) padding: every card identical */
    padding: var(--s-3);
    text-align: left;
    cursor: pointer;
    overflow: hidden;
    touch-action: pan-y;
  }

  .book-card.seeking {
    border-left-color: var(--hairline);
    background: color-mix(in oklch, var(--st-seeking-bg) 40%, var(--surface));
  }

  .book-card:hover,
  .book-card:focus-visible {
    transform: translateY(-2px);
    box-shadow: var(--shadow-2);
    border-color: var(--hairline-strong);
  }

  .cover {
    width: 52px;
    height: 78px;
    object-fit: cover;
    border-radius: var(--r-sm);
    flex-shrink: 0;
    box-shadow: var(--shadow-2);
  }

  .cover.placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--accent-tint);
    font-family: var(--font-display);
    font-size: 1.4rem;
    font-weight: 500;
    color: var(--accent);
  }

  .info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
  }

  .title {
    font-size: 0.9375rem;
    font-weight: 500;
    color: var(--ink);
    line-height: 1.28;
    letter-spacing: -0.01em;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .author {
    font-size: 0.8125rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .meta {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: auto;
    color: var(--ink-faint);
  }

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
  }

  .dot[data-status='borrowable'] { background: var(--st-borrowable-fg); }
  .dot[data-status='discussable'] { background: var(--st-discussable-fg); }
  .dot[data-status='giftable'] { background: var(--st-giftable-fg); }
  .dot[data-status='seeking'] { background: var(--st-seeking-fg); }

  .lock {
    display: block;
  }

  @media (prefers-reduced-motion: reduce) {
    .book-card:hover,
    .book-card:focus-visible {
      transform: none;
    }
  }
</style>
```

- [ ] **Step 2: Rewire ShelfIsland's details grids**

In `src/components/ShelfIsland.svelte`, replace BOTH `<BookCard ... />` usages (the "have" grid ~line 196 and the "seeking" grid ~line 242) with:

```svelte
                  <BookCard {book} {lang} onOpen={(id) => (openBookId = id)} />
```

Replace the `.grid` rule (and its 820px media query) with fixed-width tracks:

```css
  .grid {
    display: grid;
    gap: var(--s-3);
    /* Fixed tracks: every card the same size, matching the covers view's
       uniform spines. */
    grid-template-columns: repeat(auto-fill, 232px);
  }

  @media (max-width: 560px) {
    .grid {
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    }
  }
```

Do NOT yet remove the now-unused imports (`updateBookIntents`, `addNote`, `updateNote`, `removeNote` are still used by the sheet wiring; `handleDeleteBook` likewise). Remove `.book-wrapper > :global(.book-card) { flex: 1; }` only if it breaks the fixed width — the wrapper is `display:flex`, so keep the rule (it stretches the card to the 232px track, which is desired).

- [ ] **Step 3: Verify**

Run: `npx astro check && npm run test:run`
Expected: PASS. Then `npm run dev`, open `/biblio`, switch to Details view: cards are uniform 232px×102px, no inline pills/notes/delete, clicking any card opens the detail sheet, Escape closes and returns focus. Covers view unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/components/BookCard.svelte src/components/ShelfIsland.svelte
git commit -m "feat: compact fixed-size book cards that open the detail sheet"
```

---

### Task 6: Slim toolbar with filter popover

**Files:**
- Create: `src/components/FilterPopover.svelte`
- Modify: `src/components/ShelfIsland.svelte` (replace `.filter-groups` card with toolbar row; move chip CSS out)
- Modify: `src/i18n/en/shelf.ts`, `src/i18n/fr/shelf.ts`

**Interfaces:**
- Consumes: `activeFilters`, `toggleOwnershipFilter`, `toggleIntentFilter`, `toggleVisibilityFilter`, `clearAllFilters` from `src/stores/shelf` (unchanged); `shelf` store for counts.
- Produces: `FilterPopover` with props `{ lang?: Lang }` (reads stores directly).

- [ ] **Step 1: Add i18n keys**

`src/i18n/en/shelf.ts`, inside `list` (after `viewToggleGroup`):

```ts
    filterButton: 'Filters',
    filterPopoverLabel: 'Filter books',
    // {n} interpolated
    filterActiveAria: '{n} filters active',
```

`src/i18n/fr/shelf.ts`, same key path (match the file's existing style):

```ts
    filterButton: 'Filtres',
    filterPopoverLabel: 'Filtrer les livres',
    // {n} interpolated
    filterActiveAria: '{n} filtres actifs',
```

- [ ] **Step 2: Create FilterPopover.svelte**

```svelte
<script lang="ts">
  import {
    shelf,
    activeFilters,
    toggleOwnershipFilter,
    toggleIntentFilter,
    toggleVisibilityFilter,
    clearAllFilters,
  } from '../stores/shelf';
  import type { BookIntent } from '../lib/types';
  import { INTENT_OPTIONS } from '../lib/intents';
  import { useTranslations, type Lang } from '../i18n';

  let { lang = 'en' as Lang }: { lang?: Lang } = $props();

  const t = $derived(useTranslations(lang).shelf.list);
  const intentLabels = $derived(useTranslations(lang).shelf.intents.labels);
  const intentPrompt = $derived(useTranslations(lang).shelf.intents.prompt);

  let filters = $derived($activeFilters);
  let allBooks = $derived(Object.values($shelf));
  let activeCount = $derived(
    filters.visibility.length + filters.ownership.length + filters.intents.length
  );

  let ownershipCounts = $derived({
    have: allBooks.filter((b) => b.ownership === 'have').length,
    seeking: allBooks.filter((b) => b.ownership === 'seeking').length,
  });
  let intentCounts = $derived(
    INTENT_OPTIONS.reduce((acc, opt) => {
      acc[opt.value] = allBooks.filter((b) => b.intents.includes(opt.value)).length;
      return acc;
    }, {} as Record<BookIntent, number>)
  );
  let privateCount = $derived(allBooks.filter((b) => b.visibility === 'private').length);

  let open = $state(false);
  let rootRef = $state<HTMLDivElement | null>(null);
  let buttonRef = $state<HTMLButtonElement | null>(null);

  function handleWindowPointerDown(event: PointerEvent) {
    if (open && rootRef && !rootRef.contains(event.target as Node)) {
      open = false;
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape' && open) {
      open = false;
      buttonRef?.focus();
    }
  }
</script>

<svelte:window onpointerdown={handleWindowPointerDown} onkeydown={handleKeyDown} />

<div class="filter-root" bind:this={rootRef}>
  <button
    class="btn btn-outline btn-sm filter-btn"
    aria-expanded={open}
    aria-haspopup="true"
    onclick={() => (open = !open)}
    bind:this={buttonRef}
  >
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
      <path d="M2 3.5h10M4 7h6M5.5 10.5h3" />
    </svg>
    {t.filterButton}
    {#if activeCount > 0}
      <span class="active-count" aria-label={t.filterActiveAria.replace('{n}', String(activeCount))}>
        {activeCount}
      </span>
    {/if}
  </button>

  {#if open}
    <div class="popover card" role="group" aria-label={t.filterPopoverLabel}>
      <div class="filter-row">
        <span class="filter-label">{t.filterOwnershipLabel}</span>
        <div class="chip-group" role="group" aria-label={t.filterOwnershipGroup}>
          <button
            class="chip"
            aria-pressed={filters.ownership.includes('have')}
            onclick={() => toggleOwnershipFilter('have')}
          >
            {t.have} {#if ownershipCounts.have > 0}<span class="count">{ownershipCounts.have}</span>{/if}
          </button>
          <button
            class="chip"
            aria-pressed={filters.ownership.includes('seeking')}
            onclick={() => toggleOwnershipFilter('seeking')}
          >
            {t.seeking} {#if ownershipCounts.seeking > 0}<span class="count">{ownershipCounts.seeking}</span>{/if}
          </button>
        </div>
      </div>

      <div class="filter-row">
        <span class="filter-label">{intentPrompt}</span>
        <div class="chip-group" role="group" aria-label={t.filterIntentGroup}>
          {#each INTENT_OPTIONS as opt}
            <button
              class="chip"
              aria-pressed={filters.intents.includes(opt.value)}
              onclick={() => toggleIntentFilter(opt.value)}
            >
              {intentLabels[opt.value]} {#if intentCounts[opt.value] > 0}<span class="count">{intentCounts[opt.value]}</span>{/if}
            </button>
          {/each}
        </div>
      </div>

      <div class="filter-row">
        <div class="chip-group" role="group" aria-label={t.filterVisibilityGroup}>
          <button
            class="chip"
            aria-pressed={filters.visibility.includes('private')}
            onclick={() => toggleVisibilityFilter('private')}
          >
            {t.privateOnly} {#if privateCount > 0}<span class="count">{privateCount}</span>{/if}
          </button>
        </div>
        {#if activeCount > 0}
          <button class="btn btn-plain btn-sm clear-link" onclick={() => clearAllFilters()}>
            {t.clearFilters}
          </button>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .filter-root {
    position: relative;
  }

  .filter-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--s-2);
  }

  .active-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.2rem;
    height: 1.2rem;
    padding: 0 0.3rem;
    font-size: 0.7rem;
    font-weight: 640;
    background: var(--accent-tint);
    color: var(--accent);
    border-radius: var(--r-full);
  }

  .popover {
    position: absolute;
    top: calc(100% + var(--s-2));
    right: 0;
    z-index: 50;
    display: flex;
    flex-direction: column;
    gap: var(--s-3);
    min-width: 300px;
    max-width: min(92vw, 380px);
    padding: var(--s-4);
    box-shadow: var(--shadow-4);
    animation: fade var(--dur-2) var(--ease-soft) both;
  }

  .filter-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--s-2);
  }

  .filter-label {
    font-family: var(--font-ui);
    font-size: 0.8125rem;
    font-weight: 590;
    color: var(--ink-muted);
    min-width: 3rem;
  }

  .chip-group {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s-2);
  }

  .count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.2rem;
    height: 1.2rem;
    padding: 0 0.3rem;
    margin-left: 0.3rem;
    font-size: 0.7rem;
    font-weight: 640;
    background: var(--surface-sunken);
    color: var(--ink-muted);
    border-radius: var(--r-full);
  }

  .chip[aria-pressed='true'] .count {
    background: var(--accent-tint);
    color: var(--accent);
  }

  .clear-link {
    margin-left: auto;
  }

  @media (prefers-reduced-motion: reduce) {
    .popover {
      animation: none;
    }
  }
</style>
```

- [ ] **Step 3: Replace the filter card in ShelfIsland with the toolbar**

In `src/components/ShelfIsland.svelte`:

1. Import: `import FilterPopover from './FilterPopover.svelte';`
2. Delete the entire `<div class="filter-groups card">…</div>` block (lines ~75–148) AND the `<div class="header">…</div>` block above it, replacing both with:

```svelte
  <div class="toolbar">
    <h2 class="serif">{t.title} <span class="count-tag">{totalBooks} {t.countSuffix}</span></h2>
    <div class="toolbar-controls">
      <div class="segmented" role="group" aria-label={t.viewToggleGroup}>
        <button type="button" aria-pressed={view === 'covers'} onclick={() => setShelfView('covers')}>
          {t.viewCovers}
        </button>
        <button type="button" aria-pressed={view === 'details'} onclick={() => setShelfView('details')}>
          {t.viewDetails}
        </button>
      </div>
      <FilterPopover {lang} />
    </div>
  </div>
```

3. Script cleanup: remove now-unused imports (`activeFilters`? NO — keep: `filters`/`bookMatchesFilters`/`filteredBooks` still live here; remove only `toggleOwnershipFilter`, `toggleIntentFilter`, `toggleVisibilityFilter`, `clearAllFilters`, `INTENT_OPTIONS`) and now-unused derived values (`intentOptions`, `intentPrompt`, `showClear`, `ownershipCounts`, `intentCounts`, `privateCount`).
4. CSS: delete `.filter-groups`, `.filter-row`, `.filter-label`, `.chip-group`, `.count`, `.chip[aria-pressed="true"] .count`, `.clear-link` rules and the 600px `.filter-row` media query; delete the old `.header` rule; add:

```css
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--s-3);
    margin-bottom: var(--s-5);
  }

  .toolbar-controls {
    display: flex;
    align-items: center;
    gap: var(--s-3);
  }
```

- [ ] **Step 4: Verify**

Run: `npx astro check && npm run test:run`
Expected: PASS. Then in `npm run dev` at `/biblio`: one slim row (title left, toggle + Filters right); popover opens with all chips and live counts; filtering works; badge shows active count; Escape and outside-click close the popover; layout holds at 375px width.

- [ ] **Step 5: Commit**

```bash
git add src/components/FilterPopover.svelte src/components/ShelfIsland.svelte src/i18n/en/shelf.ts src/i18n/fr/shelf.ts
git commit -m "feat: slim shelf toolbar with filter popover"
```

---

### Task 7: Full-editor detail sheet (cover upload, title/author, ownership, visibility, intent toggles)

**Files:**
- Modify: `src/components/BookDetailSheet.svelte` (cover block + new props)
- Modify: `src/components/BookDetail.svelte` (details edit, dimension toggles, all-intents toggle pills)
- Modify: `src/components/ShelfIsland.svelte` (wire new sheet callbacks)
- Modify: `src/i18n/en/shelf.ts`, `src/i18n/fr/shelf.ts`

**Interfaces:**
- Consumes: `uploadCover`/`resetCover` (Task 4), `updateBook`/`updateBookOwnership`/`updateBookVisibility` (existing), `isHostedCoverUrl` (Task 1).
- Produces: `BookDetailSheet` new props `onUploadCover?: (file: File) => Promise<boolean>`, `onResetCover?: () => Promise<boolean>`, `onUpdateDetails?: (updates: { title: string; author: string }) => void`. `BookDetail` new prop `onUpdateDetails?` (same signature).

- [ ] **Step 1: Add i18n keys**

`src/i18n/en/shelf.ts`, inside `card` (after `closeDetailAria`):

```ts
    changeCover: 'Change cover',
    resetCover: 'Use original cover',
    uploadingCover: 'Uploading…',
    // {title} interpolated
    changeCoverAria: 'Upload a custom cover for {title}',
    editDetails: 'Edit title & author',
    editTitleLabel: 'Title',
    editAuthorLabel: 'Author',
    save: 'Save',
```

`src/i18n/fr/shelf.ts`, same key path:

```ts
    changeCover: 'Changer la couverture',
    resetCover: "Rétablir la couverture d'origine",
    uploadingCover: 'Envoi…',
    // {title} interpolated
    changeCoverAria: 'Téléverser une couverture pour {title}',
    editDetails: "Modifier le titre et l'auteur",
    editTitleLabel: 'Titre',
    editAuthorLabel: 'Auteur',
    save: 'Enregistrer',
```

- [ ] **Step 2: BookDetail.svelte — editable details, dimension toggles, all-intent pills**

All additions are gated on callbacks so existing readonly consumers render unchanged.

1. Script: add imports/props/state:

```ts
import { INTENT_OPTIONS } from '../lib/intents';
```

Add to `Props` and destructuring: `onUpdateDetails?: (updates: { title: string; author: string }) => void;`

Add below the existing state:

```ts
  const ta = $derived(useTranslations(lang).shelf.add);

  let editingDetails = $state(false);
  let draftTitle = $state('');
  let draftAuthor = $state('');

  function startEditDetails() {
    draftTitle = book.title;
    draftAuthor = book.author;
    editingDetails = true;
  }

  function saveDetails() {
    const title = draftTitle.trim();
    const author = draftAuthor.trim();
    if (!title || !author) return;
    onUpdateDetails?.({ title, author });
    editingDetails = false;
  }
```

2. Markup — replace the title/author block (lines 77–78) with:

```svelte
    {#if editingDetails}
      <div class="details-edit">
        <label class="details-field">
          <span class="details-label">{t.editTitleLabel}</span>
          <input class="input" bind:value={draftTitle} />
        </label>
        <label class="details-field">
          <span class="details-label">{t.editAuthorLabel}</span>
          <input class="input" bind:value={draftAuthor} />
        </label>
        <div class="details-actions">
          <button class="btn btn-outline btn-sm" onclick={() => (editingDetails = false)}>{t.cancel}</button>
          <button class="btn btn-filled btn-sm" onclick={saveDetails} disabled={!draftTitle.trim() || !draftAuthor.trim()}>{t.save}</button>
        </div>
      </div>
    {:else}
      <h3 class="title serif">
        {book.title}
        {#if !readonly && onUpdateDetails}
          <button class="edit-details" onclick={startEditDetails} aria-label={t.editDetails}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 2.5l1.5 1.5L5 10.5l-2 .5.5-2z" />
            </svg>
          </button>
        {/if}
      </h3>
      <p class="author muted">{book.author}</p>
    {/if}
```

3. Markup — replace the intents portion of `.badges` (the `{#each book.intents as intent}` block, lines 87–105) so editable mode offers ALL intents as toggles:

```svelte
      {#if readonly || !onIntentsChange}
        {#each book.intents as intent}
          <span class="pill" data-status={intent}>{intentLabels[intent]}</span>
        {/each}
      {:else}
        {#each INTENT_OPTIONS as opt}
          <button
            class="pill pill-button"
            class:pill-off={!book.intents.includes(opt.value)}
            data-status={opt.value}
            aria-pressed={book.intents.includes(opt.value)}
            onclick={() => toggleIntent(opt.value)}
          >
            {intentLabels[opt.value]}
          </button>
        {/each}
      {/if}
```

(The `.pill-x` remove icon becomes unused in this file — delete its markup usage; toggling off is now the same button.)

4. Markup — add dimension toggle rows after the `.badges` div, before the scan-verified block:

```svelte
    {#if !readonly && (onOwnershipChange || onVisibilityChange)}
      <div class="dimensions">
        {#if onOwnershipChange}
          <div class="dimension-row">
            <span class="dimension-label">{ta.ownership.prompt}</span>
            <div class="segmented segmented-sm" role="group" aria-label={ta.ownership.groupLabel}>
              <button type="button" aria-pressed={book.ownership === 'have'} onclick={() => onOwnershipChange?.('have')}>{ta.ownership.have}</button>
              <button type="button" aria-pressed={book.ownership === 'seeking'} onclick={() => onOwnershipChange?.('seeking')}>{ta.ownership.seeking}</button>
            </div>
          </div>
        {/if}
        {#if onVisibilityChange}
          <div class="dimension-row">
            <span class="dimension-label">{ta.visibility.prompt}</span>
            <div class="segmented segmented-sm" role="group" aria-label={ta.visibility.groupLabel}>
              <button type="button" aria-pressed={book.visibility === 'visible'} onclick={() => onVisibilityChange?.('visible')}>{ta.visibility.visible}</button>
              <button type="button" aria-pressed={book.visibility === 'private'} onclick={() => onVisibilityChange?.('private')}>{ta.visibility.private}</button>
            </div>
          </div>
        {/if}
      </div>
    {/if}
```

5. CSS additions:

```css
  .edit-details {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    margin-left: var(--s-1);
    color: var(--ink-muted);
    background: none;
    border: none;
    border-radius: var(--r-full);
    cursor: pointer;
    vertical-align: middle;
    transition: color var(--dur-1) var(--ease-soft);
  }

  .edit-details:hover {
    color: var(--accent);
  }

  .details-edit {
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
    margin-bottom: var(--s-2);
  }

  .details-field {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .details-label {
    font-family: var(--font-ui);
    font-size: 0.75rem;
    font-weight: 590;
    color: var(--ink-muted);
  }

  .details-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--s-2);
  }

  .pill-off {
    opacity: 0.45;
  }

  .pill-off:hover {
    opacity: 1;
  }

  .dimensions {
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
    margin-top: var(--s-3);
  }

  .dimension-row {
    display: flex;
    align-items: center;
    gap: var(--s-3);
  }

  .dimension-label {
    font-family: var(--font-ui);
    font-size: 0.8125rem;
    font-weight: 590;
    color: var(--ink-muted);
    min-width: 3rem;
  }
```

(If there is no global `.input` class, check `AddBookIsland.svelte` for the text-input class it uses and reuse that.)

- [ ] **Step 3: BookDetailSheet.svelte — cover block**

1. Script: add props `onUploadCover`, `onResetCover`, `onUpdateDetails` (pass `onUpdateDetails` through to `BookDetail`); add import `import { isHostedCoverUrl } from '../lib/coverImages';`; add state/handlers:

```ts
  let fileInputRef: HTMLInputElement | null = $state(null);
  let uploading = $state(false);
  const canReset = $derived(!!book.fetchedCoverUrl && isHostedCoverUrl(book.coverUrl));
  const tc = $derived(useTranslations(lang).shelf.card);

  async function handleFileChange(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !onUploadCover) return;
    uploading = true;
    await onUploadCover(file);
    uploading = false;
  }

  async function handleResetCover() {
    if (!onResetCover) return;
    uploading = true;
    await onResetCover();
    uploading = false;
  }
```

(`t` already exists and equals `shelf.card`; if so, use `t` and skip `tc`.)

2. Markup — wrap the existing cover in a column with actions (replace the cover `{#if}` block in `.sheet-header`):

```svelte
      <div class="cover-block">
        {#if book.coverUrl}
          <img class="sheet-cover" src={book.coverUrl} alt="" width="60" height="90" loading="lazy" decoding="async" />
        {:else}
          <div class="sheet-cover placeholder">
            <span>{book.title.charAt(0)}</span>
          </div>
        {/if}
        {#if onUploadCover}
          <input
            type="file"
            accept="image/*"
            class="visually-hidden-input"
            bind:this={fileInputRef}
            onchange={handleFileChange}
          />
          <button
            class="btn btn-outline btn-sm"
            onclick={() => fileInputRef?.click()}
            disabled={uploading}
            aria-label={t.changeCoverAria.replace('{title}', book.title)}
          >
            {uploading ? t.uploadingCover : t.changeCover}
          </button>
          {#if canReset && onResetCover}
            <button class="btn btn-plain btn-sm" onclick={handleResetCover} disabled={uploading}>
              {t.resetCover}
            </button>
          {/if}
        {/if}
      </div>
```

3. CSS additions:

```css
  .cover-block {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--s-2);
    flex-shrink: 0;
  }

  .visually-hidden-input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }
```

- [ ] **Step 4: Wire the sheet in ShelfIsland.svelte**

Extend the imports from `../stores/shelf` with `updateBook`, `updateBookOwnership`, `updateBookVisibility`, `uploadCover`, `resetCover`. Extend the `<BookDetailSheet>` usage (after `onIntentsChange`):

```svelte
    onOwnershipChange={(ownership) => updateBookOwnership(openBook.id, ownership)}
    onVisibilityChange={(visibility) => updateBookVisibility(openBook.id, visibility)}
    onUpdateDetails={(updates) => updateBook(openBook.id, updates)}
    onUploadCover={(file) => uploadCover(openBook.id, file)}
    onResetCover={() => resetCover(openBook.id)}
```

- [ ] **Step 5: Verify**

Run: `npx astro check && npm run test:run`
Expected: PASS. Then in `npm run dev` at `/biblio`, open a book from BOTH views and confirm: title/author pencil-edit saves; ownership + visibility segments flip (and the card updates behind the modal); all three intent pills toggle; "Change cover" uploads (or surfaces the sync-error toast if local binding is unavailable); reset appears only after a custom cover exists. Confirm a `readonly` BookDetail consumer (e.g. match/profile views) renders unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/components/BookDetailSheet.svelte src/components/BookDetail.svelte src/components/ShelfIsland.svelte src/i18n/en/shelf.ts src/i18n/fr/shelf.ts
git commit -m "feat: full-editor book detail sheet with custom cover upload"
```

---

### Task 8: QA journey + final verification

**Files:**
- Modify: `qa/journeys/02-shelf.sh` (Tests 5–6 + new modal test)

**Interfaces:** none produced; exercises Tasks 5–7.

- [ ] **Step 1: Update the journey**

Replace Test 6 ("Filter pills") in `qa/journeys/02-shelf.sh` with:

```bash
# Test 6: Filter popover (filters moved off the page into a popover)
info "Test: Filter popover"
snapshot=$(agent-browser snapshot -i 2>/dev/null)
filter_ref=$(echo "$snapshot" | grep -i "filter" | grep -o '\[ref=e[0-9]*\]' | sed 's/\[ref=//;s/\]//' | head -1)
if [ -n "$filter_ref" ]; then
  agent-browser click "$filter_ref" >/dev/null 2>&1
  sleep 1
  snapshot=$(agent-browser snapshot -i 2>/dev/null)
  if echo "$snapshot" | grep -qi "lending\|discussion\|gifting\|private only"; then
    pass "Filter popover opens with filter chips"
  else
    info "Filter popover content not detected"
  fi
  agent-browser press Escape >/dev/null 2>&1
else
  info "Filter button not found"
fi

# Test 7: Book card opens the edit modal (details view)
info "Test: Card opens edit modal"
snapshot=$(agent-browser snapshot -i 2>/dev/null)
details_ref=$(echo "$snapshot" | grep -i "\"Details\"" | grep -o '\[ref=e[0-9]*\]' | sed 's/\[ref=//;s/\]//' | head -1)
[ -n "$details_ref" ] && agent-browser click "$details_ref" >/dev/null 2>&1 && sleep 1
snapshot=$(agent-browser snapshot -i 2>/dev/null)
card_ref=$(echo "$snapshot" | grep -i "view details for" | grep -o '\[ref=e[0-9]*\]' | sed 's/\[ref=//;s/\]//' | head -1)
if [ -n "$card_ref" ]; then
  agent-browser click "$card_ref" >/dev/null 2>&1
  sleep 1
  snapshot=$(agent-browser snapshot -i 2>/dev/null)
  if echo "$snapshot" | grep -qi "change cover"; then
    pass "Edit modal opens from details-view card with cover controls"
  else
    info "Modal opened but cover controls not detected"
  fi
  agent-browser press Escape >/dev/null 2>&1
else
  info "No book card found (shelf may be empty)"
fi
```

Also update the header comment (line 3) to: `# Tests: add book (ISBN/manual), intent badges, filter popover, edit modal, empty state / add slot`.

- [ ] **Step 2: Full local verification**

Run: `npm run test:run && npx astro check && npm run build`
Expected: all pass.

- [ ] **Step 3: Verify end-to-end in the running app**

Use the superpowers verification approach (or the `verify` skill): with `npm run dev` running, walk both views, the toolbar/popover, the modal edits, and a cover upload; confirm the D1 row's `cover_url`/`fetched_cover_url` via `npx wrangler d1 execute DB --local --command "SELECT cover_url, fetched_cover_url FROM books LIMIT 5"`.

- [ ] **Step 4: Commit**

```bash
git add qa/journeys/02-shelf.sh
git commit -m "test: QA journey covers filter popover and edit modal"
```

- [ ] **Step 5: Push and open PR** (per repo convention — always push and create a PR when finishing a branch).
