# Private/Public Visibility — Security & UX Hardening

**Date:** 2026-06-20
**Status:** Approved (pending spec review)

## Goal

Audit and harden the per-book and per-note private/public visibility feature so that
private data never leaks through any read path, the QA auth bypass cannot be triggered
in production, and the related UI (intent labels) reads correctly. Add regression tests
that lock the security boundary in place.

As part of refocusing the product on its core — **local book discovery and browsing** —
also fully remove the `class-resource` intent and its `classChain` match facet (the
"classroom sharing" feature). It is a niche dimension that dilutes the core lend/discuss/gift
model; tearing it out simplifies the data model, the matching engine, and the UI.

## Background

Visibility is enforced at the **query level** — read paths add `WHERE visibility = 'visible'`
so private rows never leave the database. Mutations derive the owner from the authenticated
session (`getUserId(locals)`), never from request input, so there is no IDOR. The audit
confirmed the core paths are correct (`GET /api/books`, `GET /api/users/[id]`, matching via
`filterVisible`). The gaps are in newer/secondary read paths and in defense-in-depth.

### Confirmed correct (no change)

- `GET /api/books` (public) filters to `visible` and attaches notes via `withNotes(publicOnly=true)`.
- `GET /api/users/[id]` filters books to `visible`; contact info gated by `filterContactInfo`.
- `matching.ts:20 filterVisible` strips private books before matching — no leak via the map.
- All book/note mutations enforce ownership from the session. No IDOR.
- Notes default to `private`; books default to `visible`. This asymmetry is **intentional**:
  inventory is meant to be shared, personal commentary is not.

## Changes

### 1. Fix data leaks in `GET /api/stores/[id]`

The endpoint currently spreads raw DB rows into the response:

- `{ ...store }` ships the entire `users` row (clerk id, `contactValue`, `phone`, internal columns).
- `books: storeBooks.map(b => ({ ...b }))` ships every book column including the legacy `notes` text.

**Fix:** replace both spreads with explicit field projection.

- **Store object** → only fields the store-detail UI consumes: `id`, `name`, `city`, `type`,
  `bio`, `specialties`, and business contact fields intended to be public. No raw row, no internal ids.
  Verify the exact set against `StoreDetailIsland.svelte` during implementation.
- **Books** → the same safe shape used by other read paths: `id`, `title`, `author`, `isbn`,
  `coverUrl`, `visibility`, `ownership`, `intents`, `subjects`. Drops the legacy `notes` column.

### 2. Enforce "store books are always public"

Decision: bookstore inventory is inherently public, so `private` is not a valid state for a store book.

**Fix:** in `POST /api/stores/[id]/books`, force `visibility = 'visible'` regardless of request body.
This makes change #1's "no read filter needed" provably true rather than assumed.

### 3. QA_MODE production guard (defense-in-depth)

Today `QA_MODE === 'true'` fully bypasses Clerk. The prod worker (`biblocal`, top-level wrangler
config) never sets it, but there is no second line of defense if it ever leaks into prod vars.

**Fix — allowlist, fail closed:**

- Add an explicit `ENVIRONMENT` var to `wrangler.jsonc`: `"qa"` in the `qa` env, `"production"` in
  top-level `vars`.
- The QA bypass in `src/middleware.ts` is honored **only** when an allowlist predicate passes
  (e.g. `ENVIRONMENT === 'qa'` or local dev). Any other value — including missing/unknown — falls
  through to normal Clerk auth. Default is closed.

The exact predicate is the one genuine security/DX tradeoff in this work and will be authored by
the user during implementation (a `qaBypassAllowed(env)` helper, ~5 lines), then unit-tested.

### 4. Consistency: scope note mutations by book id

`PATCH`/`DELETE /api/books/[id]/notes/[noteId]` currently match on `noteId AND userId` only,
ignoring the `[id]` (book) URL param. Not exploitable (the caller owns the note), but the URL
contract is misleading.

**Fix:** add `book_id = :id` to the WHERE clause so the route honors its own path.

### 5. Verify/gate `GET /api/users.json`

This route returns the full `seed-users.json` file unconditionally. Confirm it is not reachable
in production; if it is, gate it behind the QA allowlist or remove it.

### 6. Remove the `class-resource` / `classChain` feature (full teardown)

The classroom-sharing dimension is removed entirely. After this change the model has exactly
three intents (`borrowable`, `discussable`, `giftable`) and four match facets (`shelfTwin`,
`readingMentor`, `localSource`, `discussionMatch`).

**Code removal:**

- `src/lib/types.ts` — drop `'class-resource'` from `BookIntent` and `BookStatus`; drop
  `classChain` from `MatchFacets`.
- `src/lib/validation.ts` — drop `'class-resource'` from `VALID_INTENTS`.
- `src/lib/matching.ts` — delete `calcClassChain`, `WEIGHTS.classChain`, and the `classChain`
  terms in `calcTotalScore`, `hasAnyMatch`, and the `facets` object in `calculateMatches`.
