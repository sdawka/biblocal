import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import MatchMapIsland from '../../src/components/MatchMapIsland.svelte';
import { profile } from '../../src/stores/profile';
import { shelf } from '../../src/stores/shelf';
import { discoveryUsers, discoveryUsersLoaded, usersError, usersLoading } from '../../src/stores/users';
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
  let priorShelf: ReturnType<typeof shelf.get>;
  let priorDiscoveryUsers: ReturnType<typeof discoveryUsers.get>;
  let priorDiscoveryLoaded: boolean;
  let priorUsersLoading: boolean;
  let priorUsersError: ReturnType<typeof usersError.get>;
  let priorMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    priorProfile = profile.get();
    priorShelf = shelf.get();
    priorDiscoveryUsers = discoveryUsers.get();
    priorDiscoveryLoaded = discoveryUsersLoaded.get();
    priorUsersLoading = usersLoading.get();
    priorUsersError = usersError.get();
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
    shelf.set({});
    discoveryUsers.set([
      makeRemoteReader('tokyo-reader', 'Yuki', 'Tokyo', 35.6762, 139.6503),
      makeRemoteReader('paris-reader', 'Ana', 'Paris', 48.8566, 2.3522),
    ]);
    discoveryUsersLoaded.set(true);
    usersLoading.set(false);
    usersError.set(null);
  });

  afterEach(() => {
    profile.set(priorProfile);
    shelf.set(priorShelf);
    discoveryUsers.set(priorDiscoveryUsers);
    discoveryUsersLoaded.set(priorDiscoveryLoaded);
    usersLoading.set(priorUsersLoading);
    usersError.set(priorUsersError);
    window.matchMedia = priorMatchMedia;
  });

  it('does not call global discovery results Nearby when the profile has no coordinates', async () => {
    render(MatchMapIsland, { props: { lang: 'en' } });

    await waitFor(() => {
      expect(screen.getByText("Yuki's book")).toBeTruthy();
    });

    expect(screen.queryByText('2 Nearby')).toBeNull();
  });
});
