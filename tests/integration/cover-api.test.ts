/**
 * Integration tests for POST /api/books/:id/cover (custom cover upload).
 *
 * Invokes the REAL handler against a REAL in-memory SQLite database (D1Shim)
 * plus a mock IMAGES binding installed via setTestImages(), so upload/delete
 * calls against Cloudflare Images can be observed.
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { File as NodeFile } from 'node:buffer';
import { POST as postCoverHandler } from '../../src/pages/api/books/[id]/cover';
import { POST as postBookHandler } from '../../src/pages/api/books/index';
import { DELETE as deleteBookHandler } from '../../src/pages/api/books/[id]';
import { createTestDb, seedUser } from '../helpers/test-db';
import { setTestDb, resetTestDb, setTestImages, resetTestImages } from '../mocks/cloudflare-workers';
import { callApiAs } from '../helpers/api';
import type { D1Shim } from '../helpers/d1-shim';

const BASE = 'http://localhost';
const USER = 'cover-test-user';
const OTHER_USER = 'cover-other-user';
const MAX_COVER_BYTES = 10 * 1024 * 1024;

let db: D1Shim;

/** Observable mock of the hosted-images namespace (env.IMAGES). */
function createImagesMock(options: { deleteThrows?: boolean } = {}) {
  const uploadedIds: string[] = [];
  const deletedIds: string[] = [];
  let counter = 0;

  const binding = {
    hosted: {
      async upload(_image: ArrayBuffer, _opts?: unknown) {
        const id = `img-${++counter}`;
        uploadedIds.push(id);
        return { id, variants: [`https://imagedelivery.net/testacct/${id}/public`] };
      },
      image(imageId: string) {
        return {
          async delete() {
            if (options.deleteThrows) throw new Error('images API unavailable');
            deletedIds.push(imageId);
            return true;
          },
        };
      },
    },
  };

  return { binding, uploadedIds, deletedIds };
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
});

describe('POST /api/books/:id/cover — happy path', () => {
  it('uploads the image and persists the hosted cover URL', async () => {
    const images = createImagesMock();
    setTestImages(images.binding);
    const bookId = await seedBook();

    const { status, json } = await callApiAs(USER, postCoverHandler, {
      method: 'POST',
      url: `${BASE}/api/books/${bookId}/cover`,
      rawBody: coverForm(),
      params: { id: bookId },
    });

    expect(status).toBe(200);
    expect((json as { coverUrl: string }).coverUrl).toBe(
      'https://imagedelivery.net/testacct/img-1/public'
    );
    expect(images.uploadedIds).toEqual(['img-1']);
    expect(images.deletedIds).toEqual([]);

    const { results } = await db.prepare('SELECT cover_url FROM books WHERE id = ?').bind(bookId).all();
    expect((results[0] as { cover_url: string }).cover_url).toBe(
      'https://imagedelivery.net/testacct/img-1/public'
    );
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
    const images = createImagesMock();
    setTestImages(images.binding);
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
    expect(images.uploadedIds).toEqual(['img-1']);
    expect(images.deletedIds).toEqual(['img-1']);

    // The book row is untouched.
    const { results } = await db.prepare('SELECT cover_url FROM books WHERE id = ?').bind(bookId).all();
    expect((results[0] as { cover_url: string | null }).cover_url).toBeNull();
  });

  it('still returns 500 when the cleanup delete itself fails (best-effort)', async () => {
    const images = createImagesMock({ deleteThrows: true });
    setTestImages(images.binding);
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
    const images = createImagesMock();
    setTestImages(images.binding);
    const bookId = await seedBook();

    setTestDb(deleteBeforeUpdate(db, bookId));
    const { status } = await callApiAs(USER, postCoverHandler, {
      method: 'POST',
      url: `${BASE}/api/books/${bookId}/cover`,
      rawBody: coverForm(),
      params: { id: bookId },
    });

    expect(status).toBe(409);
    expect(images.uploadedIds).toEqual(['img-1']);
    expect(images.deletedIds).toEqual(['img-1']);
  });
});

describe('POST /api/books/:id/cover — oversized upload', () => {
  it('returns 413 from the Content-Length check before parsing the body', async () => {
    const images = createImagesMock();
    setTestImages(images.binding);
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
    expect(images.uploadedIds).toEqual([]);
  });

  it('keeps returning 400 for a genuinely malformed body (formData fallback)', async () => {
    const images = createImagesMock();
    setTestImages(images.binding);
    const bookId = await seedBook();

    const { status } = await callApiAs(USER, postCoverHandler, {
      method: 'POST',
      url: `${BASE}/api/books/${bookId}/cover`,
      rawBody: 'not-multipart',
      headers: { 'Content-Type': 'multipart/form-data; boundary=nope' },
      params: { id: bookId },
    });

    expect(status).toBe(400);
    expect(images.uploadedIds).toEqual([]);
  });
});

describe('cover upload and book deletion interleavings', () => {
  const OLD_COVER = 'https://imagedelivery.net/testacct/old-image/public';

  async function setHostedCover(bookId: string): Promise<void> {
    await db.prepare('UPDATE books SET cover_url = ? WHERE id = ?').bind(OLD_COVER, bookId).run();
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
    const images = createImagesMock();
    setTestImages(images.binding);
    const bookId = await seedBook();
    await setHostedCover(bookId);
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
    expect(images.deletedIds).toContain('old-image');
    expect(images.deletedIds).toContain('img-1');
  });

  it('cleans the fresh upload when book deletion finishes before its DB update', async () => {
    let releaseUpload!: () => void;
    let uploadReached!: () => void;
    const uploadGate = new Promise<void>((resolve) => { releaseUpload = resolve; });
    const uploadStarted = new Promise<void>((resolve) => { uploadReached = resolve; });
    const images = createImagesMock();
    const originalUpload = images.binding.hosted.upload;
    images.binding.hosted.upload = async (...args: Parameters<typeof originalUpload>) => {
      uploadReached();
      await uploadGate;
      return originalUpload(...args);
    };
    setTestImages(images.binding);
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
    expect(images.deletedIds).toContain('img-1');
  });

  it('does not delete a hosted cover when another user attempts book deletion', async () => {
    const images = createImagesMock();
    setTestImages(images.binding);
    const bookId = await seedBook();
    await setHostedCover(bookId);

    const removed = await callApiAs(OTHER_USER, deleteBookHandler, {
      method: 'DELETE',
      url: `${BASE}/api/books/${bookId}`,
      params: { id: bookId },
    });

    expect(removed.status).toBe(404);
    expect(images.deletedIds).toEqual([]);
  });
});
