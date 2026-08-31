/**
 * Integration tests for POST /api/stores/[id]/books.
 *
 * These invoke the REAL handler from src/pages/api/stores/[id]/books.ts
 * against a REAL in-memory SQLite database (via D1Shim), covering auth,
 * store ownership, validation hardening, and inventory normalization.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { POST as postStoreBookHandler } from '../../src/pages/api/stores/[id]/books';
import { createTestDb, seedUser } from '../helpers/test-db';
import { setTestDb, resetTestDb } from '../mocks/cloudflare-workers';
import { callApi, callApiAs } from '../helpers/api';
import type { D1Shim } from '../helpers/d1-shim';

const BASE = 'http://localhost';
const OWNER = 'store-owner';
const OTHER = 'other-user';
const STORE = 'store-1';

let db: D1Shim;

function insertStore(id: string, addedBy: string): void {
  const now = Date.now();
  db.prepare(
    `INSERT INTO users (id, email, name, type, added_by, created_at, updated_at)
     VALUES (?, ?, ?, 'bookstore', ?, ?, ?)`
  )
    .bind(id, `${id}@test.local`, id, addedBy, now, now)
    .run();
}

async function countBooks(): Promise<number> {
  const { results } = await db.prepare('SELECT COUNT(*) AS n FROM books').bind().all();
  return results[0].n as number;
}

beforeEach(() => {
  db = createTestDb();
  setTestDb(db);
  seedUser(db, OWNER);
  seedUser(db, OTHER);
  insertStore(STORE, OWNER);
});

afterEach(() => {
  resetTestDb();
});

describe('POST /api/stores/:id/books', () => {
  it('returns 401 when unauthenticated', async () => {
    const { status, json } = await callApi(postStoreBookHandler, {
      method: 'POST',
      url: `${BASE}/api/stores/${STORE}/books`,
      params: { id: STORE },
      body: { title: 'Dune', author: 'Frank Herbert' },
    });
    expect(status).toBe(401);
    expect((json as { error: string }).error).toBe('Not authenticated');
  });

  it('returns 400 when the store id param is missing', async () => {
    const { status } = await callApiAs(OWNER, postStoreBookHandler, {
      method: 'POST',
      url: `${BASE}/api/stores//books`,
      params: {},
      body: { title: 'Dune', author: 'Frank Herbert' },
    });
    expect(status).toBe(400);
  });

  it('returns 404 for an unknown store', async () => {
    const { status, json } = await callApiAs(OWNER, postStoreBookHandler, {
      method: 'POST',
      url: `${BASE}/api/stores/no-such-store/books`,
      params: { id: 'no-such-store' },
      body: { title: 'Dune', author: 'Frank Herbert' },
    });
    expect(status).toBe(404);
    expect((json as { error: string }).error).toBe('Store not found');
  });

  it('returns 404 when the target user is a person, not a bookstore', async () => {
    const { status, json } = await callApiAs(OWNER, postStoreBookHandler, {
      method: 'POST',
      url: `${BASE}/api/stores/${OTHER}/books`,
      params: { id: OTHER },
      body: { title: 'Dune', author: 'Frank Herbert' },
    });
    expect(status).toBe(404);
    expect((json as { error: string }).error).toBe('Store not found');
  });

  it('returns 403 when the caller did not add the store', async () => {
    const { status, json } = await callApiAs(OTHER, postStoreBookHandler, {
      method: 'POST',
      url: `${BASE}/api/stores/${STORE}/books`,
      params: { id: STORE },
      body: { title: 'Dune', author: 'Frank Herbert' },
    });
    expect(status).toBe(403);
    expect((json as { error: string }).error).toContain('Not authorized');
    expect(await countBooks()).toBe(0);
  });

  it('returns 400 for a malformed JSON body', async () => {
    const { status, json } = await callApiAs(OWNER, postStoreBookHandler, {
      method: 'POST',
      url: `${BASE}/api/stores/${STORE}/books`,
      params: { id: STORE },
      rawBody: 'not-json{',
    });
    expect(status).toBe(400);
    expect((json as { error: string }).error).toBe('Invalid JSON body');
  });

  it('returns 400 when title or author is missing', async () => {
    const noAuthor = await callApiAs(OWNER, postStoreBookHandler, {
      method: 'POST',
      url: `${BASE}/api/stores/${STORE}/books`,
      params: { id: STORE },
      body: { title: 'Dune' },
    });
    expect(noAuthor.status).toBe(400);

    const noTitle = await callApiAs(OWNER, postStoreBookHandler, {
      method: 'POST',
      url: `${BASE}/api/stores/${STORE}/books`,
      params: { id: STORE },
      body: { author: 'Frank Herbert' },
    });
    expect(noTitle.status).toBe(400);
    expect(await countBooks()).toBe(0);
  });

  it('returns 400 for an invalid status value', async () => {
    const { status, json } = await callApiAs(OWNER, postStoreBookHandler, {
      method: 'POST',
      url: `${BASE}/api/stores/${STORE}/books`,
      params: { id: STORE },
      body: { title: 'Dune', author: 'Frank Herbert', status: 'bogus-status' },
    });
    expect(status).toBe(400);
    expect((json as { error: string }).error).toContain('Invalid status value');
    expect(await countBooks()).toBe(0);
  });

  it('creates a book on the store shelf (201) with a valid body', async () => {
    const { status, json } = await callApiAs(OWNER, postStoreBookHandler, {
      method: 'POST',
      url: `${BASE}/api/stores/${STORE}/books`,
      params: { id: STORE },
      body: {
        title: 'Dune',
        author: 'Frank Herbert',
        isbn: '9780441172719',
        status: 'borrowable',
        subjects: ['Science Fiction'],
      },
    });

    expect(status).toBe(201);
    const book = (json as { book: Record<string, unknown> }).book;
    expect(book.title).toBe('Dune');
    expect(book.status).toBe('borrowable');

    // Row belongs to the STORE, not the posting user.
    const { results } = await db
      .prepare('SELECT user_id, visibility FROM books WHERE id = ?')
      .bind(book.id)
      .all();
    expect(results).toHaveLength(1);
    expect(results[0].user_id).toBe(STORE);
  });

  it('forces visibility to visible and normalizes invalid ownership', async () => {
    const { status, json } = await callApiAs(OWNER, postStoreBookHandler, {
      method: 'POST',
      url: `${BASE}/api/stores/${STORE}/books`,
      params: { id: STORE },
      body: {
        title: 'Dune',
        author: 'Frank Herbert',
        visibility: 'private',
        ownership: 'stolen',
      },
    });

    expect(status).toBe(201);
    const book = (json as { book: Record<string, unknown> }).book;
    expect(book.visibility).toBe('visible');
    expect(book.ownership).toBe('have');
  });

  it('rejects hosted-cover delivery URLs supplied by the client', async () => {
    const { status, json } = await callApiAs(OWNER, postStoreBookHandler, {
      method: 'POST',
      url: `${BASE}/api/stores/${STORE}/books`,
      params: { id: STORE },
      body: {
        title: 'Dune',
        author: 'Frank Herbert',
        coverUrl: 'https://imagedelivery.net/acct-hash/some-image-id/public',
      },
    });

    expect(status).toBe(201);
    const book = (json as { book: Record<string, unknown> }).book;
    expect(book.coverUrl).toBeNull();
  });

  it('keeps ordinary external cover URLs', async () => {
    const { status, json } = await callApiAs(OWNER, postStoreBookHandler, {
      method: 'POST',
      url: `${BASE}/api/stores/${STORE}/books`,
      params: { id: STORE },
      body: {
        title: 'Dune',
        author: 'Frank Herbert',
        coverUrl: 'https://covers.openlibrary.org/b/id/123-M.jpg',
      },
    });

    expect(status).toBe(201);
    const book = (json as { book: Record<string, unknown> }).book;
    expect(book.coverUrl).toBe('https://covers.openlibrary.org/b/id/123-M.jpg');
  });
});
