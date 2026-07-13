# Biblio & Local Redesign

**Date:** 2026-07-12
**Status:** Approved (design)

## Summary

Reshape the app's two primary authenticated pages so each is focused around one
idea:

- **Biblio** (`/shelf` → `/biblio`) — your books, presented as a single
  bookshelf object: an empty shelf, or a shelf whose `+` slot has expanded into
  the add-book form, or a populated shelf of covers on ledges.
- **Local** (`/matches` → `/local`) — book-first local discovery: a feed of
  individual books available nearby, grouped by what you can do with them and
  ordered by taste-fit, with People and Map as secondary views.

This is primarily a presentation/UX reshape. The only new domain logic is a pure
pivot of existing discovery data from person-keyed to book-keyed rows. No changes
to the data model (`Book`, `UserProfile`, `Match`), the matching algorithm, the
sync layer, or any `/api/*` route.

## Goals

- One coherent bookshelf object on Biblio that unifies empty / adding / populated
  states.
- Make discovering *books* nearby easy: books are the primary unit, action is
  explicit (borrow/discuss/gift), relevance rises to the top.
- Rename routes to `/biblio` and `/local` "properly" — redirects, i18n, config,
  robots, all internal links.
- No regressions: existing vitest suite green, `astro check` clean, QA journeys
  updated.

## Non-goals

- No change to the matching math in `src/lib/matching.ts` (`calculateDiscovery`).
- No change to the three-dimensional book model (`visibility` / `ownership` /
  `intents`) or `Match`/`MatchFacets` shapes.
- No change to any `/api/*` endpoint (mobile sibling app depends on these; Bearer
  auth path stays intact).
- No new backend, no schema/migration changes.

---

## Section 1 — Routes & redirects

Rename the page routes and mirror everywhere they are referenced.

- Move `src/pages/shelf.astro` → `src/pages/biblio.astro`; `src/pages/matches.astro`
  → `src/pages/local.astro`. Mirror the `/fr` equivalents under `src/pages/fr/`.
- **Redirects** (301) in `astro.config.mjs` `redirects`:
  `/shelf` → `/biblio`, `/matches` → `/local`, plus `/fr/shelf` → `/fr/biblio`,
  `/fr/matches` → `/fr/local`. These protect existing bookmarks and any mobile
  deep-links; the pages are auth-gated and already excluded from SEO, so this is
  not an SEO concern.
- **`astro.config.mjs`** `PRIVATE_PREFIXES`: replace `/shelf`, `/matches` with
  `/biblio`, `/local` (keeps them out of the sitemap).
- **`public/robots.txt`**: `Disallow: /biblio` and `Disallow: /local` (replace
  the old lines).
- **`src/middleware.ts`**: the signed-in-home redirect target changes from
  `/shelf` (`/fr/shelf`) to `/biblio` (`/fr/biblio`). Update any route matcher
  entries referencing the old paths.
- **Internal links** — update every hardcoded href/redirect:
  - `/shelf`: `src/stores/profile.ts`, `src/stores/auth.ts`, `src/stores/matches.ts`,
    `OnboardingIsland.svelte`, `AddBookIsland.svelte`, `EmptyShelfIsland.svelte`,
    `ShelfContainer.svelte`, `ShelfIsland.svelte`, `PromptIsland.svelte`,
    `ImportIsland.svelte`, `ProfileIsland.svelte`, `Layout.astro`.
  - `/matches`: `EmptyShelfIsland.svelte`, `StoresNewPage.astro`,
    `StoreDetailPage.astro`, `MatchMapIsland.svelte`, `Layout.astro`.
- **i18n strings** (`src/i18n/`): nav label "Your Books" → **"Biblio"** (EN + FR);
  "Local" stays. Verify FR nav string.
- **API routes untouched.** `/api/books*`, `/api/users.json`, etc. keep their
  paths.

Acceptance: visiting `/shelf` 301-redirects to `/biblio`; `/matches` → `/local`;
`/fr` variants likewise. No internal link points at an old path
(`grep -rn "/shelf\b\|/matches\b" src` returns only redirect definitions).

---

## Section 2 — Biblio (the bookshelf)

Replace the stacked panels (compose `<section>` + `ShelfContainer` →
`EmptyShelfIsland`/`ShelfIsland`) with **one `Bookshelf` island** that renders one
of three states of the same shelf object. `AddBookIsland` and `BookCard` are
reused wholesale.

**Visual:** covers face-out, resting in rows on rendered shelf ledges
(cover-grid-on-ledges). Rows wrap responsively.

**States:**

1. **Empty** — a shelf frame holding a single large `+` slot labeled "Add your
   first book." No separate empty-state component; the empty shelf *is* the
   affordance.
2. **Adding** — tapping the `+` slot expands it in place into the existing
   `AddBookIsland` flow (ISBN / scan / manual → preview → ownership · intents ·
   visibility → save). On save the form collapses and the new cover appears on the
   shelf; on cancel it collapses back to a `+` slot.
3. **Populated** — covers on ledges with a trailing `+` slot always at the end of
   the last row. Each cover keeps intent badges and click-to-expand detail (notes,
   edit, delete) via `BookCard`.

