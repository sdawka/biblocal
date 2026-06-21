import { describe, it, expect, vi, beforeEach } from 'vitest';

// Must mock auth before importing the stores (they read currentUserId at sync time).
vi.mock('../../src/stores/auth', () => ({
  currentUserId: { get: () => 'test-user-123' },
}));

vi.mock('../../src/stores/topics', () => ({
  inferTopicsFromSubjects: (subjects: string[]) => subjects.slice(0, 3),
}));

import { syncError, reportSyncError, clearSyncError } from '../../src/stores/sync-status';
import { shelf, addBook, updateBook, removeBook } from '../../src/stores/shelf';
import { profile, updateProfile } from '../../src/stores/profile';
import type { BookStatus } from '../../src/lib/types';

describe('sync-status atom', () => {
  beforeEach(() => {
    clearSyncError();
  });

  it('defaults to null', () => {
    expect(syncError.get()).toBeNull();
  });

  it('reportSyncError sets the message', () => {
    reportSyncError('Something failed');
    expect(syncError.get()).toBe('Something failed');
  });

  it('clearSyncError resets to null', () => {
    reportSyncError('Something failed');
    clearSyncError();
    expect(syncError.get()).toBeNull();
  });
});

describe('shelf rollback on failed sync', () => {
  beforeEach(() => {
    shelf.set({});
    clearSyncError();
    // Reset call history but restore an ok:true implementation (clearAllMocks
    // wipes the one configured in tests/setup.ts, leaving fetch returning
    // undefined, which would make seeding addBook calls fail).
    vi.mocked(fetch).mockReset();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(''),
      json: () => Promise.resolve({}),
    } as Response);
  });

  // Override fetch per-test to simulate a non-2xx response, then await a
  // microtask flush so the fire-and-forget sync's rollback has run.
  function mockFailedFetch() {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      text: () => Promise.resolve('boom'),
      json: () => Promise.resolve({}),
    } as Response);
  }

  const flush = () => new Promise((r) => setTimeout(r, 0));

  it('rolls back addBook and reports an error when the sync fails', async () => {
    mockFailedFetch();

    const book = addBook({
      title: 'Doomed',
      author: 'Author',
      status: 'visible' as BookStatus,
      addedVia: 'manual',
    });

    // Optimistic insert is visible immediately.
    expect(shelf.get()[book.id]).toBeDefined();

    await flush();

    // After the failed sync, the optimistic change is reverted.
    expect(shelf.get()[book.id]).toBeUndefined();
    expect(syncError.get()).toBe('Could not save your change. Please try again.');
  });

  it('rolls back updateBook to the prior book state on sync failure', async () => {
    // Seed a book with a successful sync first.
    const book = addBook({
      title: 'Original',
      author: 'Author',
      status: 'visible' as BookStatus,
      addedVia: 'manual',
    });
    await flush();
    clearSyncError();

    mockFailedFetch();
    updateBook(book.id, { title: 'Changed' });
    expect(shelf.get()[book.id].title).toBe('Changed');

    await flush();

    expect(shelf.get()[book.id].title).toBe('Original');
    expect(syncError.get()).toBe('Could not save your change. Please try again.');
  });

  it('restores a removed book when the deletion sync fails', async () => {
    const book = addBook({
      title: 'Keep Me',
      author: 'Author',
      status: 'visible' as BookStatus,
      addedVia: 'manual',
    });
    await flush();
    clearSyncError();

    mockFailedFetch();
    removeBook(book.id);
    expect(shelf.get()[book.id]).toBeUndefined();

    await flush();

    expect(shelf.get()[book.id]).toBeDefined();
    expect(syncError.get()).toBe('Could not save your change. Please try again.');
  });
});

describe('profile rollback on failed sync', () => {
  beforeEach(() => {
    profile.set({
      id: 'p1',
      name: 'Before',
      city: 'Town',
      radiusKm: 5,
      topics: { curated: [], freeform: [], inferred: [] },
    });
    clearSyncError();
    vi.mocked(fetch).mockReset();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(''),
      json: () => Promise.resolve({}),
    } as Response);
  });

  const flush = () => new Promise((r) => setTimeout(r, 0));

  it('reverts the optimistic profile change and reports an error', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      text: () => Promise.resolve('boom'),
      json: () => Promise.resolve({}),
    } as Response);

    updateProfile({ name: 'After' });
    expect(profile.get().name).toBe('After');

    await flush();

    expect(profile.get().name).toBe('Before');
    expect(syncError.get()).toBe('Could not save your profile. Please try again.');
  });
});
