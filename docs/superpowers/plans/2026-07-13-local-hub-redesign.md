# Local Map-Anchored Discovery Hub — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/local` into a map-anchored hub — an always-visible global map (with zoom-based point clustering) beside a results panel that toggles Books · People · Bookstores and stays in sync with the map viewport.

**Architecture:** Extend the existing `MatchMapIsland.svelte` (already map + cards panel) into the full hub. Add self-hosted Leaflet marker clustering. A new pure helper module handles viewport bounds filtering + proximity sort. Reuse `discovery`/`discoveryBooks`/`matching.ts`/`connections`/`geo.ts`, `MatchCardIsland`, `BookDiscoveryRow`. No matching-algorithm or API changes.

**Tech Stack:** Astro 6 (SSR/Cloudflare), Svelte 5 runes, Nanostores, Leaflet ^1.9.4 + `leaflet.markercluster`, TypeScript strict, Vitest + @testing-library/svelte (jsdom).

## Global Constraints

- No changes to `src/lib/matching.ts` scoring or the `Match`/`LocalBook`/`UserProfile` shapes.
- No changes to any `/api/*` route.
- Svelte 5 runes only (`$state`/`$props`/`$derived`/`$effect`); match existing islands.
- The clustering plugin JS **and** CSS must be **bundled/self-hosted** (npm import, like `import 'leaflet/dist/leaflet.css'`) — no external `<script>`/CDN. (Map *tiles* already load from cartocdn.com; that stays.)
- All pin/cluster colors via theme tokens sampled with the existing `token(name, fallback)` helper (Leaflet SVG can't read CSS vars); must stay dark-mode-correct.
- Panel toggle labels (EN): **Books**, **People**, **Bookstores**. Book intent group labels already exist (`t.groups.*`).
- Every task ends green: relevant tests pass; by plan end `npx astro check` 0 errors, `npm run test:run` green, `npm run build` succeeds.
- Commit after each task, concise message, **no attribution footer / no Co-Authored-By line**.
- Leaflet is heavy in jsdom — map/clustering behavior is verified on **QA (deployed)**, not unit tests. Unit-test the pure helpers and the panel/toggle DOM only.

---

### Task 1: Pure hub helpers (viewport bounds + proximity)

The one piece of pure, fully unit-testable logic. Everything map-related consumes it.

**Files:**
- Create: `src/lib/localHub.ts`
- Test: `tests/lib/localHub.test.ts`

**Interfaces:**
- Consumes: `Match`, `LocalBook`, `UserProfile` from `src/lib/types.ts`; `haversineDistance` from `src/lib/geo.ts`.
- Produces:
  - `interface MapBounds { north: number; south: number; east: number; west: number }`
  - `isWithinBounds(lat: number, lng: number, b: MapBounds): boolean`
  - `hasLocation(m: { user: UserProfile }): boolean` — `latitude`/`longitude` both non-null.
  - `splitDiscovery(matches: Match[]): { people: Match[]; stores: Match[] }` — stores = `user.type === 'bookstore'`.
  - `bookOwnerLocated(row: LocalBook, b: MapBounds | null): boolean` — true if the row's owner has a location within bounds (or if `b` is null).
  - `sortByDistance<T extends { distanceKm?: number }>(items: T[]): T[]` — ascending; `undefined` distance sorts last. Stable.

- [ ] **Step 1: Write the failing test**

`tests/lib/localHub.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { isWithinBounds, splitDiscovery, sortByDistance, hasLocation, bookOwnerLocated } from '../../src/lib/localHub';
import type { Match, LocalBook, UserProfile } from '../../src/lib/types';

const bounds = { north: 46, south: 45, east: -73, west: -74 };

function user(id: string, extra: Partial<UserProfile> = {}): UserProfile {
  return { id, name: id, city: 'X', radiusKm: 10, topics: { curated: [], freeform: [], inferred: [] }, ...extra };
}
function match(id: string, extra: Partial<UserProfile> = {}, distanceKm?: number): Match {
  return { user: user(id, extra), facets: { shelfTwin: {count:0,items:[]}, readingMentor:{count:0,items:[]}, localSource:{count:0,items:[]}, discussionMatch:{count:0,items:[]} }, totalScore: 0, distanceKm };
}

it('isWithinBounds', () => {
  expect(isWithinBounds(45.5, -73.5, bounds)).toBe(true);
  expect(isWithinBounds(48, -73.5, bounds)).toBe(false);
  expect(isWithinBounds(45.5, -70, bounds)).toBe(false);
});

it('hasLocation', () => {
  expect(hasLocation(match('a', { latitude: 45, longitude: -73 }))).toBe(true);
  expect(hasLocation(match('b'))).toBe(false);
});

it('splitDiscovery separates bookstores from people', () => {
  const ms = [match('p1'), match('s1', { type: 'bookstore' }), match('p2')];
  const { people, stores } = splitDiscovery(ms);
  expect(people.map(m => m.user.id)).toEqual(['p1', 'p2']);
  expect(stores.map(m => m.user.id)).toEqual(['s1']);
});

it('sortByDistance ascending, undefined last, stable', () => {
  const out = sortByDistance([{ distanceKm: 5, id: 'a' }, { distanceKm: undefined, id: 'b' }, { distanceKm: 1, id: 'c' }] as any);
  expect(out.map((x: any) => x.id)).toEqual(['c', 'a', 'b']);
});

it('bookOwnerLocated respects owner coords + null bounds', () => {
  const row = { book: { title: 'T' }, owner: user('o', { latitude: 45.5, longitude: -73.5 }), intent: 'borrowable', tasteScore: 0, isTasteMatch: false } as unknown as LocalBook;
  expect(bookOwnerLocated(row, null)).toBe(true);
  expect(bookOwnerLocated(row, bounds)).toBe(true);
  const rowFar = { ...row, owner: user('o2', { latitude: 10, longitude: 10 }) } as LocalBook;
  expect(bookOwnerLocated(rowFar, bounds)).toBe(false);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:run -- tests/lib/localHub.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/lib/localHub.ts`**

```ts
import type { Match, LocalBook, UserProfile } from './types';

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export function isWithinBounds(lat: number, lng: number, b: MapBounds): boolean {
  return lat <= b.north && lat >= b.south && lng <= b.east && lng >= b.west;
}

export function hasLocation(m: { user: UserProfile }): boolean {
  return m.user.latitude != null && m.user.longitude != null;
}

export function splitDiscovery(matches: Match[]): { people: Match[]; stores: Match[] } {
  const people: Match[] = [];
  const stores: Match[] = [];
  for (const m of matches) {
    if (m.user.type === 'bookstore') stores.push(m);
    else people.push(m);
  }
  return { people, stores };
}

export function bookOwnerLocated(row: LocalBook, b: MapBounds | null): boolean {
  const { latitude, longitude } = row.owner;
  if (latitude == null || longitude == null) return b === null; // unlocated: only when not filtering
  if (b === null) return true;
  return isWithinBounds(latitude, longitude, b);
}

export function sortByDistance<T extends { distanceKm?: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test:run -- tests/lib/localHub.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/localHub.ts tests/lib/localHub.test.ts
git commit -m "add localHub viewport/proximity helpers"
```

---

### Task 2: Global map + self-hosted marker clustering

Install `leaflet.markercluster`, bundle its CSS, and route all located pins through a `L.markerClusterGroup` so points condense at world/country zoom and split to individual pins at city zoom. Cluster icons restyled on-token. This task touches only the map layer of `MatchMapIsland.svelte`; the panel stays as-is.

**Files:**
- Modify: `package.json` (add deps)
- Modify: `src/components/MatchMapIsland.svelte`
- Test: manual/QA (Leaflet not unit-testable in jsdom)

**Interfaces:**
- Consumes: existing `updateMarkers()`, `markerMap`, `pinColors()`, `token()` in `MatchMapIsland.svelte`.
- Produces: a module-level `clusterGroup` (`L.MarkerClusterGroup`) that owns all located pins; `map.getBounds()` → `MapBounds` used by Task 3.

- [ ] **Step 1: Install the clustering plugin (bundled)**

```bash
npm install leaflet.markercluster@^1.5.3
npm install --save-dev @types/leaflet.markercluster@^1.5.5
```

Run: `npm run build`
Expected: build succeeds (dependency installs cleanly).

- [ ] **Step 2: Import the plugin + its CSS in `MatchMapIsland.svelte`**

At the top of the `<script>`, beside the existing `import 'leaflet/dist/leaflet.css';`:

```ts
  import 'leaflet.markercluster/dist/MarkerCluster.css';
  import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
```

The plugin augments the `L` namespace; import it dynamically alongside Leaflet inside `onMount`/`updateMarkers` where `L` is loaded:

```ts
    const L = await import('leaflet');
    await import('leaflet.markercluster');
```

(Do this in BOTH `onMount` and `updateMarkers` right after `await import('leaflet')`, so `L.markerClusterGroup` exists.)

- [ ] **Step 3: Create the cluster group on mount + route pins through it**

Add a module-level `let clusterGroup: any;`. In `onMount`, after `map` is created and before subscribing to matches, create the group:

```ts
    clusterGroup = (L as any).markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      maxClusterRadius: 55,
      chunkedLoading: true,
    });
    map.addLayer(clusterGroup);
```

In `updateMarkers()`, change marker management to add/remove via the cluster group instead of `.addTo(map)`:
- Replace `markerMap.forEach(({ marker }) => marker.remove());` + `markerMap.clear();` with `clusterGroup?.clearLayers(); markerMap.clear();`.
- Replace each located marker's `.addTo(map)` with `.addTo(clusterGroup)` (i.e. build the `L.circleMarker(...)` then `clusterGroup.addLayer(marker)`).
- The "You" marker (in `onMount`) stays added directly to `map` (not clustered).

Keep the existing tooltip/click/hover wiring and `springPinIn`.

- [ ] **Step 4: Restyle cluster bubbles on-token (dark-mode-safe)**

Add to the component `<style>` (global Leaflet selectors), replacing the plugin's default blue with theme tokens:

```css
  :global(.marker-cluster) {
    background: transparent;
  }
  :global(.marker-cluster div) {
    background: var(--accent);
    color: var(--accent-on);
    font-family: var(--font-ui);
    font-weight: 640;
    box-shadow: 0 0 0 4px color-mix(in oklch, var(--accent) 30%, transparent), var(--shadow-2);
    border: none;
  }
  :global(.marker-cluster span) { line-height: 30px; }
```

- [ ] **Step 5: Global support — no artificial zoom lock**

Confirm the map allows zooming out to the world: the existing `setView([...], 13)` opens local; leave `minZoom` unset (Leaflet default 0 = world). Add `worldCopyJump: true` to the `L.map(...)` options so panning across the antimeridian behaves. No other change.

- [ ] **Step 6: Build + QA verify**

Run: `npx astro check` → 0 errors. Run: `npm run build` → succeeds. Commit:

```bash
git add package.json package-lock.json src/components/MatchMapIsland.svelte
git commit -m "cluster located map pins with self-hosted leaflet.markercluster"
```

Then (controller) deploy to QA and verify: at low zoom points show numbered on-token cluster bubbles; zooming in condenses world→country→city→individual pins; clicking a cluster zooms to it; light/dark both correct; no external network request for the plugin.

---

### Task 3: Panel toggle (Books · People · Bookstores) + viewport link

Make the panel a hub: a segmented toggle, each list proximity-sorted and filtered to the current map viewport, cross-linked to pins. This is the largest task; it rewires the panel section of `MatchMapIsland.svelte`.

**Files:**
- Modify: `src/components/MatchMapIsland.svelte`
- Modify: `src/i18n/en/matches.ts`, `src/i18n/fr/matches.ts` (toggle + "in view" strings)
- Test: `tests/components/MatchMapIsland.test.ts` (panel/toggle DOM only — mock is jsdom-safe since map code is guarded by `typeof window`/dynamic import; if the component can't mount under jsdom due to Leaflet, test the extracted panel via a thin subcomponent — see note)

**Interfaces:**
- Consumes: `discovery`, `discoveryBooks` (`src/stores/matches.ts`); `groupByIntent` (`src/lib/discoveryBooks.ts`); `splitDiscovery`, `sortByDistance`, `bookOwnerLocated`, `hasLocation`, `isWithinBounds`, `MapBounds` (Task 1); `BookDiscoveryRow`, `MatchCardIsland`.
- Produces: a working 3-way panel synced to `let viewBounds = $state<MapBounds | null>(null)` updated on map `moveend`.

- [ ] **Step 1: Add panel state + store subscriptions**

In `MatchMapIsland.svelte` `<script>`, add:

```ts
  import { discoveryBooks } from '../stores/matches';
  import { groupByIntent } from '../lib/discoveryBooks';
  import BookDiscoveryRow from './BookDiscoveryRow.svelte';
  import { splitDiscovery, sortByDistance, bookOwnerLocated, isWithinBounds, hasLocation, type MapBounds } from '../lib/localHub';
  import type { LocalBook } from '../lib/types';

  type Panel = 'books' | 'people' | 'bookstores';
  let panel = $state<Panel>('people');
  let query = $state('');
  let viewBounds = $state<MapBounds | null>(null);
  let books = $state<LocalBook[]>([]);
```

Subscribe to `discoveryBooks` in `onMount` alongside the `discovery` subscription:

```ts
    const unsubBooks = discoveryBooks.subscribe((b) => (books = b));
    // add unsubBooks() to the onMount return cleanup
```

- [ ] **Step 2: Wire the map viewport → `viewBounds` (debounced)**

In `onMount`, after `map` is created, set the initial bounds and update on move:

```ts
    const readBounds = (): MapBounds => {
      const b = map.getBounds();
      return { north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() };
    };
    viewBounds = readBounds();
    let moveTimer: ReturnType<typeof setTimeout> | undefined;
    map.on('moveend', () => {
      clearTimeout(moveTimer);
      moveTimer = setTimeout(() => { viewBounds = readBounds(); }, 150);
    });
```

- [ ] **Step 3: Derive the three filtered+sorted lists**

```ts
  const q = $derived(query.trim().toLowerCase());
  const { people, stores } = $derived(splitDiscovery(matchList));

  const peopleInView = $derived(
    sortByDistance(people.filter((m) =>
      (viewBounds == null || (hasLocation(m) && isWithinBounds(m.user.latitude!, m.user.longitude!, viewBounds))) &&
      (!q || m.user.name.toLowerCase().includes(q))))
  );
  const storesInView = $derived(
    sortByDistance(stores.filter((m) =>
      (viewBounds == null || (hasLocation(m) && isWithinBounds(m.user.latitude!, m.user.longitude!, viewBounds))) &&
      (!q || m.user.name.toLowerCase().includes(q))))
  );
  const booksInView = $derived(
    books.filter((row) =>
      bookOwnerLocated(row, viewBounds) &&
      (!q || (row.book.title + ' ' + row.book.author).toLowerCase().includes(q)))
  );
  const bookGroups = $derived(groupByIntent(booksInView));
  const inViewCount = $derived(panel === 'books' ? booksInView.length : panel === 'people' ? peopleInView.length : storesInView.length);
```

(Note: `$derived` with destructuring — write `let peopleStores = $derived(splitDiscovery(matchList)); const people = $derived(peopleStores.people)` etc., since `$derived({a,b})` destructuring isn't reactive-safe; use two `$derived` reads.)

- [ ] **Step 4: Replace the panel markup**

Replace the `.panel-head` + list body (lines ~257–312) with: a segmented toggle (reuse the `.tabs` styling pattern from `LocalDiscovery.svelte`), the search input, an "N in view" count, and a `{#if panel === 'books'}` / `people` / `bookstores` branch. Books branch renders `groupByIntent` groups of `<BookDiscoveryRow {row} {lang} onOwner={(id) => focusFromRow(id)} />`; People/Bookstores branches render `<MatchCardIsland {match} {lang} expanded={expandedId===match.user.id} onToggle={() => toggleExpanded(match.user.id)} />` over `peopleInView` / `storesInView`. Keep the loading/error/empty states (per-panel empty message). Preserve `data`-less structure so the existing `.cards-list` scroll styles apply.

Add `focusFromRow(ownerId)`: set `panel='people'` (or bookstores if the owner is a store — check `matchList`), `expandedId=ownerId`, and call `focusMarker(ownerId)`.

- [ ] **Step 5: Cross-link — clicking a pin selects the right panel**

In the marker `click` handler (currently `toggleExpanded(user.id)`), also switch `panel` to `'bookstores'` if the user is a store else `'people'`, so the selected pin's row is visible in the panel. Keep `toggleExpanded`.

- [ ] **Step 6: i18n**

Add to `src/i18n/en/matches.ts` (and mirror in `fr`): under a `hub` or existing `map` object — `panelBooks: 'Books'`, `panelPeople: 'People'`, `panelStores: 'Bookstores'`, `inView: 'in view'`, and per-panel empty strings (`emptyBooks`/`emptyPeople`/`emptyStores`). FR: `Livres`/`Personnes`/`Librairies`/`en vue` + empties.

- [ ] **Step 7: Panel DOM test**

`tests/components/MatchMapIsland.test.ts`: if the component mounts under jsdom (Leaflet code is inside `onMount` async + guarded), assert the toggle buttons render and switching `panel` changes the list; seed `seedUsers` with a person + a store and assert both appear under the right toggle. If Leaflet import breaks jsdom mount, instead extract the panel into `LocalPanel.svelte` (props: lists + panel + callbacks) and test that in isolation — decide during implementation, keep assertions real (`.toBeTruthy()`).

- [ ] **Step 8: Verify + commit**

Run: `npx astro check` (0 errors), `npm run test:run` (green), `npm run build` (ok).

```bash
git add src/components/MatchMapIsland.svelte src/i18n/en/matches.ts src/i18n/fr/matches.ts tests/components/MatchMapIsland.test.ts
git commit -m "add Books/People/Bookstores panel toggle synced to map viewport"
```

Then (controller) QA-verify: toggling shows each list; panning the map to another city updates each list to what's in view; clicking a row pans/highlights its pin; clicking a pin selects its row.

---

### Task 4: People / Bookstore card rework

Restructure `MatchCardIsland.svelte` for the panel: prominent distance, a compact "why you match" line, clear Connect states. Store variant shows specialties + visit/detail. Preserve the existing connect flow + facet data.

**Files:**
- Modify: `src/components/MatchCardIsland.svelte`
- Modify: `src/i18n/en/matches.ts`, `src/i18n/fr/matches.ts` (any new labels)
- Test: `tests/components/MatchCardIsland.test.ts` (extend if present, else add)

**Interfaces:**
- Consumes: `Match`, the `connections` store (`sendConnectionRequest`, `getConnectionStatus`, `connectionRequests`), `connectButtonState` (`src/lib/connection-ui.ts`), `formatDistance` (`geo.ts`). All already imported in the file.
- Produces: same props (`match`, `expanded`, `onToggle`, `lang`) — no call-site changes.

- [ ] **Step 1: Collapsed header — distance + why-match**

In the collapsed view, ensure the header shows: name, a prominent distance (`formatDistance(match.distanceKm)` when present, else city/neighborhood), and a single **"why you match"** line summarizing the top 1–2 non-zero facets (reuse the existing facet icons/labels; pick the highest-count facets from `match.facets`). Keep the store badge for `type==='bookstore'`. This is a markup/derived-summary change; keep the existing expanded detail.

- [ ] **Step 2: Connect button prominence**

Ensure the Connect control (person, non-readonly) is clearly visible in the collapsed/expanded card with its existing states via `connectButtonState(getConnectionStatus(match.user.id), …)` and `handleConnect`. Keep the public-contact mailto path. No logic change — presentation only.

- [ ] **Step 3: Store variant**

For `type==='bookstore'`: show specialties (≤4) + address + a "View store" link to `/store/${match.user.id}` (the pattern already in the file), no Connect button.

- [ ] **Step 4: Test + verify**

Extend `tests/components/MatchCardIsland.test.ts`: a person card shows a distance and a Connect button; a store card shows specialties + a `/store/` link and no Connect. Use `.toBeTruthy()`.

Run: `npm run test:run -- tests/components/MatchCardIsland.test.ts` (green), `npx astro check` (0).

```bash
git add src/components/MatchCardIsland.svelte src/i18n/en/matches.ts src/i18n/fr/matches.ts tests/components/MatchCardIsland.test.ts
git commit -m "rework match/store card: prominent distance, why-you-match, connect"
```

---

### Task 5: Wire the hub into the Local page; retire the tab switcher

`MatchMapIsland` is now the whole hub. Reduce `LocalDiscovery.svelte` to render it (remove the Books/People/Map tabs + the separate book feed).

**Files:**
- Modify: `src/components/LocalDiscovery.svelte`
- Modify: `tests/components/LocalDiscovery.test.ts`

**Interfaces:**
- Consumes: `MatchMapIsland` (the hub).
- Produces: `<LocalDiscovery lang />` renders the hub only.

- [ ] **Step 1: Simplify `LocalDiscovery.svelte`**

Replace its body with the hub (keep the island entry so `LocalPage.astro` needs no change):

```svelte
<script lang="ts">
  import MatchMapIsland from './MatchMapIsland.svelte';
  import type { Lang } from '../i18n';
  let { lang = 'en' as Lang }: { lang?: Lang } = $props();
</script>

<MatchMapIsland {lang} />
```

Remove the now-unused tab/search/book-feed markup + styles (they moved into the hub). `BookDiscoveryRow` is still used (now by the hub), so keep that file.

- [ ] **Step 2: Update the LocalDiscovery test**

`tests/components/LocalDiscovery.test.ts` currently asserts the tab switcher / book feed. Update it to assert the hub renders (the map container / panel toggle exists) OR that it renders `MatchMapIsland`'s panel toggle. Keep assertions meaningful; if jsdom can't mount Leaflet, assert the component renders without throwing + the panel toggle labels appear (guarded by the map's `typeof window` checks). Do not weaken to nothing.

- [ ] **Step 3: Verify + commit**

Run: `npm run test:run -- tests/components/` (green), `npx astro check` (0).

```bash
git add src/components/LocalDiscovery.svelte tests/components/LocalDiscovery.test.ts
git commit -m "render Local as the map-anchored hub; retire the tab switcher"
```

---

### Task 6: Global QA seed data + polish + full verification

Make world→country→city clustering demonstrable and do the cross-cutting polish + gate.

**Files:**
- Modify: `scripts/seed-qa.sql` (add global seed users)
- Modify: `src/components/MatchMapIsland.svelte` (mobile layout / spacing polish as needed)

- [ ] **Step 1: Add globally-spread QA seed users**

In `scripts/seed-qa.sql`, add a handful of seed users (people + a bookstore) in different countries/cities (e.g. New York, London, Paris, Tokyo, Lyon) with real lat/lng and a couple of shared/visible books, so zooming out shows multiple clusters that condense world→country→city. Follow the existing seed row shape (match columns/format of current users). Keep the QA table note in `CLAUDE.md` roughly accurate if it enumerates counts.

- [ ] **Step 2: Mobile + spacing polish**

Confirm the `@media (max-width: 900px)` stacks map-over-panel; ensure the map has a sensible mobile height and the panel scrolls; no horizontal body scroll. Tighten toggle/search/legend spacing for consistency with the app. Keep all token-based/dark-safe.

- [ ] **Step 3: Full gate**

Run each, confirm green:

```bash
npx astro check       # 0 errors
npm run test:run      # all pass
npm run build         # succeeds
```

- [ ] **Step 4: Deploy to QA + visual verification**

`npm run deploy:qa`, then verify on `https://biblocal-qa.<sub>.workers.dev/local`: world zoom shows numbered on-token clusters; zooming condenses world→country→city→pins; cluster click zooms; panel toggle Books/People/Bookstores works and stays synced to the viewport (pan to Tokyo → Tokyo results); row↔pin cross-link; Connect flow; People/Store card rework; light + dark; mobile stacked; **no external request** for the clustering plugin (check devtools network); `/local` returns 200 on cold hits (SSR-safe — no module-scope store `.get()`).

- [ ] **Step 5: Commit**

```bash
git add scripts/seed-qa.sql src/components/MatchMapIsland.svelte
git commit -m "add global QA seed users; mobile + spacing polish for the Local hub"
```

---

## Self-Review Notes

- **Spec coverage:** §1 layout → Tasks 3/5/6; §2 panel+actions → Tasks 3/4; §3 global map+clustering → Task 2 (+ seed in 6); §4 card rework+polish → Tasks 4/6; §5 components/data → all; §6 testing → per-task + Task 6 gate. All mapped.
- **CSP/self-host:** Task 2 imports the plugin JS+CSS via npm (bundled); Task 6 verifies no external request.
- **Cold-SSR safety (learned bug):** none of the new code adds a module-scope store `.get()`; the hub reads stores inside `onMount`/`$effect`/`$derived` only. Task 6 verifies cold `/local` 200.
- **Type consistency:** `MapBounds`, `splitDiscovery`, `sortByDistance`, `bookOwnerLocated` defined in Task 1, consumed with identical signatures in Task 3. `Panel = 'books'|'people'|'bookstores'` consistent.
- **Known jsdom limit:** Leaflet/clustering verified on QA, not unit tests (stated in Global Constraints + Tasks 2/3/6).
