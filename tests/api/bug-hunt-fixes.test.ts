/**
 * Integration tests for the API bug-hunt fixes (branch test-suite-and-bug-hunt).
 *
 * These call the real handlers against an in-memory SQLite DB via D1Shim
 * (same pattern as tests/integration/books-api.test.ts). Nothing is mocked
 * beyond the cloudflare:workers env shim in vitest.config.ts.
 *
 * Covered findings:
 *   #1  canEdit null===null          stores/[id].ts GET
 *   #3  Note idempotency             books/[id]/notes/index.ts POST
 *   #4  PATCH notes shape            books/[id].ts PATCH
 *   #5  Store book visibility filter stores/[id].ts GET
 *   #6/#7 Length caps                stores.ts POST, stores/[id].ts PATCH,
 *                                    notes POST+PATCH
 *   #9  addedVia coercion            books/index.ts POST
 *   #2  Intents shape pin            books/index.ts POST (current shape must
 *                                    not regress — existing consumer expects
 *                                    a JSON string in the DB row)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { GET as storeGetHandler, PATCH as storePatchHandler } from '../../src/pages/api/stores/[id]';
import { POST as storesPostHandler } from '../../src/pages/api/stores';
import { POST as postBookHandler, GET as getBooksHandler } from '../../src/pages/api/books/index';
import { PATCH as patchBookHandler } from '../../src/pages/api/books/[id]';
import { POST as postNoteHandler } from '../../src/pages/api/books/[id]/notes/index';
import { PATCH as patchNoteHandler } from '../../src/pages/api/books/[id]/notes/[noteId]';

import { createTestDb, seedUser } from '../helpers/test-db';
import { setTestDb, resetTestDb } from '../mocks/cloudflare-workers';
import { callApi, callApiAs } from '../helpers/api';
import type { D1Shim } from '../helpers/d1-shim';

const BASE = 'http://localhost';
const USER_A = 'bug-hunt-user-a';
const USER_B = 'bug-hunt-user-b';
const STORE_ID = 'bug-hunt-store-1';

let db: D1Shim;

beforeEach(() => {
  db = createTestDb();
  setTestDb(db);
});

afterEach(() => {
  resetTestDb();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function seedStore(db: D1Shim, id: string, addedBy: string | null = null): void {
  const now = Date.now();
  db.prepare(
    `INSERT INTO users (id, email, name, type, added_by, city, created_at, updated_at)
     VALUES (?, ?, ?, 'bookstore', ?, 'Montreal', ?, ?)`
  ).bind(id, `${id}@biblocal.local`, 'Test Store', addedBy, now, now).run();
}

function seedBookForStore(
  db: D1Shim,
  bookId: string,
  storeId: string,
  visibility: 'private' | 'visible' = 'visible'
): void {
  const now = Date.now();
  db.prepare(
    `INSERT INTO books (id, user_id, title, author, status, visibility, ownership, intents, added_via, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'visible', ?, 'have', '[]', 'manual', ?, ?)`
  ).bind(bookId, storeId, 'Store Book', 'Store Author', visibility, now, now).run();
}

// ─── Finding #1: canEdit null===null ─────────────────────────────────────────

describe('GET /api/stores/:id — canEdit null-safety (finding #1)', () => {
  it('unauthenticated visitor gets canEdit:false even when store.addedBy is NULL', async () => {
    seedStore(db, STORE_ID, null); // addedBy = NULL

    const { status, json } = await callApi(storeGetHandler, {
      url: `${BASE}/api/stores/${STORE_ID}`,
      params: { id: STORE_ID },
      locals: {}, // no auth — getUserId returns null
    });

    expect(status).toBe(200);
    expect((json as { canEdit: boolean }).canEdit).toBe(false);
  });

  it('owner still gets canEdit:true', async () => {
    seedUser(db, USER_A);
    seedStore(db, STORE_ID, USER_A); // addedBy = USER_A

    const { status, json } = await callApiAs(USER_A, storeGetHandler, {
      url: `${BASE}/api/stores/${STORE_ID}`,
      params: { id: STORE_ID },
    });

    expect(status).toBe(200);
    expect((json as { canEdit: boolean }).canEdit).toBe(true);
  });
});

// ─── Finding #5: Store book visibility filter ─────────────────────────────────

describe('GET /api/stores/:id — private books not exposed (finding #5)', () => {
  it('private store books are omitted from the response', async () => {
    seedStore(db, STORE_ID);
    seedBookForStore(db, 'public-book-1', STORE_ID, 'visible');
    seedBookForStore(db, 'private-book-1', STORE_ID, 'private');

    const { status, json } = await callApi(storeGetHandler, {
      url: `${BASE}/api/stores/${STORE_ID}`,
      params: { id: STORE_ID },
      locals: {},
    });

    expect(status).toBe(200);
    const books = (json as { books: { id: string }[] }).books;
    const ids = books.map((b) => b.id);
    expect(ids).toContain('public-book-1');
    expect(ids).not.toContain('private-book-1');
  });

  it('all visible store books are present', async () => {
    seedStore(db, STORE_ID);
    seedBookForStore(db, 'v1', STORE_ID, 'visible');
    seedBookForStore(db, 'v2', STORE_ID, 'visible');

    const { json } = await callApi(storeGetHandler, {
      url: `${BASE}/api/stores/${STORE_ID}`,
      params: { id: STORE_ID },
      locals: {},
    });

    const books = (json as { books: { id: string }[] }).books;
    expect(books.map((b) => b.id).sort()).toEqual(['v1', 'v2']);
  });
});

// ─── Finding #3: Note idempotency ─────────────────────────────────────────────

describe('POST /api/books/:id/notes — id idempotency (finding #3)', () => {
  const BOOK_ID = 'idem-book-1';
  const NOTE_ID = 'idempotent-note-uuid';

  beforeEach(() => {
    seedUser(db, USER_A);
    const now = Date.now();
    db.prepare(
      `INSERT INTO books (id, user_id, title, author, status, visibility, ownership, intents, added_via, created_at, updated_at)
       VALUES (?, ?, 'Idempotency Book', 'Author', 'visible', 'visible', 'have', '[]', 'manual', ?, ?)`
    ).bind(BOOK_ID, USER_A, now, now).run();
  });

  it('second POST with same id returns success (not a 500)', async () => {
    const body = { id: NOTE_ID, text: 'first note' };

    const first = await callApiAs(USER_A, postNoteHandler, {
      method: 'POST',
      url: `${BASE}/api/books/${BOOK_ID}/notes`,
      body,
      params: { id: BOOK_ID },
    });
    expect(first.status).toBe(201);

    const second = await callApiAs(USER_A, postNoteHandler, {
      method: 'POST',
      url: `${BASE}/api/books/${BOOK_ID}/notes`,
      body,
      params: { id: BOOK_ID },
    });
    // Idempotent: 200 with existing note, not 500
    expect(second.status).toBe(200);
    expect((second.json as { note: { id: string } }).note.id).toBe(NOTE_ID);
  });

  it('no duplicate row is created', async () => {
    const body = { id: NOTE_ID, text: 'no duplicates please' };

    await callApiAs(USER_A, postNoteHandler, {
      method: 'POST',
      url: `${BASE}/api/books/${BOOK_ID}/notes`,
      body,
      params: { id: BOOK_ID },
    });
    await callApiAs(USER_A, postNoteHandler, {
      method: 'POST',
      url: `${BASE}/api/books/${BOOK_ID}/notes`,
      body,
      params: { id: BOOK_ID },
    });

    const { results } = await db
      .prepare('SELECT id FROM book_notes WHERE id = ?')
      .bind(NOTE_ID)
      .all();
    expect(results).toHaveLength(1);
  });

  it('a different user with the same id gets a fresh UUID (no collision, no leak)', async () => {
    seedUser(db, USER_B);
    // USER_B owns a different book
    const now = Date.now();
    const BOOK_B = 'idem-book-b';
    db.prepare(
      `INSERT INTO books (id, user_id, title, author, status, visibility, ownership, intents, added_via, created_at, updated_at)
       VALUES (?, ?, 'B Book', 'Author', 'visible', 'visible', 'have', '[]', 'manual', ?, ?)`
    ).bind(BOOK_B, USER_B, now, now).run();

    // USER_A creates a note with NOTE_ID on their book
    await callApiAs(USER_A, postNoteHandler, {
      method: 'POST',
      url: `${BASE}/api/books/${BOOK_ID}/notes`,
      body: { id: NOTE_ID, text: 'original note' },
      params: { id: BOOK_ID },
    });

    // USER_B submits the same id on their own book
    const { status, json } = await callApiAs(USER_B, postNoteHandler, {
      method: 'POST',
      url: `${BASE}/api/books/${BOOK_B}/notes`,
      body: { id: NOTE_ID, text: 'b user note' },
      params: { id: BOOK_B },
    });

    expect(status).toBe(201);
    // B's note gets a fresh UUID, not NOTE_ID
    expect((json as { note: { id: string } }).note.id).not.toBe(NOTE_ID);
  });
});

// ─── Finding #4: PATCH book response includes notes array ─────────────────────

describe('PATCH /api/books/:id — response.book.notes is BookNote[] (finding #4)', () => {
  const BOOK_ID = 'patch-notes-book';

  beforeEach(() => {
    seedUser(db, USER_A);
    const now = Date.now();
    db.prepare(
      `INSERT INTO books (id, user_id, title, author, status, visibility, ownership, intents, added_via, created_at, updated_at)
       VALUES (?, ?, 'Patch Notes Book', 'Author', 'visible', 'visible', 'have', '[]', 'manual', ?, ?)`
    ).bind(BOOK_ID, USER_A, now, now).run();
  });

  it('PATCH with no existing notes returns notes as an empty array', async () => {
    const { status, json } = await callApiAs(USER_A, patchBookHandler, {
      method: 'PATCH',
      url: `${BASE}/api/books/${BOOK_ID}`,
      body: { title: 'Updated Title' },
      params: { id: BOOK_ID },
    });

    expect(status).toBe(200);
    const book = (json as { book: { notes: unknown } }).book;
    expect(Array.isArray(book.notes)).toBe(true);
    expect(book.notes).toEqual([]);
  });

  it('PATCH after adding a note returns notes as a populated array', async () => {
    // Add a note first
    const noteNow = Date.now();
    db.prepare(
      `INSERT INTO book_notes (id, book_id, user_id, text, visibility, created_at, updated_at)
       VALUES ('note-abc', ?, ?, 'test note', 'private', ?, ?)`
    ).bind(BOOK_ID, USER_A, noteNow, noteNow).run();

    const { status, json } = await callApiAs(USER_A, patchBookHandler, {
      method: 'PATCH',
      url: `${BASE}/api/books/${BOOK_ID}`,
      body: { title: 'Updated Again' },
      params: { id: BOOK_ID },
    });

    expect(status).toBe(200);
    const book = (json as { book: { notes: { id: string }[] } }).book;
    expect(Array.isArray(book.notes)).toBe(true);
    expect(book.notes.some((n) => n.id === 'note-abc')).toBe(true);
  });
});

// ─── POST /api/books 201 also returns notes array ────────────────────────────

describe('POST /api/books — 201 response includes notes:[] (finding #4 complement)', () => {
  beforeEach(() => {
    seedUser(db, USER_A);
  });

  it('newly created book has notes:[] in the 201 response', async () => {
    const { status, json } = await callApiAs(USER_A, postBookHandler, {
      method: 'POST',
      url: `${BASE}/api/books`,
      body: { title: 'New Book', author: 'Author' },
    });

    expect(status).toBe(201);
    const book = (json as { book: { notes: unknown } }).book;
    expect(Array.isArray(book.notes)).toBe(true);
    expect(book.notes).toEqual([]);
  });
});

// ─── Finding #9: addedVia coercion ────────────────────────────────────────────

describe('POST /api/books — invalid addedVia coerced to "manual" (finding #9)', () => {
  beforeEach(() => {
    seedUser(db, USER_A);
  });

  it('invalid addedVia is coerced to "manual"', async () => {
    const { status, json } = await callApiAs(USER_A, postBookHandler, {
      method: 'POST',
      url: `${BASE}/api/books`,
      body: { title: 'Coercion Test', author: 'Author', addedVia: 'hacked' },
    });

    expect(status).toBe(201);
    const book = (json as { book: { addedVia: string } }).book;
    expect(book.addedVia).toBe('manual');
  });

  it('valid addedVia values are preserved', async () => {
    for (const via of ['scan', 'goodreads'] as const) {
      const { status, json } = await callApiAs(USER_A, postBookHandler, {
        method: 'POST',
        url: `${BASE}/api/books`,
        body: { title: `Book via ${via}`, author: 'Author', addedVia: via },
      });
      expect(status).toBe(201);
      expect((json as { book: { addedVia: string } }).book.addedVia).toBe(via);
    }
  });

  it('omitted addedVia defaults to "manual"', async () => {
    const { status, json } = await callApiAs(USER_A, postBookHandler, {
      method: 'POST',
      url: `${BASE}/api/books`,
      body: { title: 'No Via Book', author: 'Author' },
    });
    expect(status).toBe(201);
    expect((json as { book: { addedVia: string } }).book.addedVia).toBe('manual');
  });
});

// ─── Finding #2: intents shape pin (must not regress) ─────────────────────────

describe('POST /api/books — intents stored as JSON string (finding #2 shape pin)', () => {
  // The existing integration test (tests/integration/books-api.test.ts:165)
  // does JSON.parse(book.intents) — so the handler must continue returning
  // intents as a JSON string in the DB row.
  // Mobile (../biblocal-mobile) handles BOTH string and array via safeJsonArray(),
  // but the web integration test would break if we returned a parsed array.
  // This test pins the current shape so a future change doesn't silently
  // regress the web consumer.
  beforeEach(() => {
    seedUser(db, USER_A);
  });

  it('intents in the DB row is a JSON string (not a parsed array)', async () => {
    const { status, json } = await callApiAs(USER_A, postBookHandler, {
      method: 'POST',
      url: `${BASE}/api/books`,
      body: { title: 'Intents Pin', author: 'Author', intents: ['borrowable'] },
    });

    expect(status).toBe(201);
    const book = (json as { book: { intents: unknown } }).book;
    // The raw DB column is a JSON string; the handler returns it as-is.
    expect(typeof book.intents).toBe('string');
    expect(JSON.parse(book.intents as string)).toEqual(['borrowable']);
  });
});

// ─── Finding #6/#7: Store field length caps ───────────────────────────────────

describe('POST /api/stores — field length caps (finding #6)', () => {
  beforeEach(() => {
    seedUser(db, USER_A);
  });

  it('rejects name longer than 120 characters', async () => {
    const { status, json } = await callApiAs(USER_A, storesPostHandler, {
      method: 'POST',
      url: `${BASE}/api/stores`,
      body: { name: 'A'.repeat(121), neighborhood: 'Mile End', address: '1 Test St' },
    });
    expect(status).toBe(400);
    expect((json as { error: string }).error).toMatch(/120/);
  });

  it('rejects neighborhood longer than 120 characters', async () => {
    const { status } = await callApiAs(USER_A, storesPostHandler, {
      method: 'POST',
      url: `${BASE}/api/stores`,
      body: { name: 'Good Store', neighborhood: 'N'.repeat(121), address: '1 Test St' },
    });
    expect(status).toBe(400);
  });

  it('rejects address longer than 200 characters', async () => {
    const { status } = await callApiAs(USER_A, storesPostHandler, {
      method: 'POST',
      url: `${BASE}/api/stores`,
      body: { name: 'Good Store', neighborhood: 'Mile End', address: 'A'.repeat(201) },
    });
    expect(status).toBe(400);
  });

  it('accepts values at the boundary', async () => {
    const { status } = await callApiAs(USER_A, storesPostHandler, {
      method: 'POST',
      url: `${BASE}/api/stores`,
      body: { name: 'A'.repeat(120), neighborhood: 'Mile End', address: '1 Test St' },
    });
    expect(status).toBe(201);
  });
});

describe('PATCH /api/stores/:id — field length caps (finding #6)', () => {
  beforeEach(() => {
    seedUser(db, USER_A);
    seedStore(db, STORE_ID, USER_A);
  });

  it('rejects name longer than 120 characters', async () => {
    const { status } = await callApiAs(USER_A, storePatchHandler, {
      method: 'PATCH',
      url: `${BASE}/api/stores/${STORE_ID}`,
      body: { name: 'A'.repeat(121) },
      params: { id: STORE_ID },
    });
    expect(status).toBe(400);
  });

  it('accepts name at the boundary', async () => {
    const { status } = await callApiAs(USER_A, storePatchHandler, {
      method: 'PATCH',
      url: `${BASE}/api/stores/${STORE_ID}`,
      body: { name: 'A'.repeat(120) },
      params: { id: STORE_ID },
    });
    expect(status).toBe(200);
  });
});

describe('POST /api/books/:id/notes — text length cap (finding #7)', () => {
  const BOOK_ID = 'cap-note-book';

  beforeEach(() => {
    seedUser(db, USER_A);
    const now = Date.now();
    db.prepare(
      `INSERT INTO books (id, user_id, title, author, status, visibility, ownership, intents, added_via, created_at, updated_at)
       VALUES (?, ?, 'Cap Book', 'Author', 'visible', 'visible', 'have', '[]', 'manual', ?, ?)`
    ).bind(BOOK_ID, USER_A, now, now).run();
  });

  it('rejects note text longer than 5000 characters with 400', async () => {
    const { status, json } = await callApiAs(USER_A, postNoteHandler, {
      method: 'POST',
      url: `${BASE}/api/books/${BOOK_ID}/notes`,
      body: { text: 'X'.repeat(5001) },
      params: { id: BOOK_ID },
    });
    expect(status).toBe(400);
    expect((json as { error: string }).error).toMatch(/5000/);
  });

  it('accepts note text exactly at 5000 characters', async () => {
    const { status } = await callApiAs(USER_A, postNoteHandler, {
      method: 'POST',
      url: `${BASE}/api/books/${BOOK_ID}/notes`,
      body: { text: 'X'.repeat(5000) },
      params: { id: BOOK_ID },
    });
    expect(status).toBe(201);
  });
});

describe('PATCH /api/books/:id/notes/:noteId — text length cap (finding #7)', () => {
  const BOOK_ID = 'cap-patch-note-book';
  const NOTE_ID = 'cap-patch-note-id';

  beforeEach(() => {
    seedUser(db, USER_A);
    const now = Date.now();
    db.prepare(
      `INSERT INTO books (id, user_id, title, author, status, visibility, ownership, intents, added_via, created_at, updated_at)
       VALUES (?, ?, 'Cap Patch Book', 'Author', 'visible', 'visible', 'have', '[]', 'manual', ?, ?)`
    ).bind(BOOK_ID, USER_A, now, now).run();
    db.prepare(
      `INSERT INTO book_notes (id, book_id, user_id, text, visibility, created_at, updated_at)
       VALUES (?, ?, ?, 'original text', 'private', ?, ?)`
    ).bind(NOTE_ID, BOOK_ID, USER_A, now, now).run();
  });

  it('rejects note text update longer than 5000 characters with 400', async () => {
    const { status, json } = await callApiAs(USER_A, patchNoteHandler, {
      method: 'PATCH',
      url: `${BASE}/api/books/${BOOK_ID}/notes/${NOTE_ID}`,
      body: { text: 'Y'.repeat(5001) },
      params: { id: BOOK_ID, noteId: NOTE_ID },
    });
    expect(status).toBe(400);
    expect((json as { error: string }).error).toMatch(/5000/);
  });

  it('accepts note text update exactly at 5000 characters', async () => {
    const { status } = await callApiAs(USER_A, patchNoteHandler, {
      method: 'PATCH',
      url: `${BASE}/api/books/${BOOK_ID}/notes/${NOTE_ID}`,
      body: { text: 'Y'.repeat(5000) },
      params: { id: BOOK_ID, noteId: NOTE_ID },
    });
    expect(status).toBe(200);
  });
});
