import type { Book, UserProfile, Match, MatchFacets, MatchFacet } from './types';
import { haversineDistance } from './geo';

export interface LocationFilter {
  lat: number;
  lng: number;
  radiusKm: number;
}

const WEIGHTS = {
  shelfTwin: 3,
  readingMentor: 2,
  localSource: 2,
  discussionMatch: 1,
};

// Filter out private books to prevent privacy leaks in matching
const filterVisible = (books: Book[] | undefined): Book[] =>
  (books ?? []).filter((b) => b.visibility !== 'private');

function calcShelfTwin(myBooks: Book[], theirBooks: Book[]): MatchFacet {
  const myIsbns = new Set(
    myBooks
      .filter((b) => b.ownership === 'have')
      .map((b) => b.isbn)
      .filter(Boolean)
  );
  const shared = theirBooks.filter(
    (b) => b.isbn && b.ownership === 'have' && myIsbns.has(b.isbn)
  );
  return {
    count: shared.length,
    items: shared.map((b) => b.title),
  };
}

function hasIntent(book: Book, intent: string): boolean {
  return Array.isArray(book.intents) && book.intents.includes(intent as Book['intents'][number]);
}

function calcReadingMentor(myBooks: Book[], theirBooks: Book[]): MatchFacet {
  const myWants = new Set(
    myBooks
      .filter((b) => b.ownership === 'seeking')
      .map((b) => b.isbn)
      .filter(Boolean)
  );
  const theyHave = theirBooks.filter(
    (b) =>
      b.isbn &&
      myWants.has(b.isbn) &&
      b.ownership === 'have' &&
      (hasIntent(b, 'borrowable') || hasIntent(b, 'discussable'))
  );
  return {
    count: theyHave.length,
    items: theyHave.map((b) => b.title),
  };
}

function calcLocalSource(myBooks: Book[], theirBooks: Book[]): MatchFacet {
  const myWants = new Set(
    myBooks
      .filter((b) => b.ownership === 'seeking')
      .map((b) => b.isbn)
      .filter(Boolean)
  );
  const canObtain = theirBooks.filter(
    (b) =>
      b.isbn &&
      myWants.has(b.isbn) &&
      b.ownership === 'have' &&
      (hasIntent(b, 'borrowable') || hasIntent(b, 'giftable'))
  );
  return {
    count: canObtain.length,
    items: canObtain.map((b) => b.title),
  };
}

function calcDiscussionMatch(
  myTopics: string[],
  theirTopics: string[]
): MatchFacet {
  const mySet = new Set(myTopics);
  const shared = theirTopics.filter((t) => mySet.has(t));
  return {
    count: shared.length,
    items: shared,
  };
}

function calcTotalScore(facets: MatchFacets): number {
  return (
    facets.shelfTwin.count * WEIGHTS.shelfTwin +
    facets.readingMentor.count * WEIGHTS.readingMentor +
    facets.localSource.count * WEIGHTS.localSource +
    facets.discussionMatch.count * WEIGHTS.discussionMatch
  );
}

function hasAnyMatch(facets: MatchFacets): boolean {
  return (
    facets.shelfTwin.count > 0 ||
    facets.readingMentor.count > 0 ||
    facets.localSource.count > 0 ||
    facets.discussionMatch.count > 0
  );
}

// Books this person is actively sharing: owned, non-private (already filtered),
// and open to lending, discussing, or gifting.
function calcOffering(theirBooks: Book[]): MatchFacet {
  const offered = theirBooks.filter(
    (b) =>
      b.ownership === 'have' &&
      (hasIntent(b, 'borrowable') ||
        hasIntent(b, 'discussable') ||
        hasIntent(b, 'giftable'))
  );
  return {
    count: offered.length,
    items: offered.map((b) => b.title),
  };
}

export function calculateMatches(
  myBooks: Book[],
  myTopics: string[],
  users: UserProfile[],
  location?: LocationFilter
): Match[] {
  const matches: Match[] = [];

  // Filter out private books from my shelf to prevent them from being used in matching
  const myVisibleBooks = filterVisible(myBooks);

  for (const user of users) {
    // Filter by distance if location provided
    let distanceKm: number | undefined;
    if (location && user.latitude != null && user.longitude != null) {
      distanceKm = haversineDistance(
        location.lat,
        location.lng,
        user.latitude,
        user.longitude
      );
      if (distanceKm > location.radiusKm) {
        continue;
      }
    }

    // Filter out private books from their shelf to prevent titles leaking
    const theirBooks = filterVisible(user.shelf);
    const theirTopics = [
      ...(user.topics?.curated ?? []),
      ...(user.topics?.inferred ?? []),
    ];

    const facets: MatchFacets = {
      shelfTwin: calcShelfTwin(myVisibleBooks, theirBooks),
      readingMentor: calcReadingMentor(myVisibleBooks, theirBooks),
      localSource: calcLocalSource(myVisibleBooks, theirBooks),
      discussionMatch: calcDiscussionMatch(myTopics, theirTopics),
    };

    if (hasAnyMatch(facets)) {
      matches.push({
        user,
        facets,
        totalScore: calcTotalScore(facets),
        distanceKm,
      });
    }
  }

  // Sort by distance first (if available), then by score
  return matches.sort((a, b) => {
    if (a.distanceKm != null && b.distanceKm != null) {
      const distDiff = a.distanceKm - b.distanceKm;
      if (Math.abs(distDiff) > 0.5) return distDiff;
    }
    return b.totalScore - a.totalScore;
  });
}

/**
 * Discovery is broader than matching: a person appears if they taste-match you
 * OR are sharing at least one book (lend/discuss/gift). Location is optional —
 * people without coordinates still show up (the map lists them separately).
 */
export function calculateDiscovery(
  myBooks: Book[],
  myTopics: string[],
  users: UserProfile[],
  location?: LocationFilter
): Match[] {
  const myVisibleBooks = filterVisible(myBooks);
  const results: Match[] = [];

  for (const user of users) {
    let distanceKm: number | undefined;
    if (location && user.latitude != null && user.longitude != null) {
      distanceKm = haversineDistance(
        location.lat,
        location.lng,
        user.latitude,
        user.longitude
      );
      if (distanceKm > location.radiusKm) {
        continue;
      }
    }

    const theirBooks = filterVisible(user.shelf);
    const theirTopics = [
      ...(user.topics?.curated ?? []),
      ...(user.topics?.inferred ?? []),
    ];

    const facets: MatchFacets = {
      shelfTwin: calcShelfTwin(myVisibleBooks, theirBooks),
      readingMentor: calcReadingMentor(myVisibleBooks, theirBooks),
      localSource: calcLocalSource(myVisibleBooks, theirBooks),
      discussionMatch: calcDiscussionMatch(myTopics, theirTopics),
    };
    const offering = calcOffering(theirBooks);

    if (hasAnyMatch(facets) || offering.count > 0) {
      results.push({
        user,
        facets,
        offering,
        totalScore: calcTotalScore(facets),
        distanceKm,
      });
    }
  }

  // Taste-matched people (higher score) first, then pure offerers; distance
  // breaks ties when both sides have it.
  return results.sort((a, b) => {
    if (a.distanceKm != null && b.distanceKm != null) {
      const distDiff = a.distanceKm - b.distanceKm;
      if (Math.abs(distDiff) > 0.5) return distDiff;
    }
    return b.totalScore - a.totalScore;
  });
}
