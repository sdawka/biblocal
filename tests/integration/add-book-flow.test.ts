/**
 * End-to-end flow test: shelf store → fetch → real API handler → real DB.
 *
 * Global fetch is overridden to route POST /api/books to the real handler with
 * a test DB. This exercises the full optimistic-update + background-sync path
 * that runs in production.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Must mock auth before importing shelf (same pattern as tests/stores/shelf.test.ts)
vi.mock('../../src/stores/auth', () => ({
  currentUserId: {
    get: vi.fn(() => 'flow-user-1'),
    set: vi.fn(),
    subscribe: vi.fn(),
  },
}));

vi.mock('../../src/stores/topics', () => ({
  inferTopicsFromSubjects: (subjects: string[]) => subjects.slice(0, 3),
}));

import { shelf, addBook } from '../../src/stores/shelf';
import { POST as postBookHandler } from '../../src/pages/api/books/index';
import { createTestDb, seedUser } from '../helpers/test-db';
import { setTestDb, resetTestDb } from '../mocks/cloudflare-workers';
import type { D1Shim } from '../helpers/d1-shim';

const FLOW_USER = 'flow-user-1';
const BASE = 'http://localhost';

/** Build a fetch-compatible Response from handler output. */
function makeResponse(status: number, json: unknown): Response {
  return new Response(JSON.stringify(json), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Wire global fetch so POST /api/books routes to the real handler. */
function wireRealHandler(db: D1Shim): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (typeof url === 'string' && url === '/api/books' && init?.method === 'POST') {
        const request = new Request(`${BASE}/api/books`, init as RequestInit);
        return postBookHandler({
          request,
          locals: { qaUserId: FLOW_USER } as Parameters<typeof postBookHandler>[0]['locals'],
          params: {},
          redirect: (u: string) => Response.redirect(u),
          rewrite: async () => new Response(),
          cookies: {} as Parameters<typeof postBookHandler>[0]['cookies'],
          site: undefined,
          generator: 'astro',
          url: new URL(`${BASE}/api/books`),
          clientAddress: '127.0.0.1',
          props: {},
          currentLocale: undefined,
          preferredLocale: undefined,
          preferredLocaleList: undefined,
          routePattern: '',
          isPrerendered: false,
          slots: { has: () => false, render: async () => '' },
        } as unknown as Parameters<typeof postBookHandler>[0]);
      }
      // Any other fetch call gets a default ok response
      return makeResponse(200, {});
    }),
  );
}

describe('add-book flow: store → fetch → real API handler → DB', () => {
  let db: D1Shim;

  beforeEach(() => {
    db = createTestDb();
    seedUser(db, FLOW_USER);
    setTestDb(db);
    shelf.set({});
    wireRealHandler(db);
  });

  afterEach(() => {
    shelf.set({});
    resetTestDb();
    vi.unstubAllGlobals();
  });

  it('optimistic update: book appears in store immediately after addBook()', () => {
    const book = addBook({
      title: 'Brave New World',
      author: 'Aldous Huxley',
      visibility: 'visible',
      ownership: 'have',
      intents: [],
      addedVia: 'manual',
    });

    // Synchronous check — optimistic update should already be applied
    expect(shelf.get()[book.id]).toBeDefined();
    expect(shelf.get()[book.id].title).toBe('Brave New World');
  });

  it('DB row lands after background sync completes', async () => {
    const book = addBook({
      title: 'Fahrenheit 451',
      author: 'Ray Bradbury',
      visibility: 'visible',
      ownership: 'have',
      intents: [],
      addedVia: 'manual',
    });

    // Let the background sync promise settle
    await vi.waitFor(async () => {
      const { results } = await db.prepare('SELECT id FROM books WHERE id = ?').bind(book.id).all();
      expect(results).toHaveLength(1);
    }, { timeout: 2000 });
  });

  it('rollback: store removes book when server returns 500', async () => {
    // Override fetch to return a server error for this test
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, _init?: RequestInit) => makeResponse(500, { error: 'Server error' })),
    );

    const book = addBook({
      title: 'The Road',
      author: 'Cormac McCarthy',
      visibility: 'visible',
      ownership: 'have',
      intents: [],
      addedVia: 'manual',
    });

    // Book should appear optimistically
    expect(shelf.get()[book.id]).toBeDefined();

    // After sync failure the store should roll back
    await vi.waitFor(() => {
      expect(shelf.get()[book.id]).toBeUndefined();
    }, { timeout: 2000 });
  });
});
