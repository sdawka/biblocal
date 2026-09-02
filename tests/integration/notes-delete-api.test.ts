/**
 * Integration tests for DELETE /api/books/[id]/notes/[noteId].
 *
 * These invoke the REAL handler from src/pages/api/books/[id]/notes/[noteId].ts
 * against a REAL in-memory SQLite database (via D1Shim), covering auth,
 * ownership, and the book/note URL binding.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DELETE as deleteNoteHandler } from '../../src/pages/api/books/[id]/notes/[noteId]';
import { createTestDb, seedUser } from '../helpers/test-db';
import { setTestDb, resetTestDb } from '../mocks/cloudflare-workers';
import { callApi, callApiAs } from '../helpers/api';
import type { D1Shim } from '../helpers/d1-shim';

const BASE = 'http://localhost';
const USER_A = 'note-user-a';
const USER_B = 'note-user-b';
const BOOK_A = 'book-a';
const BOOK_A2 = 'book-a2';
const NOTE_A = 'note-a';

let db: D1Shim;

function insertBook(id: string, userId: string): void {
  const now = Date.now();
  db.prepare(
    `INSERT INTO books (id, user_id, title, author, status, visibility, ownership, intents, created_at, updated_at)
     VALUES (?, ?, 'Title', 'Author', 'visible', 'visible', 'have', '[]', ?, ?)`
  )
    .bind(id, userId, now, now)
    .run();
}

function insertNote(id: string, bookId: string, userId: string, text = 'A note'): void {
  const now = Date.now();
  db.prepare(
    `INSERT INTO book_notes (id, book_id, user_id, text, visibility, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'private', ?, ?)`
  )
    .bind(id, bookId, userId, text, now, now)
    .run();
}

async function noteExists(id: string): Promise<boolean> {
  const { results } = await db
    .prepare('SELECT id FROM book_notes WHERE id = ?')
    .bind(id)
    .all();
  return results.length > 0;
}

beforeEach(() => {
  db = createTestDb();
  setTestDb(db);
  seedUser(db, USER_A);
  seedUser(db, USER_B);
  insertBook(BOOK_A, USER_A);
  insertBook(BOOK_A2, USER_A);
  insertNote(NOTE_A, BOOK_A, USER_A);
});

afterEach(() => {
  resetTestDb();
});

describe('DELETE /api/books/:id/notes/:noteId', () => {
  it('returns 401 when unauthenticated and leaves the note intact', async () => {
    const { status, json } = await callApi(deleteNoteHandler, {
      method: 'DELETE',
      url: `${BASE}/api/books/${BOOK_A}/notes/${NOTE_A}`,
      params: { id: BOOK_A, noteId: NOTE_A },
    });
    expect(status).toBe(401);
    expect((json as { error: string }).error).toBe('Not authenticated');
    expect(await noteExists(NOTE_A)).toBe(true);
  });

  it('returns 400 when the book id param is missing', async () => {
    const { status, json } = await callApiAs(USER_A, deleteNoteHandler, {
      method: 'DELETE',
      url: `${BASE}/api/books//notes/${NOTE_A}`,
      params: { noteId: NOTE_A },
    });
    expect(status).toBe(400);
    expect((json as { error: string }).error).toBe('Book ID required');
  });

  it('returns 400 when the note id param is missing', async () => {
    const { status, json } = await callApiAs(USER_A, deleteNoteHandler, {
      method: 'DELETE',
      url: `${BASE}/api/books/${BOOK_A}/notes/`,
      params: { id: BOOK_A },
    });
    expect(status).toBe(400);
    expect((json as { error: string }).error).toBe('Note ID required');
  });

  it('returns 404 for a nonexistent note', async () => {
    const { status, json } = await callApiAs(USER_A, deleteNoteHandler, {
      method: 'DELETE',
      url: `${BASE}/api/books/${BOOK_A}/notes/no-such-note`,
      params: { id: BOOK_A, noteId: 'no-such-note' },
    });
    expect(status).toBe(404);
    expect((json as { error: string }).error).toBe('Note not found');
  });

  it("returns 404 when another user tries to delete someone else's note", async () => {
    const { status, json } = await callApiAs(USER_B, deleteNoteHandler, {
      method: 'DELETE',
      url: `${BASE}/api/books/${BOOK_A}/notes/${NOTE_A}`,
      params: { id: BOOK_A, noteId: NOTE_A },
    });
    expect(status).toBe(404);
    expect((json as { error: string }).error).toBe('Note not found');
    // The note must survive the attempt.
    expect(await noteExists(NOTE_A)).toBe(true);
  });

  it('returns 404 when the note exists but belongs to a different book', async () => {
    const { status } = await callApiAs(USER_A, deleteNoteHandler, {
      method: 'DELETE',
      url: `${BASE}/api/books/${BOOK_A2}/notes/${NOTE_A}`,
      params: { id: BOOK_A2, noteId: NOTE_A },
    });
    expect(status).toBe(404);
    expect(await noteExists(NOTE_A)).toBe(true);
  });

  it('deletes the owner note and returns success', async () => {
    const { status, json } = await callApiAs(USER_A, deleteNoteHandler, {
      method: 'DELETE',
      url: `${BASE}/api/books/${BOOK_A}/notes/${NOTE_A}`,
      params: { id: BOOK_A, noteId: NOTE_A },
    });
    expect(status).toBe(200);
    expect(json).toEqual({ success: true });
    expect(await noteExists(NOTE_A)).toBe(false);
  });

  it('deletes only the targeted note', async () => {
    insertNote('note-a2', BOOK_A, USER_A, 'Second note');

    await callApiAs(USER_A, deleteNoteHandler, {
      method: 'DELETE',
      url: `${BASE}/api/books/${BOOK_A}/notes/${NOTE_A}`,
      params: { id: BOOK_A, noteId: NOTE_A },
    });

    expect(await noteExists(NOTE_A)).toBe(false);
    expect(await noteExists('note-a2')).toBe(true);
  });
});