- `src/stores/profile.ts` — drop `'class-resource': 0` from the `intentCounts` map in
  `deriveLendingPersonality`.
- `src/components/MatchCardIsland.svelte` — drop `classChain` from `FACET_LABELS` and
  `STORE_FACET_LABELS`.
- `src/components/BookCard.svelte`, `AddBookIsland.svelte`, `ShelfIsland.svelte` — drop the
  `class-resource` intent option (folded into the centralization below).
- `src/pages/api/stores/[id]/books.ts` — drop `'class-resource'` from the inline `intents` union.
- `src/styles/theme.css` — remove `.pill[data-status="class-resource"]` and the `--st-class-*`
  custom properties (3 occurrences).

**Data / seed cleanup:**

- New drizzle migration: rewrite every `books.intents` JSON array to exclude `'class-resource'`,
  collapsing to `[]` when it was the only entry. (SQLite `json_each` + `json_group_array`, or a
  guarded string rewrite.) Leave the dead legacy `status` column untouched.
- `src/data/seed-users.json` — change or drop the 2 books that use `class-resource`.
- `scripts/scenarios/seed-power-user.sql` — update the 5 textbook rows (b36–b40) to a remaining
  intent or remove them.
- `qa/journeys/04-matches.sh` — remove `"class chain"` from the expected-facets list.

**Do NOT modify** `drizzle/0003_book_intents.sql` — it is an applied historical migration.

### 7. Intent label UX — single source of truth + correct wording

**Problem:** intent labels are duplicated in three components (`BookCard`, `AddBookIsland`,
`ShelfIsland`) and rendered after the prompt "I will…", producing "I will… **Gift**" (awkward).
With `class-resource` gone, the three remaining intents all read cleanly as nouns.

**Fix:**

- Create `src/lib/intents.ts` as the single source of truth (pure utility, per `src/lib/` convention):
  exports the intent label map and the prompt copy for the three remaining intents.
- Reword the prompt from "I will…" to **"Open to:"** so the labels read correctly in both the
  selector and standalone-badge contexts.
- Labels: **Lending · Discussion · Gifting**.
- Replace the three duplicated maps with imports from `src/lib/intents.ts`.

### 8. Regression tests (primary deliverable)

Follow existing `vitest` patterns in `tests/`. Server-boundary assertions:

- Private book never appears in `GET /api/books` (public) or `GET /api/users/[id]`; owner
  (`?mine=true`) sees it.
- Private note never appears in any public read; owner sees it.
- `GET /api/stores/[id]` response contains **no** PII/internal columns — assert the exact key set.
- `POST /api/stores/[id]/books` with `visibility: 'private'` is stored/returned as `visible`.
- New book defaults to `visible`; new note defaults to `private`.
- Non-owner `PATCH`/`DELETE` of another user's book or note returns 404 (no mutation, no existence leak).
- `qaBypassAllowed(env)` returns false for `ENVIRONMENT='production'` and unknown/missing values;
  true only for the allowed environment(s).

**Class-resource teardown (#6):**

- Update `tests/lib/matching.test.ts` — remove the `classChain facet` describe block and any
  `facets.classChain` references; assert `MatchFacets` has exactly the four remaining facets.
- Update `tests/api/books-public.test.ts:181` — drop `'class-resource'` from the valid-intents list.
- Migration test: a book stored with `intents` containing `'class-resource'` is rewritten to exclude
  it (and to `[]` when it was the sole entry).

## Out of scope

- Rate limiting on public read endpoints.
- Match-card facet label redesign for the remaining four facets.

## Files touched (anticipated)

- `src/pages/api/stores/[id].ts` — projection (#1)
- `src/pages/api/stores/[id]/books.ts` — force visible (#2) + drop intent from union (#6)
- `src/middleware.ts`, `src/lib/auth.ts` (or new `qaBypassAllowed` helper) — QA guard (#3)
- `wrangler.jsonc` — `ENVIRONMENT` var (#3)
- `src/pages/api/books/[id]/notes/[noteId].ts` — book_id scoping (#4)
- `src/pages/api/users.json.ts` — gate/remove (#5)
- `src/lib/types.ts`, `src/lib/validation.ts`, `src/lib/matching.ts`, `src/stores/profile.ts`,
  `src/components/MatchCardIsland.svelte`, `src/styles/theme.css` — class-resource teardown (#6)
- new `drizzle/00NN_drop_class_resource.sql` — intents data migration (#6)
- `src/data/seed-users.json`, `scripts/scenarios/seed-power-user.sql`, `qa/journeys/04-matches.sh` — seed/QA cleanup (#6)
- `src/lib/intents.ts` (new) + `BookCard.svelte`, `AddBookIsland.svelte`, `ShelfIsland.svelte` — labels (#7)
- `tests/` — new regression specs + class-resource test cleanup (#7, #6)
