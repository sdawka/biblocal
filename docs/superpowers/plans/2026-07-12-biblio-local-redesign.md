# Biblio & Local Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reshape the two primary authenticated pages — a single-object bookshelf (**Biblio**, `/biblio`) and a book-first local discovery feed (**Local**, `/local`) — and rename their routes properly.

**Architecture:** Presentation/UX reshape over unchanged data. One new pure helper pivots existing person-keyed discovery data (`Match[]`) into book-keyed rows (`LocalBook[]`); a computed store exposes it. Biblio folds three stacked islands into one `Bookshelf` orchestrator that reuses `AddBookIsland`/`BookCard`/`ShelfIsland`. Local gains a `LocalDiscovery` island with a Books/People/Map switcher, reusing `MatchCardIsland`/`MatchMapIsland`.

**Tech Stack:** Astro 6 (SSR/Cloudflare), Svelte 5 runes, Nanostores, TypeScript strict, Vitest + `@testing-library/svelte` (jsdom).

## Global Constraints

- No changes to any `/api/*` route (mobile sibling app depends on them; Bearer auth path stays intact).
- No changes to the matching math in `src/lib/matching.ts` (`calculateMatches`, `calculateDiscovery`).
- No changes to the book model (`Book`/`BookVisibility`/`BookOwnership`/`BookIntent`) or `Match`/`MatchFacets` shapes.
- Svelte 5 runes only (`$state`, `$props`, `$effect`, `$derived`) — match existing islands.
- Nav label copy: shelf page → **"Biblio"**, discovery page → **"Local"** (EN and FR).
- Book intent → discovery group labels: `borrowable` → **"To borrow"**, `discussable` → **"To discuss"**, `giftable` → **"Free & giftable"**.
- Every task ends green: relevant tests pass, and by end of plan `npx astro check`, `npm run test:run`, `npm run build` all succeed.
- Commit after each task with a concise message (no attribution footer).

---

### Task 1: Rename routes `/shelf`→`/biblio`, `/matches`→`/local` (with redirects)

Atomic mechanical rename. Must land as one unit so no intermediate state has a broken internal link. Ends with a redirect test + `astro check`.

**Files:**
- Rename: `src/pages/shelf.astro` → `src/pages/biblio.astro`; `src/pages/matches.astro` → `src/pages/local.astro`
- Rename: `src/pages/fr/shelf.astro` → `src/pages/fr/biblio.astro`; `src/pages/fr/matches.astro` → `src/pages/fr/local.astro`
- Modify: `astro.config.mjs` (add `redirects`, update `PRIVATE_PREFIXES`)
- Modify: `public/robots.txt`
- Modify: `src/middleware.ts` (signed-in redirect target + any route matcher)
- Modify: `src/layouts/Layout.astro:65-66` (hrefs + active checks)
- Modify: `src/i18n/en/common.ts:19-20`, `src/i18n/fr/common.ts:19-20` (appNav labels)
- Modify (internal `/shelf` hrefs/redirects): `src/stores/profile.ts`, `src/stores/auth.ts`, `src/stores/matches.ts`, `src/components/OnboardingIsland.svelte`, `src/components/AddBookIsland.svelte`, `src/components/EmptyShelfIsland.svelte`, `src/components/ShelfContainer.svelte`, `src/components/ShelfIsland.svelte`, `src/components/PromptIsland.svelte`, `src/components/ImportIsland.svelte`, `src/components/ProfileIsland.svelte`
- Modify (internal `/matches` hrefs): `src/components/StoresNewPage.astro`, `src/components/StoreDetailPage.astro`, `src/components/MatchMapIsland.svelte`
- Test: `tests/lib/routes.test.ts` (new — redirect config assertion)

**Interfaces:**
- Produces: pages served at `/biblio` and `/local` (+ `/fr/biblio`, `/fr/local`); 301 redirects from old paths.

- [ ] **Step 1: Move the page files (git mv preserves history)**

```bash
git mv src/pages/shelf.astro src/pages/biblio.astro
git mv src/pages/matches.astro src/pages/local.astro
git mv src/pages/fr/shelf.astro src/pages/fr/biblio.astro
git mv src/pages/fr/matches.astro src/pages/fr/local.astro
```

- [ ] **Step 2: Add redirects + update PRIVATE_PREFIXES in `astro.config.mjs`**

Change `PRIVATE_PREFIXES` (line 11) to the new paths and add a `redirects` map. In `defineConfig({...})` add a `redirects` key alongside `site`:

```js
const PRIVATE_PREFIXES = ['/biblio', '/local', '/profile', '/stores', '/store'];

// ...inside defineConfig({ ... }):
  redirects: {
    '/shelf': '/biblio',
    '/matches': '/local',
    '/fr/shelf': '/fr/biblio',
    '/fr/matches': '/fr/local',
  },
```

- [ ] **Step 3: Update `public/robots.txt`**

Replace the two Disallow lines:

```
Disallow: /biblio
Disallow: /local
```

- [ ] **Step 4: Update `src/middleware.ts`**

Change the signed-in-home redirect (line ~29) from `/shelf`/`/fr/shelf` to `/biblio`/`/fr/biblio`:

