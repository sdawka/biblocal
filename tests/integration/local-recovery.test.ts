/**
 * Local-only book recovery: after the server sync bug was fixed, books that
 * existed only in localStorage must survive the first loadBooksFromServer() call
 * by being merged into shelf state and uploaded to the server.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Must mock auth before importing shelf (same pattern as other integration tests)
vi.mock('../../src/stores/auth', () => ({
  currentUserId: {
    get: vi.fn(() => 'recovery-user-1'),
    set: vi.fn(),
    subscribe: vi.fn(),
  },
}));

vi.mock('../../src/stores/topics', () => ({
  inferTopicsFromSubjects: (subjects: string[]) => subjects.slice(0, 3),
}));

import { shelf, loadBooksFromServer } from '../../src/stores/shelf';
import { POST as postBookHandler, GET as getBookHandler } from '../../src/pages/api/books/index';
import { createTestDb, seedUser } from '../helpers/test-db';
import { setTestDb, resetTestDb } from '../mocks/cloudflare-workers';
import type { D1Shim } from '../helpers/d1-shim';
import type { Book } from '../../src/lib/types';

const RECOVERY_USER = 'recovery-user-1';
const BASE = 'http://localhost';

function makeResponse(status: number, json: unknown): Response {
  return new Response(JSON.stringify(json), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Build a minimal APIRoute context for the books handlers (GET or POST). */
function makeHandlerContext(method: string, routeUrl: string, body?: unknown): Parameters<typeof postBookHandler>[0] {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }
  const fullUrl = `${BASE}${routeUrl}`;
  return {
    request: new Request(fullUrl, init),
    locals: { qaUserId: RECOVERY_USER } as Parameters<typeof postBookHandler>[0]['locals'],
    params: {},
    redirect: (u: string) => Response.redirect(u),
    rewrite: async () => new Response(),
    cookies: {} as Parameters<typeof postBookHandler>[0]['cookies'],
    site: undefined,
    generator: 'astro',
    url: new URL(fullUrl),
    clientAddress: '127.0.0.1',
    props: {},
    currentLocale: undefined,
    preferredLocale: undefined,
    preferredLocaleList: undefined,
    routePattern: '',
    isPrerendered: false,
    slots: { has: () => false, render: async () => '' },
  } as unknown as Parameters<typeof postBookHandler>[0];
}

/**
 * Seed a book directly into the DB (bypassing the local store) by calling the
 * real POST handler. Simulates a book that exists on the server but not locally.
 */
async function seedServerBook(book: {
  id: string; title: string; author: string; isbn?: string;
}): Promise<void> {
  await postBookHandler(makeHandlerContext('POST', '/api/books', {
    id: book.id,
    title: book.title,
    author: book.author,
    isbn: book.isbn,
    visibility: 'visible',
    ownership: 'have',
    intents: [],
    addedVia: 'manual',
  }));
}

/** Wire global fetch so GET and POST /api/books route to the real handlers. */
function wireHandlers(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = (init?.method ?? 'GET').toUpperCase();

      if (url === '/api/books' && method === 'POST') {
        const body = init?.body ? JSON.parse(init.body as string) : {};
        return postBookHandler(makeHandlerContext('POST', '/api/books', body));
      }

      if (url.startsWith('/api/books') && method === 'GET') {
        return getBookHandler(makeHandlerContext('GET', url));
      }

      return makeResponse(200, {});
    }),
  );
}

