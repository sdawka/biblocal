<script lang="ts">
  import {
    shelf,
    activeFilters,
    bookMatchesFilters,
    clearAllFilters,
    updateBookIntents,
    updateBook,
    updateBookOwnership,
    updateBookVisibility,
    uploadCover,
    resetCover,
    removeBook,
    addNote,
    updateNote,
    removeNote,
  } from '../stores/shelf';
  import {
    shelfView,
    shelfSort,
    resolveShelfView,
    setShelfView,
    setShelfSort,
    type ShelfSort,
  } from '../stores/shelf-view';
  import BookCard from './BookCard.svelte';
  import BookSpine from './BookSpine.svelte';
  import BookDetailSheet from './BookDetailSheet.svelte';
  import FilterPopover from './FilterPopover.svelte';
  import { useTranslations, type Lang } from '../i18n';

  let { lang = 'en' as Lang } = $props();
  const t = $derived(useTranslations(lang).shelf.list);
  let viewPreference = $derived($shelfView);
  let sort = $derived($shelfSort);
  let isMobile = $state(false);
  let view = $derived(resolveShelfView(viewPreference, isMobile));
  let query = $state('');

  let filters = $derived($activeFilters);
  let allBooks = $derived(Object.values($shelf));
  let activeFilterCount = $derived(
    filters.visibility.length + filters.ownership.length + filters.intents.length
  );
  let normalizedQuery = $derived(query.trim().toLocaleLowerCase());
  let filteredBooks = $derived(allBooks
    .filter(book => bookMatchesFilters(book, filters))
    .filter(book => !normalizedQuery || `${book.title} ${book.author}`.toLocaleLowerCase().includes(normalizedQuery))
    .sort((a, b) => compareBooks(a, b, sort))
  );
  let booksIHave = $derived(filteredBooks.filter(b => b.ownership === 'have'));
  let booksImSeeking = $derived(filteredBooks.filter(b => b.ownership === 'seeking'));
  let totalBooks = $derived(allBooks.length);

  let haveExpanded = $state(true);
  let seekingExpanded = $state(true);

  let openBookId = $state<string | null>(null);
  let openBook = $derived(openBookId ? $shelf[openBookId] : null);

  $effect(() => {
    const mobileQuery = window.matchMedia('(max-width: 600px)');
    const updateMobileState = () => (isMobile = mobileQuery.matches);
    updateMobileState();
    mobileQuery.addEventListener('change', updateMobileState);
    return () => mobileQuery.removeEventListener('change', updateMobileState);
  });

  function compareBooks(a: typeof allBooks[number], b: typeof allBooks[number], order: ShelfSort) {
    if (order === 'title') {
      return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
    }
    if (order === 'shareable') {
      const shareability = (book: typeof a) =>
        book.visibility === 'visible' && book.ownership === 'have' && book.intents.length > 0 ? 1 : 0;
      const difference = shareability(b) - shareability(a);
      if (difference) return difference;
    }
    return b.addedAt - a.addedAt;
  }

  function clearSearchAndFilters() {
    query = '';
    clearAllFilters();
  }

  function moreCount(books: typeof allBooks) {
    return Math.max(books.length - 2, 0);
  }

  async function handleDeleteBook(id: string): Promise<boolean> {
    return removeBook(id);
  }
</script>

