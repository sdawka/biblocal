/**
 * Bug E: silent load failures
 *
 * shelf.ts line 407 returns silently on !res.ok; the catch at 444-446 only
 * console.errors. Neither surfaces the failure to the user via syncError/
 * reportSyncError, so the SyncErrorToast never shows.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let _mockUserId: string | null = 'error-user';

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

import { shelf, loadBooksFromServer } from '../../src/stores/shelf';
import { reportSyncError } from '../../src/stores/sync-status';

describe('Bug E: reportSyncError on load failure', () => {
  beforeEach(() => {
    localStorage.clear();
    shelf.set({});
    _mockUserId = 'error-user';
    vi.mocked(reportSyncError).mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reportSyncError is called when server returns non-ok status', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    } as Response)));

    await loadBooksFromServer();

    expect(vi.mocked(reportSyncError)).toHaveBeenCalledWith(expect.any(String));
  });

  it('reportSyncError is called when fetch throws a network error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('Network error');
    }));

    await loadBooksFromServer();

    expect(vi.mocked(reportSyncError)).toHaveBeenCalledWith(expect.any(String));
  });

  it('no error reported when user changed mid-flight (intentional silent bail)', async () => {
    // Test that the user-changed guard remains silent (not an error).
    let resolveGate!: () => void;
    const gate = new Promise<void>((r) => { resolveGate = r; });

    vi.stubGlobal('fetch', vi.fn(async () => {
      await gate;
      return { ok: true, json: async () => ({ books: [] }) } as Response;
    }));

    _mockUserId = 'user-A';
    const loadPromise = loadBooksFromServer();

    // Switch user while request is in flight.
    _mockUserId = 'user-B';
    resolveGate();
    await loadPromise;

    // The guard exits silently — no error reported.
    expect(vi.mocked(reportSyncError)).not.toHaveBeenCalled();
  });
});
