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

  function getActiveFacets(): {
    key: string;
    facet: MatchFacet;
    meta: { label: string; icon: string };
  }[] {
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
        {meta.icon}
        {facet.count}
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
