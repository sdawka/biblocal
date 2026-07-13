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
import { shelf } from '../../src/stores/shelf';

beforeEach(() => {
  shelf.set({});
  vi.mocked(fetch).mockImplementation(async () =>
    ({ ok: true, json: async () => ({}) } as unknown as Response)
  );
});

describe('Bookshelf', () => {
  it('shows an add slot on an empty shelf', () => {
    render(Bookshelf, { props: { lang: 'en' } });
    expect(screen.getByRole('button', { name: /add.*book/i })).toBeTruthy();
  });

  it('expands the add form when the slot is clicked', async () => {
    render(Bookshelf, { props: { lang: 'en' } });
    await fireEvent.click(screen.getByRole('button', { name: /add.*book/i }));
    // AddBookIsland renders an ISBN input
    expect(screen.getByPlaceholderText(/isbn/i)).toBeTruthy();
  });
});
