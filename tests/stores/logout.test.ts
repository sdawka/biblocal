import { describe, it, expect, beforeEach, vi } from 'vitest';
import { onUserChange, onLogout, currentUserId } from '../../src/stores/auth';
import { shelf, loadBooksFromServer } from '../../src/stores/shelf';
import { profile, DEFAULT_PROFILE } from '../../src/stores/profile';

describe('onLogout resets in-memory state', () => {
  beforeEach(() => {
    localStorage.clear();
    currentUserId.set(null);
    shelf.set({});
    profile.set(DEFAULT_PROFILE);
  });

  it('clears the in-memory shelf and profile atoms (not just localStorage)', async () => {
    // Simulate a logged-in user with data loaded into the in-memory atoms.
    await onUserChange('user-123');
    shelf.set({
      'book-1': {
        id: 'book-1',
        title: 'Old Book',
        author: 'Old Author',
        visibility: 'visible',
        ownership: 'have',
        intents: [],
        addedVia: 'manual',
        addedAt: Date.now(),
      },
    });
    profile.set({ ...DEFAULT_PROFILE, id: 'p1', name: 'Old User', city: 'Old City' });

    expect(Object.keys(shelf.get())).toHaveLength(1);
    expect(profile.get().name).toBe('Old User');

    await onLogout();

    expect(currentUserId.get()).toBeNull();
    expect(shelf.get()).toEqual({});
    expect(profile.get()).toEqual(DEFAULT_PROFILE);
  });

  it('releases only this tab lease while preserving another tab coordination state', async () => {
    const storage = localStorage as Storage & Record<string, string>;
    currentUserId.set('user-123');
    let releaseLoad!: () => void;
    const loadGate = new Promise<void>((resolve) => { releaseLoad = resolve; });
    const recoveryPosts: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/books?mine=true') {
        await loadGate;
        return { ok: true, json: async () => ({ books: [] }) } as Response;
      }
      if (url === '/api/books' && init?.method === 'POST') recoveryPosts.push(String(url));
      return { ok: true, json: async () => ({}) } as Response;
    }));
    const suspendedLoad = loadBooksFromServer();
    await Promise.resolve();

    const ownLeaseKey = Object.keys(storage).find(
      (key) => key.startsWith('biblocal:shelf:loads:v2:user-123\u0000'),
    );
    expect(ownLeaseKey).toBeDefined();
    const remoteLeaseKey = 'biblocal:shelf:loads:v2:user-123\u0000remote-tab';
    const remoteMarkerKey = 'biblocal:shelf:deleted:v1:user-123\u0000remote-book';
    storage[remoteLeaseKey] = JSON.stringify({
      version: 2,
      startedAt: Date.now(),
      expiresAt: Date.now() + 120_000,
    });
    storage[remoteMarkerKey] = JSON.stringify({
      deletedAt: Date.now() + 1,
      absenceConfirmed: false,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });
    window.dispatchEvent(new PageTransitionEvent('pageshow'));

    await onLogout();
    releaseLoad();
    await suspendedLoad;

    expect(storage[ownLeaseKey!]).toBeUndefined();
    expect(storage[remoteLeaseKey]).toBeDefined();
    expect(storage[remoteMarkerKey]).toBeDefined();
    expect(shelf.get()).toEqual({});
    expect(recoveryPosts).toEqual([]);
    delete storage[remoteLeaseKey];
    delete storage[remoteMarkerKey];
  });
});
