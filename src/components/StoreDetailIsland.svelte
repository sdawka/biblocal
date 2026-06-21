<script lang="ts">
  import { onMount } from 'svelte';
  import BookCard from './BookCard.svelte';
  import { safeExternalUrl } from '../lib/url';

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
    <div class="loading muted">Loading store...</div>
  {:else if error}
    <div class="error">{error}</div>
  {:else if store}
    <header class="store-header">
      <div class="store-badge" aria-hidden="true">🏪</div>
      <div class="store-info">
        <span class="eyebrow">Bookstore</span>
        <h1 class="serif">{store.name}</h1>
        {#if store.neighborhood}
          <p class="neighborhood">{store.neighborhood}</p>
        {/if}
      </div>
    </header>

    <div class="store-meta card">
      {#if store.address}
        <p class="address muted">📍 {store.address}</p>
      {/if}
      {#if safeExternalUrl(store.website)}
        {@const websiteUrl = safeExternalUrl(store.website)}
        <p class="website">
          <a href={websiteUrl} target="_blank" rel="noopener noreferrer">
            {websiteUrl.replace(/^https?:\/\//, '')} →
          </a>
        </p>
      {/if}
      {#if store.phone}
        <p class="phone muted">📞 {store.phone}</p>
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

    <section class="featured-shelf card">
      <div class="section-header">
        <h2>Featured Books</h2>
        {#if canEdit}
          <button class="btn btn-tinted btn-sm" onclick={() => showAddBook = !showAddBook}>
            {showAddBook ? 'Cancel' : '+ Add book'}
          </button>
        {/if}
      </div>

      {#if showAddBook}
        <div class="add-book-form">
          <input
            class="input"
            type="text"
            bind:value={newBookTitle}
            placeholder="Book title"
            aria-label="Book title"
            disabled={addingBook}
          />
          <input
            class="input"
            type="text"
            bind:value={newBookAuthor}
            placeholder="Author"
            aria-label="Author"
            disabled={addingBook}
          />
          <input
            class="input"
            type="text"
            bind:value={newBookIsbn}
            placeholder="ISBN (optional)"
            aria-label="ISBN (optional)"
            disabled={addingBook}
          />
          <button
            class="btn btn-filled"
            onclick={handleAddBook}
            disabled={addingBook || !newBookTitle.trim() || !newBookAuthor.trim()}
          >
            {addingBook ? 'Adding...' : 'Add to shelf'}
          </button>
        </div>
      {/if}

      {#if books.length === 0}
        <p class="empty faint">No featured books yet.</p>
      {:else}
        <div class="books-grid">
          {#each books as book (book.id)}
            <BookCard {book} readonly />
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
    padding: var(--s-6);
    text-align: center;
    font-family: var(--font-ui);
  }

  .error {
    color: var(--danger);
  }

  .store-header {
    display: flex;
    align-items: flex-start;
    gap: var(--s-4);
    margin-bottom: var(--s-5);
  }

  .store-badge {
    font-size: 2.5rem;
    line-height: 1;
  }

  .store-info h1 {
    margin: var(--s-1) 0 0;
    font-size: 2rem;
  }

  .neighborhood {
    margin: var(--s-1) 0 0;
    font-family: var(--font-ui);
    font-size: 1rem;
    font-weight: 540;
    color: var(--accent);
  }

  .store-meta {
    padding: var(--s-4) var(--s-5);
    margin-bottom: var(--s-5);
  }

  .store-meta p {
    margin: var(--s-2) 0;
    font-family: var(--font-ui);
    font-size: 0.9rem;
  }

  .store-meta p:first-child { margin-top: 0; }
  .store-meta p:last-child { margin-bottom: 0; }

  .store-meta a {
    color: var(--accent);
    text-decoration: none;
    font-weight: 540;
    transition: color var(--dur-1) var(--ease-soft);
  }

  .store-meta a:hover {
    color: var(--accent-hover);
  }

  .specialties {
    margin-bottom: var(--s-6);
  }

  .specialties h3 {
    margin: 0 0 var(--s-3);
    font-family: var(--font-ui);
    font-size: 0.8125rem;
    font-weight: 640;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-muted);
  }

  .specialty-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s-2);
  }

  .tag {
    padding: 0.2rem 0.6rem;
    font-family: var(--font-ui);
    font-size: 0.8rem;
    font-weight: 540;
    color: var(--accent);
    background: var(--accent-tint);
    border-radius: var(--r-full);
  }

  .featured-shelf {
    padding: var(--s-5);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--s-4);
    padding-bottom: var(--s-3);
    border-bottom: 1px solid var(--hairline);
  }

  .section-header h2 {
    margin: 0;
    font-size: 1.25rem;
  }

  .add-book-form {
    display: flex;
    flex-direction: column;
    gap: var(--s-3);
    padding: var(--s-4);
    margin-bottom: var(--s-4);
    background: var(--surface-sunken);
    border: 1px solid var(--hairline);
    border-radius: var(--r-md);
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .empty {
    padding: var(--s-6);
    text-align: center;
    font-family: var(--font-ui);
  }

  .books-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: var(--s-4);
  }
</style>
