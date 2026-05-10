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
  } from '../stores/shelf';
  import BookCard from './BookCard.svelte';
  import type { BookIntent, BookOwnership, BookVisibility } from '../lib/types';

  const INTENT_OPTIONS: { value: BookIntent; label: string }[] = [
    { value: 'borrowable', label: 'Lend' },
    { value: 'discussable', label: 'Discuss' },
    { value: 'giftable', label: 'Gift' },
    { value: 'class-resource', label: 'Class' },
  ];

  let filters = $derived($activeFilters);
  let filteredBooks = $derived(
    Object.values($shelf).filter(book => bookMatchesFilters(book, filters))
  );
  let booksIHave = $derived(filteredBooks.filter(b => b.ownership === 'have'));
  let booksImSeeking = $derived(filteredBooks.filter(b => b.ownership === 'seeking'));
  let totalBooks = $derived(Object.values($shelf).length);
  let showClear = $derived(
    filters.visibility.length > 0 || filters.ownership.length > 0 || filters.intents.length > 0
  );

  let haveExpanded = $state(true);
  let seekingExpanded = $state(true);
</script>

<section class="shelf">
  <div class="header">
    <h2>Your Shelf ({totalBooks} books)</h2>
  </div>

  <div class="filter-groups">
    <div class="filter-row">
      <span class="filter-label">I...</span>
      <div class="filter-pills">
        <button
          class="pill ownership"
          class:active={filters.ownership.includes('have')}
          onclick={() => toggleOwnershipFilter('have')}
        >
          have
        </button>
        <button
          class="pill ownership"
          class:active={filters.ownership.includes('seeking')}
          onclick={() => toggleOwnershipFilter('seeking')}
        >
          am seeking
        </button>
      </div>
    </div>

    <div class="filter-row">
      <span class="filter-label">will...</span>
      <div class="filter-pills">
        {#each INTENT_OPTIONS as opt}
          <button
            class="pill intent"
            class:active={filters.intents.includes(opt.value)}
            onclick={() => toggleIntentFilter(opt.value)}
          >
            {opt.label}
          </button>
        {/each}
      </div>
    </div>

    <div class="filter-row">
      <span class="filter-label"></span>
      <div class="filter-pills">
        <button
          class="pill visibility"
          class:active={filters.visibility.includes('private')}
          onclick={() => toggleVisibilityFilter('private')}
        >
          Private only
        </button>
      </div>
      {#if showClear}
        <button class="clear-link" onclick={() => clearAllFilters()}>
          Clear filters
        </button>
      {/if}
    </div>
  </div>

  {#if filteredBooks.length === 0}
    <p class="empty">
      {#if totalBooks === 0}
        No books yet. Add your first book above.
      {:else}
        No books match this filter.
      {/if}
    </p>
  {:else}
    {#if booksIHave.length > 0}
      <section class="shelf-section">
        <button class="section-header" onclick={() => haveExpanded = !haveExpanded}>
          <span class="collapse-icon">{haveExpanded ? '▼' : '▶'}</span>
          <h3>Books I Have ({booksIHave.length})</h3>
        </button>
        {#if haveExpanded}
          <div class="grid">
            {#each booksIHave as book, i (book.id)}
              <div class="book-wrapper" style="animation-delay: {Math.min(i * 0.04, 0.3)}s">
                <BookCard
                  {book}
                  onIntentsChange={(intents) => updateBookIntents(book.id, intents)}
                />
              </div>
            {/each}
          </div>
        {/if}
      </section>
    {/if}

    {#if booksImSeeking.length > 0}
      <section class="shelf-section seeking">
        <button class="section-header" onclick={() => seekingExpanded = !seekingExpanded}>
          <span class="collapse-icon">{seekingExpanded ? '▼' : '▶'}</span>
          <h3>Books I'm Seeking ({booksImSeeking.length})</h3>
        </button>
        {#if seekingExpanded}
          <div class="grid">
            {#each booksImSeeking as book, i (book.id)}
              <div class="book-wrapper" style="animation-delay: {Math.min(i * 0.04, 0.3)}s">
                <BookCard
                  {book}
                  onIntentsChange={(intents) => updateBookIntents(book.id, intents)}
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
    margin-top: 2rem;
  }

  .header {
    margin-bottom: 1rem;
  }

  h2 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--color-ink);
  }

  /* Filter groups */
  .filter-groups {
    padding: 1rem;
    background: var(--color-cream);
    border: 1px solid var(--color-gold-pale);
    border-radius: var(--radius-md);
    margin-bottom: 1.5rem;
  }

  .filter-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .filter-row:last-child {
    margin-bottom: 0;
  }

  .filter-label {
    font-family: var(--font-body);
    font-size: 0.85rem;
    color: var(--color-ink-faded);
    min-width: 3rem;
  }

  .filter-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .pill {
    padding: 0.4rem 0.9rem;
    font-family: var(--font-display);
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--color-ink-faded);
    background: var(--color-paper);
    border: 1px solid var(--color-gold-pale);
    border-radius: 9999px;
    cursor: pointer;
    transition: all var(--transition-quick);
  }

  .pill:hover {
    border-color: var(--color-gold);
    color: var(--color-ink);
  }

  .pill.ownership.active {
    color: var(--color-cream);
    background: var(--color-forest);
    border-color: var(--color-forest-dark);
  }

  .pill.intent.active {
    color: var(--color-cream);
    background: var(--color-burgundy);
    border-color: var(--color-burgundy-dark);
  }

  .pill.visibility.active {
    color: var(--color-paper);
    background: var(--color-ink-faded);
    border-color: var(--color-ink);
  }

  .clear-link {
    margin-left: auto;
    padding: 0.25rem 0.5rem;
    font-family: var(--font-body);
    font-size: 0.8rem;
    color: var(--color-burgundy);
    background: transparent;
    border: none;
    cursor: pointer;
    text-decoration: underline;
    transition: color var(--transition-quick);
  }

  .clear-link:hover {
    color: var(--color-burgundy-dark);
  }

  /* Ownership sections */
  .shelf-section {
    margin-bottom: 2rem;
  }

  .shelf-section.seeking {
    border-left: 3px solid var(--color-burgundy);
    padding-left: 1rem;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.75rem 0;
    background: transparent;
    border: none;
    cursor: pointer;
    text-align: left;
    border-bottom: 1px solid var(--color-gold-pale);
    margin-bottom: 1rem;
    transition: opacity var(--transition-quick);
  }

  .section-header:hover {
    opacity: 0.8;
  }

  .collapse-icon {
    font-size: 0.75rem;
    color: var(--color-ink-faded);
    width: 1rem;
  }

  .section-header h3 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-ink);
  }

  .empty {
    padding: 3rem 2rem;
    text-align: center;
    font-family: var(--font-body);
    font-style: italic;
    color: var(--color-ink-faded);
    background: var(--color-cream);
    border: 1px dashed var(--color-gold-pale);
    border-radius: var(--radius-md);
    position: relative;
  }

  .empty::before {
    content: '📚';
    display: block;
    font-size: 2rem;
    margin-bottom: 0.75rem;
    opacity: 0.6;
  }

  .grid {
    display: grid;
    gap: 1.25rem;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }

  .book-wrapper {
    opacity: 0;
    animation: slideUp 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 600px) {
    .filter-row {
      flex-direction: column;
      align-items: flex-start;
    }

    .filter-label {
      margin-bottom: 0.25rem;
    }

    .clear-link {
      margin-left: 0;
      margin-top: 0.5rem;
    }
  }
</style>