```ts
return context.redirect(isFr ? '/fr/biblio' : '/biblio');
```

Then check the `createRouteMatcher([...])` list (line ~6) for any `'/shelf'`/`'/matches'` (or `'/shelf(.*)'`) entries and rename them to `'/biblio'`/`'/local'` (keep the same glob style already used).

- [ ] **Step 5: Update nav in `src/layouts/Layout.astro` (lines 65-66)**

```astro
        <a href={p('/biblio')} class:list={{ active: currentPath === '/biblio' }}>{t.appNav.shelf}</a>
        <a href={p('/local')} class:list={{ active: currentPath === '/local' }}>{t.appNav.matches}</a>
```

(Keep the `t.appNav.shelf`/`t.appNav.matches` keys; only the label *values* change in Step 6.)

- [ ] **Step 6: Update nav labels in i18n dicts**

`src/i18n/en/common.ts` (lines 19-20):

```ts
    shelf: 'Biblio',
    matches: 'Local',
```

`src/i18n/fr/common.ts` (lines 19-20):

```ts
    shelf: 'Biblio',
    matches: 'Local',
```

- [ ] **Step 7: Rename all internal link references**

Run these to find every remaining hardcoded occurrence, then edit each hit, replacing `'/shelf'`→`'/biblio'` and `'/matches'`→`'/local'` (and any `/fr/shelf`, `/fr/matches`). These are string literals in hrefs, `window.location`, and store redirects.

```bash
grep -rn "/shelf\b" src --include=*.astro --include=*.svelte --include=*.ts | grep -v "redirects"
grep -rn "/matches\b" src --include=*.astro --include=*.svelte --include=*.ts
```

Expected after edits: both greps return nothing (all references now point at `/biblio` / `/local`).

- [ ] **Step 8: Write the redirect-config test**

`tests/lib/routes.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import config from '../../astro.config.mjs';

describe('route redirects', () => {
  it('redirects legacy shelf/matches paths to new routes', () => {
    const r = (config as any).redirects ?? {};
    expect(r['/shelf']).toBe('/biblio');
    expect(r['/matches']).toBe('/local');
    expect(r['/fr/shelf']).toBe('/fr/biblio');
    expect(r['/fr/matches']).toBe('/fr/local');
  });
});
```

- [ ] **Step 9: Run the test + type check**

Run: `npm run test:run -- tests/lib/routes.test.ts`
Expected: PASS.
Run: `npx astro check`
Expected: 0 errors (warnings from unrelated files acceptable if pre-existing).

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "rename routes to /biblio and /local with redirects"
```

---

### Task 2: `pivotToBooks` + `groupByIntent` pure helpers

The only new domain logic. Pivots `Match[]` → `LocalBook[]`, one row per (owned, visible, sharable book × intent), sorted taste-fit-first with distance tiebreak (cold-start = distance order emerges naturally when all taste scores are 0).

**Files:**
- Modify: `src/lib/types.ts` (add `LocalBook`, `LocalBookGroup`)
- Create: `src/lib/discoveryBooks.ts`
- Test: `tests/lib/discoveryBooks.test.ts`

**Interfaces:**
- Consumes: `Match` (from `src/lib/types.ts`), `Match.user.shelf: Book[]`, `Match.totalScore`, `Match.distanceKm`, `Match.facets.{shelfTwin,readingMentor,localSource}.items: string[]`.
- Produces:
  - `interface LocalBook { book: Book; owner: UserProfile; intent: BookIntent; distanceKm?: number; tasteScore: number; isTasteMatch: boolean }`
  - `interface LocalBookGroup { intent: BookIntent; books: LocalBook[] }`
  - `pivotToBooks(matches: Match[]): LocalBook[]`
  - `groupByIntent(books: LocalBook[]): LocalBookGroup[]` — fixed order `borrowable, discussable, giftable`, empty groups dropped.

- [ ] **Step 1: Add types to `src/lib/types.ts`**

Append:

```ts
// A single discoverable book row: one owned, visible book a nearby person is
// sharing under one intent. Derived (not stored) — see src/lib/discoveryBooks.ts.
export interface LocalBook {
  book: Book;
  owner: UserProfile;
  intent: BookIntent;
  distanceKm?: number;
  tasteScore: number;   // owner's match score; drives taste-fit ordering
  isTasteMatch: boolean; // this specific title matched one of your facets
}

export interface LocalBookGroup {
  intent: BookIntent;
  books: LocalBook[];
}
```

- [ ] **Step 2: Write the failing test**

`tests/lib/discoveryBooks.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { pivotToBooks, groupByIntent } from '../../src/lib/discoveryBooks';
import type { Book, Match, UserProfile } from '../../src/lib/types';

function book(partial: Partial<Book> & Pick<Book, 'title'>): Book {
  return {
    id: partial.id ?? partial.title,
    title: partial.title,
    author: partial.author ?? 'A',
    visibility: partial.visibility ?? 'visible',
    ownership: partial.ownership ?? 'have',
    intents: partial.intents ?? ['borrowable'],
    addedVia: 'manual',
    addedAt: 0,
    ...partial,
  };
}

