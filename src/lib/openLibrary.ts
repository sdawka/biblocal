import type { Book } from './types';

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

function getCache(): Record<string, Partial<Book>> {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

function setCache(isbn: string, book: Partial<Book>): void {
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
    const res = await fetch(`https://openlibrary.org${authorKey}.json`);
    if (!res.ok) return 'Unknown Author';
    const data: OpenLibraryAuthor = await res.json();
    return data.name;
  } catch {
    return 'Unknown Author';
  }
}

export async function fetchByIsbn(isbn: string): Promise<Partial<Book> | null> {
  const cleanIsbn = isbn.replace(/[-\s]/g, '');

  const cached = getCache()[cleanIsbn];
  if (cached) return cached;

  try {
    const res = await fetch(`https://openlibrary.org/isbn/${cleanIsbn}.json`);
    if (!res.ok) return null;

    const data: OpenLibraryBook = await res.json();

    const authorNames: string[] = [];
    if (data.authors) {
      for (const author of data.authors.slice(0, 3)) {
        await new Promise((r) => setTimeout(r, 100));
        authorNames.push(await fetchAuthorName(author.key));
      }
    }

    const book: Partial<Book> = {
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
