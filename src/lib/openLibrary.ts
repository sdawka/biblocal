/**
 * Shape fetchByIsbn actually produces: isbn/title/author are always set
 * (author falls back to 'Unknown Author' for catalogue records); cover and
 * subjects only when the lookup providers have them. A webMatch is deliberately
 * not a catalogue record: it asks the reader to confirm the metadata.
 */
export interface FetchedBook {
  isbn: string;
  title: string;
  author: string;
  coverUrl?: string;
  subjects?: string[];
  webMatch?: { url: string };
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

/**
 * Thrown by fetchByIsbn when a lookup provider or ISBN variant could not be
 * resolved (offline, rate limit, timeout, or malformed response). Distinct
 * from a `null` return, which means every lookup completed with no record.
 */
export class OpenLibraryNetworkError extends Error {
  constructor(message = 'Could not reach a book lookup provider') {
    super(message);
    this.name = 'OpenLibraryNetworkError';
  }
}

const CACHE_KEY = 'biblocal:isbn-cache:v1';
const LOOKUP_TIMEOUT_MS = 5000;

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
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    });
    if (!res.ok) return 'Unknown Author';
    const data: OpenLibraryAuthor = await res.json();
    return data.name;
  } catch {
    return 'Unknown Author';
  }
}

export function normalizeIsbn(isbn: string): string {
  return isbn.replace(/[-\s]/g, '').toUpperCase();
}

