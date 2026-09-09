<script lang="ts">
  import type { LocalBookGroup, LocationPrecision, Match, UserProfile } from '../lib/types';
  import BookDiscoveryRow from './BookDiscoveryRow.svelte';
  import MatchCardIsland from './MatchCardIsland.svelte';
  import { localizePath, useTranslations, type Lang } from '../i18n';
  import type { DiscoveryScope } from '../stores/matches';

  type Panel = 'books' | 'people' | 'bookstores';

  interface Props {
    panel: Panel;
    onPanelChange: (panel: Panel) => void;
    query: string;
    onQueryChange: (query: string) => void;
    bookGroups: LocalBookGroup[];
    bookGroupsUnlocated: LocalBookGroup[];
    peopleInView: Match[];
    peopleUnlocated: Match[];
    storesInView: Match[];
    storesUnlocated: Match[];
    inViewCount: number;
    scopeLabel: string;
    scopeMode: DiscoveryScope;
    onScopeChange: (scope: DiscoveryScope) => void;
    needsLocation: boolean;
    profileLoading: boolean;
    profileError: boolean;
    onRetry: () => void;
    viewerLocationPrecision?: LocationPrecision;
    viewerCity?: string;
    expandedId: string | null;
    onToggle: (id: string) => void;
    onOwner: (ownerId: string) => void;
    loading: boolean;
    error: string | null;
    hasAnyData: boolean;
    lang?: Lang;
  }

  let {
    panel,
    onPanelChange,
    query,
    onQueryChange,
    bookGroups,
    bookGroupsUnlocated,
    peopleInView,
    peopleUnlocated,
    storesInView,
    storesUnlocated,
    inViewCount,
    scopeLabel,
    scopeMode,
    onScopeChange,
    needsLocation,
    profileLoading,
    profileError,
    onRetry,
    viewerLocationPrecision,
    viewerCity,
    expandedId,
    onToggle,
    onOwner,
    loading,
    error,
    hasAnyData,
    lang = 'en' as Lang,
  }: Props = $props();

  const t = $derived(useTranslations(lang).matches);
  const th = $derived(t.hub);
  const locationNotShared = $derived(t.map.locationNotShared);
  const profilePath = $derived(localizePath('/profile', lang));

  const emptyMessage = $derived(
    panel === 'books' ? th.emptyBooks : panel === 'people' ? th.emptyPeople : th.emptyStores
  );
  const hasSearch = $derived(query.trim().length > 0);

  function cityDistanceLabel(user: UserProfile, distanceKm: number | undefined): string | undefined {
    if (distanceKm == null) return undefined;
    const cityPrecision = user.locationPrecision === 'city' || viewerLocationPrecision === 'city';
    if (!cityPrecision) return undefined;
    if (distanceKm === 0) return t.local.sameArea;
    return user.locationPrecision === 'city' ? user.city || t.local.sameArea : viewerCity || t.local.sameArea;
  }
</script>

