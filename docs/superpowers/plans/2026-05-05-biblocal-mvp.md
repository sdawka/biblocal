# biblocal MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a taste-matching MVP where users add books to a living bookshelf and see faceted matches against seed users (Shelf Twin, Reading Mentor, Local Source, Discussion Match, Class Chain).

**Architecture:** Static Astro + Svelte islands. User data persists to localStorage via nanostores/persistent. Seed users served from API route. Matching runs client-side. Map displays matches with fictional distances.

**Tech Stack:** Astro 6, Svelte 5, Nanostores, @nanostores/persistent, Leaflet, Open Library API

---

## File Structure

```
src/
├── lib/
│   ├── types.ts           # MODIFY: Add Book, UserTopics, UserProfile, Match types
│   ├── matching.ts        # CREATE: Match calculation algorithm
│   └── openLibrary.ts     # CREATE: Open Library API client
├── stores/
│   ├── shelf.ts           # MODIFY: Add persistence, extend actions
│   ├── profile.ts         # CREATE: User profile store
│   ├── users.ts           # CREATE: Seed users store
│   ├── matches.ts         # CREATE: Computed matches
│   └── topics.ts          # CREATE: Curated topics + inference
├── data/
│   └── seed-users.json    # CREATE: 6 fictional users
├── components/
│   ├── ShelfIsland.svelte      # MODIFY: Use BookCard, integrate AddBook
│   ├── AddBookIsland.svelte    # CREATE: ISBN + manual entry
│   ├── BookCard.svelte         # CREATE: Reusable book display
│   ├── TopicPickerIsland.svelte # CREATE: Curated + freeform topics
│   ├── ProfileIsland.svelte    # CREATE: Profile editor
│   ├── MatchCardIsland.svelte  # CREATE: Match card with facets
│   ├── MatchMapIsland.svelte   # CREATE: Map + cards
│   └── PromptIsland.svelte     # CREATE: Progressive prompts
├── layouts/
│   └── Layout.astro       # MODIFY: Add navigation
└── pages/
    ├── index.astro        # MODIFY: Add onboarding
    ├── shelf.astro        # MODIFY: Add AddBook, prompts
    ├── matches.astro      # CREATE: Map view
    ├── profile.astro      # CREATE: Profile editor
    └── api/
        └── users.json.ts  # CREATE: Serve seed users
```

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install nanostores persistent**

Run:
```bash
npm install @nanostores/persistent
```

- [ ] **Step 2: Install Leaflet and types**

Run:
```bash
npm install leaflet
npm install -D @types/leaflet
```

- [ ] **Step 3: Verify installation**

Run:
```bash
npm ls @nanostores/persistent leaflet
```

Expected: Both packages listed without errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add @nanostores/persistent and leaflet"
```

---

## Task 2: Extend Types

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Replace types.ts with extended types**

```typescript
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
  status: BookStatus;
  notes?: string;
  coverUrl?: string;
  subjects?: string[];
  addedVia: 'scan' | 'manual';
  addedAt: number;
}

export interface UserTopics {
  curated: string[];
  freeform: string[];
  inferred: string[];
}

export interface UserProfile {
  id: string;
  name: string;
  city: string;
  radiusKm: number;
  topics: UserTopics;
  borrowStyle?: string;
  currentObsessions?: string[];
  shelf?: Book[];
  distance?: string;
}

export interface MatchFacet {
  count: number;
  items: string[];
}

export interface MatchFacets {
  shelfTwin: MatchFacet;
  readingMentor: MatchFacet;
  localSource: MatchFacet;
  discussionMatch: MatchFacet;
  classChain: MatchFacet;
}

export interface Match {
  user: UserProfile;
  facets: MatchFacets;
  totalScore: number;
}
```

- [ ] **Step 2: Type check**

Run:
```bash
npx astro check
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: extend types for matching and profiles"
```

---

## Task 3: Create Curated Topics

**Files:**
- Create: `src/stores/topics.ts`

- [ ] **Step 1: Create topics store with curated list**

```typescript
import { atom } from 'nanostores';

export const CURATED_TOPICS = [
  'fiction',
  'non-fiction',
  'philosophy',
  'psychology',
  'history',
  'science',
  'technology',
  'mathematics',
  'economics',
  'politics',
  'sociology',
  'anthropology',
  'systems-thinking',
  'complexity',
  'cybernetics',
  'design',
  'architecture',
  'urbanism',
  'ecology',
  'spirituality',
  'mysticism',
  'religion',
  'poetry',
  'memoir',
  'biography',
  'essays',
  'science-fiction',
  'fantasy',
  'literary-fiction',
  'classics',
  'education',
  'pedagogy',
  'parenting',
  'self-help',
  'business',
  'management',
  'leadership',
  'creativity',
  'art',
  'music',
  'film',
  'photography',
  'cooking',
  'travel',
  'nature',
  'health',
  'fitness',
  'mindfulness',
  'ethics',
  'law',
] as const;

export type CuratedTopic = typeof CURATED_TOPICS[number];

const SUBJECT_TO_TOPIC: Record<string, CuratedTopic> = {
  'philosophy': 'philosophy',
  'philosophical': 'philosophy',
  'psychology': 'psychology',
  'psychological': 'psychology',
  'history': 'history',
  'historical': 'history',
  'science': 'science',
  'scientific': 'science',
  'technology': 'technology',
  'computer': 'technology',
  'mathematics': 'mathematics',
  'mathematical': 'mathematics',
  'economics': 'economics',
  'economic': 'economics',
  'politics': 'politics',
  'political': 'politics',
  'sociology': 'sociology',
  'social': 'sociology',
  'anthropology': 'anthropology',
  'systems': 'systems-thinking',
  'complexity': 'complexity',
  'design': 'design',
  'architecture': 'architecture',
  'urban': 'urbanism',
  'ecology': 'ecology',
  'spiritual': 'spirituality',
  'mysticism': 'mysticism',
  'religion': 'religion',
  'religious': 'religion',
  'poetry': 'poetry',
  'poems': 'poetry',
  'memoir': 'memoir',
  'biography': 'biography',
  'fiction': 'fiction',
  'novel': 'fiction',
  'science fiction': 'science-fiction',
  'fantasy': 'fantasy',
  'education': 'education',
  'pedagogy': 'pedagogy',
  'business': 'business',
  'management': 'management',
  'leadership': 'leadership',
  'art': 'art',
  'music': 'music',
  'film': 'film',
  'ethics': 'ethics',
  'moral': 'ethics',
};

export function inferTopicsFromSubjects(subjects: string[]): CuratedTopic[] {
  const inferred = new Set<CuratedTopic>();
  
  for (const subject of subjects) {
    const lower = subject.toLowerCase();
    for (const [keyword, topic] of Object.entries(SUBJECT_TO_TOPIC)) {
      if (lower.includes(keyword)) {
        inferred.add(topic);
      }
    }
  }
  
  return Array.from(inferred);
}
```

- [ ] **Step 2: Type check**

Run:
```bash
npx astro check
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/stores/topics.ts
git commit -m "feat: add curated topics and inference"
```

---

## Task 4: Update Shelf Store with Persistence

**Files:**
- Modify: `src/stores/shelf.ts`

- [ ] **Step 1: Update shelf.ts with persistence and extended actions**

```typescript
import { persistentMap, persistentAtom } from '@nanostores/persistent';
import type { Book, BookStatus } from '../lib/types';
import { inferTopicsFromSubjects } from './topics';

export const shelf = persistentMap<Record<string, Book>>('biblocal:shelf:v1', {});

export const activeFilter = persistentAtom<BookStatus | 'all'>('biblocal:filter:v1', 'all');

export function addBook(book: Omit<Book, 'id' | 'addedAt'> & { id?: string }): Book {
  const fullBook: Book = {
    ...book,
    id: book.id ?? crypto.randomUUID(),
    addedAt: Date.now(),
  };
  shelf.setKey(fullBook.id, fullBook);
  return fullBook;
}

export function updateBook(id: string, updates: Partial<Book>) {
  const book = shelf.get()[id];
  if (book) {
    shelf.setKey(id, { ...book, ...updates });
  }
}