describe('local-recovery: loadBooksFromServer() reconciles unsynced local books', () => {
  let db: D1Shim;

  beforeEach(async () => {
    db = createTestDb();
    seedUser(db, RECOVERY_USER);
    setTestDb(db);
    shelf.set({});
  });

  afterEach(() => {
    shelf.set({});
    resetTestDb();
    vi.unstubAllGlobals();
  });

  it('local-only books (one with ISBN, one without) are kept in shelf and uploaded to server', async () => {
    // Seed 1 server book directly into the DB (server has it, local shelf does not)
    await seedServerBook({ id: 'server-1', title: 'Server Book', author: 'Server Author' });

    // Two local-only books that predate the sync fix (not on server)
    const localWithIsbn: Book = {
      id: 'local-isbn-1',
      title: 'Local ISBN Book',
      author: 'Local Author',
      isbn: '978-0-06-112008-4',
      visibility: 'visible',
      ownership: 'have',
      intents: [],
      addedVia: 'manual',
      addedAt: Date.now(),
    };
    const localNoIsbn: Book = {
      id: 'local-noisbn-1',
      title: 'Local NoISBN Book',
      author: 'Local NoISBN Author',
      visibility: 'visible',
      ownership: 'have',
      intents: [],
      addedVia: 'manual',
      addedAt: Date.now(),
    };
    shelf.set({ [localWithIsbn.id]: localWithIsbn, [localNoIsbn.id]: localNoIsbn });

    wireHandlers();
    await loadBooksFromServer();

    // Wait for background uploads of the 2 local-only books to land in the DB
    await vi.waitFor(async () => {
      const { results } = await db.prepare('SELECT id FROM books WHERE user_id = ?').bind(RECOVERY_USER).all();
      expect(results).toHaveLength(3);
    }, { timeout: 3000 });

    // All 3 books must be in shelf
    const shelfState = shelf.get();
    expect(Object.keys(shelfState)).toHaveLength(3);
    expect(shelfState['server-1']).toBeDefined();
    expect(shelfState['local-isbn-1']).toBeDefined();
    expect(shelfState['local-noisbn-1']).toBeDefined();

    // Both local books must now exist as DB rows
    const { results: isbnRow } = await db.prepare('SELECT id FROM books WHERE id = ?').bind('local-isbn-1').all();
    expect(isbnRow).toHaveLength(1);
    const { results: noIsbnRow } = await db.prepare('SELECT id FROM books WHERE id = ?').bind('local-noisbn-1').all();
    expect(noIsbnRow).toHaveLength(1);
  });

  it('local-only book survives in shelf when the recovery upload fails', async () => {
    await seedServerBook({ id: 'server-1', title: 'Server Book', author: 'Server Author' });

    // A legacy book that exists only locally; its upload will fail
    const legacy: Book = {
      id: 'legacy-1',
      title: 'Legacy Book',
      author: 'Legacy Author',
      visibility: 'visible',
      ownership: 'have',
      intents: [],
      addedVia: 'manual',
      addedAt: Date.now(),
    };
    shelf.set({ [legacy.id]: legacy });

    // GET routes to the real handler; POST (the recovery upload) always fails
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        const method = (init?.method ?? 'GET').toUpperCase();
        if (url === '/api/books' && method === 'POST') {
          return makeResponse(500, { error: 'Server error' });
        }
        if (url.startsWith('/api/books') && method === 'GET') {
          return getBookHandler(makeHandlerContext('GET', url));
        }
        return makeResponse(200, {});
      }),
    );

    await loadBooksFromServer();
    await new Promise(r => setTimeout(r, 300));

    // The failed upload must NOT delete the legacy book from the shelf —
    // it has to survive (in localStorage) so the next load can retry.
    const shelfState = shelf.get();
    expect(shelfState['legacy-1']).toBeDefined();
    expect(shelfState['server-1']).toBeDefined();
  });

  it('local book matching server book by ISBN (different id) → server copy wins, no new DB row', async () => {
    const SHARED_ISBN = '978-0-7432-7356-5';

    // Server has the canonical copy of Dune
    await seedServerBook({
      id: 'server-isbn-canonical',
      title: 'Dune',
      author: 'Frank Herbert',
      isbn: SHARED_ISBN,
    });

    // Local has a stale copy of the same book (same ISBN, different id — a legacy duplicate)
    const localDupe: Book = {
      id: 'local-isbn-dupe',
      title: 'Dune',
      author: 'Frank Herbert',
      isbn: SHARED_ISBN,
      visibility: 'visible',
      ownership: 'have',
      intents: [],
      addedVia: 'manual',
      addedAt: Date.now(),
    };
    shelf.set({ [localDupe.id]: localDupe });

    wireHandlers();
    await loadBooksFromServer();
    // Let any (incorrect) upload settle
    await new Promise(r => setTimeout(r, 300));

    // Only the server copy must remain in shelf
    const shelfState = shelf.get();
    expect(Object.keys(shelfState)).toHaveLength(1);
    expect(shelfState['server-isbn-canonical']).toBeDefined();
    expect(shelfState['local-isbn-dupe']).toBeUndefined();

    // No new DB row for the dropped local duplicate
    const { results: dupeRow } = await db.prepare('SELECT id FROM books WHERE id = ?').bind('local-isbn-dupe').all();
    expect(dupeRow).toHaveLength(0);
    const { results: allBooks } = await db.prepare('SELECT id FROM books WHERE user_id = ?').bind(RECOVERY_USER).all();
    expect(allBooks).toHaveLength(1);
  });

  it('local book matching server book by title+author (no ISBNs, different id) → server copy wins, no upload', async () => {
    // Server has the canonical copy (no ISBN)
    await seedServerBook({
      id: 'server-titleauthor-canonical',
      title: 'The Master and Margarita',
      author: 'Mikhail Bulgakov',
    });

    // Local has a stale copy with same title+author in different casing (legacy duplicate)
    const localDupe: Book = {
      id: 'local-titleauthor-dupe',
      title: 'THE MASTER AND MARGARITA',
      author: 'mikhail bulgakov',
      visibility: 'visible',
      ownership: 'have',
      intents: [],
      addedVia: 'manual',
      addedAt: Date.now(),
    };
    shelf.set({ [localDupe.id]: localDupe });

    wireHandlers();
    await loadBooksFromServer();
    await new Promise(r => setTimeout(r, 300));

    // Only the server copy must remain
    const shelfState = shelf.get();
    expect(Object.keys(shelfState)).toHaveLength(1);
    expect(shelfState['server-titleauthor-canonical']).toBeDefined();
    expect(shelfState['local-titleauthor-dupe']).toBeUndefined();

    // No new DB row for the dropped local duplicate
    const { results: dupeRow } = await db.prepare('SELECT id FROM books WHERE id = ?').bind('local-titleauthor-dupe').all();
    expect(dupeRow).toHaveLength(0);
    const { results: allBooks } = await db.prepare('SELECT id FROM books WHERE user_id = ?').bind(RECOVERY_USER).all();
    expect(allBooks).toHaveLength(1);
  });
});
