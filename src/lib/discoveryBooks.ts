import type { Book, BookIntent, LocalBook, LocalBookGroup, Match } from './types';

const SHARABLE_INTENTS: BookIntent[] = ['borrowable', 'discussable', 'giftable'];

// Fixed display order for discovery groups.
const GROUP_ORDER: BookIntent[] = ['borrowable', 'discussable', 'giftable'];

function compareLocalBooks(a: LocalBook, b: LocalBook): number {
  if (b.tasteScore !== a.tasteScore) return b.tasteScore - a.tasteScore;
  const ad = a.distanceKm ?? Infinity;
  const bd = b.distanceKm ?? Infinity;
  return ad - bd;
}

/**
 * Pivot person-keyed matches into book-keyed discovery rows. One row per
 * (owned, visible book x sharable intent). Sorted taste-fit first (owner match
 * score), distance breaks ties. With no taste signal every score is 0, so the
 * sort degrades to pure distance — the cold-start fallback.
 */
export function pivotToBooks(matches: Match[]): LocalBook[] {
  const rows: LocalBook[] = [];

  for (const match of matches) {
    const facetTitles = new Set<string>([
      ...match.facets.shelfTwin.items,
      ...match.facets.readingMentor.items,
      ...match.facets.localSource.items,
    ]);

    const sharable = (match.user.shelf ?? []).filter(
      (b: Book) => b.visibility !== 'private' && b.ownership === 'have',
    );

    for (const book of sharable) {
      for (const intent of SHARABLE_INTENTS) {
        if (!book.intents?.includes(intent)) continue;
        rows.push({
          book,
          owner: match.user,
          intent,
          distanceKm: match.distanceKm,
          tasteScore: match.totalScore,
          isTasteMatch: facetTitles.has(book.title),
        });
      }
    }
  }

  return rows.sort(compareLocalBooks);
}

export function groupByIntent(books: LocalBook[]): LocalBookGroup[] {
  return GROUP_ORDER.map((intent) => ({
    intent,
    books: books.filter((b) => b.intent === intent),
  })).filter((g) => g.books.length > 0);
}
