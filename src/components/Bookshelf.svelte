<script lang="ts">
  import { shelf } from '../stores/shelf';
  import ShelfIsland from './ShelfIsland.svelte';
  import AddBookIsland from './AddBookIsland.svelte';
  import ImportIsland from './ImportIsland.svelte';
  import { useTranslations, type Lang } from '../i18n';

  let { lang = 'en' as Lang } = $props();
  const t = $derived(useTranslations(lang).shelf);

  let isEmpty = $state(true);
  let adding = $state(false);

  $effect(() => {
    const unsub = shelf.subscribe((s) => {
      isEmpty = Object.keys(s).length === 0;
    });
    return unsub;
  });

  function openAdd() {
    adding = true;
  }

  function closeAdd() {
    adding = false;
  }
</script>

<div class="bookshelf">
  {#if !isEmpty}
    <ShelfIsland {lang} />
  {/if}

  <div class="shelf-row">
    {#if adding}
      <section class="add-slot open" aria-label={t.page.zoneTitle}>
        <button class="add-slot-close" type="button" onclick={closeAdd} aria-label="Close">×</button>
        <AddBookIsland {lang} onClose={closeAdd} />
        <details class="import-section">
          <summary>{t.page.importSummary}</summary>
          <ImportIsland {lang} />
        </details>
      </section>
    {:else}
      <button class="add-slot" type="button" onclick={openAdd}>
        <span class="plus" aria-hidden="true">+</span>
        <span class="add-label">{isEmpty ? t.empty.addFirst : t.page.zoneTitle}</span>
      </button>
    {/if}
  </div>
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
    border-bottom: 2px solid var(--hairline-strong);
    box-shadow: 0 2px 0 var(--hairline);
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
</style>
