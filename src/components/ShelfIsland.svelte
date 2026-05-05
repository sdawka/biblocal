<script lang="ts">
  import { shelf, updateBookStatus, removeBook, activeFilter } from '../stores/shelf';
  import type { Book, BookStatus } from '../lib/types';
  import BookCard from './BookCard.svelte';

  const FILTER_OPTIONS: { value: BookStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'All books' },
    { value: 'borrowable', label: 'Will lend' },
    { value: 'discussable', label: 'Will discuss' },
    { value: 'seeking-home', label: 'Looking for' },
    { value: 'class-resource', label: 'Class resources' },
  ];

  let books = $state<Book[]>([]);
  let filter = $state<BookStatus | 'all'>('all');

  $effect(() => {
    const unsubShelf = shelf.subscribe((s) => {
      books = Object.values(s);
    });
    const unsubFilter = activeFilter.subscribe((f) => {
      filter = f;
    });
    return () => {
      unsubShelf();
      unsubFilter();
    };
  });

  let filteredBooks = $derived(
    filter === 'all' ? books : books.filter((b) => b.status === filter)
  );

  function handleStatusChange(id: string, status: BookStatus) {
    updateBookStatus(id, status);
  }

  function handleFilterChange(e: Event) {
    const select = e.target as HTMLSelectElement;
    activeFilter.set(select.value as BookStatus | 'all');
  }
</script>

<section class="shelf">
  <div class="header">
    <h2>Your Shelf ({books.length} books)</h2>
    <select value={filter} onchange={handleFilterChange}>
      {#each FILTER_OPTIONS as opt}
        <option value={opt.value}>{opt.label}</option>
      {/each}
    </select>
  </div>

  {#if filteredBooks.length === 0}
    <p class="empty">
      {#if books.length === 0}
        No books yet. Add your first book above.
      {:else}
        No books match this filter.
      {/if}
    </p>
  {:else}
    <div class="grid">
      {#each filteredBooks as book, i (book.id)}
        <div class="book-wrapper" style="animation-delay: {Math.min(i * 0.04, 0.3)}s">
          <BookCard
            {book}
            onStatusChange={(status) => handleStatusChange(book.id, status)}
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
    justify-content: space-between;
    align-items: center;
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

  select {
    padding: 0.5rem 2rem 0.5rem 0.75rem;
    font-family: var(--font-body);
    font-size: 0.9rem;
    color: var(--color-ink);
    background: var(--color-paper) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath fill='%236B5B4F' d='M5 7L1 3h8z'/%3E%3C/svg%3E") no-repeat right 0.75rem center;
    border: 1px solid var(--color-gold-pale);
    border-radius: var(--radius-sm);
    cursor: pointer;
    appearance: none;
    transition: all var(--transition-quick);
    box-shadow: var(--shadow-inset);
  }

  select:hover {
    border-color: var(--color-gold);
  }

  select:focus {
    outline: none;
    border-color: var(--color-gold);
    box-shadow: var(--shadow-inset), 0 0 0 3px rgba(184, 134, 11, 0.15);
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