function user(id: string, shelf: Book[], extra: Partial<UserProfile> = {}): UserProfile {
  return { id, name: id, city: 'X', radiusKm: 10, topics: { curated: [], freeform: [], inferred: [] }, shelf, ...extra };
}

const emptyFacets = {
  shelfTwin: { count: 0, items: [] as string[] },
  readingMentor: { count: 0, items: [] as string[] },
  localSource: { count: 0, items: [] as string[] },
  discussionMatch: { count: 0, items: [] as string[] },
};

it('emits one row per (sharable book x intent)', () => {
  const u = user('bob', [book({ title: 'Dune', intents: ['borrowable', 'giftable'] })]);
  const rows = pivotToBooks([{ user: u, facets: emptyFacets, totalScore: 0 }]);
  expect(rows.map((r) => r.intent).sort()).toEqual(['borrowable', 'giftable']);
});

it('excludes private and seeking books', () => {
  const u = user('bob', [
    book({ title: 'Secret', visibility: 'private' }),
    book({ title: 'Wanted', ownership: 'seeking' }),
    book({ title: 'Dune' }),
  ]);
  const rows = pivotToBooks([{ user: u, facets: emptyFacets, totalScore: 0 }]);
  expect(rows.map((r) => r.book.title)).toEqual(['Dune']);
});

it('orders taste-fit first, then distance', () => {
  const far = user('far', [book({ title: 'A' })]);
  const near = user('near', [book({ title: 'B' })]);
  const rows = pivotToBooks([
    { user: far, facets: emptyFacets, totalScore: 6, distanceKm: 9 },
    { user: near, facets: emptyFacets, totalScore: 0, distanceKm: 1 },
  ]);
  expect(rows[0].book.title).toBe('A'); // higher tasteScore wins over distance
});

it('cold-start (all taste 0) falls back to distance order', () => {
  const far = user('far', [book({ title: 'A' })]);
  const near = user('near', [book({ title: 'B' })]);
  const rows = pivotToBooks([
    { user: far, facets: emptyFacets, totalScore: 0, distanceKm: 9 },
    { user: near, facets: emptyFacets, totalScore: 0, distanceKm: 1 },
  ]);
  expect(rows[0].book.title).toBe('B');
});

it('flags isTasteMatch when title is in a facet', () => {
  const u = user('bob', [book({ title: 'Dune' })]);
  const facets = { ...emptyFacets, shelfTwin: { count: 1, items: ['Dune'] } };
  const rows = pivotToBooks([{ user: u, facets, totalScore: 3 }]);
  expect(rows[0].isTasteMatch).toBe(true);
});

it('keeps a distinct row per owner for the same title', () => {
  const a = user('a', [book({ title: 'Dune' })]);
  const b = user('b', [book({ title: 'Dune' })]);
  const rows = pivotToBooks([
    { user: a, facets: emptyFacets, totalScore: 0, distanceKm: 5 },
    { user: b, facets: emptyFacets, totalScore: 0, distanceKm: 2 },
  ]);
  expect(rows).toHaveLength(2);
  expect(rows[0].owner.id).toBe('b'); // nearer owner first
});

