import { describe, it, expect, beforeEach } from 'vitest';
import { shelf } from '../../src/stores/shelf';
import { profile, DEFAULT_PROFILE } from '../../src/stores/profile';
import { seedUsers } from '../../src/stores/users';
import { matches, discovery } from '../../src/stores/matches';
import type { UserProfile } from '../../src/lib/types';

function otherUserWithTopic(topic: string): UserProfile {
  return {
    id: 'other-user',
    name: 'Other Reader',
    city: 'Somewhere',
    radiusKm: 5,
    topics: { curated: [topic], freeform: [], inferred: [] },
  };
}

describe('freeform topics produce discussion matches', () => {
  beforeEach(() => {
    shelf.set({});
    profile.set(DEFAULT_PROFILE);
    seedUsers.set([]);
  });

  it('a freeform-only topic yields a discussionMatch facet in `matches`', () => {
    // Keep the computed store active so it recomputes on dependency changes.
    const unsub = matches.subscribe(() => {});

    seedUsers.set([otherUserWithTopic('Existentialism')]);
    profile.set({
      ...DEFAULT_PROFILE,
      id: 'me',
      name: 'Me',
      city: 'Here',
      topics: { curated: [], freeform: ['Existentialism'], inferred: [] },
    });

    const result = matches.get();
    expect(result).toHaveLength(1);
    expect(result[0].facets.discussionMatch.count).toBe(1);
    expect(result[0].facets.discussionMatch.items).toContain('Existentialism');

    unsub();
  });

  it('a freeform-only topic yields a discussionMatch facet in `discovery`', () => {
    const unsub = discovery.subscribe(() => {});

    seedUsers.set([otherUserWithTopic('Cybernetics')]);
    profile.set({
      ...DEFAULT_PROFILE,
      id: 'me',
      name: 'Me',
      city: 'Here',
      topics: { curated: [], freeform: ['Cybernetics'], inferred: [] },
    });

    const result = discovery.get();
    const match = result.find((m) => m.user.id === 'other-user');
    expect(match).toBeDefined();
    expect(match!.facets.discussionMatch.count).toBe(1);
    expect(match!.facets.discussionMatch.items).toContain('Cybernetics');

    unsub();
  });
});
