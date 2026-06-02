<svelte:head>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
</svelte:head>

<script lang="ts">
  import { onMount } from 'svelte';
  import { matches } from '../stores/matches';
  import { profile } from '../stores/profile';
  import { loadSeedUsers } from '../stores/users';
  import type { Match } from '../lib/types';
  import { CITY_COORDINATES, formatDistance } from '../lib/geo';
  import MatchCardIsland from './MatchCardIsland.svelte';

  let matchList = $state<Match[]>([]);
  let expandedId = $state<string | null>(null);
  let mapContainer: HTMLDivElement;
  let map: any;
  let markers: any[] = [];

  $effect(() =>
    matches.subscribe((m) => {
      matchList = m;
      updateMarkers();
    })
  );

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

  async function updateMarkers() {
    if (!map) return;
    const L = await import('leaflet');

    // Clear existing markers
    markers.forEach(m => m.remove());
    markers = [];

    matchList.forEach((match) => {
      const user = match.user;
      if (user.latitude == null || user.longitude == null) return;

      const isStore = user.type === 'bookstore';
      const distanceLabel = match.distanceKm != null ? ` (${formatDistance(match.distanceKm)})` : '';

      const marker = L.circleMarker([user.latitude, user.longitude], {
        radius: isStore ? 10 : 8,
        fillColor: isStore ? '#722F37' : '#B8860B',
        fillOpacity: 0.9,
        color: isStore ? '#4A1C24' : '#4A2C2A',
        weight: 2,
      })
        .bindTooltip(`${isStore ? '🏪 ' : ''}${user.name}${distanceLabel}`, {
          className: isStore ? 'victorian-tooltip store-tooltip' : 'victorian-tooltip',
        })
        .addTo(map);

      markers.push(marker);
    });
  }

  onMount(async () => {
    await loadSeedUsers();

    const L = await import('leaflet');

    const center = getMapCenter();
    map = L.map(mapContainer).setView([center.lat, center.lng], 13);

    L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_toner_lite/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; Stadia Maps &copy; OpenStreetMap contributors',
    }).addTo(map);

    // Add user's location marker
    const p = profile.get();
    if (p.latitude && p.longitude) {
      L.circleMarker([p.latitude, p.longitude], {
        radius: 6,
        fillColor: '#228B22',
        fillOpacity: 1,
        color: '#145214',
        weight: 2,
      })
        .bindTooltip('You', { className: 'victorian-tooltip' })
        .addTo(map);
    }

    updateMarkers();

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
    <h2>Nearby ({matchList.length})</h2>

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
    grid-template-columns: 1fr 420px;
    gap: 1.25rem;
    height: calc(100vh - 200px);
    min-height: 500px;
  }

  .map-container {
    border-radius: var(--radius-md);
    overflow: hidden;
    border: 2px solid var(--color-gold);
    box-shadow: var(--shadow-lifted);
    /* Sepia filter for vintage map feel */
    filter: sepia(0.15) saturate(0.9);
  }

  .cards-panel {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--color-cream);
    border: 1px solid var(--color-gold-pale);
    border-radius: var(--radius-md);
    padding: 1.25rem;
    box-shadow: var(--shadow-card);
    position: relative;
  }

  .cards-panel h2 {
    margin: 0 0 1rem;
    font-family: var(--font-display);
    font-size: 1.375rem;
    font-weight: 600;
    color: var(--color-ink);
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--color-gold-pale);
    position: relative;
  }

  /* Subtle dot accent */
  .cards-panel h2::after {
    content: '';
    position: absolute;
    bottom: -4px;
    left: 50%;
    transform: translateX(-50%);
    width: 5px;
    height: 5px;
    background: var(--color-gold);
    border-radius: 50%;
    opacity: 0.4;
  }

  .empty {
    padding: 2.5rem 2rem;
    text-align: center;
    font-family: var(--font-body);
    font-style: italic;
    color: var(--color-ink-faded);
    background: var(--color-paper);
    border: 1px dashed var(--color-gold-pale);
    border-radius: var(--radius-md);
  }

  .empty::before {
    content: '🔍';
    display: block;
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
    opacity: 0.6;
  }

  .cards-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow-y: auto;
    padding-right: 0.5rem;
  }

  @media (max-width: 900px) {
    .match-map {
      grid-template-columns: 1fr;
      grid-template-rows: 300px 1fr;
    }
  }

  /* Global styles for Leaflet tooltip */
  :global(.victorian-tooltip) {
    font-family: var(--font-display);
    font-size: 0.9rem;
    background: var(--color-cream);
    border: 1px solid var(--color-gold);
    color: var(--color-ink);
    box-shadow: var(--shadow-card);
    padding: 0.375rem 0.625rem;
  }

  :global(.victorian-tooltip::before) {
    border-top-color: var(--color-gold);
  }

  :global(.store-tooltip) {
    border-color: #722F37;
  }

  :global(.store-tooltip::before) {
    border-top-color: #722F37;
  }
</style>
