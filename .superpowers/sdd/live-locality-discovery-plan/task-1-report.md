# Task 1 report: live locality discovery

## Outcome

`GET /api/users.json` now projects live D1 discovery candidates and their
visible books. It excludes the current viewer, uses two bounded queries (no
per-user book reads), and only emits map-safe profile and book fields.

## TDD evidence

- RED: `npm run test:run -- tests/integration/live-locality-simulation.test.ts`
  failed before the implementation. The real handler returned static fixture
  IDs (`seed-yuki`, `seed-maya`, ...) and the assertion that
  `montreal-sharer` appeared in discovery failed.
- GREEN: the same simulation passed after the D1-backed handler was added.

## Files changed

- `src/pages/api/users.json.ts`: D1 query, viewer exclusion, safe projection,
  visible-book filter, and generic error response.
- `src/stores/users.ts`, `src/stores/matches.ts`, and
  `src/components/MatchMapIsland.svelte`: discovery-oriented state names.
- `src/data/seed-users.json`: removed.
- `tests/integration/users-json-api.test.ts`: live in-memory D1 coverage.
- `tests/integration/live-locality-simulation.test.ts`: deterministic handler
  to discovery/locality simulation.
- `tests/stores/discovery-books.test.ts` and
  `tests/stores/matches-freeform.test.ts`: renamed store imports.

## Validation

- Focused: `npm run test:run -- tests/integration/users-json-api.test.ts tests/integration/live-locality-simulation.test.ts tests/stores/discovery-books.test.ts tests/stores/matches-freeform.test.ts tests/lib/localHub.test.ts`
  — 5 files, 19 tests passed.
- `npm run test:run` — 69 files, 713 tests passed.
- `npm run check:svelte` — 0 errors; 3 existing warnings.
- `npx astro check` — 0 errors and 4 existing hints (the first sandboxed run
  could not bind inspector port 9229; rerun with host access passed).
- `npm run build` — passed.
- `git diff --check` — passed.

## Concerns

No unresolved implementation concerns. Existing Astro/Svelte diagnostics are
outside this task and were warnings/hints only.