function isbn13CheckDigit(firstTwelveDigits: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(firstTwelveDigits[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return String((10 - (sum % 10)) % 10);
}

function isbn10CheckDigit(firstNineDigits: string): string {
  const sum = firstNineDigits.split('').reduce(
    (total, digit, index) => total + Number(digit) * (10 - index),
    0,
  );
  const remainder = 11 - (sum % 11);
  return remainder === 10 ? 'X' : remainder === 11 ? '0' : String(remainder);
}

export function hasValidIsbnChecksum(isbn: string): boolean {
  const clean = normalizeIsbn(isbn);
  if (/^\d{13}$/.test(clean)) {
    return isbn13CheckDigit(clean.slice(0, 12)) === clean[12];
  }
  if (!/^\d{9}[\dX]$/.test(clean)) return false;
  const sum = clean.slice(0, 9).split('').reduce(
    (total, digit, index) => total + Number(digit) * (10 - index),
    0,
  ) + (clean[9] === 'X' ? 10 : Number(clean[9]));
  return sum % 11 === 0;
}

/** ISBN-10 has a 978-prefixed ISBN-13 equivalent. 979 ISBNs do not. */
export function isbnVariants(isbn: string): string[] {
  const clean = normalizeIsbn(isbn);
  const variants = [clean];

  if (hasValidIsbnChecksum(clean) && /^\d{9}[\dX]$/.test(clean)) {
    const firstTwelve = `978${clean.slice(0, 9)}`;
    variants.push(`${firstTwelve}${isbn13CheckDigit(firstTwelve)}`);
  } else if (hasValidIsbnChecksum(clean) && /^978\d{10}$/.test(clean)) {
    const firstNine = clean.slice(3, 12);
    variants.push(`${firstNine}${isbn10CheckDigit(firstNine)}`);
  }

  return variants;
}

async function fetchOpenLibraryBook(isbn: string): Promise<FetchedBook | null | 'unavailable'> {
  let res: Response;
  try {
    res = await fetch(`https://openlibrary.org/isbn/${isbn}.json`, {
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    });
  } catch {
    return 'unavailable';
  }
  if (res.status === 404) return null;
  if (!res.ok) return 'unavailable';

  try {
    const data: OpenLibraryBook = await res.json();
    if (!data.title) return 'unavailable';
    const authorNames = data.authors
      ? await Promise.all(data.authors.slice(0, 3).map((author) => fetchAuthorName(author.key)))
      : [];

    return {
      isbn,
      title: data.title,
      author: authorNames.join(', ') || 'Unknown Author',
      coverUrl: data.covers?.[0]
        ? `https://covers.openlibrary.org/b/id/${data.covers[0]}-M.jpg`
        : undefined,
      subjects: data.subjects?.slice(0, 10),
    };
  } catch {
    return 'unavailable';
  }
}

interface OpenLibrarySearchDoc {
  title?: string;
  author_name?: string[];
  cover_i?: number;
  subject?: string[];
  isbn?: string[];
}

interface OpenLibrarySearchResponse {
  numFound?: number;
  docs?: OpenLibrarySearchDoc[];
}

async function searchOpenLibraryByIsbn(isbn: string, validIsbns: Set<string>): Promise<FetchedBook | null | 'unavailable'> {
  const params = new URLSearchParams({
    isbn,
    fields: 'title,author_name,cover_i,subject,isbn',
    limit: '10',
  });
  let res: Response;
  try {
    res = await fetch(`https://openlibrary.org/search.json?${params}`, {
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    });
  } catch {
    return 'unavailable';
  }
  if (res.status === 404) return null;
  if (!res.ok) return 'unavailable';

  try {
    const data: OpenLibrarySearchResponse = await res.json();
    if (typeof data.numFound !== 'number' || !Array.isArray(data.docs)) return 'unavailable';
    const doc = data.docs.find((candidate) =>
      candidate.isbn?.some((candidateIsbn) => validIsbns.has(normalizeIsbn(candidateIsbn))),
    );
    if (!doc?.title) return null;

    return {
      isbn,
      title: doc.title,
      author: doc.author_name?.slice(0, 3).join(', ') || 'Unknown Author',
      coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : undefined,
      subjects: doc.subject?.slice(0, 10),
    };
  } catch {
    return 'unavailable';
  }
}

interface GoogleBook {
  volumeInfo?: {
    title?: string;
    authors?: string[];
    categories?: string[];
    imageLinks?: { thumbnail?: string };
    industryIdentifiers?: { identifier?: string }[];
  };
}

interface GoogleBooksResponse {
  items?: GoogleBook[];
  totalItems?: number;
}

async function fetchGoogleBook(isbn: string, validIsbns: Set<string>): Promise<FetchedBook | null | 'unavailable'> {
  const params = new URLSearchParams({ q: `isbn:${isbn}`, maxResults: '10' });
  let res: Response;
  try {
    res = await fetch(`https://www.googleapis.com/books/v1/volumes?${params}`, {
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    });
  } catch {
    return 'unavailable';
  }
  if (res.status === 404) return null;
  if (!res.ok) return 'unavailable';

  try {
    const data: GoogleBooksResponse = await res.json();
    // A successful Books API search includes `totalItems`, even when it found
    // nothing. Treat a body without it as an unusable provider response.
    if (typeof data.totalItems !== 'number' && !Array.isArray(data.items)) return 'unavailable';
    const volume = data.items?.find((item) =>
      item.volumeInfo?.industryIdentifiers?.some((identifier) =>
        identifier.identifier && validIsbns.has(normalizeIsbn(identifier.identifier)),
      ),
    );
    const info = volume?.volumeInfo;
    if (!info?.title) return null;

    return {
      isbn,
      title: info.title,
      author: info.authors?.join(', ') || 'Unknown Author',
      coverUrl: info.imageLinks?.thumbnail?.replace(/^http:/, 'https:'),
      subjects: info.categories?.slice(0, 10),
    };
  } catch {
    return 'unavailable';
  }
}

type WebSearchResult = FetchedBook | null | 'unavailable';

/**
 * The Worker owns the private search binding. Keep its result separate from
 * catalogue metadata: web results are only a lead for the reader to confirm.
 */
async function fetchPrivateIsbnSearch(isbn: string): Promise<WebSearchResult> {
  let res: Response;
  try {
    const params = new URLSearchParams({ isbn });
    res = await fetch(`/api/books/isbn-search?${params}`, {
      signal: AbortSignal.timeout(7000),
    });
  } catch {
    return 'unavailable';
  }

  if (!res.ok) return 'unavailable';

  try {
    const data: unknown = await res.json();
    if (!data || typeof data !== 'object' || !('candidate' in data)) return 'unavailable';
    const candidate = data.candidate;
    if (candidate === null) return null;
    if (!candidate || typeof candidate !== 'object') return 'unavailable';

    const { title, url } = candidate as { title?: unknown; url?: unknown };
    if (typeof title !== 'string' || !title.trim() || typeof url !== 'string') return 'unavailable';
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') return 'unavailable';

    return {
      isbn,
      title: title.trim(),
      author: '',
      webMatch: { url: parsedUrl.href },
    };
  } catch {
    return 'unavailable';
  }
}

/**
 * Looks an ISBN up using Open Library's edition and indexed search APIs, then
 * Google Books. It also tries a convertible ISBN-10/ISBN-13 form, because
 * catalogues do not always index both editions. Returns `null` only after
 * every provider query reports no matching record; throws
 * OpenLibraryNetworkError for any unresolved query.
 */
export async function fetchByIsbn(isbn: string): Promise<FetchedBook | null> {
  const cleanIsbn = normalizeIsbn(isbn);

  const cached = getCache()[cleanIsbn];
  if (cached) return cached;

  const variants = isbnVariants(cleanIsbn);
  let sawUnavailableResult = false;

  for (const variant of variants) {
    const result = await fetchOpenLibraryBook(variant);
    if (result === 'unavailable') sawUnavailableResult = true;
    if (result && result !== 'unavailable') {
      const book = { ...result, isbn: cleanIsbn };
      setCache(cleanIsbn, book);
      return book;
    }
  }

  const validIsbns = new Set(variants);
  for (const variant of variants) {
    const result = await searchOpenLibraryByIsbn(variant, validIsbns);
    if (result === 'unavailable') sawUnavailableResult = true;
    if (result && result !== 'unavailable') {
      const book = { ...result, isbn: cleanIsbn };
      setCache(cleanIsbn, book);
      return book;
    }
  }

  for (const variant of variants) {
    const result = await fetchGoogleBook(variant, validIsbns);
    if (result === 'unavailable') sawUnavailableResult = true;
    if (result && result !== 'unavailable') {
      const book = { ...result, isbn: cleanIsbn };
      setCache(cleanIsbn, book);
      return book;
    }
  }

  // A checksum-invalid string may still be typed into the ISBN form for the
  // public catalogue lookups, but must never reach the private web search.
  if (hasValidIsbnChecksum(cleanIsbn)) {
    const result = await fetchPrivateIsbnSearch(cleanIsbn);
    if (result === 'unavailable') sawUnavailableResult = true;
    if (result && result !== 'unavailable') return result;
  }

  if (sawUnavailableResult) throw new OpenLibraryNetworkError();
  return null;
}

export function isValidIsbn(isbn: string): boolean {
  const clean = isbn.replace(/[-\s]/g, '');
  // ISBN-10 check digits may be X (representing 10), e.g. 043942089X.
  return /^(\d{9}[\dXx]|\d{13})$/.test(clean);
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
