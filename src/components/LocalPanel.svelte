<script lang="ts">
  import type { LocalBookGroup, Match } from '../lib/types';
  import BookDiscoveryRow from './BookDiscoveryRow.svelte';
  import MatchCardIsland from './MatchCardIsland.svelte';
  import { useTranslations, type Lang } from '../i18n';

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
    /** "In view" on desktop, "Nearby" when the mobile list is not map-bound. */
    resultScope?: string;
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
    resultScope,
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

  const emptyMessage = $derived(
    panel === 'books' ? th.emptyBooks : panel === 'people' ? th.emptyPeople : th.emptyStores
  );
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

  <span class="in-view-count">{inViewCount} {resultScope ?? th.inView}</span>
</div>

{#if loading && !hasAnyData}
  <div class="panel-state" aria-live="polite">
    <div class="skeleton-list">
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
    </div>
    <p class="state-note">{th.loading}</p>
  </div>
{:else if error && !hasAnyData}
  <div class="panel-state error" role="alert">
    <p>{th.errorTitle}</p>
  </div>
{:else if panel === 'books'}
  {#if bookGroups.length === 0 && bookGroupsUnlocated.length === 0}
    <div class="empty">
      <p>{emptyMessage}</p>
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
            <BookDiscoveryRow {row} {lang} onOwner={(id) => onOwner(id)} />
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
              <BookDiscoveryRow {row} {lang} onOwner={(id) => onOwner(id)} />
            {/each}
          {/each}
        </section>
      {/if}
    </div>
  {/if}
{:else if panel === 'people'}
  {#if peopleInView.length === 0 && peopleUnlocated.length === 0}
    <div class="empty">
      <p>{emptyMessage}</p>
    </div>
  {:else}
    <div class="cards-list">
      {#each peopleInView as match, i (match.user.id)}
        <div class="card-slot rise" style={`animation-delay:${Math.min(i * 60, 360)}ms`}>
          <MatchCardIsland
            {match}
            {lang}
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
    <p>{emptyMessage}</p>
  </div>
{:else}
  <div class="cards-list">
    {#each storesInView as match, i (match.user.id)}
      <div class="card-slot rise" style={`animation-delay:${Math.min(i * 60, 360)}ms`}>
        <MatchCardIsland
          {match}
          {lang}
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
    gap: var(--s-2);
    margin-bottom: var(--s-3);
  }
  .tabs button {
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
