# Book Delete & Duplicate Prevention Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add swipe-to-delete on mobile, hover-to-delete on desktop, and duplicate detection when adding books.

**Architecture:** Extend BookCard with touch/hover interactions that reveal a delete action. Add `findDuplicate()` helper to shelf store. Wire duplicate check into AddBookIsland's confirmation flow.

**Tech Stack:** Svelte 5, nanostores, CSS transforms for swipe gesture, touch events API

---

## File Structure

| File | Purpose |
|------|---------|
| `src/stores/shelf.ts` | Add `findDuplicate()` helper and `normalizeString()` utility |
| `src/components/BookCard.svelte` | Add swipe (mobile) and hover (desktop) delete UI |
| `src/components/ShelfIsland.svelte` | Wire `onDelete` callback to `removeBook` |
| `src/components/AddBookIsland.svelte` | Add duplicate check and warning UI with "View Existing" / "Add Anyway" |
| `tests/stores/shelf.test.ts` | Add tests for `findDuplicate()` |

---

### Task 1: Add `findDuplicate()` to shelf store

**Files:**
- Modify: `src/stores/shelf.ts`
- Test: `tests/stores/shelf.test.ts`

- [ ] **Step 1: Write the failing tests for `findDuplicate()`**

Add to `tests/stores/shelf.test.ts`:

```typescript
describe('findDuplicate', () => {
  beforeEach(() => {
    shelf.set({});
  });

  it('returns null when shelf is empty', () => {
    const result = findDuplicate('9780140449136', 'Crime and Punishment', 'Dostoevsky');
    expect(result).toBeNull();
  });

  it('finds duplicate by ISBN', () => {
    const book = addBook({
      title: 'Crime and Punishment',
      author: 'Fyodor Dostoevsky',
      isbn: '9780140449136',
      ownership: 'have',
      intents: [],
      addedVia: 'manual',
    });

    const result = findDuplicate('9780140449136', 'Different Title', 'Different Author');
    expect(result).toEqual(book);
  });

  it('finds duplicate by normalized title and author', () => {
    const book = addBook({
      title: 'Crime and Punishment',
      author: 'Fyodor Dostoevsky',
      ownership: 'have',
      intents: [],
      addedVia: 'manual',
    });

    const result = findDuplicate(undefined, '  CRIME AND PUNISHMENT  ', 'fyodor  dostoevsky');
    expect(result).toEqual(book);
  });

  it('returns null when no match', () => {
    addBook({
      title: 'Crime and Punishment',
      author: 'Fyodor Dostoevsky',
      isbn: '9780140449136',
      ownership: 'have',
      intents: [],
      addedVia: 'manual',
    });

    const result = findDuplicate(undefined, 'The Brothers Karamazov', 'Fyodor Dostoevsky');
    expect(result).toBeNull();
  });

  it('skips ISBN check when book has no ISBN', () => {
    addBook({
      title: 'My Book',
      author: 'Some Author',
      ownership: 'have',
      intents: [],
      addedVia: 'manual',
    });

    const result = findDuplicate('9781234567890', 'My Book', 'Some Author');
    expect(result).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:run -- tests/stores/shelf.test.ts`

Expected: FAIL with "findDuplicate is not defined" or similar

- [ ] **Step 3: Add import for `findDuplicate` in test file**

Update the import statement in `tests/stores/shelf.test.ts`:

```typescript
import {
  shelf,
  activeFilter,
  addBook,
  updateBook,
  updateBookStatus,
  removeBook,
  getBookCount,
  getShelfStats,
  getInferredTopics,
  findDuplicate,
} from '../../src/stores/shelf';
```

- [ ] **Step 4: Implement `findDuplicate()` in shelf store**

Add to `src/stores/shelf.ts` after the `getInferredTopics` function:

```typescript
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test:run -- tests/stores/shelf.test.ts`

Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/stores/shelf.ts tests/stores/shelf.test.ts
git commit -m "feat(shelf): add findDuplicate() for duplicate detection"
```

---

### Task 2: Add delete UI to BookCard (desktop hover)

**Files:**
- Modify: `src/components/BookCard.svelte`

- [ ] **Step 1: Add `onDelete` prop and confirmation state**

Update the Props interface and add state in `src/components/BookCard.svelte`:

```typescript
interface Props {
  book: Book;
  onIntentsChange?: (intents: BookIntent[]) => void;
  onVisibilityChange?: (visibility: BookVisibility) => void;
  onOwnershipChange?: (ownership: BookOwnership) => void;
  onDelete?: (id: string) => void;
  readonly?: boolean;
}

