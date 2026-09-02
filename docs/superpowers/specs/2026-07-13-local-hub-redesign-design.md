# Local — Map-Anchored Discovery Hub

**Date:** 2026-07-13
**Status:** Approved (design)

## Context

The Local page (`/local`) is biblocal's discovery surface. After the earlier book-first redesign it became a tabbed view (Books / People / Map) where the map was a secondary tab and the Books feed was a plain single-column list of glyph-placeholder rows. The user wants Local to be a **balanced hub** — books, people, and bookstores each matter and each must be easy to reach and act on — reworked around a **map-anchored** layout, with the map supporting the **whole world** and **condensing points at world / country / city zoom levels** (marker clustering). Plus general visual polish and a People-card rework.

The underlying engine is solid and stays: `calculateDiscovery`/`calculateMatches` (`src/lib/matching.ts`), the `discovery` (person-keyed `Match[]`) and `discoveryBooks` (book-keyed `LocalBook[]`) stores, the connections store, and the existing Leaflet map in `MatchMapIsland.svelte`. This is a **presentation + map-capability** effort, not a matching-algorithm change.

## Goals

- Map is the anchor and always visible; a results panel beside it toggles **Books · People · Bookstores**, all proximity-aware and **kept in sync with the map viewport**.
- The map works globally and **clusters** points (numbered proximity bubbles) that condense at world/country zoom and split to individual pins at city/locality zoom; clicking a cluster zooms in.
- Each result is actionable (borrow/connect/visit) reusing existing flows; pins and rows cross-link.
- Cohesive visual polish and a clearer People card.

## Non-goals

- No change to `matching.ts` scoring or the `Match`/`LocalBook`/`UserProfile` shapes.
- No change to `/api/*` (except possibly seeding global QA users via existing tooling).
- Not a cover-forward Books redesign (the user deprioritized that); Books rows stay compact.
- No real-time/geolocation-permission rework beyond what exists.

---

## Section 1 — Layout & structure

Extend `MatchMapIsland.svelte` (already map + cards panel) rather than rebuild. `LocalDiscovery.svelte`'s tab switcher is replaced by this single hub; the People/Map tabs collapse into it.

- **Desktop:** map left (~60%, sticky/tall), **results panel** right (~40%, scrolls). Map always visible.
- **Panel** has a segmented toggle **Books · People · Bookstores** (one list at a time). "You" marker + all pins remain on the map regardless of toggle.
- **Mobile (≤ ~820px):** stacks — a compact map on top (tap/expand to enlarge), toggled results list below. No side-by-side.
- Header keeps eyebrow "Discover" / H1 "Local", the **search** box (filters the active list), and "+ Add a bookstore".

---

## Section 2 — Results panel + actions

- Each list is **proximity-sorted** (nearest first; unlocated items grouped last) and **viewport-linked**: as the map pans/zooms, the panel shows results whose location falls within the current map bounds (unlocated items shown under a "Location not shared" group when relevant). A small "N in view" count in the panel head.
- **Books** (from `discoveryBooks`, grouped or flat by intent): cover-or-glyph + title/author + owner + distance + ★fit + intent; row tap → pan/highlight the owner's pin and reveal a **borrow/connect** affordance (reuse the connect flow; a book's action routes to its owner).
- **People** (from `discovery`): reworked `MatchCardIsland` (see §4) — name, distance, why-you-match, **Connect**.
- **Bookstores** (from the stores in `seedUsers`/discovery with `type==='bookstore'`): name + distance + specialties + website / "View store" link.
- Search box filters the active list by title/author/name.
- Cross-linking: clicking any row pans+highlights its pin; clicking a pin scrolls+highlights its row and (if needed) switches the toggle to the matching list.

---

## Section 3 — Global map + clustering

