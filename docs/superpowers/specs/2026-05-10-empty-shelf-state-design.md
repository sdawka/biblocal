# Empty Shelf State Design

## Context

New users complete onboarding (name, city) and land on `/shelf` with zero books. The current empty state is minimal ("No books yet. Add your first book above."). We need a richer first-time experience that:

1. Presents two clear paths: add a book or explore nearby
2. Shows a preview of their evolving profile (private by default)
3. Encourages contribution before consumption

## Design

### Component: EmptyShelfIsland.svelte

A new Svelte island that renders on `/shelf` when the user has zero books. Replaces the current empty state in ShelfIsland.

**Layout: Top Stats Bar + Side-by-Side Choices**

```
┌─────────────────────────────────────────────────────────────┐
│ Your Shelf [Private]     0 to lend · 0 to discuss · no topics │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐    ┌──────────────────┐               │
│  │       📖         │    │       🔍         │               │
│  │   Add a Book     │    │  Explore Nearby  │               │
│  │  scan or search  │    │ books & readers  │               │
│  └──────────────────┘    └──────────────────┘               │
│   (forest green fill)     (burgundy outline)                │
└─────────────────────────────────────────────────────────────┘
```

**Visual style:** Warm & Scholarly
- Cream background (#FDF5E6)
- Stats bar: inset shadow, burgundy "Private" badge
- Add Book card: forest green (#2D4739) gradient, corner dot accents
- Explore card: burgundy (#722F37) outline, cream fill, corner dot accents
- Typography: Playfair Display headings, Crimson Text body

### User Paths

**Path A: Add a Book**
- Click → smooth scroll to AddBookIsland (already on page)
- User adds book via barcode scan or manual entry
- Book appears on shelf, stats bar updates
- At 3 books → PromptIsland triggers "go public" prompt

**Path B: Explore Nearby**
- Click → navigate to `/explore`
- /explore page handles:
  - If users nearby: blended discovery view (books, profiles, activity)
  - If zero users: share prompt with copy link
- Note: /explore page is a separate spec

### Conditional Rendering

In `src/pages/shelf.astro`:
```
if (bookCount === 0) → render EmptyShelfIsland
else → render ShelfIsland
```

### Data Dependencies

- `shelf` store: check if empty, compute stats (lendable count, discussable count)
- `profile` store: get user name for personalization

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/EmptyShelfIsland.svelte` | Create — the empty state component |
| `src/pages/shelf.astro` | Modify — conditional render logic |
| `src/stores/shelf.ts` | Modify — add helper to compute lendable/discussable counts |

## Out of Scope

- The `/explore` page (discovery view, share fallback) — separate spec
- Profile visibility toggle — handled by existing PromptIsland at 3 books
- Barcode scanning implementation — already exists in AddBookIsland

## Verification

1. Start dev server (`npm run dev`)
2. Clear localStorage to simulate new user
3. Complete onboarding → land on /shelf
4. Verify EmptyShelfIsland renders with stats bar + two cards
5. Click "Add a Book" → verify smooth scroll to AddBookIsland
6. Click "Explore Nearby" → verify navigation to /explore (or 404 if not built yet)
7. Add a book → verify EmptyShelfIsland disappears, ShelfIsland shows
8. Check responsive behavior on mobile
