import { describe, it, expect, beforeEach } from 'vitest';
import { shelf } from '../../src/stores/shelf';
import { profile, DEFAULT_PROFILE } from '../../src/stores/profile';
import { discoveryUsers } from '../../src/stores/users';
import { discovery, discoveryBooks, discoveryScope } from '../../src/stores/matches';

beforeEach(() => {
  shelf.set({});
  profile.set(DEFAULT_PROFILE);
  discoveryUsers.set([]);
  discoveryScope.set('local');
});

it('is empty with no discovery users', () => {
  expect(discoveryBooks.get()).toEqual([]);
});

it('surfaces a nearby sharable book as a LocalBook row', () => {
  discoveryScope.set('worldwide');
  discoveryUsers.set([
    {
      id: 'bob', name: 'Bob', city: 'X', radiusKm: 10,
      topics: { curated: [], freeform: [], inferred: [] },
      shelf: [
        { id: 'd', title: 'Dune', author: 'H', visibility: 'visible', ownership: 'have', intents: ['borrowable'], addedVia: 'manual', addedAt: 0 },
      ],
    },
  ]);
  const rows = discoveryBooks.get();
  expect(rows).toHaveLength(1);
  expect(rows[0].book.title).toBe('Dune');
  expect(rows[0].owner.id).toBe('bob');
});

it('keeps local discovery within the saved city and radius until worldwide is selected', () => {
  profile.set({
    ...DEFAULT_PROFILE,
    id: 'me',
    city: 'Montreal',
    radiusKm: 8,
    latitude: 45.5017,
    longitude: -73.5673,
  });
  discoveryUsers.set([
    {
      id: 'nearby', name: 'Nearby', city: 'Montreal', radiusKm: 10,
      latitude: 45.52, longitude: -73.58,
      topics: { curated: [], freeform: [], inferred: [] },
      shelf: [{ id: 'near', title: 'Near book', author: 'A', visibility: 'visible', ownership: 'have', intents: ['borrowable'], addedVia: 'manual', addedAt: 0 }],
    },
    {
      id: 'remote', name: 'Remote', city: 'Tokyo', radiusKm: 10,
      latitude: 35.6762, longitude: 139.6503,
      topics: { curated: [], freeform: [], inferred: [] },
      shelf: [{ id: 'remote-book', title: 'Remote book', author: 'A', visibility: 'visible', ownership: 'have', intents: ['borrowable'], addedVia: 'manual', addedAt: 0 }],
    },
  ]);

  expect(discovery.get().map((match) => match.user.id)).toEqual(['nearby']);
  expect(discoveryBooks.get().map((row) => row.book.title)).toEqual(['Near book']);

  discoveryScope.set('worldwide');
  expect(discovery.get().map((match) => match.user.id)).toEqual(['nearby', 'remote']);
  expect(discoveryBooks.get().map((row) => row.book.title)).toEqual(['Near book', 'Remote book']);
});
