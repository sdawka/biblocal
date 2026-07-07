/**
 * Component-level tests for AddBookIsland: island→store wiring.
 *
 * The harness (vitest.config.ts) uses svelte({ hot: false }) + svelteTesting()
 * and jsdom. Global fetch, localStorage, and crypto.randomUUID are pre-mocked
 * in tests/setup.ts; we override fetch per-test as needed.
 *
 * Note: @testing-library/jest-dom is NOT installed; assertions use standard
 * vitest matchers. `getByText` / `getByPlaceholderText` throw if the element
 * is absent, so they self-assert presence. Negative checks use `queryByText`
 * with `.toBeNull()`.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';

// Must mock auth BEFORE any import that transitively pulls in shelf
vi.mock('../../src/stores/auth', () => ({
  currentUserId: { get: () => 'test-user-123' },
}));
vi.mock('../../src/stores/topics', () => ({
  inferTopicsFromSubjects: (subjects: string[]) => subjects.slice(0, 3),
}));
vi.mock('../../src/stores/sync-status', () => ({
  reportSyncError: vi.fn(),
}));

import AddBookIsland from '../../src/components/AddBookIsland.svelte';
import { shelf, addBook } from '../../src/stores/shelf';
import { reportSyncError } from '../../src/stores/sync-status';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VALID_ISBN = '9780140449136'; // 13-digit, real Crime & Punishment ISBN

/** Minimal Response-shaped object that satisfies both .json() and .text()
 *  (syncAddBook calls res.text() on failure). */
function makeRes(ok: boolean, data: unknown = {}): Response {
  const body = JSON.stringify(data);
  return {
    ok,
    json: async () => data,
    text: async () => body,
  } as unknown as Response;
}

/**
 * Wire the global fetch mock to serve two Open Library endpoints and then
 * a /api/books POST with a configurable ok flag.
 *
 * Open Library shape:
 *   GET /isbn/<isbn>.json  → { title, authors: [{ key }], subjects }
 *   GET /authors/<key>.json → { name }
 */
