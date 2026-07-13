/**
 * Component tests for ShelfIsland: store→DOM wiring and reactive updates.
 *
 * No @testing-library/jest-dom — assertions follow the same conventions as
 * AddBookIsland.test.ts: getByText/getByRole throw on absence (self-asserting
 * presence), queryByText(...).toBeNull() for absence checks.
 *
 * BUGS FOUND (both since addressed):
 *   1. load-race: loadBooksFromServer() used a pre-fetch snapshot for its merge,
 *      so a book added while the GET was in-flight was lost on shelf.set(merged).
 *      Fixed in src/stores/shelf.ts (post-fetch snapshot for the merge); the
 *      "load-race" test below now guards the fix as a regression test.
 *   2. UX / silent filter: a book added while an ownership filter is active is
 *      silently hidden with no hint. Documented in the filter-behavior tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/svelte';
import { tick } from 'svelte';

// Must be hoisted before any import that pulls in shelf.ts
vi.mock('../../src/stores/auth', () => ({
  currentUserId: { get: () => 'test-user-123' },
}));
vi.mock('../../src/stores/topics', () => ({
  inferTopicsFromSubjects: (subjects: string[]) => subjects.slice(0, 3),
}));
vi.mock('../../src/stores/sync-status', () => ({
  reportSyncError: vi.fn(),
}));

import ShelfIsland from '../../src/components/ShelfIsland.svelte';
import {
  shelf,
  activeFilters,
  addBook,
  loadBooksFromServer,
} from '../../src/stores/shelf';
import { shelfView, setShelfView } from '../../src/stores/shelf-view';
import type { Book } from '../../src/lib/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStoreBook(overrides: Partial<Book> = {}): Book {
  return {
    id: 'b-' + Math.random().toString(36).slice(2, 9),
    title: 'Test Book',
    author: 'Test Author',
    visibility: 'visible',
    ownership: 'have',
    intents: [],
    addedVia: 'manual',
    addedAt: Date.now(),
    ...overrides,
  };
}

/**
 * Override vi.mocked(fetch) so that GET /api/books?mine=true is held open
 * until release() is called; every other URL resolves immediately.
 * Uses vi.mocked(fetch).mockImplementation so the same vi.fn that shelf.ts
 * already sees (set up in setup.ts) is updated — vi.stubGlobal cannot be used
 * here because Vite's ESM transform in the test environment captures the
 * original stub rather than the replaced global.
 */
function setupDeferredFetch(serverBooks: unknown[] = []) {
  let release!: () => void;
  const gate = new Promise<void>((r) => { release = r; });
  vi.mocked(fetch).mockImplementation(async (url: string | URL | Request) => {
    const u = String(typeof url === 'object' && 'url' in url ? (url as Request).url : url);
    if (u.includes('mine=true')) {
      await gate;
      return { ok: true, json: async () => ({ books: serverBooks }) } as unknown as Response;
    }
    return { ok: true, json: async () => ({}) } as unknown as Response;
  });
  return { release };
}

// ---------------------------------------------------------------------------

