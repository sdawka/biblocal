/**
 * shelfHydrated: signals when the initial shelf load has settled (success or
 * failure) so the UI can distinguish "empty because still loading" from
 * "empty because there really are no books." Returning users whose
 * localStorage shelf already had books at startup should never see a
 * loading skeleton.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

let _mockUserId: string | null = 'test-user-123';

vi.mock('../../src/stores/auth', () => ({
  currentUserId: { get: () => _mockUserId },
}));

vi.mock('../../src/stores/topics', () => ({
  inferTopicsFromSubjects: (subjects: string[]) => subjects.slice(0, 3),
}));

vi.mock('../../src/stores/sync-status', () => ({
  reportSyncError: vi.fn(),
}));

import { shelf, shelfHydrated, loadBooksFromServer } from '../../src/stores/shelf';

describe('shelfHydrated', () => {
  beforeEach(() => {
    localStorage.clear();
    shelf.set({});
    shelfHydrated.set(false);
    _mockUserId = 'test-user-123';
  });

  it('settles true after a successful load', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ books: [] }),
    } as Response)));

    expect(shelfHydrated.get()).toBe(false);
    await loadBooksFromServer();
    expect(shelfHydrated.get()).toBe(true);

    vi.unstubAllGlobals();
  });

  it('settles true after a failed (non-ok) load, so the UI never hangs', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    } as Response)));

    await loadBooksFromServer();
    expect(shelfHydrated.get()).toBe(true);

    vi.unstubAllGlobals();
  });

  it('settles true after a network error (thrown fetch), so the UI never hangs', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('Network error');
    }));

    await loadBooksFromServer();
    expect(shelfHydrated.get()).toBe(true);

    vi.unstubAllGlobals();
  });

  it('settles true immediately when there is no current user', async () => {
    _mockUserId = null;
    await loadBooksFromServer();
    expect(shelfHydrated.get()).toBe(true);
  });
});

// shelfHydrated's initial value is seeded once, at module load, directly from
// `shelf`: `atom<boolean>(Object.keys(shelf.get()).length > 0)`. A real
// module-reload round-trip through localStorage isn't observable from within
// a Vitest file — @nanostores/persistent swaps in its own in-memory test
// storage engine rather than reading the real localStorage mock (the same
// reason persistence.test.ts tests the decode helper directly instead of
// round-tripping through the store). Component-level coverage of the
// "returning user, already-populated shelf skips the skeleton" behavior
// lives in Bookshelf.test.ts, which sets `shelf` before mount and asserts
// the shelf (not the skeleton) renders.
