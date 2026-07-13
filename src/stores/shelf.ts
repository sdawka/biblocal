import { atom } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';
import type { Book, BookNote, BookStatus, BookVisibility, BookOwnership, BookIntent } from '../lib/types';
import { inferTopicsFromSubjects } from './topics';
import { currentUserId } from './auth';
import { reportSyncError } from './sync-status';

const SYNC_ERROR_MESSAGE = 'Could not save your change. Please try again.';
const LOAD_SYNC_ERROR_MESSAGE = 'Could not load your shelf from the server. Please try again.';

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

// Signals when the initial shelf load has settled (success or failure), so
// the UI can tell "empty because still loading" apart from "empty because
// there really are no books." Returning users whose localStorage shelf was
// already populated at startup don't need to wait for the network at all —
// hydrated starts true for them. Reset to false whenever the shelf is reset
// for a user switch/logout, so the next loadBooksFromServer() re-arms it.
export const shelfHydrated = atom<boolean>(Object.keys(shelf.get()).length > 0);

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

// Each sync helper takes the `prior` shelf snapshot captured *before* the
// optimistic mutation and the id of the book it touched. On a non-2xx response
// or a thrown error it reverts ONLY that book to its pre-mutation state, merged
// onto the *current* shelf — so a failed sync no longer clobbers a concurrent
// mutation to a different book that succeeded in the meantime.
function rollback(id: string, prior: Record<string, Book>): void {
  const current = shelf.get();
  const next = { ...current };
  const priorBook = prior[id];
  if (priorBook === undefined) {
    // The mutation added this book; undo by removing it.
    delete next[id];
  } else {
    // The mutation changed/removed an existing book; restore its prior value.
    next[id] = priorBook;
  }
  shelf.set(next);
  reportSyncError(SYNC_ERROR_MESSAGE);
}

// Field-aware rollback for update mutations. Reverts only the fields this
// mutation changed, and only when the current value still matches the
// optimistically-written value — so a later edit to the same field wins
// (its value differs from what we wrote, so we leave it alone).
function rollbackFields(id: string, updates: Partial<Book>, prior: Record<string, Book>): void {
  const current = shelf.get();
  const priorBook = prior[id];
  if (priorBook === undefined) {
    // Prior snapshot had no book at this id — treat as add rollback.
    const next = { ...current };
    delete next[id];
    shelf.set(next);
    reportSyncError(SYNC_ERROR_MESSAGE);
    return;
  }
  const currentBook = current[id];
  if (!currentBook) {
    // Book was removed after the optimistic write; nothing left to revert.
    reportSyncError(SYNC_ERROR_MESSAGE);
    return;
  }
  const reverted: Book = { ...currentBook };
  for (const key of Object.keys(updates) as Array<keyof Book>) {
    // Only revert a field if it still holds the optimistically-written value.
    // If it has changed (a subsequent edit won), leave the later value intact.
    if (JSON.stringify(reverted[key]) === JSON.stringify(updates[key])) {
      Object.assign(reverted, { [key]: priorBook[key] });
    }
  }
  shelf.set({ ...current, [id]: reverted });
  reportSyncError(SYNC_ERROR_MESSAGE);
}

async function syncAddBook(book: Book, prior: Record<string, Book>): Promise<void> {
  if (!currentUserId.get()) { rollback(book.id, prior); return; }
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
      rollback(book.id, prior);
    }
  } catch (e) {
    console.error('Failed to sync book:', e);
    rollback(book.id, prior);
  }
}

async function syncUpdateBook(id: string, updates: Partial<Book>, prior: Record<string, Book>): Promise<void> {
  if (!currentUserId.get()) { rollbackFields(id, updates, prior); return; }
  try {
    const res = await fetch(`/api/books/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      console.error('Failed to sync book update:', await res.text());
      rollbackFields(id, updates, prior);
    }
  } catch (e) {
    console.error('Failed to sync book update:', e);
    rollbackFields(id, updates, prior);
  }
}

async function syncRemoveBook(id: string, prior: Record<string, Book>): Promise<void> {
  if (!currentUserId.get()) { rollback(id, prior); return; }
  try {
    const res = await fetch(`/api/books/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      console.error('Failed to sync book removal:', await res.text());
      rollback(id, prior);
    }
  } catch (e) {
    console.error('Failed to sync book removal:', e);
    rollback(id, prior);
  }
}

