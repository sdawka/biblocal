import type { APIRoute } from 'astro';

export const prerender = false;
import { eq } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { getDb } from '../../../db/client';
import { books, bookNotes } from '../../../db/schema';
import { getUserId } from '../../../lib/auth';
import { getOrCreateUser } from '../../../db/users';
import {
  validateEnum,
  validateIntents,
  VALID_VISIBILITY,
  VALID_OWNERSHIP,
} from '../../../lib/validation';

type Env = { DB: D1Database };

// Cap a single import request so a huge payload can't exhaust the worker.
const MAX_IMPORT_BATCH = 200;

interface ImportBook {
  title: string;
  author: string;
  isbn?: string;
  visibility: 'private' | 'visible';
  ownership: 'have' | 'seeking';
  intents: string[];
  notes?: string;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

// How many cover lookups to run at once. Sequential fetches (200 of them)
// can exceed the Worker time limit; batching keeps total wall-time bounded
// while not opening too many sockets at once.
const COVER_FETCH_CONCURRENCY = 10;

async function fetchCoverUrl(isbn: string): Promise<string | null> {
  try {
    const res = await fetch(`https://openlibrary.org/isbn/${isbn}.json`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { covers?: number[] };
    if (data.covers?.[0]) {
      return `https://covers.openlibrary.org/b/id/${data.covers[0]}-M.jpg`;
    }
    return null;
  } catch {
    return null;
  }
}

// Resolve covers for a set of ISBNs concurrently in bounded batches.
// A failed lookup must never abort the import, so each settles to null.
async function fetchCovers(isbns: string[]): Promise<Map<string, string>> {
  const covers = new Map<string, string>();
  for (let i = 0; i < isbns.length; i += COVER_FETCH_CONCURRENCY) {
    const batch = isbns.slice(i, i + COVER_FETCH_CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (isbn) => [isbn, await fetchCoverUrl(isbn)] as const)
    );
    for (const [isbn, url] of results) {
      if (url) covers.set(isbn, url);
    }
  }
  return covers;
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const userId = getUserId(locals);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDb((env as Env).DB);
    await getOrCreateUser(db, userId);

    const body = await request.json() as { books: ImportBook[] };

    if (!body.books || !Array.isArray(body.books)) {
      return new Response(JSON.stringify({ error: 'Books array required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (body.books.length > MAX_IMPORT_BATCH) {
      return new Response(
        JSON.stringify({ error: `Too many books in one import (max ${MAX_IMPORT_BATCH})` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const isbnsToImport = body.books
      .map(b => b.isbn)
      .filter((isbn): isbn is string => !!isbn);

    let existingIsbns = new Set<string>();
    if (isbnsToImport.length > 0) {
      const existing = await db
        .select({ isbn: books.isbn })
        .from(books)
        .where(eq(books.userId, userId));
      existingIsbns = new Set(existing.map(b => b.isbn).filter(Boolean) as string[]);
    }

    const result: ImportResult = { imported: 0, skipped: 0, errors: [] };
    const now = new Date();

    // Determine which books will actually be imported first, then fetch their
    // covers concurrently in bounded batches. Doing the cover lookups inline
    // (sequentially, with a forced delay) risked exceeding the Worker time
    // limit and leaving partial imports.
    const toImport: ImportBook[] = [];
    for (const book of body.books) {
      if (!book.title || !book.author) {
        result.errors.push(`Skipped book with missing title or author`);
        continue;
      }
      if (book.isbn && existingIsbns.has(book.isbn)) {
        result.skipped++;
        continue;
      }
      // Mark as seen so a duplicate ISBN later in the same payload is skipped,
      // matching the original per-iteration dedup behavior.
      if (book.isbn) existingIsbns.add(book.isbn);
      toImport.push(book);
    }

    const coverIsbns = [...new Set(toImport.map(b => b.isbn).filter((i): i is string => !!i))];
    const coverByIsbn = await fetchCovers(coverIsbns);

    for (const book of toImport) {
      const coverUrl: string | null = book.isbn ? coverByIsbn.get(book.isbn) ?? null : null;

      // Normalize untrusted enum fields to safe defaults rather than storing junk.
      const visibility = validateEnum(book.visibility, VALID_VISIBILITY) ?? 'visible';
      const ownership = validateEnum(book.ownership, VALID_OWNERSHIP) ?? 'have';

      try {
        const bookId = crypto.randomUUID();
        await db.insert(books).values({
          id: bookId,
          userId,
          title: book.title,
          author: book.author,
          isbn: book.isbn || null,
          coverUrl,
          status: 'visible',
          visibility,
          ownership,
          intents: JSON.stringify(validateIntents(book.intents)),
          addedVia: 'goodreads',
          subjects: null,
          createdAt: now,
          updatedAt: now,
        });

        if (book.notes) {
          await db.insert(bookNotes).values({
            id: crypto.randomUUID(),
            bookId,
            userId,
            text: book.notes,
            visibility: 'private',
            createdAt: now,
            updatedAt: now,
          });
        }

        result.imported++;
      } catch (e) {
        result.errors.push(`Failed to import "${book.title}": ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Import books error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
