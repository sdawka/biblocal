import { describe, it, expect } from 'vitest';
import { pivotToBooks, groupByIntent } from '../../src/lib/discoveryBooks';
import type { Book, Match, UserProfile } from '../../src/lib/types';

function book(partial: Partial<Book> & Pick<Book, 'title'>): Book {
  return {
    id: partial.id ?? partial.title,
    title: partial.title,
    author: partial.author ?? 'A',
    visibility: partial.visibility ?? 'visible',
    ownership: partial.ownership ?? 'have',
    intents: partial.intents ?? ['borrowable'],
    addedVia: 'manual',
    addedAt: 0,
    ...partial,
  };
}

function user(id: string, shelf: Book[], extra: Partial<UserProfile> = {}): UserProfile {
  return { id, name: id, city: 'X', radiusKm: 10, topics: { curated: [], freeform: [], inferred: [] }, shelf, ...extra };
}

const emptyFacets = {
  shelfTwin: { count: 0, items: [] as string[] },
  readingMentor: { count: 0, items: [] as string[] },
  localSource: { count: 0, items: [] as string[] },
  discussionMatch: { count: 0, items: [] as string[] },
};

it('emits one row per (sharable book x intent)', () => {
  const u = user('bob', [book({ title: 'Dune', intents: ['borrowable', 'giftable'] })]);
  const rows = pivotToBooks([{ user: u, facets: emptyFacets, totalScore: 0 }]);
  expect(rows.map((r) => r.intent).sort()).toEqual(['borrowable', 'giftable']);
});

it('excludes private and seeking books', () => {
  const u = user('bob', [
    book({ title: 'Secret', visibility: 'private' }),
    book({ title: 'Wanted', ownership: 'seeking' }),
    book({ title: 'Dune' }),
  ]);
  const rows = pivotToBooks([{ user: u, facets: emptyFacets, totalScore: 0 }]);
  expect(rows.map((r) => r.book.title)).toEqual(['Dune']);
});

it('orders taste-fit first, then distance', () => {
  const far = user('far', [book({ title: 'A' })]);
  const near = user('near', [book({ title: 'B' })]);
  const rows = pivotToBooks([
    { user: far, facets: emptyFacets, totalScore: 6, distanceKm: 9 },
    { user: near, facets: emptyFacets, totalScore: 0, distanceKm: 1 },
  ]);
  expect(rows[0].book.title).toBe('A'); // higher tasteScore wins over distance
});

it('cold-start (all taste 0) falls back to distance order', () => {
  const far = user('far', [book({ title: 'A' })]);
  const near = user('near', [book({ title: 'B' })]);
  const rows = pivotToBooks([
    { user: far, facets: emptyFacets, totalScore: 0, distanceKm: 9 },
    { user: near, facets: emptyFacets, totalScore: 0, distanceKm: 1 },
  ]);
  expect(rows[0].book.title).toBe('B');
});

it('flags isTasteMatch when title is in a facet', () => {
  const u = user('bob', [book({ title: 'Dune' })]);
  const facets = { ...emptyFacets, shelfTwin: { count: 1, items: ['Dune'] } };
  const rows = pivotToBooks([{ user: u, facets, totalScore: 3 }]);
  expect(rows[0].isTasteMatch).toBe(true);
});

it('keeps a distinct row per owner for the same title', () => {
  const a = user('a', [book({ title: 'Dune' })]);
  const b = user('b', [book({ title: 'Dune' })]);
  const rows = pivotToBooks([
    { user: a, facets: emptyFacets, totalScore: 0, distanceKm: 5 },
    { user: b, facets: emptyFacets, totalScore: 0, distanceKm: 2 },
  ]);
  expect(rows).toHaveLength(2);
  expect(rows[0].owner.id).toBe('b'); // nearer owner first
});

it('groupByIntent returns fixed order and drops empty groups', () => {
  const u = user('bob', [book({ title: 'Dune', intents: ['borrowable', 'giftable'] })]);
  const groups = groupByIntent(pivotToBooks([{ user: u, facets: emptyFacets, totalScore: 0 }]));
  expect(groups.map((g) => g.intent)).toEqual(['borrowable', 'giftable']);
});

it('handles equal taste + both distances undefined without NaN', () => {
  const a = user('a', [book({ title: 'A' })]);
  const b = user('b', [book({ title: 'B' })]);
  // Both matches have no distanceKm and taste 0 — comparator must not return NaN.
  const rows = pivotToBooks([
    { user: a, facets: emptyFacets, totalScore: 0 },
    { user: b, facets: emptyFacets, totalScore: 0 },
  ]);
  expect(rows).toHaveLength(2);
  expect(rows.map((r) => r.book.title).sort()).toEqual(['A', 'B']);
});