async function syncAddNote(bookId: string, note: BookNote, prior: Record<string, Book>): Promise<void> {
  if (!currentUserId.get()) { rollback(bookId, prior); return; }
  try {
    const res = await fetch(`/api/books/${bookId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Send our client id so the server keeps the same identity for this note.
      body: JSON.stringify({ id: note.id, text: note.text, visibility: note.visibility }),
    });
    if (!res.ok) {
      console.error('Failed to sync note:', await res.text());
      rollback(bookId, prior);
    }
  } catch (e) {
    console.error('Failed to sync note:', e);
    rollback(bookId, prior);
  }
}

async function syncUpdateNote(bookId: string, noteId: string, updates: Partial<BookNote>, prior: Record<string, Book>): Promise<void> {
  if (!currentUserId.get()) { rollback(bookId, prior); return; }
  try {
    const res = await fetch(`/api/books/${bookId}/notes/${noteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      console.error('Failed to sync note update:', await res.text());
      rollback(bookId, prior);
    }
  } catch (e) {
    console.error('Failed to sync note update:', e);
    rollback(bookId, prior);
  }
}

async function syncRemoveNote(bookId: string, noteId: string, prior: Record<string, Book>): Promise<void> {
  if (!currentUserId.get()) { rollback(bookId, prior); return; }
  try {
    const res = await fetch(`/api/books/${bookId}/notes/${noteId}`, { method: 'DELETE' });
    if (!res.ok) {
      console.error('Failed to sync note removal:', await res.text());
      rollback(bookId, prior);
    }
  } catch (e) {
    console.error('Failed to sync note removal:', e);
    rollback(bookId, prior);
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
  const prior = shelf.get();
  shelf.set({ ...prior, [fullBook.id]: fullBook });
  syncAddBook(fullBook, prior);
  return fullBook;
}

export function updateBook(id: string, updates: Partial<Book>) {
  const current = shelf.get();
  const book = current[id];
  if (book) {
    shelf.set({ ...current, [id]: { ...book, ...updates } });
    syncUpdateBook(id, updates, current);
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
  const prior = shelf.get();
  const next = { ...prior };
  delete next[id];
  shelf.set(next);
  syncRemoveBook(id, prior);
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
  syncAddNote(bookId, note, current);
  return note;
}

export function updateNote(bookId: string, noteId: string, updates: Partial<Pick<BookNote, 'text' | 'visibility'>>) {
  const current = shelf.get();
  const book = current[bookId];
  if (!book || !book.notes) return;
  const notes = book.notes.map((n) => (n.id === noteId ? { ...n, ...updates } : n));
  shelf.set({ ...current, [bookId]: { ...book, notes } });
  syncUpdateNote(bookId, noteId, updates, current);
}

export function removeNote(bookId: string, noteId: string) {
  const current = shelf.get();
  const book = current[bookId];
  if (!book || !book.notes) return;
  const notes = book.notes.filter((n) => n.id !== noteId);
  shelf.set({ ...current, [bookId]: { ...book, notes } });
  syncRemoveNote(bookId, noteId, current);
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

// Legacy pre-sync-fix books live only in localStorage and must be uploaded, not discarded.
function findLocalOnlyBooks(
  localSnapshot: Record<string, Book>,
  serverBooks: Record<string, Book>,
): Book[] {
  const serverList = Object.values(serverBooks);
  const localOnly: Book[] = [];

  for (const localBook of Object.values(localSnapshot)) {
    if (serverBooks[localBook.id]) continue;

    if (localBook.isbn) {
      const isbnMatch = serverList.find(b => b.isbn === localBook.isbn);
      if (isbnMatch) continue;
    }

    const normalTitle = normalizeString(localBook.title);
    const normalAuthor = normalizeString(localBook.author);
    const titleMatch = serverList.find(
      b => normalizeString(b.title) === normalTitle && normalizeString(b.author) === normalAuthor,
    );
    if (titleMatch) continue;

    localOnly.push(localBook);
  }

  return localOnly;
}

export async function loadBooksFromServer(): Promise<void> {
  // Capture the user this load is for; if it changes mid-flight (fast re-login
  // as a different user), bail before set() so a slow response can't overwrite
  // the newer user's freshly-loaded shelf.
  const loadingFor = currentUserId.get();
  if (!loadingFor) {
    shelfHydrated.set(true);
    return;
  }
  // Snapshot local shelf before the request so legacy-only books can be recovered.
  const preLoadSnapshot = shelf.get();
  try {
    const res = await fetch('/api/books?mine=true');
    if (currentUserId.get() !== loadingFor) return;
    if (!res.ok) {
      reportSyncError(LOAD_SYNC_ERROR_MESSAGE);
      return;
    }
    const data = await res.json() as { books: ServerBook[] };
    if (currentUserId.get() !== loadingFor) return;
    const serverBooks: Record<string, Book> = {};
    for (const b of data.books) {
      serverBooks[b.id] = {
        id: b.id,
        isbn: b.isbn || undefined,
        title: b.title,
        author: b.author,
        // New three-dimension model with fallbacks
        visibility: (b.visibility || 'visible') as BookVisibility,
        ownership: (b.ownership || 'have') as BookOwnership,
        // Safe-decode JSON columns so one malformed row can't blank the whole shelf.
        intents: b.intents ? safeJsonDecode<BookIntent[]>([])(b.intents) : [],
        // Legacy status kept for migration
        status: b.status as BookStatus,
        coverUrl: b.coverUrl || undefined,
        subjects: b.subjects ? safeJsonDecode<string[]>([])(b.subjects) : undefined,
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
    // Legacy recovery: books that were local-only BEFORE this request started.
    // Used for uploads only — mid-flight adds (not in preLoadSnapshot) already
    // have their own syncAddBook POST in flight and must NOT be double-posted.
    const legacyLocalOnly = findLocalOnlyBooks(preLoadSnapshot, serverBooks);
    // Use a fresh snapshot for the merge so books added via addBook() while the
    // GET was in flight are preserved (they were not in preLoadSnapshot and are
    // not on the server, but are now in shelf.get()).
    const postFetchSnapshot = shelf.get();
    const allLocalOnly = findLocalOnlyBooks(postFetchSnapshot, serverBooks);
    const merged: Record<string, Book> = { ...serverBooks };
    for (const book of allLocalOnly) merged[book.id] = book;
    shelf.set(merged);
    // Upload each legacy-local-only book fire-and-forget. `merged` (not
    // `serverBooks`) must be the prior snapshot: on upload failure, rollback
    // restores the book instead of deleting the only surviving copy from localStorage.
    for (const book of legacyLocalOnly) syncAddBook(book, merged);
  } catch (e) {
    console.error('Failed to load books from server:', e);
    reportSyncError(LOAD_SYNC_ERROR_MESSAGE);
  } finally {
    // Settle hydration on both success and failure so the UI never hangs on
    // a loading skeleton. Safe even on a stale mid-flight bail: the newer
    // load for the current user will also finish and set this again.
    shelfHydrated.set(true);
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
