/**
 * Bug A: add during load gets wiped
 *
 * The preLoadSnapshot was taken before the fetch, so a book added via addBook()
 * while the GET is in flight appeared in neither preLoadSnapshot nor serverBooks
 * and was discarded by shelf.set(merged).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let _mockUserId: string | null = 'load-user-1';

vi.mock('../../src/stores/auth', () => ({
  currentUserId: { get: () => _mockUserId },
}));

vi.mock('../../src/stores/topics', () => ({
  inferTopicsFromSubjects: (subjects: string[]) => subjects.slice(0, 3),
}));

vi.mock('../../src/stores/sync-status', () => ({
  reportSyncError: vi.fn(),
  syncError: { get: vi.fn(() => null), set: vi.fn() },
}));

import { shelf, addBook, loadBooksFromServer } from '../../src/stores/shelf';
import { reportSyncError } from '../../src/stores/sync-status';

// Builds a deferred fetch that can be released at will.
function deferredFetch(jsonBody: unknown) {
  let release!: () => void;
  const gate = new Promise<void>((r) => { release = r; });
  const fn = vi.fn(async (_url: string, _init?: RequestInit) => {
    await gate;
    return { ok: true, json: async () => jsonBody } as Response;
  });
  return { fn, release };
}

const SERVER_BOOK = {
  id: 'server-book-1',
  title: 'Server Book',
  author: 'Server Author',
  isbn: null,
  coverUrl: null,
  status: 'visible',
  visibility: 'visible',
  ownership: 'have',
  intents: null,
  addedVia: 'manual',
  subjects: null,
  notes: [],
  createdAt: new Date().toISOString(),
};

describe('Bug A: addBook during loadBooksFromServer', () => {
  beforeEach(() => {
    localStorage.clear();
    shelf.set({});
    _mockUserId = 'load-user-1';
    vi.mocked(reportSyncError).mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('book added mid-flight is still in shelf after load resolves', async () => {
    const { fn, release } = deferredFetch({ books: [SERVER_BOOK] });

    // Track all fetch calls so we can inspect POST calls made by the load path.
    const allCalls: { url: string; method: string }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      allCalls.push({ url: String(url), method: init?.method ?? 'GET' });
      return fn(url, init);
    }));

    const loadPromise = loadBooksFromServer();

    // While the GET is in flight, add a new book.
    const midFlightBook = addBook({
      title: 'Added Mid-Flight',
      author: 'Concurrent Author',
      visibility: 'visible',
      ownership: 'have',
      intents: [],
      addedVia: 'manual',
    });

    // Server data that comes back does NOT include the mid-flight book.
    release();
    await loadPromise;

    // The mid-flight book must survive the merge.
    expect(shelf.get()[midFlightBook.id]).toBeDefined();
    expect(shelf.get()[midFlightBook.id].title).toBe('Added Mid-Flight');

    // Server book must also be present.
    expect(shelf.get()[SERVER_BOOK.id]).toBeDefined();
  });

  it('load path does NOT issue a duplicate POST for a book added mid-flight', async () => {
    const postCalls: string[] = [];
    let resolveGate!: () => void;
    const gate = new Promise<void>((r) => { resolveGate = r; });

    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST' && url === '/api/books') {
        const body = JSON.parse(init.body as string) as { title: string };
        postCalls.push(body.title);
      }
      if (init?.method === 'GET' || !init?.method) {
        await gate;
      }
      return { ok: true, json: async () => ({ books: [SERVER_BOOK] }) } as Response;
    }));

    const loadPromise = loadBooksFromServer();

    // addBook fires its own POST synchronously.
    const midFlightBook = addBook({
      title: 'No-Double-Post Book',
      author: 'Unique Author',
      visibility: 'visible',
      ownership: 'have',
      intents: [],
      addedVia: 'manual',
    });

    resolveGate();
    await loadPromise;
    // Give any stray async syncAddBook calls time to run.
    await new Promise((r) => setTimeout(r, 20));

    // Only ONE POST should have been issued (from addBook itself).
    const postsForBook = postCalls.filter((t) => t === midFlightBook.title);
    expect(postsForBook).toHaveLength(1);
  });
});
