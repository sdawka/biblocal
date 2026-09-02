import { atom } from 'nanostores';
import { persistentAtom, persistentMap } from '@nanostores/persistent';
import type { Book, BookNote, BookStatus, BookVisibility, BookOwnership, BookIntent } from '../lib/types';
import { inferTopicsFromSubjects } from './topics';
import { currentUserId } from './auth';
import { reportSyncError } from './sync-status';

const SYNC_ERROR_MESSAGE = 'Could not save your change. Please try again.';
const LOAD_SYNC_ERROR_MESSAGE = 'Could not load your shelf from the server. Please try again.';
const COVER_SYNC_ERROR_MESSAGE = 'Could not update the cover. Please try again.';
const DELETION_MARKERS_STORAGE_PREFIX = 'biblocal:shelf:deleted:v1:';
const LEGACY_ACTIVE_LOADS_STORAGE_PREFIX = 'biblocal:shelf:loads:v1:';
const ACTIVE_LOADS_STORAGE_PREFIX = 'biblocal:shelf:loads:v2:';
const LOAD_LEASE_TTL_MS = 2 * 60 * 1000;
const LEGACY_COORDINATION_TTL_MS = 24 * 60 * 60 * 1000;
const DELETION_MARKER_TTL_MS = 24 * 60 * 60 * 1000;

interface UserSession {
  userId: string;
  generation: number;
}

interface PendingCreate {
  session: UserSession;
  promise: Promise<boolean>;
}

interface DeletionFence {
  session: UserSession;
}

interface PersistedDeleteMarker {
  deletedAt: number;
  absenceConfirmed: boolean;
  expiresAt?: number;
}

interface PersistedLoadLease {
  version: 2;
  startedAt: number;
  expiresAt: number;
}

const pendingCreates = new Map<string, Set<PendingCreate>>();
const deletionFences = new Map<string, DeletionFence>();
const canonicalBookIds = new Map<string, { session: UserSession; id: string }>();
const ownedLoadLeases = new Map<string, { userId: string; lease: PersistedLoadLease }>();
let observedUserId: string | null | undefined;
let userSessionGeneration = 0;

const persistedDeletionMarkers = persistentMap<Record<string, PersistedDeleteMarker>>(
  DELETION_MARKERS_STORAGE_PREFIX,
  {},
  {
    encode: JSON.stringify,
    decode: safeJsonDecode<PersistedDeleteMarker>({
      deletedAt: Number.NaN,
      absenceConfirmed: false,
    }),
  },
);
const persistedLegacyActiveLoads = persistentMap<Record<string, unknown>>(
  LEGACY_ACTIVE_LOADS_STORAGE_PREFIX,
  {},
  { encode: JSON.stringify, decode: safeJsonDecode<unknown>(null) },
);
const persistedActiveLoads = persistentMap<Record<string, PersistedLoadLease>>(
  ACTIVE_LOADS_STORAGE_PREFIX,
  {},
  {
    encode: JSON.stringify,
    decode: safeJsonDecode<PersistedLoadLease>({ version: 2, startedAt: 0, expiresAt: 0 }),
  },
);
const subscribeToUserId = (currentUserId as unknown as {
  subscribe?: (listener: (userId: string | null) => void) => () => void;
}).subscribe;
if (subscribeToUserId) {
  subscribeToUserId.call(currentUserId, (userId) => {
    if (userId === observedUserId) return;
    observedUserId = userId;
    userSessionGeneration += 1;
  });
}

function captureUserSession(): UserSession | null {
  const userId = currentUserId.get();
  // Preserve compatibility with lightweight store mocks that expose get()
  // without subscribe(); production auth transitions are observed eagerly.
  if (userId !== observedUserId) {
    observedUserId = userId;
    userSessionGeneration += 1;
  }
  return userId ? { userId, generation: userSessionGeneration } : null;
}

function isCurrentUserSession(session: UserSession): boolean {
  const current = captureUserSession();
  return current?.userId === session.userId && current.generation === session.generation;
}

