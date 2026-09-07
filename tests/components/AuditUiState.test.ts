import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/svelte';
import BookDetailSheet from '../../src/components/BookDetailSheet.svelte';

vi.mock('../../src/stores/auth', () => ({
  currentUserId: { get: () => 'audit-user' },
}));

import ProfileIsland from '../../src/components/ProfileIsland.svelte';
import { profile } from '../../src/stores/profile';
import type { Book } from '../../src/lib/types';

function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: 'audit-book',
    title: 'Audit Book',
    author: 'Audit Author',
    visibility: 'visible',
    ownership: 'have',
    intents: [],
    addedVia: 'manual',
    addedAt: 1,
    ...overrides,
  };
}

describe('UI state audit', () => {
  beforeEach(() => {
    profile.set({
      id: 'audit-user',
      name: 'Ada Lovelace',
      city: 'Toronto',
      radiusKm: 5,
      topics: { curated: [], freeform: [], inferred: [] },
    });
  });

  it('restores the invoking control after Escape dismisses an idle detail sheet', async () => {
    const opener = document.createElement('button');
    opener.textContent = 'Open audit book';
    document.body.append(opener);
    opener.focus();
    const onClose = vi.fn();

    const sheet = render(BookDetailSheet, {
      props: { book: makeBook(), lang: 'en', onClose },
    });

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }));
    await fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    sheet.unmount();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it('does not announce a failed profile update as saved', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, text: async () => 'offline' } as Response);
    render(ProfileIsland, { props: { lang: 'en' } });

    await fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const name = screen.getByLabelText('Name');
    await fireEvent.input(name, { target: { value: 'Grace Hopper' } });
    await fireEvent.blur(name);

    await waitFor(() => {
      expect(profile.get().name).toBe('Ada Lovelace');
    });
    expect(screen.queryByText('Saved')).toBeNull();
  });
});
