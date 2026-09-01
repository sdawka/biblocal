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
  let isMobile = $state(false);
  let rootRef = $state<HTMLDivElement | null>(null);
  let buttonRef = $state<HTMLButtonElement | null>(null);
  let sheetRef = $state<HTMLDivElement | null>(null);

  function handleWindowPointerDown(event: PointerEvent) {
    if (open && !isMobile && rootRef && !rootRef.contains(event.target as Node)) {
      open = false;
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape' && open) {
      closeFilters();
      return;
    }

    if (event.key === 'Tab' && open && isMobile && sheetRef) {
      const focusable = sheetRef.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  }

  function closeFilters() {
    open = false;
    requestAnimationFrame(() => buttonRef?.focus());
  }

  $effect(() => {
    const mobileQuery = window.matchMedia('(max-width: 600px)');
    const updateMobileState = () => (isMobile = mobileQuery.matches);
    updateMobileState();
    mobileQuery.addEventListener('change', updateMobileState);
    return () => mobileQuery.removeEventListener('change', updateMobileState);
  });

  $effect(() => {
    if (open && isMobile) requestAnimationFrame(() => sheetRef?.querySelector<HTMLElement>('button')?.focus());
  });

  $effect(() => {
    if (!open || !isMobile) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  });
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

  {#if open && isMobile}
    <button class="filter-scrim" aria-label={t.closeFilters} onclick={closeFilters}></button>
  {/if}

  {#if open}
    <div
      class="popover card"
      class:mobile-sheet={isMobile}
      role={isMobile ? 'dialog' : 'group'}
      aria-modal={isMobile ? 'true' : undefined}
      aria-label={t.filterPopoverLabel}
      style:position={isMobile ? 'fixed' : undefined}
      style:z-index={isMobile ? 110 : 50}
      bind:this={sheetRef}
    >
      {#if isMobile}
        <div class="sheet-header">
          <span class="sheet-handle" aria-hidden="true"></span>
          <button class="sheet-close" aria-label={t.closeFilters} onclick={closeFilters}>{t.done}</button>
        </div>
      {/if}
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

  .filter-scrim {
    position: fixed;
    inset: 0;
    z-index: 109;
    width: 100%;
    border: 0;
    background: oklch(0 0 0 / 0.45);
    cursor: default;
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

  .popover.mobile-sheet {
    z-index: 110;
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

  .sheet-header, .sheet-handle, .sheet-close {
    display: none;
  }

  @media (max-width: 600px) {
    .filter-btn {
      min-height: 44px;
    }

    .popover.mobile-sheet {
      position: fixed;
      right: 0;
      bottom: 0;
      left: 0;
      width: 100%;
      max-width: none;
      min-width: 0;
      max-height: min(78vh, 38rem);
      padding: var(--s-3) var(--s-4) calc(var(--s-4) + env(safe-area-inset-bottom));
      overflow-y: auto;
      border-radius: var(--r-lg) var(--r-lg) 0 0;
      animation: sheet-rise var(--dur-2) var(--ease-soft) both;
    }

    .sheet-header {
      position: relative;
      display: flex;
      justify-content: center;
      min-height: 32px;
      margin-bottom: var(--s-1);
    }

    .sheet-handle {
      display: block;
      width: 2.25rem;
      height: 4px;
      border-radius: var(--r-full);
      background: var(--hairline-strong);
    }

    .sheet-close {
      position: absolute;
      top: -8px;
      right: -8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 44px;
      min-height: 44px;
      border: 0;
      background: transparent;
      color: var(--accent);
      font: inherit;
      font-weight: 650;
      cursor: pointer;
    }

    .filter-row {
      align-items: flex-start;
      flex-direction: column;
      gap: var(--s-2);
      padding: var(--s-2) 0;
    }

    .filter-label {
      min-width: 0;
    }

    .chip {
      min-height: 44px;
    }

    .clear-link {
      min-height: 44px;
      margin-left: 0;
    }
  }

  @keyframes sheet-rise {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @media (prefers-reduced-motion: reduce) {
    .popover, .popover.mobile-sheet {
      animation: none;
    }
  }
</style>