function isDeletionFenced(id: string, session: UserSession): boolean {
  const fence = deletionFences.get(id);
  return fence?.session.userId === session.userId
    && fence.session.generation === session.generation;
}

function resolvedBookId(id: string, session: UserSession): string {
  const canonical = canonicalBookIds.get(id);
  return canonical?.session.userId === session.userId
    && canonical.session.generation === session.generation
    ? canonical.id
    : id;
}

function reconcileCreatedBookId(clientId: string, canonicalId: string, session: UserSession): void {
  if (clientId === canonicalId || !isCurrentUserSession(session)) return;
  // A successful explicit add is an authoritative restoration, including when
  // server-side ISBN dedup maps the client id back to a previously deleted id.
  clearPersistedDeletion(session.userId, canonicalId);
  canonicalBookIds.set(clientId, { session, id: canonicalId });

  const clientFence = deletionFences.get(clientId);
  if (clientFence?.session.userId === session.userId
    && clientFence.session.generation === session.generation) {
    deletionFences.set(canonicalId, clientFence);
  }

  const current = shelf.get();
  const clientBook = current[clientId];
  if (!clientBook) return;
  const next = { ...current };
  delete next[clientId];
  next[canonicalId] = current[canonicalId] ?? { ...clientBook, id: canonicalId };
  shelf.set(next);
}

function fencedBookIds(session: UserSession): string[] {
  const ids: string[] = [];
  for (const [id, fence] of deletionFences) {
    if (fence.session.userId === session.userId
      && fence.session.generation === session.generation) ids.push(id);
  }
  return ids;
}

function deletionMarkerKey(userId: string, bookId: string): string {
  return `${userId}\u0000${bookId}`;
}

function isFiniteTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function normalizeDeletionMarker(
  marker: PersistedDeleteMarker,
  now: number,
): PersistedDeleteMarker {
  const deletedAt = isFiniteTimestamp(marker?.deletedAt)
    && marker.deletedAt <= now + DELETION_MARKER_TTL_MS
    ? marker.deletedAt
    : now;
  const latestExpiry = deletedAt + DELETION_MARKER_TTL_MS;
  const expiresAt = isFiniteTimestamp(marker?.expiresAt)
    ? Math.min(marker.expiresAt, latestExpiry, now + DELETION_MARKER_TTL_MS)
    : Math.min(latestExpiry, now + DELETION_MARKER_TTL_MS);
  return {
    deletedAt,
    absenceConfirmed: marker?.absenceConfirmed === true,
    expiresAt,
  };
}

function normalizeLoadLease(value: PersistedLoadLease, now: number): PersistedLoadLease | null {
  if (value?.version !== 2
    || !isFiniteTimestamp(value.startedAt)
    || !isFiniteTimestamp(value.expiresAt)) return null;
  const startedAt = value.startedAt <= now + LOAD_LEASE_TTL_MS ? value.startedAt : now;
  const expiresAt = Math.min(value.expiresAt, startedAt + LEGACY_COORDINATION_TTL_MS);
  return { version: 2, startedAt, expiresAt };
}

function migrateLegacyLoadLeases(now: number): void {
  for (const [key, rawStartedAt] of Object.entries(persistedLegacyActiveLoads.get())) {
    if (!persistedActiveLoads.get()[key]) {
      const startedAt = isFiniteTimestamp(rawStartedAt)
        && rawStartedAt <= now + LEGACY_COORDINATION_TTL_MS
        ? rawStartedAt
        : now;
      persistedActiveLoads.setKey(key, {
        version: 2,
        startedAt,
        expiresAt: Math.min(startedAt + LEGACY_COORDINATION_TTL_MS, now + LEGACY_COORDINATION_TTL_MS),
      });
    }
    persistedLegacyActiveLoads.setKey(key, undefined);
  }
}

let pruningCoordination = false;

