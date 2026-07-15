<script lang="ts">
  import { onMount } from 'svelte';
  import BookCardShell from './BookCardShell.svelte';
  import BookDetail from './BookDetail.svelte';
  import { safeExternalUrl } from '../lib/url';
  import { useTranslations, type Lang } from '../i18n';
  import type { BookVisibility, BookOwnership, BookIntent } from '../lib/types';

  interface Props {
    storeId: string;
    lang?: Lang;
  }

  let { storeId, lang = 'en' as Lang }: Props = $props();
  const t = $derived(useTranslations(lang).stores);

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
    // Matches the shape actually returned by GET /api/stores/[id] — needed
    // for the readonly BookDetail badges (seeking / private / intents).
    visibility: BookVisibility;
    ownership: BookOwnership;
    intents: BookIntent[];
  }

  let store = $state<StoreData | null>(null);
  // Derived in script (not {@const}) so TS narrows the null check in the template.
  const websiteUrl = $derived(store ? safeExternalUrl(store.website) : null);
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
        const data: { error?: string } = await res.json();
        throw new Error(data.error || t.detail.errorLoadFailed);
      }
      const data: { store: StoreData; books: BookData[]; canEdit: boolean } = await res.json();
      store = data.store;
      books = data.books;
      canEdit = data.canEdit;
    } catch (e) {
      error = e instanceof Error ? e.message : t.detail.errorGeneric;
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
        const data: { error?: string } = await res.json();
        throw new Error(data.error || t.detail.errorAddBookFailed);
      }

      const data: { book: BookData } = await res.json();
      books = [...books, data.book];
      newBookTitle = '';
      newBookAuthor = '';
      newBookIsbn = '';
      showAddBook = false;
    } catch (e) {
      error = e instanceof Error ? e.message : t.detail.errorAddBookFailed;
    } finally {
      addingBook = false;
    }
  }
</script>

<div class="store-detail">
  {#if loading}
    <div class="loading muted">{t.detail.loading}</div>
  {:else if error}
    <div class="error">{error}</div>
  {:else if store}
    <header class="store-header">
      <div class="store-badge" aria-hidden="true">🏪</div>
      <div class="store-info">
        <span class="eyebrow">{t.detail.eyebrow}</span>
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
      {#if websiteUrl}
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
        <h3>{t.detail.specialtiesHeading}</h3>
        <div class="specialty-tags">
          {#each store.specialties as specialty}
            <span class="tag">{specialty.replace(/-/g, ' ')}</span>
          {/each}
        </div>
      </div>
    {/if}

    <section class="featured-shelf card">
      <div class="section-header">
        <h2>{t.detail.featuredHeading}</h2>
        {#if canEdit}
          <button class="btn btn-tinted btn-sm" onclick={() => showAddBook = !showAddBook}>
            {showAddBook ? t.detail.cancel : t.detail.addBook}
          </button>
        {/if}
      </div>

      {#if showAddBook}
        <div class="add-book-form">
          <input
            class="input"
            type="text"
            bind:value={newBookTitle}
            placeholder={t.detail.bookTitlePlaceholder}
            aria-label={t.detail.bookTitlePlaceholder}
            disabled={addingBook}
          />
          <input
            class="input"
            type="text"
            bind:value={newBookAuthor}
            placeholder={t.detail.authorPlaceholder}
            aria-label={t.detail.authorPlaceholder}
            disabled={addingBook}
          />
          <input
            class="input"
            type="text"
            bind:value={newBookIsbn}
            placeholder={t.detail.isbnPlaceholder}
            aria-label={t.detail.isbnPlaceholder}
            disabled={addingBook}
          />
          <button
            class="btn btn-filled"
            onclick={handleAddBook}
            disabled={addingBook || !newBookTitle.trim() || !newBookAuthor.trim()}
          >
            {addingBook ? t.detail.addingBook : t.detail.addToShelf}
          </button>
        </div>
      {/if}

      {#if books.length === 0}
        <p class="empty faint">{t.detail.emptyBooks}</p>
      {:else}
        <div class="books-grid">
          {#each books as book (book.id)}
            <!-- Read-only card: store pages show other people's books, so there
                 is no click-to-open detail sheet here (that contract belongs to
                 the owner-only Biblio shelf). -->
            <BookCardShell
              bookId={book.id}
              title={book.title}
              coverUrl={book.coverUrl}
              coverAlt="{book.title} cover"
              seeking={book.ownership === 'seeking'}
            >
              <BookDetail {book} {lang} readonly />
            </BookCardShell>
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

  /* BookCardShell owns the card surface; the readonly BookDetail inside it
     just needs to fill the remaining row space. */
  .books-grid :global(.book-detail) {
    flex: 1;
    min-width: 0;
  }
</style>
