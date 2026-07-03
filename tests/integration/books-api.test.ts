/**
 * Integration tests for the books API handlers.
 *
 * These invoke the REAL handler functions from src/pages/api/books/ against a
 * REAL in-memory SQLite database (via D1Shim). Nothing is simulated.
 *
 * The cloudflare:workers alias (vitest.config.ts) resolves to
 * tests/mocks/cloudflare-workers.ts; setTestDb() wires our shim into env.DB
 * so the handlers find it at call time.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET as getBooksHandler, POST as postBookHandler } from '../../src/pages/api/books/index';
import { PATCH as patchBookHandler, DELETE as deleteBookHandler } from '../../src/pages/api/books/[id]';
import { GET as getProfileHandler } from '../../src/pages/api/profile';
import { createTestDb, seedUser } from '../helpers/test-db';
import { setTestDb, resetTestDb } from '../mocks/cloudflare-workers';
import { callApi, callApiAs } from '../helpers/api';
import type { D1Shim } from '../helpers/d1-shim';

const BASE = 'http://localhost';
const USER_A = 'test-user-a';
const USER_B = 'test-user-b';

let db: D1Shim;

beforeEach(() => {
  db = createTestDb();
  setTestDb(db);
});

afterEach(() => {
  resetTestDb();
});

// ─── POST /api/books ──────────────────────────────────────────────────────────

describe('POST /api/books', () => {
  beforeEach(() => {
    seedUser(db, USER_A);
  });

  it('returns 201 and persists the row in the DB', async () => {
    const { status, json } = await callApiAs(USER_A, postBookHandler, {
      method: 'POST',
      url: `${BASE}/api/books`,
      body: { title: 'Dune', author: 'Frank Herbert' },
    });

    expect(status).toBe(201);
    const book = (json as { book: { id: string; title: string } }).book;
    expect(book.title).toBe('Dune');

    // Verify it actually landed in the DB
    const row = db.prepare('SELECT * FROM books WHERE id = ?').bind(book.id);
    const { results } = await row.all();
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Dune');
  });

  it('GET ?mine=true returns the newly-posted book (end-to-end readback)', async () => {
    await callApiAs(USER_A, postBookHandler, {
      method: 'POST',
      url: `${BASE}/api/books`,
      body: { title: 'The Master and Margarita', author: 'Bulgakov' },
    });

    const { status, json } = await callApiAs(USER_A, getBooksHandler, {
      url: `${BASE}/api/books?mine=true`,
    });

    expect(status).toBe(200);
    const books = (json as { books: { title: string }[] }).books;
    expect(books.some((b) => b.title === 'The Master and Margarita')).toBe(true);
  });

  it('returns 400 when title is missing', async () => {
    const { status } = await callApiAs(USER_A, postBookHandler, {
      method: 'POST',
      url: `${BASE}/api/books`,
      body: { author: 'Frank Herbert' },
    });
    expect(status).toBe(400);
  });

  it('returns 400 when author is missing', async () => {
    const { status } = await callApiAs(USER_A, postBookHandler, {
      method: 'POST',
      url: `${BASE}/api/books`,
      body: { title: 'Dune' },
    });
    expect(status).toBe(400);
  });

  it('returns 400 for an invalid visibility value', async () => {
    const { status, json } = await callApiAs(USER_A, postBookHandler, {
      method: 'POST',
      url: `${BASE}/api/books`,
      body: { title: 'Dune', author: 'Frank Herbert', visibility: 'public' },
    });
    expect(status).toBe(400);
    expect(JSON.stringify(json)).toContain('visibility');
  });

  it('returns 400 for an invalid ownership value', async () => {
    const { status } = await callApiAs(USER_A, postBookHandler, {
      method: 'POST',
      url: `${BASE}/api/books`,
      body: { title: 'Dune', author: 'Frank Herbert', ownership: 'borrowing' },
    });
    expect(status).toBe(400);
  });

  it('returns 401 when not authenticated', async () => {
    const { status } = await callApi(postBookHandler, {
      method: 'POST',
      url: `${BASE}/api/books`,
      body: { title: 'Dune', author: 'Frank Herbert' },
      locals: {},
    });
    expect(status).toBe(401);
  });

  it('ISBN dedup: second POST with same ISBN returns 200 and the existing book', async () => {
    const body = { title: 'Dune', author: 'Frank Herbert', isbn: '9780441013593' };

    const first = await callApiAs(USER_A, postBookHandler, {
      method: 'POST',
      url: `${BASE}/api/books`,
      body,
    });
    expect(first.status).toBe(201);

    const second = await callApiAs(USER_A, postBookHandler, {
      method: 'POST',
      url: `${BASE}/api/books`,
      body,
    });
    expect(second.status).toBe(200);

    const firstId = (first.json as { book: { id: string } }).book.id;
    const secondId = (second.json as { book: { id: string } }).book.id;
    expect(firstId).toBe(secondId);

    // Only one row in the DB
    const { results } = await db.prepare("SELECT COUNT(*) as c FROM books WHERE isbn = '9780441013593'").bind().all();
    expect((results[0] as { c: number }).c).toBe(1);
  });

  it('intents round-trip: POST with intents → GET returns them parsed', async () => {
    await callApiAs(USER_A, postBookHandler, {
      method: 'POST',
      url: `${BASE}/api/books`,
      body: { title: 'Dune', author: 'Frank Herbert', intents: ['borrowable', 'discussable'] },
    });

    const { json } = await callApiAs(USER_A, getBooksHandler, {
      url: `${BASE}/api/books?mine=true`,
    });

    const books = (json as { books: { title: string; intents: string }[] }).books;
    const dune = books.find((b) => b.title === 'Dune');
    expect(dune).toBeDefined();
    // intents is stored as a JSON string in the DB; the handler returns it raw
    const intents = JSON.parse(dune!.intents);
    expect(intents).toContain('borrowable');
    expect(intents).toContain('discussable');
  });
});

// ─── POST /api/books — id idempotency ────────────────────────────────────────

describe('POST /api/books — id idempotency', () => {
  beforeEach(() => {
    seedUser(db, USER_A);
    seedUser(db, USER_B);
  });

  it('same-user same-id double POST → 200 + single row in DB', async () => {
    const fixedId = 'fixed-book-id-abc123';
    const body = { id: fixedId, title: 'Dune', author: 'Frank Herbert' };

    const first = await callApiAs(USER_A, postBookHandler, {
      method: 'POST',
      url: `${BASE}/api/books`,
      body,
    });
    expect(first.status).toBe(201);

    const second = await callApiAs(USER_A, postBookHandler, {
      method: 'POST',
      url: `${BASE}/api/books`,
      body,
    });
    expect(second.status).toBe(200);

    const firstId = (first.json as { book: { id: string } }).book.id;
    const secondId = (second.json as { book: { id: string } }).book.id;
    expect(firstId).toBe(fixedId);
    expect(secondId).toBe(fixedId);

    const { results } = await db.prepare('SELECT COUNT(*) as c FROM books WHERE id = ?').bind(fixedId).all();
    expect((results[0] as { c: number }).c).toBe(1);
  });

  it('id squatting: different user with same id → 201 with a fresh id, both rows exist', async () => {
    const fixedId = 'squatted-book-id-abc123';

    const first = await callApiAs(USER_A, postBookHandler, {
      method: 'POST',
      url: `${BASE}/api/books`,
      body: { id: fixedId, title: 'Book A', author: 'Author A' },
    });
    expect(first.status).toBe(201);

    const second = await callApiAs(USER_B, postBookHandler, {
      method: 'POST',
      url: `${BASE}/api/books`,
      body: { id: fixedId, title: 'Book B', author: 'Author B' },
    });
    expect(second.status).toBe(201);

    // User B gets a fresh id — the original is not leaked
    const bId = (second.json as { book: { id: string } }).book.id;
    expect(bId).not.toBe(fixedId);

    // Both rows exist
    const { results } = await db.prepare('SELECT COUNT(*) as c FROM books').bind().all();
    expect((results[0] as { c: number }).c).toBe(2);
  });
});

// ─── PATCH /api/books/:id ─────────────────────────────────────────────────────

describe('PATCH /api/books/:id', () => {
  beforeEach(() => {
    seedUser(db, USER_A);
    seedUser(db, USER_B);
  });

  it('user B cannot PATCH user A\'s book (returns 404)', async () => {
    // Create a book as user A
    const { json: created } = await callApiAs(USER_A, postBookHandler, {
      method: 'POST',
      url: `${BASE}/api/books`,
      body: { title: 'Private Book', author: 'A Author' },
    });
    const bookId = (created as { book: { id: string } }).book.id;

    // Try to PATCH as user B
    const { status } = await callApiAs(USER_B, patchBookHandler, {
      method: 'PATCH',
      url: `${BASE}/api/books/${bookId}`,
      body: { title: 'Hijacked' },
      params: { id: bookId },
    });

    expect(status).toBe(404);

    // Title in DB is unchanged
    const { results } = await db.prepare('SELECT title FROM books WHERE id = ?').bind(bookId).all();
    expect((results[0] as { title: string }).title).toBe('Private Book');
  });
});

// ─── DELETE /api/books/:id ────────────────────────────────────────────────────

describe('DELETE /api/books/:id', () => {
  beforeEach(() => {
    seedUser(db, USER_A);
    seedUser(db, USER_B);
  });

  it('user B cannot DELETE user A\'s book (returns 404)', async () => {
    const { json: created } = await callApiAs(USER_A, postBookHandler, {
      method: 'POST',
      url: `${BASE}/api/books`,
      body: { title: 'Precious Book', author: 'A Author' },
    });
    const bookId = (created as { book: { id: string } }).book.id;

    const { status } = await callApiAs(USER_B, deleteBookHandler, {
      method: 'DELETE',
      url: `${BASE}/api/books/${bookId}`,
      params: { id: bookId },
    });

    expect(status).toBe(404);

    // Book is still in the DB
    const { results } = await db.prepare('SELECT id FROM books WHERE id = ?').bind(bookId).all();
    expect(results).toHaveLength(1);
  });

  it('owner can DELETE their own book', async () => {
    const { json: created } = await callApiAs(USER_A, postBookHandler, {
      method: 'POST',
      url: `${BASE}/api/books`,
      body: { title: 'Delete Me', author: 'A Author' },
    });
    const bookId = (created as { book: { id: string } }).book.id;

    const { status } = await callApiAs(USER_A, deleteBookHandler, {
      method: 'DELETE',
      url: `${BASE}/api/books/${bookId}`,
      params: { id: bookId },
    });

    expect(status).toBe(200);

    const { results } = await db.prepare('SELECT id FROM books WHERE id = ?').bind(bookId).all();
    expect(results).toHaveLength(0);
  });
});

// ─── GET /api/books (public) ──────────────────────────────────────────────────

describe('GET /api/books (public)', () => {
  beforeEach(() => {
    seedUser(db, USER_A);
  });

  it('private book does not appear in the public listing', async () => {
    await callApiAs(USER_A, postBookHandler, {
      method: 'POST',
      url: `${BASE}/api/books`,
      body: { title: 'Secret Novel', author: 'A Author', visibility: 'private' },
    });

    const { status, json } = await callApi(getBooksHandler, {
      url: `${BASE}/api/books`,
    });

    expect(status).toBe(200);
    const books = (json as { books: { title: string }[] }).books;
    expect(books.some((b) => b.title === 'Secret Novel')).toBe(false);
  });

  it('visible book appears in the public listing', async () => {
    await callApiAs(USER_A, postBookHandler, {
      method: 'POST',
      url: `${BASE}/api/books`,
      body: { title: 'Public Novel', author: 'A Author', visibility: 'visible' },
    });

    const { json } = await callApi(getBooksHandler, {
      url: `${BASE}/api/books`,
    });

    const books = (json as { books: { title: string }[] }).books;
    expect(books.some((b) => b.title === 'Public Novel')).toBe(true);
  });
});

// ─── FK regression ────────────────────────────────────────────────────────────

describe('FK regression: brand-new user with no users row', () => {
  const NEW_USER = 'brand-new-user-no-profile';

  it(
    'POST /api/books without a prior GET /api/profile should return 201 (auto-create user row)',
    async () => {
      // No seedUser() call — simulates a user who has never hit GET /api/profile
      const { status } = await callApiAs(NEW_USER, postBookHandler, {
        method: 'POST',
        url: `${BASE}/api/books`,
        body: { title: 'First Book', author: 'New User' },
      });
      expect(status).toBe(201);
    },
  );

  it('GET /api/profile followed by POST /api/books succeeds (normal flow)', async () => {
    const NEW_USER_2 = 'new-user-profile-first';

    // GET /api/profile creates the users row via getOrCreateUser()
    await callApiAs(NEW_USER_2, getProfileHandler, {
      url: `${BASE}/api/profile`,
    });

    const { status } = await callApiAs(NEW_USER_2, postBookHandler, {
      method: 'POST',
      url: `${BASE}/api/books`,
      body: { title: 'My First Book', author: 'New User' },
    });

    expect(status).toBe(201);
  });
});
