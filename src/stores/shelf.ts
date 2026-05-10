import { persistentAtom } from '@nanostores/persistent';
import type { Book, BookStatus, BookVisibility, BookOwnership, BookIntent } from '../lib/types';
import { inferTopicsFromSubjects } from './topics';
import { currentUserId } from './auth';

export const shelf = persistentAtom<Record<string, Book>>('biblocal:shelf:v1', {}, {
  encode: JSON.stringify,
  decode: JSON.parse,
});

export type ShelfFilter = 'all' | 'lending' | 'discussing' | 'gifting' | 'seeking' | 'private';
export const activeFilter = persistentAtom<ShelfFilter>('biblocal:filter:v2', 'all');

export function bookMatchesFilter(book: Book, filter: ShelfFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'private') return book.visibility === 'private';
  if (filter === 'seeking') return book.ownership === 'seeking';
  if (filter === 'lending') return book.intents.includes('borrowable');
  if (filter === 'discussing') return book.intents.includes('discussable');
  if (filter === 'gifting') return book.intents.includes('giftable');
  return true;
}

async function syncAddBook(book: Book): Promise<void> {
  if (!currentUserId.get()) return;
  try {
    await fetch('/api/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: book.id,
        title: book.title,
        author: book.author,
        isbn: book.isbn,
        coverUrl: book.coverUrl,
        visibility: book.visibility,
        ownership: book.ownership,
        intents: book.intents,
        addedVia: book.addedVia,
        subjects: book.subjects,
        notes: book.notes,
      }),
    });
  } catch (e) {
    console.error('Failed to sync book:', e);
  }
}

async function syncUpdateBook(id: string, updates: Partial<Book>): Promise<void> {
  if (!currentUserId.get()) return;
  try {
    await fetch(`/api/books/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
  } catch (e) {
    console.error('Failed to sync book update:', e);
  }
}

async function syncRemoveBook(id: string): Promise<void> {
  if (!currentUserId.get()) return;
  try {
    await fetch(`/api/books/${id}`, { method: 'DELETE' });
  } catch (e) {
    console.error('Failed to sync book removal:', e);
  }
}

export function addBook(book: Omit<Book, 'id' | 'addedAt'> & { id?: string }): Book {
  const fullBook: Book = {
    ...book,
    // Defaults for new three-dimension model (if not provided)
    visibility: book.visibility ?? 'visible',
    ownership: book.ownership ?? 'have',
    intents: book.intents ?? [],
    id: book.id ?? crypto.randomUUID(),
    addedAt: Date.now(),
  };
  const current = shelf.get();
  shelf.set({ ...current, [fullBook.id]: fullBook });
  syncAddBook(fullBook);
  return fullBook;
}

export function updateBook(id: string, updates: Partial<Book>) {
  const current = shelf.get();
  const book = current[id];
  if (book) {
    shelf.set({ ...current, [id]: { ...book, ...updates } });
    syncUpdateBook(id, updates);
  }
}

export function updateBookVisibility(id: string, visibility: BookVisibility) {
  updateBook(id, { visibility });
}

export function updateBookOwnership(id: string, ownership: BookOwnership) {
  updateBook(id, { ownership });
}

export function updateBookIntents(id: string, intents: BookIntent[]) {
  updateBook(id, { intents });
}

export function toggleBookIntent(id: string, intent: BookIntent) {
  const current = shelf.get();
  const book = current[id];
  if (book) {
    const intents = book.intents.includes(intent)
      ? book.intents.filter(i => i !== intent)
      : [...book.intents, intent];
    updateBook(id, { intents });
  }
}

export function removeBook(id: string) {
  const current = { ...shelf.get() };
  delete current[id];
  shelf.set(current);
  syncRemoveBook(id);
}

interface ServerBook {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  coverUrl: string | null;
  status: string;
  // New three-dimension model
  visibility: string | null;
  ownership: string | null;
  intents: string | null;
  addedVia: string | null;
  subjects: string | null;
  notes: string | null;
  createdAt: string;
}

export async function loadBooksFromServer(): Promise<void> {
  if (!currentUserId.get()) return;
  try {
    const res = await fetch('/api/books?mine=true');
    if (!res.ok) return;
    const data = await res.json() as { books: ServerBook[] };
    const localBooks: Record<string, Book> = {};
    for (const b of data.books) {
      localBooks[b.id] = {
        id: b.id,
        isbn: b.isbn || undefined,
        title: b.title,
        author: b.author,
        // New three-dimension model with fallbacks
        visibility: (b.visibility || 'visible') as BookVisibility,
        ownership: (b.ownership || 'have') as BookOwnership,
        intents: b.intents ? JSON.parse(b.intents) as BookIntent[] : [],
        // Legacy status kept for migration
        status: b.status as BookStatus,
        coverUrl: b.coverUrl || undefined,
        subjects: b.subjects ? JSON.parse(b.subjects) : undefined,
        notes: b.notes || undefined,
        addedVia: (b.addedVia || 'manual') as 'scan' | 'manual',
        addedAt: new Date(b.createdAt).getTime(),
      };
    }
    shelf.set(localBooks);
  } catch (e) {
    console.error('Failed to load books from server:', e);
  }
}

export function getBookCount(): number {
  return Object.keys(shelf.get()).length;
}

export interface ShelfStats {
  total: number;
  lendable: number;
  discussable: number;
}

export function getShelfStats(): ShelfStats {
  const books = Object.values(shelf.get());
  return {
    total: books.length,
    lendable: books.filter(b => b.intents.includes('borrowable') || b.intents.includes('giftable')).length,
    discussable: books.filter(b => b.intents.includes('discussable')).length,
  };
}

export function getInferredTopics(): string[] {
  const books = Object.values(shelf.get());
  const allSubjects = books.flatMap(b => b.subjects ?? []);
  return inferTopicsFromSubjects(allSubjects);
}
