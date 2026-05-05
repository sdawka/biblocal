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

  $effect(() =>
    matches.subscribe((m) => {
      matchList = m;
    })
  );

  onMount(async () => {
    await loadSeedUsers();

    const L = await import('leaflet');
    await import('leaflet/dist/leaflet.css');

    map = L.map(mapContainer).setView([40.7128, -74.006], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    matchList.forEach((match, i) => {
      const offset = i * 0.005 - 0.01;
      L.circleMarker([40.7128 + offset, -74.006 + offset * 2], {
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