**Filters** — the existing filter panel (have/seeking, intent, private-only, with
counts and clear) moves to a compact bar above the shelf frame. Logic unchanged;
restyled to belong to the shelf.

**Goodreads import** — retained, as a small "Import" affordance near the `+` slot
(reuses `ImportIsland`) rather than its own panel/`<details>`.

**Component boundaries:**
- `Bookshelf.svelte` (new) — orchestrates the three states, owns the `+` slot and
  expansion; subscribes to `shelf` + `activeFilters`.
- `AddBookIsland.svelte` — unchanged logic, now rendered inside the expanded slot.
- `BookCard.svelte` — unchanged.
- `EmptyShelfIsland.svelte`, `ShelfContainer.svelte` — retired (folded into
  `Bookshelf`). `ShelfIsland.svelte`'s grid/filter logic is absorbed or kept as a
  child; decide during planning to keep the diff reviewable.

Acceptance: empty account shows an empty shelf with a `+` slot; adding a book
expands the form in place and lands the cover on the shelf; filters still work;
import still works.

---

## Section 3 — Local (book-first discovery)

One `LocalDiscovery` island with a **view switcher: Books · People · Map**.

**Books (default view):**
- Feed of individual books available nearby, one row per (book × sharable intent).
- **Grouped** into sections: **To borrow**, **To discuss**, **Free & giftable**.
- **Within each group, ordered taste-fit first** (using the per-book taste score),
  then by distance.
- Row = cover + title/author + owner name + distance + taste badge (★ signal).
- Tapping a book reveals who has it and the connect/borrow action (reuses the
  connection request flow from `MatchCardIsland`).
- **Cold-start fallback:** if the user has no taste signal (empty shelf / no
  topics), order purely by distance so the feed is never empty.

**Filter/search bar (top of Books view):**
- Text search by title/author.
- Proximity radius.
- Intent quick-filters that also scroll to / isolate the matching group.

**People view:** today's `MatchMapIsland` card list (shelf twin / reading mentor /
local source / discussion match), kept ~as-is, now a secondary tab.

**Map view:** today's Leaflet map as a standalone tab — proximity-only, "just
local." Pins still cross-link to their cards.

**Component boundaries:**
- `LocalDiscovery.svelte` (new) — owns the view switcher + filter/search state.
- `BookDiscoveryRow.svelte` (new) — one book row with expand-to-connect.
- `MatchMapIsland.svelte` / `MatchCardIsland.svelte` — reused for People and Map
  views (extracted/reused, not rewritten).

Acceptance: landing on `/local` shows the grouped, taste-ordered Books feed;
switching to People/Map works; cold-start account still sees nearby books.

---

## Section 4 — Data / store change

The only new domain logic. Pivot existing discovery data; do not recompute it.

- **`src/lib/pivotToBooks.ts`** (new, pure) —
  `pivotToBooks(matches: Match[]): LocalBook[]`. Expands each `Match` into one
  `LocalBook` per (offered/sharable book × intent), carrying
  `{ book, owner, intent, distanceKm, tasteScore }`. Handles:
  - grouping key by intent,
  - taste-fit ordering within group (derive `tasteScore` from the match's facet
    scores / offering),
  - cold-start fallback ordering (distance-only when no taste signal),
  - dedup when several people offer the same title (keep distinct rows per owner,
    but stable ordering).
- **`src/stores/matches.ts`** — add `discoveryBooks` computed store deriving from
  the existing `discovery` computed (so it reacts to `shelf` + `profile` +
  `seedUsers` automatically). No change to `discovery` itself.
- **`src/lib/types.ts`** — add `LocalBook` (and `LocalBookIntentGroup` if the
  grouping is materialized) types.

---

## Section 5 — Testing & verification

Measure ten times, cut once.

- **Unit (`tests/lib/`):** `pivotToBooks` — grouping by intent, taste-fit ordering
  within group, cold-start (no taste signal → distance order), dedup across owners
  offering the same title, empty input.
- **Store (`tests/stores/`):** `discoveryBooks` recomputes when `shelf` / `profile`
  change; reflects loaded `seedUsers`.
- **Redirects:** `/shelf`→`/biblio`, `/matches`→`/local` (+ `/fr` variants) return
  301 to the new path.
- **Type/build:** `npx astro check` clean; `npm run test:run` green; `npm run build`
  succeeds.
- **QA journeys:** update `qa/journeys/02-shelf.sh` and `04-matches.sh` for the new
  routes/labels and the new Biblio/Local structure.

## Rollout / risk notes

- Retiring `EmptyShelfIsland` / `ShelfContainer` and moving `ShelfIsland` logic is
  the largest single diff; keep it reviewable by preserving child components where
  practical.
- Route rename must land atomically with redirects + robots + config so no state
  leaves a broken internal link.
- Mobile sibling repo (`../biblocal-mobile`): no API change, but its deep-links /
  any hardcoded web paths and its nav labels should be mirrored in a follow-up
  (out of scope for this spec; note in PR).
