# Book Intake & Profile Auto-Construction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace single-value book status with three orthogonal dimensions (visibility, ownership, intents), streamline intake UX to pill chips, and auto-construct profile from shelf data.

**Architecture:** Schema migration adds three new columns, deprecates `status`. Frontend replaces dropdown with pill chips. Profile derives lending personality from intent frequency.

**Tech Stack:** Astro 6, Svelte 5, D1 (SQLite), Drizzle ORM, nanostores

---

## Parallel Execution Map

```
Task 1: Types & Schema (BLOCKING - run first)
         │
         ├──────────────────┬─────────────────┬─────────────────┐
         ▼                  ▼                 ▼                 ▼
Task 2: Shelf Store   Task 3: API Routes  Task 4: Matching  Task 5: Profile Store
    (parallel)           (parallel)         (parallel)         (parallel)
         │                  │                 │                 │
         └──────────────────┴─────────────────┴─────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
            Task 6: AddBook   Task 7: BookCard   Task 8: ShelfIsland
               Island          (parallel)          (parallel)
                    │               │               │
                    └───────────────┴───────────────┘
                                    │
                                    ▼
                          Task 9: ProfileIsland
                                    │
                                    ▼
                          Task 10: Migration Script
```

---

## Task 1: Types & Schema Foundation

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/db/schema.ts`

**Depends on:** Nothing (run first)

- [ ] **Step 1: Update types.ts with new model**

```typescript
// src/lib/types.ts - replace BookStatus and Book interface

export type BookVisibility = 'private' | 'visible';
export type BookOwnership = 'have' | 'seeking';
export type BookIntent = 'borrowable' | 'discussable' | 'giftable' | 'class-resource';

// Keep for migration compatibility
export type BookStatus =
  | 'private'
  | 'visible'
  | 'borrowable'
  | 'discussable'
  | 'giftable'
  | 'class-resource'
  | 'seeking-home';

export interface Book {
  id: string;
  isbn?: string;
  title: string;
  author: string;
  visibility: BookVisibility;
  ownership: BookOwnership;
  intents: BookIntent[];
  notes?: string;
  coverUrl?: string;
  subjects?: string[];
  addedVia: 'scan' | 'manual';
  addedAt: number;
}
```

- [ ] **Step 2: Update schema.ts with new columns**

```typescript
// src/db/schema.ts - update books table

