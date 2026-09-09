/**
 * Component tests for the map hub's panel: a Books/People/Bookstores toggle,
 * proximity-sorted and filtered to the current map viewport.
 *
 * MatchMapIsland itself can't mount under jsdom — Leaflet throws
 * ("Map has no maxZoom specified") because jsdom has no real layout/canvas —
 * so this exercises the extracted LocalPanel subcomponent directly, which owns
 * all of the panel DOM/toggle/list logic that MatchMapIsland wires up to the
 * map + viewBounds.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import LocalPanel from '../../src/components/LocalPanel.svelte';
import { groupByIntent } from '../../src/lib/discoveryBooks';
import type { LocalBook, Match, UserProfile } from '../../src/lib/types';

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

function makeMatch(overrides: Partial<UserProfile>, distanceKm?: number): Match {
  return {
    user: makeUser(overrides),
    facets: {
      shelfTwin: { count: 0, items: [] },
      readingMentor: { count: 0, items: [] },
      localSource: { count: 0, items: [] },
      discussionMatch: { count: 0, items: [] },
    },
    totalScore: 0,
    distanceKm,
  };
}

function makeBook(owner: UserProfile, title: string, distanceKm?: number): LocalBook {
  return {
    book: {
      id: `${title}-id`,
      title,
      author: 'Some Author',
      visibility: 'visible',
      ownership: 'have',
      intents: ['borrowable'],
      addedVia: 'manual',
      addedAt: 0,
    },
    owner,
    intent: 'borrowable',
    distanceKm,
    tasteScore: 0,
    isTasteMatch: false,
  };
}

const person = makeMatch({ id: 'jane', name: 'Jane Reader', type: 'person' }, 2);
const store = makeMatch({ id: 'bob-books', name: "Bob's Books", type: 'bookstore' }, 5);

function baseProps() {
  const books = [makeBook(person.user, 'Dune', 2)];
  return {
    panel: 'people' as const,
    onPanelChange: () => {},
    query: '',
    onQueryChange: () => {},
    bookGroups: groupByIntent(books),
    bookGroupsUnlocated: groupByIntent([]),
    peopleInView: [person],
    peopleUnlocated: [] as Match[],
    storesInView: [store],
    storesUnlocated: [] as Match[],
    inViewCount: 1,
    scopeLabel: 'Within 5 km of Montreal',
    scopeMode: 'local' as const,
    onScopeChange: () => {},
    needsLocation: false,
    profileLoading: false,
    profileError: false,
    onRetry: () => {},
    expandedId: null,
    onToggle: () => {},
    onOwner: () => {},
    loading: false,
    error: null,
    hasAnyData: true,
    lang: 'en' as const,
  };
}

describe('LocalPanel', () => {
  it('renders the three-way toggle with People active by default', () => {
    render(LocalPanel, { props: baseProps() });
    expect(screen.getByRole('tab', { name: /^books$/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /^people$/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /^bookstores$/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /^people$/i }).getAttribute('aria-selected')).toBe('true');
  });

  it('shows the People list on the people panel', () => {
    render(LocalPanel, { props: baseProps() });
    expect(screen.getByText('Jane Reader')).toBeTruthy();
    expect(screen.queryByText("Bob's Books")).toBeNull();
  });

  it('shows the Bookstores list when the panel prop is bookstores', () => {
    render(LocalPanel, { props: { ...baseProps(), panel: 'bookstores' } });
    expect(screen.getByText("Bob's Books")).toBeTruthy();
    expect(screen.queryByText('Jane Reader')).toBeNull();
  });

  it('shows grouped books when the panel prop is books', () => {
    render(LocalPanel, { props: { ...baseProps(), panel: 'books' } });
    expect(screen.getByText('Dune')).toBeTruthy();
    expect(screen.getByText('To borrow')).toBeTruthy();
  });

  it('labels a zero-distance city-precision book owner as the same area', () => {
    const cityOwner = makeUser({ id: 'city-owner', locationPrecision: 'city' });
    const cityBook = makeBook(cityOwner, 'City Book', 0);
    render(LocalPanel, {
      props: {
        ...baseProps(),
        panel: 'books',
        bookGroups: groupByIntent([cityBook]),
      },
    });

    expect(screen.getByText((content, element) =>
      element?.classList.contains('owner') === true && content.includes('Same area')
    )).toBeTruthy();
    expect(screen.queryByText('0 m')).toBeNull();
  });

  it('calls onPanelChange when a toggle button is clicked', async () => {
    let selected: string | null = null;
    render(LocalPanel, {
      props: { ...baseProps(), onPanelChange: (p: string) => (selected = p) },
    });
    await fireEvent.click(screen.getByRole('tab', { name: /^bookstores$/i }));
    expect(selected).toBe('bookstores');
  });

  it('shows the result count within the active scope', () => {
    render(LocalPanel, { props: { ...baseProps(), inViewCount: 3 } });
    expect(screen.getByLabelText('3 Within 5 km of Montreal')).toBeTruthy();
  });

  it('labels the active local scope and lets readers explicitly browse worldwide', async () => {
    let scope: string | null = null;
    render(LocalPanel, {
      props: { ...baseProps(), onScopeChange: (next: string) => (scope = next) },
    });
    expect(screen.getByText('Within 5 km of Montreal')).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: /browse worldwide/i }));
    expect(scope).toBe('worldwide');
  });

  it('does not disguise a missing local source as worldwide', async () => {
    let scope: string | null = null;
    render(LocalPanel, {
      props: {
        ...baseProps(),
        scopeLabel: 'Add a city or location in your profile to browse locally.',
        onScopeChange: (next: string) => (scope = next),
        needsLocation: true,
        lang: 'fr',
      },
    });
    expect(screen.getByRole('link', { name: 'Modifier le profil' }).getAttribute('href')).toBe('/fr/profile');
    await fireEvent.click(screen.getByRole('button', { name: /explorer le monde entier/i }));
    expect(scope).toBe('worldwide');
  });

  it('keeps location setup and empty results hidden while the signed-in profile is loading', () => {
    render(LocalPanel, {
      props: {
        ...baseProps(),
        scopeLabel: 'Add a city or location in your profile to browse locally.',
        needsLocation: true,
        profileLoading: true,
        loading: false,
        hasAnyData: false,
        bookGroups: [],
      },
    });

    expect(screen.queryByText('Add a city or location in your profile to browse locally.')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Edit Profile' })).toBeNull();
    expect(screen.queryByLabelText(/Add a city or location/)).toBeNull();
    expect(screen.getAllByText(/finding what.?s nearby/i)).toHaveLength(2);
  });

  it('shows a retryable profile error instead of a missing-location prompt', async () => {
    let retried = false;
    render(LocalPanel, {
      props: {
        ...baseProps(),
        scopeLabel: 'Add a city or location in your profile to browse locally.',
        needsLocation: false,
        profileError: true,
        hasAnyData: false,
        bookGroups: [],
        onRetry: () => (retried = true),
      },
    });

    expect(screen.getByRole('alert').textContent).toContain("Couldn't load your profile. Try again.");
    expect(screen.queryByText('Add a city or location in your profile to browse locally.')).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retried).toBe(true);
  });

  it('keeps a profile retry available alongside cached discovery results', async () => {
    let retried = false;
    render(LocalPanel, {
      props: {
        ...baseProps(),
        profileError: true,
        onRetry: () => (retried = true),
      },
    });

    expect(screen.queryByLabelText(/Within 5 km of Montreal/)).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retried).toBe(true);
  });

  it('lets an explicit worldwide browse return to local scope', async () => {
    let scope: string | null = null;
    render(LocalPanel, {
      props: {
        ...baseProps(),
        scopeLabel: 'Worldwide',
        scopeMode: 'worldwide',
        onScopeChange: (next: string) => (scope = next),
      },
    });
    await fireEvent.click(screen.getByRole('button', { name: /show local results/i }));
    expect(scope).toBe('local');
  });

  it('still shows a person with no shared location under "Location not shared", even with viewport filtering active', () => {
    const unlocatedPerson = makeMatch({ id: 'no-loc', name: 'Ghost Reader', type: 'person' });
    render(LocalPanel, {
      props: {
        ...baseProps(),
        // The in-view bucket represents the map-viewport-filtered result —
        // the unlocated person never appears there once bounds are set.
        peopleInView: [person],
        peopleUnlocated: [unlocatedPerson],
      },
    });
    expect(screen.getByText('Jane Reader')).toBeTruthy();
    expect(screen.getByText('Ghost Reader')).toBeTruthy();
    expect(screen.getByText('Location not shared')).toBeTruthy();
  });

  it('still shows a book whose owner has no shared location under "Location not shared" in the Books panel', () => {
    const unlocatedOwner = makeUser({ id: 'no-loc-owner', name: 'Ghost Owner' });
    const unlocatedBook = makeBook(unlocatedOwner, 'Invisible Cities');
    render(LocalPanel, {
      props: {
        ...baseProps(),
        panel: 'books',
        bookGroupsUnlocated: groupByIntent([unlocatedBook]),
      },
    });
    expect(screen.getByText('Dune')).toBeTruthy();
    expect(screen.getByText('Invisible Cities')).toBeTruthy();
    expect(screen.getByText('Location not shared')).toBeTruthy();
  });

  it('shows a per-panel empty message when the people list is empty', () => {
    render(LocalPanel, { props: { ...baseProps(), peopleInView: [], inViewCount: 0 } });
    expect(screen.getByText(/no people in this area/i)).toBeTruthy();
  });

  it('shows a per-panel empty message when the bookstores list is empty', () => {
    render(LocalPanel, {
      props: { ...baseProps(), panel: 'bookstores', storesInView: [], inViewCount: 0 },
    });
    expect(screen.getByText(/no bookstores in this area/i)).toBeTruthy();
  });

  it('shows a per-panel empty message when there are no books in view', () => {
    render(LocalPanel, {
      props: { ...baseProps(), panel: 'books', bookGroups: [], inViewCount: 0 },
    });
    expect(screen.getByText(/no books in this area/i)).toBeTruthy();
  });

  it('calls onOwner when a book row owner action is used', async () => {
    let ownerId: string | null = null;
    render(LocalPanel, {
      props: { ...baseProps(), panel: 'books', onOwner: (id: string) => (ownerId = id) },
    });
    await fireEvent.click(screen.getByText('Dune'));
    await fireEvent.click(screen.getByRole('button', { name: /^see jane reader$/i }));
    expect(ownerId).toBe('jane');
  });

  it('renders a loading state before any data has arrived', () => {
    render(LocalPanel, { props: { ...baseProps(), loading: true, hasAnyData: false } });
    expect(screen.getByText(/finding what.?s nearby/i)).toBeTruthy();
  });

  it('renders an error state before any data has arrived', () => {
    render(LocalPanel, {
      props: { ...baseProps(), error: 'network down', hasAnyData: false, lang: 'es' },
    });
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('No se pudieron cargar las coincidencias cercanas.')).toBeTruthy();
    expect(screen.queryByText('network down')).toBeNull();
  });

  it('calls onQueryChange as the search input changes', async () => {
    let latest = '';
    render(LocalPanel, {
      props: { ...baseProps(), onQueryChange: (v: string) => (latest = v) },
    });
    const input = screen.getByPlaceholderText(/search title, author, or name/i);
    await fireEvent.input(input, { target: { value: 'dune' } });
    expect(latest).toBe('dune');
  });
});