- The map supports the **whole world**: opens centered on the user (or inferred city, fallback Montréal) at a local zoom, but the user can zoom out to world and pan anywhere. "You" marker always shown.
- **Self-hosted marker clustering** (bundled, no external CDN per the app's strict CSP): numbered cluster bubbles that merge at low (world/country) zoom and split into individual pins at city/locality zoom; **click a cluster → zoom to its bounds**. Use `leaflet.markercluster` (npm, self-host its JS + `MarkerCluster.css`/`MarkerCluster.Default.css`, restyled to the warm token palette) — or, if bundling the plugin proves incompatible with the current self-hosted Leaflet setup, a lightweight grid/distance clusterer with the same behavior (decide at implementation; plugin preferred).
- Pins are **typed** (people / bookstores / books-via-owner) and colored via theme tokens; dark/light tiles already swap (Carto). Cluster bubbles + pins are on-token and dark-mode-aware.
- **Cross-link with panel** (both directions), and cluster/viewport changes drive the panel's viewport filter (§2).
- **QA seed data:** add a handful of **globally-spread seed users** (a few cities/countries) via the existing seed tooling so world→country→city condensing is demonstrable; production code stays fully data-driven for real global users.

---

## Section 4 — People-card rework + visual polish

- **People card** (reworked `MatchCardIsland`, still reused for both panel and any card context): name + **prominent distance**, a compact **"why you match"** line (strongest 1–2 facets from shelfTwin / readingMentor / localSource / discussionMatch), and a clear **Connect** button with its existing states (Connect → Request sent → Connected → View contact) and the public-contact path. Bookstores mirror the structure (specialties + visit/detail).
- **Visual polish (cross-cutting):** consistent typography/spacing with the app; on-token cluster bubbles + pins + legend; tidy toggle / search / empty / loading / error states; keep the map's reduced-motion handling. No behavioral change to the connect flow or facet data underneath.

---

## Section 5 — Components, data, reuse

- **Modify:** `src/components/MatchMapIsland.svelte` (the hub: map + clustering + panel + toggle + viewport filter + cross-link), `src/components/MatchCardIsland.svelte` (People/Store card rework), `src/components/LocalPage.astro` / `LocalDiscovery.svelte` (drop the tab switcher; render the hub), and Leaflet setup for clustering + its CSS.
- **Reuse:** `discovery`, `discoveryBooks`, `matching.ts`, `connections` store, `geo.ts` (`haversineDistance`/`formatDistance`), `BookDiscoveryRow` (compact book row), existing pin/tile logic.
- **New:** a small pure helper for **viewport filtering** (`isWithinBounds(lat,lng,bounds)` + filter/sort by proximity) in `src/lib/`, and the clustering wiring.
- **Data:** no schema change; optional global QA seed users via `scripts/seed-qa.sql`.

## Section 6 — Testing & verification

- Unit: viewport-filter helper (in-bounds/out-of-bounds, unlocated handling, proximity sort).
- Store/component: panel reflects the active toggle; search filters; People card renders facets + connect states; cross-link selection state.
- Clustering: render smoke (map mounts with clusters; cluster click zooms) — jsdom-limited, so keep to structure + a pure cluster-grouping helper if one is written.
- `npx astro check` clean; `npm run test:run` green; `npm run build` succeeds.
- **QA visual:** deploy and verify on QA — world zoom shows numbered clusters, zooming condenses world→country→city→pins, panel stays in sync with the viewport, toggle + cross-link + connect work, light/dark, mobile stacked, no horizontal scroll. Confirm the clustering plugin bundles with **no external network requests** (CSP).

## Risks

- **Bundling the clustering plugin under the strict CSP / self-hosted Leaflet** — must be fully local (JS + CSS + cluster icons as inline/token CSS, no CDN). Fallback: custom lightweight clusterer.
- **Viewport-linked panel churn** — debounce map `moveend`; avoid re-render storms.
- **Global data sparsity** — clustering is only meaningful with spread data; handled via QA seed users; ensure graceful behavior with few/one/no located items.
- **Mobile map/panel** — ensure the stacked map doesn't eat the viewport or cause body horizontal scroll.
