import { describe, it, expect, vi, afterEach } from 'vitest';
import type { Book } from '../../src/lib/types';

vi.mock('../../src/stores/topics', () => ({
  inferTopicsFromSubjects: (subjects: string[]) => subjects.slice(0, 3),
}));

vi.mock('../../src/stores/sync-status', () => ({
  reportSyncError: vi.fn(),
  syncError: { get: vi.fn(() => null), set: vi.fn() },
}));

describe('shelf session initialization', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('synchronously strips a persisted deleted book before the first server load', async () => {
    const storage = localStorage as Storage & Record<string, string>;
    const book: Book = {
      id: 'cold-deleted', title: 'Cold Deleted', author: 'Author', visibility: 'visible',
      ownership: 'have', intents: [], addedVia: 'manual', addedAt: 1,
    };
    const shelfKey = 'biblocal:shelf:v1';
    const markerKey = 'biblocal:shelf:deleted:v1:cold-user\u0000cold-deleted';
    storage[shelfKey] = JSON.stringify({ [book.id]: book });
    storage[markerKey] = JSON.stringify({
      deletedAt: Date.now(),
      absenceConfirmed: false,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });
    localStorage.setItem('biblocal:lastUserId', 'cold-user');
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => { /* suspended initial load */ })));

    const { onUserChange, currentUserId } = await import('../../src/stores/auth');
    const { shelf, endShelfSession } = await import('../../src/stores/shelf');
    const publishedShelves: Array<Book | undefined> = [];
    const stopWatchingUser = currentUserId.subscribe((activeUserId) => {
      if (activeUserId === 'cold-user') publishedShelves.push(shelf.get()['cold-deleted']);
    });
    await onUserChange('cold-user');

    expect(shelf.get()['cold-deleted']).toBeUndefined();
    expect(publishedShelves).toEqual([undefined]);
    stopWatchingUser();
    endShelfSession('cold-user');

    delete storage[shelfKey];
    delete storage[markerKey];
  });

  it('preserves initial same-user shelf state while starting hydration', async () => {
    const storedBook: Book = {
      id: 'same-user-book', title: 'Same User', author: 'Author', visibility: 'visible',
      ownership: 'have', intents: [], addedVia: 'manual', addedAt: 1,
    };
    localStorage.setItem('biblocal:lastUserId', 'same-user');
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => { /* suspended initial load */ })));
    const { onUserChange, currentUserId } = await import('../../src/stores/auth');
    const { shelf, endShelfSession } = await import('../../src/stores/shelf');
    currentUserId.set(null);
    shelf.set({ [storedBook.id]: storedBook });

    await onUserChange('same-user');

    expect(shelf.get()[storedBook.id]).toEqual(storedBook);
    endShelfSession('same-user');
  });
});
