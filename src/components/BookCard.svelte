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
    background: var(--color-cream);
    border: 1px solid var(--color-gold-pale);
    border-radius: var(--radius-md);
    position: relative;
    box-shadow: var(--shadow-card);
    transition: all var(--transition-gentle);
  }

  /* Subtle corner dots */
  .book-card::before,
  .book-card::after {
    content: '';
    position: absolute;
    width: 3px;
    height: 3px;
    background: var(--color-gold);
    border-radius: 50%;
    opacity: 0.25;
    transition: opacity var(--transition-gentle);
  }

  .book-card::before {
    top: 6px;
    left: 6px;
  }

  .book-card::after {
    bottom: 6px;
    right: 6px;
  }

  .book-card:hover {
    box-shadow: var(--shadow-lifted);
    transform: translateY(-2px);
    border-color: var(--color-gold);
  }

  .book-card:hover::before,
  .book-card:hover::after {
    opacity: 0.5;
  }

  .cover {
    width: 60px;
    height: 90px;
    object-fit: cover;
    border-radius: 2px;
    flex-shrink: 0;
    box-shadow: 2px 2px 6px rgba(44, 24, 16, 0.2);
  }

  .cover.placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(
      to bottom,
      var(--color-mahogany-light),
      var(--color-mahogany)
    );
    font-family: var(--font-display);
    font-size: 1.75rem;
    font-weight: 600;
    font-style: italic;
    color: var(--color-gold);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }

  .info {
    flex: 1;
    min-width: 0;
  }

  .title {
    margin: 0 0 0.25rem;
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-ink);
    line-height: 1.3;
  }

  .author {
    margin: 0 0 0.625rem;
    font-family: var(--font-body);
    font-size: 0.875rem;
    font-style: italic;
    color: var(--color-ink-faded);
  }

  select {
    padding: 0.3rem 1.75rem 0.3rem 0.5rem;
    font-family: var(--font-body);
    font-size: 0.8rem;
    color: var(--color-ink);
    background: var(--color-paper) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath fill='%236B5B4F' d='M5 7L1 3h8z'/%3E%3C/svg%3E") no-repeat right 0.5rem center;
    border: 1px solid var(--color-gold-pale);
    border-radius: 2px;
    cursor: pointer;
    appearance: none;
    transition: all var(--transition-quick);
  }

  select:hover {
    border-color: var(--color-gold);
  }

  select:focus {
    outline: none;
    border-color: var(--color-gold);
    box-shadow: 0 0 0 2px rgba(184, 134, 11, 0.2);
  }

  .status-badge {
    display: inline-block;
    padding: 0.2rem 0.5rem;
    font-family: var(--font-display);
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--color-cream);
    background: var(--color-burgundy);
    border-radius: 2px;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.1),
      0 1px 2px rgba(0, 0, 0, 0.15);
  }

  .verified {
    margin-left: 0.5rem;
    color: var(--color-forest);
    font-size: 0.9rem;
  }
</style>