export function updateBookStatus(id: string, status: BookStatus) {
  updateBook(id, { status });
}

export function removeBook(id: string) {
  const current = { ...shelf.get() };
  delete current[id];
  shelf.set(current);
}

export function getBookCount(): number {
  return Object.keys(shelf.get()).length;
}

export function getInferredTopics(): string[] {
  const books = Object.values(shelf.get());
  const allSubjects = books.flatMap(b => b.subjects ?? []);
  return inferTopicsFromSubjects(allSubjects);
}
```

- [ ] **Step 2: Type check**

Run:
```bash
npx astro check
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/stores/shelf.ts
git commit -m "feat: add shelf persistence and extended actions"
```

---

## Task 5: Create Profile Store

**Files:**
- Create: `src/stores/profile.ts`

- [ ] **Step 1: Create profile store**

```typescript
import { persistentMap, persistentAtom } from '@nanostores/persistent';
import type { UserProfile, UserTopics } from '../lib/types';

const DEFAULT_TOPICS: UserTopics = {
  curated: [],
  freeform: [],
  inferred: [],
};

const DEFAULT_PROFILE: UserProfile = {
  id: '',
  name: '',
  city: '',
  radiusKm: 5,
  topics: DEFAULT_TOPICS,
};

export const profile = persistentMap<UserProfile>('biblocal:profile:v1', DEFAULT_PROFILE);

export const dismissedPrompts = persistentAtom<string[]>('biblocal:dismissed:v1', []);

export function initProfile(name: string, city: string): void {
  profile.set({
    ...DEFAULT_PROFILE,
    id: crypto.randomUUID(),
    name,
    city,
  });
}

export function isOnboarded(): boolean {
  const p = profile.get();
  return p.id !== '' && p.name !== '' && p.city !== '';
}

export function updateProfile(updates: Partial<UserProfile>): void {
  const current = profile.get();
  profile.set({ ...current, ...updates });
}

export function updateTopics(topics: Partial<UserTopics>): void {
  const current = profile.get();
  profile.set({
    ...current,
    topics: { ...current.topics, ...topics },
  });
}

export function dismissPrompt(promptId: string): void {
  const current = dismissedPrompts.get();
  if (!current.includes(promptId)) {
    dismissedPrompts.set([...current, promptId]);
  }
}

export function isPromptDismissed(promptId: string): boolean {
  return dismissedPrompts.get().includes(promptId);
}
```

- [ ] **Step 2: Type check**

Run:
```bash
npx astro check
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/stores/profile.ts
git commit -m "feat: add profile store with progressive disclosure"
```

---

## Task 6: Create Seed Data

**Files:**
- Create: `src/data/seed-users.json`

- [ ] **Step 1: Create data directory**

Run:
```bash
mkdir -p src/data
```

- [ ] **Step 2: Create seed-users.json**

```json
[
  {
    "id": "seed-maya",
    "name": "Maya",
    "city": "Demo City",
    "radiusKm": 5,
    "distance": "~1.2 km",
    "topics": {
      "curated": ["systems-thinking", "anthropology", "fiction"],
      "freeform": ["organizational design", "Le Guin fan"],
      "inferred": ["sociology", "science-fiction"]
    },
    "shelf": [
      {
        "id": "maya-1",
        "isbn": "9780300246759",
        "title": "Seeing Like a State",
        "author": "James C. Scott",
        "status": "discussable",
        "addedVia": "scan",
        "addedAt": 1714900000000
      },
      {
        "id": "maya-2",
        "isbn": "9780061054884",
        "title": "The Dispossessed",
        "author": "Ursula K. Le Guin",
        "status": "borrowable",
        "addedVia": "scan",
        "addedAt": 1714900000000
      },
      {
        "id": "maya-3",
        "isbn": "9780465026562",
        "title": "Gödel, Escher, Bach",
        "author": "Douglas Hofstadter",
        "status": "discussable",
        "addedVia": "scan",
        "addedAt": 1714900000000
      }
    ]
  },
  {
    "id": "seed-julien",
    "name": "Julien",
    "city": "Demo City",
    "radiusKm": 5,
    "distance": "~2.8 km",
    "topics": {
      "curated": ["philosophy", "urbanism", "science-fiction"],
      "freeform": ["speculative design", "solarpunk"],
      "inferred": ["architecture", "ecology"]
    },
    "shelf": [
      {
        "id": "julien-1",
        "isbn": "9780195019193",
        "title": "The Timeless Way of Building",
        "author": "Christopher Alexander",
        "status": "borrowable",
        "addedVia": "scan",
        "addedAt": 1714900000000
      },
      {
        "id": "julien-2",
        "isbn": "9780140449136",
        "title": "Meditations",
        "author": "Marcus Aurelius",
        "status": "discussable",
        "addedVia": "scan",
        "addedAt": 1714900000000
      }
    ]
  },
  {
    "id": "seed-ana",
    "name": "Ana",
    "city": "Demo City",
    "radiusKm": 10,
    "distance": "~0.8 km",
    "topics": {
      "curated": ["education", "systems-thinking", "psychology"],
      "freeform": ["folklore", "indigenous knowledge"],
      "inferred": ["anthropology", "pedagogy"]
    },
    "borrowStyle": "generous lender, flexible returns",
    "shelf": [
      {
        "id": "ana-1",
        "isbn": "9780826412768",
        "title": "Pedagogy of the Oppressed",
        "author": "Paulo Freire",
        "status": "borrowable",
        "addedVia": "scan",
        "addedAt": 1714900000000
      },
      {
        "id": "ana-2",
        "isbn": "9780374533557",
        "title": "Thinking, Fast and Slow",
        "author": "Daniel Kahneman",
        "status": "borrowable",
        "addedVia": "scan",
        "addedAt": 1714900000000
      }
    ]
  },
  {
    "id": "seed-kenji",
    "name": "Kenji",
    "city": "Demo City",
    "radiusKm": 3,
    "distance": "~1.5 km",
    "topics": {
      "curated": ["mathematics", "complexity", "economics"],
      "freeform": ["game theory", "mechanism design"],
      "inferred": ["systems-thinking", "technology"]
    },
    "shelf": [
      {
        "id": "kenji-1",
        "isbn": "9780691140513",
        "title": "The Art of Strategy",
        "author": "Avinash Dixit",
        "status": "class-resource",
        "addedVia": "scan",
        "addedAt": 1714900000000
      },
      {
        "id": "kenji-2",
        "isbn": "9780465026562",
        "title": "Gödel, Escher, Bach",
        "author": "Douglas Hofstadter",
        "status": "class-resource",
        "addedVia": "scan",
        "addedAt": 1714900000000
      }
    ]
  },
  {
    "id": "seed-priya",
    "name": "Priya",
    "city": "Demo City",
    "radiusKm": 5,
    "distance": "~3.2 km",
    "topics": {
      "curated": ["mysticism", "poetry", "psychology"],
      "freeform": ["Rumi", "contemplative practice"],
      "inferred": ["spirituality", "philosophy"]
    },
    "shelf": [
      {
        "id": "priya-1",
        "isbn": "9780060958794",
        "title": "The Essential Rumi",
        "author": "Rumi (Coleman Barks)",
        "status": "discussable",
        "addedVia": "scan",
        "addedAt": 1714900000000
      },
      {
        "id": "priya-2",
        "isbn": "9780807014295",
        "title": "Man's Search for Meaning",
        "author": "Viktor Frankl",
        "status": "borrowable",
        "addedVia": "scan",
        "addedAt": 1714900000000
      }
    ]
  },
  {
    "id": "seed-sam",
    "name": "Sam",
    "city": "Demo City",
    "radiusKm": 7,
    "distance": "~4.1 km",
    "topics": {
      "curated": ["technology", "business", "design"],
      "freeform": ["startup culture", "product thinking"],
      "inferred": ["management", "creativity"]
    },
    "shelf": [
      {
        "id": "sam-1",
        "isbn": "9780300246759",
        "title": "Seeing Like a State",
        "author": "James C. Scott",
        "status": "borrowable",
        "addedVia": "scan",
        "addedAt": 1714900000000
      },
      {
        "id": "sam-2",
        "isbn": "9781591847816",
        "title": "Designing Your Life",
        "author": "Bill Burnett",
        "status": "borrowable",
        "addedVia": "scan",
        "addedAt": 1714900000000
      }
    ]
  }
]
```

- [ ] **Step 3: Commit**

```bash
git add src/data/seed-users.json
git commit -m "feat: add seed users for matching demo"
```

---

## Task 7: Create Users API Route

**Files:**
- Create: `src/pages/api/users.json.ts`

- [ ] **Step 1: Create api directory**

Run:
```bash
mkdir -p src/pages/api
```

- [ ] **Step 2: Create users.json.ts**

```typescript
import type { APIRoute } from 'astro';
import seedUsers from '../../data/seed-users.json';

