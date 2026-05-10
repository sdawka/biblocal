import { describe, it, expect } from 'vitest';
import { calculateMatches } from '../../src/lib/matching';
import type { Book, UserProfile, BookStatus } from '../../src/lib/types';

function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: 'book-' + Math.random().toString(36).slice(2),
    title: 'Test Book',
    author: 'Test Author',
    status: 'visible' as BookStatus,
    addedVia: 'manual',
    addedAt: Date.now(),
    ...overrides,
  };
}

function makeUser(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'user-' + Math.random().toString(36).slice(2),
    name: 'Test User',
    city: 'Test City',
    radiusKm: 5,
    topics: { curated: [], freeform: [], inferred: [] },
    ...overrides,
  };
}

describe('calculateMatches', () => {
  describe('shelfTwin facet', () => {
    it('finds shared books by ISBN', () => {
      const myBooks = [
        makeBook({ isbn: '123', title: 'Shared Book' }),
        makeBook({ isbn: '456', title: 'Only Mine' }),
      ];

      const otherUser = makeUser({
        shelf: [
          makeBook({ isbn: '123', title: 'Shared Book' }),
          makeBook({ isbn: '789', title: 'Only Theirs' }),
        ],
      });

      const matches = calculateMatches(myBooks, [], [otherUser]);

      expect(matches).toHaveLength(1);
      expect(matches[0].facets.shelfTwin.count).toBe(1);
      expect(matches[0].facets.shelfTwin.items).toContain('Shared Book');
    });

    it('counts multiple shared books', () => {
      const myBooks = [
        makeBook({ isbn: '111', title: 'Book A' }),
        makeBook({ isbn: '222', title: 'Book B' }),
        makeBook({ isbn: '333', title: 'Book C' }),
      ];

      const otherUser = makeUser({
        shelf: [
          makeBook({ isbn: '111', title: 'Book A' }),
          makeBook({ isbn: '222', title: 'Book B' }),
        ],
      });

      const matches = calculateMatches(myBooks, [], [otherUser]);

      expect(matches[0].facets.shelfTwin.count).toBe(2);
    });
  });

  describe('readingMentor facet', () => {
    it('finds users who have books I seek and can discuss/lend', () => {
      const myBooks = [
        makeBook({ isbn: '123', status: 'seeking-home', title: 'Want This' }),
      ];

      const mentor = makeUser({
        shelf: [
          makeBook({ isbn: '123', status: 'discussable', title: 'Want This' }),
        ],
      });

      const matches = calculateMatches(myBooks, [], [mentor]);

      expect(matches).toHaveLength(1);
      expect(matches[0].facets.readingMentor.count).toBe(1);
    });

    it('includes borrowable books', () => {
      const myBooks = [
        makeBook({ isbn: '123', status: 'seeking-home' }),
      ];

      const lender = makeUser({
        shelf: [
          makeBook({ isbn: '123', status: 'borrowable' }),
        ],
      });

      const matches = calculateMatches(myBooks, [], [lender]);

      expect(matches[0].facets.readingMentor.count).toBe(1);
    });

    it('excludes private books from readingMentor', () => {
      const myBooks = [
        makeBook({ isbn: '123', status: 'seeking-home' }),
      ];

      const hoarder = makeUser({
        shelf: [
          makeBook({ isbn: '123', status: 'private' }),
        ],
      });

      const matches = calculateMatches(myBooks, [], [hoarder]);

      // Still matches as shelfTwin (both have same ISBN)
      // but NOT as readingMentor (private books can't be discussed/borrowed)
      expect(matches).toHaveLength(1);
      expect(matches[0].facets.readingMentor.count).toBe(0);
      expect(matches[0].facets.shelfTwin.count).toBe(1);
    });
  });

  describe('localSource facet', () => {
    it('finds borrowable books I seek', () => {
      const myBooks = [
        makeBook({ isbn: '123', status: 'seeking-home', title: 'Need This' }),
      ];

      const lender = makeUser({
        shelf: [
          makeBook({ isbn: '123', status: 'borrowable', title: 'Need This' }),
        ],
      });

      const matches = calculateMatches(myBooks, [], [lender]);

      expect(matches[0].facets.localSource.count).toBe(1);
      expect(matches[0].facets.localSource.items).toContain('Need This');
    });
  });

  describe('discussionMatch facet', () => {
    it('finds shared topics', () => {
      const myTopics = ['Fiction', 'History', 'Science'];

      const kindred = makeUser({
        topics: {
          curated: ['Fiction', 'History'],
          freeform: [],
          inferred: ['Philosophy'],
        },
      });

      const matches = calculateMatches([], myTopics, [kindred]);

      expect(matches).toHaveLength(1);
      expect(matches[0].facets.discussionMatch.count).toBe(2);
      expect(matches[0].facets.discussionMatch.items).toContain('Fiction');
      expect(matches[0].facets.discussionMatch.items).toContain('History');
    });

    it('includes inferred topics', () => {
      const myTopics = ['Russian Literature'];

      const reader = makeUser({
        topics: {
          curated: [],
          freeform: [],
          inferred: ['Russian Literature'],
        },
      });

      const matches = calculateMatches([], myTopics, [reader]);

      expect(matches[0].facets.discussionMatch.count).toBe(1);
    });
  });

  describe('classChain facet', () => {
    it('finds shared class resources', () => {
      const myBooks = [
        makeBook({ isbn: '123', status: 'class-resource', title: 'Textbook' }),
      ];

      const classmate = makeUser({
        shelf: [
          makeBook({ isbn: '123', status: 'class-resource', title: 'Textbook' }),
        ],
      });

      const matches = calculateMatches(myBooks, [], [classmate]);

      expect(matches[0].facets.classChain.count).toBe(1);
    });

    it('finds users who have my class resources', () => {
      const myBooks = [
        makeBook({ isbn: '123', status: 'class-resource', title: 'Textbook' }),
      ];

      const hasBook = makeUser({
        shelf: [
          makeBook({ isbn: '123', status: 'visible', title: 'Textbook' }),
        ],
      });

      const matches = calculateMatches(myBooks, [], [hasBook]);

      expect(matches[0].facets.classChain.count).toBe(1);
    });
  });

  describe('scoring', () => {
    it('weights shelfTwin highest (3x)', () => {
      const books = [makeBook({ isbn: '123' })];

      const twin = makeUser({
        shelf: [makeBook({ isbn: '123' })],
      });

      const matches = calculateMatches(books, [], [twin]);

      expect(matches[0].totalScore).toBe(3);
    });

    it('sorts matches by score descending', () => {
      const myBooks = [
        makeBook({ isbn: '111' }),
        makeBook({ isbn: '222' }),
        makeBook({ isbn: '333' }),
      ];

      const lowMatch = makeUser({
        name: 'Low',
        shelf: [makeBook({ isbn: '111' })],
      });

      const highMatch = makeUser({
        name: 'High',
        shelf: [
          makeBook({ isbn: '111' }),
          makeBook({ isbn: '222' }),
          makeBook({ isbn: '333' }),
        ],
      });

      const matches = calculateMatches(myBooks, [], [lowMatch, highMatch]);

      expect(matches[0].user.name).toBe('High');
      expect(matches[1].user.name).toBe('Low');
    });
  });

  describe('filtering', () => {
    it('excludes users with no matches', () => {
      const myBooks = [makeBook({ isbn: '123' })];

      const stranger = makeUser({
        shelf: [makeBook({ isbn: '999' })],
        topics: { curated: ['Unrelated'], freeform: [], inferred: [] },
      });

      const matches = calculateMatches(myBooks, ['Fiction'], [stranger]);

      expect(matches).toHaveLength(0);
    });

    it('handles users with empty shelves', () => {
      const myBooks = [makeBook({ isbn: '123' })];

      const empty = makeUser({ shelf: [] });

      const matches = calculateMatches(myBooks, [], [empty]);

      expect(matches).toHaveLength(0);
    });

    it('handles users with undefined shelf', () => {
      const myBooks = [makeBook({ isbn: '123' })];

      const noShelf = makeUser();
      delete (noShelf as Partial<UserProfile>).shelf;

      const matches = calculateMatches(myBooks, [], [noShelf]);

      expect(matches).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('handles books without ISBNs', () => {
      const myBooks = [makeBook({ title: 'No ISBN Book' })];

      const other = makeUser({
        shelf: [makeBook({ title: 'No ISBN Book' })],
      });

      const matches = calculateMatches(myBooks, [], [other]);

      // Can't match without ISBN
      expect(matches).toHaveLength(0);
    });

    it('handles empty inputs', () => {
      const matches = calculateMatches([], [], []);
      expect(matches).toEqual([]);
    });

    it('handles many users', () => {
      const myBooks = [makeBook({ isbn: '123' })];

      const users = Array.from({ length: 100 }, (_, i) =>
        makeUser({
          name: `User ${i}`,
          shelf: i % 2 === 0 ? [makeBook({ isbn: '123' })] : [],
        })
      );

      const matches = calculateMatches(myBooks, [], users);

      expect(matches).toHaveLength(50);
    });
  });
});