export const books = sqliteTable('books', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  author: text('author').notNull(),
  isbn: text('isbn'),
  coverUrl: text('cover_url'),
  // New three-dimension model
  visibility: text('visibility').notNull().default('visible'),
  ownership: text('ownership').notNull().default('have'),
  intents: text('intents').default('[]'), // JSON array
  // Keep status for migration period
  status: text('status'),
  addedVia: text('added_via').default('manual'),
  subjects: text('subjects'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
```

- [ ] **Step 3: Create migration file**

Create `migrations/0003_book_intents.sql`:

```sql
-- Add new columns
ALTER TABLE books ADD COLUMN visibility TEXT NOT NULL DEFAULT 'visible';
ALTER TABLE books ADD COLUMN ownership TEXT NOT NULL DEFAULT 'have';
ALTER TABLE books ADD COLUMN intents TEXT DEFAULT '[]';

-- Migrate existing data from status to new columns
UPDATE books SET visibility = 'private', ownership = 'have', intents = '[]' WHERE status = 'private';
UPDATE books SET visibility = 'visible', ownership = 'have', intents = '[]' WHERE status = 'visible';
UPDATE books SET visibility = 'visible', ownership = 'have', intents = '["borrowable"]' WHERE status = 'borrowable';
UPDATE books SET visibility = 'visible', ownership = 'have', intents = '["discussable"]' WHERE status = 'discussable';
UPDATE books SET visibility = 'visible', ownership = 'have', intents = '["giftable"]' WHERE status = 'giftable';
UPDATE books SET visibility = 'visible', ownership = 'have', intents = '["class-resource"]' WHERE status = 'class-resource';
UPDATE books SET visibility = 'visible', ownership = 'seeking', intents = '[]' WHERE status = 'seeking-home';

-- Set defaults for any NULL values
UPDATE books SET visibility = 'visible' WHERE visibility IS NULL;
UPDATE books SET ownership = 'have' WHERE ownership IS NULL;
UPDATE books SET intents = '[]' WHERE intents IS NULL;
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts src/db/schema.ts migrations/0003_book_intents.sql
git commit -m "feat: add three-dimension book model (visibility, ownership, intents)"
```

---

## Task 2: Shelf Store Updates

**Files:**
- Modify: `src/stores/shelf.ts`

**Depends on:** Task 1

- [ ] **Step 1: Update store types and filter**

Replace the `activeFilter` type and add intent helpers:

```typescript
// src/stores/shelf.ts - update imports and filter type
import type { Book, BookVisibility, BookOwnership, BookIntent } from '../lib/types';

export type ShelfFilter = 'all' | 'lending' | 'discussing' | 'gifting' | 'seeking' | 'private';

export const activeFilter = persistentAtom<ShelfFilter>('biblocal:filter:v2', 'all');

// Helper to check if book matches filter
export function bookMatchesFilter(book: Book, filter: ShelfFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'private') return book.visibility === 'private';
  if (filter === 'seeking') return book.ownership === 'seeking';
  if (filter === 'lending') return book.intents.includes('borrowable');
  if (filter === 'discussing') return book.intents.includes('discussable');
  if (filter === 'gifting') return book.intents.includes('giftable');
  return true;
}
```

- [ ] **Step 2: Update sync functions for new fields**

```typescript
// src/stores/shelf.ts - update syncAddBook
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
```

- [ ] **Step 3: Update loadBooksFromServer**

```typescript
// src/stores/shelf.ts - update ServerBook interface and mapping
interface ServerBook {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  coverUrl: string | null;
  visibility: string;
  ownership: string;
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
        visibility: (b.visibility || 'visible') as BookVisibility,
        ownership: (b.ownership || 'have') as BookOwnership,
        intents: b.intents ? JSON.parse(b.intents) : [],
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
```

- [ ] **Step 4: Update getShelfStats**

```typescript
// src/stores/shelf.ts - update stats to use intents
export function getShelfStats(): ShelfStats {
  const books = Object.values(shelf.get());
  return {
    total: books.length,
    lendable: books.filter(b => b.intents.includes('borrowable') || b.intents.includes('giftable')).length,
    discussable: books.filter(b => b.intents.includes('discussable')).length,
  };
}
```

- [ ] **Step 5: Remove updateBookStatus, add updateBookIntents**

```typescript
// src/stores/shelf.ts - replace updateBookStatus
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
  const book = shelf.get()[id];
  if (!book) return;
  const intents = book.intents.includes(intent)
    ? book.intents.filter(i => i !== intent)
    : [...book.intents, intent];
  updateBook(id, { intents });
}
```

- [ ] **Step 6: Commit**

```bash
git add src/stores/shelf.ts
git commit -m "feat: update shelf store for three-dimension book model"
```

---

## Task 3: API Routes Updates

**Files:**
- Modify: `src/pages/api/books/index.ts`
- Modify: `src/pages/api/books/[id].ts`

**Depends on:** Task 1
**Can run parallel with:** Tasks 2, 4, 5

- [ ] **Step 1: Update POST /api/books**

```typescript
// src/pages/api/books/index.ts - update body type and book creation
const body = (await request.json()) as {
  id?: string;
  title?: string;
  author?: string;
  isbn?: string;
  coverUrl?: string;
  visibility?: string;
  ownership?: string;
  intents?: string[];
  addedVia?: string;
  subjects?: string[];
  notes?: string;
};

if (!body.title || !body.author) {
  return new Response(JSON.stringify({ error: 'Title and author required' }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}

const now = new Date();
const book = {
  id: body.id || generateId(),
  userId: auth.userId,
  title: body.title,
  author: body.author,
  isbn: body.isbn || null,
  coverUrl: body.coverUrl || null,
  visibility: body.visibility || 'visible',
  ownership: body.ownership || 'have',
  intents: body.intents ? JSON.stringify(body.intents) : '[]',
  addedVia: body.addedVia || 'manual',
  subjects: body.subjects ? JSON.stringify(body.subjects) : null,
  notes: body.notes || null,
  createdAt: now,
  updatedAt: now,
};
```

- [ ] **Step 2: Update PATCH /api/books/[id]**

Read `src/pages/api/books/[id].ts` and add visibility, ownership, intents to allowed update fields:

```typescript
// In the PATCH handler, add these fields
if (body.visibility !== undefined) updates.visibility = body.visibility;
if (body.ownership !== undefined) updates.ownership = body.ownership;
if (body.intents !== undefined) {
  updates.intents = Array.isArray(body.intents) ? JSON.stringify(body.intents) : body.intents;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/api/books/index.ts src/pages/api/books/[id].ts
git commit -m "feat: API routes accept new book model fields"
```

---

## Task 4: Matching Algorithm Updates

**Files:**
- Modify: `src/lib/matching.ts`

**Depends on:** Task 1
**Can run parallel with:** Tasks 2, 3, 5

- [ ] **Step 1: Update calcShelfTwin**

```typescript
// src/lib/matching.ts - shelf twin only counts books both users "have"
function calcShelfTwin(myBooks: Book[], theirBooks: Book[]): MatchFacet {
  const myIsbns = new Set(
    myBooks
      .filter(b => b.ownership === 'have')
      .map(b => b.isbn)
      .filter(Boolean)
  );
  const shared = theirBooks.filter(
    b => b.isbn && b.ownership === 'have' && myIsbns.has(b.isbn)
  );
  return {
    count: shared.length,
    items: shared.map(b => b.title),
  };
}
```

- [ ] **Step 2: Update calcReadingMentor**

```typescript
// src/lib/matching.ts - reading mentor uses discussable intent
function calcReadingMentor(myBooks: Book[], theirBooks: Book[]): MatchFacet {
  const myWants = new Set(
    myBooks
      .filter(b => b.ownership === 'seeking')
      .map(b => b.isbn)
      .filter(Boolean)
  );
  const theyHave = theirBooks.filter(
    b =>
      b.isbn &&
      b.ownership === 'have' &&
      myWants.has(b.isbn) &&
      (b.intents.includes('borrowable') || b.intents.includes('discussable'))
  );
  return {
    count: theyHave.length,
    items: theyHave.map(b => b.title),
  };
}
```

- [ ] **Step 3: Update calcLocalSource with intent alignment**

```typescript
// src/lib/matching.ts - local source with intent alignment boost
function calcLocalSource(myBooks: Book[], theirBooks: Book[]): MatchFacet {
  const mySeekingBooks = myBooks.filter(b => b.ownership === 'seeking');
  const myWants = new Map(
    mySeekingBooks
      .filter(b => b.isbn)
      .map(b => [b.isbn!, b])
  );
  
  const matches: Book[] = [];
  for (const theirBook of theirBooks) {
    if (!theirBook.isbn || theirBook.ownership !== 'have') continue;
    const myBook = myWants.get(theirBook.isbn);
    if (!myBook) continue;
    
    // Check intent alignment: seeker wants borrow/gift, owner offers it
    const canBorrow = theirBook.intents.includes('borrowable');
    const canGift = theirBook.intents.includes('giftable');
    if (canBorrow || canGift) {
      matches.push(theirBook);
    }
  }
  
  return {
    count: matches.length,
    items: matches.map(b => b.title),
  };
}
```

- [ ] **Step 4: Update calcClassChain**

```typescript
// src/lib/matching.ts - class chain uses class-resource intent
function calcClassChain(myBooks: Book[], theirBooks: Book[]): MatchFacet {
  const myClassIsbns = new Set(
    myBooks
      .filter(b => b.intents.includes('class-resource'))
      .map(b => b.isbn)
      .filter(Boolean)
  );

  const shared = theirBooks.filter(
    b => b.isbn && b.intents.includes('class-resource') && myClassIsbns.has(b.isbn)
  );
  const theyHaveMyClass = theirBooks.filter(
    b => b.isbn && myClassIsbns.has(b.isbn) && !b.intents.includes('class-resource')
  );

  const all = [...shared, ...theyHaveMyClass];
  const unique = Array.from(new Map(all.map(b => [b.isbn, b])).values());

  return {
    count: unique.length,
    items: unique.map(b => b.title),
  };
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/matching.ts
git commit -m "feat: matching algorithm uses new book model"
```

---

## Task 5: Profile Store - Lending Personality

**Files:**
- Modify: `src/stores/profile.ts`
- Modify: `src/lib/types.ts` (add lendingPersonality field)

**Depends on:** Task 1
**Can run parallel with:** Tasks 2, 3, 4

- [ ] **Step 1: Add lendingPersonality to UserProfile type**

```typescript
// src/lib/types.ts - add to UserProfile interface
export interface UserProfile {
  // ... existing fields ...
  lendingPersonality?: string;
  lendingPersonalityOverride?: boolean; // true if user edited it
}
```

- [ ] **Step 2: Add deriveLendingPersonality function**

```typescript
// src/stores/profile.ts - add after imports
import { shelf } from './shelf';
import type { BookIntent } from '../lib/types';

export function deriveLendingPersonality(): string {
  const books = Object.values(shelf.get());
  const ownedBooks = books.filter(b => b.ownership === 'have');
  if (ownedBooks.length === 0) return '';
  
  const intentCounts: Record<BookIntent, number> = {
    borrowable: 0,
    discussable: 0,
    giftable: 0,
    'class-resource': 0,
  };
  
  for (const book of ownedBooks) {
    for (const intent of book.intents) {
      intentCounts[intent]++;
    }
  }
  
  const total = ownedBooks.length;
  const borrowableRatio = intentCounts.borrowable / total;
  const discussableRatio = intentCounts.discussable / total;
  const giftableRatio = intentCounts.giftable / total;
  
  if (borrowableRatio > 0.5) return 'Generous lender';
  if (giftableRatio > 0.3) return 'Loves to gift books';
  if (discussableRatio > borrowableRatio) return 'Discussion-focused';
  if (borrowableRatio > 0.2) return 'Selective lender';
  if (borrowableRatio > 0) return 'Occasional lender';
  return 'Private collector';
}
```

- [ ] **Step 3: Add updateLendingPersonality**

```typescript
// src/stores/profile.ts
export function updateLendingPersonality(personality: string, isOverride: boolean = true): void {
  updateProfile({ 
    lendingPersonality: personality,
    lendingPersonalityOverride: isOverride,
  });
}

export function refreshDerivedProfile(): void {
  const current = profile.get();
  if (!current.lendingPersonalityOverride) {
    const derived = deriveLendingPersonality();
    if (derived && derived !== current.lendingPersonality) {
      profile.set({ ...current, lendingPersonality: derived });
    }
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/stores/profile.ts src/lib/types.ts
git commit -m "feat: auto-derive lending personality from shelf"
```

---

## Task 6: AddBookIsland - Intent Pills UI

**Files:**
- Modify: `src/components/AddBookIsland.svelte`

**Depends on:** Tasks 1, 2

- [ ] **Step 1: Replace state variables**

```svelte
<script lang="ts">
  import { addBook } from '../stores/shelf';
  import { fetchByIsbn, isValidIsbn } from '../lib/openLibrary';
  import type { BookVisibility, BookOwnership, BookIntent } from '../lib/types';

  let ScannerComponent: typeof import('./ScannerIsland.svelte').default | null = $state(null);

  type Mode = 'isbn' | 'manual';

  let mode: Mode = $state('isbn');
  let isbn = $state('');
  let title = $state('');
  let author = $state('');
  
  // New three-dimension model
  let visibility: BookVisibility = $state('visible');
  let ownership: BookOwnership = $state('have');
  let intents: BookIntent[] = $state([]);
  
  let loading = $state(false);
  let error = $state('');
  let showScanner = $state(false);
  let previewBook: { title: string; author: string; coverUrl?: string; isbn?: string } | null = $state(null);

  function toggleIntent(intent: BookIntent) {
    if (intents.includes(intent)) {
      intents = intents.filter(i => i !== intent);
    } else {
      intents = [...intents, intent];
    }
  }

  function resetForm() {
    isbn = '';
    title = '';
    author = '';
    visibility = 'visible';
    ownership = 'have';
    intents = [];
    previewBook = null;
    error = '';
  }
</script>
```

- [ ] **Step 2: Update handleIsbnSubmit to show preview**

```svelte
<script lang="ts">
  async function handleIsbnSubmit() {
    if (!isValidIsbn(isbn)) {
      error = 'Please enter a valid 10 or 13 digit ISBN';
      return;
    }

    loading = true;
    error = '';

    const bookData = await fetchByIsbn(isbn);

    if (bookData) {
      previewBook = {
        title: bookData.title,
        author: bookData.author,
        coverUrl: bookData.coverUrl,
        isbn: bookData.isbn,
      };
    } else {
      error = 'Book not found. Try manual entry.';
      mode = 'manual';
    }

    loading = false;
  }

  function confirmAdd() {
    if (previewBook) {
      addBook({
        title: previewBook.title,
        author: previewBook.author,
        isbn: previewBook.isbn,
        coverUrl: previewBook.coverUrl,
        visibility,
        ownership,
        intents,
        addedVia: 'scan',
      });
      resetForm();
      mode = 'isbn';
    }
  }

  function handleManualSubmit() {
    if (!title.trim() || !author.trim()) {
      error = 'Title and author are required';
      return;
    }

    addBook({
      title: title.trim(),
      author: author.trim(),
      visibility,
      ownership,
      intents,
      addedVia: 'manual',
    });

    resetForm();
    mode = 'isbn';
  }
</script>
```

- [ ] **Step 3: Replace template with pill UI**

```svelte
<div class="add-book">
  {#if previewBook}
    <!-- Book Preview Card -->
    <div class="preview-card">
      {#if previewBook.coverUrl}
        <img src={previewBook.coverUrl} alt="{previewBook.title} cover" class="preview-cover" />
      {:else}
        <div class="preview-cover placeholder">
          <span>{previewBook.title.charAt(0)}</span>
        </div>
      {/if}
      <div class="preview-info">
        <h3>{previewBook.title}</h3>
        <p>{previewBook.author}</p>
        {#if previewBook.isbn}
          <p class="isbn">ISBN: {previewBook.isbn}</p>
        {/if}
      </div>
    </div>

    <!-- Ownership Toggle -->
    <div class="ownership-toggle">
      <span class="toggle-label">I</span>
      <button
        class="pill"
        class:active={ownership === 'have'}
        onclick={() => ownership = 'have'}
      >have this</button>
      <button
        class="pill"
        class:active={ownership === 'seeking'}
        onclick={() => ownership = 'seeking'}
      >am seeking</button>
    </div>

    <!-- Intent Pills -->
    <div class="intent-pills">
      <button
        class="pill intent"
        class:active={intents.includes('borrowable')}
        onclick={() => toggleIntent('borrowable')}
      >Lend</button>
      <button
        class="pill intent"
        class:active={intents.includes('discussable')}
        onclick={() => toggleIntent('discussable')}
      >Discuss</button>
      <button
        class="pill intent"
        class:active={intents.includes('giftable')}
        onclick={() => toggleIntent('giftable')}
      >Gift</button>
    </div>

    <!-- Visibility Toggle -->
    <div class="visibility-toggle">
      <button
        class="pill visibility"
        class:active={visibility === 'private'}
        onclick={() => visibility = visibility === 'private' ? 'visible' : 'private'}
      >Private</button>
    </div>

    <!-- Actions -->
    <div class="actions">
      <button class="cancel" onclick={resetForm}>Cancel</button>
      <button class="confirm" onclick={confirmAdd}>Add to Shelf</button>
    </div>
  {:else}
    <!-- Entry Mode (existing tabs + inputs) -->
    <div class="tabs">
      <button class:active={mode === 'isbn'} onclick={() => { mode = 'isbn'; error = ''; }}>
        ISBN Lookup
      </button>
      <button class:active={mode === 'manual'} onclick={() => { mode = 'manual'; error = ''; }}>
        Manual Entry
      </button>
    </div>

    {#if mode === 'isbn'}
      <form onsubmit={(e) => { e.preventDefault(); handleIsbnSubmit(); }}>
        <div class="isbn-row">
          <input
            type="text"
            bind:value={isbn}
            placeholder="Enter ISBN (e.g., 9780465026562)"
            disabled={loading}
          />
          <button type="button" class="scan-btn" onclick={openScanner} title="Scan barcode">
            📷
          </button>
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Looking up...' : 'Look Up'}
        </button>
      </form>
    {:else}
      <form onsubmit={(e) => { e.preventDefault(); previewBook = { title: title.trim(), author: author.trim() }; }}>
        <input type="text" bind:value={title} placeholder="Book title" />
        <input type="text" bind:value={author} placeholder="Author" />
        <button type="submit">Preview</button>
      </form>
    {/if}
  {/if}

  {#if error}
    <p class="error">{error}</p>
  {/if}

  {#if showScanner && ScannerComponent}
    <ScannerComponent onScan={handleScanResult} onClose={closeScanner} />
  {/if}
</div>
```

- [ ] **Step 4: Add pill styles**

```svelte
<style>
  /* ... keep existing styles ... */

  .preview-card {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    background: var(--color-paper);
    border: 1px solid var(--color-gold-pale);
    border-radius: var(--radius-sm);
    margin-bottom: 1rem;
  }

  .preview-cover {
    width: 60px;
    height: 90px;
    object-fit: cover;
    border-radius: 2px;
    flex-shrink: 0;
  }

  .preview-cover.placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-mahogany);
    color: var(--color-gold);
    font-size: 1.5rem;
    font-weight: 600;
  }

  .preview-info h3 {
    margin: 0 0 0.25rem;
    font-size: 1rem;
  }

  .preview-info p {
    margin: 0;
    font-size: 0.875rem;
    color: var(--color-ink-faded);
  }

  .preview-info .isbn {
    font-size: 0.75rem;
    margin-top: 0.5rem;
  }

  .ownership-toggle,
  .intent-pills,
  .visibility-toggle {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    flex-wrap: wrap;
    align-items: center;
  }

  .toggle-label {
    font-size: 0.9rem;
    color: var(--color-ink-faded);
  }

  .pill {
    padding: 0.5rem 1rem;
    font-family: var(--font-display);
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--color-ink-faded);
    background: var(--color-paper);
    border: 1px solid var(--color-gold-pale);
    border-radius: 9999px;
    cursor: pointer;
    transition: all var(--transition-quick);
  }

  .pill:hover {
    border-color: var(--color-gold);
  }

  .pill.active {
    color: var(--color-cream);
    background: var(--color-forest);
    border-color: var(--color-forest);
  }

  .pill.intent.active {
    background: var(--color-burgundy);
    border-color: var(--color-burgundy);
  }

  .pill.visibility.active {
    background: var(--color-ink-faded);
    border-color: var(--color-ink-faded);
  }

  .actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 1rem;
  }

  .actions .cancel {
    flex: 1;
    padding: 0.75rem;
    font-family: var(--font-display);
    background: var(--color-paper);
    border: 1px solid var(--color-gold-pale);
    border-radius: var(--radius-sm);
    cursor: pointer;
  }

  .actions .confirm {
    flex: 2;
    padding: 0.75rem;
    font-family: var(--font-display);
    font-weight: 600;
    color: var(--color-cream);
    background: var(--color-forest);
    border: 1px solid var(--color-forest-dark);
    border-radius: var(--radius-sm);
    cursor: pointer;
  }
</style>
```

- [ ] **Step 5: Commit**

```bash
git add src/components/AddBookIsland.svelte
git commit -m "feat: replace status dropdown with intent pill chips"
```

---

## Task 7: BookCard - Intent Badges

**Files:**
- Modify: `src/components/BookCard.svelte`

**Depends on:** Tasks 1, 2
**Can run parallel with:** Tasks 6, 8

- [ ] **Step 1: Update props and imports**

```svelte
<script lang="ts">
  import type { Book, BookVisibility, BookOwnership, BookIntent } from '../lib/types';

  interface Props {
    book: Book;
    onIntentsChange?: (intents: BookIntent[]) => void;
    onVisibilityChange?: (visibility: BookVisibility) => void;
    onOwnershipChange?: (ownership: BookOwnership) => void;
    readonly?: boolean;
  }

  let { book, onIntentsChange, onVisibilityChange, onOwnershipChange, readonly = false }: Props = $props();

  const INTENT_LABELS: Record<BookIntent, string> = {
    borrowable: 'Lend',
    discussable: 'Discuss',
    giftable: 'Gift',
    'class-resource': 'Class',
  };

  function toggleIntent(intent: BookIntent) {
    const newIntents = book.intents.includes(intent)
      ? book.intents.filter(i => i !== intent)
      : [...book.intents, intent];
    onIntentsChange?.(newIntents);
  }
</script>
```

- [ ] **Step 2: Update template**

```svelte
<article class="book-card" class:seeking={book.ownership === 'seeking'}>
  {#if book.coverUrl}
    <img src={book.coverUrl} alt="{book.title} cover" class="cover" />
  {:else}
    <div class="cover placeholder">
      <span>{book.title.charAt(0)}</span>
    </div>
  {/if}

  <div class="info">
    <h3 class="title">{book.title}</h3>
    <p class="author">{book.author}</p>

    <!-- Intent badges -->
    <div class="badges">
      {#if book.ownership === 'seeking'}
        <span class="badge seeking">Seeking</span>
      {/if}
      {#if book.visibility === 'private'}
        <span class="badge private">Private</span>
      {/if}
      {#each book.intents as intent}
        {#if readonly}
          <span class="badge intent">{INTENT_LABELS[intent]}</span>
        {:else}
          <button class="badge intent active" onclick={() => toggleIntent(intent)}>
            {INTENT_LABELS[intent]} ✕
          </button>
        {/if}
      {/each}
    </div>

    {#if book.addedVia === 'scan'}
      <span class="verified" title="Added via ISBN scan">✓</span>
    {/if}
  </div>
</article>
```

- [ ] **Step 3: Add badge styles**

```svelte
<style>
  /* ... keep existing styles ... */

  .book-card.seeking {
    border-left: 3px solid var(--color-burgundy);
  }

  .badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    margin-top: 0.5rem;
  }

  .badge {
    display: inline-block;
    padding: 0.15rem 0.4rem;
    font-family: var(--font-display);
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    border-radius: 9999px;
    border: none;
    cursor: default;
  }

  .badge.seeking {
    color: var(--color-cream);
    background: var(--color-burgundy);
  }

  .badge.private {
    color: var(--color-cream);
    background: var(--color-ink-faded);
  }

  .badge.intent {
    color: var(--color-forest-dark);
    background: var(--color-gold-pale);
  }

  button.badge {
    cursor: pointer;
    transition: all var(--transition-quick);
  }

  button.badge:hover {
    opacity: 0.8;
  }
</style>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/BookCard.svelte
git commit -m "feat: BookCard shows intent badges"
```

---

## Task 8: ShelfIsland - Multi-Select Filtering

**Files:**
- Modify: `src/components/ShelfIsland.svelte`

**Depends on:** Tasks 1, 2
**Can run parallel with:** Tasks 6, 7

- [ ] **Step 1: Read current ShelfIsland**

Read `src/components/ShelfIsland.svelte` to understand current structure.

- [ ] **Step 2: Update imports and filter logic**

```svelte
<script lang="ts">
  import { shelf, activeFilter, bookMatchesFilter, updateBookIntents, type ShelfFilter } from '../stores/shelf';
  import BookCard from './BookCard.svelte';
  import type { BookIntent } from '../lib/types';

  const FILTER_OPTIONS: { value: ShelfFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'lending', label: 'Lending' },
    { value: 'discussing', label: 'Discussing' },
    { value: 'gifting', label: 'Gifting' },
    { value: 'seeking', label: 'Seeking' },
    { value: 'private', label: 'Private' },
  ];

  let filter = $derived($activeFilter);
  let books = $derived(
    Object.values($shelf).filter(book => bookMatchesFilter(book, filter))
  );

  function setFilter(f: ShelfFilter) {
    activeFilter.set(f);
  }

  function handleIntentsChange(id: string, intents: BookIntent[]) {
    updateBookIntents(id, intents);
  }
</script>
```

- [ ] **Step 3: Update template with pill filters**

```svelte
<div class="shelf-island">
  <div class="filter-pills">
    {#each FILTER_OPTIONS as opt}
      <button
        class="filter-pill"
        class:active={filter === opt.value}
        onclick={() => setFilter(opt.value)}
      >
        {opt.label}
      </button>
    {/each}
  </div>

  {#if books.length === 0}
    <div class="empty">
      <p>No books match this filter.</p>
    </div>
  {:else}
    <div class="book-grid">
      {#each books as book (book.id)}
        <BookCard
          {book}
          onIntentsChange={(intents) => handleIntentsChange(book.id, intents)}
        />
      {/each}
    </div>
  {/if}
</div>
```

- [ ] **Step 4: Add filter pill styles**

```svelte
<style>
  .filter-pills {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }

  .filter-pill {
    padding: 0.4rem 0.875rem;
    font-family: var(--font-display);
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--color-ink-faded);
    background: var(--color-paper);
    border: 1px solid var(--color-gold-pale);
    border-radius: 9999px;
    cursor: pointer;
    transition: all var(--transition-quick);
  }

  .filter-pill:hover {
    border-color: var(--color-gold);
  }

  .filter-pill.active {
    color: var(--color-cream);
    background: var(--color-forest);
    border-color: var(--color-forest);
  }

  .book-grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }

  .empty {
    text-align: center;
    padding: 2rem;
    color: var(--color-ink-faded);
  }
</style>
```

- [ ] **Step 5: Commit**

```bash
git add src/components/ShelfIsland.svelte
git commit -m "feat: ShelfIsland uses pill filters for multi-select"
```

---

## Task 9: ProfileIsland - Auto-Derived Display

**Files:**
- Modify: `src/components/ProfileIsland.svelte`

**Depends on:** Tasks 1, 2, 5

- [ ] **Step 1: Read current ProfileIsland**

Read `src/components/ProfileIsland.svelte` to understand current structure.

- [ ] **Step 2: Add lending personality section**

Add imports and derived state:

```svelte
<script lang="ts">
  import { profile, updateProfile, deriveLendingPersonality, updateLendingPersonality } from '../stores/profile';
  import { shelf } from '../stores/shelf';

  // Re-derive personality when shelf changes
  $effect(() => {
    const _ = $shelf; // subscribe to shelf changes
    const current = $profile;
    if (!current.lendingPersonalityOverride) {
      const derived = deriveLendingPersonality();
      if (derived && derived !== current.lendingPersonality) {
        updateLendingPersonality(derived, false);
      }
    }
  });

  let editingPersonality = $state(false);
  let personalityInput = $state('');

  function startEditPersonality() {
    personalityInput = $profile.lendingPersonality || '';
    editingPersonality = true;
  }

  function savePersonality() {
    updateLendingPersonality(personalityInput, true);
    editingPersonality = false;
  }

  function clearPersonalityOverride() {
    const derived = deriveLendingPersonality();
    updateLendingPersonality(derived, false);
  }
</script>
```

- [ ] **Step 3: Add lending personality UI**

Add to the template after topics section:

```svelte
<!-- Lending Personality -->
<section class="profile-section">
  <h3>Lending Style</h3>
  {#if editingPersonality}
    <div class="edit-row">
      <input
        type="text"
        bind:value={personalityInput}
        placeholder="e.g., Generous lender"
      />
      <button onclick={savePersonality}>Save</button>
      <button class="secondary" onclick={() => editingPersonality = false}>Cancel</button>
    </div>
  {:else}
    <div class="derived-value">
      <span class="value">{$profile.lendingPersonality || 'Add some books to see your style'}</span>
      {#if $profile.lendingPersonality}
        <button class="edit-btn" onclick={startEditPersonality}>Edit</button>
        {#if $profile.lendingPersonalityOverride}
          <button class="clear-btn" onclick={clearPersonalityOverride}>Reset to auto</button>
        {/if}
      {/if}
    </div>
  {/if}
</section>
```

- [ ] **Step 4: Add styles**

```svelte
<style>
  /* ... keep existing styles ... */

  .derived-value {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .derived-value .value {
    font-style: italic;
    color: var(--color-ink);
  }

  .edit-btn,
  .clear-btn {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    background: var(--color-paper);
    border: 1px solid var(--color-gold-pale);
    border-radius: var(--radius-sm);
    cursor: pointer;
  }

  .clear-btn {
    color: var(--color-ink-faded);
  }

  .edit-row {
    display: flex;
    gap: 0.5rem;
  }

  .edit-row input {
    flex: 1;
  }

  .edit-row button.secondary {
    background: var(--color-paper);
    color: var(--color-ink-faded);
  }
</style>
```

- [ ] **Step 5: Commit**

```bash
git add src/components/ProfileIsland.svelte
git commit -m "feat: ProfileIsland shows auto-derived lending personality"
```

---

## Task 10: Run Migration & Verify

**Files:** None (verification only)

**Depends on:** All previous tasks

- [ ] **Step 1: Run migration on local D1**

```bash
npx wrangler d1 execute biblocal-db --local --file=migrations/0003_book_intents.sql
```

Expected: Migration runs successfully

- [ ] **Step 2: Start dev server**

```bash
npm run dev
```

Expected: Server starts without errors

- [ ] **Step 3: Test intake flow**

1. Navigate to shelf page
2. Click ISBN scan or enter ISBN manually
3. Verify book preview appears
4. Select ownership (have/seeking)
5. Toggle intent pills (lend/discuss/gift)
6. Set private if desired
7. Click "Add to Shelf"
8. Verify book appears with correct badges

- [ ] **Step 4: Test filtering**

1. Add multiple books with different intents
2. Click filter pills (All, Lending, Discussing, etc.)
3. Verify correct books shown for each filter

- [ ] **Step 5: Test profile auto-derive**

1. Navigate to profile page
2. Verify "Lending Style" shows derived value
3. Add more books with borrowable intent
4. Verify lending style updates
5. Edit lending style manually
6. Verify it stops auto-updating
7. Click "Reset to auto" and verify it resumes

- [ ] **Step 6: Run type check**

```bash
npx astro check
```

Expected: No type errors

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: complete book intake and profile auto-construction"
```

---

## Verification Summary

| Area | Test |
|------|------|
| Schema | Migration runs, old data preserved |
| Intake | Scan → preview → pills → save works |
| Shelf | Badges show, filters work |
| Profile | Lending style auto-derives, override works |
| Matching | Run `npm run test:run` - matching tests pass |
