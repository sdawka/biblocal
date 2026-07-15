/**
 * Shape fetchByIsbn actually produces: isbn/title/author are always set
 * (author falls back to 'Unknown Author'); cover and subjects only when
 * Open Library has them.
 */
export interface FetchedBook {
  isbn: string;
  title: string;
  author: string;
  coverUrl?: string;
  subjects?: string[];
}

interface OpenLibraryBook {
  title: string;
  authors?: { key: string }[];
  covers?: number[];
  subjects?: string[];
}

interface OpenLibraryAuthor {
  name: string;
}

const CACHE_KEY = 'biblocal:isbn-cache:v1';

function getCache(): Record<string, FetchedBook> {
  // src/lib must be SSR-safe: localStorage doesn't exist on the server.
  if (typeof localStorage === 'undefined') return {};
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

function setCache(isbn: string, book: FetchedBook): void {
  // src/lib must be SSR-safe: localStorage doesn't exist on the server.
  if (typeof localStorage === 'undefined') return;
  try {
    const cache = getCache();
    cache[isbn] = book;
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage full or unavailable
  }
}

async function fetchAuthorName(authorKey: string): Promise<string> {
  try {
    const res = await fetch(`https://openlibrary.org${authorKey}.json`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return 'Unknown Author';
    const data: OpenLibraryAuthor = await res.json();
    return data.name;
  } catch {
    return 'Unknown Author';
  }
}

export async function fetchByIsbn(isbn: string): Promise<FetchedBook | null> {
  const cleanIsbn = isbn.replace(/[-\s]/g, '');

  const cached = getCache()[cleanIsbn];
  if (cached) return cached;

  try {
    const res = await fetch(`https://openlibrary.org/isbn/${cleanIsbn}.json`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;

    const data: OpenLibraryBook = await res.json();

    const authorNames: string[] = data.authors
      ? await Promise.all(data.authors.slice(0, 3).map((a) => fetchAuthorName(a.key)))
      : [];

    const book: FetchedBook = {
      isbn: cleanIsbn,
      title: data.title,
      author: authorNames.join(', ') || 'Unknown Author',
      coverUrl: data.covers?.[0]
        ? `https://covers.openlibrary.org/b/id/${data.covers[0]}-M.jpg`
        : undefined,
      subjects: data.subjects?.slice(0, 10),
    };

    setCache(cleanIsbn, book);
    return book;
  } catch {
    return null;
  }
}

export function isValidIsbn(isbn: string): boolean {
  const clean = isbn.replace(/[-\s]/g, '');
  return /^(\d{10}|\d{13})$/.test(clean);
}

/**
 * True only for an actual book barcode: a 13-digit EAN with a 978/979 prefix
 * and a valid check digit. The back of a book usually carries a second barcode
 * (a price add-on or store UPC); this rejects those so the scanner only accepts
 * the ISBN.
 */
export function isBookEan13(code: string): boolean {
  const clean = code.replace(/[-\s]/g, '');
  if (!/^(978|979)\d{10}$/.test(clean)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(clean[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === Number(clean[12]);
}
