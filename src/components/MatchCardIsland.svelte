<script lang="ts">
  import type { Match, MatchFacet } from '../lib/types';
  import { formatDistance } from '../lib/geo';

  interface Props {
    match: Match;
    expanded?: boolean;
    onToggle?: () => void;
  }

  let { match, expanded = false, onToggle }: Props = $props();

  let distanceDisplay = $derived(
    match.distanceKm != null
      ? formatDistance(match.distanceKm)
      : match.user.city || ''
  );

  let isStore = $derived(match.user.type === 'bookstore');

  const FACET_LABELS: Record<string, { label: string; icon: string }> = {
    shelfTwin: { label: 'Shelf Twin', icon: '📚' },
    readingMentor: { label: 'Reading Mentor', icon: '🎓' },
    localSource: { label: 'Can Borrow', icon: '🤝' },
    discussionMatch: { label: 'Discussion Match', icon: '💬' },
    classChain: { label: 'Class Chain', icon: '🎒' },
  };

  const STORE_FACET_LABELS: Record<string, { label: string; icon: string }> = {
    shelfTwin: { label: 'Books in Common', icon: '📚' },
    readingMentor: { label: 'Has What You Seek', icon: '🔍' },
    localSource: { label: 'Available Here', icon: '🏪' },
    discussionMatch: { label: 'Your Interests', icon: '💬' },
    classChain: { label: 'Class Resources', icon: '🎒' },
  };

  function getActiveFacets(): {
    key: string;
    facet: MatchFacet;
    meta: { label: string; icon: string };
  }[] {
    const labels = isStore ? STORE_FACET_LABELS : FACET_LABELS;
    return Object.entries(match.facets)
      .filter(([_, f]) => f.count > 0)
      .map(([key, facet]) => ({
        key,
        facet,
        meta: labels[key],
      }));
  }

  let activeFacets = $derived(getActiveFacets());

  let specialties = $derived(
    isStore && match.user.specialties ? match.user.specialties : []
  );
</script>

<article class="match-card" class:expanded class:store={isStore} onclick={onToggle}>
  <header>
    <div class="title-row">
      {#if isStore}
        <span class="store-badge">🏪</span>
      {/if}
      <h3>{match.user.name}</h3>
    </div>
    <span class="distance">
      {#if isStore && match.user.neighborhood}
        {match.user.neighborhood}
      {:else}
        {distanceDisplay}
      {/if}
    </span>
  </header>

  {#if isStore && specialties.length > 0}
    <div class="specialties">
      {#each specialties.slice(0, 4) as specialty}
        <span class="specialty-tag">{specialty}</span>
      {/each}
      {#if specialties.length > 4}
        <span class="specialty-tag more">+{specialties.length - 4}</span>
      {/if}
    </div>
  {/if}

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
      {#if isStore}
        <div class="store-info">
          {#if match.user.address}
            <p class="address">📍 {match.user.address}</p>
          {/if}
          {#if match.user.website}
            <p class="website">
              <a href={match.user.website} target="_blank" rel="noopener" onclick={(e) => e.stopPropagation()}>
                Visit website →
              </a>
            </p>
          {/if}
          <p class="view-store">
            <a href={`/store/${match.user.id}`} onclick={(e) => e.stopPropagation()}>
              View store details →
            </a>
          </p>
        </div>
      {/if}

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

      {#if !isStore && match.user.borrowStyle}
        <p class="borrow-style">"{match.user.borrowStyle}"</p>
      {/if}

      {#if !isStore && match.user.contactVisibility !== 'hidden'}
        <div class="connect-section">
          {#if match.user.contactVisibility === 'public' && match.user.contactValue}
            <p class="contact-info">
              {#if match.user.contactMethod === 'email'}
                <a href={`mailto:${match.user.contactValue}`} onclick={(e) => e.stopPropagation()}>
                  📧 {match.user.contactValue}
                </a>
              {:else}
                {match.user.contactValue}
              {/if}
            </p>
          {:else}
            <button class="btn-connect" onclick={(e) => { e.stopPropagation(); }}>
              Request to Connect
            </button>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</article>

<style>
  .match-card {
    padding: 1.25rem;
    background: var(--color-cream);
    background-image: var(--texture-paper-fine);
    border: 1px solid var(--color-gold-pale);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-gentle);
    box-shadow: var(--shadow-resting);
    position: relative;
  }

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
      var(--color-gold) 50%,
      var(--color-gold-pale) 80%,
      transparent
    );
    opacity: 0;
    transition: opacity var(--transition-gentle);
  }

  .match-card::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: var(--radius-md);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5), inset 0 -1px 0 rgba(0, 0, 0, 0.05);
    pointer-events: none;
  }

  .match-card:hover {
    box-shadow: var(--shadow-hover);
    transform: translateY(-2px);
    border-color: var(--color-gold);
  }

  .match-card:hover::before {
    opacity: 0.8;
  }

  .match-card.expanded {
    box-shadow: var(--shadow-elevated);
    border-color: var(--color-gold);
  }

  .match-card.expanded::before {
    opacity: 0.8;
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
    padding: 0.5rem 0.75rem;
    min-height: 44px;
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
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
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

  /* Store-specific styles */
  .match-card.store {
    border-left: 3px solid var(--color-burgundy, #722f37);
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .store-badge {
    font-size: 1.1rem;
  }

  .specialties {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    margin-bottom: 0.75rem;
  }

  .specialty-tag {
    padding: 0.125rem 0.375rem;
    font-family: var(--font-body);
    font-size: 0.7rem;
    color: var(--color-ink-faded);
    background: var(--color-paper);
    border: 1px solid var(--color-gold-pale);
    border-radius: 2px;
  }

  .specialty-tag.more {
    font-style: italic;
    color: var(--color-ink-light);
  }

  .store-info {
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px dashed var(--color-gold-pale);
  }

  .store-info p {
    margin: 0.25rem 0;
    font-family: var(--font-body);
    font-size: 0.85rem;
    color: var(--color-ink-faded);
  }

  .store-info .address {
    font-style: italic;
  }

  .store-info a {
    color: var(--color-burgundy, #722f37);
    text-decoration: none;
    font-weight: 500;
  }

  .store-info a:hover {
    text-decoration: underline;
  }

  .view-store {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px dashed var(--color-gold-pale);
  }

  .view-store a {
    font-weight: 500;
  }

  .connect-section {
    margin-top: 1rem;
    padding-top: 0.75rem;
    border-top: 1px dashed var(--color-gold-pale);
  }

  .btn-connect {
    width: 100%;
    padding: 0.625rem 1rem;
    font-family: var(--font-display);
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--color-cream);
    background: linear-gradient(to bottom, var(--color-mahogany-light), var(--color-mahogany));
    border: 1px solid var(--color-mahogany);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--transition-quick);
  }

  .btn-connect:hover {
    transform: translateY(-1px);
    box-shadow: 0 3px 8px rgba(114, 47, 55, 0.3);
  }

  .contact-info {
    margin: 0;
    padding: 0.625rem;
    font-family: var(--font-body);
    font-size: 0.9rem;
    color: var(--color-ink);
    background: var(--color-paper);
    border-radius: var(--radius-sm);
    text-align: center;
  }

  .contact-info a {
    color: var(--color-burgundy);
    text-decoration: none;
  }

  .contact-info a:hover {
    text-decoration: underline;
  }
</style>
