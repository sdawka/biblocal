import { describe, it, expect, vi, beforeEach } from 'vitest';

// Must mock auth before importing shelf
vi.mock('../../src/stores/auth', () => ({
  currentUserId: { get: () => 'test-user-123' },
}));

vi.mock('../../src/stores/topics', () => ({
  inferTopicsFromSubjects: (subjects: string[]) => subjects.slice(0, 3),
}));

import {
  shelf,
  activeFilter,
  addBook,
  updateBook,
  updateBookStatus,
  removeBook,
  getBookCount,
  getShelfStats,
  getInferredTopics,
} from '../../src/stores/shelf';
import type { BookStatus } from '../../src/lib/types';

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

      updateBook(book.id, { title: 'Updated Title', notes: 'Great read!' });

      const updated = shelf.get()[book.id];
      expect(updated.title).toBe('Updated Title');
      expect(updated.notes).toBe('Great read!');
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
    it('removes book from shelf', () => {
      const book = addBook({
        title: 'To Remove',
        author: 'Author',
        status: 'private' as BookStatus,
        addedVia: 'manual',
      });

      expect(shelf.get()[book.id]).toBeDefined();

      removeBook(book.id);

      expect(shelf.get()[book.id]).toBeUndefined();
    });

    it('syncs deletion to server', () => {
      const book = addBook({
        title: 'Test',
        author: 'Author',
        status: 'private' as BookStatus,
        addedVia: 'manual',
      });

      vi.clearAllMocks();
      removeBook(book.id);

      expect(fetch).toHaveBeenCalledWith(`/api/books/${book.id}`, { method: 'DELETE' });
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
});
