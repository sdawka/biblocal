import { persistentAtom } from '@nanostores/persistent';
import type { Book, BookNote, BookStatus, BookVisibility, BookOwnership, BookIntent } from '../lib/types';
import { inferTopicsFromSubjects } from './topics';
import { currentUserId } from './auth';

function safeJsonDecode<T>(defaultValue: T) {
  return (str: string): T => {
    try {
      return JSON.parse(str);
    } catch {
      return defaultValue;
    }
  };
}

export const shelf = persistentAtom<Record<string, Book>>('biblocal:shelf:v1', {}, {
  encode: JSON.stringify,
  decode: safeJsonDecode({}),
});

// Legacy single-select filter (deprecated, kept for migration)
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

// New multi-dimensional filter system
export interface ShelfFilters {
  visibility: BookVisibility[];
  ownership: BookOwnership[];
  intents: BookIntent[];
}

const DEFAULT_FILTERS: ShelfFilters = {
  visibility: [],
  ownership: [],
  intents: [],
};

export const activeFilters = persistentAtom<ShelfFilters>(
  'biblocal:filter:v3',
  DEFAULT_FILTERS,
  { encode: JSON.stringify, decode: safeJsonDecode(DEFAULT_FILTERS) }
);

export function bookMatchesFilters(book: Book, filters: ShelfFilters): boolean {
  if (filters.visibility.length > 0 && !filters.visibility.includes(book.visibility)) {
    return false;
  }
  if (filters.ownership.length > 0 && !filters.ownership.includes(book.ownership)) {
    return false;
  }
  if (filters.intents.length > 0 && !book.intents.some(i => filters.intents.includes(i))) {
    return false;
  }
  return true;
}

export function toggleVisibilityFilter(value: BookVisibility): void {
  const current = activeFilters.get();
  const visibility = current.visibility.includes(value)
    ? current.visibility.filter(v => v !== value)
    : [...current.visibility, value];
  activeFilters.set({ ...current, visibility });
}

export function toggleOwnershipFilter(value: BookOwnership): void {
  const current = activeFilters.get();
  const ownership = current.ownership.includes(value)
    ? current.ownership.filter(o => o !== value)
    : [...current.ownership, value];
  activeFilters.set({ ...current, ownership });
}

export function toggleIntentFilter(value: BookIntent): void {
  const current = activeFilters.get();
  const intents = current.intents.includes(value)
    ? current.intents.filter(i => i !== value)
    : [...current.intents, value];
  activeFilters.set({ ...current, intents });
}

export function clearAllFilters(): void {
  activeFilters.set(DEFAULT_FILTERS);
}

export function hasActiveFilters(): boolean {
  const f = activeFilters.get();
  return f.visibility.length > 0 || f.ownership.length > 0 || f.intents.length > 0;
}

async function syncAddBook(book: Book): Promise<void> {
  if (!currentUserId.get()) return;
  try {
    const res = await fetch('/api/books', {
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
      }),
    });
    if (!res.ok) {
      console.error('Failed to sync book:', await res.text());
    }
  } catch (e) {
    console.error('Failed to sync book:', e);
  }
}

async function syncUpdateBook(id: string, updates: Partial<Book>): Promise<void> {
  if (!currentUserId.get()) return;
  try {
    const res = await fetch(`/api/books/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      console.error('Failed to sync book update:', await res.text());
    }
  } catch (e) {
    console.error('Failed to sync book update:', e);
  }
}

async function syncRemoveBook(id: string): Promise<void> {
  if (!currentUserId.get()) return;
  try {
    const res = await fetch(`/api/books/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      console.error('Failed to sync book removal:', await res.text());
    }
  } catch (e) {
    console.error('Failed to sync book removal:', e);
  }
}

