/**
 * Integration tests for POST /api/books/import.
 *
 * Uses the real handler against an in-memory SQLite DB via D1Shim.
 * Covers BUG 3: imported Goodreads notes must land in bookNotes table,
 * not the legacy books.notes column (which the read path never returns).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { POST as importHandler } from '../../src/pages/api/books/import';
import { GET as getBooksHandler } from '../../src/pages/api/books/index';
import { createTestDb, seedUser } from '../helpers/test-db';
import { setTestDb, resetTestDb } from '../mocks/cloudflare-workers';
import { callApiAs } from '../helpers/api';
import type { D1Shim } from '../helpers/d1-shim';

const USER_A = 'import-user-a';
const BASE = 'http://localhost';

let db: D1Shim;

beforeEach(() => {
  db = createTestDb();
  setTestDb(db);
});

afterEach(() => {
  resetTestDb();
});

// ─── BUG 3: Imported notes must go to bookNotes table ────────────────────────

describe('POST /api/books/import — notes saved to bookNotes table', () => {
  beforeEach(() => {
    seedUser(db, USER_A);
  });

  it('imported note appears in GET /api/books?mine=true notes array, marked private', async () => {
    const { status: importStatus } = await callApiAs(USER_A, importHandler, {
      method: 'POST',
      url: `${BASE}/api/books/import`,
      body: {
        books: [
          {
            title: 'Crime and Punishment',
            author: 'Dostoevsky',
            visibility: 'visible',
            ownership: 'have',
            intents: [],
            notes: 'Goodreads rating: 5/5\nReview: A masterpiece',
          },
        ],
      },
    });
    expect(importStatus).toBe(200);

    const { status, json } = await callApiAs(USER_A, getBooksHandler, {
      url: `${BASE}/api/books?mine=true`,
    });

    expect(status).toBe(200);
    type BookWithNotes = { title: string; notes: Array<{ text: string; visibility: string }> };
    const books = (json as { books: BookWithNotes[] }).books;
    const book = books.find((b) => b.title === 'Crime and Punishment');
    expect(book).toBeDefined();
    expect(book!.notes).toHaveLength(1);
    expect(book!.notes[0].text).toContain('Goodreads rating: 5/5');
    expect(book!.notes[0].visibility).toBe('private');
  });

  it('book imported without notes has an empty notes array', async () => {
    await callApiAs(USER_A, importHandler, {
      method: 'POST',
      url: `${BASE}/api/books/import`,
      body: {
        books: [
          {
            title: 'Dune',
            author: 'Frank Herbert',
            visibility: 'visible',
            ownership: 'have',
            intents: [],
          },
        ],
      },
    });

    const { json } = await callApiAs(USER_A, getBooksHandler, {
      url: `${BASE}/api/books?mine=true`,
    });

    type BookWithNotes = { title: string; notes: unknown[] };
    const dune = (json as { books: BookWithNotes[] }).books.find((b) => b.title === 'Dune');
    expect(dune).toBeDefined();
    expect(dune!.notes).toHaveLength(0);
  });

  it('multiple books in one import: only books with notes get a bookNotes row', async () => {
    await callApiAs(USER_A, importHandler, {
      method: 'POST',
      url: `${BASE}/api/books/import`,
      body: {
        books: [
          {
            title: 'Book With Notes',
            author: 'Author A',
            visibility: 'visible',
            ownership: 'have',
            intents: [],
            notes: 'Great read',
          },
          {
            title: 'Book Without Notes',
            author: 'Author B',
            visibility: 'visible',
            ownership: 'have',
            intents: [],
          },
        ],
      },
    });

    const { results } = await db.prepare('SELECT COUNT(*) as c FROM book_notes').bind().all();
    expect((results[0] as { c: number }).c).toBe(1);
  });
});
