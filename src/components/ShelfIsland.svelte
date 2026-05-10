<script lang="ts">
  import { shelf, activeFilter, bookMatchesFilter, updateBookIntents, type ShelfFilter } from '../stores/shelf';
  import BookCard from './BookCard.svelte';
  import type { BookIntent } from '../lib/types';

  const FILTER_OPTIONS: { value: ShelfFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'lending', label: 'Lending' },
    { value: 'discussing', label: 'Discussing' },
    { value: 'gifting', label: 'Gifting' },
    { value: 'seeking', label: 'Seeking' },
    { value: 'private', label: 'Private' },
  ];

  let filter = $derived($activeFilter);
  let books = $derived(
    Object.values($shelf).filter(book => bookMatchesFilter(book, filter))
  );
  let totalBooks = $derived(Object.values($shelf).length);
</script>

<section class="shelf">
  <div class="header">
    <h2>Your Shelf ({totalBooks} books)</h2>
    <div class="filter-pills">
      {#each FILTER_OPTIONS as opt}
        <button
          class="filter-pill"
          class:active={filter === opt.value}
          onclick={() => activeFilter.set(opt.value)}
        >
          {opt.label}
        </button>
      {/each}
    </div>
  </div>

  {#if books.length === 0}
    <p class="empty">
      {#if totalBooks === 0}
        No books yet. Add your first book above.
      {:else}
        No books match this filter.
      {/if}
    </p>
  {:else}
    <div class="grid">
      {#each books as book, i (book.id)}
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

<style>
  .shelf {
    margin-top: 2rem;
  }

  .header {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--color-gold-pale);
    position: relative;
  }

  /* Subtle dot accent under header */
  .header::after {
    content: '';
    position: absolute;
    bottom: -4px;
    left: 50%;
    transform: translateX(-50%);
    width: 5px;
    height: 5px;
    background: var(--color-gold);
    border-radius: 50%;
    opacity: 0.4;
  }

  h2 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--color-ink);
  }

  .filter-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .filter-pill {
    padding: 0.4rem 0.9rem;
    font-family: var(--font-body);
    font-size: 0.85rem;
    color: var(--color-ink);
    background: var(--color-paper);
    border: 1px solid var(--color-gold-pale);
    border-radius: 9999px;
    cursor: pointer;
    transition: all var(--transition-quick);
  }

  .filter-pill:hover {
    border-color: var(--color-gold);
    background: var(--color-cream);
  }

  .filter-pill.active {
    background: var(--color-forest);
    color: var(--color-cream);
    border-color: var(--color-forest);
  }

  .filter-pill.active:hover {
    background: var(--color-forest-dark, #1a4a2e);
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
</style>
