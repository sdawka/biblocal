import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { tick } from 'svelte';

vi.mock('../../src/stores/auth', () => ({
  currentUserId: { get: () => 'test-user-123' },
}));
vi.mock('../../src/stores/topics', () => ({
  inferTopicsFromSubjects: (subjects: string[]) => subjects.slice(0, 3),
}));
vi.mock('../../src/stores/sync-status', () => ({ reportSyncError: vi.fn() }));

import FilterPopover from '../../src/components/FilterPopover.svelte';
import { activeFilters, shelf } from '../../src/stores/shelf';

type MobileMediaQuery = MediaQueryList & { setMatches: (matches: boolean) => void };

function installMobileMatchMedia(): MobileMediaQuery {
  let matches = true;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const mediaQuery = {
    get matches() { return matches; },
    media: '(max-width: 600px)',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn((type: string, listener: (event: MediaQueryListEvent) => void) => {
      if (type === 'change') listeners.add(listener);
    }),
    removeEventListener: vi.fn((type: string, listener: (event: MediaQueryListEvent) => void) => {
      if (type === 'change') listeners.delete(listener);
    }),
    dispatchEvent: vi.fn(),
    setMatches(next: boolean) {
      matches = next;
      const event = { matches, media: this.media } as MediaQueryListEvent;
      listeners.forEach((listener) => listener(event));
    },
  } as MobileMediaQuery;
  vi.mocked(window.matchMedia).mockImplementation(() => mediaQuery);
  return mediaQuery;
}

async function openMobileFilters() {
  const trigger = screen.getByRole('button', { name: /^Filters/ });
  trigger.focus();
  await fireEvent.click(trigger);
  return screen.findByRole('dialog', { name: 'Filter books' });
}

describe('FilterPopover mobile dialog', () => {
  beforeEach(() => {
    shelf.set({});
    activeFilters.set({ visibility: [], ownership: [], intents: [] });
    document.body.style.overflow = '';
    installMobileMatchMedia();
  });

  it('opens as a dialog, applies chips instantly, clears them, and Done restores trigger focus', async () => {
    render(FilterPopover, { props: { lang: 'en' } });
    const dialog = await openMobileFilters();

    const ownership = within(dialog).getByRole('group', { name: 'Filter by ownership' });
    const have = within(ownership).getByRole('button', { name: 'have' });
    await fireEvent.click(have);
    expect(have.getAttribute('aria-pressed')).toBe('true');
    expect(activeFilters.get().ownership).toEqual(['have']);

    await fireEvent.click(within(dialog).getByRole('button', { name: 'Clear filters' }));
    expect(activeFilters.get()).toEqual({ visibility: [], ownership: [], intents: [] });

    await fireEvent.click(within(dialog).getByRole('button', { name: 'Close filters' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const trigger = screen.getByRole('button', { name: /^Filters/ });
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it('closes with Escape and the scrim, restoring the previous body overflow each time', async () => {
    document.body.style.overflow = 'clip';
    render(FilterPopover, { props: { lang: 'en' } });

    await openMobileFilters();
    expect(document.body.style.overflow).toBe('hidden');
    await fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.body.style.overflow).toBe('clip');

    await openMobileFilters();
    await fireEvent.click(screen.getAllByRole('button', { name: 'Close filters' })[0]);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.body.style.overflow).toBe('clip');
  });

  it('cleans up the scroll lock on unmount and when its viewport stops being mobile', async () => {
    const mediaQuery = installMobileMatchMedia();
    document.body.style.overflow = 'scroll';
    const mounted = render(FilterPopover, { props: { lang: 'en' } });

    await openMobileFilters();
    expect(document.body.style.overflow).toBe('hidden');
    mediaQuery.setMatches(false);
    await tick();
    expect(document.body.style.overflow).toBe('scroll');

    mediaQuery.setMatches(true);
    await tick();
    expect(document.body.style.overflow).toBe('hidden');
    mounted.unmount();
    expect(document.body.style.overflow).toBe('scroll');
  });

  it('cycles Tab within the dialog after a chip mutation adds the Clear filters control', async () => {
    render(FilterPopover, { props: { lang: 'en' } });
    const dialog = await openMobileFilters();
    const ownership = within(dialog).getByRole('group', { name: 'Filter by ownership' });

    await fireEvent.click(within(ownership).getByRole('button', { name: 'have' }));
    const controls = within(dialog).getAllByRole('button');
    const first = controls[0];
    const last = within(dialog).getByRole('button', { name: 'Clear filters' });

    last.focus();
    await fireEvent.keyDown(window, { key: 'Tab' });
    expect(document.activeElement).toBe(first);

    first.focus();
    await fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('keeps its fixed modal controls reachable instead of fixed navigation while open', async () => {
    const header = document.createElement('header');
    header.style.position = 'fixed';
    header.style.zIndex = '100';
    const headerLink = document.createElement('button');
    headerLink.textContent = 'Header destination';
    header.append(headerLink);
    const tabbar = document.createElement('nav');
    tabbar.style.position = 'fixed';
    tabbar.style.zIndex = '90';
    const tabLink = document.createElement('button');
    tabLink.textContent = 'Tab destination';
    tabbar.append(tabLink);
    document.body.append(header, tabbar);

    render(FilterPopover, { props: { lang: 'en' } });
    const dialog = await openMobileFilters();

    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(window.getComputedStyle(dialog).position).toBe('fixed');
    expect(Number(window.getComputedStyle(dialog).zIndex)).toBeGreaterThan(Number(window.getComputedStyle(header).zIndex));
    expect(Number(window.getComputedStyle(dialog).zIndex)).toBeGreaterThan(Number(window.getComputedStyle(tabbar).zIndex));

    const firstControl = within(dialog).getAllByRole('button')[0];
    const lastControl = within(dialog).getAllByRole('button').at(-1)!;
    lastControl.focus();
    await fireEvent.keyDown(window, { key: 'Tab' });
    expect(document.activeElement).toBe(firstControl);
    expect(document.activeElement).not.toBe(headerLink);
    expect(document.activeElement).not.toBe(tabLink);
    header.remove();
    tabbar.remove();
  });
});