<section class="shelf">
  <div class="toolbar">
    <h2 class="serif">{t.title} <span class="count-tag">{totalBooks} {t.countSuffix}</span></h2>
    <div class="toolbar-controls">
      <div class="segmented" role="group" aria-label={t.viewToggleGroup}>
        <button type="button" aria-pressed={view === 'covers'} onclick={() => setShelfView('covers')}>
          {t.viewCovers}
        </button>
        <button type="button" aria-pressed={view === 'details'} onclick={() => setShelfView('details')}>
          {t.viewDetails}
        </button>
      </div>
      <FilterPopover {lang} />
    </div>
  </div>

  {#if totalBooks > 0}
    <div class="library-tools">
      <label class="search-field">
        <span class="visually-hidden">{t.searchAria}</span>
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
          <circle cx="8.5" cy="8.5" r="5.5" />
          <path d="m13 13 4 4" stroke-linecap="round" />
        </svg>
        <input class="input" type="search" bind:value={query} placeholder={t.searchPlaceholder} />
      </label>
      <label class="sort-field">
        <span>{t.sort}</span>
        <select class="input" value={sort} onchange={(event) => setShelfSort((event.currentTarget as HTMLSelectElement).value as ShelfSort)}>
          <option value="recent">{t.sortRecent}</option>
          <option value="title">{t.sortTitle}</option>
          <option value="shareable">{t.sortShareable}</option>
        </select>
      </label>
    </div>
    <div class="result-summary" aria-live="polite">
      <span>{t.showing.replace('{shown}', String(filteredBooks.length)).replace('{total}', String(totalBooks))}</span>
      {#if normalizedQuery || activeFilterCount > 0}
        <button class="btn btn-plain btn-sm" onclick={clearSearchAndFilters}>{t.clearResults}</button>
      {/if}
    </div>
  {/if}

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
            {#if moreCount(booksIHave) > 0}
              <p class="swipe-cue" aria-hidden="true">{t.swipeMore.replace('{n}', String(moreCount(booksIHave)))}</p>
            {/if}
          {:else}
            <div class="grid" id="books-i-have-grid">
              {#each booksIHave as book, i (book.id)}
                <div class="book-wrapper" style="animation-delay: {Math.min(i * 0.04, 0.3)}s">
                  <BookCard {book} {lang} onOpen={(id) => (openBookId = id)} />
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
            {#if moreCount(booksImSeeking) > 0}
              <p class="swipe-cue" aria-hidden="true">{t.swipeMore.replace('{n}', String(moreCount(booksImSeeking)))}</p>
            {/if}
          {:else}
            <div class="grid" id="books-seeking-grid">
              {#each booksImSeeking as book, i (book.id)}
                <div class="book-wrapper" style="animation-delay: {Math.min(i * 0.04, 0.3)}s">
                  <BookCard {book} {lang} onOpen={(id) => (openBookId = id)} />
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
    onOwnershipChange={(ownership) => updateBookOwnership(openBook.id, ownership)}
    onVisibilityChange={(visibility) => updateBookVisibility(openBook.id, visibility)}
    onUpdateDetails={(updates) => updateBook(openBook.id, updates)}
    onUploadCover={(file) => uploadCover(openBook.id, file)}
    onResetCover={() => resetCover(openBook.id)}
    onDelete={handleDeleteBook}
    onAddNote={(text, visibility) => addNote(openBook.id, text, visibility)}
    onUpdateNote={(noteId, updates) => updateNote(openBook.id, noteId, updates)}
    onDeleteNote={(noteId) => removeNote(openBook.id, noteId)}
  />
{/if}

<style>
  .shelf {
    margin-top: var(--s-7);
  }

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--s-3);
    margin-bottom: var(--s-5);
  }

  .toolbar-controls {
    display: flex;
    align-items: center;
    gap: var(--s-3);
  }

  .library-tools {
    display: flex;
    align-items: end;
    gap: var(--s-3);
    margin: calc(-1 * var(--s-2)) 0 var(--s-2);
  }

  .search-field {
    position: relative;
    flex: 1;
    min-width: 12rem;
  }

  .search-field svg {
    position: absolute;
    top: 50%;
    left: var(--s-3);
    color: var(--ink-muted);
    pointer-events: none;
    transform: translateY(-50%);
  }

  .search-field .input {
    width: 100%;
    padding-left: calc(var(--s-3) + 20px);
  }

  .sort-field {
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 0.75rem;
    font-weight: 590;
    color: var(--ink-muted);
  }

  .sort-field select {
    min-width: 7.5rem;
  }

  .result-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 30px;
    margin-bottom: var(--s-3);
    font-size: 0.8125rem;
    color: var(--ink-muted);
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
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
    gap: var(--s-3);
    /* Fixed tracks: every card the same size, matching the covers view's
       uniform spines. */
    grid-template-columns: repeat(auto-fill, 232px);
  }

  @media (max-width: 560px) {
    .grid {
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
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

  .swipe-cue {
    display: none;
    margin: calc(-1 * var(--s-2)) 0 0;
    font-size: 0.75rem;
    color: var(--ink-faint);
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

  @media (prefers-reduced-motion: reduce) {
    .book-wrapper { opacity: 1; animation: none; }
    .spine-wrapper { opacity: 1; animation: none; }
  }

  @media (max-width: 600px) {
    .toolbar {
      align-items: flex-start;
    }

    .toolbar-controls {
      width: 100%;
      justify-content: space-between;
    }

    .library-tools {
      align-items: stretch;
      flex-direction: column;
      gap: var(--s-2);
    }

    .search-field, .sort-field {
      width: 100%;
    }

    .sort-field {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }

    .sort-field select {
      width: min(13rem, 70%);
    }

    .swipe-cue {
      display: block;
    }
  }
</style>
