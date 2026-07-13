<script lang="ts">
  import {
    shelf,
    activeFilters,
    bookMatchesFilters,
    updateBookIntents,
    toggleOwnershipFilter,
    toggleIntentFilter,
    toggleVisibilityFilter,
    clearAllFilters,
    removeBook,
    addNote,
    updateNote,
    removeNote,
  } from '../stores/shelf';
  import { shelfView, setShelfView } from '../stores/shelf-view';
  import BookCard from './BookCard.svelte';
  import BookSpine from './BookSpine.svelte';
  import BookDetailSheet from './BookDetailSheet.svelte';
  import type { BookIntent } from '../lib/types';
  import { INTENT_OPTIONS } from '../lib/intents';
  import { useTranslations, type Lang } from '../i18n';

  let { lang = 'en' as Lang } = $props();
  const t = $derived(useTranslations(lang).shelf.list);
  let view = $derived($shelfView);
  // Localized intent options: order from lib, labels from the dict.
  const intentOptions = $derived(
    INTENT_OPTIONS.map((opt) => ({ value: opt.value, label: useTranslations(lang).shelf.intents.labels[opt.value] }))
  );
  const intentPrompt = $derived(useTranslations(lang).shelf.intents.prompt);

  let filters = $derived($activeFilters);
  let allBooks = $derived(Object.values($shelf));
  let filteredBooks = $derived(
    allBooks.filter(book => bookMatchesFilters(book, filters))
  );
  let booksIHave = $derived(filteredBooks.filter(b => b.ownership === 'have'));
  let booksImSeeking = $derived(filteredBooks.filter(b => b.ownership === 'seeking'));
  let totalBooks = $derived(allBooks.length);
  let showClear = $derived(
    filters.visibility.length > 0 || filters.ownership.length > 0 || filters.intents.length > 0
  );

  let ownershipCounts = $derived({
    have: allBooks.filter(b => b.ownership === 'have').length,
    seeking: allBooks.filter(b => b.ownership === 'seeking').length,
  });

  let intentCounts = $derived(
    INTENT_OPTIONS.reduce((acc, opt) => {
      acc[opt.value] = allBooks.filter(b => b.intents.includes(opt.value)).length;
      return acc;
    }, {} as Record<BookIntent, number>)
  );

  let privateCount = $derived(allBooks.filter(b => b.visibility === 'private').length);

  let haveExpanded = $state(true);
  let seekingExpanded = $state(true);

  let openBookId = $state<string | null>(null);
  let openBook = $derived(openBookId ? $shelf[openBookId] : null);

  function handleDeleteBook(id: string) {
    removeBook(id);
  }
</script>