describe('ShelfIsland', () => {
  beforeEach(() => {
    shelf.set({});
    activeFilters.set({ visibility: [], ownership: [], intents: [] });
    setShelfView('details');
    // Restore the default fetch mock after any test that overrides it
    vi.mocked(fetch).mockImplementation(async () =>
      ({ ok: true, json: async () => ({}) } as unknown as Response)
    );
  });

  // ── Empty state ────────────────────────────────────────────────────────────

  describe('empty state', () => {
    it('shows "No books yet" when the shelf is empty', () => {
      render(ShelfIsland, { props: { lang: 'en' } });
      expect(screen.getByText(/No books yet/)).toBeTruthy();
    });

    it('transitions from empty to showing the book after addBook', async () => {
      render(ShelfIsland, { props: { lang: 'en' } });
      expect(screen.getByText(/No books yet/)).toBeTruthy();

      addBook({ title: 'First Book', author: 'Author', addedVia: 'manual' });

      await waitFor(() => {
        expect(screen.getByText('First Book')).toBeTruthy();
      });
      expect(screen.queryByText(/No books yet/)).toBeNull();
    });

    it('shows "No books match this filter" when books exist but all are filtered out', async () => {
      addBook({ title: 'A Have Book', author: 'Author', addedVia: 'manual', ownership: 'have' });
      render(ShelfIsland, { props: { lang: 'en' } });

      // Filter to "am seeking" — our only book is "have", so nothing passes
      const ownershipGroup = screen.getByRole('group', { name: 'Filter by ownership' });
      fireEvent.click(within(ownershipGroup).getByRole('button', { name: /am seeking/ }));

      await waitFor(() => {
        expect(screen.getByText(/No books match this filter/)).toBeTruthy();
      });
      // Book is still in the store — only hidden by the filter
      expect(Object.keys(shelf.get())).toHaveLength(1);
    });
  });

  // ── Reactive add — primary scenario for the user complaint ────────────────

  describe('reactive add', () => {
    it('a book added to the store appears in the DOM without page reload', async () => {
      render(ShelfIsland, { props: { lang: 'en' } });

      addBook({ title: 'Crime and Punishment', author: 'Dostoevsky', addedVia: 'manual', ownership: 'have' });

      await waitFor(() => {
        expect(screen.getByText('Crime and Punishment')).toBeTruthy();
      });
    });

    it('book added after a completed server load is displayed correctly', async () => {
      vi.mocked(fetch).mockImplementation(async (url: string | Request) => {
        const u = typeof url === 'string' ? url : (url as Request).url;
        if (u.includes('mine=true')) {
          return { ok: true, json: async () => ({ books: [] }) } as unknown as Response;
        }
        return { ok: true, json: async () => ({}) } as unknown as Response;
      });

      await loadBooksFromServer();
      render(ShelfIsland, { props: { lang: 'en' } });

      addBook({ title: 'Post-Load Book', author: 'Author', addedVia: 'manual', ownership: 'have' });

      await waitFor(() => {
        expect(screen.getByText('Post-Load Book')).toBeTruthy();
      });
    });

    // Regression test: loadBooksFromServer() takes preLoadSnapshot = shelf.get()
    // before the awaited fetch, then merges: merged = { ...serverBooks, ...localOnly }.
    // A book added optimistically after the snapshot but absent from the server
    // response must not be dropped by the merge. This was the suspected mechanism
    // behind "I added a book and it didn't show up."
    it(
      'book added while loadBooksFromServer is in-flight is not clobbered by the server response',
      async () => {
        const { release } = setupDeferredFetch([]); // server will return zero books

        const loadPromise = loadBooksFromServer(); // GET now in-flight

        // User adds a book while the GET is still awaiting the response
        const book = addBook({ title: 'Vanishing Act', author: 'Author', addedVia: 'manual', ownership: 'have' });
        expect(shelf.get()[book.id]).toBeTruthy();

        // Server responds with an empty book list
        release();
        await loadPromise;

        // Confirm the GET was actually issued (rules out an early-return false positive)
        expect(vi.mocked(fetch)).toHaveBeenCalledWith('/api/books?mine=true');

        // Book must survive the merge
        expect(shelf.get()[book.id]).toBeTruthy();
      }
    );
  });

  // ── Initial render from pre-seeded store ──────────────────────────────────

  describe('initial render from pre-seeded store', () => {
    it('renders three books with correct section headers, intent pills, and status badges', () => {
      shelf.set({
        'b1': makeStoreBook({ id: 'b1', title: 'The Great Gatsby', author: 'Fitzgerald', ownership: 'have', intents: ['borrowable'] }),
        'b2': makeStoreBook({ id: 'b2', title: 'Brave New World', author: 'Huxley', ownership: 'have', visibility: 'private' }),
        'b3': makeStoreBook({ id: 'b3', title: 'Foundation', author: 'Asimov', ownership: 'seeking' }),
      });

      render(ShelfIsland, { props: { lang: 'en' } });

      // All three titles are present
      expect(screen.getByText('The Great Gatsby')).toBeTruthy();
      expect(screen.getByText('Brave New World')).toBeTruthy();
      expect(screen.getByText('Foundation')).toBeTruthy();

      // Section headers are collapsible buttons (aria-expanded="true" initially)
      expect(screen.getByRole('button', { name: /Collapse books I have/ })).toBeTruthy();
      expect(screen.getByRole('button', { name: /Collapse books I am seeking/ })).toBeTruthy();

      // Gatsby has borrowable intent → rendered as a removable pill-button
      expect(screen.getByRole('button', { name: /Remove Lending intent from The Great Gatsby/ })).toBeTruthy();

      // Brave New World is private → "Private" badge visible
      expect(screen.getByText('Private')).toBeTruthy();

      // Foundation is seeking → "Seeking" badge visible
      expect(screen.getByText('Seeking')).toBeTruthy();
    });
  });

  // ── Delete from UI ────────────────────────────────────────────────────────

  describe('delete from UI', () => {
    it('confirming delete removes book from DOM and store, and issues a DELETE request', async () => {
      const book = addBook({ title: 'Deletable Book', author: 'Author', addedVia: 'manual', ownership: 'have' });
      render(ShelfIsland, { props: { lang: 'en' } });

      await waitFor(() => {
        expect(screen.getByText('Deletable Book')).toBeTruthy();
      });

      // Step 1: click the X button on the card
      fireEvent.click(screen.getByRole('button', { name: 'Delete Deletable Book from shelf' }));

      // Step 2: confirmation dialog appears — click Remove
      await waitFor(() => {
        expect(screen.getByText('Remove from shelf?')).toBeTruthy();
      });
      fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

      // Book leaves the DOM
      await waitFor(() => {
        expect(screen.queryByText('Deletable Book')).toBeNull();
      });

      // Book is gone from the store
      expect(shelf.get()[book.id]).toBeUndefined();

      // DELETE was issued to the API
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(`/api/books/${book.id}`, { method: 'DELETE' });
    });
  });

  // ── Intent change from card UI ────────────────────────────────────────────

  describe('intent change from card UI', () => {
    it('clicking an active intent pill removes it from the book and issues a PATCH', async () => {
      const book = addBook({
        title: 'Lendable Book',
        author: 'Author',
        addedVia: 'manual',
        ownership: 'have',
        intents: ['borrowable'],
      });
      render(ShelfIsland, { props: { lang: 'en' } });

      await tick(); // let the component settle

      // The "borrowable" intent is rendered as a pill-button labeled "Lending"
      const lendingPill = await screen.findByRole('button', {
        name: /Remove Lending intent from Lendable Book/,
      });
      fireEvent.click(lendingPill);

      // Store should now have no intents
      await waitFor(() => {
        expect(shelf.get()[book.id].intents).toEqual([]);
      });

      // A PATCH must have been issued for the update
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        `/api/books/${book.id}`,
        expect.objectContaining({ method: 'PATCH' }),
      );
    });
  });

  // ── Filter behavior ───────────────────────────────────────────────────────

  describe('filter behavior', () => {
    it('ownership filter hides non-matching books; clearing the filter restores all', async () => {
      shelf.set({
        'have1': makeStoreBook({ id: 'have1', title: 'I Have This', ownership: 'have' }),
        'seek1': makeStoreBook({ id: 'seek1', title: 'I Want This', ownership: 'seeking' }),
      });
      render(ShelfIsland, { props: { lang: 'en' } });

      expect(screen.getByText('I Have This')).toBeTruthy();
      expect(screen.getByText('I Want This')).toBeTruthy();

      // Activate the "am seeking" filter chip
      const ownershipGroup = screen.getByRole('group', { name: 'Filter by ownership' });
      fireEvent.click(within(ownershipGroup).getByRole('button', { name: /am seeking/ }));

      await waitFor(() => {
        expect(screen.queryByText('I Have This')).toBeNull();
      });
      expect(screen.getByText('I Want This')).toBeTruthy();

      // Clear all filters — both books return
      fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));

      await waitFor(() => {
        expect(screen.getByText('I Have This')).toBeTruthy();
        expect(screen.getByText('I Want This')).toBeTruthy();
      });
    });

    it('a newly added book matching the active filter appears immediately', async () => {
      // Seed one book so ShelfIsland is in its non-empty branch
      shelf.set({ 'seed': makeStoreBook({ id: 'seed', title: 'Seed Book', ownership: 'have' }) });
      render(ShelfIsland, { props: { lang: 'en' } });

      // Activate the "have" filter
      const ownershipGroup = screen.getByRole('group', { name: 'Filter by ownership' });
      fireEvent.click(within(ownershipGroup).getByRole('button', { name: /^have/i }));

      await waitFor(() => expect(screen.getByText('Seed Book')).toBeTruthy());

      // Add a new book that matches the active filter
      addBook({ title: 'Fresh Have Book', author: 'Author', addedVia: 'manual', ownership: 'have' });

      await waitFor(() => {
        expect(screen.getByText('Fresh Have Book')).toBeTruthy();
      });
    });

    it('a newly added book that does NOT match the active filter is silently hidden (UX gap)', async () => {
      // UX NOTE: When the user adds a "seeking" book while the "have" filter is
      // active, the book lands in the store but does not appear in the DOM. The
      // ShelfIsland gives no indication that the new book is being filtered out.
      // This is a plausible cause of "I added a book and it didn't show up" when
      // the user has inadvertently left an ownership filter active.
      // Consider adding a hint such as "N book(s) hidden by active filters."
      shelf.set({ 'seed': makeStoreBook({ id: 'seed', title: 'Seed Book', ownership: 'have' }) });
      render(ShelfIsland, { props: { lang: 'en' } });

      const ownershipGroup = screen.getByRole('group', { name: 'Filter by ownership' });
      fireEvent.click(within(ownershipGroup).getByRole('button', { name: /^have/i }));

      addBook({ title: 'Hidden Seek Book', author: 'Author', addedVia: 'manual', ownership: 'seeking' });

      // Allow reactivity to settle — book is in the store
      await waitFor(() => {
        const books = Object.values(shelf.get());
        expect(books.find((b) => b.title === 'Hidden Seek Book')).toBeTruthy();
      });

      // But NOT visible — silently filtered out with no hint to the user
      expect(screen.queryByText('Hidden Seek Book')).toBeNull();
    });
  });

  // ── Covers view ───────────────────────────────────────────────────────────

  describe('covers view', () => {
    it('renders a book spine tile after switching to covers view', async () => {
      shelf.set({
        'b1': makeStoreBook({ id: 'b1', title: 'The Great Gatsby', author: 'Fitzgerald', ownership: 'have' }),
      });
      setShelfView('covers');
      const { container } = render(ShelfIsland, { props: { lang: 'en' } });

      await waitFor(() => {
        expect(container.querySelector('[data-book-id="b1"]')).toBeTruthy();
      });
    });

    // Regression guard for the "shelf furniture" removal: .covers-row must be
    // a direct child of its <section class="shelf-section">, with no wrapping
    // shelf/ledge/bay element between them. That wrapper's full-bleed
    // `overflow-x: clip` was what swallowed the row's own horizontal scroll,
    // so its absence (plus the .covers-row class carrying the scroll CSS,
    // asserted against the component source below) is what makes the row
    // itself the working scroll container.
    it('the covers-row renders as a direct child of its section, with no shelf/ledge wrapper', async () => {
      shelf.set({
        'b1': makeStoreBook({ id: 'b1', title: 'The Great Gatsby', author: 'Fitzgerald', ownership: 'have' }),
        'b2': makeStoreBook({ id: 'b2', title: 'Foundation', author: 'Asimov', ownership: 'seeking' }),
      });
      setShelfView('covers');
      const { container } = render(ShelfIsland, { props: { lang: 'en' } });

      await waitFor(() => {
        expect(container.querySelector('[data-book-id="b1"]')).toBeTruthy();
      });

      const rows = container.querySelectorAll('.covers-row');
      expect(rows.length).toBeGreaterThan(0);

      // No shelf/ledge/bay furniture left anywhere in the tree.
      expect(container.querySelector('.shelf-bay')).toBeNull();
      expect(container.querySelector('.bay-content')).toBeNull();
      expect(container.querySelector('.ledge')).toBeNull();

      rows.forEach((row) => {
        // Direct child of the section (only .section-header is a sibling).
        expect(row.parentElement?.classList.contains('shelf-section')).toBe(true);
      });
    });

    it('the ShelfIsland source defines .covers-row as the scroll container (overflow-x: auto, flex)', async () => {
      const fs = await import('node:fs/promises');
      const path = await import('node:path');
      const src = await fs.readFile(
        path.resolve(__dirname, '../../src/components/ShelfIsland.svelte'),
        'utf-8'
      );
      const styleBlock = src.slice(src.indexOf('<style>'), src.indexOf('</style>'));
      const rowRuleMatch = styleBlock.match(/\.covers-row\s*\{[^}]*\}/);
      expect(rowRuleMatch).toBeTruthy();
      const rowRule = rowRuleMatch![0];
      expect(rowRule).toMatch(/display:\s*flex/);
      expect(rowRule).toMatch(/overflow-x:\s*auto/);
      expect(rowRule).toMatch(/width:\s*100%/);
    });
  });
});
