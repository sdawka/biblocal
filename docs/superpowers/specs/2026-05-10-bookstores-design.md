# Bookstores Feature Design

## Context

biblocal currently focuses on people and their personal bookshelves, matching users based on shared taste and local availability. Users have requested the ability to discover local indie bookstores — not just as inventory sources, but as taste-matched community members with their own personalities.

This design adds bookstores as first-class entities that participate in the matching system alongside people.

## Requirements

- Bookstores appear in matches based on **inventory overlap** (do they have books I want?) and **taste alignment** (do their specialties match my interests?)
- Stores have a **featured shelf** (curated books they highlight) that doubles as notable inventory
- Stores have **specialty tags** for broad filtering and matching
- **Community-contributed**: any user can add a store (no claiming mechanism for MVP)
- **Unified discovery**: stores mixed with people on the matches screen

## Data Model

### Schema changes (`src/db/schema.ts`)

Extend `users` table with:

```typescript
type: text('type').default('person'), // 'person' | 'bookstore'

// Store-specific fields (nullable)
address: text('address'),
neighborhood: text('neighborhood'),
website: text('website'),
phone: text('phone'),
specialties: text('specialties'), // JSON array
addedBy: text('added_by').references(() => users.id),
```

### Type changes (`src/lib/types.ts`)

```typescript
export type EntityType = 'person' | 'bookstore';

// Extend UserProfile
export interface UserProfile {
  // ... existing fields
  type: EntityType;
  address?: string;
  neighborhood?: string;
  website?: string;
  phone?: string;
  specialties?: string[];
  addedBy?: string;
}
```

### Books table

Unchanged. Stores use the same `books` table — their "featured shelf" is books linked to their user ID.

## Matching Logic

Stores participate in the existing matching algorithm. The `calculateMatches()` function requires no changes because:

- Store's `shelf` = their featured books
- Store's `topics.curated` = their specialties

| Facet | Person → Store interpretation |
|-------|------------------------------|
| shelfTwin | Books you own that the store features |
| readingMentor | Store has books you're seeking |
| localSource | Store sells books you want |
| discussionMatch | Your topics match store specialties |
| classChain | Store has class resources you need |

## UI Changes

### MatchCardIsland

- Detect `type === 'bookstore'` and render store-styled card
- Show: name, neighborhood, specialties as tags
- Distinct icon/badge to differentiate from people
- Expanded view: address, website link, featured shelf preview

### MatchMapIsland

- Stores get distinct marker icon (storefront vs person pin)
- Same click-to-card behavior

### AddStoreIsland (new component)

Simple form:
- Name (required)
- Neighborhood (dropdown)
- Address (required)
- Website, phone (optional)
- Specialties picker (reuse topic vocabulary)

No featured shelf on initial add — books added later via store detail view.

### Adding books to a store's shelf

After creating a store, user navigates to that store's detail view (or is redirected there). An "Add featured book" button opens AddBookIsland scoped to that store's ID. Books are saved with `userId` = store's ID.

For MVP, only the user who added the store can add books to it (`addedBy` check).

### Navigation

- "Know a great bookstore?" prompt on matches screen
- Links to `/stores/new` or modal with AddStoreIsland

## Seed Data

Montreal indie bookstores for initial deployment:

| Store | Neighborhood | Specialties |
|-------|--------------|-------------|
| Argo Bookshop | Shaughnessy Village | poetry, philosophy, linguistics, Japan, marginalized voices |
| Librairie Drawn & Quarterly | Mile End | graphic novels, comics, indie lit, art books |
| The Word | McGill Ghetto | used books, literature, philosophy, poetry |
| Librairie Saint-Henri Books | Saint-Henri | diverse voices, POC authors, queer lit, Indigenous authors |
| Pulp Books & Café | Verdun | contemporary fiction, graphic novels, café |
| S.W. Welch | Mile End | used books, rare books, eclectic |

Seeding via D1 migration script or idempotent API route.

## Verification

1. **Schema migration** — Run `npx drizzle-kit push`, verify new columns in D1
2. **Seed stores** — Run seed script, verify 6 stores in database
3. **Add featured books** — Add books to a store via AddBookIsland
4. **Check matches** — User with `seeking-home` books sees stores with matching inventory
5. **Map markers** — Stores show distinct icons on MatchMapIsland
6. **Card rendering** — Store card shows address, website, specialties
7. **Add new store** — AddStoreIsland form works, store appears in matches

## Future Considerations (out of scope for MVP)

- Store claiming with email verification
- Enhanced store profiles (hours, photos, events)
- Inventory sync integrations
- Store-specific pages (`/store/[id]`)
