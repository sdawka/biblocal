import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAuth = vi.hoisted(() => ({
  userId: null as string | null,
  listeners: new Set<(userId: string | null) => void>(),
}));

function setMockUserId(userId: string | null): void {
  mockAuth.userId = userId;
  for (const listener of mockAuth.listeners) listener(userId);
}

vi.mock('../../src/stores/auth', () => ({
  currentUserId: {
    get: () => mockAuth.userId,
    subscribe: (listener: (userId: string | null) => void) => {
      mockAuth.listeners.add(listener);
      listener(mockAuth.userId);
      return () => mockAuth.listeners.delete(listener);
    },
  },
}));

vi.mock('../../src/stores/topics', () => ({
  inferTopicsFromSubjects: (subjects: string[]) => subjects.slice(0, 3),
}));

vi.mock('../../src/stores/sync-status', () => ({
  reportSyncError: vi.fn(),
}));

import {
  addBook,
  addNote,
  removeBook,
  removeNote,
  resetCover,
  shelf,
  updateBook,
  updateNote,
  uploadCover,
} from '../../src/stores/shelf';
import { reportSyncError } from '../../src/stores/sync-status';
import type { Book } from '../../src/lib/types';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => { resolve = settle; });
  return { promise, resolve };
}

function response(ok: boolean, body: unknown = {}, status = ok ? 200 : 500): Response {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

function seedBook(id: string, noteText = 'original'): Book {
  const book: Book = {
    id,
    title: 'Original title',
    author: 'Author',
    visibility: 'visible',
    ownership: 'have',
    intents: [],
    addedVia: 'manual',
    addedAt: 1,
    notes: [{ id: 'note-1', text: noteText, visibility: 'private', createdAt: 1 }],
  };
  shelf.set({ [id]: book });
  return book;
}

describe('per-book mutation lanes', () => {
  beforeEach(() => {
    localStorage.clear();
    setMockUserId(null);
    setMockUserId('lane-user');
    shelf.set({});
    vi.mocked(reportSyncError).mockClear();
    vi.stubGlobal('fetch', vi.fn(async () => response(true)));
  });

  it('preserves a later successful metadata edit when an earlier note update fails', async () => {
    seedBook('metadata-after-note');
    const noteFailure = deferred<Response>();
    vi.mocked(fetch).mockImplementation(async (url, init) => {
      if (String(url).includes('/notes/')) return noteFailure.promise;
      if (init?.method === 'PATCH') return response(true);
      throw new Error(`Unexpected request: ${String(url)}`);
    });

    updateNote('metadata-after-note', 'note-1', { text: 'failed edit' });
    updateBook('metadata-after-note', { title: 'Later title' });

    expect(shelf.get()['metadata-after-note'].title).toBe('Later title');
    await vi.waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1));
    noteFailure.resolve(response(false, { error: 'note failed' }));

    await vi.waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(shelf.get()['metadata-after-note'].notes?.[0].text).toBe('original'));
    expect(shelf.get()['metadata-after-note'].title).toBe('Later title');
  });

  it('keeps a later successful update when an earlier same-note update fails', async () => {
    seedBook('same-note');
    const firstFailure = deferred<Response>();
    vi.mocked(fetch)
      .mockImplementationOnce(() => firstFailure.promise)
      .mockResolvedValueOnce(response(true));

    updateNote('same-note', 'note-1', { text: 'failed first' });
    updateNote('same-note', 'note-1', { text: 'successful second' });

    await vi.waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1));
    firstFailure.resolve(response(false));
    await vi.waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(shelf.get()['same-note'].notes?.[0].text).toBe('successful second'));
  });

  it('leaves no ghost after a failed add and failed dependent update', async () => {
    seedBook('failed-add');
    const addFailure = deferred<Response>();
    vi.mocked(fetch)
      .mockImplementationOnce(() => addFailure.promise)
      .mockResolvedValueOnce(response(false));

    const note = addNote('failed-add', 'draft')!;
    updateNote('failed-add', note.id, { text: 'edited draft' });
    addFailure.resolve(response(false));

    await vi.waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(vi.mocked(reportSyncError)).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(shelf.get()['failed-add'].notes).toEqual([
      expect.objectContaining({ id: 'note-1', text: 'original' }),
    ]));
  });

  it('preserves a successful dependent update when the add response failed', async () => {
    seedBook('committed-add');
    const addFailure = deferred<Response>();
    vi.mocked(fetch)
      .mockImplementationOnce(() => addFailure.promise)
      .mockResolvedValueOnce(response(true));

    const note = addNote('committed-add', 'draft')!;
    updateNote('committed-add', note.id, { text: 'server-confirmed edit' });
    addFailure.resolve(response(false));

    await vi.waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(vi.mocked(reportSyncError)).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(shelf.get()['committed-add'].notes).toContainEqual(
      expect.objectContaining({ id: note.id, text: 'server-confirmed edit' }),
    ));
  });

  it('restores a failed delete rebased over an earlier successful update', async () => {
    seedBook('failed-delete');
    const updateSuccess = deferred<Response>();
    vi.mocked(fetch)
      .mockImplementationOnce(() => updateSuccess.promise)
      .mockResolvedValueOnce(response(false));

    updateNote('failed-delete', 'note-1', { text: 'saved edit' });
    removeNote('failed-delete', 'note-1');
    updateSuccess.resolve(response(true));

    await vi.waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(vi.mocked(reportSyncError)).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(shelf.get()['failed-delete'].notes).toEqual([
      expect.objectContaining({ id: 'note-1', text: 'saved edit' }),
    ]));
  });

  it('never resurrects a book deleted after an earlier note failure', async () => {
    seedBook('delete-after-note');
    const noteFailure = deferred<Response>();
    vi.mocked(fetch)
      .mockImplementationOnce(() => noteFailure.promise)
      .mockResolvedValueOnce(response(true));

    updateNote('delete-after-note', 'note-1', { text: 'failed edit' });
    const deletion = removeBook('delete-after-note');
    noteFailure.resolve(response(false));

    await expect(deletion).resolves.toBe(true);
    expect(shelf.get()['delete-after-note']).toBeUndefined();
  });

  it('waits for canonical creation then sends every mutation in exact FIFO order', async () => {
    const create = deferred<Response>();
    const requests: string[] = [];
    vi.mocked(fetch).mockImplementation(async (url, init) => {
      const request = `${init?.method ?? 'GET'} ${String(url)}`;
      requests.push(request);
      if (request === 'POST /api/books') return create.promise;
      if (request === 'POST /api/books/canonical-id/cover') {
        return response(true, { coverUrl: 'https://covers.test/custom', fetchedCoverUrl: null });
      }
      if (request === 'DELETE /api/books/canonical-id/cover') {
        return response(true, { coverUrl: null });
      }
      return response(true);
    });

    const book = addBook({ id: 'client-id', title: 'Book', author: 'Author', addedVia: 'manual' });
    updateBook(book.id, { title: 'Edited' });
    addNote(book.id, 'Queued note');
    const upload = uploadCover(book.id, new File(['cover'], 'cover.png', { type: 'image/png' }));
    const reset = resetCover(book.id);
    const deletion = removeBook(book.id);

    expect(requests).toEqual(['POST /api/books']);
    create.resolve(response(true, { book: { id: 'canonical-id' } }));

    await expect(upload).resolves.toBe(true);
    await expect(reset).resolves.toBe(true);
    await expect(deletion).resolves.toBe(true);
    expect(requests).toEqual([
      'POST /api/books',
      'PATCH /api/books/canonical-id',
      'POST /api/books/canonical-id/notes',
      'POST /api/books/canonical-id/cover',
      'DELETE /api/books/canonical-id/cover',
      'DELETE /api/books/canonical-id',
    ]);
    expect(shelf.get()['client-id']).toBeUndefined();
    expect(shelf.get()['canonical-id']).toBeUndefined();
  });

  it('does not let queued work cross an A to B to A session transition', async () => {
    const create = deferred<Response>();
    const requests: string[] = [];
    vi.mocked(fetch).mockImplementation(async (url, init) => {
      requests.push(`${init?.method ?? 'GET'} ${String(url)}`);
      if (url === '/api/books') return create.promise;
      return response(true);
    });

    const book = addBook({ id: 'aba-client', title: 'Book', author: 'Author', addedVia: 'manual' });
    updateBook(book.id, { title: 'Must not sync' });
    setMockUserId('user-B');
    setMockUserId('lane-user');
    create.resolve(response(true, { book: { id: 'aba-server' } }));

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(requests).toEqual(['POST /api/books']);
    expect(shelf.get()['aba-server']).toBeUndefined();
  });

  it('settles queued optimism after create failure and lets a later mutation retry', async () => {
    seedBook('retry-create');
    const create = deferred<Response>();
    const requests: string[] = [];
    vi.mocked(fetch).mockImplementation(async (url, init) => {
      requests.push(`${init?.method ?? 'GET'} ${String(url)}`);
      if (url === '/api/books') return create.promise;
      return response(true);
    });

    addBook({ id: 'retry-create', title: 'Replacement', author: 'Author', addedVia: 'manual' });
    addNote('retry-create', 'must roll back with create');
    create.resolve(response(false, { error: 'create failed' }));

    await vi.waitFor(() => expect(shelf.get()['retry-create'].title).toBe('Original title'));
    await vi.waitFor(() => expect(vi.mocked(reportSyncError)).toHaveBeenCalledTimes(1));
    expect(shelf.get()['retry-create'].notes).toEqual([
      expect.objectContaining({ id: 'note-1', text: 'original' }),
    ]);

    updateBook('retry-create', { title: 'Valid retry' });
    await vi.waitFor(() => expect(requests).toEqual([
      'POST /api/books',
      'PATCH /api/books/retry-create',
    ]));
    expect(shelf.get()['retry-create'].title).toBe('Valid retry');
    expect(vi.mocked(reportSyncError)).toHaveBeenCalledTimes(1);
  });

  it('replays a successful dependent field from the original failed-add seed', async () => {
    seedBook('three-note-ops');
    vi.mocked(fetch)
      .mockResolvedValueOnce(response(false, { error: 'lost add response' }))
      .mockResolvedValueOnce(response(false, { error: 'text rejected' }))
      .mockResolvedValueOnce(response(true));

    const note = addNote('three-note-ops', 'draft text', 'private')!;
    updateNote('three-note-ops', note.id, { text: 'failed text' });
    updateNote('three-note-ops', note.id, { visibility: 'visible' });

    await vi.waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalledTimes(3));
    await vi.waitFor(() => expect(vi.mocked(reportSyncError)).toHaveBeenCalledTimes(2));
    expect(shelf.get()['three-note-ops'].notes).toContainEqual(
      expect.objectContaining({ id: note.id, text: 'draft text', visibility: 'visible' }),
    );
  });

  it('does not roll back a later identical metadata value after the earlier write fails', async () => {
    seedBook('same-metadata');
    const firstFailure = deferred<Response>();
    vi.mocked(fetch)
      .mockImplementationOnce(() => firstFailure.promise)
      .mockResolvedValueOnce(response(true));

    updateBook('same-metadata', { title: 'Same title' });
    updateBook('same-metadata', { title: 'Same title' });
    await vi.waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1));
    firstFailure.resolve(response(false));

    await vi.waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(vi.mocked(reportSyncError)).toHaveBeenCalledTimes(1));
    expect(shelf.get()['same-metadata'].title).toBe('Same title');
  });

  it('joins an existing canonical tail before running deduplicated client work', async () => {
    seedBook('canonical-existing');
    const canonicalUpdate = deferred<Response>();
    const create = deferred<Response>();
    const requests: string[] = [];
    vi.mocked(fetch).mockImplementation(async (url, init) => {
      const request = `${init?.method ?? 'GET'} ${String(url)}`;
      requests.push(request);
      if (request === 'PATCH /api/books/canonical-existing' && requests.length === 1) {
        return canonicalUpdate.promise;
      }
      if (request === 'POST /api/books') return create.promise;
      return response(true);
    });

    updateBook('canonical-existing', { author: 'Canonical edit' });
    await vi.waitFor(() => expect(requests).toEqual(['PATCH /api/books/canonical-existing']));
    const client = addBook({
      id: 'dedup-client',
      title: 'Client title',
      author: 'Canonical edit',
      isbn: 'same-isbn',
      addedVia: 'manual',
    });
    updateBook(client.id, { title: 'Queued client title' });
    create.resolve(response(true, { book: { id: 'canonical-existing' } }));

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(requests).toEqual([
      'PATCH /api/books/canonical-existing',
      'POST /api/books',
    ]);

    canonicalUpdate.resolve(response(true));
    await vi.waitFor(() => expect(requests).toEqual([
      'PATCH /api/books/canonical-existing',
      'POST /api/books',
      'PATCH /api/books/canonical-existing',
    ]));
    expect(shelf.get()['dedup-client']).toBeUndefined();
    expect(shelf.get()['canonical-existing']).toEqual(expect.objectContaining({
      id: 'canonical-existing',
      title: 'Queued client title',
      author: 'Canonical edit',
    }));
  });
});