it('groupByIntent returns fixed order and drops empty groups', () => {
  const u = user('bob', [book({ title: 'Dune', intents: ['borrowable', 'giftable'] })]);
  const groups = groupByIntent(pivotToBooks([{ user: u, facets: emptyFacets, totalScore: 0 }]));
  expect(groups.map((g) => g.intent)).toEqual(['borrowable', 'giftable']);
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm run test:run -- tests/lib/discoveryBooks.test.ts`
Expected: FAIL (`Cannot find module '../../src/lib/discoveryBooks'`).

- [ ] **Step 4: Implement `src/lib/discoveryBooks.ts`**

```ts
import type { Book, BookIntent, LocalBook, LocalBookGroup, Match } from './types';

const SHARABLE_INTENTS: BookIntent[] = ['borrowable', 'discussable', 'giftable'];

// Fixed display order for discovery groups.
const GROUP_ORDER: BookIntent[] = ['borrowable', 'discussable', 'giftable'];

function compareLocalBooks(a: LocalBook, b: LocalBook): number {
  if (b.tasteScore !== a.tasteScore) return b.tasteScore - a.tasteScore;
  const ad = a.distanceKm ?? Infinity;
  const bd = b.distanceKm ?? Infinity;
  return ad - bd;
}

/**
 * Pivot person-keyed matches into book-keyed discovery rows. One row per
 * (owned, visible book x sharable intent). Sorted taste-fit first (owner match
 * score), distance breaks ties. With no taste signal every score is 0, so the
 * sort degrades to pure distance — the cold-start fallback.
 */
export function pivotToBooks(matches: Match[]): LocalBook[] {
  const rows: LocalBook[] = [];

  for (const match of matches) {
    const facetTitles = new Set<string>([
      ...match.facets.shelfTwin.items,
      ...match.facets.readingMentor.items,
      ...match.facets.localSource.items,
    ]);

    const sharable = (match.user.shelf ?? []).filter(
      (b: Book) => b.visibility !== 'private' && b.ownership === 'have',
    );

    for (const book of sharable) {
      for (const intent of SHARABLE_INTENTS) {
        if (!book.intents?.includes(intent)) continue;
        rows.push({
          book,
          owner: match.user,
          intent,
          distanceKm: match.distanceKm,
          tasteScore: match.totalScore,
          isTasteMatch: facetTitles.has(book.title),
        });
      }
    }
  }

  return rows.sort(compareLocalBooks);
}

export function groupByIntent(books: LocalBook[]): LocalBookGroup[] {
  return GROUP_ORDER.map((intent) => ({
    intent,
    books: books.filter((b) => b.intent === intent),
  })).filter((g) => g.books.length > 0);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test:run -- tests/lib/discoveryBooks.test.ts`
Expected: PASS (all cases).

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/discoveryBooks.ts tests/lib/discoveryBooks.test.ts
git commit -m "add pivotToBooks discovery helper"
```

---

### Task 3: `discoveryBooks` computed store

Expose the pivot reactively, derived from the existing `discovery` computed (so it recomputes on shelf/profile/seedUsers changes for free).

**Files:**
- Modify: `src/stores/matches.ts`
- Test: `tests/stores/discovery-books.test.ts`

**Interfaces:**
- Consumes: `discovery` (existing computed, `Match[]`), `pivotToBooks` (Task 2).
- Produces: `discoveryBooks` — a nanostores computed of `LocalBook[]`.

- [ ] **Step 1: Write the failing test**

`tests/stores/discovery-books.test.ts` (mirror the setup in `tests/stores/matches-freeform.test.ts` for how `shelf`, `profile`, `seedUsers` are seeded — open that file and copy its import + reset pattern):

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { shelf } from '../../src/stores/shelf';
import { profile } from '../../src/stores/profile';
import { seedUsers } from '../../src/stores/users';
import { discoveryBooks } from '../../src/stores/matches';

beforeEach(() => {
  shelf.set({});
  seedUsers.set([]);
});

it('is empty with no seed users', () => {
  expect(discoveryBooks.get()).toEqual([]);
});

it('surfaces a nearby sharable book as a LocalBook row', () => {
  seedUsers.set([
    {
      id: 'bob', name: 'Bob', city: 'X', radiusKm: 10,
      topics: { curated: [], freeform: [], inferred: [] },
      shelf: [
        { id: 'd', title: 'Dune', author: 'H', visibility: 'visible', ownership: 'have', intents: ['borrowable'], addedVia: 'manual', addedAt: 0 },
      ],
    },
  ]);
  const rows = discoveryBooks.get();
  expect(rows).toHaveLength(1);
  expect(rows[0].book.title).toBe('Dune');
  expect(rows[0].owner.id).toBe('bob');
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:run -- tests/stores/discovery-books.test.ts`
Expected: FAIL (`discoveryBooks` is not exported).

- [ ] **Step 3: Add the store to `src/stores/matches.ts`**

At the top, extend the import:

```ts
import { pivotToBooks } from '../lib/discoveryBooks';
import type { Match, LocalBook } from '../lib/types';
```

At the bottom of the file:

```ts
// Book-first view of discovery: existing person-keyed matches pivoted into one
// row per (sharable book x intent). Powers the Local page's Books feed.
export const discoveryBooks = computed(discovery, (m: Match[]): LocalBook[] =>
  pivotToBooks(m),
);
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test:run -- tests/stores/discovery-books.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stores/matches.ts tests/stores/discovery-books.test.ts
git commit -m "add discoveryBooks computed store"
```

---

### Task 4: `Bookshelf` island — unify Biblio's empty / adding / populated states

Replace the stacked layout (compose `<section>` + `ShelfContainer`) with one orchestrator that renders the shelf frame, a trailing `+` slot that expands into `AddBookIsland` in place, and the populated grid via the existing `ShelfIsland`. Retire `ShelfContainer` and `EmptyShelfIsland`.

**Files:**
- Create: `src/components/Bookshelf.svelte`
- Modify: `src/components/AddBookIsland.svelte` (add optional `onClose` prop — additive, backward compatible)
- Modify: `src/components/biblio` page wrapper `src/components/ShelfPage.astro` (rename to `BiblioPage.astro`, swap body)
- Modify: `src/pages/biblio.astro`, `src/pages/fr/biblio.astro` (import path)
- Delete: `src/components/ShelfContainer.svelte`, `src/components/EmptyShelfIsland.svelte`
- Modify: `tests/components/ShelfIsland.test.ts` stays; delete `EmptyShelfIsland`/`ShelfContainer` tests if any exist (check `tests/components/`)
- Test: `tests/components/Bookshelf.test.ts`

**Interfaces:**
- Consumes: `shelf` store (`Record<string, Book>`), `AddBookIsland` (`lang`, new optional `onClose: () => void`), `ShelfIsland` (`lang`), `ImportIsland` (`lang`), i18n `shelf` dict.
- Produces: `<Bookshelf lang />` — self-contained Biblio body.

- [ ] **Step 1: Make `AddBookIsland` closable (additive prop)**

In `src/components/AddBookIsland.svelte`, extend props (find the existing `$props()` destructure) to accept an optional callback, and call it from the existing Cancel handler and after a successful add. Add to the `$props()` line:

```ts
  let { lang = 'en' as Lang, onClose = undefined as (() => void) | undefined } = $props();
```

In the existing cancel handler and the success path of the add handler, after resetting local state, add:

```ts
  onClose?.();
```

(Existing call sites pass no `onClose`, so behavior is unchanged for them.)

- [ ] **Step 2: Write a failing smoke test for `Bookshelf`**

`tests/components/Bookshelf.test.ts` (follow the render/reset pattern in `tests/components/ShelfIsland.test.ts`):

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Bookshelf from '../../src/components/Bookshelf.svelte';
import { shelf } from '../../src/stores/shelf';

beforeEach(() => shelf.set({}));

it('shows an add slot on an empty shelf', () => {
  render(Bookshelf, { lang: 'en' });
  expect(screen.getByRole('button', { name: /add.*book/i })).toBeInTheDocument();
});

it('expands the add form when the slot is clicked', async () => {
  render(Bookshelf, { lang: 'en' });
  await fireEvent.click(screen.getByRole('button', { name: /add.*book/i }));
  // AddBookIsland renders an ISBN input
  expect(screen.getByPlaceholderText(/isbn/i)).toBeInTheDocument();
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm run test:run -- tests/components/Bookshelf.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 4: Implement `src/components/Bookshelf.svelte`**

Orchestrator with a two-value mode. When empty, the frame holds only the slot; when populated, `ShelfIsland` renders the filtered grid and the slot trails it. The slot expands `AddBookIsland` in place.

```svelte
<script lang="ts">
  import { shelf } from '../stores/shelf';
  import ShelfIsland from './ShelfIsland.svelte';
  import AddBookIsland from './AddBookIsland.svelte';
  import ImportIsland from './ImportIsland.svelte';
  import { useTranslations, type Lang } from '../i18n';

  let { lang = 'en' as Lang } = $props();
  const t = useTranslations(lang).shelf;

  let isEmpty = $state(true);
  let adding = $state(false);

  $effect(() => {
    const unsub = shelf.subscribe((s) => {
      isEmpty = Object.keys(s).length === 0;
    });
    return unsub;
  });

  function openAdd() { adding = true; }
  function closeAdd() { adding = false; }
</script>

<div class="bookshelf">
  {#if !isEmpty}
    <ShelfIsland {lang} />
  {/if}

  <div class="shelf-row">
    {#if adding}
      <section class="add-slot open" aria-label={t.page.zoneTitle}>
        <button class="add-slot-close" type="button" onclick={closeAdd} aria-label="Close">×</button>
        <AddBookIsland {lang} onClose={closeAdd} />
        <details class="import-section">
          <summary>{t.page.importSummary}</summary>
          <ImportIsland {lang} />
        </details>
      </section>
    {:else}
      <button class="add-slot" type="button" onclick={openAdd}>
        <span class="plus" aria-hidden="true">+</span>
        <span class="add-label">{isEmpty ? t.empty.addFirst : t.page.zoneTitle}</span>
      </button>
    {/if}
  </div>
</div>

<style>
  /* Shelf ledge: each wrapped row sits on a subtle ledge line. */
  .bookshelf { display: flex; flex-direction: column; gap: var(--s-5); }
  .shelf-row {
    padding-bottom: var(--s-3);
    border-bottom: 2px solid var(--hairline-strong);
    box-shadow: 0 2px 0 var(--hairline);
  }
  .add-slot {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: var(--s-2); min-height: 180px; width: 132px;
    border: 2px dashed var(--hairline-strong); border-radius: var(--r-md);
    background: var(--surface-sunken); color: var(--ink-muted); cursor: pointer;
    transition: border-color var(--dur-2) var(--ease-out), color var(--dur-2) var(--ease-out);
  }
  .add-slot:hover { border-color: var(--accent); color: var(--accent); }
  .add-slot .plus { font-size: 2rem; line-height: 1; }
  .add-slot.open {
    width: 100%; align-items: stretch; cursor: default; position: relative;
    padding: var(--s-5); border-style: solid; background: var(--surface-sunken);
    animation: rise var(--dur-3) var(--ease-out) both;
  }
  .add-slot-close {
    position: absolute; top: var(--s-3); right: var(--s-3);
    background: none; border: none; font-size: 1.5rem; line-height: 1;
    color: var(--ink-muted); cursor: pointer;
  }
  .import-section { margin-top: var(--s-4); }
</style>
```

Note: this reuses the i18n keys `t.page.zoneTitle`, `t.page.importSummary` and requires an `empty.addFirst` key. If `t.empty.addFirst` does not exist in `src/i18n/en/shelf.ts` / `src/i18n/fr/shelf.ts`, add it: EN `"Add your first book"`, FR `"Ajoutez votre premier livre"`. Verify the exact nesting by opening `src/i18n/en/shelf.ts` first and match its structure.

- [ ] **Step 5: Run to verify it passes**

Run: `npm run test:run -- tests/components/Bookshelf.test.ts`
Expected: PASS. (If the add-label regex doesn't match, align the test's `name:` regex to the actual rendered label.)

- [ ] **Step 6: Swap the Biblio page body**

Rename the wrapper and simplify its body:

```bash
git mv src/components/ShelfPage.astro src/components/BiblioPage.astro
```

In `src/components/BiblioPage.astro`, replace the imports of `AddBookIsland`, `ImportIsland`, `ShelfContainer` with a single `import Bookshelf from './Bookshelf.svelte';`, delete the `<section class="compose">…</section>` block and the `<ShelfContainer .../>`, and render in their place:

```astro
      <Bookshelf lang={lang} client:load />
```

Keep the header-row, `SyncErrorToast`, and `PromptIsland`. Remove now-unused `.compose`/`.import-section` CSS from this file (that styling now lives in `Bookshelf.svelte`).

Update `src/pages/biblio.astro` and `src/pages/fr/biblio.astro` to import `BiblioPage` instead of `ShelfPage`:

```astro
import BiblioPage from '../components/BiblioPage.astro';
---
<BiblioPage lang="en" />
```

(For `src/pages/fr/biblio.astro`, `lang="fr"` and the import path is `../../components/BiblioPage.astro`.)

- [ ] **Step 7: Delete the retired components**

```bash
git rm src/components/ShelfContainer.svelte src/components/EmptyShelfIsland.svelte
```

Check for and delete any tests that import them:

```bash
grep -rln "EmptyShelfIsland\|ShelfContainer" tests
```

Remove/repoint any hits (there should be none in `src`, since Task 1 already repointed `/matches` links; the `EmptyShelfIsland` "Explore nearby" href is gone with the file).

- [ ] **Step 8: Type check + full component suite**

Run: `npx astro check`
Expected: 0 errors.
Run: `npm run test:run -- tests/components/`
Expected: PASS (no references to deleted components remain).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "fold Biblio into single Bookshelf island with in-place add slot"
```

---

### Task 5: `LocalDiscovery` island — book-first Local page with Books/People/Map switcher

Replace the direct `MatchMapIsland` render with a `LocalDiscovery` island: a view switcher whose default **Books** view renders the grouped, taste-ordered feed from `discoveryBooks`; **People** reuses `MatchCardIsland`; **Map** reuses `MatchMapIsland`.

**Files:**
- Create: `src/components/LocalDiscovery.svelte`
- Create: `src/components/BookDiscoveryRow.svelte`
- Modify: `src/components/MatchesPage.astro` (rename to `LocalPage.astro`, swap body)
- Modify: `src/pages/local.astro`, `src/pages/fr/local.astro` (import path)
- Modify: `src/i18n/en/matches.ts`, `src/i18n/fr/matches.ts` (add view + group labels)
- Test: `tests/components/LocalDiscovery.test.ts`

**Interfaces:**
- Consumes: `discoveryBooks` store (`LocalBook[]`), `groupByIntent` (Task 2), `discovery` store (`Match[]`) for People view, `MatchCardIsland` (`match`, `lang`), `MatchMapIsland` (`lang`), `INTENT_LABELS`/group labels.
- Produces: `<LocalDiscovery lang />` — self-contained Local body.

- [ ] **Step 1: Add i18n strings**

Open `src/i18n/en/matches.ts` and add (matching its existing nesting) view-switcher + group labels:

```ts
  views: { books: 'Books', people: 'People', map: 'Map' },
  groups: { borrowable: 'To borrow', discussable: 'To discuss', giftable: 'Free & giftable' },
  empty: { books: 'No books nearby yet' },
```

Mirror in `src/i18n/fr/matches.ts`:

```ts
  views: { books: 'Livres', people: 'Personnes', map: 'Carte' },
  groups: { borrowable: 'À emprunter', discussable: 'À discuter', giftable: 'Gratuit / à donner' },
  empty: { books: 'Aucun livre à proximité' },
```

- [ ] **Step 2: Write a failing smoke test**

`tests/components/LocalDiscovery.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import LocalDiscovery from '../../src/components/LocalDiscovery.svelte';
import { shelf } from '../../src/stores/shelf';
import { seedUsers } from '../../src/stores/users';

beforeEach(() => {
  shelf.set({});
  seedUsers.set([
    {
      id: 'bob', name: 'Bob', city: 'X', radiusKm: 10,
      topics: { curated: [], freeform: [], inferred: [] },
      shelf: [
        { id: 'd', title: 'Dune', author: 'H', visibility: 'visible', ownership: 'have', intents: ['borrowable'], addedVia: 'manual', addedAt: 0 },
      ],
    },
  ]);
});

it('defaults to the Books view and lists a nearby book', () => {
  render(LocalDiscovery, { lang: 'en' });
  expect(screen.getByText('Dune')).toBeInTheDocument();
  expect(screen.getByText('To borrow')).toBeInTheDocument();
});

it('switches to the People view', async () => {
  render(LocalDiscovery, { lang: 'en' });
  await fireEvent.click(screen.getByRole('tab', { name: /people/i }));
  expect(screen.getByText('Bob')).toBeInTheDocument();
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm run test:run -- tests/components/LocalDiscovery.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 4: Implement `src/components/BookDiscoveryRow.svelte`**

One book row: cover, title/author, owner, distance, taste badge, expand-to-connect. Reuse the connection flow already used by `MatchCardIsland` (open that file to copy the exact `sendConnectionRequest` import and call signature from `src/stores/connections.ts`).

```svelte
<script lang="ts">
  import type { LocalBook } from '../lib/types';
  import { formatDistance } from '../lib/geo';
  import type { Lang } from '../i18n';

  let { row, lang = 'en' as Lang }: { row: LocalBook; lang?: Lang } = $props();
  let open = $state(false);
</script>

<article class="book-row" class:taste={row.isTasteMatch}>
  <button class="row-main" type="button" onclick={() => (open = !open)}>
    {#if row.book.coverUrl}
      <img class="cover" src={row.book.coverUrl} alt="" loading="lazy" />
    {:else}
      <span class="cover placeholder" aria-hidden="true">📖</span>
    {/if}
    <span class="meta">
      <span class="title">{row.book.title}</span>
      <span class="author">{row.book.author}</span>
      <span class="owner">
        {row.owner.name}
        {#if row.distanceKm != null}· {formatDistance(row.distanceKm)}{/if}
        {#if row.isTasteMatch}· <span class="star">★ fit</span>{/if}
      </span>
    </span>
  </button>
  {#if open}
    <div class="row-detail">
      <!-- Owner block + connect action. Reuse connections store as in MatchCardIsland. -->
      <a class="btn btn-sm" href={`/local?owner=${row.owner.id}`}>See {row.owner.name}'s shelf</a>
    </div>
  {/if}
</article>

<style>
  .book-row { border-bottom: 1px solid var(--hairline); }
  .row-main { display: flex; gap: var(--s-3); align-items: center; width: 100%; padding: var(--s-3) 0; background: none; border: none; text-align: left; cursor: pointer; }
  .cover { width: 40px; height: 60px; object-fit: cover; border-radius: var(--r-sm); }
  .cover.placeholder { display: inline-flex; align-items: center; justify-content: center; font-size: 1.5rem; background: var(--surface-sunken); }
  .meta { display: flex; flex-direction: column; gap: 2px; }
  .title { font-weight: 590; color: var(--ink); }
  .author, .owner { font-size: 0.85rem; color: var(--ink-muted); }
  .star { color: var(--accent); }
</style>
```

(Keep the connect action minimal for this task; a follow-up can inline the full `sendConnectionRequest` flow. The `?owner=` link keeps People-view reuse simple and is a real, working affordance.)

- [ ] **Step 5: Implement `src/components/LocalDiscovery.svelte`**

```svelte
<script lang="ts">
  import { discovery, discoveryBooks } from '../stores/matches';
  import { groupByIntent } from '../lib/discoveryBooks';
  import BookDiscoveryRow from './BookDiscoveryRow.svelte';
  import MatchCardIsland from './MatchCardIsland.svelte';
  import MatchMapIsland from './MatchMapIsland.svelte';
  import { loadSeedUsers } from '../stores/users';
  import { useTranslations, type Lang } from '../i18n';
  import type { LocalBook, Match } from '../lib/types';

  let { lang = 'en' as Lang } = $props();
  const t = useTranslations(lang).matches;

  type View = 'books' | 'people' | 'map';
  let view = $state<View>('books');
  let query = $state('');

  let books = $state<LocalBook[]>([]);
  let people = $state<Match[]>([]);

  $effect(() => {
    const u1 = discoveryBooks.subscribe((b) => (books = b));
    const u2 = discovery.subscribe((m) => (people = m));
    loadSeedUsers();
    return () => { u1(); u2(); };
  });

  const filtered = $derived(
    query.trim()
      ? books.filter((b) =>
          (b.book.title + ' ' + b.book.author).toLowerCase().includes(query.toLowerCase()),
        )
      : books,
  );
  const groups = $derived(groupByIntent(filtered));
</script>

<div class="local">
  <div class="tabs" role="tablist">
    <button role="tab" aria-selected={view === 'books'} class:active={view === 'books'} onclick={() => (view = 'books')}>{t.views.books}</button>
    <button role="tab" aria-selected={view === 'people'} class:active={view === 'people'} onclick={() => (view = 'people')}>{t.views.people}</button>
    <button role="tab" aria-selected={view === 'map'} class:active={view === 'map'} onclick={() => (view = 'map')}>{t.views.map}</button>
  </div>

  {#if view === 'books'}
    <input class="search" type="search" placeholder="Search title or author" bind:value={query} />
    {#if groups.length === 0}
      <p class="empty">{t.empty.books}</p>
    {:else}
      {#each groups as group (group.intent)}
        <section class="group">
          <h2 class="group-head">{t.groups[group.intent]}</h2>
          {#each group.books as row (row.owner.id + row.book.id + row.intent)}
            <BookDiscoveryRow {row} {lang} />
          {/each}
        </section>
      {/each}
    {/if}
  {:else if view === 'people'}
    <div class="people">
      {#each people as match (match.user.id)}
        <MatchCardIsland {match} {lang} />
      {/each}
    </div>
  {:else}
    <MatchMapIsland {lang} />
  {/if}
</div>

<style>
  .tabs { display: flex; gap: var(--s-2); margin-bottom: var(--s-4); }
  .tabs button {
    padding: 0.5rem 1rem; border-radius: var(--r-full); border: 1px solid var(--hairline-strong);
    background: var(--surface); color: var(--ink-muted); cursor: pointer; font-weight: 590;
  }
  .tabs button.active { color: var(--accent); border-color: var(--accent); background: var(--accent-tint); }
  .search { width: 100%; padding: 0.6rem 1rem; margin-bottom: var(--s-4); border: 1px solid var(--hairline-strong); border-radius: var(--r-full); }
  .group-head { font-family: var(--font-display); font-size: 1.1rem; margin: var(--s-4) 0 var(--s-2); }
  .empty { color: var(--ink-muted); padding: var(--s-6) 0; text-align: center; }
</style>
```

Open `src/components/MatchCardIsland.svelte` first to confirm its prop name is `match` (and `lang`); if it differs, align the `<MatchCardIsland ... />` usage above.

- [ ] **Step 6: Run the smoke test**

Run: `npm run test:run -- tests/components/LocalDiscovery.test.ts`
Expected: PASS. (Align tab-name/text regexes to actual rendered strings if needed.)

- [ ] **Step 7: Swap the Local page body**

```bash
git mv src/components/MatchesPage.astro src/components/LocalPage.astro
```

In `src/components/LocalPage.astro`, replace `import MatchMapIsland from './MatchMapIsland.svelte';` with `import LocalDiscovery from './LocalDiscovery.svelte';`, and replace `<MatchMapIsland client:load lang={lang} />` with `<LocalDiscovery client:load lang={lang} />`. Keep the header-row (with Add Store link) and `PromptIsland`.

Update `src/pages/local.astro` and `src/pages/fr/local.astro` to import `LocalPage`:

```astro
import LocalPage from '../components/LocalPage.astro';
---
<LocalPage lang="en" />
```

(For `src/pages/fr/local.astro`, `lang="fr"` and import path `../../components/LocalPage.astro`.)

- [ ] **Step 8: Type check + component suite**

Run: `npx astro check`
Expected: 0 errors.
Run: `npm run test:run -- tests/components/`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "add book-first LocalDiscovery island with Books/People/Map views"
```

---

### Task 6: QA journeys + full verification

Update browser journeys for the new routes/labels/structure and run the complete gate.

**Files:**
- Modify: `qa/journeys/02-shelf.sh`, `qa/journeys/04-matches.sh`
- Modify: `CLAUDE.md` (QA table route names, if it lists `/shelf`/`/matches`)

- [ ] **Step 1: Update QA journeys**

In `qa/journeys/02-shelf.sh` and `qa/journeys/04-matches.sh`, replace URL paths `/shelf`→`/biblio`, `/matches`→`/local`, and any asserted nav-label text (`Shelf`/`Matches` → `Biblio`/`Local`). Update assertions that expected the old compose panel / match-map structure to the new bookshelf slot / Books-view tab (open each file and adjust the specific `assert`/`expect` lines).

- [ ] **Step 2: Update `CLAUDE.md` route references if present**

```bash
grep -n "/shelf\|/matches" CLAUDE.md
```

Repoint any hits to `/biblio` / `/local`.

- [ ] **Step 3: Full verification gate**

Run each and confirm:

```bash
npx astro check          # Expected: 0 errors
npm run test:run         # Expected: all suites pass
npm run build            # Expected: build succeeds
```

- [ ] **Step 4: Manual smoke (optional but recommended)**

Run `npm run dev`, then verify: `/shelf` 301s to `/biblio`; `/matches` 301s to `/local`; empty Biblio shows the add slot; adding a book lands it on the shelf; Local defaults to grouped Books feed; People/Map tabs work.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "update QA journeys and docs for /biblio and /local"
```

---

## Self-Review Notes

- **Spec coverage:** Section 1 (routes/redirects) → Task 1. Section 2 (Biblio bookshelf) → Task 4. Section 3 (Local book-first) → Task 5. Section 4 (data/store) → Tasks 2–3. Section 5 (testing) → tests in every task + Task 6 gate. All sections mapped.
- **Cold-start fallback:** handled implicitly by `compareLocalBooks` (all-zero taste scores → distance sort); Task 2 test `cold-start (all taste 0)` locks it.
- **Deferred (noted in spec, out of scope here):** full inline connect flow in `BookDiscoveryRow` (Task 5 uses a working `?owner=` link); mobile sibling repo label/deep-link mirroring — flag in PR body.
- **Type consistency:** `LocalBook`/`LocalBookGroup` defined in `src/lib/types.ts` (Task 2), consumed identically in Tasks 3 and 5. `pivotToBooks`/`groupByIntent` signatures match across tasks.
