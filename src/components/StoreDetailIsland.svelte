<script lang="ts">
  import { onMount } from 'svelte';
  import BookCard from './BookCard.svelte';

  interface Props {
    storeId: string;
  }

  let { storeId }: Props = $props();

  interface StoreData {
    id: string;
    name: string;
    neighborhood?: string;
    address?: string;
    website?: string;
    phone?: string;
    specialties?: string[];
  }

  interface BookData {
    id: string;
    title: string;
    author: string;
    coverUrl?: string;
    status: string;
  }

  let store = $state<StoreData | null>(null);
  let books = $state<BookData[]>([]);
  let canEdit = $state(false);
  let loading = $state(true);
  let error = $state('');

  let showAddBook = $state(false);
  let newBookTitle = $state('');
  let newBookAuthor = $state('');
  let newBookIsbn = $state('');
  let addingBook = $state(false);

  onMount(async () => {
    try {
      const res = await fetch(`/api/stores/${storeId}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to load store');
      }
      const data = await res.json();
      store = data.store;
      books = data.books;
      canEdit = data.canEdit;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Something went wrong';
    } finally {
      loading = false;
    }
  });

  async function handleAddBook() {
    if (!newBookTitle.trim() || !newBookAuthor.trim()) {
      return;
    }

    addingBook = true;
    try {
      const res = await fetch(`/api/stores/${storeId}/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newBookTitle.trim(),
          author: newBookAuthor.trim(),
          isbn: newBookIsbn.trim() || undefined,
          status: 'visible',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add book');
      }

      const data = await res.json();
      books = [...books, data.book];
      newBookTitle = '';
      newBookAuthor = '';
      newBookIsbn = '';
      showAddBook = false;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to add book';
    } finally {
      addingBook = false;
    }
  }
</script>

<div class="store-detail">
  {#if loading}
    <div class="loading">Loading store...</div>
  {:else if error}
    <div class="error">{error}</div>
  {:else if store}
    <header class="store-header">
      <div class="store-badge">🏪</div>
      <div class="store-info">
        <h1>{store.name}</h1>
        {#if store.neighborhood}
          <p class="neighborhood">{store.neighborhood}</p>
        {/if}
      </div>
    </header>

    <div class="store-meta">
      {#if store.address}
        <p class="address">📍 {store.address}</p>
      {/if}
      {#if store.website}
        <p class="website">
          <a href={store.website} target="_blank" rel="noopener">
            {store.website.replace(/^https?:\/\//, '')} →
          </a>
        </p>
      {/if}
      {#if store.phone}
        <p class="phone">📞 {store.phone}</p>
      {/if}
    </div>

    {#if store.specialties && store.specialties.length > 0}
      <div class="specialties">
        <h3>Specialties</h3>
        <div class="specialty-tags">
          {#each store.specialties as specialty}
            <span class="tag">{specialty.replace(/-/g, ' ')}</span>
          {/each}
        </div>
      </div>
    {/if}

    <section class="featured-shelf">
      <div class="section-header">
        <h2>Featured Books</h2>
        {#if canEdit}
          <button class="add-btn" onclick={() => showAddBook = !showAddBook}>
            {showAddBook ? 'Cancel' : '+ Add book'}
          </button>
        {/if}
      </div>

      {#if showAddBook}
        <div class="add-book-form">
          <input
            type="text"
            bind:value={newBookTitle}
            placeholder="Book title"
            disabled={addingBook}
          />
          <input
            type="text"
            bind:value={newBookAuthor}
            placeholder="Author"
            disabled={addingBook}
          />
          <input
            type="text"
            bind:value={newBookIsbn}
            placeholder="ISBN (optional)"
            disabled={addingBook}
          />
          <button
            class="submit-btn"
            onclick={handleAddBook}
            disabled={addingBook || !newBookTitle.trim() || !newBookAuthor.trim()}
          >
            {addingBook ? 'Adding...' : 'Add to shelf'}
          </button>
        </div>
      {/if}

      {#if books.length === 0}
        <p class="empty">No featured books yet.</p>
      {:else}
        <div class="books-grid">
          {#each books as book (book.id)}
            <BookCard {book} />
          {/each}
        </div>
      {/if}
    </section>
  {/if}
</div>

<style>
  .store-detail {
    max-width: 800px;
    margin: 0 auto;
  }

  .loading,
  .error {
    padding: 2rem;
    text-align: center;
    font-family: var(--font-body);
    color: var(--color-ink-faded);
  }

  .error {
    color: #8B2500;
  }

  .store-header {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .store-badge {
    font-size: 2.5rem;
    line-height: 1;
  }

  .store-info h1 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 2rem;
    color: var(--color-ink);
  }

  .neighborhood {
    margin: 0.25rem 0 0;
    font-family: var(--font-body);
    font-size: 1rem;
    color: var(--color-ink-faded);
    font-style: italic;
  }

  .store-meta {
    padding: 1rem 1.25rem;
    background: var(--color-paper);
    border: 1px solid var(--color-gold-pale);
    border-radius: var(--radius-md);
    margin-bottom: 1.5rem;
  }

  .store-meta p {
    margin: 0.375rem 0;
    font-family: var(--font-body);
    font-size: 0.9rem;
    color: var(--color-ink-faded);
  }

  .store-meta a {
    color: var(--color-burgundy, #722f37);
    text-decoration: none;
  }

  .store-meta a:hover {
    text-decoration: underline;
  }

  .specialties {
    margin-bottom: 2rem;
  }

  .specialties h3 {
    margin: 0 0 0.75rem;
    font-family: var(--font-display);
    font-size: 1rem;
    color: var(--color-ink);
  }

  .specialty-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }

  .tag {
    padding: 0.25rem 0.5rem;
    font-family: var(--font-body);
    font-size: 0.8rem;
    color: var(--color-cream);
    background: var(--color-burgundy, #722f37);
    border-radius: 2px;
  }

  .featured-shelf {
    background: var(--color-cream);
    border: 1px solid var(--color-gold-pale);
    border-radius: var(--radius-md);
    padding: 1.5rem;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--color-gold-pale);
  }

  .section-header h2 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.25rem;
    color: var(--color-ink);
  }

  .add-btn {
    padding: 0.375rem 0.75rem;
    font-family: var(--font-body);
    font-size: 0.85rem;
    color: var(--color-burgundy, #722f37);
    background: transparent;
    border: 1px solid var(--color-burgundy, #722f37);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--transition-quick);
  }

  .add-btn:hover {
    background: var(--color-burgundy, #722f37);
    color: var(--color-cream);
  }

  .add-book-form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem;
    margin-bottom: 1rem;
    background: var(--color-paper);
    border: 1px dashed var(--color-gold-pale);
    border-radius: var(--radius-sm);
  }

  .add-book-form input {
    padding: 0.5rem 0.75rem;
    font-family: var(--font-body);
    font-size: 0.9rem;
    border: 1px solid var(--color-gold-pale);
    border-radius: var(--radius-sm);
  }

  .add-book-form input:focus {
    outline: none;
    border-color: var(--color-gold);
  }

  .submit-btn {
    padding: 0.5rem 1rem;
    font-family: var(--font-display);
    font-size: 0.9rem;
    color: var(--color-cream);
    background: var(--color-burgundy, #722f37);
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
  }

  .submit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .empty {
    padding: 2rem;
    text-align: center;
    font-family: var(--font-body);
    font-style: italic;
    color: var(--color-ink-faded);
  }

  .books-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 1rem;
  }
</style>
