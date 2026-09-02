import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAuth = vi.hoisted(() => ({
  userId: 'test-user-123' as string | null,
  listeners: new Set<(userId: string | null) => void>(),
}));

function setMockUserId(userId: string | null) {
  mockAuth.userId = userId;
  for (const listener of mockAuth.listeners) listener(userId);
}

// Must mock auth before importing shelf
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
  shelf,
  activeFilter,
  activeFilters,
  addBook,
  updateBook,
  updateBookStatus,
  removeBook,
  loadBooksFromServer,
  getBookCount,
  getShelfStats,
  getInferredTopics,
  findDuplicate,
  clearAllFilters,
  addNote,
  updateNote,
  removeNote,
} from '../../src/stores/shelf';
import { reportSyncError } from '../../src/stores/sync-status';
import type { Book, BookStatus } from '../../src/lib/types';

describe('Shelf Store', () => {
  beforeEach(() => {
    shelf.set({});
    activeFilter.set('all');
  });

  describe('addBook', () => {
    it('adds a book with generated id and timestamp', () => {
      const book = addBook({
        title: 'Crime and Punishment',
        author: 'Fyodor Dostoevsky',
        isbn: '9780140449136',
        status: 'borrowable' as BookStatus,
        addedVia: 'manual',
      });

      expect(book.id).toBeDefined();
      expect(book.addedAt).toBeDefined();
      expect(book.title).toBe('Crime and Punishment');
      expect(shelf.get()[book.id]).toEqual(book);
    });

    it('preserves provided id', () => {
      const book = addBook({
        id: 'custom-id',
        title: 'Test Book',
        author: 'Test Author',
        status: 'private' as BookStatus,
        addedVia: 'manual',
      });

      expect(book.id).toBe('custom-id');
    });

    it('syncs to server when user is authenticated', async () => {
      addBook({
        title: 'Test',
        author: 'Author',
        status: 'visible' as BookStatus,
        addedVia: 'scan',
      });

      expect(fetch).toHaveBeenCalledWith('/api/books', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }));
    });
  });

  describe('updateBook', () => {
    it('updates book properties', () => {
      const book = addBook({
        title: 'Original',
        author: 'Author',
        status: 'private' as BookStatus,
        addedVia: 'manual',
      });

      updateBook(book.id, { title: 'Updated Title', visibility: 'private' });

      const updated = shelf.get()[book.id];
      expect(updated.title).toBe('Updated Title');
      expect(updated.visibility).toBe('private');
      expect(updated.author).toBe('Author'); // unchanged
    });

    it('does nothing for non-existent book', () => {
      const before = { ...shelf.get() };
      updateBook('non-existent', { title: 'New' });
      expect(shelf.get()).toEqual(before);
    });
  });

  describe('updateBookStatus', () => {
    it('changes book status', () => {
      const book = addBook({
        title: 'Test',
        author: 'Author',
        status: 'private' as BookStatus,
        addedVia: 'manual',
      });

      updateBookStatus(book.id, 'borrowable');

      expect(shelf.get()[book.id].status).toBe('borrowable');
    });
  });

  describe('removeBook', () => {
    it('removes book from shelf after the server confirms deletion', async () => {
      const book = addBook({
        title: 'To Remove',
        author: 'Author',
        status: 'private' as BookStatus,
        addedVia: 'manual',
      });

      expect(shelf.get()[book.id]).toBeDefined();

      const removed = await removeBook(book.id);

      expect(removed).toBe(true);
      expect(shelf.get()[book.id]).toBeUndefined();
    });

    it('syncs deletion to server', async () => {
      const book = addBook({
        title: 'Test',
        author: 'Author',
        status: 'private' as BookStatus,
        addedVia: 'manual',
      });

      vi.clearAllMocks();
      await removeBook(book.id);

      expect(fetch).toHaveBeenCalledWith(`/api/books/${book.id}`, { method: 'DELETE' });
    });

    it('waits for a pending create of the same book before deleting it', async () => {
      let releaseCreate!: () => void;
      const createGate = new Promise<void>((resolve) => { releaseCreate = resolve; });
      vi.mocked(fetch).mockImplementation(async (url, init) => {
        if (url === '/api/books' && init?.method === 'POST') {
          await createGate;
        }
        return { ok: true, json: async () => ({}) } as Response;
      });

      const book = addBook({ id: 'pending-create', title: 'New Book', author: 'Author', addedVia: 'manual' });
      const deletePromise = removeBook(book.id);

      expect(vi.mocked(fetch)).not.toHaveBeenCalledWith(`/api/books/${book.id}`, { method: 'DELETE' });
      expect(shelf.get()[book.id]).toEqual(book);

      releaseCreate();
      await expect(deletePromise).resolves.toBe(true);
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(`/api/books/${book.id}`, { method: 'DELETE' });
      expect(shelf.get()[book.id]).toBeUndefined();
    });

    it('waits for a legacy-recovery create before deleting the same book', async () => {
      const book: Book = {
        id: 'legacy-recovery', title: 'Recovered Book', author: 'Author', visibility: 'visible',
        ownership: 'have', intents: [], addedVia: 'manual', addedAt: 1,
      };
      shelf.set({ [book.id]: book });
      let releaseCreate!: () => void;
      const createGate = new Promise<void>((resolve) => { releaseCreate = resolve; });
      vi.mocked(fetch).mockImplementation(async (url, init) => {
        if (url === '/api/books?mine=true') {
          return { ok: true, json: async () => ({ books: [] }) } as Response;
        }
        if (url === '/api/books' && init?.method === 'POST') await createGate;
        return { ok: true, json: async () => ({}) } as Response;
      });

      await loadBooksFromServer();
      const deletion = removeBook(book.id);

      expect(vi.mocked(fetch)).not.toHaveBeenCalledWith(`/api/books/${book.id}`, { method: 'DELETE' });
      releaseCreate();
      await expect(deletion).resolves.toBe(true);
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(`/api/books/${book.id}`, { method: 'DELETE' });
    });

    it('fences stale-load legacy recovery once deletion has begun', async () => {
      const book: Book = {
        id: 'fenced-recovery', title: 'Fenced Book', author: 'Author', visibility: 'visible',
        ownership: 'have', intents: [], addedVia: 'manual', addedAt: 1,
      };
      shelf.set({ [book.id]: book });
      let releaseLoad!: () => void;
      let releaseDelete!: () => void;
      const loadGate = new Promise<void>((resolve) => { releaseLoad = resolve; });
      const deleteGate = new Promise<void>((resolve) => { releaseDelete = resolve; });
      const requests: string[] = [];
      vi.mocked(fetch).mockImplementation(async (url, init) => {
        if (url === '/api/books?mine=true') {
          requests.push('GET');
          await loadGate;
          return { ok: true, json: async () => ({ books: [] }) } as Response;
        }
        if (url === '/api/books' && init?.method === 'POST') {
          requests.push('POST');
          return { ok: true, json: async () => ({}) } as Response;
        }
        if (init?.method === 'DELETE') {
          requests.push('DELETE');
          await deleteGate;
          return { ok: true } as Response;
        }
        return { ok: true, json: async () => ({}) } as Response;
      });

      const staleLoad = loadBooksFromServer();
      const deletion = removeBook(book.id);
      releaseLoad();
      await staleLoad;

      expect(requests).toEqual(['GET', 'DELETE']);
      expect(shelf.get()[book.id]).toEqual(book);

      releaseDelete();
      await expect(deletion).resolves.toBe(true);
      expect(requests).toEqual(['GET', 'DELETE']);
      expect(shelf.get()[book.id]).toBeUndefined();
    });

    it('keeps a confirmed deletion hidden from a stale load until a later load confirms absence', async () => {
      const book: Book = {
        id: 'stale-book', title: 'Stale Book', author: 'Author', visibility: 'visible',
        ownership: 'have', intents: [], addedVia: 'manual', addedAt: 1,
      };
      shelf.set({ [book.id]: book });
      let releaseLoad!: () => void;
      const loadGate = new Promise<void>((resolve) => { releaseLoad = resolve; });
      let loadCount = 0;
      vi.mocked(fetch).mockImplementation(async (url, init) => {
        if (url === '/api/books?mine=true') {
          const requestNumber = ++loadCount;
          if (requestNumber === 1) await loadGate;
          const books = requestNumber === 2 ? [] : [{
            id: book.id, title: book.title, author: book.author, isbn: null,
            coverUrl: null, fetchedCoverUrl: null, status: 'visible', visibility: 'visible',
            ownership: 'have', intents: '[]', addedVia: 'manual', subjects: null,
            createdAt: new Date(1).toISOString(),
          }];
          return { ok: true, json: async () => ({ books }) } as Response;
        }
        if (init?.method === 'DELETE') return { ok: true } as Response;
        return { ok: true, json: async () => ({}) } as Response;
      });

      const staleLoad = loadBooksFromServer();
      await expect(removeBook(book.id)).resolves.toBe(true);

      await loadBooksFromServer(); // a newer request confirms absence first
      expect(shelf.get()[book.id]).toBeUndefined();

      releaseLoad();
      await staleLoad;
      expect(shelf.get()[book.id]).toBeUndefined();

      await loadBooksFromServer(); // after stale work settles, a genuine copy may appear again
      expect(shelf.get()[book.id]?.title).toBe('Stale Book');
    });

    it('keeps the book on failed DELETE and allows a successful retry', async () => {
      const book: Book = {
        id: 'retry-book', title: 'Retry Book', author: 'Author', visibility: 'visible',
        ownership: 'have', intents: [], addedVia: 'manual', addedAt: 1,
      };
      shelf.set({ [book.id]: book });
      vi.mocked(fetch)
        .mockResolvedValueOnce({ ok: false, text: async () => 'temporary failure' } as Response)
        .mockResolvedValueOnce({ ok: true } as Response);

      await expect(removeBook(book.id)).resolves.toBe(false);
      expect(shelf.get()[book.id]).toEqual(book);

      await expect(removeBook(book.id)).resolves.toBe(true);
      expect(shelf.get()[book.id]).toBeUndefined();
    });

    it('treats retry 404 as converged success and blocks a stale load from resurrection', async () => {
      const book: Book = {
        id: 'lost-response', title: 'Lost Response', author: 'Author', visibility: 'visible',
        ownership: 'have', intents: [], addedVia: 'manual', addedAt: 1,
      };
      shelf.set({ [book.id]: book });
      let releaseLoad!: () => void;
      const loadGate = new Promise<void>((resolve) => { releaseLoad = resolve; });
      let deleteAttempt = 0;
      vi.mocked(fetch).mockImplementation(async (url, init) => {
        if (url === '/api/books?mine=true') {
          await loadGate;
          return { ok: true, json: async () => ({ books: [{
            id: book.id, title: book.title, author: book.author, isbn: null,
            coverUrl: null, fetchedCoverUrl: null, status: 'visible', visibility: 'visible',
            ownership: 'have', intents: '[]', addedVia: 'manual', subjects: null,
            createdAt: new Date(1).toISOString(),
          }] }) } as Response;
        }
        if (init?.method === 'DELETE') {
          deleteAttempt += 1;
          if (deleteAttempt === 1) throw new Error('response lost');
          return { ok: false, status: 404, text: async () => 'already absent' } as Response;
        }
        return { ok: true, json: async () => ({}) } as Response;
      });

      await expect(removeBook(book.id)).resolves.toBe(false);
      expect(shelf.get()[book.id]).toEqual(book);

      const staleLoad = loadBooksFromServer();
      await expect(removeBook(book.id)).resolves.toBe(true);
      expect(shelf.get()[book.id]).toBeUndefined();
      releaseLoad();
      await staleLoad;
      expect(shelf.get()[book.id]).toBeUndefined();
    });

    it('does not finish an old user deletion after identity changes while create is pending', async () => {
      let releaseCreate!: () => void;
      const createGate = new Promise<void>((resolve) => { releaseCreate = resolve; });
      vi.mocked(fetch).mockImplementation(async (url, init) => {
        if (url === '/api/books' && init?.method === 'POST') await createGate;
        return { ok: true, json: async () => ({}) } as Response;
      });
      const book = addBook({ id: 'shared-id', title: 'Old User Book', author: 'Author', addedVia: 'manual' });
      const deletion = removeBook(book.id);

      setMockUserId('different-user');
      releaseCreate();

      await expect(deletion).resolves.toBe(false);
      expect(vi.mocked(fetch)).not.toHaveBeenCalledWith(`/api/books/${book.id}`, { method: 'DELETE' });
      setMockUserId('test-user-123');
    });

    it('does not finish deletion after an A to B to A identity transition', async () => {
      const book: Book = {
        id: 'aba-book', title: 'ABA Book', author: 'Author', visibility: 'visible',
        ownership: 'have', intents: [], addedVia: 'manual', addedAt: 1,
      };
      shelf.set({ [book.id]: book });
      let releaseDelete!: () => void;
      const deleteGate = new Promise<void>((resolve) => { releaseDelete = resolve; });
      vi.mocked(fetch).mockImplementation(async (_url, init) => {
        if (init?.method === 'DELETE') await deleteGate;
        return { ok: true, json: async () => ({}) } as Response;
      });

      const deletion = removeBook(book.id);
      setMockUserId('different-user');
      setMockUserId('test-user-123');
      releaseDelete();

      await expect(deletion).resolves.toBe(false);
      expect(shelf.get()[book.id]).toEqual(book);

      vi.mocked(fetch).mockResolvedValue({ ok: true } as Response);
      await expect(removeBook(book.id)).resolves.toBe(true);
    });
  });

  describe('getBookCount', () => {
    it('returns correct count', () => {
      expect(getBookCount()).toBe(0);

      addBook({ title: 'Book 1', author: 'A', status: 'private' as BookStatus, addedVia: 'manual' });
      addBook({ title: 'Book 2', author: 'B', status: 'visible' as BookStatus, addedVia: 'manual' });

      expect(getBookCount()).toBe(2);
    });
  });

  describe('getShelfStats', () => {
    it('calculates correct stats', () => {
      addBook({ title: 'Private', author: 'A', visibility: 'private', ownership: 'have', intents: [], addedVia: 'manual' });
      addBook({ title: 'Borrowable', author: 'B', ownership: 'have', intents: ['borrowable'], addedVia: 'manual' });
      addBook({ title: 'Giftable', author: 'C', ownership: 'have', intents: ['giftable'], addedVia: 'manual' });
      addBook({ title: 'Discussable', author: 'D', ownership: 'have', intents: ['discussable'], addedVia: 'manual' });

      const stats = getShelfStats();

      expect(stats.total).toBe(4);
      expect(stats.lendable).toBe(2); // borrowable + giftable
      expect(stats.discussable).toBe(1);
    });

    it('returns zeros for empty shelf', () => {
      const stats = getShelfStats();
      expect(stats).toEqual({ total: 0, lendable: 0, discussable: 0 });
    });
  });

  describe('getInferredTopics', () => {
    it('extracts topics from book subjects', () => {
      addBook({
        title: 'Test',
        author: 'Author',
        status: 'private' as BookStatus,
        addedVia: 'manual',
        subjects: ['Fiction', 'Russian Literature', 'Psychology'],
      });

      const topics = getInferredTopics();
      expect(topics).toContain('Fiction');
      expect(topics).toContain('Russian Literature');
    });
  });

  describe('activeFilter', () => {
    it('defaults to all', () => {
      expect(activeFilter.get()).toBe('all');
    });

    it('can be set to specific status', () => {
      activeFilter.set('borrowable');
      expect(activeFilter.get()).toBe('borrowable');
    });
  });

  describe('clearAllFilters', () => {
    it('resets all active filters to empty defaults', () => {
      activeFilters.set({ visibility: ['private'], ownership: ['seeking'], intents: ['borrowable'] });
      clearAllFilters();
      expect(activeFilters.get()).toEqual({ visibility: [], ownership: [], intents: [] });
    });
  });

  describe('null userId: optimistic mutations are rolled back', () => {
    beforeEach(() => {
      setMockUserId(null);
      shelf.set({});
      vi.mocked(reportSyncError).mockClear();
    });

    afterEach(() => {
      setMockUserId('test-user-123');
    });

    it('addBook rolls back and reports a sync error when user is not authenticated', () => {
      addBook({ title: 'Ghost Book', author: 'Nobody', addedVia: 'manual' });

      // The null-userId guard fires before any await inside syncAddBook, so
      // rollback() is called synchronously — the shelf is already empty on return.
      expect(Object.keys(shelf.get())).toHaveLength(0);
      expect(vi.mocked(reportSyncError)).toHaveBeenCalledWith(expect.any(String));
    });
  });

  describe('findDuplicate', () => {
    beforeEach(() => {
      shelf.set({});
    });

    it('returns null when shelf is empty', () => {
      const result = findDuplicate('9780140449136', 'Crime and Punishment', 'Dostoevsky');
      expect(result).toBeNull();
    });

    it('finds duplicate by ISBN', () => {
      const book = addBook({
        title: 'Crime and Punishment',
        author: 'Fyodor Dostoevsky',
        isbn: '9780140449136',
        ownership: 'have',
        intents: [],
        addedVia: 'manual',
      });

      const result = findDuplicate('9780140449136', 'Different Title', 'Different Author');
      expect(result).toEqual(book);
    });

    it('finds duplicate by normalized title and author', () => {
      const book = addBook({
        title: 'Crime and Punishment',
        author: 'Fyodor Dostoevsky',
        ownership: 'have',
        intents: [],
        addedVia: 'manual',
      });

      const result = findDuplicate(undefined, '  CRIME AND PUNISHMENT  ', 'fyodor  dostoevsky');
      expect(result).toEqual(book);
    });

    it('returns null when no match', () => {
      addBook({
        title: 'Crime and Punishment',
        author: 'Fyodor Dostoevsky',
        isbn: '9780140449136',
        ownership: 'have',
        intents: [],
        addedVia: 'manual',
      });

      const result = findDuplicate(undefined, 'The Brothers Karamazov', 'Fyodor Dostoevsky');
      expect(result).toBeNull();
    });

    it('skips ISBN check when book has no ISBN', () => {
      addBook({
        title: 'My Book',
        author: 'Some Author',
        ownership: 'have',
        intents: [],
        addedVia: 'manual',
      });

      const result = findDuplicate('9781234567890', 'My Book', 'Some Author');
      expect(result).not.toBeNull();
    });
  });

  describe('book notes', () => {
    // Seed a book that already has notes, independent of addNote, so the
    // update/remove tests don't depend on the addNote implementation.
    function seedBookWithNote(): { bookId: string; noteId: string } {
      const book: Book = {
        id: 'book-1',
        title: 'GEB',
        author: 'Hofstadter',
        visibility: 'visible',
        ownership: 'have',
        intents: [],
        addedVia: 'manual',
        addedAt: 1,
        notes: [{ id: 'note-1', text: 'Loved the dialogues', visibility: 'private', createdAt: 1 }],
      };
      shelf.set({ [book.id]: book });
      return { bookId: book.id, noteId: 'note-1' };
    }

    it('addNote appends a note to the book', () => {
      const book = addBook({
        title: 'Dune',
        author: 'Herbert',
        ownership: 'have',
        intents: [],
        addedVia: 'manual',
      });

      const note = addNote(book.id, 'The spice imagery stuck with me', 'visible');

      expect(note).not.toBeNull();
      const stored = shelf.get()[book.id];
      expect(stored.notes).toHaveLength(1);
      expect(stored.notes![0].text).toBe('The spice imagery stuck with me');
      expect(stored.notes![0].visibility).toBe('visible');
      expect(stored.notes![0].id).toBe(note!.id);
    });

    it('addNote defaults to private and syncs to server', () => {
      const book = addBook({ title: 'X', author: 'Y', ownership: 'have', intents: [], addedVia: 'manual' });
      const note = addNote(book.id, 'a private thought');

      expect(note!.visibility).toBe('private');
      expect(fetch).toHaveBeenCalledWith(
        `/api/books/${book.id}/notes`,
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('addNote returns null for a non-existent book', () => {
      expect(addNote('nope', 'text')).toBeNull();
    });

    it('updateNote changes text and flips visibility', () => {
      const { bookId, noteId } = seedBookWithNote();

      updateNote(bookId, noteId, { text: 'Actually the MU puzzle', visibility: 'visible' });

      const note = shelf.get()[bookId].notes![0];
      expect(note.text).toBe('Actually the MU puzzle');
      expect(note.visibility).toBe('visible');
    });

    it('removeNote removes the note', () => {
      const { bookId, noteId } = seedBookWithNote();

      removeNote(bookId, noteId);

      expect(shelf.get()[bookId].notes).toHaveLength(0);
    });

    it.each([
      ['add', (bookId: string) => addNote(bookId, 'A delayed note')],
      ['update', (bookId: string, noteId: string) => updateNote(bookId, noteId, { text: 'A delayed edit' })],
      ['delete', (bookId: string, noteId: string) => removeNote(bookId, noteId)],
    ])('does not resurrect a deleted book when a stale %s note request fails', async (_operation, mutateNote) => {
      const { bookId, noteId } = seedBookWithNote();
      let releaseNoteFailure!: () => void;
      const noteFailure = new Promise<Response>((resolve) => {
        releaseNoteFailure = () => resolve({ ok: false, text: async () => 'note failed' } as Response);
      });
      const recoveryPosts: string[] = [];
      vi.mocked(fetch).mockImplementation(async (url, init) => {
        if (url === `/api/books/${bookId}` && init?.method === 'DELETE') {
          return { ok: true } as Response;
        }
        if (url === '/api/books?mine=true') {
          return { ok: true, json: async () => ({ books: [] }) } as Response;
        }
        if (url === '/api/books' && init?.method === 'POST') {
          recoveryPosts.push(String(url));
          return { ok: true } as Response;
        }
        return noteFailure;
      });

      mutateNote(bookId, noteId);
      await expect(removeBook(bookId)).resolves.toBe(true);
      expect(shelf.get()[bookId]).toBeUndefined();

      releaseNoteFailure();
      await vi.waitFor(() => {
        expect(vi.mocked(reportSyncError)).toHaveBeenCalled();
      });

      expect(shelf.get()[bookId]).toBeUndefined();
      await loadBooksFromServer();
      expect(shelf.get()[bookId]).toBeUndefined();
      expect(recoveryPosts).toEqual([]);
    });
  });
});
