import { atom, computed } from 'nanostores';
import { shelf } from './shelf';
import { profile } from './profile';
import { discoveryUsers } from './users';
import { currentUserId } from './auth';
import { calculateMatches, calculateDiscovery } from '../lib/matching';
import { pivotToBooks } from '../lib/discoveryBooks';
import { resolveDiscoveryLocation } from '../lib/localHub';
import type { Match, LocalBook } from '../lib/types';

export const matches = computed(
  [shelf, profile, discoveryUsers],
  (shelfData, profileData, users): Match[] => {
    const myBooks = Object.values(shelfData);
    const myTopics = [
      ...(profileData.topics?.curated ?? []),
      ...(profileData.topics?.inferred ?? []),
      ...(profileData.topics?.freeform ?? []),
    ];

    return calculateMatches(myBooks, myTopics, users);
  }
);

export const hasMatches = computed(matches, (m) => m.length > 0);

export type DiscoveryScope = 'local' | 'worldwide';

// Local is the deliberate default. The map island exposes worldwide as an
// explicit choice; an incomplete profile must not silently widen this feed.
export const discoveryScope = atom<DiscoveryScope>('local');

// Scope is a reader preference for the current session only. Never let a
// previous reader's explicit worldwide browse leak across an auth boundary.
let scopeUserId = currentUserId.get();
currentUserId.subscribe((userId) => {
  if (userId === scopeUserId) return;
  scopeUserId = userId;
  discoveryScope.set('local');
});

// Broader than `matches`: also includes people sharing books with no taste
// overlap, and people without a location. Powers the discovery map.
export const discovery = computed(
  [shelf, profile, discoveryUsers, discoveryScope],
  (shelfData, profileData, users, scope): Match[] => {
    const myBooks = Object.values(shelfData);
    const myTopics = [
      ...(profileData.topics?.curated ?? []),
      ...(profileData.topics?.inferred ?? []),
      ...(profileData.topics?.freeform ?? []),
    ];

    if (scope === 'worldwide') {
      return calculateDiscovery(myBooks, myTopics, users);
    }

    const location = resolveDiscoveryLocation(profileData);
    if (!location) return [];
    return calculateDiscovery(myBooks, myTopics, users, location);
  }
);

// Book-first view of discovery: existing person-keyed matches pivoted into one
// row per (sharable book x intent). Powers the Local page's Books feed.
export const discoveryBooks = computed(discovery, (m: Match[]): LocalBook[] =>
  pivotToBooks(m),
);
