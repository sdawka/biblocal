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

import { shelf, uploadCover, resetCover } from '../../src/stores/shelf';
import { reportSyncError } from '../../src/stores/sync-status';
import type { Book } from '../../src/lib/types';

const BOOK: Book = {
  id: 'b1',
  title: 'Dune',
  author: 'Frank Herbert',
  visibility: 'visible',
  ownership: 'have',
  intents: [],
  coverUrl: 'https://covers.openlibrary.org/b/id/1-M.jpg',
  addedVia: 'manual',
  addedAt: 1,
};

function mockFetchOnce(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(JSON.stringify(body)),
    })
  );
}

describe('uploadCover', () => {
  beforeEach(() => {
    _mockUserId = 'test-user-123';
    shelf.set({ b1: { ...BOOK } });
    vi.mocked(reportSyncError).mockClear();
  });

  it('POSTs multipart form data and applies the returned URLs', async () => {
    mockFetchOnce(200, {
      coverUrl: 'https://imagedelivery.net/h/img1/public',
      fetchedCoverUrl: 'https://covers.openlibrary.org/b/id/1-M.jpg',
    });
    const file = new File(['x'], 'cover.png', { type: 'image/png' });

    const ok = await uploadCover('b1', file);

    expect(ok).toBe(true);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe('/api/books/b1/cover');
    expect((init as RequestInit).method).toBe('POST');
    expect((init as RequestInit).body).toBeInstanceOf(FormData);
    expect(shelf.get()['b1'].coverUrl).toBe('https://imagedelivery.net/h/img1/public');
    expect(shelf.get()['b1'].fetchedCoverUrl).toBe('https://covers.openlibrary.org/b/id/1-M.jpg');
  });

  it('reports a sync error and leaves the book untouched on failure', async () => {
    mockFetchOnce(413, { error: 'too large' });
    const ok = await uploadCover('b1', new File(['x'], 'c.png', { type: 'image/png' }));

    expect(ok).toBe(false);
    expect(reportSyncError).toHaveBeenCalled();
    expect(shelf.get()['b1'].coverUrl).toBe(BOOK.coverUrl);
  });

  it('returns false without fetching when the book is missing', async () => {
    vi.stubGlobal('fetch', vi.fn());
    const ok = await uploadCover('nope', new File(['x'], 'c.png', { type: 'image/png' }));
    expect(ok).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('resetCover', () => {
  beforeEach(() => {
    _mockUserId = 'test-user-123';
    shelf.set({
      b1: {
        ...BOOK,
        coverUrl: 'https://imagedelivery.net/h/img1/public',
        fetchedCoverUrl: 'https://covers.openlibrary.org/b/id/1-M.jpg',
      },
    });
    vi.mocked(reportSyncError).mockClear();
  });

  it('DELETEs and applies the returned fallback cover', async () => {
    mockFetchOnce(200, { coverUrl: 'https://covers.openlibrary.org/b/id/1-M.jpg' });

    const ok = await resetCover('b1');

    expect(ok).toBe(true);
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe('/api/books/b1/cover');
    expect((vi.mocked(fetch).mock.calls[0][1] as RequestInit).method).toBe('DELETE');
    expect(shelf.get()['b1'].coverUrl).toBe('https://covers.openlibrary.org/b/id/1-M.jpg');
  });

  it('reports a sync error on failure', async () => {
    mockFetchOnce(500, { error: 'boom' });
    const ok = await resetCover('b1');
    expect(ok).toBe(false);
    expect(reportSyncError).toHaveBeenCalled();
  });
});
