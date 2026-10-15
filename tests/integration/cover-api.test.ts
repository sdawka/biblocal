/**
 * Integration tests for POST /api/books/:id/cover (custom cover upload).
 *
 * Invokes the REAL handler against a REAL in-memory SQLite database (D1Shim)
 * plus mock COVERS (R2) and IMAGES (transform) bindings, so storage writes,
 * deletes and transforms can be observed.
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { File as NodeFile } from 'node:buffer';
import { POST as postCoverHandler } from '../../src/pages/api/books/[id]/cover';
import { POST as postBookHandler } from '../../src/pages/api/books/index';
import { DELETE as deleteBookHandler } from '../../src/pages/api/books/[id]';
import { GET as getCoverHandler } from '../../src/pages/api/covers/[...key]';
import { createTestDb, seedUser } from '../helpers/test-db';
import {
  setTestDb,
  resetTestDb,
  setTestImages,
  resetTestImages,
  setTestCovers,
  resetTestCovers,
} from '../mocks/cloudflare-workers';
import { callApiAs } from '../helpers/api';
import type { D1Shim } from '../helpers/d1-shim';

const BASE = 'http://localhost';
const USER = 'cover-test-user';
const OTHER_USER = 'cover-other-user';
const MAX_COVER_BYTES = 10 * 1024 * 1024;

let db: D1Shim;

/** Observable in-memory mock of the COVERS R2 bucket. */
function createCoversMock(options: { deleteThrows?: boolean } = {}) {
  const objects = new Map<string, { body: Uint8Array; contentType?: string }>();
  const putKeys: string[] = [];
  const deletedKeys: string[] = [];

  const binding = {
    async put(key: string, body: ArrayBuffer, opts?: { httpMetadata?: { contentType?: string } }) {
      putKeys.push(key);
      objects.set(key, { body: new Uint8Array(body), contentType: opts?.httpMetadata?.contentType });
      return { key };
    },
    async get(key: string) {
      const obj = objects.get(key);
      if (!obj) return null;
      return {
        body: new Response(obj.body).body,
        httpEtag: `"etag-${key}"`,
        httpMetadata: { contentType: obj.contentType },
      };
    },
    async delete(key: string) {
      if (options.deleteThrows) throw new Error('R2 unavailable');
      deletedKeys.push(key);
      objects.delete(key);
    },
  };

  return { binding, objects, putKeys, deletedKeys };
}

/** Mock of the Images transform binding; records each transform call. */
function createImagesMock(options: { fail?: boolean } = {}) {
  const transforms: Record<string, unknown>[] = [];
  const binding = {
    input(_stream: ReadableStream) {
      return {
        transform(t: Record<string, unknown>) {
          transforms.push(t);
          return {
            async output(_o: { format: string; quality: number }) {
              if (options.fail) throw new Error('transform failed');
              return { response: () => new Response(new Uint8Array([9, 9])) };
            },
          };
        },
      };
    },
  };
  return { binding, transforms };
}

async function seedBook(title = 'Dune'): Promise<string> {
  const { status, json } = await callApiAs(USER, postBookHandler, {
    method: 'POST',
    url: `${BASE}/api/books`,
    body: { title, author: 'Frank Herbert' },
  });
  expect(status).toBe(201);
  return (json as { book: { id: string } }).book.id;
}

// jsdom's FormData only accepts jsdom Files; capture that class before the
// global File stub below replaces it.
const JsdomFile = File;

function coverForm(bytes = 4): FormData {
  const form = new FormData();
  form.append('file', new JsdomFile([new Uint8Array(bytes)], 'cover.png', { type: 'image/png' }));
  return form;
}

beforeAll(() => {
  // jsdom's global File differs from the File class undici's request.formData()
  // produces; in the Workers runtime there is a single File class. Align the
  // global so the handler's `instanceof File` check behaves like production.
  vi.stubGlobal('File', NodeFile);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  db = createTestDb();
  setTestDb(db);
  seedUser(db, USER);
  seedUser(db, OTHER_USER);
});

afterEach(() => {
  resetTestDb();
  resetTestImages();
  resetTestCovers();
});

