/**
 * Component tests for LocalDiscovery: the book-first Local page island with
 * a Books/People/Map view switcher. Books (default) renders the grouped,
 * taste-ordered feed from discoveryBooks; People reuses MatchCardIsland.
 *
 * Follows the render/reset pattern in Bookshelf.test.ts.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import LocalDiscovery from '../../src/components/LocalDiscovery.svelte';
import { shelf } from '../../src/stores/shelf';
import { seedUsers } from '../../src/stores/users';

beforeEach(() => {
  shelf.set({});
  seedUsers.set([
    {
      id: 'bob',
      name: 'Bob',
      city: 'X',
      radiusKm: 10,
      topics: { curated: [], freeform: [], inferred: [] },
      shelf: [
        {
          id: 'd',
          title: 'Dune',
          author: 'H',
          visibility: 'visible',
          ownership: 'have',
          intents: ['borrowable'],
          addedVia: 'manual',
          addedAt: 0,
        },
      ],
    },
  ]);
});

describe('LocalDiscovery', () => {
  it('defaults to the Books view and lists a nearby book', () => {
    render(LocalDiscovery, { props: { lang: 'en' } });
    expect(screen.getByText('Dune')).toBeTruthy();
    expect(screen.getByText('To borrow')).toBeTruthy();
  });

  it('switches to the People view', async () => {
    render(LocalDiscovery, { props: { lang: 'en' } });
    await fireEvent.click(screen.getByRole('tab', { name: /people/i }));
    expect(screen.getByText('Bob')).toBeTruthy();
  });
});