function pruneCoordination(now: number): void {
  if (pruningCoordination) return;
  pruningCoordination = true;
  try {
    migrateLegacyLoadLeases(now);
    for (const [key, rawLease] of Object.entries(persistedActiveLoads.get())) {
      const lease = normalizeLoadLease(rawLease, now);
      if (!lease || lease.expiresAt <= now) {
        persistedActiveLoads.setKey(key, undefined);
        ownedLoadLeases.delete(key);
      } else if (JSON.stringify(lease) !== JSON.stringify(rawLease)) {
        persistedActiveLoads.setKey(key, lease);
      }
    }
    for (const [key, rawMarker] of Object.entries(persistedDeletionMarkers.get())) {
      const marker = normalizeDeletionMarker(rawMarker, now);
      if ((marker.expiresAt ?? 0) <= now) {
        persistedDeletionMarkers.setKey(key, undefined);
      } else if (JSON.stringify(marker) !== JSON.stringify(rawMarker)) {
        persistedDeletionMarkers.setKey(key, marker);
      }
    }
  } finally {
    pruningCoordination = false;
  }
}

function persistedDeletionEntries(
  userId: string,
  now = Date.now(),
): Array<[string, PersistedDeleteMarker]> {
  pruneCoordination(now);
  const prefix = `${userId}\u0000`;
  return Object.entries(persistedDeletionMarkers.get())
    .filter(([key]) => key.startsWith(prefix))
    .map(([key, marker]) => [key.slice(prefix.length), marker]);
}

function persistedActiveLoadStarts(userId: string, now = Date.now()): number[] {
  pruneCoordination(now);
  const prefix = `${userId}\u0000`;
  return Object.entries(persistedActiveLoads.get())
    .filter(([key]) => key.startsWith(prefix))
    .map(([, lease]) => lease.startedAt);
}

function markDeletionPersisted(userId: string, bookIds: Iterable<string>, now = Date.now()): void {
  const newestLoadStart = Math.max(0, ...persistedActiveLoadStarts(userId, now));
  const deletedAt = Math.max(now, newestLoadStart + 1);
  for (const bookId of bookIds) {
    persistedDeletionMarkers.setKey(
      deletionMarkerKey(userId, bookId),
      { deletedAt, absenceConfirmed: false, expiresAt: deletedAt + DELETION_MARKER_TTL_MS },
    );
  }
}

function clearPersistedDeletion(userId: string, bookId: string): void {
  const key = deletionMarkerKey(userId, bookId);
  const current = persistedDeletionMarkers.get();
  if (!current[key]) return;
  persistedDeletionMarkers.setKey(key, undefined);
}

function beginPersistedLoad(userId: string, now = Date.now()): { key: string; lease: PersistedLoadLease } {
  pruneCoordination(now);
  const key = deletionMarkerKey(userId, crypto.randomUUID());
  const newestDeletion = Math.max(
    0,
    ...persistedDeletionEntries(userId, now).map(([, marker]) => marker.deletedAt),
  );
  const startedAt = Math.max(now, newestDeletion + 1);
  const lease: PersistedLoadLease = {
    version: 2,
    startedAt,
    expiresAt: startedAt + LOAD_LEASE_TTL_MS,
  };
  persistedActiveLoads.setKey(key, lease);
  ownedLoadLeases.set(key, { userId, lease });
  return { key, lease };
}

function sameLoadLease(left: PersistedLoadLease | undefined, right: PersistedLoadLease): boolean {
  return left?.version === right.version
    && left.startedAt === right.startedAt
    && left.expiresAt === right.expiresAt;
}

function isPersistedLoadLive(
  load: { key: string; lease: PersistedLoadLease },
  now = Date.now(),
): boolean {
  pruneCoordination(now);
  return load.lease.expiresAt > now
    && sameLoadLease(persistedActiveLoads.get()[load.key], load.lease);
}

function finishPersistedLoad(
  load: { key: string; lease: PersistedLoadLease },
  now = Date.now(),
): void {
  const current = persistedActiveLoads.get()[load.key];
  if (sameLoadLease(current, load.lease)) persistedActiveLoads.setKey(load.key, undefined);
  ownedLoadLeases.delete(load.key);
  pruneCoordination(now);
}

