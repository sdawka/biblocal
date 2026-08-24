<script lang="ts">
  import { shelf, shelfHydrated } from '../stores/shelf';
  import ShelfIsland from './ShelfIsland.svelte';
  import AddBookIsland from './AddBookIsland.svelte';
  import ImportIsland from './ImportIsland.svelte';
  import { useTranslations, type Lang } from '../i18n';

  let { lang = 'en' as Lang } = $props();
  const t = $derived(useTranslations(lang).shelf);

  let isEmpty = $state(true);
  let hydrated = $state(false);
  type IntakePanel = 'add' | 'import' | null;
  let intakePanel: IntakePanel = $state(null);

  // Still loading: the shelf hasn't settled yet and has nothing in it. Show a
  // skeleton instead of the real empty state, so a fresh load never flashes
  // "you have no books" before the async fetch resolves.
  let loading = $derived(!hydrated && isEmpty);

  $effect(() => {
    const unsub = shelf.subscribe((s) => {
      isEmpty = Object.keys(s).length === 0;
      // Returning user with a populated localStorage shelf: mark hydrated
      // immediately (client-side) so we never flash the loading skeleton.
      if (!isEmpty) shelfHydrated.set(true);
    });
    return unsub;
  });

  $effect(() => {
    const unsub = shelfHydrated.subscribe((h) => {
      hydrated = h;
    });
    return unsub;
  });

  // The mobile navigation can link straight to the intake flow without
  // introducing route-only state. Consume the parameter once so refreshing or
  // closing the panel returns to the normal Biblio URL.
  $effect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('add') !== '1') return;

    intakePanel = 'add';
    url.searchParams.delete('add');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  });

  function openAdd() {
    intakePanel = 'add';
  }

  function closeAdd() {
    intakePanel = null;
  }

  function openImport() {
    intakePanel = 'import';
  }
</script>

