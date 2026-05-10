import { persistentAtom } from '@nanostores/persistent';
import type { Book, BookStatus } from '../lib/types';
import { inferTopicsFromSubjects } from './topics';
import { currentUserId } from './auth';

export const shelf = persistentAtom<Record<string, Book>>('biblocal:shelf:v1', {}, {
  encode: JSON.stringify,
  decode: JSON.parse,
});

export const activeFilter = persistentAtom<BookStatus | 'all'>('biblocal:filter:v1', 'all');

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
        status: book.status,
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

export function updateBookStatus(id: string, status: BookStatus) {
  updateBook(id, { status });
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

export function getInferredTopics(): string[] {
  const books = Object.values(shelf.get());
  const allSubjects = books.flatMap(b => b.subjects ?? []);
  return inferTopicsFromSubjects(allSubjects);
}
