# biblocal

A local book-lending and taste-matching webapp. People build a living bookshelf — books they own, will lend, want to discuss, are hunting for — and the app connects them locally through shared taste.

## Stack

- **Astro 6** — static output, no adapter yet (Cloudflare Workers adapter comes when deploying)
- **Svelte 5** — UI islands only, not full SPA; use `client:load` or `client:visible`
- **Nanostores** — state management; works directly with Svelte `$store` syntax (no adapter needed)
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

## Adding Cloudflare later

1. `npx astro add cloudflare --yes`
2. Set `output: 'server'` in `astro.config.mjs`
3. Add `wrangler.jsonc` and D1 bindings for persistence
4. Move any server-side logic (location queries, trust/deposit logic) into `src/pages/api/`

## Commands

```
npm run dev      # local dev server
npm run build    # production build
npx astro check  # TypeScript + Astro type check
```
