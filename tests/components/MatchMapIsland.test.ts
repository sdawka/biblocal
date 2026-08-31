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

  it('calls onPanelChange when a toggle button is clicked', async () => {
    let selected: string | null = null;
    render(LocalPanel, {
      props: { ...baseProps(), onPanelChange: (p: string) => (selected = p) },
    });
    await fireEvent.click(screen.getByRole('tab', { name: /^bookstores$/i }));
    expect(selected).toBe('bookstores');
  });

  it('shows the in-view count', () => {
    render(LocalPanel, { props: { ...baseProps(), inViewCount: 3 } });
    expect(screen.getByText(/3 in view/i)).toBeTruthy();
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
    expect(screen.getByText(/no people in view/i)).toBeTruthy();
  });

  it('shows a per-panel empty message when the bookstores list is empty', () => {
    render(LocalPanel, {
      props: { ...baseProps(), panel: 'bookstores', storesInView: [], inViewCount: 0 },
    });
    expect(screen.getByText(/no bookstores in view/i)).toBeTruthy();
  });

  it('shows a per-panel empty message when there are no books in view', () => {
    render(LocalPanel, {
      props: { ...baseProps(), panel: 'books', bookGroups: [], inViewCount: 0 },
    });
    expect(screen.getByText(/no books in view/i)).toBeTruthy();
  });

  it('calls onOwner when a book row owner action is used', async () => {
    let ownerId: string | null = null;
    render(LocalPanel, {
      props: { ...baseProps(), panel: 'books', onOwner: (id: string) => (ownerId = id) },
    });
    await fireEvent.click(screen.getByText('Dune'));
    await fireEvent.click(screen.getByRole('button', { name: /see jane reader nearby/i }));
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
