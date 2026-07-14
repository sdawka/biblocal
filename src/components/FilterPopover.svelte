<script lang="ts">
  import {
    shelf,
    activeFilters,
    toggleOwnershipFilter,
    toggleIntentFilter,
    toggleVisibilityFilter,
    clearAllFilters,
  } from '../stores/shelf';
  import type { BookIntent } from '../lib/types';
  import { INTENT_OPTIONS } from '../lib/intents';
  import { useTranslations, type Lang } from '../i18n';

  let { lang = 'en' as Lang }: { lang?: Lang } = $props();

  const t = $derived(useTranslations(lang).shelf.list);
  const intentLabels = $derived(useTranslations(lang).shelf.intents.labels);
  const intentPrompt = $derived(useTranslations(lang).shelf.intents.prompt);

  let filters = $derived($activeFilters);
  let allBooks = $derived(Object.values($shelf));
  let activeCount = $derived(
    filters.visibility.length + filters.ownership.length + filters.intents.length
  );

  let ownershipCounts = $derived({
    have: allBooks.filter((b) => b.ownership === 'have').length,
    seeking: allBooks.filter((b) => b.ownership === 'seeking').length,
  });
  let intentCounts = $derived(
    INTENT_OPTIONS.reduce((acc, opt) => {
      acc[opt.value] = allBooks.filter((b) => b.intents.includes(opt.value)).length;
      return acc;
    }, {} as Record<BookIntent, number>)
  );
  let privateCount = $derived(allBooks.filter((b) => b.visibility === 'private').length);

  let open = $state(false);
  let rootRef = $state<HTMLDivElement | null>(null);
  let buttonRef = $state<HTMLButtonElement | null>(null);

  function handleWindowPointerDown(event: PointerEvent) {
    if (open && rootRef && !rootRef.contains(event.target as Node)) {
      open = false;
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape' && open) {
      open = false;
      buttonRef?.focus();
    }
  }
</script>

<svelte:window onpointerdown={handleWindowPointerDown} onkeydown={handleKeyDown} />

<div class="filter-root" bind:this={rootRef}>
  <button
    class="btn btn-outline btn-sm filter-btn"
    aria-expanded={open}
    aria-haspopup="true"
    onclick={() => (open = !open)}
    bind:this={buttonRef}
  >
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
      <path d="M2 3.5h10M4 7h6M5.5 10.5h3" />
    </svg>
    {t.filterButton}
    {#if activeCount > 0}
      <span class="active-count" aria-label={t.filterActiveAria.replace('{n}', String(activeCount))}>
        {activeCount}
      </span>
    {/if}
  </button>

  {#if open}
    <div class="popover card" role="group" aria-label={t.filterPopoverLabel}>
      <div class="filter-row">
        <span class="filter-label">{t.filterOwnershipLabel}</span>
        <div class="chip-group" role="group" aria-label={t.filterOwnershipGroup}>
          <button
            class="chip"
            aria-pressed={filters.ownership.includes('have')}
            onclick={() => toggleOwnershipFilter('have')}
          >
            {t.have} {#if ownershipCounts.have > 0}<span class="count">{ownershipCounts.have}</span>{/if}
          </button>
          <button
            class="chip"
            aria-pressed={filters.ownership.includes('seeking')}
            onclick={() => toggleOwnershipFilter('seeking')}
          >
            {t.seeking} {#if ownershipCounts.seeking > 0}<span class="count">{ownershipCounts.seeking}</span>{/if}
          </button>
        </div>
      </div>

      <div class="filter-row">
        <span class="filter-label">{intentPrompt}</span>
        <div class="chip-group" role="group" aria-label={t.filterIntentGroup}>
          {#each INTENT_OPTIONS as opt}
            <button
              class="chip"
              aria-pressed={filters.intents.includes(opt.value)}
              onclick={() => toggleIntentFilter(opt.value)}
            >
              {intentLabels[opt.value]} {#if intentCounts[opt.value] > 0}<span class="count">{intentCounts[opt.value]}</span>{/if}
            </button>
          {/each}
        </div>
      </div>

      <div class="filter-row">
        <div class="chip-group" role="group" aria-label={t.filterVisibilityGroup}>
          <button
            class="chip"
            aria-pressed={filters.visibility.includes('private')}
            onclick={() => toggleVisibilityFilter('private')}
          >
            {t.privateOnly} {#if privateCount > 0}<span class="count">{privateCount}</span>{/if}
          </button>
        </div>
        {#if activeCount > 0}
          <button class="btn btn-plain btn-sm clear-link" onclick={() => clearAllFilters()}>
            {t.clearFilters}
          </button>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .filter-root {
    position: relative;
  }

  .filter-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--s-2);
  }

  .active-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.2rem;
    height: 1.2rem;
    padding: 0 0.3rem;
    font-size: 0.7rem;
    font-weight: 640;
    background: var(--accent-tint);
    color: var(--accent);
    border-radius: var(--r-full);
  }

  .popover {
    position: absolute;
    top: calc(100% + var(--s-2));
    right: 0;
    z-index: 50;
    display: flex;
    flex-direction: column;
    gap: var(--s-3);
    min-width: 300px;
    max-width: min(92vw, 380px);
    padding: var(--s-4);
    box-shadow: var(--shadow-4);
    animation: fade var(--dur-2) var(--ease-soft) both;
  }

  .filter-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--s-2);
  }

  .filter-label {
    font-family: var(--font-ui);
    font-size: 0.8125rem;
    font-weight: 590;
    color: var(--ink-muted);
    min-width: 3rem;
  }

  .chip-group {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s-2);
  }

  .count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.2rem;
    height: 1.2rem;
    padding: 0 0.3rem;
    margin-left: 0.3rem;
    font-size: 0.7rem;
    font-weight: 640;
    background: var(--surface-sunken);
    color: var(--ink-muted);
    border-radius: var(--r-full);
  }

  .chip[aria-pressed='true'] .count {
    background: var(--accent-tint);
    color: var(--accent);
  }

  .clear-link {
    margin-left: auto;
  }

  @media (prefers-reduced-motion: reduce) {
    .popover {
      animation: none;
    }
  }
</style>
