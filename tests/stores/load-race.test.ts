import { describe, it, expect, beforeEach, vi } from 'vitest';
import { currentUserId } from '../../src/stores/auth';
import { shelf, loadBooksFromServer } from '../../src/stores/shelf';
import { profile, DEFAULT_PROFILE, loadProfileFromServer } from '../../src/stores/profile';

// A fetch mock whose resolution is deferred until we explicitly resolve it,
// so we can interleave a user switch between the request and its response.
function deferredFetch(jsonBody: unknown) {
  let resolve!: () => void;
  const gate = new Promise<void>((r) => { resolve = r; });
  const fn = vi.fn(async () => {
    await gate;
    return { ok: true, json: async () => jsonBody } as Response;
  });
  return { fn, release: resolve };
}

describe('load race: a stale load must not overwrite a newer user', () => {
  beforeEach(() => {
    localStorage.clear();
    currentUserId.set(null);
    shelf.set({});
    profile.set(DEFAULT_PROFILE);
  });

  it('loadBooksFromServer bails when the user changed mid-flight', async () => {
    currentUserId.set('user-A');
    const { fn, release } = deferredFetch({
      books: [{
        id: 'a-book', title: "User A's Book", author: 'A', isbn: null,
        coverUrl: null, status: 'visible', visibility: 'visible',
        ownership: 'have', intents: null, addedVia: 'manual', subjects: null,
        notes: [], createdAt: new Date().toISOString(),
      }],
    });
    vi.stubGlobal('fetch', fn);

    const loadPromise = loadBooksFromServer();
    // User B logs in (and their fresh data lands) before A's slow response.
    currentUserId.set('user-B');
    shelf.set({
      'b-book': {
        id: 'b-book', title: "User B's Book", author: 'B',
        visibility: 'visible', ownership: 'have', intents: [],
        addedVia: 'manual', addedAt: Date.now(),
      },
    });

    release();
    await loadPromise;

    // A's stale response must not have clobbered B's shelf.
    expect(Object.keys(shelf.get())).toEqual(['b-book']);
    expect(shelf.get()['a-book']).toBeUndefined();
  });

  it('loadProfileFromServer bails when the user changed mid-flight', async () => {
    currentUserId.set('user-A');
    const { fn, release } = deferredFetch({
      profile: {
        id: 'profile-A', name: 'User A', city: 'A City', radiusKm: 5,
        borrowStyle: null, currentObsessions: null, topicsCurated: null,
        topicsFreeform: null, latitude: null, longitude: null,
        locationPrecision: null, contactMethod: null, contactValue: null,
        contactVisibility: null,
      },
    });
    vi.stubGlobal('fetch', fn);

    const loadPromise = loadProfileFromServer();
    currentUserId.set('user-B');
    profile.set({ ...DEFAULT_PROFILE, id: 'profile-B', name: 'User B', city: 'B City' });

    release();
    await loadPromise;

    expect(profile.get().name).toBe('User B');
    expect(profile.get().id).toBe('profile-B');
  });
});