export const GET: APIRoute = () => {
  return new Response(JSON.stringify(seedUsers), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
};
```

- [ ] **Step 3: Type check**

Run:
```bash
npx astro check
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/api/users.json.ts
git commit -m "feat: add API route for seed users"
```

---

## Task 8: Create Users Store

**Files:**
- Create: `src/stores/users.ts`

- [ ] **Step 1: Create users store**

```typescript
import { atom } from 'nanostores';
import type { UserProfile } from '../lib/types';

export const seedUsers = atom<UserProfile[]>([]);
export const usersLoading = atom<boolean>(false);
export const usersError = atom<string | null>(null);

export async function loadSeedUsers(): Promise<void> {
  if (seedUsers.get().length > 0) return;
  
  usersLoading.set(true);
  usersError.set(null);
  
  try {
    const res = await fetch('/api/users.json');
    if (!res.ok) throw new Error('Failed to load users');
    const data = await res.json();
    seedUsers.set(data);
  } catch (err) {
    usersError.set(err instanceof Error ? err.message : 'Unknown error');
  } finally {
    usersLoading.set(false);
  }
}
```

- [ ] **Step 2: Type check**

Run:
```bash
npx astro check
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/stores/users.ts
git commit -m "feat: add users store for seed data"
```

---

## Task 9: Create Open Library Client

**Files:**
- Create: `src/lib/openLibrary.ts`

- [ ] **Step 1: Create openLibrary.ts**

```typescript
import type { Book } from './types';

interface OpenLibraryBook {
  title: string;
  authors?: { key: string }[];
  covers?: number[];
  subjects?: string[];
}

interface OpenLibraryAuthor {
  name: string;
}

const CACHE_KEY = 'biblocal:isbn-cache:v1';

function getCache(): Record<string, Partial<Book>> {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

function setCache(isbn: string, book: Partial<Book>): void {
  try {
    const cache = getCache();
    cache[isbn] = book;
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage full or unavailable
  }
}

async function fetchAuthorName(authorKey: string): Promise<string> {
  try {
    const res = await fetch(`https://openlibrary.org${authorKey}.json`);
    if (!res.ok) return 'Unknown Author';
    const data: OpenLibraryAuthor = await res.json();
    return data.name;
  } catch {
    return 'Unknown Author';
  }
}

export async function fetchByIsbn(isbn: string): Promise<Partial<Book> | null> {
  const cleanIsbn = isbn.replace(/[-\s]/g, '');
  
  const cached = getCache()[cleanIsbn];
  if (cached) return cached;
  
  try {
    const res = await fetch(`https://openlibrary.org/isbn/${cleanIsbn}.json`);
    if (!res.ok) return null;
    
    const data: OpenLibraryBook = await res.json();
    
    const authorNames: string[] = [];
    if (data.authors) {
      for (const author of data.authors.slice(0, 3)) {
        await new Promise(r => setTimeout(r, 100));
        authorNames.push(await fetchAuthorName(author.key));
      }
    }
    
    const book: Partial<Book> = {
      isbn: cleanIsbn,
      title: data.title,
      author: authorNames.join(', ') || 'Unknown Author',
      coverUrl: data.covers?.[0]
        ? `https://covers.openlibrary.org/b/id/${data.covers[0]}-M.jpg`
        : undefined,
      subjects: data.subjects?.slice(0, 10),
    };
    
    setCache(cleanIsbn, book);
    return book;
  } catch {
    return null;
  }
}

export function isValidIsbn(isbn: string): boolean {
  const clean = isbn.replace(/[-\s]/g, '');
  return /^(\d{10}|\d{13})$/.test(clean);
}
```

- [ ] **Step 2: Type check**

Run:
```bash
npx astro check
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/openLibrary.ts
git commit -m "feat: add Open Library API client with caching"
```

---

## Task 10: Create Matching Algorithm

**Files:**
- Create: `src/lib/matching.ts`

- [ ] **Step 1: Create matching.ts**

```typescript
import type { Book, UserProfile, Match, MatchFacets, MatchFacet } from './types';

const WEIGHTS = {
  shelfTwin: 3,
  readingMentor: 2,
  localSource: 2,
  discussionMatch: 1,
  classChain: 1,
};

function emptyFacet(): MatchFacet {
  return { count: 0, items: [] };
}

function emptyFacets(): MatchFacets {
  return {
    shelfTwin: emptyFacet(),
    readingMentor: emptyFacet(),
    localSource: emptyFacet(),
    discussionMatch: emptyFacet(),
    classChain: emptyFacet(),
  };
}

function calcShelfTwin(myBooks: Book[], theirBooks: Book[]): MatchFacet {
  const myIsbns = new Set(myBooks.map(b => b.isbn).filter(Boolean));
  const shared = theirBooks.filter(b => b.isbn && myIsbns.has(b.isbn));
  return {
    count: shared.length,
    items: shared.map(b => b.title),
  };
}

function calcReadingMentor(myBooks: Book[], theirBooks: Book[]): MatchFacet {
  const myWants = new Set(
    myBooks.filter(b => b.status === 'seeking-home').map(b => b.isbn).filter(Boolean)
  );
  const theyHave = theirBooks.filter(
    b => b.isbn && myWants.has(b.isbn) && (b.status === 'borrowable' || b.status === 'discussable')
  );
  return {
    count: theyHave.length,
    items: theyHave.map(b => b.title),
  };
}

function calcLocalSource(myBooks: Book[], theirBooks: Book[]): MatchFacet {
  const myWants = new Set(
    myBooks.filter(b => b.status === 'seeking-home').map(b => b.isbn).filter(Boolean)
  );
  const canBorrow = theirBooks.filter(
    b => b.isbn && myWants.has(b.isbn) && b.status === 'borrowable'
  );
  return {
    count: canBorrow.length,
    items: canBorrow.map(b => b.title),
  };
}

function calcDiscussionMatch(myTopics: string[], theirTopics: string[]): MatchFacet {
  const mySet = new Set(myTopics);
  const shared = theirTopics.filter(t => mySet.has(t));
  return {
    count: shared.length,
    items: shared,
  };
}

function calcClassChain(myBooks: Book[], theirBooks: Book[]): MatchFacet {
  const myClassIsbns = new Set(
    myBooks.filter(b => b.status === 'class-resource').map(b => b.isbn).filter(Boolean)
  );
  const theirClassIsbns = new Set(
    theirBooks.filter(b => b.status === 'class-resource').map(b => b.isbn).filter(Boolean)
  );
  
  const shared = theirBooks.filter(
    b => b.isbn && b.status === 'class-resource' && myClassIsbns.has(b.isbn)
  );
  const theyHaveMyClass = theirBooks.filter(
    b => b.isbn && myClassIsbns.has(b.isbn) && b.status !== 'class-resource'
  );
  
  const all = [...shared, ...theyHaveMyClass];
  const unique = Array.from(new Map(all.map(b => [b.isbn, b])).values());
  
  return {
    count: unique.length,
    items: unique.map(b => b.title),
  };
}

function calcTotalScore(facets: MatchFacets): number {
  return (
    facets.shelfTwin.count * WEIGHTS.shelfTwin +
    facets.readingMentor.count * WEIGHTS.readingMentor +
    facets.localSource.count * WEIGHTS.localSource +
    facets.discussionMatch.count * WEIGHTS.discussionMatch +
    facets.classChain.count * WEIGHTS.classChain
  );
}

function hasAnyMatch(facets: MatchFacets): boolean {
  return (
    facets.shelfTwin.count > 0 ||
    facets.readingMentor.count > 0 ||
    facets.localSource.count > 0 ||
    facets.discussionMatch.count > 0 ||
    facets.classChain.count > 0
  );
}

export function calculateMatches(
  myBooks: Book[],
  myTopics: string[],
  users: UserProfile[]
): Match[] {
  const matches: Match[] = [];
  
  for (const user of users) {
    const theirBooks = user.shelf ?? [];
    const theirTopics = [...(user.topics?.curated ?? []), ...(user.topics?.inferred ?? [])];
    
    const facets: MatchFacets = {
      shelfTwin: calcShelfTwin(myBooks, theirBooks),
      readingMentor: calcReadingMentor(myBooks, theirBooks),
      localSource: calcLocalSource(myBooks, theirBooks),
      discussionMatch: calcDiscussionMatch(myTopics, theirTopics),
      classChain: calcClassChain(myBooks, theirBooks),
    };
    
    if (hasAnyMatch(facets)) {
      matches.push({
        user,
        facets,
        totalScore: calcTotalScore(facets),
      });
    }
  }
  
  return matches.sort((a, b) => b.totalScore - a.totalScore);
}
```

- [ ] **Step 2: Type check**

Run:
```bash
npx astro check
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/matching.ts
git commit -m "feat: add matching algorithm with all five facets"
```

---

## Task 11: Create Matches Store

**Files:**
- Create: `src/stores/matches.ts`

- [ ] **Step 1: Create matches store**

```typescript
import { computed } from 'nanostores';
import { shelf } from './shelf';
import { profile } from './profile';
import { seedUsers } from './users';
import { calculateMatches } from '../lib/matching';
import type { Match } from '../lib/types';

export const matches = computed(
  [shelf, profile, seedUsers],
  (shelfData, profileData, users): Match[] => {
    const myBooks = Object.values(shelfData);
    const myTopics = [
      ...(profileData.topics?.curated ?? []),
      ...(profileData.topics?.inferred ?? []),
    ];
    
    return calculateMatches(myBooks, myTopics, users);
  }
);

export const hasMatches = computed(matches, m => m.length > 0);
```

- [ ] **Step 2: Type check**

Run:
```bash
npx astro check
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/stores/matches.ts
git commit -m "feat: add computed matches store"
```

---

## Task 12: Create BookCard Component

**Files:**
- Create: `src/components/BookCard.svelte`

- [ ] **Step 1: Create BookCard.svelte**

```svelte
<script lang="ts">
  import type { Book, BookStatus } from '../lib/types';
  
  interface Props {
    book: Book;
    onStatusChange?: (status: BookStatus) => void;
    readonly?: boolean;
  }
  
  let { book, onStatusChange, readonly = false }: Props = $props();
  
  const STATUS_LABELS: Record<BookStatus, string> = {
    private: 'Private',
    visible: 'Visible',
    borrowable: 'Will lend',
    discussable: 'Will discuss',
    giftable: 'Free to good home',
    'class-resource': 'Class resource',
    'seeking-home': 'Looking for this',
  };
  
  function handleStatusChange(e: Event) {
    const select = e.target as HTMLSelectElement;
    onStatusChange?.(select.value as BookStatus);
  }
</script>

<article class="book-card">
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
    
    {#if readonly}
      <span class="status-badge">{STATUS_LABELS[book.status]}</span>
    {:else}
      <select value={book.status} onchange={handleStatusChange}>
        {#each Object.entries(STATUS_LABELS) as [value, label]}
          <option {value}>{label}</option>
        {/each}
      </select>
    {/if}
    
    {#if book.addedVia === 'scan'}
      <span class="verified" title="Added via ISBN scan">✓</span>
    {/if}
  </div>
</article>

<style>
  .book-card {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background: white;
  }
  
  .cover {
    width: 60px;
    height: 90px;
    object-fit: cover;
    border-radius: 4px;
    flex-shrink: 0;
  }
  
  .cover.placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f0f0f0;
    font-size: 1.5rem;
    color: #666;
  }
  
  .info {
    flex: 1;
    min-width: 0;
  }
  
  .title {
    margin: 0 0 0.25rem;
    font-size: 1rem;
    font-weight: 600;
  }
  
  .author {
    margin: 0 0 0.5rem;
    font-size: 0.875rem;
    color: #666;
  }
  
  select {
    padding: 0.25rem 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 0.875rem;
  }
  
  .status-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    background: #e8f4f8;
    border-radius: 4px;
    font-size: 0.75rem;
    color: #0066cc;
  }
  
  .verified {
    margin-left: 0.5rem;
    color: #22c55e;
  }
</style>
```

- [ ] **Step 2: Type check**

Run:
```bash
npx astro check
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/BookCard.svelte
git commit -m "feat: add BookCard component"
```

---

## Task 13: Create AddBookIsland Component

**Files:**
- Create: `src/components/AddBookIsland.svelte`

- [ ] **Step 1: Create AddBookIsland.svelte**

```svelte
<script lang="ts">
  import { addBook } from '../stores/shelf';
  import { fetchByIsbn, isValidIsbn } from '../lib/openLibrary';
  import type { BookStatus } from '../lib/types';
  
  type Mode = 'isbn' | 'manual';
  
  let mode: Mode = $state('isbn');
  let isbn = $state('');
  let title = $state('');
  let author = $state('');
  let status: BookStatus = $state('visible');
  let loading = $state(false);
  let error = $state('');
  
  const STATUS_OPTIONS: { value: BookStatus; label: string }[] = [
    { value: 'visible', label: 'Visible' },
    { value: 'borrowable', label: 'Will lend' },
    { value: 'discussable', label: 'Will discuss' },
    { value: 'giftable', label: 'Free to good home' },
    { value: 'class-resource', label: 'Class resource' },
    { value: 'seeking-home', label: 'Looking for this' },
    { value: 'private', label: 'Private' },
  ];
  
  async function handleIsbnSubmit() {
    if (!isValidIsbn(isbn)) {
      error = 'Please enter a valid 10 or 13 digit ISBN';
      return;
    }
    
    loading = true;
    error = '';
    
    const bookData = await fetchByIsbn(isbn);
    
    if (bookData) {
      addBook({
        ...bookData,
        status,
        addedVia: 'scan',
      });
      isbn = '';
    } else {
      error = 'Book not found. Try manual entry.';
      title = '';
      author = '';
      mode = 'manual';
    }
    
    loading = false;
  }
  
  function handleManualSubmit() {
    if (!title.trim() || !author.trim()) {
      error = 'Title and author are required';
      return;
    }
    
    addBook({
      title: title.trim(),
      author: author.trim(),
      status,
      addedVia: 'manual',
    });
    
    title = '';
    author = '';
    error = '';
    mode = 'isbn';
  }
  
  function switchMode(newMode: Mode) {
    mode = newMode;
    error = '';
  }
</script>

<div class="add-book">
  <div class="tabs">
    <button
      class:active={mode === 'isbn'}
      onclick={() => switchMode('isbn')}
    >
      ISBN Lookup
    </button>
    <button
      class:active={mode === 'manual'}
      onclick={() => switchMode('manual')}
    >
      Manual Entry
    </button>
  </div>
  
  {#if mode === 'isbn'}
    <form onsubmit={(e) => { e.preventDefault(); handleIsbnSubmit(); }}>
      <input
        type="text"
        bind:value={isbn}
        placeholder="Enter ISBN (e.g., 9780465026562)"
        disabled={loading}
      />
      <select bind:value={status}>
        {#each STATUS_OPTIONS as opt}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
      <button type="submit" disabled={loading}>
        {loading ? 'Looking up...' : 'Add Book'}
      </button>
    </form>
  {:else}
    <form onsubmit={(e) => { e.preventDefault(); handleManualSubmit(); }}>
      <input
        type="text"
        bind:value={title}
        placeholder="Book title"
      />
      <input
        type="text"
        bind:value={author}
        placeholder="Author"
      />
      <select bind:value={status}>
        {#each STATUS_OPTIONS as opt}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
      <button type="submit">Add Book</button>
    </form>
  {/if}
  
  {#if error}
    <p class="error">{error}</p>
  {/if}
</div>

<style>
  .add-book {
    padding: 1rem;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background: #fafafa;
  }
  
  .tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  
  .tabs button {
    padding: 0.5rem 1rem;
    border: 1px solid #ccc;
    background: white;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .tabs button.active {
    background: #0066cc;
    color: white;
    border-color: #0066cc;
  }
  
  form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  input, select {
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 1rem;
  }
  
  button[type="submit"] {
    padding: 0.75rem;
    background: #0066cc;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
  }
  
  button[type="submit"]:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .error {
    margin: 0.5rem 0 0;
    color: #dc2626;
    font-size: 0.875rem;
  }
</style>
```

- [ ] **Step 2: Type check**

Run:
```bash
npx astro check
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/AddBookIsland.svelte
git commit -m "feat: add AddBookIsland with ISBN lookup and manual entry"
```

---

## Task 14: Update ShelfIsland Component

**Files:**
- Modify: `src/components/ShelfIsland.svelte`

- [ ] **Step 1: Update ShelfIsland.svelte**

```svelte
<script lang="ts">
  import { shelf, updateBookStatus, removeBook, activeFilter } from '../stores/shelf';
  import type { Book, BookStatus } from '../lib/types';
  import BookCard from './BookCard.svelte';
  
  const FILTER_OPTIONS: { value: BookStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'All books' },
    { value: 'borrowable', label: 'Will lend' },
    { value: 'discussable', label: 'Will discuss' },
    { value: 'seeking-home', label: 'Looking for' },
    { value: 'class-resource', label: 'Class resources' },
  ];
  
  let books = $state<Book[]>([]);
  let filter = $state<BookStatus | 'all'>('all');
  
  $effect(() => {
    const unsubShelf = shelf.subscribe(s => {
      books = Object.values(s);
    });
    const unsubFilter = activeFilter.subscribe(f => {
      filter = f;
    });
    return () => {
      unsubShelf();
      unsubFilter();
    };
  });
  
  let filteredBooks = $derived(
    filter === 'all' ? books : books.filter(b => b.status === filter)
  );
  
  function handleStatusChange(id: string, status: BookStatus) {
    updateBookStatus(id, status);
  }
  
  function handleFilterChange(e: Event) {
    const select = e.target as HTMLSelectElement;
    activeFilter.set(select.value as BookStatus | 'all');
  }
</script>

<section class="shelf">
  <div class="header">
    <h2>Your Shelf ({books.length} books)</h2>
    <select value={filter} onchange={handleFilterChange}>
      {#each FILTER_OPTIONS as opt}
        <option value={opt.value}>{opt.label}</option>
      {/each}
    </select>
  </div>
  
  {#if filteredBooks.length === 0}
    <p class="empty">
      {#if books.length === 0}
        No books yet. Add your first book above.
      {:else}
        No books match this filter.
      {/if}
    </p>
  {:else}
    <div class="grid">
      {#each filteredBooks as book (book.id)}
        <BookCard
          {book}
          onStatusChange={(status) => handleStatusChange(book.id, status)}
        />
      {/each}
    </div>
  {/if}
</section>

<style>
  .shelf {
    margin-top: 2rem;
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  h2 {
    margin: 0;
    font-size: 1.25rem;
  }
  
  select {
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
  
  .empty {
    padding: 2rem;
    text-align: center;
    color: #666;
    background: #f5f5f5;
    border-radius: 8px;
  }
  
  .grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }
</style>
```

- [ ] **Step 2: Type check**

Run:
```bash
npx astro check
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ShelfIsland.svelte
git commit -m "feat: update ShelfIsland with filtering and BookCard"
```

---

## Task 15: Create TopicPickerIsland Component

**Files:**
- Create: `src/components/TopicPickerIsland.svelte`

- [ ] **Step 1: Create TopicPickerIsland.svelte**

```svelte
<script lang="ts">
  import { CURATED_TOPICS } from '../stores/topics';
  import { profile, updateTopics } from '../stores/profile';
  import type { UserTopics } from '../lib/types';
  
  interface Props {
    mode?: 'curated' | 'freeform' | 'both';
    maxCurated?: number;
  }
  
  let { mode = 'both', maxCurated = 5 }: Props = $props();
  
  let topics = $state<UserTopics>({ curated: [], freeform: [], inferred: [] });
  let freeformInput = $state('');
  
  $effect(() => profile.subscribe(p => {
    topics = { ...p.topics };
  }));
  
  function toggleCurated(topic: string) {
    const current = topics.curated;
    if (current.includes(topic)) {
      updateTopics({ curated: current.filter(t => t !== topic) });
    } else if (current.length < maxCurated) {
      updateTopics({ curated: [...current, topic] });
    }
  }
  
  function addFreeform() {
    const tag = freeformInput.trim().toLowerCase();
    if (tag && !topics.freeform.includes(tag)) {
      updateTopics({ freeform: [...topics.freeform, tag] });
      freeformInput = '';
    }
  }
  
  function removeFreeform(tag: string) {
    updateTopics({ freeform: topics.freeform.filter(t => t !== tag) });
  }
</script>

<div class="topic-picker">
  {#if mode === 'curated' || mode === 'both'}
    <div class="section">
      <h3>Pick your interests ({topics.curated.length}/{maxCurated})</h3>
      <div class="curated-grid">
        {#each CURATED_TOPICS as topic}
          <button
            class="topic-chip"
            class:selected={topics.curated.includes(topic)}
            onclick={() => toggleCurated(topic)}
            disabled={!topics.curated.includes(topic) && topics.curated.length >= maxCurated}
          >
            {topic.replace('-', ' ')}
          </button>
        {/each}
      </div>
    </div>
  {/if}
  
  {#if mode === 'freeform' || mode === 'both'}
    <div class="section">
      <h3>Add your own tags</h3>
      <div class="freeform-input">
        <input
          type="text"
          bind:value={freeformInput}
          placeholder="e.g., Le Guin fan, solarpunk"
          onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addFreeform())}
        />
        <button onclick={addFreeform}>Add</button>
      </div>
      {#if topics.freeform.length > 0}
        <div class="freeform-tags">
          {#each topics.freeform as tag}
            <span class="tag">
              {tag}
              <button onclick={() => removeFreeform(tag)}>×</button>
            </span>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .topic-picker {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .section h3 {
    margin: 0 0 0.75rem;
    font-size: 1rem;
  }
  
  .curated-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .topic-chip {
    padding: 0.375rem 0.75rem;
    border: 1px solid #ccc;
    border-radius: 16px;
    background: white;
    font-size: 0.875rem;
    cursor: pointer;
    text-transform: capitalize;
  }
  
  .topic-chip.selected {
    background: #0066cc;
    color: white;
    border-color: #0066cc;
  }
  
  .topic-chip:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .freeform-input {
    display: flex;
    gap: 0.5rem;
  }
  
  .freeform-input input {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
  
  .freeform-input button {
    padding: 0.5rem 1rem;
    background: #0066cc;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .freeform-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }
  
  .tag {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    background: #e8f4f8;
    border-radius: 4px;
    font-size: 0.875rem;
  }
  
  .tag button {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    font-size: 1rem;
    line-height: 1;
  }
</style>
```

- [ ] **Step 2: Type check**

Run:
```bash
npx astro check
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/TopicPickerIsland.svelte
git commit -m "feat: add TopicPickerIsland for curated and freeform topics"
```

---

## Task 16: Create MatchCardIsland Component

**Files:**
- Create: `src/components/MatchCardIsland.svelte`

- [ ] **Step 1: Create MatchCardIsland.svelte**

```svelte
<script lang="ts">
  import type { Match, MatchFacet } from '../lib/types';
  
  interface Props {
    match: Match;
    expanded?: boolean;
    onToggle?: () => void;
  }
  
  let { match, expanded = false, onToggle }: Props = $props();
  
  const FACET_LABELS: Record<string, { label: string; icon: string }> = {
    shelfTwin: { label: 'Shelf Twin', icon: '📚' },
    readingMentor: { label: 'Reading Mentor', icon: '🎓' },
    localSource: { label: 'Can Borrow', icon: '🤝' },
    discussionMatch: { label: 'Discussion Match', icon: '💬' },
    classChain: { label: 'Class Chain', icon: '🎒' },
  };
  
  function getActiveFacets(): { key: string; facet: MatchFacet; meta: { label: string; icon: string } }[] {
    return Object.entries(match.facets)
      .filter(([_, f]) => f.count > 0)
      .map(([key, facet]) => ({
        key,
        facet,
        meta: FACET_LABELS[key],
      }));
  }
  
  let activeFacets = $derived(getActiveFacets());
</script>

<article class="match-card" class:expanded onclick={onToggle}>
  <header>
    <h3>{match.user.name}</h3>
    <span class="distance">{match.user.distance}</span>
  </header>
  
  <div class="facets">
    {#each activeFacets as { key, facet, meta }}
      <span class="facet-badge" title={meta.label}>
        {meta.icon} {facet.count}
      </span>
    {/each}
  </div>
  
  {#if expanded}
    <div class="details">
      {#each activeFacets as { key, facet, meta }}
        <div class="facet-detail">
          <h4>{meta.icon} {meta.label}</h4>
          <ul>
            {#each facet.items.slice(0, 3) as item}
              <li>{item}</li>
            {/each}
            {#if facet.items.length > 3}
              <li class="more">+{facet.items.length - 3} more</li>
            {/if}
          </ul>
        </div>
      {/each}
      
      {#if match.user.borrowStyle}
        <p class="borrow-style">"{match.user.borrowStyle}"</p>
      {/if}
    </div>
  {/if}
</article>

<style>
  .match-card {
    padding: 1rem;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background: white;
    cursor: pointer;
    transition: box-shadow 0.2s;
  }
  
  .match-card:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  .match-card.expanded {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  
  h3 {
    margin: 0;
    font-size: 1.125rem;
  }
  
  .distance {
    font-size: 0.875rem;
    color: #666;
  }
  
  .facets {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  
  .facet-badge {
    padding: 0.25rem 0.5rem;
    background: #f0f7ff;
    border-radius: 4px;
    font-size: 0.875rem;
  }
  
  .details {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #e0e0e0;
  }
  
  .facet-detail {
    margin-bottom: 0.75rem;
  }
  
  .facet-detail h4 {
    margin: 0 0 0.25rem;
    font-size: 0.875rem;
    font-weight: 600;
  }
  
  .facet-detail ul {
    margin: 0;
    padding-left: 1.25rem;
    font-size: 0.875rem;
  }
  
  .facet-detail li {
    margin: 0.125rem 0;
  }
  
  .more {
    color: #666;
    font-style: italic;
  }
  
  .borrow-style {
    margin: 0.75rem 0 0;
    padding: 0.5rem;
    background: #f5f5f5;
    border-radius: 4px;
    font-size: 0.875rem;
    font-style: italic;
    color: #666;
  }
</style>
```

- [ ] **Step 2: Type check**

Run:
```bash
npx astro check
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/MatchCardIsland.svelte
git commit -m "feat: add MatchCardIsland with facet badges and expansion"
```

---

## Task 17: Create MatchMapIsland Component

**Files:**
- Create: `src/components/MatchMapIsland.svelte`

- [ ] **Step 1: Create MatchMapIsland.svelte**

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { matches } from '../stores/matches';
  import { loadSeedUsers } from '../stores/users';
  import type { Match } from '../lib/types';
  import MatchCardIsland from './MatchCardIsland.svelte';
  
  let matchList = $state<Match[]>([]);
  let expandedId = $state<string | null>(null);
  let mapContainer: HTMLDivElement;
  let map: any;
  
  $effect(() => matches.subscribe(m => {
    matchList = m;
  }));
  
  onMount(async () => {
    await loadSeedUsers();
    
    const L = await import('leaflet');
    await import('leaflet/dist/leaflet.css');
    
    map = L.map(mapContainer).setView([40.7128, -74.0060], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    matchList.forEach((match, i) => {
      const offset = (i * 0.005) - 0.01;
      L.circleMarker([40.7128 + offset, -74.0060 + offset * 2], {
        radius: 8,
        fillColor: '#0066cc',
        fillOpacity: 0.8,
        color: '#fff',
        weight: 2,
      })
        .bindTooltip(match.user.name)
        .addTo(map);
    });
    
    return () => {
      map?.remove();
    };
  });
  
  function toggleExpanded(id: string) {
    expandedId = expandedId === id ? null : id;
  }
</script>

<div class="match-map">
  <div class="map-container" bind:this={mapContainer}></div>
  
  <div class="cards-panel">
    <h2>People Nearby ({matchList.length})</h2>
    
    {#if matchList.length === 0}
      <p class="empty">Add some books to find matches!</p>
    {:else}
      <div class="cards-list">
        {#each matchList as match (match.user.id)}
          <MatchCardIsland
            {match}
            expanded={expandedId === match.user.id}
            onToggle={() => toggleExpanded(match.user.id)}
          />
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .match-map {
    display: grid;
    grid-template-columns: 1fr 400px;
    gap: 1rem;
    height: calc(100vh - 200px);
    min-height: 500px;
  }
  
  .map-container {
    border-radius: 8px;
    overflow: hidden;
  }
  
  .cards-panel {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  .cards-panel h2 {
    margin: 0 0 1rem;
    font-size: 1.25rem;
  }
  
  .empty {
    padding: 2rem;
    text-align: center;
    color: #666;
    background: #f5f5f5;
    border-radius: 8px;
  }
  
  .cards-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    overflow-y: auto;
    padding-right: 0.5rem;
  }
  
  @media (max-width: 900px) {
    .match-map {
      grid-template-columns: 1fr;
      grid-template-rows: 300px 1fr;
    }
  }
</style>
```

- [ ] **Step 2: Type check**

Run:
```bash
npx astro check
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/MatchMapIsland.svelte
git commit -m "feat: add MatchMapIsland with Leaflet map and cards panel"
```

---

## Task 18: Create ProfileIsland Component

**Files:**
- Create: `src/components/ProfileIsland.svelte`

- [ ] **Step 1: Create ProfileIsland.svelte**

```svelte
<script lang="ts">
  import { profile, updateProfile } from '../stores/profile';
  import { getInferredTopics } from '../stores/shelf';
  import type { UserProfile } from '../lib/types';
  import TopicPickerIsland from './TopicPickerIsland.svelte';
  
  let profileData = $state<UserProfile>({
    id: '',
    name: '',
    city: '',
    radiusKm: 5,
    topics: { curated: [], freeform: [], inferred: [] },
  });
  
  let borrowStyle = $state('');
  let obsessions = $state('');
  
  $effect(() => profile.subscribe(p => {
    profileData = { ...p };
    borrowStyle = p.borrowStyle ?? '';
    obsessions = p.currentObsessions?.join(', ') ?? '';
  }));
  
  $effect(() => {
    const inferred = getInferredTopics();
    if (JSON.stringify(inferred) !== JSON.stringify(profileData.topics.inferred)) {
      updateProfile({
        topics: { ...profileData.topics, inferred },
      });
    }
  });
  
  function handleSave() {
    updateProfile({
      name: profileData.name,
      city: profileData.city,
      radiusKm: profileData.radiusKm,
      borrowStyle: borrowStyle || undefined,
      currentObsessions: obsessions ? obsessions.split(',').map(s => s.trim()) : undefined,
    });
  }
  
  const CITIES = [
    'Demo City',
    'New York',
    'Los Angeles',
    'Chicago',
    'Houston',
    'Phoenix',
    'Philadelphia',
    'San Antonio',
    'San Diego',
    'Dallas',
  ];
</script>

<div class="profile">
  <section>
    <h2>Your Profile</h2>
    
    <div class="field">
      <label for="name">Name</label>
      <input
        id="name"
        type="text"
        bind:value={profileData.name}
        onblur={handleSave}
      />
    </div>
    
    <div class="field">
      <label for="city">City</label>
      <select
        id="city"
        bind:value={profileData.city}
        onchange={handleSave}
      >
        {#each CITIES as city}
          <option value={city}>{city}</option>
        {/each}
      </select>
    </div>
    
    <div class="field">
      <label for="radius">Search radius: {profileData.radiusKm} km</label>
      <input
        id="radius"
        type="range"
        min="1"
        max="20"
        bind:value={profileData.radiusKm}
        onchange={handleSave}
      />
    </div>
  </section>
  
  <section>
    <h2>Your Interests</h2>
    <TopicPickerIsland mode="both" maxCurated={5} />
    
    {#if profileData.topics.inferred.length > 0}
      <div class="inferred">
        <h3>Inferred from your books</h3>
        <div class="tags">
          {#each profileData.topics.inferred as topic}
            <span class="tag">{topic.replace('-', ' ')}</span>
          {/each}
        </div>
      </div>
    {/if}
  </section>
  
  <section>
    <h2>Optional Details</h2>
    
    <div class="field">
      <label for="borrow">Lending style</label>
      <input
        id="borrow"
        type="text"
        bind:value={borrowStyle}
        placeholder="e.g., careful, notes welcome, 3-week returns"
        onblur={handleSave}
      />
    </div>
    
    <div class="field">
      <label for="obsessions">Current obsessions (comma-separated)</label>
      <input
        id="obsessions"
        type="text"
        bind:value={obsessions}
        placeholder="e.g., program theory, parables, coordination"
        onblur={handleSave}
      />
    </div>
  </section>
</div>

<style>
  .profile {
    max-width: 600px;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }
  
  section {
    padding: 1.5rem;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background: white;
  }
  
  h2 {
    margin: 0 0 1rem;
    font-size: 1.25rem;
  }
  
  h3 {
    margin: 1rem 0 0.5rem;
    font-size: 1rem;
    color: #666;
  }
  
  .field {
    margin-bottom: 1rem;
  }
  
  .field:last-child {
    margin-bottom: 0;
  }
  
  label {
    display: block;
    margin-bottom: 0.25rem;
    font-size: 0.875rem;
    font-weight: 500;
  }
  
  input[type="text"],
  select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 1rem;
  }
  
  input[type="range"] {
    width: 100%;
  }
  
  .inferred {
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid #e0e0e0;
  }
  
  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .tag {
    padding: 0.25rem 0.5rem;
    background: #e8f4f8;
    border-radius: 4px;
    font-size: 0.875rem;
    text-transform: capitalize;
  }
</style>
```

- [ ] **Step 2: Type check**

Run:
```bash
npx astro check
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ProfileIsland.svelte
git commit -m "feat: add ProfileIsland with full profile editing"
```

---

## Task 19: Create OnboardingIsland Component

**Files:**
- Create: `src/components/OnboardingIsland.svelte`

- [ ] **Step 1: Create OnboardingIsland.svelte**

```svelte
<script lang="ts">
  import { initProfile, isOnboarded } from '../stores/profile';
  
  let name = $state('');
  let city = $state('Demo City');
  let error = $state('');
  
  const CITIES = [
    'Demo City',
    'New York',
    'Los Angeles',
    'Chicago',
    'Houston',
    'Phoenix',
    'Philadelphia',
    'San Antonio',
    'San Diego',
    'Dallas',
  ];
  
  function handleSubmit() {
    if (!name.trim()) {
      error = 'Please enter your name';
      return;
    }
    
    initProfile(name.trim(), city);
    window.location.href = '/shelf';
  }
</script>

<div class="onboarding">
  <h1>Welcome to biblocal</h1>
  <p class="tagline">Build your living bookshelf. Find people nearby with similar taste.</p>
  
  <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
    <div class="field">
      <label for="name">What should we call you?</label>
      <input
        id="name"
        type="text"
        bind:value={name}
        placeholder="Your name"
        autofocus
      />
    </div>
    
    <div class="field">
      <label for="city">Where are you?</label>
      <select id="city" bind:value={city}>
        {#each CITIES as c}
          <option value={c}>{c}</option>
        {/each}
      </select>
    </div>
    
    {#if error}
      <p class="error">{error}</p>
    {/if}
    
    <button type="submit">Start Your Shelf</button>
  </form>
</div>

<style>
  .onboarding {
    max-width: 400px;
    margin: 4rem auto;
    padding: 2rem;
    text-align: center;
  }
  
  h1 {
    margin: 0 0 0.5rem;
    font-size: 2rem;
  }
  
  .tagline {
    margin: 0 0 2rem;
    color: #666;
  }
  
  form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    text-align: left;
  }
  
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  label {
    font-size: 0.875rem;
    font-weight: 500;
  }
  
  input, select {
    padding: 0.75rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 1rem;
  }
  
  .error {
    margin: 0;
    color: #dc2626;
    font-size: 0.875rem;
  }
  
  button {
    padding: 0.875rem;
    background: #0066cc;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
  }
  
  button:hover {
    background: #0055aa;
  }
</style>
```

- [ ] **Step 2: Type check**

Run:
```bash
npx astro check
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/OnboardingIsland.svelte
git commit -m "feat: add OnboardingIsland for initial setup"
```

---

## Task 20: Create PromptIsland Component

**Files:**
- Create: `src/components/PromptIsland.svelte`

- [ ] **Step 1: Create PromptIsland.svelte**

```svelte
<script lang="ts">
  import { getBookCount } from '../stores/shelf';
  import { profile, dismissPrompt, isPromptDismissed, updateProfile } from '../stores/profile';
  import type { UserProfile } from '../lib/types';
  
  interface Prompt {
    id: string;
    trigger: () => boolean;
    title: string;
    component: 'topics' | 'freeform' | 'borrowStyle' | 'obsessions';
  }
  
  const PROMPTS: Prompt[] = [
    {
      id: 'topics-3',
      trigger: () => getBookCount() >= 3 && (profile.get().topics?.curated?.length ?? 0) === 0,
      title: 'Pick 3 topics that describe your reading taste',
      component: 'topics',
    },
    {
      id: 'freeform-5',
      trigger: () => getBookCount() >= 5 && (profile.get().topics?.freeform?.length ?? 0) === 0,
      title: 'Add any tags that describe your interests',
      component: 'freeform',
    },
    {
      id: 'borrow-first-match',
      trigger: () => !profile.get().borrowStyle,
      title: 'How would you describe your lending style?',
      component: 'borrowStyle',
    },
    {
      id: 'obsessions-10',
      trigger: () => getBookCount() >= 10 && !profile.get().currentObsessions,
      title: 'What are you currently obsessed with?',
      component: 'obsessions',
    },
  ];
  
  interface Props {
    context?: 'shelf' | 'matches';
  }
  
  let { context = 'shelf' }: Props = $props();
  
  let profileData = $state<UserProfile | null>(null);
  let activePrompt = $state<Prompt | null>(null);
  let inputValue = $state('');
  
  $effect(() => profile.subscribe(p => {
    profileData = p;
    
    for (const prompt of PROMPTS) {
      if (!isPromptDismissed(prompt.id) && prompt.trigger()) {
        if (context === 'matches' && prompt.id === 'borrow-first-match') {
          activePrompt = prompt;
          break;
        } else if (context === 'shelf' && prompt.id !== 'borrow-first-match') {
          activePrompt = prompt;
          break;
        }
      }
    }
    
    if (!PROMPTS.some(p => !isPromptDismissed(p.id) && p.trigger())) {
      activePrompt = null;
    }
  }));
  
  function handleDismiss() {
    if (activePrompt) {
      dismissPrompt(activePrompt.id);
      activePrompt = null;
    }
  }
  
  function handleSubmit() {
    if (!activePrompt || !inputValue.trim()) return;
    
    if (activePrompt.component === 'borrowStyle') {
      updateProfile({ borrowStyle: inputValue.trim() });
    } else if (activePrompt.component === 'obsessions') {
      updateProfile({
        currentObsessions: inputValue.split(',').map(s => s.trim()).filter(Boolean),
      });
    }
    
    dismissPrompt(activePrompt.id);
    activePrompt = null;
    inputValue = '';
  }
</script>

{#if activePrompt}
  <div class="prompt">
    <div class="prompt-content">
      <p>{activePrompt.title}</p>
      
      {#if activePrompt.component === 'borrowStyle' || activePrompt.component === 'obsessions'}
        <input
          type="text"
          bind:value={inputValue}
          placeholder={activePrompt.component === 'borrowStyle'
            ? 'e.g., careful, 3-week returns'
            : 'e.g., program theory, parables'}
          onkeydown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        <div class="actions">
          <button onclick={handleSubmit}>Save</button>
          <button class="dismiss" onclick={handleDismiss}>Skip</button>
        </div>
      {:else}
        <p class="hint">Go to your profile to set this up.</p>
        <div class="actions">
          <a href="/profile">Edit Profile</a>
          <button class="dismiss" onclick={handleDismiss}>Later</button>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .prompt {
    padding: 1rem;
    background: #fffbeb;
    border: 1px solid #fcd34d;
    border-radius: 8px;
    margin-bottom: 1rem;
  }
  
  .prompt-content p {
    margin: 0 0 0.75rem;
  }
  
  .hint {
    font-size: 0.875rem;
    color: #666;
  }
  
  input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    margin-bottom: 0.75rem;
  }
  
  .actions {
    display: flex;
    gap: 0.5rem;
  }
  
  button, a {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    font-size: 0.875rem;
    cursor: pointer;
    text-decoration: none;
  }
  
  button:not(.dismiss), a {
    background: #0066cc;
    color: white;
  }
  
  .dismiss {
    background: transparent;
    color: #666;
  }
</style>
```

- [ ] **Step 2: Type check**

Run:
```bash
npx astro check
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/PromptIsland.svelte
git commit -m "feat: add PromptIsland for progressive profile disclosure"
```

---

## Task 21: Update Layout with Navigation

**Files:**
- Modify: `src/layouts/Layout.astro`

- [ ] **Step 1: Read current Layout.astro**

Run:
```bash
cat src/layouts/Layout.astro
```

- [ ] **Step 2: Update Layout.astro with navigation**

```astro
---
interface Props {
  title: string;
}

const { title } = Astro.props;
const currentPath = Astro.url.pathname;
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <title>{title}</title>
  </head>
  <body>
    <nav>
      <a href="/" class="logo">biblocal</a>
      <div class="links">
        <a href="/shelf" class:list={{ active: currentPath === '/shelf' }}>Shelf</a>
        <a href="/matches" class:list={{ active: currentPath === '/matches' }}>Matches</a>
        <a href="/profile" class:list={{ active: currentPath === '/profile' }}>Profile</a>
      </div>
    </nav>
    <slot />
  </body>
</html>

<style is:global>
  * {
    box-sizing: border-box;
  }
  
  body {
    margin: 0;
    font-family: system-ui, -apple-system, sans-serif;
    line-height: 1.5;
    color: #1a1a1a;
    background: #f9fafb;
  }
  
  nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background: white;
    border-bottom: 1px solid #e0e0e0;
  }
  
  .logo {
    font-size: 1.25rem;
    font-weight: 700;
    color: #0066cc;
    text-decoration: none;
  }
  
  .links {
    display: flex;
    gap: 1.5rem;
  }
  
  .links a {
    color: #666;
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 500;
  }
  
  .links a:hover,
  .links a.active {
    color: #0066cc;
  }
  
  main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }
</style>
```

- [ ] **Step 3: Type check**

Run:
```bash
npx astro check
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/layouts/Layout.astro
git commit -m "feat: add navigation to layout"
```

---

## Task 22: Update Index Page

**Files:**
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Update index.astro with onboarding**

```astro
---
import Layout from '../layouts/Layout.astro';
import OnboardingIsland from '../components/OnboardingIsland.svelte';
---

<Layout title="biblocal">
  <main>
    <OnboardingIsland client:load />
  </main>
</Layout>

<script>
  import { isOnboarded } from '../stores/profile';
  
  if (isOnboarded()) {
    window.location.href = '/shelf';
  }
</script>
```

- [ ] **Step 2: Type check**

Run:
```bash
npx astro check
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat: add onboarding flow to index page"
```

---

## Task 23: Update Shelf Page

**Files:**
- Modify: `src/pages/shelf.astro`

- [ ] **Step 1: Create shelf.astro**

```astro
---
import Layout from '../layouts/Layout.astro';
import AddBookIsland from '../components/AddBookIsland.svelte';
import ShelfIsland from '../components/ShelfIsland.svelte';
import PromptIsland from '../components/PromptIsland.svelte';
---

<Layout title="Your Shelf | biblocal">
  <main>
    <h1>Your Shelf</h1>
    
    <PromptIsland client:load context="shelf" />
    
    <AddBookIsland client:load />
    
    <ShelfIsland client:load />
  </main>
</Layout>

<script>
  import { isOnboarded } from '../stores/profile';
  
  if (!isOnboarded()) {
    window.location.href = '/';
  }
</script>
```

- [ ] **Step 2: Type check**

Run:
```bash
npx astro check
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/shelf.astro
git commit -m "feat: update shelf page with AddBook and prompts"
```

---

## Task 24: Create Matches Page

**Files:**
- Create: `src/pages/matches.astro`

- [ ] **Step 1: Create matches.astro**

```astro
---
import Layout from '../layouts/Layout.astro';
import MatchMapIsland from '../components/MatchMapIsland.svelte';
import PromptIsland from '../components/PromptIsland.svelte';
---

<Layout title="Find Matches | biblocal">
  <main>
    <h1>People Nearby</h1>
    
    <PromptIsland client:load context="matches" />
    
    <MatchMapIsland client:load />
  </main>
</Layout>

<script>
  import { isOnboarded } from '../stores/profile';
  
  if (!isOnboarded()) {
    window.location.href = '/';
  }
</script>

<style>
  main {
    max-width: none;
  }
  
  h1 {
    margin: 0 0 1rem;
  }
</style>
```

- [ ] **Step 2: Type check**

Run:
```bash
npx astro check
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/matches.astro
git commit -m "feat: add matches page with map and cards"
```

---

## Task 25: Create Profile Page

**Files:**
- Create: `src/pages/profile.astro`

- [ ] **Step 1: Create profile.astro**

```astro
---
import Layout from '../layouts/Layout.astro';
import ProfileIsland from '../components/ProfileIsland.svelte';
---

<Layout title="Your Profile | biblocal">
  <main>
    <h1>Your Profile</h1>
    
    <ProfileIsland client:load />
  </main>
</Layout>

<script>
  import { isOnboarded } from '../stores/profile';
  
  if (!isOnboarded()) {
    window.location.href = '/';
  }
</script>
```

- [ ] **Step 2: Type check**

Run:
```bash
npx astro check
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/profile.astro
git commit -m "feat: add profile page"
```

---

## Task 26: Final Verification

- [ ] **Step 1: Run full type check**

Run:
```bash
npx astro check
```

Expected: No errors.

- [ ] **Step 2: Start dev server**

Run:
```bash
npm run dev
```

Expected: Server starts on localhost:4321.

- [ ] **Step 3: Manual testing checklist**

Open http://localhost:4321 and verify:

1. Onboarding flow:
   - [ ] Enter name and city
   - [ ] Click "Start Your Shelf"
   - [ ] Redirects to /shelf

2. Add books:
   - [ ] Enter ISBN "9780465026562" (GEB)
   - [ ] Book appears with cover and author
   - [ ] Add manual book (no ISBN)
   - [ ] Both books show in shelf

3. Check matches:
   - [ ] Navigate to /matches
   - [ ] See map with markers
   - [ ] See match cards (Maya should appear with GEB overlap)
   - [ ] Click card to expand facets

4. Profile:
   - [ ] Navigate to /profile
   - [ ] Pick curated topics
   - [ ] Add freeform tags
   - [ ] See inferred topics from books

5. Persistence:
   - [ ] Refresh page
   - [ ] All data survives (books, profile, topics)

- [ ] **Step 4: Commit any fixes**

If any issues found, fix and commit with descriptive message.

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat: complete biblocal MVP implementation"
```

---

## Summary

This plan implements the biblocal MVP with:

- **25 tasks** covering all components, stores, and pages
- **Taste matching** with 5 facet types against seed users
- **Progressive profile disclosure** through contextual prompts
- **Open Library integration** for ISBN lookup with caching
- **Map-based UI** with Leaflet showing match cards
- **LocalStorage persistence** via nanostores/persistent

After completing this plan, run the verification steps to ensure everything works end-to-end.
