import { describe, it, expect, beforeEach } from 'vitest';
import { shelf } from '../../src/stores/shelf';
import { profile, DEFAULT_PROFILE } from '../../src/stores/profile';
import { discoveryUsers } from '../../src/stores/users';
import { discoveryBooks } from '../../src/stores/matches';

beforeEach(() => {
  shelf.set({});
  profile.set(DEFAULT_PROFILE);
  discoveryUsers.set([]);
});

it('is empty with no discovery users', () => {
  expect(discoveryBooks.get()).toEqual([]);
});

it('surfaces a nearby sharable book as a LocalBook row', () => {
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
