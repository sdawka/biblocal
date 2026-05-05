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
      {#each filteredBooks as book (book.id)}
        <BookCard
          {book}
          onStatusChange={(status) => handleStatusChange(book.id, status)}
        />
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
    margin-bottom: 1rem;
  }

  h2 {
    margin: 0;
    font-size: 1.25rem;
  }

  select {
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
  }

  .empty {
    padding: 2rem;
    text-align: center;
    color: #666;
    background: #f5f5f5;
    border-radius: 8px;
  }

  .grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }
</style>