let { book, onIntentsChange, onVisibilityChange, onOwnershipChange, onDelete, readonly = false }: Props = $props();

let showDeleteConfirm = $state(false);

function handleDeleteClick() {
  showDeleteConfirm = true;
}

function confirmDelete() {
  onDelete?.(book.id);
  showDeleteConfirm = false;
}

function cancelDelete() {
  showDeleteConfirm = false;
}
```

- [ ] **Step 2: Add delete button to template (desktop hover)**

Add inside the `.book-card` article, after the `.info` div:

```svelte
{#if !readonly && onDelete}
  <button
    class="delete-btn"
    onclick={handleDeleteClick}
    aria-label="Delete {book.title} from shelf"
  >
    ✕
  </button>

  {#if showDeleteConfirm}
    <div class="delete-confirm">
      <p>Remove from shelf?</p>
      <div class="delete-actions">
        <button class="btn-cancel" onclick={cancelDelete}>Cancel</button>
        <button class="btn-remove" onclick={confirmDelete}>Remove</button>
      </div>
    </div>
  {/if}
{/if}
```

- [ ] **Step 3: Add styles for delete button and confirmation**

Add to the `<style>` block:

```css
.delete-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  color: var(--color-ink-faded);
  background: var(--color-cream);
  border: 1px solid var(--color-gold-pale);
  border-radius: 50%;
  cursor: pointer;
  opacity: 0;
  transition: all var(--transition-quick);
  z-index: 2;
}

.book-card:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  color: var(--color-cream);
  background: var(--color-burgundy);
  border-color: var(--color-burgundy-dark);
}

.delete-confirm {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  background: rgba(253, 250, 243, 0.95);
  border-radius: var(--radius-md);
  z-index: 3;
}

.delete-confirm p {
  margin: 0;
  font-family: var(--font-display);
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-ink);
}

.delete-actions {
  display: flex;
  gap: 0.5rem;
}

.delete-confirm .btn-cancel {
  padding: 0.5rem 1rem;
  font-family: var(--font-display);
  font-size: 0.85rem;
  color: var(--color-ink-faded);
  background: var(--color-paper);
  border: 1px solid var(--color-gold-pale);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-quick);
}

.delete-confirm .btn-cancel:hover {
  border-color: var(--color-gold);
  color: var(--color-ink);
}

.delete-confirm .btn-remove {
  padding: 0.5rem 1rem;
  font-family: var(--font-display);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-cream);
  background: var(--color-burgundy);
  border: 1px solid var(--color-burgundy-dark);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-quick);
}

.delete-confirm .btn-remove:hover {
  background: var(--color-burgundy-dark);
}
```

- [ ] **Step 4: Run type check**

Run: `npx astro check`

Expected: No TypeScript errors

- [ ] **Step 5: Commit**

```bash
git add src/components/BookCard.svelte
git commit -m "feat(BookCard): add hover delete button with confirmation"
```

---

### Task 3: Add swipe-to-delete for mobile

**Files:**
- Modify: `src/components/BookCard.svelte`

- [ ] **Step 1: Add swipe state and touch handlers**

Add to the script section after the existing state:

```typescript
let swipeX = $state(0);
let startX = $state(0);
let isSwiping = $state(false);
const SWIPE_THRESHOLD = 80;

function handleTouchStart(e: TouchEvent) {
  if (readonly || !onDelete) return;
  startX = e.touches[0].clientX;
  isSwiping = true;
}

function handleTouchMove(e: TouchEvent) {
  if (!isSwiping) return;
  const currentX = e.touches[0].clientX;
  const diff = startX - currentX;
  // Only allow left swipe, cap at threshold
  swipeX = Math.min(Math.max(diff, 0), SWIPE_THRESHOLD);
}

function handleTouchEnd() {
  if (!isSwiping) return;
  isSwiping = false;
  // Snap to threshold or back to 0
  if (swipeX >= SWIPE_THRESHOLD * 0.6) {
    swipeX = SWIPE_THRESHOLD;
  } else {
    swipeX = 0;
  }
}

function handleSwipeDelete() {
  onDelete?.(book.id);
  swipeX = 0;
}
```

- [ ] **Step 2: Update the article element with swipe handlers**

Replace the opening `<article>` tag:

```svelte
<article
  class="book-card"
  class:seeking={book.ownership === 'seeking'}
  ontouchstart={handleTouchStart}
  ontouchmove={handleTouchMove}
  ontouchend={handleTouchEnd}
  style="transform: translateX(-{swipeX}px)"