<div class="bookshelf">
  {#if !isEmpty}
    <ShelfIsland {lang} />
  {/if}

  {#if loading}
    <div class="shelf-row loading" aria-hidden="true">
      <div class="skeleton-shelf">
        <div class="skeleton-spines">
          {#each [0, 1, 2, 3, 4] as i}
            <span class="skeleton-spine" style="animation-delay: {i * 0.08}s"></span>
          {/each}
        </div>
      </div>
    </div>
  {:else}
    <div class="shelf-row intake-row">
      {#if intakePanel}
        <section class="add-slot open" aria-label={t.page.zoneTitle}>
          <button class="add-slot-close" type="button" onclick={closeAdd} aria-label="Close">×</button>
          <div class="intake-switcher" role="group" aria-label={t.page.intakeAriaLabel}>
            <button
              type="button"
              class:active={intakePanel === 'add'}
              aria-pressed={intakePanel === 'add'}
              onclick={openAdd}
            >
              {t.page.zoneTitle}
            </button>
            <button
              type="button"
              class:active={intakePanel === 'import'}
              aria-pressed={intakePanel === 'import'}
              onclick={openImport}
            >
              {t.page.importSummary}
            </button>
          </div>
          {#if intakePanel === 'add'}
            <AddBookIsland {lang} onClose={closeAdd} />
            <!-- Desktop keeps the original progressive-disclosure import path. -->
            <details class="import-section">
              <summary>{t.page.importSummary}</summary>
              <ImportIsland {lang} />
            </details>
          {:else}
            <ImportIsland {lang} />
          {/if}
        </section>
      {:else}
        <div class="intake-actions">
          <button class="add-slot" type="button" onclick={openAdd}>
            <span class="plus" aria-hidden="true">+</span>
            <span class="add-label">{isEmpty ? t.empty.addFirst : t.page.zoneTitle}</span>
          </button>
          <button class="import-trigger" type="button" onclick={openImport}>
            {t.page.importSummary}
          </button>
        </div>
      {/if}
      {#if isEmpty && !intakePanel}
        <a class="explore-nearby" href={lang === 'fr' ? '/fr/local' : '/local'}>
          <span class="explore-title">{t.empty.exploreNearby}</span>
          <span class="explore-subtitle">{t.empty.exploreNearbySubtitle}</span>
        </a>
      {/if}
    </div>
  {/if}
</div>

<style>
  /* Shelf ledge: each wrapped row sits on a subtle ledge line. */
  .bookshelf {
    display: flex;
    flex-direction: column;
    gap: var(--s-5);
  }

  .shelf-row {
    padding-bottom: var(--s-3);
    border-bottom: 1px solid var(--hairline-strong);
    box-shadow: 0 1px 0 var(--hairline);
  }

  .intake-actions {
    display: contents;
  }

  /* Loading skeleton: a few ghost spines with a shimmer sweep, so the
     initial load reads as "shelf filling in" rather than "you have no
     books." No add-slot/explore CTA while this is showing. */
  .skeleton-shelf {
    display: flex;
    flex-direction: column;
  }

  .skeleton-spines {
    display: flex;
    align-items: flex-end;
    gap: 20px;
    padding-block: 0 4px;
  }

  .skeleton-spine {
    flex: 0 0 132px;
    width: 132px;
    height: 198px;
    border-radius: 2px var(--r-sm) var(--r-sm) 2px;
    background: var(--surface-sunken);
    position: relative;
    overflow: hidden;
  }

  .skeleton-spine::after {
    content: '';
    position: absolute;
    inset: 0;
    transform: translateX(-100%);
    background: linear-gradient(
      100deg,
      transparent 30%,
      var(--hairline-strong) 50%,
      transparent 70%
    );
    animation: skeleton-shimmer 1.6s ease-in-out infinite;
  }

  @keyframes skeleton-shimmer {
    to { transform: translateX(100%); }
  }

  @media (max-width: 600px) {
    .skeleton-spines {
      gap: var(--s-3);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .skeleton-spine::after {
      animation: none;
      display: none;
    }
  }

  .add-slot {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--s-2);
    min-height: 180px;
    width: 132px;
    border: 2px dashed var(--hairline-strong);
    border-radius: var(--r-md);
    background: var(--surface-sunken);
    color: var(--ink-muted);
    cursor: pointer;
    transition: border-color var(--dur-2) var(--ease-out), color var(--dur-2) var(--ease-out);
  }

  .add-slot:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  .add-slot .plus {
    font-size: 2rem;
    line-height: 1;
  }

  .add-slot.open {
    width: 100%;
    align-items: stretch;
    cursor: default;
    position: relative;
    padding: var(--s-5);
    border-style: solid;
    background: var(--surface-sunken);
    animation: rise var(--dur-3) var(--ease-out) both;
  }

  .intake-switcher,
  .import-trigger {
    display: none;
  }

  .add-slot-close {
    position: absolute;
    top: var(--s-3);
    right: var(--s-3);
    background: none;
    border: none;
    font-size: 1.5rem;
    line-height: 1;
    color: var(--ink-muted);
    cursor: pointer;
  }

  .import-section {
    margin-top: var(--s-4);
  }

  @media (max-width: 600px) {
    /* Put the primary intake choice before a populated shelf without changing
       the desktop shelf's trailing add slot. */
    .intake-row {
      order: -1;
    }

    .intake-actions {
      display: flex;
      gap: var(--s-3);
    }

    .intake-actions .add-slot,
    .import-trigger {
      width: auto;
      min-height: 72px;
      flex: 1;
    }

    .intake-actions .add-slot {
      flex-direction: row;
      gap: var(--s-2);
    }

    .intake-actions .plus {
      font-size: 1.5rem;
    }

    .import-trigger {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--s-3);
      border: 1px solid var(--hairline-strong);
      border-radius: var(--r-md);
      color: var(--ink-muted);
      background: var(--surface);
      font: inherit;
      font-size: 0.875rem;
      font-weight: 590;
      cursor: pointer;
    }

    .add-slot.open {
      padding: var(--s-4);
    }

    .intake-switcher {
      display: flex;
      gap: var(--s-2);
      margin: 0 0 var(--s-4);
      padding-right: var(--s-5);
    }

    .intake-switcher button {
      min-height: 40px;
      border: 0;
      border-bottom: 2px solid transparent;
      padding: 0 var(--s-2);
      color: var(--ink-muted);
      background: transparent;
      font: inherit;
      font-size: 0.875rem;
      cursor: pointer;
    }

    .intake-switcher button.active {
      color: var(--accent);
      border-color: var(--accent);
    }

    .import-section {
      display: none;
    }
  }

  .explore-nearby {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    margin-top: var(--s-3);
    color: var(--ink-muted);
    text-decoration: none;
  }

  .explore-nearby:hover {
    color: var(--accent);
  }

  .explore-title {
    font-weight: 590;
    font-size: 0.9rem;
  }

  .explore-subtitle {
    font-size: 0.8rem;
    color: var(--ink-faint);
  }
</style>
