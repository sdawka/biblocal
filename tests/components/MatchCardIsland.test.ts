import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import MatchCardIsland from '../../src/components/MatchCardIsland.svelte';
import type { Match, UserProfile } from '../../src/lib/types';

function makeUser(overrides: Partial<UserProfile>): UserProfile {
  return {
    id: 'u1',
    name: 'Jane Reader',
    city: 'Montreal',
    radiusKm: 10,
    topics: { curated: [], freeform: [], inferred: [] },
    ...overrides,
  };
}

function makeMatch(overrides: Partial<UserProfile>, extra: Partial<Match> = {}): Match {
  return {
    user: makeUser(overrides),
    facets: {
      shelfTwin: { count: 3, items: ['Crime and Punishment'] },
      readingMentor: { count: 0, items: [] },
      localSource: { count: 1, items: ['Dune'] },
      discussionMatch: { count: 0, items: [] },
    },
    totalScore: 4,
    ...extra,
  };
}

describe('MatchCardIsland', () => {
  it('shows a prominent distance for a person match', () => {
    const match = makeMatch({ id: 'jane', name: 'Jane Reader', type: 'person' }, { distanceKm: 2.4 });
    render(MatchCardIsland, { props: { match } });
    expect(screen.getByText('2.4 km')).toBeTruthy();
  });

  it('shows a "why you match" summary of the top facets for a person match', () => {
    const match = makeMatch({ id: 'jane', name: 'Jane Reader', type: 'person' }, { distanceKm: 2.4 });
    render(MatchCardIsland, { props: { match } });
    // Top facet (shelfTwin, count 3) should appear in the summary line.
    expect(screen.getByText(/shelf twin/i)).toBeTruthy();
  });

  it('shows a Connect button for a person match', () => {
    const match = makeMatch({ id: 'jane', name: 'Jane Reader', type: 'person' }, { distanceKm: 2.4 });
    render(MatchCardIsland, { props: { match } });
    expect(screen.getByRole('button', { name: /request to connect/i })).toBeTruthy();
  });

  it('shows specialties and a /store/ link for a bookstore, with no Connect button', () => {
    const match = makeMatch(
      {
        id: 'bobs-books',
        name: "Bob's Books",
        type: 'bookstore',
        specialties: ['Sci-Fi', 'Mystery', 'Poetry', 'History', 'Kids'],
        address: '123 Main St',
      },
      { distanceKm: 1.1 }
    );
    render(MatchCardIsland, { props: { match } });

    expect(screen.getByText('Sci-Fi')).toBeTruthy();
    expect(screen.getByText('Mystery')).toBeTruthy();
    expect(screen.getByText('+1')).toBeTruthy(); // 5 specialties, cap at 4

    const storeLink = screen.getByRole('link', { name: /view store details/i });
    expect(storeLink).toBeTruthy();
    expect(storeLink.getAttribute('href')).toBe('/store/bobs-books');

    expect(screen.queryByRole('button', { name: /connect/i })).toBeNull();
  });

  it('does not show a why-match line for a bookstore card', () => {
    const match = makeMatch(
      { id: 'bobs-books', name: "Bob's Books", type: 'bookstore' },
      { distanceKm: 1.1 }
    );
    render(MatchCardIsland, { props: { match } });
    expect(screen.queryByText(/shelf twin/i)).toBeNull();
  });
});