async function syncAddNote(bookId: string, note: BookNote): Promise<void> {
  if (!currentUserId.get()) return;
  try {
    const res = await fetch(`/api/books/${bookId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Send our client id so the server keeps the same identity for this note.
      body: JSON.stringify({ id: note.id, text: note.text, visibility: note.visibility }),
    });
    if (!res.ok) {
      console.error('Failed to sync note:', await res.text());
    }
  } catch (e) {
    console.error('Failed to sync note:', e);
  }
}

async function syncUpdateNote(bookId: string, noteId: string, updates: Partial<BookNote>): Promise<void> {
  if (!currentUserId.get()) return;
  try {
    const res = await fetch(`/api/books/${bookId}/notes/${noteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      console.error('Failed to sync note update:', await res.text());
    }
  } catch (e) {
    console.error('Failed to sync note update:', e);
  }
}

async function syncRemoveNote(bookId: string, noteId: string): Promise<void> {
  if (!currentUserId.get()) return;
  try {
    const res = await fetch(`/api/books/${bookId}/notes/${noteId}`, { method: 'DELETE' });
    if (!res.ok) {
      console.error('Failed to sync note removal:', await res.text());
    }
  } catch (e) {
    console.error('Failed to sync note removal:', e);
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

export function updateBookStatus(id: string, status: BookStatus) {
  updateBook(id, { status });
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

// ─── Book notes ──────────────────────────────────────────────────────────────
// Notes are stored on each book's `notes` array. Mutations follow the same
// optimistic-local-then-sync pattern as updateBook: update the store immediately
// so the UI is responsive, then fire the network request in the background.

/**
 * Add a note to a book. Returns the created note (or null if the book is gone).
 *
 * The note's id is generated client-side and handed to the server (syncAddNote
 * sends it; the POST endpoint honors it), so a just-added note can be edited or
 * deleted before any reload — its client and server ids already agree. (Contrast
 * addBook, where the server ignores the client id until loadBooksFromServer.)
 */
export function addNote(bookId: string, text: string, visibility: BookVisibility = 'private'): BookNote | null {
  const current = shelf.get();
  const book = current[bookId];
  if (!book) return null;

  const note: BookNote = {
    id: crypto.randomUUID(),
    text,
    visibility,
    createdAt: Date.now(),
  };
  const notes = [...(book.notes ?? []), note];
  shelf.set({ ...current, [bookId]: { ...book, notes } });
  syncAddNote(bookId, note);
  return note;
}

export function updateNote(bookId: string, noteId: string, updates: Partial<Pick<BookNote, 'text' | 'visibility'>>) {
  const current = shelf.get();
  const book = current[bookId];
  if (!book || !book.notes) return;
  const notes = book.notes.map((n) => (n.id === noteId ? { ...n, ...updates } : n));
  shelf.set({ ...current, [bookId]: { ...book, notes } });
  syncUpdateNote(bookId, noteId, updates);
}

export function removeNote(bookId: string, noteId: string) {
  const current = shelf.get();
  const book = current[bookId];
  if (!book || !book.notes) return;
  const notes = book.notes.filter((n) => n.id !== noteId);
  shelf.set({ ...current, [bookId]: { ...book, notes } });
  syncRemoveNote(bookId, noteId);
}

interface ServerNote {
  id: string;
  text: string;
  visibility: string;
  createdAt: string | number;
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
  notes?: ServerNote[];
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
        notes: (b.notes ?? []).map((n) => ({
          id: n.id,
          text: n.text,
          visibility: n.visibility as BookVisibility,
          createdAt: typeof n.createdAt === 'number' ? n.createdAt : new Date(n.createdAt).getTime(),
        })),
        addedVia: (b.addedVia || 'manual') as 'scan' | 'manual' | 'goodreads',
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

function normalizeString(str: string): string {
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

export function findDuplicate(isbn: string | undefined, title: string, author: string): Book | null {
  const books = Object.values(shelf.get());

  // Check ISBN match first (if provided)
  if (isbn) {
    const isbnMatch = books.find(b => b.isbn === isbn);
    if (isbnMatch) return isbnMatch;
  }

  // Check normalized title + author
  const normalizedTitle = normalizeString(title);
  const normalizedAuthor = normalizeString(author);

  const titleAuthorMatch = books.find(b =>
    normalizeString(b.title) === normalizedTitle &&
    normalizeString(b.author) === normalizedAuthor
  );

  return titleAuthorMatch || null;
}
