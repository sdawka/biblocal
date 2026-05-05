import { persistentAtom } from '@nanostores/persistent';
import type { Book, BookStatus } from '../lib/types';
import { inferTopicsFromSubjects } from './topics';

export const shelf = persistentAtom<Record<string, Book>>('biblocal:shelf:v1', {}, {
  encode: JSON.stringify,
  decode: JSON.parse,
});

export const activeFilter = persistentAtom<BookStatus | 'all'>('biblocal:filter:v1', 'all');

export function addBook(book: Omit<Book, 'id' | 'addedAt'> & { id?: string }): Book {
  const fullBook: Book = {
    ...book,
    id: book.id ?? crypto.randomUUID(),
    addedAt: Date.now(),
  };
  const current = shelf.get();
  shelf.set({ ...current, [fullBook.id]: fullBook });
  return fullBook;
}

export function updateBook(id: string, updates: Partial<Book>) {
  const current = shelf.get();
  const book = current[id];
  if (book) {
    shelf.set({ ...current, [id]: { ...book, ...updates } });
  }
}

export function updateBookStatus(id: string, status: BookStatus) {
  updateBook(id, { status });
}

export function removeBook(id: string) {
  const current = { ...shelf.get() };
  delete current[id];
  shelf.set(current);
}

export function getBookCount(): number {
  return Object.keys(shelf.get()).length;
}

export function getInferredTopics(): string[] {
  const books = Object.values(shelf.get());
  const allSubjects = books.flatMap(b => b.subjects ?? []);
  return inferTopicsFromSubjects(allSubjects);
}