>
```

- [ ] **Step 3: Add swipe delete action behind the card**

Add right before the closing `</article>` tag (inside the article):

```svelte
{#if !readonly && onDelete && swipeX > 0}
  <button
    class="swipe-delete"
    style="width: {swipeX}px"
    onclick={handleSwipeDelete}
    aria-label="Delete {book.title}"
  >
    Delete
  </button>
{/if}
```

- [ ] **Step 4: Add swipe styles**

Add to the `<style>` block:

```css
.book-card {
  /* Add to existing .book-card rule */
  touch-action: pan-y;
  transition: transform var(--transition-quick);
}

.swipe-delete {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  transform: translateX(100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-cream);
  background: var(--color-burgundy);
  border: none;
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  cursor: pointer;
  min-width: 60px;
}
```

- [ ] **Step 5: Run dev server and test on mobile**

Run: `npm run dev`

Test: Open on mobile device or use browser dev tools mobile emulation. Swipe left on a book card to reveal delete action.

- [ ] **Step 6: Commit**

```bash
git add src/components/BookCard.svelte
git commit -m "feat(BookCard): add swipe-to-delete for mobile"
```

---

### Task 4: Wire up delete in ShelfIsland

**Files:**
- Modify: `src/components/ShelfIsland.svelte`

- [ ] **Step 1: Import `removeBook` from store**

Update the import in `src/components/ShelfIsland.svelte`:

```typescript
import {
  shelf,
  activeFilters,
  bookMatchesFilters,
  updateBookIntents,
  toggleOwnershipFilter,
  toggleIntentFilter,
  toggleVisibilityFilter,
  clearAllFilters,
  removeBook,
} from '../stores/shelf';
```

- [ ] **Step 2: Add delete handler**

Add after the existing imports and state:

```typescript
function handleDeleteBook(id: string) {
  removeBook(id);
}
```

- [ ] **Step 3: Pass `onDelete` to BookCard in "Books I Have" section**

Update the BookCard in the "booksIHave" section:

```svelte
<BookCard
  {book}
  onIntentsChange={(intents) => updateBookIntents(book.id, intents)}
  onDelete={handleDeleteBook}
/>
```

- [ ] **Step 4: Pass `onDelete` to BookCard in "Books I'm Seeking" section**

Update the BookCard in the "booksImSeeking" section:

```svelte
<BookCard
  {book}
  onIntentsChange={(intents) => updateBookIntents(book.id, intents)}
  onDelete={handleDeleteBook}
/>
```

- [ ] **Step 5: Run dev server and test delete**

Run: `npm run dev`

Test: Hover over a book card on desktop and click delete. Confirm the book is removed.

- [ ] **Step 6: Commit**

```bash
git add src/components/ShelfIsland.svelte
git commit -m "feat(ShelfIsland): wire up book delete callback"
```

---

### Task 5: Add duplicate detection to AddBookIsland

**Files:**
- Modify: `src/components/AddBookIsland.svelte`

- [ ] **Step 1: Import `findDuplicate` and add state**

Update imports in `src/components/AddBookIsland.svelte`:

```typescript
import { addBook, findDuplicate, shelf } from '../stores/shelf';
```

Add state after existing state declarations:

```typescript
import type { Book, BookVisibility, BookOwnership, BookIntent } from '../lib/types';

let duplicateBook: Book | null = $state(null);
```

- [ ] **Step 2: Add duplicate check in `confirmAdd`**

Replace the `confirmAdd` function:

```typescript
function confirmAdd() {
  if (!previewBook) return;

  // Check for duplicate
  const existing = findDuplicate(previewBook.isbn, previewBook.title, previewBook.author);
  if (existing) {
    duplicateBook = existing;
    return;
  }

  doAdd();
}

function doAdd() {
  if (!previewBook) return;

  addBook({
    title: previewBook.title,
    author: previewBook.author,
    isbn: previewBook.isbn,
    coverUrl: previewBook.coverUrl,
    subjects: previewBook.subjects,
    visibility,
    ownership,
    intents,
    addedVia: previewBook.isbn ? 'scan' : 'manual',
  });

  resetForm();
}

function addAnyway() {
  duplicateBook = null;
  doAdd();
}

function viewExisting() {
  if (!duplicateBook) return;
  const bookId = duplicateBook.id;
  resetForm();
  
  // Scroll to and highlight the existing book
  setTimeout(() => {
    const card = document.querySelector(`[data-book-id="${bookId}"]`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('highlight-pulse');
      setTimeout(() => card.classList.remove('highlight-pulse'), 1000);
    }
  }, 100);
}
```

- [ ] **Step 3: Update `resetForm` to clear duplicate state**

Update the `resetForm` function to include:

```typescript
function resetForm() {
  isbn = '';
  title = '';
  author = '';
  error = '';
  visibility = 'visible';
  ownership = 'have';
  intents = [];
  previewBook = null;
  duplicateBook = null;
  mode = 'isbn';
}
```

- [ ] **Step 4: Add duplicate warning UI**

Add after the preview-actions div (before the `{:else}` that starts entry mode):

```svelte
{#if duplicateBook}
  <div class="duplicate-warning">
    <p>You already have <strong>{duplicateBook.title}</strong> on your shelf.</p>
    <div class="duplicate-actions">
      <button type="button" class="btn-view" onclick={viewExisting}>
        View Existing
      </button>
      <button type="button" class="btn-add-anyway" onclick={addAnyway}>
        Add Anyway
      </button>
    </div>
  </div>
{/if}
```

- [ ] **Step 5: Add duplicate warning styles**

Add to the `<style>` block:

```css
.duplicate-warning {
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(139, 35, 50, 0.08);
  border: 1px solid var(--color-burgundy);
  border-radius: var(--radius-sm);
}

.duplicate-warning p {
  margin: 0 0 0.75rem;
  font-family: var(--font-body);
  font-size: 0.9rem;
  color: var(--color-burgundy-dark);
}

.duplicate-warning strong {
  font-weight: 600;
}

.duplicate-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-view {
  flex: 1;
  padding: 0.5rem 1rem;
  font-family: var(--font-display);
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-forest);
  background: var(--color-paper);
  border: 1px solid var(--color-forest);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-quick);
}

