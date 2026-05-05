import { computed } from 'nanostores';
import { shelf } from './shelf';
import { profile } from './profile';
import { seedUsers } from './users';
import { calculateMatches } from '../lib/matching';
import type { Match } from '../lib/types';

export const matches = computed(
  [shelf, profile, seedUsers],
  (shelfData, profileData, users): Match[] => {
    const myBooks = Object.values(shelfData);
    const myTopics = [
      ...(profileData.topics?.curated ?? []),
      ...(profileData.topics?.inferred ?? []),
    ];

    return calculateMatches(myBooks, myTopics, users);
  }
);

export const hasMatches = computed(matches, (m) => m.length > 0);
