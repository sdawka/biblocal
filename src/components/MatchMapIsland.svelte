<script lang="ts">
  import { onMount } from 'svelte';
  import { Spring } from 'svelte/motion';
  // Self-hosted (bundled) instead of a render-blocking unpkg stylesheet.
  import 'leaflet/dist/leaflet.css';
  import 'leaflet.markercluster/dist/MarkerCluster.css';
  import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
  import { discovery, discoveryBooks } from '../stores/matches';
  import { profile } from '../stores/profile';
  import { loadSeedUsers, usersLoading, usersError } from '../stores/users';
  import type { Match, LocalBook } from '../lib/types';
  import { CITY_COORDINATES, formatDistance } from '../lib/geo';
  import LocalPanel from './LocalPanel.svelte';
  import { groupByIntent } from '../lib/discoveryBooks';
  import {
    splitDiscovery,
    sortByDistance,
    bookOwnerLocated,
    isWithinBounds,
    hasLocation,
    type MapBounds,
  } from '../lib/localHub';
  import { useTranslations, type Lang } from '../i18n';

  let { lang = 'en' as Lang }: { lang?: Lang } = $props();
  const t = $derived(useTranslations(lang).matches.map);

  let matchList = $state<Match[]>([]);
  let books = $state<LocalBook[]>([]);

  type Panel = 'books' | 'people' | 'bookstores';
  let panel = $state<Panel>('people');
  let query = $state('');
  let viewBounds = $state<MapBounds | null>(null);

  let loadingUsers = $state(usersLoading.get());
  let loadError = $state<string | null>(usersError.get());
  let expandedId = $state<string | null>(null);

  // Panel derivations: three filtered + sorted lists synced to the current
  // map viewport (viewBounds === null before the map reports its first
  // bounds, so nothing is filtered out yet).
  const q = $derived(query.trim().toLowerCase());
  // `$derived` destructuring isn't reactive-safe in Svelte 5 — derive the
  // split object once, then read each field via its own `$derived`.
  let ps = $derived(splitDiscovery(matchList));
  const people = $derived(ps.people);
  const stores = $derived(ps.stores);

  const matchesSearch = (m: Match) => !q || m.user.name.toLowerCase().includes(q);
  const bookMatchesSearch = (row: LocalBook) =>
    !q || (row.book.title + ' ' + row.book.author).toLowerCase().includes(q);

  const peopleInView = $derived(
    sortByDistance(
      people.filter(
        (m) =>
          hasLocation(m) &&
          (viewBounds == null || isWithinBounds(m.user.latitude!, m.user.longitude!, viewBounds)) &&
          matchesSearch(m)
      )
    )
  );
  // Owner shares no location at all — always shown, regardless of viewport,
  // in a separate "Location not shared" group (no distance, so no sort).
  const peopleUnlocated = $derived(people.filter((m) => !hasLocation(m) && matchesSearch(m)));

  const storesInView = $derived(
    sortByDistance(
      stores.filter(
        (m) =>
          hasLocation(m) &&
          (viewBounds == null || isWithinBounds(m.user.latitude!, m.user.longitude!, viewBounds)) &&
          matchesSearch(m)
      )
    )
  );
  const storesUnlocated = $derived(stores.filter((m) => !hasLocation(m) && matchesSearch(m)));

  const booksInView = $derived(
    books.filter(
      (row) =>
        bookOwnerLocated(row, viewBounds) &&
        !(row.owner.latitude == null || row.owner.longitude == null) &&
        bookMatchesSearch(row)
    )
  );
  const booksUnlocated = $derived(
    books.filter(
      (row) => (row.owner.latitude == null || row.owner.longitude == null) && bookMatchesSearch(row)
    )
  );
  const bookGroups = $derived(groupByIntent(booksInView));
  const bookGroupsUnlocated = $derived(groupByIntent(booksUnlocated));
  const inViewCount = $derived(
    panel === 'books' ? booksInView.length : panel === 'people' ? peopleInView.length : storesInView.length
  );

  // Track the seed-user fetch so the panel can tell loading/error apart from a
  // genuinely empty match list.
  $effect(() => usersLoading.subscribe((v) => (loadingUsers = v)));
  $effect(() => usersError.subscribe((v) => (loadError = v)));
  let mapContainer: HTMLDivElement;
  let map: any;
  let clusterGroup: any;
  // markerId -> { marker, isStore, baseRadius }
  let markerMap = new Map<string, { marker: any; isStore: boolean; baseRadius: number }>();

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Resolve a theme token to a concrete color string Leaflet (SVG) can use.
  // Leaflet renders pins to SVG and cannot read CSS custom properties directly,
  // so we sample the computed values from the live DOM (keeps light/dark parity).
  function token(name: string, fallback: string): string {
    if (typeof window === 'undefined') return fallback;
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function isDark(): boolean {
    if (typeof window === 'undefined') return false;
    const explicit = document.documentElement.getAttribute('data-theme');
    if (explicit) return explicit === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function getMapCenter(): { lat: number; lng: number } {
    const p = profile.get();
    if (p.latitude && p.longitude) {
      return { lat: p.latitude, lng: p.longitude };
    }
    if (p.city && CITY_COORDINATES[p.city]) {
      return CITY_COORDINATES[p.city];
    }
    return CITY_COORDINATES['Montreal'];
  }

  // Pin colors derived from theme tokens (accent + status family), not hardcoded.
  function pinColors(isStore: boolean) {
    return isStore
      ? { fill: token('--accent', '#975d04'), stroke: token('--accent-hover', '#874a00') }
      : { fill: token('--st-borrowable-fg', '#5a7bb0'), stroke: token('--accent', '#975d04') };
  }

  // Animate a pin's radius in with a spring for a tasteful entrance.
  function springPinIn(marker: any, target: number) {
    if (prefersReducedMotion) {
      marker.setRadius(target);
      return;
    }
    const s = new Spring(0, { stiffness: 0.18, damping: 0.55 });
    s.target = target;
    const start = performance.now();
    // Stop animating if the marker was removed (e.g. markers cleared on a theme swap).
    const stillLive = () => {
      for (const entry of markerMap.values()) {
        if (entry.marker === marker) return true;
      }
      return false;
    };
    const tickFn = () => {
      if (!stillLive()) return;
      marker.setRadius(s.current);
      // Stop once settled (or after a safety window).
      if (Math.abs(s.current - target) > 0.05 && performance.now() - start < 1200) {
        requestAnimationFrame(tickFn);
      } else {
        marker.setRadius(target);
      }
    };
    requestAnimationFrame(tickFn);
  }

  async function updateMarkers() {
    if (!map) return;
    const L = await import('leaflet');
    await import('leaflet.markercluster');

    // Clear existing markers
    clusterGroup?.clearLayers();
    markerMap.clear();

    matchList.forEach((match) => {
      const user = match.user;
      if (user.latitude == null || user.longitude == null) return;

      const isStore = user.type === 'bookstore';
      const baseRadius = isStore ? 10 : 8;
      const distanceLabel = match.distanceKm != null ? ` (${formatDistance(match.distanceKm)})` : '';
      const colors = pinColors(isStore);

      const marker = L.circleMarker([user.latitude, user.longitude], {
        radius: prefersReducedMotion ? baseRadius : 0,
        fillColor: colors.fill,
        fillOpacity: 0.92,
        color: colors.stroke,
        weight: 2,
        className: isStore ? 'pin pin-store' : 'pin pin-person',
      })
        .bindTooltip(`${isStore ? '🏪 ' : ''}${user.name}${distanceLabel}`, {
          className: isStore ? 'map-tip map-tip-store' : 'map-tip',
        });

      // Selecting a card flies + emphasizes its pin; clicking a pin expands
      // the card AND switches the panel so the pin's row is visible there.
      marker.on('click', () => {
        panel = isStore ? 'bookstores' : 'people';
        toggleExpanded(user.id);
      });
      marker.on('mouseover', () => marker.setStyle({ weight: 3, fillOpacity: 1 }));
      marker.on('mouseout', () =>
        marker.setStyle({ weight: 2, fillOpacity: expandedId === user.id ? 1 : 0.92 })
      );

      clusterGroup?.addLayer(marker);
      markerMap.set(user.id, { marker, isStore, baseRadius });
      springPinIn(marker, baseRadius);
    });

    applySelectionStyles();
  }

  // Emphasize the selected pin (accent ring + larger radius) via spring.
  function applySelectionStyles() {
    markerMap.forEach(({ marker, baseRadius }, id) => {
      const selected = id === expandedId;
      marker.setStyle({
        weight: selected ? 3.5 : 2,
        fillOpacity: selected ? 1 : 0.92,
      });
      if (!prefersReducedMotion) {
        springPinIn(marker, selected ? baseRadius + 4 : baseRadius);
      } else {
        marker.setRadius(selected ? baseRadius + 4 : baseRadius);
      }
    });
  }

  onMount(async () => {
    await loadSeedUsers();

    const L = await import('leaflet');
    await import('leaflet.markercluster');

    const center = getMapCenter();
    map = L.map(mapContainer, { zoomControl: true, worldCopyJump: true }).setView(
      [center.lat, center.lng],
      13
    );

    clusterGroup = (L as any).markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      maxClusterRadius: 55,
      chunkedLoading: true,
    });
    map.addLayer(clusterGroup);

    // Use Carto basemap so the map adopts a clean light/dark surface matching the theme.
    const tileUrl = isDark()
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
    const tiles = L.tileLayer(tileUrl, {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);

    // Swap tiles when the theme toggles, keeping dark-mode legibility.
    const themeObserver = new MutationObserver(() => {
      tiles.setUrl(
        isDark()
          ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
          : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
      );
      updateMarkers();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    // Add user's location marker (accent-on-accent "you" pin).
    const p = profile.get();
    if (p.latitude && p.longitude) {
      L.circleMarker([p.latitude, p.longitude], {
        radius: 7,
        fillColor: token('--accent', '#975d04'),
        fillOpacity: 1,
        color: token('--surface', '#fff'),
        weight: 3,
        className: 'pin pin-you',
      })
        .bindTooltip(t.you, { className: 'map-tip map-tip-you' })
        .addTo(map);
    }

    // Populate matches from the store and keep pins in sync as it recomputes.
    // (Fires synchronously on subscribe, so this also does the initial render.)
    const unsubMatches = discovery.subscribe((m) => {
      matchList = m;
      if (map) updateMarkers();
    });
    const unsubBooks = discoveryBooks.subscribe((b) => (books = b));

    // Keep the panel's lists synced to what's actually visible on the map:
    // read the initial bounds now, then re-read (debounced) on every pan/zoom.
    const readBounds = (): MapBounds => {
      const b = map.getBounds();
      return { north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() };
    };
    viewBounds = readBounds();
    let moveTimer: ReturnType<typeof setTimeout> | undefined;
    map.on('moveend', () => {
      clearTimeout(moveTimer);
      moveTimer = setTimeout(() => {
        viewBounds = readBounds();
      }, 150);
    });

    return () => {
      unsubMatches();
      unsubBooks();
      clearTimeout(moveTimer);
      themeObserver.disconnect();
      map?.remove();
    };
  });

  // Pan to and emphasize a pin when its card is selected.
  async function focusMarker(id: string) {
    const entry = markerMap.get(id);
    if (!entry || !map) return;
    const ll = entry.marker.getLatLng();
    map.panTo(ll, { animate: !prefersReducedMotion, duration: 0.5 });
  }

  function toggleExpanded(id: string) {
    expandedId = expandedId === id ? null : id;
    applySelectionStyles();
    if (expandedId) focusMarker(expandedId);
  }

  // Jump from a book row to its owner: select the right panel (bookstore vs
  // person), expand that owner's card, and pan/emphasize their pin.
  function focusFromRow(ownerId: string) {
    const owned = matchList.find((m) => m.user.id === ownerId);
    panel = owned?.user.type === 'bookstore' ? 'bookstores' : 'people';
    expandedId = ownerId;
    applySelectionStyles();
    focusMarker(ownerId);
  }
</script>

<div class="match-map">
  <div class="map-wrap">
    <div class="map-container" bind:this={mapContainer}></div>

    <!-- Floating glass legend over the map -->
    <div class="legend glass card">
      <span class="eyebrow">{t.legend}</span>
      <ul>
        <li><span class="dot dot-you"></span> {t.you}</li>
        <li><span class="dot dot-person"></span> {t.people}</li>
        <li><span class="dot dot-store"></span> {t.bookstores}</li>
      </ul>
    </div>
  </div>

  <div class="cards-panel card">
    <LocalPanel
      {panel}
      onPanelChange={(p) => (panel = p)}
      {query}
      onQueryChange={(v) => (query = v)}
      {bookGroups}
      {bookGroupsUnlocated}
      {peopleInView}
      {peopleUnlocated}
      {storesInView}
      {storesUnlocated}
      {inViewCount}
      {expandedId}
      onToggle={toggleExpanded}
      onOwner={focusFromRow}
      loading={loadingUsers}
      error={loadError}
      hasAnyData={matchList.length > 0}
      {lang}
    />
  </div>
</div>

<style>
  .match-map {
    display: grid;
    grid-template-columns: 1fr 420px;
    gap: var(--s-5);
    height: calc(100vh - 220px);
    min-height: 500px;
  }

  .map-wrap {
    position: relative;
    border-radius: var(--r-lg);
    overflow: hidden;
    border: 1px solid var(--hairline);
    box-shadow: var(--shadow-2);
  }

  .map-container {
    width: 100%;
    height: 100%;
  }

  /* Floating glass legend */
  .legend {
    position: absolute;
    bottom: var(--s-4);
    left: var(--s-4);
    z-index: 500;
    padding: var(--s-3) var(--s-4);
    border-radius: var(--r-md);
    box-shadow: var(--shadow-3);
  }
  .legend .eyebrow { display: block; margin-bottom: var(--s-2); }
  .legend ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--s-1);
  }
  .legend li {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    font-family: var(--font-ui);
    font-size: 0.8125rem;
    font-weight: 540;
    color: var(--ink-muted);
  }
  .dot {
    width: 10px;
    height: 10px;
    border-radius: var(--r-full);
    flex-shrink: 0;
    box-shadow: 0 0 0 2px var(--surface);
  }
  .dot-you { background: var(--accent); box-shadow: 0 0 0 2px var(--surface); }
  .dot-person { background: var(--st-borrowable-fg); }
  .dot-store { background: var(--accent); }

  .cards-panel {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: var(--s-5);
    box-shadow: var(--shadow-1);
  }

  @media (max-width: 900px) {
    .match-map {
      grid-template-columns: 1fr;
      grid-template-rows: 320px 1fr;
    }
  }

  /* ─── Leaflet pin + tooltip restyle (global, theme-token driven) ─── */
  :global(.leaflet-container) {
    background: var(--surface-sunken);
    font-family: var(--font-ui);
  }

  :global(.pin) {
    transition: filter var(--dur-2) var(--ease-out);
  }
  :global(.pin-you) {
    filter: drop-shadow(0 0 6px var(--focus-ring));
  }

  /* Tooltips — glass-like card matching the theme, full dark parity */
  :global(.map-tip) {
    font-family: var(--font-ui);
    font-size: 0.8125rem;
    font-weight: 540;
    background: var(--glass-bg);
    -webkit-backdrop-filter: blur(20px) saturate(1.8);
    backdrop-filter: blur(20px) saturate(1.8);
    border: 1px solid var(--hairline-strong);
    color: var(--ink);
    box-shadow: var(--shadow-3);
    border-radius: var(--r-md);
    padding: 0.35rem 0.6rem;
  }
  :global(.map-tip::before) {
    display: none;
  }
  :global(.map-tip-store) {
    border-color: var(--accent);
  }
  :global(.map-tip-you) {
    color: var(--accent);
    border-color: var(--accent);
  }

  /* Leaflet zoom controls — themed */
  :global(.leaflet-bar) {
    border: 1px solid var(--hairline) !important;
    box-shadow: var(--shadow-2) !important;
    border-radius: var(--r-md) !important;
    overflow: hidden;
  }
  :global(.leaflet-bar a) {
    background: var(--surface) !important;
    color: var(--ink) !important;
    border-bottom: 1px solid var(--hairline) !important;
  }
  /* Larger tap targets for the +/- zoom controls on touch screens. */
  :global(.leaflet-control-zoom a) {
    width: 36px !important;
    height: 36px !important;
    line-height: 36px !important;
  }
  :global(.leaflet-bar a:hover) {
    background: var(--surface-sunken) !important;
    color: var(--accent) !important;
  }
  :global(.leaflet-control-attribution) {
    background: var(--glass-bg) !important;
    color: var(--ink-faint) !important;
    -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px);
  }
  :global(.leaflet-control-attribution a) {
    color: var(--accent) !important;
  }

  /* Cluster bubbles — on-token, replacing the plugin's default blue. */
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
</style>