<div class="panel-head">
  <div class="tabs" role="tablist">
    <button
      role="tab"
      aria-selected={panel === 'books'}
      class:active={panel === 'books'}
      onclick={() => onPanelChange('books')}
    >
      {th.panelBooks}
    </button>
    <button
      role="tab"
      aria-selected={panel === 'people'}
      class:active={panel === 'people'}
      onclick={() => onPanelChange('people')}
    >
      {th.panelPeople}
    </button>
    <button
      role="tab"
      aria-selected={panel === 'bookstores'}
      class:active={panel === 'bookstores'}
      onclick={() => onPanelChange('bookstores')}
    >
      {th.panelStores}
    </button>
  </div>

  <input
    class="search"
    type="search"
    placeholder={th.search}
    value={query}
    oninput={(e) => onQueryChange((e.target as HTMLInputElement).value)}
  />

  <div class="scope-row">
    <span class="scope-label">{profileLoading ? th.loading : profileError ? th.profileErrorTitle : scopeLabel}</span>
    {#if !profileLoading && !profileError}
      <span class="in-view-count" aria-label={`${inViewCount} ${scopeLabel}`}>{inViewCount}</span>
    {/if}
    {#if needsLocation && !profileLoading && !profileError}
      <a class="scope-profile" href={profilePath}>{t.prompts.editProfile}</a>
    {/if}
    {#if profileError}
      <button class="scope-action" type="button" onclick={onRetry}>{t.requests.retry}</button>
    {:else}
      <button
        class="scope-action"
        type="button"
        onclick={() => onScopeChange(scopeMode === 'local' ? 'worldwide' : 'local')}
      >
        {scopeMode === 'local' ? th.browseWorldwide : th.showLocal}
      </button>
    {/if}
  </div>
</div>

{#if (loading || profileLoading) && !hasAnyData}
  <div class="panel-state" aria-live="polite">
    <div class="skeleton-list">
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
    </div>
    <p class="state-note">{th.loading}</p>
  </div>
{:else if (error || profileError) && !hasAnyData}
  <div class="panel-state error" role="alert">
    <p>{profileError ? th.profileErrorTitle : th.errorTitle}</p>
    {#if !profileError}
      <button class="btn btn-sm" type="button" onclick={onRetry}>{t.requests.retry}</button>
    {/if}
  </div>
{:else if panel === 'books'}
  {#if bookGroups.length === 0 && bookGroupsUnlocated.length === 0}
    <div class="empty">
      <p>{hasSearch ? th.emptySearch : emptyMessage}</p>
      {#if hasSearch}
        <button class="btn btn-sm" type="button" onclick={() => onQueryChange('')}>{th.clearSearch}</button>
      {/if}
    </div>
  {:else}
    <div class="cards-list">
      {#each bookGroups as group (group.intent)}
        <section class="group">
          <div class="group-head">
            <span class="eyebrow">{t.groups[group.intent]}</span>
            <span class="count">{group.books.length}</span>
          </div>
          {#each group.books as row (row.owner.id + row.book.id + row.intent)}
            <BookDiscoveryRow {row} {lang} distanceLabel={cityDistanceLabel(row.owner, row.distanceKm)} onOwner={(id) => onOwner(id)} />
          {/each}
        </section>
      {/each}
      {#if bookGroupsUnlocated.length > 0}
        <section class="group group-unlocated">
          <div class="group-head">
            <span class="eyebrow">{locationNotShared}</span>
            <span class="count">
              {bookGroupsUnlocated.reduce((n, g) => n + g.books.length, 0)}
            </span>
          </div>
          {#each bookGroupsUnlocated as group (group.intent)}
            {#each group.books as row (row.owner.id + row.book.id + row.intent)}
              <BookDiscoveryRow {row} {lang} distanceLabel={cityDistanceLabel(row.owner, row.distanceKm)} onOwner={(id) => onOwner(id)} />
            {/each}
          {/each}
        </section>
      {/if}
    </div>
  {/if}
{:else if panel === 'people'}
  {#if peopleInView.length === 0 && peopleUnlocated.length === 0}
    <div class="empty">
      <p>{hasSearch ? th.emptySearch : emptyMessage}</p>
      {#if hasSearch}
        <button class="btn btn-sm" type="button" onclick={() => onQueryChange('')}>{th.clearSearch}</button>
      {/if}
    </div>
  {:else}
    <div class="cards-list">
      {#each peopleInView as match, i (match.user.id)}
        <div class="card-slot rise" style={`animation-delay:${Math.min(i * 60, 360)}ms`}>
          <MatchCardIsland
            {match}
            {lang}
            distanceLabel={cityDistanceLabel(match.user, match.distanceKm)}
            expanded={expandedId === match.user.id}
            onToggle={() => onToggle(match.user.id)}
          />
        </div>
      {/each}
      {#if peopleUnlocated.length > 0}
        <section class="group group-unlocated">
          <div class="group-head">
            <span class="eyebrow">{locationNotShared}</span>
            <span class="count">{peopleUnlocated.length}</span>
          </div>
          {#each peopleUnlocated as match, i (match.user.id)}
            <div class="card-slot rise" style={`animation-delay:${Math.min(i * 60, 360)}ms`}>
              <MatchCardIsland
                {match}
                {lang}
                distanceLabel={cityDistanceLabel(match.user, match.distanceKm)}
                expanded={expandedId === match.user.id}
                onToggle={() => onToggle(match.user.id)}
              />
            </div>
          {/each}
        </section>
      {/if}
    </div>
  {/if}
{:else if storesInView.length === 0 && storesUnlocated.length === 0}
  <div class="empty">
    <p>{hasSearch ? th.emptySearch : emptyMessage}</p>
    {#if hasSearch}
      <button class="btn btn-sm" type="button" onclick={() => onQueryChange('')}>{th.clearSearch}</button>
    {/if}
  </div>
{:else}
  <div class="cards-list">
    {#each storesInView as match, i (match.user.id)}
      <div class="card-slot rise" style={`animation-delay:${Math.min(i * 60, 360)}ms`}>
        <MatchCardIsland
          {match}
          {lang}
          distanceLabel={cityDistanceLabel(match.user, match.distanceKm)}
          expanded={expandedId === match.user.id}
          onToggle={() => onToggle(match.user.id)}
        />
      </div>
    {/each}
    {#if storesUnlocated.length > 0}
      <section class="group group-unlocated">
        <div class="group-head">
          <span class="eyebrow">{locationNotShared}</span>
          <span class="count">{storesUnlocated.length}</span>
        </div>
        {#each storesUnlocated as match, i (match.user.id)}
          <div class="card-slot rise" style={`animation-delay:${Math.min(i * 60, 360)}ms`}>
            <MatchCardIsland
              {match}
              {lang}
              distanceLabel={cityDistanceLabel(match.user, match.distanceKm)}
              expanded={expandedId === match.user.id}
              onToggle={() => onToggle(match.user.id)}
            />
          </div>
        {/each}
      </section>
    {/if}
  </div>
{/if}

<style>
  .panel-head {
    margin-bottom: var(--s-4);
    padding-bottom: var(--s-3);
    border-bottom: 1px solid var(--hairline);
  }

  .tabs {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s-2);
    margin-bottom: var(--s-3);
  }
  .tabs button {
    min-width: 0;
    padding: 0.4rem 0.9rem;
    border-radius: var(--r-full);
    border: 1px solid var(--hairline-strong);
    background: var(--surface);
    color: var(--ink-muted);
    cursor: pointer;
    font-family: var(--font-ui);
    font-weight: 590;
    font-size: 0.875rem;
  }
  .tabs button.active {
    color: var(--accent);
    border-color: var(--accent);
    background: var(--accent-tint);
  }

  .search {
    width: 100%;
    padding: 0.55rem 0.9rem;
    margin-bottom: var(--s-2);
    border: 1px solid var(--hairline-strong);
    border-radius: var(--r-full);
    font-family: var(--font-ui);
    background: var(--surface);
    color: var(--ink);
  }

  .in-view-count {
    display: inline-block;
    font-family: var(--font-ui);
    font-size: 0.8125rem;
    font-weight: 590;
    color: var(--accent);
    background: var(--accent-tint);
    padding: 0.1rem 0.55rem;
    border-radius: var(--r-full);
  }

  .scope-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--s-2);
    margin-bottom: var(--s-2);
    font-family: var(--font-ui);
    font-size: 0.8125rem;
  }
  .scope-label {
    flex: 1 1 100%;
    color: var(--ink-muted);
  }
  .scope-action {
    flex: 0 0 auto;
    border: 0;
    padding: 0.2rem 0;
    color: var(--accent);
    background: transparent;
    cursor: pointer;
    font: inherit;
    font-weight: 650;
    text-decoration: underline;
    text-underline-offset: 0.18em;
  }
  .scope-profile {
    flex: 0 0 auto;
    color: var(--accent);
    font-weight: 650;
    text-decoration: underline;
    text-underline-offset: 0.18em;
  }

  @media (max-width: 420px) {
    .tabs {
      gap: 0.35rem;
    }
    .tabs button {
      flex: 1 0 auto;
      padding-inline: 0.55rem;
      font-size: 0.8125rem;
    }
    .scope-action {
      flex: 1 1 auto;
      text-align: left;
    }
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
    flex: 1 1 auto;
    min-height: 0;
    gap: var(--s-4);
    overflow-y: auto;
    padding-right: var(--s-2);
  }

  .card-slot { display: block; }

  .group-head {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    margin: 0 0 var(--s-1);
  }
  .group-head .eyebrow { margin: 0; }
  .group-head .count {
    font-family: var(--font-ui);
    font-size: 0.75rem;
    font-weight: 590;
    color: var(--accent);
    background: var(--accent-tint);
    padding: 0.05rem 0.45rem;
    border-radius: var(--r-full);
  }

  @media (max-width: 900px) {
    .panel-head {
      margin-bottom: var(--s-3);
      padding-bottom: var(--s-2);
    }
    .tabs {
      margin-bottom: var(--s-2);
    }
  }
</style>
