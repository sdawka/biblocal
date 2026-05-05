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
  /* Subtle calling card aesthetic */
  .match-card {
    padding: 1.25rem;
    background: var(--color-cream);
    border: 1px solid var(--color-gold-pale);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-gentle);
    box-shadow: var(--shadow-card);
    position: relative;
  }

  /* Subtle top accent line */
  .match-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 12px;
    right: 12px;
    height: 2px;
    background: linear-gradient(
      to right,
      transparent,
      var(--color-gold-pale) 20%,
      var(--color-gold-pale) 80%,
      transparent
    );
    opacity: 0;
    transition: opacity var(--transition-gentle);
  }

  .match-card:hover {
    box-shadow: var(--shadow-lifted);
    transform: translateY(-2px);
    border-color: var(--color-gold);
  }

  .match-card:hover::before {
    opacity: 0.6;
  }

  .match-card.expanded {
    box-shadow: var(--shadow-lifted);
    border-color: var(--color-gold);
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  h3 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.25rem;
    font-weight: 600;
    font-style: italic;
    color: var(--color-ink);
  }

  .distance {
    font-family: var(--font-body);
    font-size: 0.8rem;
    font-style: italic;
    color: var(--color-ink-faded);
    padding: 0.125rem 0.5rem;
    background: var(--color-paper);
    border: 1px solid var(--color-gold-pale);
    border-radius: 2px;
  }

  .facets {
    display: flex;
    gap: 0.375rem;
    flex-wrap: wrap;
  }

  .facet-badge {
    padding: 0.2rem 0.5rem;
    font-size: 0.8rem;
    background: linear-gradient(
      to bottom,
      var(--color-gold-pale),
      var(--color-gold-light) 50%,
      var(--color-gold-pale)
    );
    border: 1px solid var(--color-gold);
    border-radius: 2px;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.4),
      0 1px 2px rgba(0, 0, 0, 0.1);
  }

  .details {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--color-gold-pale);
    animation: unfold 0.3s ease-out;
  }

  @keyframes unfold {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .facet-detail {
    margin-bottom: 1rem;
  }

  .facet-detail h4 {
    margin: 0 0 0.375rem;
    font-family: var(--font-display);
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--color-ink);
  }

  .facet-detail ul {
    margin: 0;
    padding-left: 1.25rem;
    font-family: var(--font-body);
    font-size: 0.875rem;
    color: var(--color-ink-faded);
  }

  .facet-detail li {
    margin: 0.2rem 0;
  }

  .facet-detail li::marker {
    color: var(--color-gold);
  }

  .more {
    color: var(--color-ink-light);
    font-style: italic;
  }

  .borrow-style {
    margin: 1rem 0 0;
    padding: 0.75rem;
    font-family: var(--font-body);
    font-size: 0.9rem;
    font-style: italic;
    color: var(--color-ink-faded);
    background: var(--color-paper);
    border-left: 3px solid var(--color-gold);
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  }
</style>
