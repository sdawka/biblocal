# biblocal MVP Design Spec

## Context

biblocal is a local book-lending and taste-matching webapp. The core thesis: books are the excuse, taste is the signal, conversation is the value. People build living bookshelves, and the app connects them through shared intellectual interests—not just "you might like this book" but "someone nearby is building a similar inner world."

This MVP focuses on **taste matching** with seed data. The goal is to validate the matching algorithm and faceted connection types before building real multi-user infrastructure.

## Scope

**In scope:**
- Living bookshelf (add books via ISBN scan or manual entry)
- Three-layer topic model (curated + freeform + inferred)
- Five match types: Shelf Twin, Reading Mentor, Local Source, Discussion Match, Class Chain
- Card grid on map UI for matches
- Progressive profile disclosure
- Seed fictional users for demo
- Open Library API for book metadata
- LocalStorage persistence (no server-side storage yet)

**Out of scope for MVP:**
- Real multi-user persistence (D1/Cloudflare)
- Actual location/geocoding (city + fictional distances only)
- Lending/borrowing flow
- Messaging between users
- "Ask owner about this book" feature

## Architecture

**Approach:** Static Astro output + API route for seed data. User profile and shelf persist to localStorage. Matching runs client-side.

```
src/
├── pages/
│   ├── index.astro          # landing/onboarding
│   ├── shelf.astro          # user's bookshelf
│   ├── matches.astro        # map + match cards
│   ├── profile.astro        # profile editor
│   └── api/
│       └── users.json.ts    # serves seed users
├── components/
│   ├── ShelfIsland.svelte
│   ├── AddBookIsland.svelte
│   ├── MatchMapIsland.svelte
│   ├── MatchCardIsland.svelte
│   ├── ProfileIsland.svelte
│   ├── TopicPickerIsland.svelte
│   └── BookCard.svelte
├── stores/
│   ├── shelf.ts             # persistentMap
│   ├── profile.ts           # persistentMap
│   ├── users.ts             # seed users atom
│   ├── matches.ts           # computed matches
│   └── topics.ts            # curated list + inference
├── lib/
│   ├── types.ts             # extended types
│   ├── matching.ts          # match algorithm
│   └── openLibrary.ts       # API client
└── data/
    └── seed-users.json      # 6 fictional users
```

## Data Model

### Book (extended)

```typescript
interface Book {
  id: string;
  isbn?: string;
  title: string;
  author: string;
  status: BookStatus;
  notes?: string;
  coverUrl?: string;
  subjects?: string[];        // from Open Library
  addedVia: 'scan' | 'manual'; // trust signal
  addedAt: number;
}
```

### UserTopics (three layers)

```typescript
interface UserTopics {
  curated: string[];   // from ~50 predefined topics
  freeform: string[];  // user-typed tags
  inferred: string[];  // derived from book subjects
}
```

### UserProfile (extended)

```typescript
interface UserProfile {
  id: string;
  name: string;
  city: string;
  radiusKm: number;
  topics: UserTopics;
  borrowStyle?: string;
  currentObsessions?: string[];
  shelf?: Book[];              // for seed users only
  distance?: string;           // fictional, e.g. "~2.4 km"
}
```

### Match

```typescript
interface Match {
  userId: string;
  facets: {
    shelfTwin: { count: number; books: string[] };
    readingMentor: { count: number; books: string[] };
    localSource: { count: number; books: string[] };
    discussionMatch: { count: number; topics: string[] };
    classChain: { count: number; books: string[] };
  };
  distance: string;
}
```

## Matching Algorithm

Located in `src/lib/matching.ts`. Compares user's shelf and topics against seed users.

| Facet | Logic |
|-------|-------|
| Shelf Twin | Books both own (by ISBN) |
| Reading Mentor | Books on user's want-list (`seeking-home`) that they own and marked `borrowable` or `discussable` |
| Local Source | Books user wants that they'd lend (`borrowable`) |
| Discussion Match | Overlap in curated + inferred topics |
| Class Chain | User's `class-resource` books that they also have, or vice versa |

**Sort order:** Hidden score (shelfTwin × 3, readingMentor × 2, etc.) for ordering. Users see faceted badges, not numbers.

## Open Library Integration

**Endpoint:** `https://openlibrary.org/isbn/{isbn}.json`

**Flow:**
1. User enters/scans ISBN
2. Fetch metadata (title, authors, covers, subjects)
3. Fetch author names (separate call to author keys)
4. Map subjects to curated topics via keyword matching
5. Fallback to manual entry if fetch fails

**Caching:** Store fetched results in localStorage to avoid re-fetching.

## Seed Data

Six fictional users in `src/data/seed-users.json`, designed to demonstrate all match types:

| User | Primary Match Type |
|------|-------------------|
| Maya | Shelf Twin + Discussion Match |
| Julien | Reading Mentor |
| Ana | Local Source |
| Kenji | Class Chain |
| Priya | Discussion Match |
| Sam | Shelf Twin (different vibe) |

## Progressive Profile Disclosure

Prompts triggered by milestones, all dismissable:

| Trigger | Prompt |
|---------|--------|
| 3 books | "Pick 3 topics that describe your reading taste" |
| 5 books | "Add any tags that describe your interests" |
| First match view | "How would you describe your lending style?" |
| 10 books | "What are you currently obsessed with?" |

## User Flow

1. **Onboarding:** Name + city → redirect to shelf
2. **Add books:** ISBN scan (preferred) or manual entry
3. **View shelf:** See books with status badges, change statuses
4. **View matches:** Map with card grid, tap to expand facets
5. **Build profile:** Progressive prompts as milestones hit

## Pages

- `/` — Landing, redirects to `/shelf` if profile exists
- `/shelf` — Bookshelf + add book UI
- `/matches` — Map + match cards
- `/profile` — Edit profile + topics

## Dependencies

**New packages needed:**
- `@nanostores/persistent` — localStorage persistence
- `leaflet` or `maplibre-gl` — map display (both free, no API key)

## Verification

1. **Type checking:** `npx astro check`
2. **Unit tests:** Matching algorithm with mock data
3. **Manual flow:**
   - Complete onboarding
   - Add books via ISBN and manually
   - Verify matches appear with correct facets
   - Check localStorage persistence survives refresh
   - Complete progressive prompts
4. **Edge cases:** Invalid ISBN, Open Library failure, empty shelf
5. **Responsive:** Shelf and matches pages on mobile
