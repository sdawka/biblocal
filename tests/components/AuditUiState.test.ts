import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/svelte';
import BookDetailSheet from '../../src/components/BookDetailSheet.svelte';

const authState = vi.hoisted(() => ({ userId: 'audit-user' as string | null }));

vi.mock('../../src/stores/auth', () => ({
  currentUserId: {
    get: () => authState.userId,
    subscribe: (listener: (userId: string | null) => void) => {
      listener(authState.userId);
      return () => {};
    },
  },
}));

import ProfileIsland from '../../src/components/ProfileIsland.svelte';
import SyncErrorToast from '../../src/components/SyncErrorToast.svelte';
import { profile, updateProfile } from '../../src/stores/profile';
import { clearSyncError } from '../../src/stores/sync-status';
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
  beforeEach(async () => {
    authState.userId = null;
    await updateProfile({});
    authState.userId = 'audit-user';
    await updateProfile({});
    clearSyncError();
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

  it('does not announce a failed profile update as saved and keeps its editable draft', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, text: async () => 'offline' } as Response);
    render(ProfileIsland, { props: { lang: 'en' } });
    render(SyncErrorToast, { props: { lang: 'en' } });

    await fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const name = screen.getByLabelText('Name');
    expect((name as HTMLInputElement).maxLength).toBe(120);
    await fireEvent.input(name, { target: { value: 'Grace Hopper' } });
    await fireEvent.blur(name);

    await waitFor(() => {
      expect(profile.get().name).toBe('Ada Lovelace');
    });
    expect(screen.queryByText('Saved')).toBeNull();
    expect((name as HTMLInputElement).value).toBe('Grace Hopper');
    expect(screen.getByRole('alert').textContent).toContain('Could not save your change. Please try again.');
  });

  it('announces saved only after the latest profile request succeeds', async () => {
    let resolveSave!: (response: Response) => void;
    vi.mocked(fetch).mockImplementationOnce(() => new Promise<Response>((resolve) => {
      resolveSave = resolve;
    }));
    render(ProfileIsland, { props: { lang: 'en' } });

    await fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const name = screen.getByLabelText('Name');
    await fireEvent.input(name, { target: { value: 'Grace Hopper' } });
    await fireEvent.blur(name);

    expect(screen.queryByText('Saved')).toBeNull();

    resolveSave({ ok: true, text: async () => '' } as Response);

    await waitFor(() => {
      expect(screen.getByText('Saved')).toBeTruthy();
    });
  });

  it('waits for contact persistence before announcing saved', async () => {
    let resolveSave!: (response: Response) => void;
    vi.mocked(fetch).mockImplementationOnce(() => new Promise<Response>((resolve) => {
      resolveSave = resolve;
    }));
    render(ProfileIsland, { props: { lang: 'en' } });

    await fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await fireEvent.change(screen.getByLabelText('How can people reach you?'), { target: { value: 'email' } });
    const value = screen.getByLabelText('Email address');
    await fireEvent.input(value, { target: { value: 'grace@example.com' } });
    await fireEvent.blur(value);

    expect(screen.queryByText('Saved')).toBeNull();

    resolveSave({ ok: true, text: async () => '' } as Response);
    await waitFor(() => {
      expect(screen.getByText('Saved')).toBeTruthy();
    });
  });

  it('waits for a newer save when an older request succeeds first', async () => {
    let resolveFirst!: (response: Response) => void;
    let resolveSecond!: (response: Response) => void;
    vi.mocked(fetch)
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveFirst = resolve; }))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveSecond = resolve; }));
    render(ProfileIsland, { props: { lang: 'en' } });

    await fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const name = screen.getByLabelText('Name');
    await fireEvent.input(name, { target: { value: 'Grace Hopper' } });
    await fireEvent.blur(name);
    await fireEvent.focus(name);
    await fireEvent.input(name, { target: { value: 'Grace Brewster Murray Hopper' } });
    await fireEvent.blur(name);

    resolveFirst({ ok: true, text: async () => '' } as Response);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(screen.queryByText('Saved')).toBeNull();

    resolveSecond({ ok: true, text: async () => '' } as Response);
    await waitFor(() => {
      expect(screen.getByText('Saved')).toBeTruthy();
    });
  });

  it('does not announce an older save after the draft changes again', async () => {
    let resolveSave!: (response: Response) => void;
    vi.mocked(fetch).mockImplementationOnce(() => new Promise<Response>((resolve) => {
      resolveSave = resolve;
    }));
    render(ProfileIsland, { props: { lang: 'en' } });

    await fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const name = screen.getByLabelText('Name');
    await fireEvent.input(name, { target: { value: 'Grace Hopper' } });
    await fireEvent.blur(name);
    await fireEvent.input(name, { target: { value: 'Grace Brewster Murray Hopper' } });

    resolveSave({ ok: true, text: async () => '' } as Response);
    await Promise.resolve();

    expect(screen.queryByText('Saved')).toBeNull();
  });

  it('keeps the draft open when Done is pressed before a save fails', async () => {
    let resolveSave!: (response: Response) => void;
    vi.mocked(fetch).mockImplementationOnce(() => new Promise<Response>((resolve) => {
      resolveSave = resolve;
    }));
    render(ProfileIsland, { props: { lang: 'en' } });
    render(SyncErrorToast, { props: { lang: 'en' } });

    await fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const name = screen.getByLabelText('Name');
    await fireEvent.input(name, { target: { value: 'Grace Hopper' } });
    await fireEvent.blur(name);
    await fireEvent.click(screen.getByRole('button', { name: 'Done' }));

    expect(screen.getByText('Edit Profile')).toBeTruthy();

    resolveSave({ ok: false, text: async () => 'offline' } as Response);
    await waitFor(() => {
      expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Grace Hopper');
      expect(screen.getByRole('alert').textContent).toContain('Could not save your change. Please try again.');
    });
    expect(screen.getByText('Edit Profile')).toBeTruthy();
  });

  it('closes after Done only when its pending save succeeds', async () => {
    let resolveSave!: (response: Response) => void;
    vi.mocked(fetch).mockImplementationOnce(() => new Promise<Response>((resolve) => {
      resolveSave = resolve;
    }));
    render(ProfileIsland, { props: { lang: 'en' } });

    await fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const name = screen.getByLabelText('Name');
    await fireEvent.input(name, { target: { value: 'Grace Hopper' } });
    await fireEvent.blur(name);
    await fireEvent.click(screen.getByRole('button', { name: 'Done' }));

    expect(screen.getByText('Edit Profile')).toBeTruthy();

    resolveSave({ ok: true, text: async () => '' } as Response);
    await waitFor(() => {
      expect(screen.queryByText('Edit Profile')).toBeNull();
    });
  });

  it('persists the full draft before Done closes after an earlier profile save fails', async () => {
    let resolveProfile!: (response: Response) => void;
    let resolveFinal!: (response: Response) => void;
    vi.mocked(fetch)
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveProfile = resolve; }))
      .mockResolvedValueOnce({ ok: true, text: async () => '' } as Response)
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveFinal = resolve; }));
    render(ProfileIsland, { props: { lang: 'en' } });

    await fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const name = screen.getByLabelText('Name');
    await fireEvent.input(name, { target: { value: 'Grace Hopper' } });
    await fireEvent.blur(name);

    resolveProfile({ ok: false, text: async () => 'offline' } as Response);
    await waitFor(() => expect(profile.get().name).toBe('Ada Lovelace'));

    await fireEvent.change(screen.getByLabelText('How can people reach you?'), { target: { value: 'email' } });
    const contact = screen.getByLabelText('Email address');
    await fireEvent.input(contact, { target: { value: 'grace@example.com' } });
    await fireEvent.blur(contact);
    await waitFor(() => expect(screen.getByText('Saved')).toBeTruthy());

    await fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
    expect(screen.getByText('Edit Profile')).toBeTruthy();

    resolveFinal({ ok: true, text: async () => '' } as Response);
    await waitFor(() => {
      expect(screen.queryByText('Edit Profile')).toBeNull();
      expect(profile.get().name).toBe('Grace Hopper');
    });
  });
});
