<script lang="ts">
  import { onMount } from 'svelte';
  import { Spring } from 'svelte/motion';
  // Self-hosted (bundled) instead of a render-blocking unpkg stylesheet.
  import 'leaflet/dist/leaflet.css';
  import { discovery } from '../stores/matches';
  import { profile } from '../stores/profile';
  import { loadSeedUsers, usersLoading, usersError } from '../stores/users';
  import type { Match } from '../lib/types';
  import { CITY_COORDINATES, formatDistance } from '../lib/geo';
  import MatchCardIsland from './MatchCardIsland.svelte';

  let matchList = $state<Match[]>([]);

  // People with coordinates get map pins; people who haven't shared a location
  // still appear, in a separate list below the map.
  const hasLocation = (m: Match) =>
    m.user.latitude != null && m.user.longitude != null;
  let locatedList = $derived(matchList.filter(hasLocation));
  let unlocatedList = $derived(matchList.filter((m) => !hasLocation(m)));
  let loadingUsers = $state(usersLoading.get());
  let loadError = $state<string | null>(usersError.get());
  let expandedId = $state<string | null>(null);

  // Track the seed-user fetch so the panel can tell loading/error apart from a
  // genuinely empty match list.
  $effect(() => usersLoading.subscribe((v) => { loadingUsers = v; }));
  $effect(() => usersError.subscribe((v) => { loadError = v; }));
  let mapContainer: HTMLDivElement;
  let map: any;
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

    // Clear existing markers
    markerMap.forEach(({ marker }) => marker.remove());
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
        })
        .addTo(map);

      // Selecting a card flies + emphasizes its pin; clicking a pin expands the card.
      marker.on('click', () => toggleExpanded(user.id));
      marker.on('mouseover', () => marker.setStyle({ weight: 3, fillOpacity: 1 }));
      marker.on('mouseout', () =>
        marker.setStyle({ weight: 2, fillOpacity: expandedId === user.id ? 1 : 0.92 })
      );

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

    const center = getMapCenter();
    map = L.map(mapContainer, { zoomControl: true }).setView([center.lat, center.lng], 13);

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
        .bindTooltip('You', { className: 'map-tip map-tip-you' })
        .addTo(map);
    }

    // Populate matches from the store and keep pins in sync as it recomputes.
    // (Fires synchronously on subscribe, so this also does the initial render.)
    const unsubMatches = discovery.subscribe((m) => {
      matchList = m;
      if (map) updateMarkers();
    });

    return () => {
      unsubMatches();
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
</script>

<div class="match-map">
  <div class="map-wrap">
    <div class="map-container" bind:this={mapContainer}></div>

    <!-- Floating glass legend over the map -->
    <div class="legend glass card">
      <span class="eyebrow">Legend</span>
      <ul>
        <li><span class="dot dot-you"></span> You</li>
        <li><span class="dot dot-person"></span> People</li>
        <li><span class="dot dot-store"></span> Bookstores</li>
      </ul>
    </div>
  </div>

  <div class="cards-panel card">
    <div class="panel-head">
      <span class="eyebrow">Within reach</span>
      <h2 class="serif">Nearby <span class="count">{locatedList.length}</span></h2>
    </div>

    {#if loadingUsers && matchList.length === 0}
      <div class="panel-state" aria-live="polite">
        <div class="skeleton-list">
          <div class="skeleton-card"></div>
          <div class="skeleton-card"></div>
          <div class="skeleton-card"></div>
        </div>
        <p class="state-note">Finding people near you…</p>
      </div>
    {:else if loadError && matchList.length === 0}
      <div class="panel-state error" role="alert">
        <p>Couldn't load nearby matches.</p>
        <p class="state-note">{loadError}</p>
      </div>
    {:else if matchList.length === 0}
      <div class="empty">
        <p>Add some books to find matches!</p>
      </div>
    {:else}
      <div class="cards-list">
        {#each locatedList as match, i (match.user.id)}
          <div class="card-slot rise" style={`animation-delay:${Math.min(i * 60, 360)}ms`}>
            <MatchCardIsland
              {match}
              expanded={expandedId === match.user.id}
              onToggle={() => toggleExpanded(match.user.id)}
            />
          </div>
        {/each}

        {#if unlocatedList.length > 0}
          <div class="group-head">
            <span class="eyebrow">Location not shared</span>
            <span class="count">{unlocatedList.length}</span>
          </div>
          {#each unlocatedList as match, i (match.user.id)}
            <div class="card-slot rise" style={`animation-delay:${Math.min(i * 60, 360)}ms`}>
              <MatchCardIsland
                {match}
                expanded={expandedId === match.user.id}
                onToggle={() => toggleExpanded(match.user.id)}
              />
            </div>
          {/each}
        {/if}
      </div>
    {/if}
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

  .panel-head {
    margin-bottom: var(--s-4);
    padding-bottom: var(--s-3);
    border-bottom: 1px solid var(--hairline);
  }
  .panel-head .eyebrow { display: block; margin-bottom: var(--s-1); }

  .cards-panel h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 500;
    color: var(--ink);
    display: flex;
    align-items: baseline;
    gap: var(--s-2);
  }
  .count {
    font-family: var(--font-ui);
    font-size: 0.8125rem;
    font-weight: 590;
    color: var(--accent);
    background: var(--accent-tint);
    padding: 0.1rem 0.55rem;
    border-radius: var(--r-full);
  }

  .empty {
    padding: var(--s-8) var(--s-6);
    text-align: center;
    font-family: var(--font-ui);
    color: var(--ink-muted);
    background: var(--surface-sunken);
    border: 1px solid var(--hairline);
    border-radius: var(--r-md);
  }
  .empty p { margin: 0; }
  .empty::before {
    content: '🔍';
    display: block;
    font-size: 1.5rem;
    margin-bottom: var(--s-2);
    opacity: 0.7;
  }

  /* Loading / error panel states (distinct from the empty state). */
  .panel-state {
    padding: var(--s-4) 0;
    text-align: center;
    font-family: var(--font-ui);
    color: var(--ink-muted);
  }
  .panel-state.error p:first-child {
    color: var(--ink);
    font-weight: 590;
  }
  .state-note {
    margin: var(--s-3) 0 0;
    font-size: 0.85rem;
    color: var(--ink-faint);
  }
  .panel-state.error .state-note {
    color: var(--danger);
  }

  .skeleton-list {
    display: flex;
    flex-direction: column;
    gap: var(--s-4);
  }
  .skeleton-card {
    height: 96px;
    border-radius: var(--r-md);
    background: var(--surface-sunken);
    border: 1px solid var(--hairline);
    overflow: hidden;
    position: relative;
  }
  .skeleton-card::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent,
      var(--hairline),
      transparent
    );
    transform: translateX(-100%);
    animation: shimmer 1.4s var(--ease-out) infinite;
  }
  @keyframes shimmer {
    to { transform: translateX(100%); }
  }
  @media (prefers-reduced-motion: reduce) {
    .skeleton-card::after { animation: none; }
  }

  .cards-list {
    display: flex;
    flex-direction: column;
    gap: var(--s-4);
    overflow-y: auto;
    padding-right: var(--s-2);
  }

  .card-slot { display: block; }

  /* Sub-header that separates location-less people from the pinned ones. */
  .group-head {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    margin: var(--s-2) 0 calc(-1 * var(--s-1));
    padding-top: var(--s-3);
    border-top: 1px solid var(--hairline);
  }
  .group-head .eyebrow { margin: 0; }

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
</style>
