import { describe, it, expect } from 'vitest';
import { calculateMatches, calculateDiscovery } from '../../src/lib/matching';
import type { Book, UserProfile, BookVisibility, BookOwnership, BookIntent } from '../../src/lib/types';

function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: 'book-' + Math.random().toString(36).slice(2),
    title: 'Test Book',
    author: 'Test Author',
    visibility: 'visible' as BookVisibility,
    ownership: 'have' as BookOwnership,
    intents: [] as BookIntent[],
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
    it('only matches owner offers compatible with a seeking book intention', () => {
      const myBooks = [
        makeBook({ isbn: '123', ownership: 'seeking', intents: ['giftable'] }),
      ];
      const owner = makeUser({
        shelf: [
          makeBook({ isbn: '123', ownership: 'have', intents: ['borrowable'], title: 'Lend only' }),
          makeBook({ isbn: '123', ownership: 'have', intents: ['giftable'], title: 'Give only' }),
        ],
      });

      const matches = calculateMatches(myBooks, [], [owner]);

      expect(matches[0].facets.readingMentor.count).toBe(0);
      expect(matches[0].facets.localSource.items).toEqual(['Give only']);
    });

    it('keeps broad matching for a seeking book with no intentions', () => {
      const myBooks = [makeBook({ isbn: '123', ownership: 'seeking', intents: [] })];
      const owner = makeUser({
        shelf: [makeBook({ isbn: '123', ownership: 'have', intents: ['borrowable'] })],
      });

      const matches = calculateMatches(myBooks, [], [owner]);

      expect(matches[0].facets.readingMentor.count).toBe(1);
      expect(matches[0].facets.localSource.count).toBe(1);
    });

    it('finds users who have books I seek and can discuss/lend', () => {
      const myBooks = [
        makeBook({ isbn: '123', ownership: 'seeking', title: 'Want This' }),
      ];

      const mentor = makeUser({
        shelf: [
          makeBook({ isbn: '123', ownership: 'have', intents: ['discussable'], title: 'Want This' }),
        ],
      });

      const matches = calculateMatches(myBooks, [], [mentor]);

      expect(matches).toHaveLength(1);
      expect(matches[0].facets.readingMentor.count).toBe(1);
    });

    it('includes borrowable books', () => {
      const myBooks = [
        makeBook({ isbn: '123', ownership: 'seeking' }),
      ];

      const lender = makeUser({
        shelf: [
          makeBook({ isbn: '123', ownership: 'have', intents: ['borrowable'] }),
        ],
      });

      const matches = calculateMatches(myBooks, [], [lender]);

      expect(matches[0].facets.readingMentor.count).toBe(1);
    });

    it('excludes private books from readingMentor', () => {
      const myBooks = [
        makeBook({ isbn: '123', ownership: 'seeking' }),
      ];

      const hoarder = makeUser({
        shelf: [
          makeBook({ isbn: '123', ownership: 'have', visibility: 'private', intents: [] }),
        ],
      });

      const matches = calculateMatches(myBooks, [], [hoarder]);

      // No match because seeking books don't match with have books for shelfTwin,
      // and no intents means no readingMentor match
      expect(matches).toHaveLength(0);
    });
  });

  describe('localSource facet', () => {
    it('finds borrowable books I seek', () => {
      const myBooks = [
        makeBook({ isbn: '123', ownership: 'seeking', title: 'Need This' }),
      ];

      const lender = makeUser({
        shelf: [
          makeBook({ isbn: '123', ownership: 'have', intents: ['borrowable'], title: 'Need This' }),
        ],
      });

      const matches = calculateMatches(myBooks, [], [lender]);

      expect(matches[0].facets.localSource.count).toBe(1);
      expect(matches[0].facets.localSource.items).toContain('Need This');
    });

    it('finds giftable books I seek', () => {
      const myBooks = [
        makeBook({ isbn: '123', ownership: 'seeking', title: 'Need This' }),
      ];

      const gifter = makeUser({
        shelf: [
          makeBook({ isbn: '123', ownership: 'have', intents: ['giftable'], title: 'Need This' }),
        ],
      });

      const matches = calculateMatches(myBooks, [], [gifter]);

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

  describe('private book exclusion', () => {
    it('excludes private books from shelfTwin matching', () => {
      const myBooks = [
        makeBook({ isbn: '123', title: 'Visible Book', visibility: 'visible' }),
        makeBook({ isbn: '456', title: 'Private Book', visibility: 'private' }),
      ];

      const otherUser = makeUser({
        shelf: [
          makeBook({ isbn: '123', title: 'Visible Book', visibility: 'visible' }),
          makeBook({ isbn: '456', title: 'Private Book', visibility: 'visible' }),
        ],
      });

      const matches = calculateMatches(myBooks, [], [otherUser]);

      expect(matches).toHaveLength(1);
      expect(matches[0].facets.shelfTwin.count).toBe(1);
      expect(matches[0].facets.shelfTwin.items).toContain('Visible Book');
      expect(matches[0].facets.shelfTwin.items).not.toContain('Private Book');
    });

    it('excludes other users private books from shelfTwin matching', () => {
      const myBooks = [
        makeBook({ isbn: '123', title: 'Book A', visibility: 'visible' }),
        makeBook({ isbn: '456', title: 'Book B', visibility: 'visible' }),
      ];

      const otherUser = makeUser({
        shelf: [
          makeBook({ isbn: '123', title: 'Book A', visibility: 'visible' }),
          makeBook({ isbn: '456', title: 'Book B', visibility: 'private' }),
        ],
      });

      const matches = calculateMatches(myBooks, [], [otherUser]);

      expect(matches).toHaveLength(1);
      expect(matches[0].facets.shelfTwin.count).toBe(1);
      expect(matches[0].facets.shelfTwin.items).toContain('Book A');
      expect(matches[0].facets.shelfTwin.items).not.toContain('Book B');
    });

    it('excludes private books from readingMentor matching', () => {
      const myBooks = [
        makeBook({ isbn: '123', ownership: 'seeking', visibility: 'visible' }),
        makeBook({ isbn: '456', ownership: 'seeking', visibility: 'private' }),
      ];

      const mentor = makeUser({
        shelf: [
          makeBook({ isbn: '123', ownership: 'have', intents: ['discussable'], title: 'Visible Seek', visibility: 'visible' }),
          makeBook({ isbn: '456', ownership: 'have', intents: ['discussable'], title: 'Private Seek', visibility: 'visible' }),
        ],
      });

      const matches = calculateMatches(myBooks, [], [mentor]);

      expect(matches).toHaveLength(1);
      expect(matches[0].facets.readingMentor.count).toBe(1);
      expect(matches[0].facets.readingMentor.items).toContain('Visible Seek');
      expect(matches[0].facets.readingMentor.items).not.toContain('Private Seek');
    });

    it('excludes other users private books from readingMentor results', () => {
      const myBooks = [
        makeBook({ isbn: '123', ownership: 'seeking', visibility: 'visible' }),
      ];

      const mentor = makeUser({
        shelf: [
          makeBook({ isbn: '123', ownership: 'have', intents: ['discussable'], title: 'Secret Book', visibility: 'private' }),
        ],
      });

      const matches = calculateMatches(myBooks, [], [mentor]);

      expect(matches).toHaveLength(0);
    });

    it('excludes private books from localSource matching', () => {
      const myBooks = [
        makeBook({ isbn: '123', ownership: 'seeking', visibility: 'visible' }),
      ];

      const lender = makeUser({
        shelf: [
          makeBook({ isbn: '123', ownership: 'have', intents: ['borrowable'], title: 'Hidden Gem', visibility: 'private' }),
        ],
      });

      const matches = calculateMatches(myBooks, [], [lender]);

      expect(matches).toHaveLength(0);
    });

    it('excludes my private seeking books from localSource matching', () => {
      const myBooks = [
        makeBook({ isbn: '123', ownership: 'seeking', visibility: 'private', title: 'Secret Want' }),
      ];

      const lender = makeUser({
        shelf: [
          makeBook({ isbn: '123', ownership: 'have', intents: ['borrowable'], title: 'Available Book', visibility: 'visible' }),
        ],
      });

      const matches = calculateMatches(myBooks, [], [lender]);

      expect(matches).toHaveLength(0);
    });

    it('does not leak private book titles in match results', () => {
      const myBooks = [
        makeBook({ isbn: '111', title: 'My Visible', visibility: 'visible' }),
      ];

      const otherUser = makeUser({
        shelf: [
          makeBook({ isbn: '111', title: 'Their Visible', visibility: 'visible' }),
          makeBook({ isbn: '222', title: 'Their Secret', visibility: 'private' }),
        ],
      });

      const matches = calculateMatches(myBooks, [], [otherUser]);

      const allItems = [
        ...matches[0].facets.shelfTwin.items,
        ...matches[0].facets.readingMentor.items,
        ...matches[0].facets.localSource.items,
      ];

      expect(allItems).not.toContain('Their Secret');
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

describe('calculateDiscovery', () => {
  it('includes a sharer with no location and no taste overlap', () => {
    const sharer = makeUser({
      name: 'Location-less Sharer',
      latitude: undefined,
      longitude: undefined,
      shelf: [
        makeBook({ isbn: '999', title: 'Lend Me', intents: ['borrowable'] }),
      ],
    });

    const result = calculateDiscovery([], [], [sharer]);

    expect(result).toHaveLength(1);
    expect(result[0].offering?.count).toBe(1);
    expect(result[0].offering?.items).toContain('Lend Me');
    expect(result[0].totalScore).toBe(0);
  });

  it('excludes people with nothing to share and no match', () => {
    const lurker = makeUser({
      name: 'Lurker',
      shelf: [
        makeBook({ title: 'On Shelf Only', intents: [] }),
        makeBook({ title: 'Private', visibility: 'private', intents: ['borrowable'] }),
        makeBook({ title: 'Wanted', ownership: 'seeking', intents: ['borrowable'] }),
      ],
    });

    expect(calculateDiscovery([], [], [lurker])).toHaveLength(0);
  });

  it('still ranks taste matches above pure sharers', () => {
    const myBooks = [makeBook({ isbn: 'shared', title: 'Common' })];
    const twin = makeUser({
      name: 'Twin',
      shelf: [makeBook({ isbn: 'shared', title: 'Common' })],
    });
    const sharer = makeUser({
      name: 'Just Sharing',
      shelf: [makeBook({ isbn: 'x', title: 'Free Book', intents: ['giftable'] })],
    });

    const result = calculateDiscovery(myBooks, [], [sharer, twin]);

    expect(result).toHaveLength(2);
    expect(result[0].user.name).toBe('Twin');
  });
});
