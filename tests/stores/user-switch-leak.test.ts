/**
 * Bug B: different-user login uploads previous user's books to new account
 *
 * When checkUserIdentity returns 'different', clearUserData() wipes localStorage
 * but in-memory shelf/profile atoms kept the prior user's data. loadBooksFromServer
 * then treated them as "local-only" and POSTed them under the new user's credentials.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/stores/topics', () => ({
  inferTopicsFromSubjects: (subjects: string[]) => subjects.slice(0, 3),
}));

vi.mock('../../src/stores/sync-status', () => ({
  reportSyncError: vi.fn(),
  syncError: { get: vi.fn(() => null), set: vi.fn() },
}));

// We need a real (non-mocked) auth module for onUserChange, but we need to
// control currentUserId and the sync helpers it calls.
// Import auth after mocking its dependencies.
vi.mock('../../src/stores/sync', () => ({
  checkUserIdentity: vi.fn(),
  setLastUserId: vi.fn(),
  clearUserData: vi.fn(),
}));

import { shelf, addBook, loadBooksFromServer, endShelfSession } from '../../src/stores/shelf';
import { profile, DEFAULT_PROFILE } from '../../src/stores/profile';
import { connectionRequests } from '../../src/stores/connections';
import { onUserChange, currentUserId } from '../../src/stores/auth';
import { checkUserIdentity } from '../../src/stores/sync';

describe('Bug B: user-switch leaks previous user books', () => {
  beforeEach(() => {
    localStorage.clear();
    shelf.set({});
    profile.set(DEFAULT_PROFILE);
    connectionRequests.set([]);
    currentUserId.set(null);
    vi.mocked(checkUserIdentity).mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shelf is empty immediately when switching to a different user', async () => {
    // Seed user A's books in the in-memory shelf.
    currentUserId.set('user-A');
    addBook({
      title: "User A's Secret Book",
      author: 'A Author',
      visibility: 'private',
      ownership: 'have',
      intents: [],
      addedVia: 'manual',
    });
    expect(Object.keys(shelf.get())).toHaveLength(1);

    // Stub fetch so loadBooksFromServer hangs forever — we only care about
    // the synchronous state after onUserChange, before load completes.
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => { /* never resolves */ })));

    // Simulate switching to user B; identity check returns 'different'.
    vi.mocked(checkUserIdentity).mockReturnValue('different');

    const switchPromise = onUserChange('user-B');

    // The dynamic imports in auth.ts resolve from cache but still run as
    // microtasks; let the queue drain before checking.
    await new Promise((r) => setTimeout(r, 0));
    expect(Object.keys(shelf.get())).toHaveLength(0);

    // Settle the promise (it hangs on loadBooksFromServer but that's OK).
    await Promise.race([switchPromise, new Promise((r) => setTimeout(r, 30))]);
  });

  it('no POST is made with user A books after switching to user B', async () => {
    // Seed user A's books in memory.
    currentUserId.set('user-A');
    const bookA = addBook({
      title: "User A's Book",
      author: 'A Author',
      visibility: 'private',
      ownership: 'have',
      intents: [],
      addedVia: 'manual',
    });

    const postBodies: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST' && String(url) === '/api/books') {
        postBodies.push((init.body as string) ?? '');
      }
      // GET /api/books returns empty list (user B has no books on server).
      return { ok: true, json: async () => ({ books: [] }) } as Response;
    }));

    vi.mocked(checkUserIdentity).mockReturnValue('different');

    await onUserChange('user-B');
    // Give any fire-and-forget POSTs time to fire.
    await new Promise((r) => setTimeout(r, 30));

    const leakedPost = postBodies.find((b) => b.includes(bookA.title));
    expect(leakedPost).toBeUndefined();
  });

  it('connectionRequests is reset when switching to a different user', async () => {
    connectionRequests.set([
      {
        id: 'req-1', fromUserId: 'user-A', toUserId: 'someone',
        status: 'pending', createdAt: Date.now(), updatedAt: Date.now(),
      },
    ]);

    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => { /* never resolves */ })));
    vi.mocked(checkUserIdentity).mockReturnValue('different');

    await Promise.race([onUserChange('user-B'), new Promise((r) => setTimeout(r, 30))]);

    expect(connectionRequests.get()).toHaveLength(0);
  });

  it('releases only this tab old-user lease when switching accounts', async () => {
    const storage = localStorage as Storage & Record<string, string>;
    currentUserId.set('user-A');
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => { /* suspended loads */ })));
    void loadBooksFromServer();
    await Promise.resolve();

    const ownLeaseKey = Object.keys(storage).find(
      (key) => key.startsWith('biblocal:shelf:loads:v2:user-A\u0000'),
    );
    expect(ownLeaseKey).toBeDefined();
    const remoteLeaseKey = 'biblocal:shelf:loads:v2:user-A\u0000remote-tab';
    const markerKey = 'biblocal:shelf:deleted:v1:user-A\u0000remote-book';
    storage[remoteLeaseKey] = JSON.stringify({
      version: 2,
      startedAt: Date.now(),
      expiresAt: Date.now() + 120_000,
    });
    storage[markerKey] = JSON.stringify({
      deletedAt: Date.now() + 1,
      absenceConfirmed: false,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });
    window.dispatchEvent(new PageTransitionEvent('pageshow'));
    vi.mocked(checkUserIdentity).mockReturnValue('different');

    await onUserChange('user-B');

    expect(storage[ownLeaseKey!]).toBeUndefined();
    expect(storage[remoteLeaseKey]).toBeDefined();
    expect(storage[markerKey]).toBeDefined();
    endShelfSession('user-B');
    delete storage[remoteLeaseKey];
    delete storage[markerKey];
  });
});