function clearConfirmedPersistedDeletions(userId: string, now = Date.now()): void {
  const activeLoadStarts = persistedActiveLoadStarts(userId, now);
  for (const [bookId, marker] of persistedDeletionEntries(userId, now)) {
    const olderLoadStillActive = activeLoadStarts.some((startedAt) => startedAt <= marker.deletedAt);
    if (marker.absenceConfirmed && !olderLoadStillActive) {
      persistedDeletionMarkers.setKey(deletionMarkerKey(userId, bookId), undefined);
    }
  }
}

export function endShelfSession(userId: string, now = Date.now()): void {
  for (const [key, owned] of ownedLoadLeases) {
    if (owned.userId !== userId) continue;
    if (sameLoadLease(persistedActiveLoads.get()[key], owned.lease)) {
      persistedActiveLoads.setKey(key, undefined);
    }
    ownedLoadLeases.delete(key);
  }
  pruneCoordination(now);
  clearConfirmedPersistedDeletions(userId, now);
}

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

let sanitizingShelf = false;

function sanitizeShelfForLiveMarkers(
  current: Record<string, Book>,
  now = Date.now(),
): void {
  if (sanitizingShelf) return;
  const session = captureUserSession();
  if (!session) return;
  pruneCoordination(now);
  const next = { ...current };
  let changed = false;
  for (const [bookId] of persistedDeletionEntries(session.userId, now)) {
    if (next[bookId]) {
      delete next[bookId];
      changed = true;
    }
  }
  if (changed) {
    sanitizingShelf = true;
    try {
      shelf.set(next);
    } finally {
      sanitizingShelf = false;
    }
  }
}

// Keep coordination listeners mounted even though these stores are not
// rendered. Every shelf write is sanitized so a stale storage event cannot
// reinsert a row while its cross-tab deletion marker is live.
void persistedDeletionMarkers.listen(() => {
  if (pruningCoordination) return;
  sanitizeShelfForLiveMarkers(shelf.get());
});
void persistedLegacyActiveLoads.listen(() => {
  if (!pruningCoordination) pruneCoordination(Date.now());
});
void persistedActiveLoads.listen(() => {
  if (!pruningCoordination) pruneCoordination(Date.now());
});
void shelf.listen((current) => sanitizeShelfForLiveMarkers(current));

// Signals when the initial shelf load has settled (success or failure), so
// the UI can tell "empty because still loading" apart from "empty because
// there really are no books." Starts false and is set true by
// loadBooksFromServer() (success or failure), or client-side the moment a
// returning user's persisted shelf is seen to be non-empty (see Bookshelf).
// NOTE: must NOT read shelf.get() here — doing so at module (global) scope
// triggers nanostores' unmount setTimeout, which Cloudflare Workers forbids
// in global scope and would 500 every cold SSR render.
export const shelfHydrated = atom<boolean>(false);

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

function rollbackNoteMutation(bookId: string, prior: Record<string, Book>): void {
  if (!shelf.get()[bookId]) {
    // A stale note response must not recreate a book removed by a concurrent
    // deletion. There is no remaining note state to roll back.
    reportSyncError(SYNC_ERROR_MESSAGE);
    return;
  }
  rollback(bookId, prior);
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

async function syncAddBook(
  book: Book,
  prior: Record<string, Book>,
  syncingFor = captureUserSession(),
): Promise<boolean> {
  if (!syncingFor) { rollback(book.id, prior); return false; }
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
    if (!isCurrentUserSession(syncingFor)) return false;
    if (!res.ok) {
      console.error('Failed to sync book:', await res.text());
      rollback(book.id, prior);
      return false;
    }
    if (typeof res.json === 'function') {
      const data = await res.json().catch(() => null) as { book?: { id?: unknown } } | null;
      if (typeof data?.book?.id === 'string') {
        reconcileCreatedBookId(book.id, data.book.id, syncingFor);
      }
    }
    return true;
  } catch (e) {
    if (!isCurrentUserSession(syncingFor)) return false;
    console.error('Failed to sync book:', e);
    rollback(book.id, prior);
    return false;
  }
}

