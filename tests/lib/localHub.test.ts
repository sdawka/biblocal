import { it, expect } from 'vitest';
import { isWithinBounds, splitDiscovery, sortByDistance, hasLocation, bookOwnerLocated } from '../../src/lib/localHub';
import type { Match, LocalBook, UserProfile } from '../../src/lib/types';

const bounds = { north: 46, south: 45, east: -73, west: -74 };

function user(id: string, extra: Partial<UserProfile> = {}): UserProfile {
  return { id, name: id, city: 'X', radiusKm: 10, topics: { curated: [], freeform: [], inferred: [] }, ...extra };
}
function match(id: string, extra: Partial<UserProfile> = {}, distanceKm?: number): Match {
  return { user: user(id, extra), facets: { shelfTwin: {count:0,items:[]}, readingMentor:{count:0,items:[]}, localSource:{count:0,items:[]}, discussionMatch:{count:0,items:[]} }, totalScore: 0, distanceKm };
}

it('isWithinBounds', () => {
  expect(isWithinBounds(45.5, -73.5, bounds)).toBe(true);
  expect(isWithinBounds(48, -73.5, bounds)).toBe(false);
  expect(isWithinBounds(45.5, -70, bounds)).toBe(false);
});

it('hasLocation', () => {
  expect(hasLocation(match('a', { latitude: 45, longitude: -73 }))).toBe(true);
  expect(hasLocation(match('b'))).toBe(false);
});

it('splitDiscovery separates bookstores from people', () => {
  const ms = [match('p1'), match('s1', { type: 'bookstore' }), match('p2')];
  const { people, stores } = splitDiscovery(ms);
  expect(people.map(m => m.user.id)).toEqual(['p1', 'p2']);
  expect(stores.map(m => m.user.id)).toEqual(['s1']);
});

it('sortByDistance ascending, undefined last, stable', () => {
  const out = sortByDistance([{ distanceKm: 5, id: 'a' }, { distanceKm: undefined, id: 'b' }, { distanceKm: 1, id: 'c' }] as any);
  expect(out.map((x: any) => x.id)).toEqual(['c', 'a', 'b']);
});

it('bookOwnerLocated respects owner coords + null bounds', () => {
  const row = { book: { title: 'T' }, owner: user('o', { latitude: 45.5, longitude: -73.5 }), intent: 'borrowable', tasteScore: 0, isTasteMatch: false } as unknown as LocalBook;
  expect(bookOwnerLocated(row, null)).toBe(true);
  expect(bookOwnerLocated(row, bounds)).toBe(true);
  const rowFar = { ...row, owner: user('o2', { latitude: 10, longitude: 10 }) } as LocalBook;
  expect(bookOwnerLocated(rowFar, bounds)).toBe(false);
});

it('isWithinBounds handles the antimeridian (wrapped bounds, west > east)', () => {
  const wrap = { north: 60, south: -60, east: -170, west: 170 };
  expect(isWithinBounds(35, 179, wrap)).toBe(true);   // just west of the date line
  expect(isWithinBounds(35, -179, wrap)).toBe(true);  // just east of the date line
  expect(isWithinBounds(35, 0, wrap)).toBe(false);    // opposite side of the globe
});

it('isWithinBounds normal (non-wrapped) bounds still work', () => {
  const b = { north: 46, south: 45, east: -73, west: -74 };
  expect(isWithinBounds(45.5, -73.5, b)).toBe(true);
  expect(isWithinBounds(45.5, 0, b)).toBe(false);
});
