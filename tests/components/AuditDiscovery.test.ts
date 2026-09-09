import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import MatchMapIsland from '../../src/components/MatchMapIsland.svelte';
import { profile, profileHydrated } from '../../src/stores/profile';
import { shelf } from '../../src/stores/shelf';
import { discoveryUsers, discoveryUsersLoaded, usersError, usersLoading } from '../../src/stores/users';
import { discoveryScope } from '../../src/stores/matches';
import type { UserProfile } from '../../src/lib/types';

function makeRemoteReader(id: string, name: string, city: string, latitude: number, longitude: number): UserProfile {
  return {
    id,
    name,
    city,
    latitude,
    longitude,
    radiusKm: 5,
    topics: { curated: [], freeform: [], inferred: [] },
    shelf: [{
      id: `${id}-book`,
      title: `${name}'s book`,
      author: 'A. Reader',
      visibility: 'visible',
      ownership: 'have',
      intents: ['borrowable'],
      addedVia: 'manual',
      addedAt: 1,
    }],
  };
}

describe('discovery scope audit', () => {
  let priorProfile: ReturnType<typeof profile.get>;
  let priorProfileHydrated: boolean;
  let priorShelf: ReturnType<typeof shelf.get>;
  let priorDiscoveryUsers: ReturnType<typeof discoveryUsers.get>;
  let priorDiscoveryLoaded: boolean;
  let priorUsersLoading: boolean;
  let priorUsersError: ReturnType<typeof usersError.get>;
  let priorDiscoveryScope: ReturnType<typeof discoveryScope.get>;
  let priorMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    priorProfile = profile.get();
    priorProfileHydrated = profileHydrated.get();
    priorShelf = shelf.get();
    priorDiscoveryUsers = discoveryUsers.get();
    priorDiscoveryLoaded = discoveryUsersLoaded.get();
    priorUsersLoading = usersLoading.get();
    priorUsersError = usersError.get();
    priorDiscoveryScope = discoveryScope.get();
    priorMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(max-width: 900px)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    profile.set({
      id: 'audit-reader',
      name: 'Montreal Reader',
      city: 'Montreal',
      radiusKm: 5,
      topics: { curated: [], freeform: [], inferred: [] },
    });
    profileHydrated.set(true);
    shelf.set({});
    discoveryUsers.set([
      makeRemoteReader('tokyo-reader', 'Yuki', 'Tokyo', 35.6762, 139.6503),
      makeRemoteReader('paris-reader', 'Ana', 'Paris', 48.8566, 2.3522),
    ]);
    discoveryUsersLoaded.set(true);
    usersLoading.set(false);
    usersError.set(null);
    discoveryScope.set('local');
  });

  afterEach(() => {
    profile.set(priorProfile);
    profileHydrated.set(priorProfileHydrated);
    shelf.set(priorShelf);
    discoveryUsers.set(priorDiscoveryUsers);
    discoveryUsersLoaded.set(priorDiscoveryLoaded);
    usersLoading.set(priorUsersLoading);
    usersError.set(priorUsersError);
    discoveryScope.set(priorDiscoveryScope);
    window.matchMedia = priorMatchMedia;
  });

  it('uses the profile city as an explicit approximate local scope when coordinates are absent', async () => {
    render(MatchMapIsland, { props: { lang: 'en' } });

    await waitFor(() => {
      expect(screen.getByText('Within 5 km of Montreal (approximate)')).toBeTruthy();
    });

    expect(screen.queryByText("Yuki's book")).toBeNull();
    expect(screen.getByLabelText('0 Within 5 km of Montreal (approximate)')).toBeTruthy();
  });

  it('recreates the map after toggling an unconfigured local profile through worldwide', async () => {
    profile.set({
      id: 'audit-reader',
      name: 'No Location Reader',
      city: '',
      radiusKm: 5,
      topics: { curated: [], freeform: [], inferred: [] },
    });
    const { container } = render(MatchMapIsland, { props: { lang: 'en' } });

    expect(container.querySelector('.map-container')).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Browse worldwide' }));
    await waitFor(() => expect(container.querySelector('.map-container')).toBeTruthy());
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(container.querySelector('.map-container')?.classList.contains('leaflet-container')).toBe(false);
    await fireEvent.click(screen.getByRole('button', { name: 'Map' }));
    await waitFor(() => expect(container.querySelector('.map-container')?.classList.contains('leaflet-container')).toBe(true));
    await fireEvent.click(screen.getByRole('button', { name: 'List' }));

    await fireEvent.click(screen.getByRole('button', { name: 'Show local results' }));
    await waitFor(() => expect(container.querySelector('.map-container')).toBeNull());

    await fireEvent.click(screen.getByRole('button', { name: 'Browse worldwide' }));
    await waitFor(() => expect(container.querySelector('.map-container')).toBeTruthy());
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(container.querySelector('.map-container')?.classList.contains('leaflet-container')).toBe(false);
    await fireEvent.click(screen.getByRole('button', { name: 'Map' }));
    await waitFor(() => expect(container.querySelector('.map-container')?.classList.contains('leaflet-container')).toBe(true));
  });

  it('keeps a book owner visible in the mobile People list after choosing worldwide', async () => {
    const { container } = render(MatchMapIsland, { props: { lang: 'en' } });

    await fireEvent.click(screen.getByRole('button', { name: 'Browse worldwide' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Yuki's book/ })).toBeTruthy();
    });
    await fireEvent.click(screen.getByRole('button', { name: /Yuki's book/ }));
    await fireEvent.click(screen.getByRole('button', { name: 'See Yuki', exact: true }));

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'People' }).getAttribute('aria-selected')).toBe('true');
      expect(container.querySelector('.cards-panel')?.classList.contains('mobile-hidden')).toBe(false);
      expect(screen.getByRole('heading', { name: 'Yuki' })).toBeTruthy();
    });
  });

  it('offers a search-specific reset instead of map-panning advice', async () => {
    render(MatchMapIsland, { props: { lang: 'en' } });

    await fireEvent.click(screen.getByRole('button', { name: 'Browse worldwide' }));

    await waitFor(() => {
      expect(screen.getByText("Yuki's book")).toBeTruthy();
    });
    const search = screen.getByPlaceholderText('Search title, author, or name');
    await fireEvent.input(search, { target: { value: 'not a book' } });

    expect(screen.getByText('No results for this search.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Clear search' })).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect((search as HTMLInputElement).value).toBe('');
  });
});
