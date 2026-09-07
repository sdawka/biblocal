import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import MatchCardIsland from '../../src/components/MatchCardIsland.svelte';
import MatchMapIsland from '../../src/components/MatchMapIsland.svelte';
import { currentUserId } from '../../src/stores/auth';
import { connectionRequests } from '../../src/stores/connections';
import { profile } from '../../src/stores/profile';
import { shelf } from '../../src/stores/shelf';
import { discoveryUsers, discoveryUsersLoaded, usersError, usersLoading } from '../../src/stores/users';
import type { Match, UserProfile } from '../../src/lib/types';

const requesterId = 'audit-requester';
const recipientId = 'audit-recipient';

const onRequestMatch: Match = {
  user: {
    id: recipientId,
    name: 'On Request Reader',
    city: 'Toronto',
    radiusKm: 5,
    topics: { curated: [], freeform: [], inferred: [] },
    contactVisibility: 'on-request',
  },
  facets: {
    shelfTwin: { count: 1, items: ['Dune'] },
    readingMentor: { count: 0, items: [] },
    localSource: { count: 0, items: [] },
    discussionMatch: { count: 0, items: [] },
  },
  totalScore: 1,
};

describe('accepted on-request contact audit', () => {
  let priorUserId: string | null;
  let priorConnections: ReturnType<typeof connectionRequests.get>;
  let priorProfile: ReturnType<typeof profile.get>;
  let priorShelf: ReturnType<typeof shelf.get>;
  let priorDiscoveryUsers: ReturnType<typeof discoveryUsers.get>;
  let priorDiscoveryLoaded: boolean;
  let priorUsersLoading: boolean;
  let priorUsersError: ReturnType<typeof usersError.get>;
  let priorMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    priorUserId = currentUserId.get();
    priorConnections = connectionRequests.get();
    priorProfile = profile.get();
    priorShelf = shelf.get();
    priorDiscoveryUsers = discoveryUsers.get();
    priorDiscoveryLoaded = discoveryUsersLoaded.get();
    priorUsersLoading = usersLoading.get();
    priorUsersError = usersError.get();
    priorMatchMedia = window.matchMedia;
    currentUserId.set(requesterId);
    connectionRequests.set([{
      id: 'accepted-request',
      fromUserId: requesterId,
      toUserId: recipientId,
      status: 'accepted',
      createdAt: 1,
      respondedAt: 2,
    }]);
  });

  afterEach(() => {
    currentUserId.set(priorUserId);
    connectionRequests.set(priorConnections);
    profile.set(priorProfile);
    shelf.set(priorShelf);
    discoveryUsers.set(priorDiscoveryUsers);
    discoveryUsersLoaded.set(priorDiscoveryLoaded);
    usersLoading.set(priorUsersLoading);
    usersError.set(priorUsersError);
    window.matchMedia = priorMatchMedia;
    vi.mocked(fetch).mockImplementation(() => Promise.resolve({
      ok: true,
      json: async () => ({}),
    } as Response));
  });

  it('gives an accepted requester an actionable contact route for an on-request contact', () => {
    render(MatchCardIsland, { props: { match: onRequestMatch, expanded: true } });

    const usableContactPath =
      screen.queryByRole('link', { name: /contact/i }) ??
      screen.queryByRole('button', { name: /contact/i });
    expect(usableContactPath).toBeTruthy();

    if (usableContactPath?.tagName === 'A') {
      expect((usableContactPath as HTMLAnchorElement).getAttribute('href')).toMatch(/\S/);
      expect((usableContactPath as HTMLAnchorElement).getAttribute('href')).not.toBe('#');
    } else if (usableContactPath?.tagName === 'BUTTON') {
      expect((usableContactPath as HTMLButtonElement).disabled).toBe(false);
    }
  });

  it('shows an already accepted local connection as connected after the Local hub mounts', async () => {
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
    connectionRequests.set([]);
    profile.set({
      id: requesterId,
      name: 'Requester',
      city: 'Toronto',
      radiusKm: 5,
      topics: { curated: [], freeform: [], inferred: [] },
    });
    shelf.set({});
    const localRecipient: UserProfile = {
      ...onRequestMatch.user,
      latitude: 43.6532,
      longitude: -79.3832,
      shelf: [{
        id: 'recipient-book',
        title: 'Contact Book',
        author: 'Recipient',
        visibility: 'visible',
        ownership: 'have',
        intents: ['borrowable'],
        addedVia: 'manual',
        addedAt: 1,
      }],
    };
    discoveryUsers.set([localRecipient]);
    discoveryUsersLoaded.set(true);
    usersLoading.set(false);
    usersError.set(null);
    vi.mocked(fetch).mockImplementation(async (url: string | URL | Request) => {
      if (String(url) === '/api/connections') {
        return {
          ok: true,
          json: async () => ({
            connections: [{
              id: 'accepted-request',
              fromUserId: requesterId,
              toUserId: recipientId,
              status: 'accepted',
              createdAt: 1,
              respondedAt: 2,
            }],
          }),
        } as Response;
      }
      throw new Error(`Unexpected request: ${String(url)}`);
    });

    render(MatchMapIsland, { props: { lang: 'en' } });
    await fireEvent.click(screen.getByRole('tab', { name: 'People' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Connected' })).toBeTruthy();
    });
  });
});
