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
  import BookCard from './BookCard.svelte';
  import type { BookIntent } from '../lib/types';
  import { INTENT_OPTIONS, INTENT_PROMPT } from '../lib/intents';

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

  function handleDeleteBook(id: string) {
    removeBook(id);
  }
</script>

<section class="shelf">
  <div class="header">
    <h2 class="serif">Your Shelf <span class="count-tag">{totalBooks} books</span></h2>
  </div>

  <div class="filter-groups card">
    <div class="filter-row">
      <span class="filter-label">I…</span>
      <div class="chip-group" role="group" aria-label="Filter by ownership">
        <button
          class="chip"
          aria-pressed={filters.ownership.includes('have')}
          onclick={() => toggleOwnershipFilter('have')}
        >
          have {#if ownershipCounts.have > 0}<span class="count">{ownershipCounts.have}</span>{/if}
        </button>
        <button
          class="chip"
          aria-pressed={filters.ownership.includes('seeking')}
          onclick={() => toggleOwnershipFilter('seeking')}
        >
          am seeking {#if ownershipCounts.seeking > 0}<span class="count">{ownershipCounts.seeking}</span>{/if}
        </button>
      </div>
    </div>

    <div class="filter-row">
      <span class="filter-label">{INTENT_PROMPT}</span>
      <div class="chip-group" role="group" aria-label="Filter by intent">
        {#each INTENT_OPTIONS as opt}
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
      <div class="chip-group" role="group" aria-label="Filter by visibility">
        <button
          class="chip"
          aria-pressed={filters.visibility.includes('private')}
          onclick={() => toggleVisibilityFilter('private')}
        >
          Private only {#if privateCount > 0}<span class="count">{privateCount}</span>{/if}
        </button>
      </div>
      {#if showClear}
        <button class="btn btn-plain btn-sm clear-link" onclick={() => clearAllFilters()}>
          Clear filters
        </button>
      {/if}
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
          No books yet. Add your first book above.
        {:else}
          No books match this filter.
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
          aria-label={haveExpanded ? 'Collapse books I have section' : 'Expand books I have section'}
        >
          <span class="collapse-icon" class:open={haveExpanded} aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3.5 5.5 7 9l3.5-3.5" />
            </svg>
          </span>
          <h3 class="serif">Books I Have <span class="count-tag">{booksIHave.length}</span></h3>
        </button>
        {#if haveExpanded}
          <div class="grid" id="books-i-have-grid">
            {#each booksIHave as book, i (book.id)}
              <div class="book-wrapper" style="animation-delay: {Math.min(i * 0.04, 0.3)}s">
                <BookCard
                  {book}
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
      </section>
    {/if}

    {#if booksImSeeking.length > 0}
      <section class="shelf-section seeking">
        <button
          class="section-header"
          onclick={() => seekingExpanded = !seekingExpanded}
          aria-expanded={seekingExpanded}
          aria-controls="books-seeking-grid"
          aria-label={seekingExpanded ? 'Collapse books I am seeking section' : 'Expand books I am seeking section'}
        >
          <span class="collapse-icon" class:open={seekingExpanded} aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3.5 5.5 7 9l3.5-3.5" />
            </svg>
          </span>
          <h3 class="serif">Books I'm Seeking <span class="count-tag">{booksImSeeking.length}</span></h3>
        </button>
        {#if seekingExpanded}
          <div class="grid" id="books-seeking-grid">
            {#each booksImSeeking as book, i (book.id)}
              <div class="book-wrapper" style="animation-delay: {Math.min(i * 0.04, 0.3)}s">
                <BookCard
                  {book}
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
      </section>
    {/if}
  {/if}
</section>

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

  .shelf-section.seeking {
    border-left: 3px solid var(--accent);
    padding-left: var(--s-4);
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
    gap: var(--s-4);
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }

  .book-wrapper {
    opacity: 0;
    animation: rise var(--dur-3) var(--ease-out) forwards;
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
  }
</style>
