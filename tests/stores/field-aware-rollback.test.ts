/**
 * Bug C: rapid double-edit — failed first PATCH clobbers successful second edit
 *
 * When two sequential updateBook calls mutate different fields and the first
 * PATCH fails, the whole-book rollback restores pre-first-edit state, wiping
 * the second field's value even though that edit succeeded.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let _mockUserId: string | null = 'rollback-user';

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

import { shelf, addBook, updateBook } from '../../src/stores/shelf';
import { reportSyncError } from '../../src/stores/sync-status';

describe('Bug C: field-aware rollback on rapid double-edit', () => {
  beforeEach(() => {
    localStorage.clear();
    shelf.set({});
    _mockUserId = 'rollback-user';
    vi.mocked(reportSyncError).mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('second field survives when only the first PATCH fails', async () => {
    // Seed a book.
    const book = addBook({
      title: 'Test Book',
      author: 'Test Author',
      visibility: 'visible',
      ownership: 'have',
      intents: [],
      addedVia: 'manual',
    });

    // We need to intercept the individual PATCH calls in sequence.
    // First call (visibility update) fails; second call (intents update) succeeds.
    let patchCallCount = 0;
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'PATCH') {
        patchCallCount++;
        if (patchCallCount === 1) {
          // First PATCH (visibility) fails.
          return { ok: false, text: async () => 'server error' } as Response;
        }
        // Second PATCH (intents) succeeds.
        return { ok: true, json: async () => ({}) } as Response;
      }
      // addBook POST
      return { ok: true, json: async () => ({}) } as Response;
    }));

    // First update: change visibility.
    updateBook(book.id, { visibility: 'private' });
    // Second update: change intents (different field, different PATCH).
    updateBook(book.id, { intents: ['borrowable'] });

    // Let both PATCHes settle.
    await vi.waitFor(() => {
      expect(patchCallCount).toBeGreaterThanOrEqual(2);
    }, { timeout: 1000 });

    // Give rollback callbacks time to run.
    await new Promise((r) => setTimeout(r, 20));

    const current = shelf.get()[book.id];
    // Visibility should revert (first PATCH failed).
    expect(current.visibility).toBe('visible');
    // Intents should stay (second PATCH succeeded).
    expect(current.intents).toEqual(['borrowable']);
  });

  it('add/remove rollback: book added via addBook is deleted on sync failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false, text: async () => 'error',
    } as Response)));

    addBook({
      title: 'Will Fail',
      author: 'Nobody',
      visibility: 'visible',
      ownership: 'have',
      intents: [],
      addedVia: 'manual',
    });

    await vi.waitFor(() => {
      expect(Object.keys(shelf.get())).toHaveLength(0);
    }, { timeout: 1000 });
  });
});