.btn-view:hover {
  background: var(--color-forest);
  color: var(--color-cream);
}

.btn-add-anyway {
  flex: 1;
  padding: 0.5rem 1rem;
  font-family: var(--font-display);
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-ink-faded);
  background: var(--color-paper);
  border: 1px solid var(--color-gold-pale);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-quick);
}

.btn-add-anyway:hover {
  border-color: var(--color-gold);
  color: var(--color-ink);
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/AddBookIsland.svelte
git commit -m "feat(AddBookIsland): add duplicate detection with warning UI"
```

---

### Task 6: Add highlight pulse animation and data attribute

**Files:**
- Modify: `src/components/BookCard.svelte`

- [ ] **Step 1: Add `data-book-id` attribute to BookCard**

Update the `<article>` opening tag in `src/components/BookCard.svelte`:

```svelte
<article
  class="book-card"
  class:seeking={book.ownership === 'seeking'}
  data-book-id={book.id}
  ontouchstart={handleTouchStart}
  ontouchmove={handleTouchMove}
  ontouchend={handleTouchEnd}
  style="transform: translateX(-{swipeX}px)"
>
```

- [ ] **Step 2: Add highlight pulse animation**

Add to the `<style>` block:

```css
:global(.book-card.highlight-pulse) {
  animation: highlightPulse 1s ease-out;
}

@keyframes highlightPulse {
  0% {
    box-shadow: 0 0 0 0 var(--color-gold);
  }
  50% {
    box-shadow: 0 0 0 4px var(--color-gold);
  }
  100% {
    box-shadow: var(--shadow-resting);
  }
}
```

- [ ] **Step 3: Run dev server and test full flow**

Run: `npm run dev`

Test:
1. Add a book via ISBN or manual entry
2. Try to add the same book again
3. See duplicate warning
4. Click "View Existing" and verify scroll + highlight

- [ ] **Step 4: Commit**

```bash
git add src/components/BookCard.svelte
git commit -m "feat(BookCard): add data-book-id and highlight pulse animation"
```

---

### Task 7: Run full test suite and verify

**Files:**
- None (verification only)

- [ ] **Step 1: Run all tests**

Run: `npm run test:run`

Expected: All tests pass

- [ ] **Step 2: Run type check**

Run: `npx astro check`

Expected: No TypeScript errors

- [ ] **Step 3: Test on dev server**

Run: `npm run dev`

Manual tests:
1. Desktop: Hover book card → see delete button → click → confirm → book removed
2. Mobile: Swipe left on book card → see Delete action → tap → book removed
3. Add book: Enter duplicate ISBN → see warning → click "Add Anyway" → adds second copy
4. Add book: Enter duplicate title/author → see warning → click "View Existing" → scrolls to book with pulse

- [ ] **Step 4: Final commit if any fixes needed**

If fixes were needed, commit them appropriately.