<section class="shelf">
  <div class="header">
    <h2 class="serif">{t.title} <span class="count-tag">{totalBooks} {t.countSuffix}</span></h2>
  </div>

  <div class="filter-groups card">
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
        {#each intentOptions as opt}
          <button
            class="chip"
            aria-pressed={filters.intents.includes(opt.value)}
            onclick={() => toggleIntentFilter(opt.value)}
          >
            {opt.label} {#if intentCounts[opt.value] > 0}<span class="count">{intentCounts[opt.value]}</span>{/if}
          </button>
        {/each}
      </div>
    </div>

    <div class="filter-row">
      <span class="filter-label" aria-hidden="true"></span>
      <div class="chip-group" role="group" aria-label={t.filterVisibilityGroup}>
        <button
          class="chip"
          aria-pressed={filters.visibility.includes('private')}
          onclick={() => toggleVisibilityFilter('private')}
        >
          {t.privateOnly} {#if privateCount > 0}<span class="count">{privateCount}</span>{/if}
        </button>
      </div>
      {#if showClear}
        <button class="btn btn-plain btn-sm clear-link" onclick={() => clearAllFilters()}>
          {t.clearFilters}
        </button>
      {/if}
    </div>

    <div class="filter-row">
      <span class="filter-label" aria-hidden="true"></span>
      <div class="segmented" role="group" aria-label={t.viewToggleGroup}>
        <button
          type="button"
          aria-pressed={view === 'covers'}
          onclick={() => setShelfView('covers')}
        >
          {t.viewCovers}
        </button>
        <button
          type="button"
          aria-pressed={view === 'details'}
          onclick={() => setShelfView('details')}
        >
          {t.viewDetails}
        </button>
      </div>
    </div>
  </div>

  {#if filteredBooks.length === 0}
    <div class="empty card">
      <span class="empty-icon" aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      </span>
      <p class="muted">
        {#if totalBooks === 0}
          {t.emptyNoBooks}
        {:else}
          {t.emptyNoMatch}
        {/if}
      </p>
    </div>
  {:else}
    {#if booksIHave.length > 0}
      <section class="shelf-section">
        <button
          class="section-header"
          onclick={() => haveExpanded = !haveExpanded}
          aria-expanded={haveExpanded}
          aria-controls="books-i-have-grid"
          aria-label={haveExpanded ? t.collapseHave : t.expandHave}
        >
          <span class="collapse-icon" class:open={haveExpanded} aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3.5 5.5 7 9l3.5-3.5" />
            </svg>
          </span>
          <h3 class="serif">{t.booksIHave} <span class="count-tag">{booksIHave.length}</span></h3>
        </button>
        {#if haveExpanded}
          {#if view === 'covers'}
            <div class="covers-row" id="books-i-have-grid">
              {#each booksIHave as book, i (book.id)}
                <div class="spine-wrapper" style="animation-delay: {Math.min(i * 0.04, 0.3)}s">
                  <BookSpine {book} {lang} onOpen={(id) => (openBookId = id)} />
                </div>
              {/each}
            </div>
          {:else}
            <div class="grid" id="books-i-have-grid">
              {#each booksIHave as book, i (book.id)}
                <div class="book-wrapper" style="animation-delay: {Math.min(i * 0.04, 0.3)}s">
                  <BookCard
                    {book}
                    {lang}
                    onIntentsChange={(intents) => updateBookIntents(book.id, intents)}
                    onDelete={handleDeleteBook}
                    onAddNote={(text, visibility) => addNote(book.id, text, visibility)}
                    onUpdateNote={(noteId, updates) => updateNote(book.id, noteId, updates)}
                    onDeleteNote={(noteId) => removeNote(book.id, noteId)}
                  />
                </div>
              {/each}
            </div>
          {/if}
        {/if}
      </section>
    {/if}

    {#if booksImSeeking.length > 0}
      <section class="shelf-section seeking">
        <button
          class="section-header"
          onclick={() => seekingExpanded = !seekingExpanded}
          aria-expanded={seekingExpanded}
          aria-controls="books-seeking-grid"
          aria-label={seekingExpanded ? t.collapseSeeking : t.expandSeeking}
        >
          <span class="collapse-icon" class:open={seekingExpanded} aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3.5 5.5 7 9l3.5-3.5" />
            </svg>
          </span>
          <h3 class="serif">{t.booksImSeeking} <span class="count-tag">{booksImSeeking.length}</span></h3>
        </button>
        {#if seekingExpanded}
          {#if view === 'covers'}
            <div class="covers-row" id="books-seeking-grid">
              {#each booksImSeeking as book, i (book.id)}
                <div class="spine-wrapper" style="animation-delay: {Math.min(i * 0.04, 0.3)}s">
                  <BookSpine {book} {lang} onOpen={(id) => (openBookId = id)} />
                </div>
              {/each}
            </div>
          {:else}
            <div class="grid" id="books-seeking-grid">
              {#each booksImSeeking as book, i (book.id)}
                <div class="book-wrapper" style="animation-delay: {Math.min(i * 0.04, 0.3)}s">
                  <BookCard
                    {book}
                    {lang}
                    onIntentsChange={(intents) => updateBookIntents(book.id, intents)}
                    onDelete={handleDeleteBook}
                    onAddNote={(text, visibility) => addNote(book.id, text, visibility)}
                    onUpdateNote={(noteId, updates) => updateNote(book.id, noteId, updates)}
                    onDeleteNote={(noteId) => removeNote(book.id, noteId)}
                  />
                </div>
              {/each}
            </div>
          {/if}
        {/if}
      </section>
    {/if}
  {/if}
</section>

{#if openBook}
  <BookDetailSheet
    book={openBook}
    {lang}
    onClose={() => (openBookId = null)}
    onIntentsChange={(intents) => updateBookIntents(openBook.id, intents)}
    onDelete={(id) => {
      handleDeleteBook(id);
      openBookId = null;
    }}
    onAddNote={(text, visibility) => addNote(openBook.id, text, visibility)}
    onUpdateNote={(noteId, updates) => updateNote(openBook.id, noteId, updates)}
    onDeleteNote={(noteId) => removeNote(openBook.id, noteId)}
  />
{/if}

<style>
  .shelf {
    margin-top: var(--s-7);
  }

  .header {
    margin-bottom: var(--s-4);
  }

  h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 500;
    color: var(--ink);
  }

  .count-tag {
    font-family: var(--font-ui);
    font-size: 0.8125rem;
    font-weight: 590;
    color: var(--ink-faint);
    letter-spacing: 0;
  }

  /* Filter groups */
  .filter-groups {
    display: flex;
    flex-direction: column;
    gap: var(--s-4);
    margin-bottom: var(--s-6);
  }

  .filter-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--s-3);
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

  .chip[aria-pressed="true"] .count {
    background: var(--accent-tint);
    color: var(--accent);
  }

  .clear-link {
    margin-left: auto;
  }

  /* Ownership sections */
  .shelf-section {
    margin-bottom: var(--s-6);
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    width: 100%;
    padding: var(--s-3) 0;
    background: transparent;
    border: none;
    cursor: pointer;
    text-align: left;
    border-bottom: 1px solid var(--hairline);
    margin-bottom: var(--s-4);
    transition: opacity var(--dur-1) var(--ease-soft);
  }

  .section-header:hover {
    opacity: 0.75;
  }

  .collapse-icon {
    display: inline-flex;
    color: var(--ink-muted);
    transition: transform var(--dur-2) var(--ease-spring);
  }

  .collapse-icon.open {
    transform: rotate(0deg);
  }

  .collapse-icon:not(.open) {
    transform: rotate(-90deg);
  }

  .section-header h3 {
    margin: 0;
    font-size: 1.1875rem;
    font-weight: 500;
    color: var(--ink);
  }

  /* Seeking heading gets a small accent tick, echoing the .pill leading dot —
     carries the status cue into the header, unconditional (no hover gate). */
  .shelf-section.seeking .section-header h3::before {
    content: '';
    display: inline-block;
    width: 6px;
    height: 6px;
    margin-right: var(--s-2);
    border-radius: 50%;
    background: var(--accent);
    vertical-align: 0.08em;
  }

  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--s-3);
    padding: var(--s-8) var(--s-6);
    text-align: center;
    border-style: dashed;
  }

  .empty-icon {
    display: inline-flex;
    color: var(--ink-faint);
  }

  .empty p {
    margin: 0;
  }

  .grid {
    display: grid;
    column-gap: var(--s-4);
    row-gap: var(--s-6);
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  }

  /* Tablet guard: lower the floor so the wider column still wraps cleanly
     and never forces horizontal scroll. */
  @media (max-width: 820px) {
    .grid {
      column-gap: var(--s-3);
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    }
  }

  /* Covers view: a single horizontal row of fixed-width spines that scrolls
     sideways within the normal content column — no wrapping. The row itself
     is the scroll container: it never exceeds its parent's width, so when
     the spines' total width overflows, the row scrolls (trackpad, shift+wheel,
     scrollbar) instead of the page body. */
  .covers-row {
    display: flex;
    width: 100%;
    gap: 20px;
    overflow-x: auto;
    overflow-y: visible;
    scroll-snap-type: x proximity;
    padding-block: 0 var(--s-3);
    scrollbar-width: thin;
    scrollbar-color: var(--hairline-strong) transparent;
  }

  .covers-row::-webkit-scrollbar {
    height: 8px;
  }

  .covers-row::-webkit-scrollbar-track {
    background: transparent;
  }

  .covers-row::-webkit-scrollbar-thumb {
    background: var(--hairline-strong);
    border-radius: var(--r-full);
  }

  .covers-row > :global(*) {
    flex: 0 0 132px;
    width: 132px;
    scroll-snap-align: start;
  }

  /* Spine entrance: mirrors the Details cards' staggered rise (small
     translateY + fade, capped stagger), keyed by book.id like the cards so
     re-filtering doesn't re-fire it on items already on screen. */
  .spine-wrapper {
    display: flex;
    opacity: 0;
    animation: spine-rise var(--dur-3) var(--ease-out) forwards;
  }

  @keyframes spine-rise {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* Details is a plain card grid — no shelf furniture; each card just rises in. */
  .book-wrapper {
    display: flex;
    opacity: 0;
    animation: rise var(--dur-3) var(--ease-out) forwards;
  }

  .book-wrapper > :global(.book-card) {
    flex: 1;
  }

  @media (max-width: 600px) {
    .filter-row {
      flex-direction: column;
      align-items: flex-start;
    }

    .clear-link {
      margin-left: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .book-wrapper { opacity: 1; animation: none; }
    .spine-wrapper { opacity: 1; animation: none; }
  }
</style>
