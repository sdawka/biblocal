import { computed } from 'nanostores';
import { shelf } from './shelf';
import { profile } from './profile';
import { seedUsers } from './users';
import { calculateMatches, calculateDiscovery } from '../lib/matching';
import { pivotToBooks } from '../lib/discoveryBooks';
import type { Match, LocalBook } from '../lib/types';

export const matches = computed(
  [shelf, profile, seedUsers],
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

// Broader than `matches`: also includes people sharing books with no taste
// overlap, and people without a location. Powers the discovery map.
export const discovery = computed(
  [shelf, profile, seedUsers],
  (shelfData, profileData, users): Match[] => {
    const myBooks = Object.values(shelfData);
    const myTopics = [
      ...(profileData.topics?.curated ?? []),
      ...(profileData.topics?.inferred ?? []),
      ...(profileData.topics?.freeform ?? []),
    ];

    return calculateDiscovery(myBooks, myTopics, users);
  }
);

// Book-first view of discovery: existing person-keyed matches pivoted into one
// row per (sharable book x intent). Powers the Local page's Books feed.
export const discoveryBooks = computed(discovery, (m: Match[]): LocalBook[] =>
  pivotToBooks(m),
);
