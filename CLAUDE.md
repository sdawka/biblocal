# biblocal

A local book-lending and taste-matching webapp. People build a living bookshelf — books they own, will lend, want to discuss, are hunting for — and the app connects them locally through shared taste.

## Stack

- **Astro 6** — SSR on Cloudflare Workers
- **Svelte 5** — UI islands only, not full SPA; use `client:load` or `client:visible`
- **Nanostores** — state management; works directly with Svelte `$store` syntax (no adapter needed)
- **Clerk** — authentication (middleware-based route protection)
- **D1** — SQLite database on Cloudflare
- **TypeScript** — strict mode

## Conventions

- `src/stores/` — nanostores atoms and maps; one file per domain (shelf, user, matches)
- `src/components/` — Svelte islands; suffix with `Island` for interactive components
- `src/layouts/` — Astro layout wrappers
- `src/lib/types.ts` — shared TypeScript types
- `src/lib/` — pure utilities (no framework imports)
- `src/pages/` — Astro pages (routes); keep logic-free, compose from components

## Key domain types

See `src/lib/types.ts`. Core: `Book`, `BookStatus`, `UserProfile`.

BookStatus values: `private`, `visible`, `borrowable`, `discussable`, `giftable`, `class-resource`, `seeking-home`.

## Commands

```bash
npm run dev          # local dev server
npm run build        # production build
npm run test:run     # run integration tests (vitest)
npx astro check      # TypeScript + Astro type check

# QA environment
npm run deploy:qa    # deploy to biblocal-qa worker
npm run seed:qa      # re-seed QA database
```

## QA Environment

A separate Cloudflare Workers deployment (`biblocal-qa`) with:
- **No authentication** — `QA_MODE=true` bypasses Clerk
- **Seeded test data** — users, books, bookstores for testing

### Deploy QA

```bash
./scripts/deploy-qa.sh
```

This will:
1. Run migrations on `biblocal-qa-db`
2. Seed test data (4 users, 14 books, 3 bookstores)
3. Deploy to `biblocal-qa` worker

### QA Test Data

| User | Books | Purpose |
|------|-------|---------|
| QA Tester (qa-test-user) | 6 books (various statuses) | Primary test user |
| Jane Reader | 3 books | Shelf twin match (shares Crime & Punishment) |
| Bob Collector | 2 books | Local source (has Dune, which QA user seeks) |
| Alice Lender | 2 books | Reading mentor (discussable science books) |

### Run Tests Against QA

```bash
# Browser-based journey tests
BASE_URL=https://biblocal-qa.<subdomain>.workers.dev QA_MODE=true ./qa/run-all.sh

# Integration tests (local, no server needed)
npm run test:run
```

### QA Middleware

The middleware (`src/middleware.ts`) checks `QA_MODE` env var:
- If `true`: bypasses Clerk, injects `qaUserId` into `Astro.locals`
- If `false`: normal Clerk authentication flow

## Testing

### Integration Tests (Vitest)

```
tests/
├── stores/shelf.test.ts     # shelf store operations
├── stores/profile.test.ts   # profile store operations
├── stores/sync.test.ts      # auth sync logic
└── lib/matching.test.ts     # match algorithm (all 5 facets)
```

### QA Journey Tests (agent-browser)

```
qa/
├── run-all.sh               # run all journeys
└── journeys/
    ├── 01-auth.sh           # login, logout, protected routes
    ├── 02-shelf.sh          # add books, status, filters
    ├── 03-profile.sh        # edit profile, topics
    ├── 04-matches.sh        # map, match cards
    └── 05-navigation.sh     # nav links, active states
```