function trackCreate(
  book: Book,
  prior: Record<string, Book>,
  syncingFor = captureUserSession(),
): Promise<boolean> {
  if (syncingFor && isDeletionFenced(book.id, syncingFor)) {
    return Promise.resolve(false);
  }
  const promise = syncAddBook(book, prior, syncingFor);
  if (!syncingFor) return promise;

  const pending: PendingCreate = { session: syncingFor, promise };
  let bookCreates = pendingCreates.get(book.id);
  if (!bookCreates) {
    bookCreates = new Set();
    pendingCreates.set(book.id, bookCreates);
  }
  bookCreates.add(pending);
  void promise.then(() => {
    const currentCreates = pendingCreates.get(book.id);
    currentCreates?.delete(pending);
    if (currentCreates?.size === 0) pendingCreates.delete(book.id);
  });
  return promise;
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

async function syncAddNote(bookId: string, note: BookNote, prior: Record<string, Book>): Promise<void> {
  if (!currentUserId.get()) { rollbackNoteMutation(bookId, prior); return; }
  try {
    const res = await fetch(`/api/books/${bookId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Send our client id so the server keeps the same identity for this note.
      body: JSON.stringify({ id: note.id, text: note.text, visibility: note.visibility }),
    });
    if (!res.ok) {
      console.error('Failed to sync note:', await res.text());
      rollbackNoteMutation(bookId, prior);
    }
  } catch (e) {
    console.error('Failed to sync note:', e);
    rollbackNoteMutation(bookId, prior);
  }
}

async function syncUpdateNote(bookId: string, noteId: string, updates: Partial<BookNote>, prior: Record<string, Book>): Promise<void> {
  if (!currentUserId.get()) { rollbackNoteMutation(bookId, prior); return; }
  try {
    const res = await fetch(`/api/books/${bookId}/notes/${noteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      console.error('Failed to sync note update:', await res.text());
      rollbackNoteMutation(bookId, prior);
    }
  } catch (e) {
    console.error('Failed to sync note update:', e);
    rollbackNoteMutation(bookId, prior);
  }
}

async function syncRemoveNote(bookId: string, noteId: string, prior: Record<string, Book>): Promise<void> {
  if (!currentUserId.get()) { rollbackNoteMutation(bookId, prior); return; }
  try {
    const res = await fetch(`/api/books/${bookId}/notes/${noteId}`, { method: 'DELETE' });
    if (!res.ok) {
      console.error('Failed to sync note removal:', await res.text());
      rollbackNoteMutation(bookId, prior);
    }
  } catch (e) {
    console.error('Failed to sync note removal:', e);
    rollbackNoteMutation(bookId, prior);
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
  const addingFor = captureUserSession();
  if (addingFor) clearPersistedDeletion(addingFor.userId, fullBook.id);
  shelf.set({ ...prior, [fullBook.id]: fullBook });
  void trackCreate(fullBook, prior, addingFor);
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

export async function removeBook(id: string): Promise<boolean> {
  const deletingFor = captureUserSession();
  if (!deletingFor) return false;
  const initiallyResolvedId = resolvedBookId(id, deletingFor);
  if (!shelf.get()[initiallyResolvedId]) return false;

  if (isDeletionFenced(id, deletingFor) || isDeletionFenced(initiallyResolvedId, deletingFor)) return false;
  const fence: DeletionFence = { session: deletingFor };
  deletionFences.set(id, fence);
  deletionFences.set(initiallyResolvedId, fence);

  try {
    // Snapshot creates only after installing the fence: pre-fence work drains
    // before DELETE, while reconciliation cannot enqueue new same-book work.
    const pending = [...(pendingCreates.get(id) ?? [])].filter(
      (create) => create.session.userId === deletingFor.userId
        && create.session.generation === deletingFor.generation,
    );
    if (pending.length > 0) {
      const created = await Promise.all(pending.map((create) => create.promise));
      if (created.some((success) => !success) || !isCurrentUserSession(deletingFor)) return false;
      if (!shelf.get()[resolvedBookId(id, deletingFor)]) return false;
    }

    if (!isCurrentUserSession(deletingFor)) return false;
    const deleteId = resolvedBookId(id, deletingFor);
    if (!shelf.get()[deleteId]) return false;
    let res: Response;
    try {
      res = await fetch(`/api/books/${deleteId}`, { method: 'DELETE' });
    } catch (e) {
      if (!isCurrentUserSession(deletingFor)) return false;
      console.error('Failed to sync book removal:', e);
      reportSyncError(SYNC_ERROR_MESSAGE);
      return false;
    }
    if (!isCurrentUserSession(deletingFor)) return false;
    // A retry may see 404 when the first DELETE committed but its response was
    // lost. For the same authenticated session, absence is the desired state.
    if (!res.ok && res.status !== 404) {
      console.error('Failed to sync book removal:', await res.text());
      reportSyncError(SYNC_ERROR_MESSAGE);
      return false;
    }

    const deletedIds = new Set([id, deleteId]);
    // Publish the cross-tab fence before the shared shelf deletion so another
    // tab cannot process the shelf event without already knowing this row is gone.
    markDeletionPersisted(deletingFor.userId, deletedIds);
    const current = shelf.get();
    const next = { ...current };
    delete next[id];
    delete next[deleteId];
    shelf.set(next);
    canonicalBookIds.delete(id);
    return true;
  } finally {
    for (const [fencedId, activeFence] of deletionFences) {
      if (activeFence === fence) deletionFences.delete(fencedId);
    }
  }
}

// ─── Custom covers ───────────────────────────────────────────────────────────
// Cover changes are NOT optimistic: the server owns the delivery URL, so the
// store is updated only after a 2xx response. Callers show their own
// in-progress state (the detail sheet disables its buttons while awaiting).

function applyCoverResult(id: string, coverUrl: string | undefined, fetchedCoverUrl?: string | null): void {
  const current = shelf.get();
  const book = current[id];
  if (!book) return;
  const next: Book = { ...book, coverUrl };
  if (fetchedCoverUrl !== undefined) {
    next.fetchedCoverUrl = fetchedCoverUrl ?? undefined;
  }
  shelf.set({ ...current, [id]: next });
}

export async function uploadCover(id: string, file: File): Promise<boolean> {
  if (!shelf.get()[id] || !currentUserId.get()) return false;
  try {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`/api/books/${id}/cover`, { method: 'POST', body: form });
    if (!res.ok) {
      console.error('Failed to upload cover:', await res.text());
      reportSyncError(COVER_SYNC_ERROR_MESSAGE);
      return false;
    }
    const data = await res.json() as { coverUrl: string; fetchedCoverUrl: string | null };
    applyCoverResult(id, data.coverUrl, data.fetchedCoverUrl);
    return true;
  } catch (e) {
    console.error('Failed to upload cover:', e);
    reportSyncError(COVER_SYNC_ERROR_MESSAGE);
    return false;
  }
}

export async function resetCover(id: string): Promise<boolean> {
  if (!shelf.get()[id] || !currentUserId.get()) return false;
  try {
    const res = await fetch(`/api/books/${id}/cover`, { method: 'DELETE' });
    if (!res.ok) {
      console.error('Failed to reset cover:', await res.text());
      reportSyncError(COVER_SYNC_ERROR_MESSAGE);
      return false;
    }
    const data = await res.json() as { coverUrl: string | null };
    applyCoverResult(id, data.coverUrl ?? undefined);
    return true;
  } catch (e) {
    console.error('Failed to reset cover:', e);
    reportSyncError(COVER_SYNC_ERROR_MESSAGE);
    return false;
  }
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
  fetchedCoverUrl: string | null;
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

function canCommitLoad(
  load: { key: string; lease: PersistedLoadLease },
  session: UserSession,
  now = Date.now(),
): boolean {
  return isCurrentUserSession(session) && isPersistedLoadLive(load, now);
}

export async function loadBooksFromServer(): Promise<void> {
  // Capture the user this load is for; if it changes mid-flight (fast re-login
  // as a different user), bail before set() so a slow response can't overwrite
  // the newer user's freshly-loaded shelf.
  const loadingSession = captureUserSession();
  if (!loadingSession) {
    shelfHydrated.set(true);
    return;
  }
  const loadingFor = loadingSession.userId;
  const persistedLoad = beginPersistedLoad(loadingFor);
  // Snapshot local shelf before the request so legacy-only books can be recovered.
  const preLoadSnapshot = shelf.get();
  try {
    const res = await fetch('/api/books?mine=true');
    if (!canCommitLoad(persistedLoad, loadingSession)) return;
    if (!res.ok) {
      reportSyncError(LOAD_SYNC_ERROR_MESSAGE);
      return;
    }
    const data = await res.json() as { books: ServerBook[] };
    if (!canCommitLoad(persistedLoad, loadingSession)) return;
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
        fetchedCoverUrl: b.fetchedCoverUrl || undefined,
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
    // A confirmed DELETE wins over pre-delete GET responses. Once every older
    // lease is gone, a post-delete GET becomes authoritative: absence retires
    // the marker, while a same-id row is accepted as a genuine restoration.
    const persistedDeletions = persistedDeletionEntries(loadingFor);
    const activeLoadStarts = persistedActiveLoadStarts(loadingFor);
    for (const [id, marker] of persistedDeletions) {
      const serverConfirmedAbsent = !serverBooks[id];
      const olderLoadStillActive = activeLoadStarts.some(
        (startedAt) => startedAt <= marker.deletedAt,
      );
      const isPostDeleteLoad = persistedLoad.lease.startedAt > marker.deletedAt;
      if (isPostDeleteLoad && !olderLoadStillActive) {
        clearPersistedDeletion(loadingFor, id);
        continue;
      }

      delete serverBooks[id];
      if (serverConfirmedAbsent && isPostDeleteLoad && !marker.absenceConfirmed) {
        persistedDeletionMarkers.setKey(
          deletionMarkerKey(loadingFor, id),
          { ...marker, absenceConfirmed: true },
        );
      }
    }
    const persistedDeletedIds = persistedDeletions.map(([id]) => id);
    const fencedIds = fencedBookIds(loadingSession);
    for (const id of fencedIds) delete serverBooks[id];
    // Legacy recovery: books that were local-only BEFORE this request started.
    // Used for uploads only — mid-flight adds (not in preLoadSnapshot) already
    // have their own syncAddBook POST in flight and must NOT be double-posted.
    const withoutDeleted = (books: Record<string, Book>): Record<string, Book> => {
      const active = { ...books };
      for (const id of persistedDeletedIds) delete active[id];
      for (const id of fencedIds) delete active[id];
      return active;
    };
    const legacyLocalOnly = findLocalOnlyBooks(withoutDeleted(preLoadSnapshot), serverBooks);
    // Use a fresh snapshot for the merge so books added via addBook() while the
    // GET was in flight are preserved (they were not in preLoadSnapshot and are
    // not on the server, but are now in shelf.get()).
    const postFetchSnapshot = shelf.get();
    const allLocalOnly = findLocalOnlyBooks(withoutDeleted(postFetchSnapshot), serverBooks);
    const merged: Record<string, Book> = { ...serverBooks };
    for (const book of allLocalOnly) merged[book.id] = book;
    // A pending delete is not optimistic: keep its current local copy visible,
    // but never classify it as recoverable or start a POST behind the fence.
    for (const id of fencedIds) {
      const fencedBook = postFetchSnapshot[id];
      if (fencedBook) merged[id] = fencedBook;
    }
    if (!canCommitLoad(persistedLoad, loadingSession)) return;
    shelf.set(merged);
    // Upload each legacy-local-only book fire-and-forget. `merged` (not
    // `serverBooks`) must be the prior snapshot: on upload failure, rollback
    // restores the book instead of deleting the only surviving copy from localStorage.
    for (const book of legacyLocalOnly) {
      if (!canCommitLoad(persistedLoad, loadingSession)) return;
      void trackCreate(book, merged, loadingSession);
    }
  } catch (e) {
    console.error('Failed to load books from server:', e);
    reportSyncError(LOAD_SYNC_ERROR_MESSAGE);
  } finally {
    finishPersistedLoad(persistedLoad);
    clearConfirmedPersistedDeletions(loadingFor);
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