describe('POST /api/books/:id/cover — happy path', () => {
  it('stores the image in R2 and persists its /api/covers URL', async () => {
    const covers = createCoversMock();
    setTestCovers(covers.binding);
    const bookId = await seedBook();

    const { status, json } = await callApiAs(USER, postCoverHandler, {
      method: 'POST',
      url: `${BASE}/api/books/${bookId}/cover`,
      rawBody: coverForm(),
      params: { id: bookId },
    });

    expect(status).toBe(200);
    expect(covers.putKeys).toHaveLength(1);
    const [key] = covers.putKeys;
    expect(key.startsWith(`${bookId}/`)).toBe(true);
    expect((json as { coverUrl: string }).coverUrl).toBe(`${BASE}/api/covers/${key}`);
    expect(covers.objects.get(key)?.contentType).toBe('image/png');
    expect(covers.deletedKeys).toEqual([]);

    const { results } = await db.prepare('SELECT cover_url FROM books WHERE id = ?').bind(bookId).all();
    expect((results[0] as { cover_url: string }).cover_url).toBe(`${BASE}/api/covers/${key}`);
  });

  it('scales the upload down to WebP when the Images binding is present', async () => {
    const covers = createCoversMock();
    const images = createImagesMock();
    setTestCovers(covers.binding);
    setTestImages(images.binding);
    const bookId = await seedBook();

    const { status } = await callApiAs(USER, postCoverHandler, {
      method: 'POST',
      url: `${BASE}/api/books/${bookId}/cover`,
      rawBody: coverForm(),
      params: { id: bookId },
    });

    expect(status).toBe(200);
    expect(images.transforms).toEqual([{ width: 800, height: 1200, fit: 'scale-down' }]);
    const stored = covers.objects.get(covers.putKeys[0]);
    expect(stored?.contentType).toBe('image/webp');
    expect(Array.from(stored?.body ?? [])).toEqual([9, 9]);
  });

  it('stores the original when the transform fails', async () => {
    const covers = createCoversMock();
    setTestCovers(covers.binding);
    setTestImages(createImagesMock({ fail: true }).binding);
    const bookId = await seedBook();

    const { status } = await callApiAs(USER, postCoverHandler, {
      method: 'POST',
      url: `${BASE}/api/books/${bookId}/cover`,
      rawBody: coverForm(),
      params: { id: bookId },
    });

    expect(status).toBe(200);
    const stored = covers.objects.get(covers.putKeys[0]);
    expect(stored?.contentType).toBe('image/png');
    expect(Array.from(stored?.body ?? [])).not.toEqual([9, 9]);
  });

  it('rejects SVG uploads, which could script our origin', async () => {
    const covers = createCoversMock();
    setTestCovers(covers.binding);
    const bookId = await seedBook();
    const form = new FormData();
    form.append('file', new JsdomFile(['<svg/>'], 'cover.svg', { type: 'image/svg+xml' }));

    const { status } = await callApiAs(USER, postCoverHandler, {
      method: 'POST',
      url: `${BASE}/api/books/${bookId}/cover`,
      rawBody: form,
      params: { id: bookId },
    });

    expect(status).toBe(400);
    expect(covers.putKeys).toEqual([]);
  });

  it('returns 503 when the COVERS bucket is not bound', async () => {
    const bookId = await seedBook();
    const { status } = await callApiAs(USER, postCoverHandler, {
      method: 'POST',
      url: `${BASE}/api/books/${bookId}/cover`,
      rawBody: coverForm(),
      params: { id: bookId },
    });
    expect(status).toBe(503);
  });
});

