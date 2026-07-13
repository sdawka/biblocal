<script lang="ts">
  import type { Match, MatchFacet } from '../lib/types';
  import { formatDistance } from '../lib/geo';
  import { safeExternalUrl } from '../lib/url';
  import {
    connectionRequests,
    getConnectionStatus,
    sendConnectionRequest,
  } from '../stores/connections';
  import { connectButtonState } from '../lib/connection-ui';
  import { useTranslations, type Lang } from '../i18n';

  interface Props {
    match: Match;
    expanded?: boolean;
    onToggle?: () => void;
    lang?: Lang;
  }

  let { match, expanded = false, onToggle, lang = 'en' as Lang }: Props = $props();
  const t = $derived(useTranslations(lang).matches.card);

  // Connection request state for this match's user.
  let requesting = $state(false);
  let requestError = $state<string | null>(null);

  // Subscribe to the connections store so the button label tracks status changes
  // (e.g. after the request succeeds and loadConnections() refreshes the list).
  let connections = $state($connectionRequests);
  $effect(() => connectionRequests.subscribe((c) => { connections = c; }));

  // `connections` is referenced so this re-derives whenever the store updates.
  let connectState = $derived(
    (() => {
      void connections;
      return connectButtonState(getConnectionStatus(match.user.id), {
        pending: requesting,
      });
    })()
  );

  // connection-ui.ts returns English labels (it's a pure module); map them to
  // the active language via the dict, keyed by the English label.
  let connectLabel = $derived(
    (t.connect as Record<string, string>)[connectState.label] ?? connectState.label
  );

  async function handleConnect(e: MouseEvent) {
    e.stopPropagation();
    if (requesting || !connectState.actionable) return;
    requesting = true;
    requestError = null;
    const result = await sendConnectionRequest(match.user.id);
    requesting = false;
    if (!result.success) {
      requestError = result.error || t.failedToSend;
    }
  }

  let distanceDisplay = $derived(
    match.distanceKm != null
      ? formatDistance(match.distanceKm)
      : match.user.city || ''
  );

  let isStore = $derived(match.user.type === 'bookstore');

  // Icons are presentation-only and stay here; labels come from the dict.
  const FACET_ICONS: Record<string, string> = {
    shelfTwin: '📚',
    readingMentor: '🎓',
    localSource: '🤝',
    discussionMatch: '💬',
  };

  const STORE_FACET_ICONS: Record<string, string> = {
    shelfTwin: '📚',
    readingMentor: '🔍',
    localSource: '🏪',
    discussionMatch: '💬',
  };

  let activeFacets = $derived(
    (() => {
      const labels = isStore ? t.storeFacets : t.facets;
      const icons = isStore ? STORE_FACET_ICONS : FACET_ICONS;
      return Object.entries(match.facets)
        .filter(([_, f]) => f.count > 0)
        .map(([key, facet]) => ({
          key,
          facet,
          meta: {
            label: (labels as Record<string, string>)[key],
            icon: icons[key],
          },
        }));
    })()
  );

  let specialties = $derived(
    isStore && match.user.specialties ? match.user.specialties : []
  );

  // Strongest active facet count — used to scale strength meters relatively.
  let maxFacetCount = $derived(
    activeFacets.reduce((m, { facet }) => Math.max(m, facet.count), 0)
  );

  // Top 1-2 non-zero facets (by count) for the compact "why you match" line.
  let topFacets = $derived(
    [...activeFacets].sort((a, b) => b.facet.count - a.facet.count).slice(0, 2)
  );

  let whyMatchText = $derived(
    topFacets.map(({ meta }) => meta.label).join(' · ')
  );

  // People who appear only because they're sharing books (no taste-match facet)
  // still show what they're offering, so the card isn't blank.
  let offeringCount = $derived(match.offering?.count ?? 0);
  let offeringItems = $derived(match.offering?.items ?? []);
  let showOffering = $derived(activeFacets.length === 0 && offeringCount > 0);
</script>

<article
  class="match-card card card-interactive"
  class:expanded
  class:store={isStore}
