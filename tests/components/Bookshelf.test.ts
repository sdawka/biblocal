/**
 * Component tests for Bookshelf: the single orchestrator island that folds
 * the empty/adding/populated Biblio states into one shelf frame with a
 * trailing "+" slot that expands AddBookIsland in place.
 *
 * Follows the render/reset pattern in ShelfIsland.test.ts.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';

// Must mock auth BEFORE any import that transitively pulls in shelf
vi.mock('../../src/stores/auth', () => ({
  currentUserId: { get: () => 'test-user-123' },
}));
vi.mock('../../src/stores/topics', () => ({
  inferTopicsFromSubjects: (subjects: string[]) => subjects.slice(0, 3),
}));
vi.mock('../../src/stores/sync-status', () => ({
  reportSyncError: vi.fn(),
}));

import { vi } from 'vitest';
import Bookshelf from '../../src/components/Bookshelf.svelte';
import { shelf, shelfHydrated } from '../../src/stores/shelf';

beforeEach(() => {
  shelf.set({});
  // Simulate a load that has already settled, so these tests exercise the
  // real empty state (not the loading skeleton) unless a test says otherwise.
  shelfHydrated.set(true);
  vi.mocked(fetch).mockImplementation(async () =>
    ({ ok: true, json: async () => ({}) } as unknown as Response)
  );
});

describe('Bookshelf', () => {
  it('shows an add slot on an empty, hydrated shelf', () => {
    render(Bookshelf, { props: { lang: 'en' } });
    expect(screen.getByRole('button', { name: /add.*book/i })).toBeTruthy();
  });

  it('expands the add form when the slot is clicked', async () => {
    render(Bookshelf, { props: { lang: 'en' } });
    await fireEvent.click(screen.getByRole('button', { name: /add.*book/i }));
    // AddBookIsland renders an ISBN input
    expect(screen.getByPlaceholderText(/isbn/i)).toBeTruthy();
  });

  it('shows an Explore nearby link on the empty, hydrated shelf', () => {
    render(Bookshelf, { props: { lang: 'en' } });
    const link = screen.getByRole('link', { name: /explore nearby/i });
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toContain('/local');
  });

  it('keeps the Explore nearby link in the active locale', () => {
    render(Bookshelf, { props: { lang: 'es' } });
    const link = screen.getByRole('link', { name: /explorar cerca/i });

    expect(link.getAttribute('href')).toBe('/es/local');
  });

  it('hides the Explore nearby link while adding a book', async () => {
    render(Bookshelf, { props: { lang: 'en' } });
    await fireEvent.click(screen.getByRole('button', { name: /add.*book/i }));
    expect(screen.queryByRole('link', { name: /explore nearby/i })).toBeNull();
  });

  describe('loading skeleton', () => {
    it('shows a loading skeleton (not the empty-state CTA) while the shelf has not hydrated yet', () => {
      shelfHydrated.set(false);
      const { container } = render(Bookshelf, { props: { lang: 'en' } });

      expect(container.querySelector('.skeleton-shelf')).toBeTruthy();
      expect(container.querySelectorAll('.skeleton-spine').length).toBeGreaterThan(0);
      expect(screen.queryByRole('button', { name: /add.*book/i })).toBeNull();
      expect(screen.queryByRole('link', { name: /explore nearby/i })).toBeNull();
    });

    it('shows the real empty state once hydration settles with no books', async () => {
      shelfHydrated.set(false);
      const { container, rerender } = render(Bookshelf, { props: { lang: 'en' } });
      expect(container.querySelector('.skeleton-shelf')).toBeTruthy();

      shelfHydrated.set(true);
      await rerender({ lang: 'en' });

      expect(container.querySelector('.skeleton-shelf')).toBeNull();
      expect(screen.getByRole('button', { name: /add.*book/i })).toBeTruthy();
    });

    it('does not show the skeleton when the shelf already has books at startup, even before hydration settles', () => {
      // Mirrors a returning user: localStorage seeded the shelf synchronously
      // before shelfHydrated had a chance to be set true by the network load.
      shelfHydrated.set(false);
      shelf.set({
        'b1': {
          id: 'b1',
          title: 'Dune',
          author: 'Frank Herbert',
          visibility: 'visible',
          ownership: 'have',
          intents: [],
          addedVia: 'manual',
          addedAt: Date.now(),
        },
      });
      const { container } = render(Bookshelf, { props: { lang: 'en' } });

      expect(container.querySelector('.skeleton-shelf')).toBeNull();
    });
  });
});