describe('POST /api/books/:id/cover — orphaned image on DB failure', () => {
  /** Wraps the shim so UPDATE statements throw while SELECTs keep working. */
  function failUpdates(inner: D1Shim): D1Shim {
    return new Proxy(inner, {
      get(target, prop, receiver) {
        if (prop === 'prepare') {
          return (sql: string) => {
            if (/^\s*update\b/i.test(sql)) throw new Error('simulated D1 outage');
            return target.prepare(sql);
          };
        }
        return Reflect.get(target, prop, receiver);
      },
    });
  }

  /** Deletes the row after the ownership SELECT but before the cover UPDATE. */
  function deleteBeforeUpdate(inner: D1Shim, bookId: string): D1Shim {
    let deleted = false;
    return new Proxy(inner, {
      get(target, prop, receiver) {
        if (prop === 'prepare') {
          return (sql: string) => {
            if (!deleted && /^\s*update\s+["`]?books/i.test(sql)) {
              deleted = true;
              void target.prepare('DELETE FROM books WHERE id = ?').bind(bookId).run();
            }
            return target.prepare(sql);
          };
        }
        return Reflect.get(target, prop, receiver);
      },
    });
  }

  it('deletes the just-uploaded image and returns 500 when the DB update throws', async () => {
    const covers = createCoversMock();
    setTestCovers(covers.binding);
    const bookId = await seedBook();

    setTestDb(failUpdates(db));
    const { status } = await callApiAs(USER, postCoverHandler, {
      method: 'POST',
      url: `${BASE}/api/books/${bookId}/cover`,
      rawBody: coverForm(),
      params: { id: bookId },
    });

    expect(status).toBe(500);
    // The upload happened, so the orphan must have been cleaned up.
    expect(covers.putKeys).toHaveLength(1);
    expect(covers.deletedKeys).toEqual(covers.putKeys);

    // The book row is untouched.
    const { results } = await db.prepare('SELECT cover_url FROM books WHERE id = ?').bind(bookId).all();
    expect((results[0] as { cover_url: string | null }).cover_url).toBeNull();
  });

  it('still returns 500 when the cleanup delete itself fails (best-effort)', async () => {
    const covers = createCoversMock({ deleteThrows: true });
    setTestCovers(covers.binding);
    const bookId = await seedBook();

    setTestDb(failUpdates(db));
    const { status, json } = await callApiAs(USER, postCoverHandler, {
      method: 'POST',
      url: `${BASE}/api/books/${bookId}/cover`,
      rawBody: coverForm(),
      params: { id: bookId },
    });

    expect(status).toBe(500);
    expect((json as { error: string }).error).toBeTruthy();
  });

  it('deletes the uploaded image and fails when deletion wins before the DB update', async () => {
    const covers = createCoversMock();
    setTestCovers(covers.binding);
    const bookId = await seedBook();

    setTestDb(deleteBeforeUpdate(db, bookId));
    const { status } = await callApiAs(USER, postCoverHandler, {
      method: 'POST',
      url: `${BASE}/api/books/${bookId}/cover`,
      rawBody: coverForm(),
      params: { id: bookId },
    });

    expect(status).toBe(409);
    expect(covers.putKeys).toHaveLength(1);
    expect(covers.deletedKeys).toEqual(covers.putKeys);
  });
});

describe('POST /api/books/:id/cover — oversized upload', () => {
  it('returns 413 from the Content-Length check before parsing the body', async () => {
    const covers = createCoversMock();
    setTestCovers(covers.binding);
    const bookId = await seedBook();

    // Body is NOT valid multipart; if the handler tried to parse it, it would
    // fall into the formData catch and return 400. A 413 proves the
    // Content-Length header was checked first.
    const { status, json } = await callApiAs(USER, postCoverHandler, {
      method: 'POST',
      url: `${BASE}/api/books/${bookId}/cover`,
      rawBody: 'x',
      headers: { 'Content-Length': String(MAX_COVER_BYTES * 2) },
      params: { id: bookId },
    });

    expect(status).toBe(413);
    expect((json as { error: string }).error).toMatch(/too large/i);
    expect(covers.putKeys).toEqual([]);
  });

  it('keeps returning 400 for a genuinely malformed body (formData fallback)', async () => {
    const covers = createCoversMock();
    setTestCovers(covers.binding);
    const bookId = await seedBook();

    const { status } = await callApiAs(USER, postCoverHandler, {
      method: 'POST',
      url: `${BASE}/api/books/${bookId}/cover`,
      rawBody: 'not-multipart',
      headers: { 'Content-Type': 'multipart/form-data; boundary=nope' },
      params: { id: bookId },
    });

    expect(status).toBe(400);
    expect(covers.putKeys).toEqual([]);
  });
});

describe('cover upload and book deletion interleavings', () => {
  async function setUploadedCover(bookId: string, coverBookId = bookId): Promise<string> {
    const key = `${coverBookId}/old-cover`;
    await db
      .prepare('UPDATE books SET cover_url = ? WHERE id = ?')
      .bind(`${BASE}/api/covers/${key}`, bookId)
      .run();
    return key;
  }

  function gateBatch(inner: D1Shim) {
    let release!: () => void;
    let reached!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const batchReached = new Promise<void>((resolve) => { reached = resolve; });
    const wrapped = new Proxy(inner, {
      get(target, prop, receiver) {
        if (prop === 'batch') {
          return async (statements: Parameters<D1Shim['batch']>[0]) => {
            reached();
            await gate;
            return target.batch(statements);
          };
        }
        return Reflect.get(target, prop, receiver);
      },
    });
    return { wrapped, batchReached, release };
  }

  it('deletes the cover URL present when the book deletion wins after an upload', async () => {
    const covers = createCoversMock();
    setTestCovers(covers.binding);
    const bookId = await seedBook();
    const oldKey = await setUploadedCover(bookId);
    const batch = gateBatch(db);
    setTestDb(batch.wrapped);

    const deletion = callApiAs(USER, deleteBookHandler, {
      method: 'DELETE',
      url: `${BASE}/api/books/${bookId}`,
      params: { id: bookId },
    });
    await batch.batchReached;

    const upload = await callApiAs(USER, postCoverHandler, {
      method: 'POST',
      url: `${BASE}/api/books/${bookId}/cover`,
      rawBody: coverForm(),
      params: { id: bookId },
    });
    expect(upload.status).toBe(200);

    batch.release();
    const removed = await deletion;
    expect(removed.status).toBe(200);
    expect(covers.deletedKeys).toContain(oldKey);
    expect(covers.deletedKeys).toContain(covers.putKeys[0]);
  });

  it('cleans the fresh upload when book deletion finishes before its DB update', async () => {
    let releaseUpload!: () => void;
    let uploadReached!: () => void;
    const uploadGate = new Promise<void>((resolve) => { releaseUpload = resolve; });
    const uploadStarted = new Promise<void>((resolve) => { uploadReached = resolve; });
    const covers = createCoversMock();
    const originalPut = covers.binding.put;
    covers.binding.put = async (...args: Parameters<typeof originalPut>) => {
      uploadReached();
      await uploadGate;
      return originalPut(...args);
    };
    setTestCovers(covers.binding);
    const bookId = await seedBook();

    const upload = callApiAs(USER, postCoverHandler, {
      method: 'POST',
      url: `${BASE}/api/books/${bookId}/cover`,
      rawBody: coverForm(),
      params: { id: bookId },
    });
    await uploadStarted;

    const removed = await callApiAs(USER, deleteBookHandler, {
      method: 'DELETE',
      url: `${BASE}/api/books/${bookId}`,
      params: { id: bookId },
    });
    expect(removed.status).toBe(200);

    releaseUpload();
    expect((await upload).status).toBe(409);
    expect(covers.deletedKeys).toContain(covers.putKeys[0]);
  });

  it('does not delete an uploaded cover when another user attempts book deletion', async () => {
    const covers = createCoversMock();
    setTestCovers(covers.binding);
    const bookId = await seedBook();
    await setUploadedCover(bookId);

    const removed = await callApiAs(OTHER_USER, deleteBookHandler, {
      method: 'DELETE',
      url: `${BASE}/api/books/${bookId}`,
      params: { id: bookId },
    });

    expect(removed.status).toBe(404);
    expect(covers.deletedKeys).toEqual([]);
  });

  it("never deletes another book's cover referenced from this book", async () => {
    const covers = createCoversMock();
    setTestCovers(covers.binding);
    const bookId = await seedBook();
    await setUploadedCover(bookId, 'someone-elses-book');

    const removed = await callApiAs(USER, deleteBookHandler, {
      method: 'DELETE',
      url: `${BASE}/api/books/${bookId}`,
      params: { id: bookId },
    });

    expect(removed.status).toBe(200);
    expect(covers.deletedKeys).toEqual([]);
  });
});

describe('GET /api/covers/:key', () => {
  it('serves the stored object with immutable, sandboxed headers', async () => {
    const covers = createCoversMock();
    setTestCovers(covers.binding);
    await covers.binding.put('book-1/abc', new Uint8Array([1, 2, 3]).buffer, {
      httpMetadata: { contentType: 'image/webp' },
    });

    const res = await getCoverHandler({
      params: { key: 'book-1/abc' },
      request: new Request(`${BASE}/api/covers/book-1/abc`),
    } as unknown as Parameters<typeof getCoverHandler>[0]);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/webp');
    expect(res.headers.get('Cache-Control')).toContain('immutable');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('returns 404 for a missing key', async () => {
    setTestCovers(createCoversMock().binding);
    const res = await getCoverHandler({
      params: { key: 'book-1/missing' },
      request: new Request(`${BASE}/api/covers/book-1/missing`),
    } as unknown as Parameters<typeof getCoverHandler>[0]);
    expect(res.status).toBe(404);
  });
});
