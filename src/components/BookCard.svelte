<script lang="ts">
  import type { Book, BookStatus } from '../lib/types';

  interface Props {
    book: Book;
    onStatusChange?: (status: BookStatus) => void;
    readonly?: boolean;
  }

  let { book, onStatusChange, readonly = false }: Props = $props();

  const STATUS_LABELS: Record<BookStatus, string> = {
    private: 'Private',
    visible: 'Visible',
    borrowable: 'Will lend',
    discussable: 'Will discuss',
    giftable: 'Free to good home',
    'class-resource': 'Class resource',
    'seeking-home': 'Looking for this',
  };

  function handleStatusChange(e: Event) {
    const select = e.target as HTMLSelectElement;
    onStatusChange?.(select.value as BookStatus);
  }
</script>

<article class="book-card">
  {#if book.coverUrl}
    <img src={book.coverUrl} alt="{book.title} cover" class="cover" />
  {:else}
    <div class="cover placeholder">
      <span>{book.title.charAt(0)}</span>
    </div>
  {/if}

  <div class="info">
    <h3 class="title">{book.title}</h3>
    <p class="author">{book.author}</p>

    {#if readonly}
      <span class="status-badge">{STATUS_LABELS[book.status]}</span>
    {:else}
      <select value={book.status} onchange={handleStatusChange}>
        {#each Object.entries(STATUS_LABELS) as [value, label]}
          <option {value}>{label}</option>
        {/each}
      </select>
    {/if}

    {#if book.addedVia === 'scan'}
      <span class="verified" title="Added via ISBN scan">✓</span>
    {/if}
  </div>
</article>

<style>
  .book-card {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background: white;
  }

  .cover {
    width: 60px;
    height: 90px;
    object-fit: cover;
    border-radius: 4px;
    flex-shrink: 0;
  }

  .cover.placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f0f0f0;
    font-size: 1.5rem;
    color: #666;
  }

  .info {
    flex: 1;
    min-width: 0;
  }

  .title {
    margin: 0 0 0.25rem;
    font-size: 1rem;
    font-weight: 600;
  }

  .author {
    margin: 0 0 0.5rem;
    font-size: 0.875rem;
    color: #666;
  }

  select {
    padding: 0.25rem 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 0.875rem;
  }

  .status-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    background: #e8f4f8;
    border-radius: 4px;
    font-size: 0.75rem;
    color: #0066cc;
  }

  .verified {
    margin-left: 0.5rem;
    color: #22c55e;
  }
</style>