>
  <button
    type="button"
    class="card-disclosure"
    aria-expanded={expanded}
    onclick={onToggle}
  >
    <header>
      <div class="title-row">
        {#if isStore}
          <span class="store-badge" aria-hidden="true">🏪</span>
        {/if}
        <h3 class="serif">{match.user.name}</h3>
      </div>
      <span class="distance" class:prominent={match.distanceKm != null}>
        {#if isStore && match.user.neighborhood}
          {match.user.neighborhood}
        {:else}
          {distanceDisplay}
        {/if}
      </span>
    </header>

    {#if !isStore && whyMatchText}
      <p class="why-match">
        <span class="why-match-icons" aria-hidden="true">
          {#each topFacets as { meta }}{meta.icon}{/each}
        </span>
        {whyMatchText}
      </p>
    {/if}

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
      {#each activeFacets as { facet, meta }}
        <span class="facet-badge" aria-label={meta.label}>
          <span class="facet-icon" aria-hidden="true">{meta.icon}</span>
          <span class="facet-count">{facet.count}</span>
          <span
            class="facet-meter"
            aria-hidden="true"
            style={`--fill:${maxFacetCount > 0 ? Math.max(0.18, facet.count / maxFacetCount) : 0}`}
          ></span>
        </span>
      {/each}
      {#if showOffering}
        <span class="facet-badge" aria-label={t.booksToShare}>
          <span class="facet-icon" aria-hidden="true">📖</span>
          <span class="facet-count">{offeringCount}</span>
          <span class="facet-text">{t.toShare}</span>
        </span>
      {/if}
    </div>
  </button>

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
        <button
          class="btn btn-filled btn-connect"
          onclick={handleConnect}
          disabled={!connectState.actionable}
          aria-busy={requesting}
        >
          {connectLabel}
        </button>
        {#if requestError}
          <p class="connect-error" role="alert">{requestError}</p>
        {/if}
      {/if}
    </div>
  {/if}

  {#if isStore}
    <div class="store-quicklinks">
      <a href={`/store/${match.user.id}`} onclick={(e) => e.stopPropagation()}>
        {t.viewStoreDetails}
      </a>
    </div>
  {/if}

  {#if expanded}
    <div class="details">
      {#if isStore}
        <div class="store-info">
          {#if match.user.address}
            <p class="address">📍 {match.user.address}</p>
          {/if}
          {#if safeExternalUrl(match.user.website)}
            <p class="website">
              <a href={safeExternalUrl(match.user.website)} target="_blank" rel="noopener noreferrer" onclick={(e) => e.stopPropagation()}>
                {t.visitWebsite}
              </a>
            </p>
          {/if}
        </div>
      {/if}

      {#each activeFacets as { facet, meta }}
        <div class="facet-detail">
          <h4>{meta.icon} {meta.label}</h4>
          <ul>
            {#each facet.items.slice(0, 3) as item}
              <li>{item}</li>
            {/each}
            {#if facet.items.length > 3}
              <li class="more">+{facet.items.length - 3} {t.more}</li>
            {/if}
          </ul>
        </div>
      {/each}

      {#if showOffering}
        <div class="facet-detail">
          <h4>📖 {t.sharing}</h4>
          <ul>
            {#each offeringItems.slice(0, 3) as item}
              <li>{item}</li>
            {/each}
            {#if offeringItems.length > 3}
              <li class="more">+{offeringItems.length - 3} {t.more}</li>
            {/if}
          </ul>
        </div>
      {/if}

      {#if !isStore && match.user.borrowStyle}
        <p class="borrow-style">"{match.user.borrowStyle}"</p>
      {/if}
    </div>
  {/if}
</article>

<style>
  .match-card {
    /* .card + .card-interactive supply surface, border, radius, shadow, hover lift */
    position: relative;
  }

  .match-card.expanded {
    box-shadow: var(--shadow-2);
    border-color: var(--hairline-strong);
  }

  /* Disclosure affordance: a real button that resets native chrome so the
     collapsed card keeps its original look while staying keyboard-accessible. */
  .card-disclosure {
    display: block;
    width: 100%;
    margin: 0;
    padding: 0;
    border: none;
    background: none;
    font: inherit;
    color: inherit;
    text-align: inherit;
    cursor: pointer;
  }
  .card-disclosure:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 3px;
    border-radius: var(--r-md);
  }

  /* Store accent rail */
  .match-card.store {
    border-left: 3px solid var(--accent);
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: var(--s-3);
    margin-bottom: var(--s-3);
  }

  h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 500;
    color: var(--ink);
  }

  .distance {
    flex-shrink: 0;
    font-family: var(--font-ui);
    font-size: 0.75rem;
    font-weight: 540;
    color: var(--ink-muted);
    padding: 0.2rem 0.55rem;
    background: var(--surface-sunken);
    border-radius: var(--r-full);
    white-space: nowrap;
  }

  /* When we have a real computed distance (vs. a city-name fallback), give it
     more visual weight so it reads at a glance. */
  .distance.prominent {
    font-size: 0.8125rem;
    font-weight: 650;
    color: var(--accent);
    background: var(--surface-sunken);
    border: 1px solid var(--hairline);
  }

  .why-match {
    margin: 0 0 var(--s-3);
    font-family: var(--font-ui);
    font-size: 0.85rem;
    font-weight: 540;
    color: var(--ink-muted);
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .why-match-icons {
    flex-shrink: 0;
    letter-spacing: 0.15rem;
  }

  .facets {
    display: flex;
    gap: var(--s-2);
    flex-wrap: wrap;
  }

  /* Facet badge: icon + count, with a subtle accent strength meter underline. */
  .facet-badge {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    min-height: 36px;
    padding: 0.35rem 0.7rem 0.45rem;
    font-family: var(--font-ui);
    font-size: 0.8125rem;
    font-weight: 590;
    color: var(--ink);
    background: var(--surface-sunken);
    border: 1px solid var(--hairline);
    border-radius: var(--r-md);
    overflow: hidden;
  }

  .facet-icon { font-size: 0.95rem; line-height: 1; }
  .facet-count { color: var(--ink); font-variant-numeric: tabular-nums; }
  .facet-text { color: var(--ink-muted); font-weight: 540; }

  /* Strength meter — accent fill over sunken track, scaled by relative count. */
  .facet-meter {
    position: absolute;
    left: 0;
    bottom: 0;
    height: 3px;
    width: 100%;
    background: var(--hairline);
  }
  .facet-meter::after {
    content: '';
    position: absolute;
    left: 0;
    bottom: 0;
    height: 100%;
    width: calc(var(--fill, 0) * 100%);
    background: var(--accent);
    border-radius: var(--r-full);
    transform-origin: left center;
    transition: width var(--dur-3) var(--ease-out);
  }

  .details {
    margin-top: var(--s-4);
    padding-top: var(--s-4);
    border-top: 1px solid var(--hairline);
    animation: unfold var(--dur-3) var(--ease-out);
  }

  @keyframes unfold {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .facet-detail {
    margin-bottom: var(--s-4);
  }

  .facet-detail h4 {
    margin: 0 0 var(--s-2);
    font-family: var(--font-ui);
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--ink);
  }

  .facet-detail ul {
    margin: 0;
    padding-left: var(--s-5);
    font-family: var(--font-ui);
    font-size: 0.875rem;
    color: var(--ink-muted);
  }

  .facet-detail li {
    margin: 0.2rem 0;
  }

  .facet-detail li::marker {
    color: var(--accent);
  }

  .more {
    color: var(--ink-faint);
  }

  .borrow-style {
    margin: var(--s-4) 0 0;
    padding: var(--s-3) var(--s-4);
    font-family: var(--font-display);
    font-size: 0.95rem;
    font-style: italic;
    color: var(--ink-muted);
    background: var(--surface-sunken);
    border-left: 3px solid var(--accent);
    border-radius: 0 var(--r-md) var(--r-md) 0;
  }

  /* Store-specific */
  .title-row {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    min-width: 0;
  }

  .store-badge {
    font-size: 1.05rem;
    line-height: 1;
  }

  .specialties {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s-1);
    margin-bottom: var(--s-3);
  }

  .specialty-tag {
    padding: 0.15rem 0.5rem;
    font-family: var(--font-ui);
    font-size: 0.7rem;
    font-weight: 540;
    color: var(--ink-muted);
    background: var(--surface-sunken);
    border-radius: var(--r-full);
  }

  .specialty-tag.more {
    color: var(--ink-faint);
  }

  .store-info {
    margin-bottom: var(--s-4);
    padding-bottom: var(--s-3);
    border-bottom: 1px solid var(--hairline);
  }

  .store-info p {
    margin: var(--s-1) 0;
    font-family: var(--font-ui);
    font-size: 0.85rem;
    color: var(--ink-muted);
  }

  .store-info a {
    color: var(--accent);
    text-decoration: none;
    font-weight: 590;
  }

  .store-info a:hover {
    color: var(--accent-hover);
  }

  .store-quicklinks {
    margin-top: var(--s-3);
    padding-top: var(--s-3);
    border-top: 1px solid var(--hairline);
  }

  .store-quicklinks a {
    font-family: var(--font-ui);
    font-weight: 590;
    color: var(--accent);
    text-decoration: none;
  }

  .store-quicklinks a:hover {
    color: var(--accent-hover);
  }

  .connect-section {
    margin-top: var(--s-4);
    padding-top: var(--s-3);
    border-top: 1px solid var(--hairline);
  }

  .btn-connect {
    width: 100%;
  }

  .btn-connect:disabled {
    opacity: 0.65;
    cursor: default;
  }

  .connect-error {
    margin: var(--s-2) 0 0;
    font-family: var(--font-ui);
    font-size: 0.8rem;
    color: var(--danger);
    text-align: center;
  }

  .contact-info {
    margin: 0;
    padding: var(--s-3);
    font-family: var(--font-ui);
    font-size: 0.9rem;
    color: var(--ink);
    background: var(--surface-sunken);
    border-radius: var(--r-md);
    text-align: center;
  }

  .contact-info a {
    color: var(--accent);
    text-decoration: none;
  }

  .contact-info a:hover {
    color: var(--accent-hover);
  }
</style>
