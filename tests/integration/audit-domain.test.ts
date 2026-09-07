/**
 * Focused real-handler audit coverage for book and note domain boundaries.
 * Each case runs against migrated in-memory SQLite through the D1 shim.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GET as getBooksHandler, POST as postBookHandler } from '../../src/pages/api/books/index';
import { DELETE as deleteBookHandler } from '../../src/pages/api/books/[id]';
import { POST as postNoteHandler } from '../../src/pages/api/books/[id]/notes/index';
import { PATCH as patchNoteHandler } from '../../src/pages/api/books/[id]/notes/[noteId]';
import { POST as postConnectionHandler } from '../../src/pages/api/connections';
import { callApi, callApiAs } from '../helpers/api';
import { createTestDb, seedUser } from '../helpers/test-db';
import type { D1Shim } from '../helpers/d1-shim';
import { resetTestDb, setTestDb } from '../mocks/cloudflare-workers';

const BASE = 'http://localhost';
const OWNER = 'audit-owner';
const OTHER_USER = 'audit-other-user';
const BOOK_ID = 'audit-book';

let db: D1Shim;

function insertBook(id = BOOK_ID, userId = OWNER): void {
  const now = Date.now();
  db.prepare(
    `INSERT INTO books (id, user_id, title, author, status, visibility, ownership, intents, created_at, updated_at)
     VALUES (?, ?, 'Audit Book', 'Audit Author', 'visible', 'visible', 'have', '[]', ?, ?)`
  ).bind(id, userId, now, now).run();
}

function insertNote(
  id: string,
  bookId = BOOK_ID,
  userId = OWNER,
  text = 'note',
  visibility: 'private' | 'visible' = 'private',
): void {
  const now = Date.now();
  db.prepare(
    `INSERT INTO book_notes (id, book_id, user_id, text, visibility, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, bookId, userId, text, visibility, now, now).run();
}

function setContact(userId: string, visibility: 'hidden' | 'on-request' | 'public' = 'on-request'): void {
  db.prepare(
    'UPDATE users SET contact_method = ?, contact_value = ?, contact_visibility = ? WHERE id = ?'
  ).bind('email', `${userId}@example.test`, visibility, userId).run();
}

async function noteText(id: string): Promise<string | undefined> {
  const { results } = await db.prepare('SELECT text FROM book_notes WHERE id = ?').bind(id).all();
  return (results[0] as { text?: string } | undefined)?.text;
}

async function rowCount(table: 'books' | 'book_notes', id: string): Promise<number> {
  const { results } = await db.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE id = ?`).bind(id).all();
  return (results[0] as { count: number }).count;
}

beforeEach(() => {
  db = createTestDb();
  setTestDb(db);
  seedUser(db, OWNER);
  seedUser(db, OTHER_USER);
});

afterEach(() => {
  resetTestDb();
});

describe('book and note domain audit', () => {
  it('public book reads expose visible notes but never private notes', async () => {
    insertBook();
    insertNote('public-note', BOOK_ID, OWNER, 'share this', 'visible');
    insertNote('private-note', BOOK_ID, OWNER, 'do not share', 'private');

    const { status, json } = await callApi(getBooksHandler, {
      url: `${BASE}/api/books`,
    });

    expect(status).toBe(200);
    const notes = (json as { books: Array<{ id: string; notes: Array<{ id: string; text: string }> }> })
      .books.find((book) => book.id === BOOK_ID)?.notes;
    expect(notes).toEqual([{ id: 'public-note', text: 'share this', visibility: 'visible', createdAt: expect.any(String) }]);
  });

  it('rejects an invalid note visibility without changing the note', async () => {
    insertBook();
    insertNote('stable-note', BOOK_ID, OWNER, 'keep this', 'private');

    const { status } = await callApiAs(OWNER, patchNoteHandler, {
      method: 'PATCH',
      url: `${BASE}/api/books/${BOOK_ID}/notes/stable-note`,
      params: { id: BOOK_ID, noteId: 'stable-note' },
      body: { text: 'attempted change', visibility: 'published' },
    });

    expect(status).toBe(400);
    expect(await noteText('stable-note')).toBe('keep this');
  });

  it('returns the original book on ISBN retry without applying changed fields', async () => {
    const first = await callApiAs(OWNER, postBookHandler, {
      method: 'POST',
      url: `${BASE}/api/books`,
      body: { title: 'Original title', author: 'Original author', isbn: '9780000000001' },
    });
    expect(first.status).toBe(201);

    const retry = await callApiAs(OWNER, postBookHandler, {
      method: 'POST',
      url: `${BASE}/api/books`,
      body: { title: 'Changed title', author: 'Changed author', isbn: '9780000000001' },
    });

    expect(retry.status).toBe(200);
    expect((retry.json as { book: { title: string; author: string } }).book).toMatchObject({
      title: 'Original title',
      author: 'Original author',
    });
    const { results } = await db.prepare('SELECT title, author FROM books WHERE isbn = ?').bind('9780000000001').all();
    expect(results).toEqual([{ title: 'Original title', author: 'Original author' }]);
  });

  it('rolls back a book deletion when an inconsistent foreign-owned dependent note rejects it', async () => {
    insertBook();
    insertNote('owner-note');
    // This cannot be made by the API, but models a legacy/corrupt dependent row.
    // The transaction must not leave the owner note deleted when the book delete is rejected.
    insertNote('foreign-note', BOOK_ID, OTHER_USER, 'foreign dependency');

    const { status } = await callApiAs(OWNER, deleteBookHandler, {
      method: 'DELETE',
      url: `${BASE}/api/books/${BOOK_ID}`,
      params: { id: BOOK_ID },
    });

    expect(status).toBe(500);
    expect(await rowCount('books', BOOK_ID)).toBe(1);
    expect(await rowCount('book_notes', 'owner-note')).toBe(1);
    expect(await rowCount('book_notes', 'foreign-note')).toBe(1);
  });

  it('does not let a direct API caller bypass a hidden recipient\'s no-contact setting', async () => {
    // Product copy calls hidden "no contact" and MatchCardIsland omits the
    // connection action for hidden profiles; the API must apply that boundary too.
    setContact(OWNER);
    setContact(OTHER_USER, 'hidden');

    const { status } = await callApiAs(OWNER, postConnectionHandler, {
      method: 'POST',
      url: `${BASE}/api/connections`,
      body: { toUserId: OTHER_USER },
    });

    expect(status).toBe(403);
    const { results } = await db
      .prepare('SELECT id FROM connection_requests WHERE from_user_id = ? AND to_user_id = ?')
      .bind(OWNER, OTHER_USER)
      .all();
    expect(results).toEqual([]);
  });

  it('allows at most one pending relationship when users request each other concurrently', async () => {
    setContact(OWNER);
    setContact(OTHER_USER);

    const responses = await Promise.all([
      callApiAs(OWNER, postConnectionHandler, {
        method: 'POST',
        url: `${BASE}/api/connections`,
        body: { toUserId: OTHER_USER },
      }),
      callApiAs(OTHER_USER, postConnectionHandler, {
        method: 'POST',
        url: `${BASE}/api/connections`,
        body: { toUserId: OWNER },
      }),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([201, 400]);
    const { results } = await db
      .prepare(
        `SELECT id FROM connection_requests
         WHERE (from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?)`
      )
      .bind(OWNER, OTHER_USER, OTHER_USER, OWNER)
      .all();
    expect(results).toHaveLength(1);
  });

  it('enforces the five-per-day cap when six distinct requests start concurrently', async () => {
    setContact(OWNER);
    const recipients = Array.from({ length: 6 }, (_, index) => `audit-recipient-${index}`);
    for (const recipient of recipients) {
      seedUser(db, recipient);
      setContact(recipient);
    }

    const responses = await Promise.all(
      recipients.map((toUserId) =>
        callApiAs(OWNER, postConnectionHandler, {
          method: 'POST',
          url: `${BASE}/api/connections`,
          body: { toUserId },
        })
      )
    );

    expect(responses.filter((response) => response.status === 201)).toHaveLength(5);
    expect(responses.filter((response) => response.status === 429)).toHaveLength(1);
    const { results } = await db
      .prepare('SELECT id FROM connection_requests WHERE from_user_id = ?')
      .bind(OWNER)
      .all();
    expect(results).toHaveLength(5);
  });

  it('rejects malformed note-create JSON as a client error without creating a note', async () => {
    insertBook();

    const { status } = await callApiAs(OWNER, postNoteHandler, {
      method: 'POST',
      url: `${BASE}/api/books/${BOOK_ID}/notes`,
      params: { id: BOOK_ID },
      rawBody: '{not json',
      headers: { 'Content-Type': 'application/json' },
    });

    expect(status).toBe(400);
    const { results } = await db.prepare('SELECT id FROM book_notes WHERE book_id = ?').bind(BOOK_ID).all();
    expect(results).toEqual([]);
  });
});