function wireFetchForIsbn({ apiOk = true }: { apiOk?: boolean } = {}): void {
  vi.mocked(fetch).mockImplementation(async (url: string | URL | Request) => {
    const u = String(url);
    if (u.includes('openlibrary.org/isbn/')) {
      return makeRes(true, {
        title: 'Crime and Punishment',
        authors: [{ key: '/authors/OL10943A' }],
        subjects: ['Fiction', 'Russian Literature'],
      });
    }
    if (u.includes('openlibrary.org/authors/')) {
      return makeRes(true, { name: 'Fyodor Dostoevsky' });
    }
    // Everything else (/api/books POST, etc.)
    return makeRes(apiOk);
  });
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('AddBookIsland', () => {
  beforeEach(() => {
    // Reset store and restore the default fetch implementation from setup.ts.
    // vi.clearAllMocks() (called in setup.ts beforeEach) clears call history
    // but not implementations, so we must re-set the default here to prevent
    // a test that overrides fetch from polluting the next test.
    shelf.set({});
    vi.mocked(fetch).mockImplementation(async () => makeRes(true, {}));
  });

  // ── 1. ISBN mode happy path ──────────────────────────────────────────────

  describe('ISBN mode happy path', () => {
    it('fetches book by ISBN, shows preview, adds to shelf store, and POSTs to /api/books', async () => {
      wireFetchForIsbn();
      render(AddBookIsland, { props: { lang: 'en' } });

      // Enter a valid ISBN
      const isbnInput = screen.getByPlaceholderText('Enter ISBN (e.g., 9780465026562)');
      fireEvent.input(isbnInput, { target: { value: VALID_ISBN } });
      fireEvent.submit(isbnInput.closest('form')!);

      // Preview card should appear with data fetched from Open Library
      await waitFor(() => {
        expect(screen.getByText('Crime and Punishment')).toBeTruthy();
        expect(screen.getByText('Fyodor Dostoevsky')).toBeTruthy();
      });

      // Click "Add to Shelf"
      fireEvent.click(screen.getByText('Add to Shelf'));

      // Book should land in the store with correct fields
      await waitFor(() => {
        const books = Object.values(shelf.get());
        expect(books).toHaveLength(1);
        const [book] = books;
        expect(book.title).toBe('Crime and Punishment');
        expect(book.author).toBe('Fyodor Dostoevsky');
        expect(book.isbn).toBe(VALID_ISBN);
        expect(book.addedVia).toBe('scan');
        expect(book.subjects).toEqual(['Fiction', 'Russian Literature']);
      });

      // syncAddBook should have issued a POST to /api/books
      await waitFor(() => {
        expect(vi.mocked(fetch)).toHaveBeenCalledWith(
          '/api/books',
          expect.objectContaining({ method: 'POST', headers: { 'Content-Type': 'application/json' } }),
        );
      });
    });
  });

  // ── 2. Manual mode happy path ────────────────────────────────────────────

  describe('Manual mode happy path', () => {
    it('fills title/author, adds to store with the exact chosen visibility and ownership', async () => {
      render(AddBookIsland, { props: { lang: 'en' } });

      // Switch to manual mode
      fireEvent.click(screen.getByText('Manual Entry'));

      const titleInput = screen.getByPlaceholderText('Book title');
      const authorInput = screen.getByPlaceholderText('Author');
      fireEvent.input(titleInput, { target: { value: 'Dune' } });
      fireEvent.input(authorInput, { target: { value: 'Frank Herbert' } });

      // Submit to reach preview
      fireEvent.submit(titleInput.closest('form')!);

      await waitFor(() => {
        expect(screen.getByText('Dune')).toBeTruthy();
        expect(screen.getByText('Frank Herbert')).toBeTruthy();
      });

      // Pick "am seeking" ownership (default is "have this")
      fireEvent.click(screen.getByText('am seeking'));

      // Pick "Private" visibility (default is "Visible")
      fireEvent.click(screen.getByText('Private'));

      fireEvent.click(screen.getByText('Add to Shelf'));

      await waitFor(() => {
        const books = Object.values(shelf.get());
        expect(books).toHaveLength(1);
        const [book] = books;
        expect(book.title).toBe('Dune');
        expect(book.author).toBe('Frank Herbert');
        expect(book.ownership).toBe('seeking');
        expect(book.visibility).toBe('private');
        expect(book.addedVia).toBe('manual');
        expect(book.isbn).toBeUndefined();
      });
    });

    it('records selected intents when ownership is "have this"', async () => {
      render(AddBookIsland, { props: { lang: 'en' } });

      fireEvent.click(screen.getByText('Manual Entry'));

      const titleInput = screen.getByPlaceholderText('Book title');
      fireEvent.input(titleInput, { target: { value: 'Neuromancer' } });
      fireEvent.input(screen.getByPlaceholderText('Author'), { target: { value: 'William Gibson' } });
      fireEvent.submit(titleInput.closest('form')!);

      await waitFor(() => expect(screen.getByText('Neuromancer')).toBeTruthy());

      // Ownership defaults to "have this" — intent buttons should be visible
      fireEvent.click(screen.getByText('Lending'));
      fireEvent.click(screen.getByText('Discussion'));

      fireEvent.click(screen.getByText('Add to Shelf'));

      await waitFor(() => {
        const [book] = Object.values(shelf.get());
        expect(book.intents).toContain('borrowable');
        expect(book.intents).toContain('discussable');
        expect(book.intents).not.toContain('giftable');
      });
    });

    it('hides intent buttons when ownership is "am seeking"', async () => {
      render(AddBookIsland, { props: { lang: 'en' } });

      fireEvent.click(screen.getByText('Manual Entry'));

      const titleInput = screen.getByPlaceholderText('Book title');
      fireEvent.input(titleInput, { target: { value: 'Foundation' } });
      fireEvent.input(screen.getByPlaceholderText('Author'), { target: { value: 'Isaac Asimov' } });
      fireEvent.submit(titleInput.closest('form')!);

      await waitFor(() => expect(screen.getByText('Foundation')).toBeTruthy());

      // Switch ownership to "am seeking"
      fireEvent.click(screen.getByText('am seeking'));
      await tick();

      // Intent buttons are only rendered when ownership === 'have'; they should be gone
      expect(screen.queryByText('Lending')).toBeNull();
      expect(screen.queryByText('Discussion')).toBeNull();
    });
  });

  // ── 3. Duplicate detection ───────────────────────────────────────────────

  describe('Duplicate detection', () => {
    it('shows the duplicate warning when the same ISBN is already on the shelf', async () => {
      wireFetchForIsbn();

      // Pre-seed the shelf with the same book
      addBook({
        title: 'Crime and Punishment',
        author: 'Fyodor Dostoevsky',
        isbn: VALID_ISBN,
        visibility: 'visible',
        ownership: 'have',
        intents: [],
        addedVia: 'scan',
      });

      render(AddBookIsland, { props: { lang: 'en' } });

      const isbnInput = screen.getByPlaceholderText('Enter ISBN (e.g., 9780465026562)');
      fireEvent.input(isbnInput, { target: { value: VALID_ISBN } });
      fireEvent.submit(isbnInput.closest('form')!);

      await waitFor(() => expect(screen.getByText('Crime and Punishment')).toBeTruthy());

      fireEvent.click(screen.getByText('Add to Shelf'));

      // Duplicate warning must appear; neither "Add Anyway" action should add a copy
      await waitFor(() => {
        expect(screen.getByText(/You already have/)).toBeTruthy();
        expect(screen.getByText('View Existing')).toBeTruthy();
        expect(screen.getByText('Add Anyway')).toBeTruthy();
      });

      // Store should still have exactly 1 book
      expect(Object.keys(shelf.get())).toHaveLength(1);
    });

    it('shows the duplicate warning when the same title/author is already on the shelf', async () => {
      addBook({
        title: 'Dune',
        author: 'Frank Herbert',
        visibility: 'visible',
        ownership: 'have',
        intents: [],
        addedVia: 'manual',
      });

      render(AddBookIsland, { props: { lang: 'en' } });

      fireEvent.click(screen.getByText('Manual Entry'));

      const titleInput = screen.getByPlaceholderText('Book title');
      fireEvent.input(titleInput, { target: { value: 'Dune' } });
      fireEvent.input(screen.getByPlaceholderText('Author'), { target: { value: 'Frank Herbert' } });
      fireEvent.submit(titleInput.closest('form')!);

      await waitFor(() => expect(screen.getByText('Dune')).toBeTruthy());

      fireEvent.click(screen.getByText('Add to Shelf'));

      await waitFor(() => {
        expect(screen.getByText(/You already have/)).toBeTruthy();
      });
      expect(Object.keys(shelf.get())).toHaveLength(1);
    });

    it('"Add Anyway" bypasses the check and adds a second copy', async () => {
      addBook({
        title: 'Dune',
        author: 'Frank Herbert',
        visibility: 'visible',
        ownership: 'have',
        intents: [],
        addedVia: 'manual',
      });

      render(AddBookIsland, { props: { lang: 'en' } });

      fireEvent.click(screen.getByText('Manual Entry'));

      const titleInput = screen.getByPlaceholderText('Book title');
      fireEvent.input(titleInput, { target: { value: 'Dune' } });
      fireEvent.input(screen.getByPlaceholderText('Author'), { target: { value: 'Frank Herbert' } });
      fireEvent.submit(titleInput.closest('form')!);

      await waitFor(() => expect(screen.getByText('Dune')).toBeTruthy());

      fireEvent.click(screen.getByText('Add to Shelf'));
      await waitFor(() => expect(screen.getByText('Add Anyway')).toBeTruthy());

      fireEvent.click(screen.getByText('Add Anyway'));

      await waitFor(() => {
        expect(Object.keys(shelf.get())).toHaveLength(2);
      });
    });
  });

  // ── 4. API failure surfacing ─────────────────────────────────────────────

  describe('API failure surfacing', () => {
    // Error surfacing is handled at the page level: a failed sync calls
    // reportSyncError() → syncError store → SyncErrorToast (mounted on
    // ShelfPage.astro via client:load). The component itself does not show an
    // inline error; the two assertions below verify the contract that makes the
    // page-level toast appear.
    it('rolls back the optimistic store entry when /api/books POST returns non-ok', async () => {
      wireFetchForIsbn({ apiOk: false });
      render(AddBookIsland, { props: { lang: 'en' } });

      const isbnInput = screen.getByPlaceholderText('Enter ISBN (e.g., 9780465026562)');
      fireEvent.input(isbnInput, { target: { value: VALID_ISBN } });
      fireEvent.submit(isbnInput.closest('form')!);

      await waitFor(() => expect(screen.getByText('Crime and Punishment')).toBeTruthy());

      fireEvent.click(screen.getByText('Add to Shelf'));

      // Book appears optimistically then is removed once the background sync fails
      await waitFor(() => {
        expect(Object.keys(shelf.get())).toHaveLength(0);
      }, { timeout: 2000 });
    });

    it('calls reportSyncError with a message when /api/books POST returns non-ok', async () => {
      wireFetchForIsbn({ apiOk: false });
      render(AddBookIsland, { props: { lang: 'en' } });

      const isbnInput = screen.getByPlaceholderText('Enter ISBN (e.g., 9780465026562)');
      fireEvent.input(isbnInput, { target: { value: VALID_ISBN } });
      fireEvent.submit(isbnInput.closest('form')!);

      await waitFor(() => expect(screen.getByText('Crime and Punishment')).toBeTruthy());

      fireEvent.click(screen.getByText('Add to Shelf'));

      // reportSyncError being called with a non-empty string is the contract that
      // drives the page-level SyncErrorToast to surface the failure to the user.
      await waitFor(() => {
        expect(vi.mocked(reportSyncError)).toHaveBeenCalledWith(expect.any(String));
      }, { timeout: 2000 });
    });
  });

  // ── 5. Invalid ISBN handling ─────────────────────────────────────────────

  describe('Invalid ISBN handling', () => {
    it('shows a validation error for garbage input, makes no OL request, adds nothing to store', async () => {
      render(AddBookIsland, { props: { lang: 'en' } });

      const isbnInput = screen.getByPlaceholderText('Enter ISBN (e.g., 9780465026562)');
      fireEvent.input(isbnInput, { target: { value: 'not-an-isbn' } });
      fireEvent.submit(isbnInput.closest('form')!);

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid 10 or 13 digit ISBN')).toBeTruthy();
      });

      // Nothing should have been added to the store
      expect(Object.keys(shelf.get())).toHaveLength(0);

      // No Open Library call should have been made
      const olCalls = vi.mocked(fetch).mock.calls.filter(([url]) =>
        String(url).includes('openlibrary.org'),
      );
      expect(olCalls).toHaveLength(0);
    });

    it('shows a validation error for a partial ISBN (too few digits)', async () => {
      render(AddBookIsland, { props: { lang: 'en' } });

      const isbnInput = screen.getByPlaceholderText('Enter ISBN (e.g., 9780465026562)');
      fireEvent.input(isbnInput, { target: { value: '12345' } });
      fireEvent.submit(isbnInput.closest('form')!);

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid 10 or 13 digit ISBN')).toBeTruthy();
      });
    });
  });

  // ── 6. Open Library lookup failure ──────────────────────────────────────

  describe('Open Library lookup failure', () => {
    it('shows "Book not found" and switches to manual mode when OL returns a non-ok response', async () => {
      vi.mocked(fetch).mockImplementation(async (url: string | URL | Request) => {
        if (String(url).includes('openlibrary.org/isbn/')) {
          return makeRes(false);
        }
        return makeRes(true);
      });

      render(AddBookIsland, { props: { lang: 'en' } });

      const isbnInput = screen.getByPlaceholderText('Enter ISBN (e.g., 9780465026562)');
      fireEvent.input(isbnInput, { target: { value: VALID_ISBN } });
      fireEvent.submit(isbnInput.closest('form')!);

      await waitFor(() => {
        expect(screen.getByText('Book not found. Try manual entry.')).toBeTruthy();
      });

      // Component switches to manual mode — "Preview Book" button should be present
      const previewBtn = screen.getByText('Preview Book') as HTMLButtonElement;
      expect(previewBtn.disabled).toBe(false);

      // Store untouched
      expect(Object.keys(shelf.get())).toHaveLength(0);
    });

    it('shows "Book not found" and clears loading state when the network call throws', async () => {
      vi.mocked(fetch).mockImplementation(async (url: string | URL | Request) => {
        if (String(url).includes('openlibrary.org/isbn/')) {
          throw new TypeError('Failed to fetch');
        }
        return makeRes(true);
      });

      render(AddBookIsland, { props: { lang: 'en' } });

      const isbnInput = screen.getByPlaceholderText('Enter ISBN (e.g., 9780465026562)');
      fireEvent.input(isbnInput, { target: { value: VALID_ISBN } });
      fireEvent.submit(isbnInput.closest('form')!);

      await waitFor(() => {
        expect(screen.getByText('Book not found. Try manual entry.')).toBeTruthy();
      });

      // "Looking up…" text (loading=true state) must be gone
      expect(screen.queryByText('Looking up…')).toBeNull();

      // Store untouched
      expect(Object.keys(shelf.get())).toHaveLength(0);
    });
  });
});
