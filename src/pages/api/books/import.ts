import type { APIRoute } from 'astro';

export const prerender = false;
import { eq } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { getDb } from '../../../db/client';
import { books } from '../../../db/schema';
import { getUserId } from '../../../lib/auth';

type Env = { DB: D1Database };

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

async function fetchCoverUrl(isbn: string): Promise<string | null> {
  try {
    const res = await fetch(`https://openlibrary.org/isbn/${isbn}.json`);
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
    const body = await request.json() as { books: ImportBook[] };

    if (!body.books || !Array.isArray(body.books)) {
      return new Response(JSON.stringify({ error: 'Books array required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
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

    for (const book of body.books) {
      if (!book.title || !book.author) {
        result.errors.push(`Skipped book with missing title or author`);
        continue;
      }

      if (book.isbn && existingIsbns.has(book.isbn)) {
        result.skipped++;
        continue;
      }

      let coverUrl: string | null = null;
      if (book.isbn) {
        coverUrl = await fetchCoverUrl(book.isbn);
        await new Promise(r => setTimeout(r, 100));
      }

      try {
        await db.insert(books).values({
          id: crypto.randomUUID(),
          userId,
          title: book.title,
          author: book.author,
          isbn: book.isbn || null,
          coverUrl,
          status: 'visible',
          visibility: book.visibility,
          ownership: book.ownership,
          intents: JSON.stringify(book.intents),
          addedVia: 'goodreads',
          subjects: null,
          notes: book.notes || null,
          createdAt: now,
          updatedAt: now,
        });
        result.imported++;
        if (book.isbn) {
          existingIsbns.add(book.isbn);
        }
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
