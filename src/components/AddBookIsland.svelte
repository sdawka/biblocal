<script lang="ts">
  import { addBook, findDuplicate } from '../stores/shelf';
  import { fetchByIsbn, isValidIsbn } from '../lib/openLibrary';
  import type { Book, BookVisibility, BookOwnership, BookIntent } from '../lib/types';
  import { INTENT_OPTIONS, INTENT_PROMPT } from '../lib/intents';

  let ScannerComponent: typeof import('./ScannerIsland.svelte').default | null = $state(null);

  type Mode = 'isbn' | 'manual';

  let mode: Mode = $state('isbn');
  let isbn = $state('');
  let title = $state('');
  let author = $state('');
  let loading = $state(false);
  let error = $state('');
  let showScanner = $state(false);

  // New three-dimension model state
  let visibility: BookVisibility = $state('visible');
  let ownership: BookOwnership = $state('have');
  let intents: BookIntent[] = $state([]);
  let previewBook: { title: string; author: string; coverUrl?: string; isbn?: string; subjects?: string[] } | null = $state(null);
  let duplicateBook: Book | null = $state(null);

  function toggleIntent(intent: BookIntent) {
    if (intents.includes(intent)) {
      intents = intents.filter(i => i !== intent);
    } else {
      intents = [...intents, intent];
    }
  }

  function resetForm() {
    isbn = '';
    title = '';
    author = '';
    error = '';
    visibility = 'visible';
    ownership = 'have';
    intents = [];
    previewBook = null;
    duplicateBook = null;
    mode = 'isbn';
  }

  async function handleIsbnSubmit() {
    if (!isValidIsbn(isbn)) {
      error = 'Please enter a valid 10 or 13 digit ISBN';
      return;
    }

    loading = true;
    error = '';

    const bookData = await fetchByIsbn(isbn);

    if (bookData) {
      previewBook = {
        title: bookData.title,
        author: bookData.author,
        coverUrl: bookData.coverUrl,
        isbn: bookData.isbn,
        subjects: bookData.subjects,
      };
    } else {
      error = 'Book not found. Try manual entry.';
      title = '';
      author = '';
      mode = 'manual';
    }

    loading = false;
  }

  function handleManualSubmit() {
    if (!title.trim() || !author.trim()) {
      error = 'Title and author are required';
      return;
    }

    previewBook = {
      title: title.trim(),
      author: author.trim(),
    };
  }

  function confirmAdd() {
    if (!previewBook) return;

    // Check for duplicate
    const existing = findDuplicate(previewBook.isbn, previewBook.title, previewBook.author);
    if (existing) {
      duplicateBook = existing;
      return;
    }

    doAdd();
  }

  function doAdd() {
    if (!previewBook) return;

    addBook({
      title: previewBook.title,
      author: previewBook.author,
      isbn: previewBook.isbn,
      coverUrl: previewBook.coverUrl,
      subjects: previewBook.subjects,
      visibility,
      ownership,
      intents,
      addedVia: previewBook.isbn ? 'scan' : 'manual',
    });

    resetForm();
  }

  function addAnyway() {
    duplicateBook = null;
    doAdd();
  }

  function viewExisting() {
    if (!duplicateBook) return;
    const bookId = duplicateBook.id;
    resetForm();

    // Scroll to and highlight the existing book
    setTimeout(() => {
      const card = document.querySelector(`[data-book-id="${bookId}"]`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('highlight-pulse');
        setTimeout(() => card.classList.remove('highlight-pulse'), 1000);
      }
    }, 100);
  }

  function switchMode(newMode: Mode) {
    mode = newMode;
    error = '';
  }

  function handleScanResult(scannedIsbn: string) {
    isbn = scannedIsbn;
    showScanner = false;
    handleIsbnSubmit();
  }

  async function openScanner() {
    if (!ScannerComponent) {
      const mod = await import('./ScannerIsland.svelte');
      ScannerComponent = mod.default;
    }
    showScanner = true;
  }

  function closeScanner() {
    showScanner = false;
  }
</script>

<div class="add-book card">
  {#if previewBook}
    <!-- Preview mode -->
    <div class="preview-card">
      {#if previewBook.coverUrl}
        <img src={previewBook.coverUrl} alt={previewBook.title} class="preview-cover" />
      {:else}
        <div class="preview-cover placeholder">
          <span>No Cover</span>
        </div>
      {/if}
      <div class="preview-info">
        <h3 class="preview-title serif">{previewBook.title}</h3>
        <p class="preview-author muted">{previewBook.author}</p>
      </div>
    </div>

    <div class="pill-section">
      <span class="label">I…</span>
      <div class="segmented" role="group" aria-label="Ownership">
        <button
          type="button"
          aria-pressed={ownership === 'have'}
          onclick={() => ownership = 'have'}
        >
          have this
        </button>
        <button
          type="button"
          aria-pressed={ownership === 'seeking'}
          onclick={() => ownership = 'seeking'}
        >
          am seeking
        </button>
      </div>
    </div>

    {#if ownership === 'have'}
      <div class="pill-section">
        <span class="label">{INTENT_PROMPT}</span>
        <div class="segmented" role="group" aria-label="Intent">
          {#each INTENT_OPTIONS as opt}
            <button
              type="button"
              aria-pressed={intents.includes(opt.value)}
              onclick={() => toggleIntent(opt.value)}
            >
              {opt.label}
            </button>
          {/each}
        </div>
      </div>
    {/if}

    <div class="pill-section">
      <div class="segmented" role="group" aria-label="Visibility">
        <button
          type="button"
          aria-pressed={visibility === 'private'}
          onclick={() => visibility = visibility === 'private' ? 'visible' : 'private'}
        >
          Private
        </button>
      </div>
    </div>

    <div class="preview-actions">
      <button type="button" class="btn btn-outline" onclick={resetForm}>
        Cancel
      </button>
      <button type="button" class="btn btn-filled btn-confirm" onclick={confirmAdd}>
        Add to Shelf
      </button>
    </div>

    {#if duplicateBook}
      <div class="duplicate-warning">
        <p>You already have <strong>{duplicateBook.title}</strong> on your shelf.</p>
        <div class="duplicate-actions">
          <button type="button" class="btn btn-outline btn-sm" onclick={viewExisting}>
            View Existing
          </button>
          <button type="button" class="btn btn-tinted btn-sm" onclick={addAnyway}>
            Add Anyway
          </button>
        </div>
      </div>
    {/if}
  {:else}
    <!-- Entry mode -->
    <div class="segmented tabs" role="group" aria-label="Add method">
      <button aria-pressed={mode === 'isbn'} onclick={() => switchMode('isbn')}>
        ISBN Lookup
      </button>
      <button
        aria-pressed={mode === 'manual'}
        onclick={() => switchMode('manual')}
      >
        Manual Entry
      </button>
    </div>

    {#if mode === 'isbn'}
      <form
        onsubmit={(e) => {
          e.preventDefault();
          handleIsbnSubmit();
        }}
      >
        <div class="isbn-row">
          <input
            class="input"
            type="text"
            bind:value={isbn}
            placeholder="Enter ISBN (e.g., 9780465026562)"
            disabled={loading}
            aria-invalid={error && mode === 'isbn' ? 'true' : undefined}
            aria-describedby={error && mode === 'isbn' ? 'isbn-error' : undefined}
          />
          <button
            type="button"
            class="scan-btn"
            onclick={openScanner}
            aria-label="Scan ISBN barcode with camera"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M14.5 4h2A1.5 1.5 0 0 1 18 5.5l1 1.5h1.5A1.5 1.5 0 0 1 22 8.5v9A1.5 1.5 0 0 1 20.5 19h-17A1.5 1.5 0 0 1 2 17.5v-9A1.5 1.5 0 0 1 3.5 7H5l1-1.5A1.5 1.5 0 0 1 7.5 4h2" />
              <circle cx="12" cy="12.5" r="3.5" />
            </svg>
          </button>
        </div>
        <button type="submit" class="btn btn-filled" disabled={loading}>
          {loading ? 'Looking up…' : 'Look Up Book'}
        </button>
      </form>
    {:else}
      <form
        onsubmit={(e) => {
          e.preventDefault();
          handleManualSubmit();
        }}
      >
        <input
          class="input"
          type="text"
          bind:value={title}
          placeholder="Book title"
          aria-label="Book title"
          aria-invalid={error && mode === 'manual' && !title.trim() ? 'true' : undefined}
          aria-describedby={error && mode === 'manual' ? 'manual-error' : undefined}
        />
        <input
          class="input"
          type="text"
          bind:value={author}
          placeholder="Author"
          aria-label="Author name"
          aria-invalid={error && mode === 'manual' && !author.trim() ? 'true' : undefined}
          aria-describedby={error && mode === 'manual' ? 'manual-error' : undefined}
        />
        <button type="submit" class="btn btn-filled">Preview Book</button>
      </form>
    {/if}

    {#if error}
      <p class="error" id={mode === 'isbn' ? 'isbn-error' : 'manual-error'} role="alert">{error}</p>
    {/if}
  {/if}

  {#if showScanner && ScannerComponent}
    <ScannerComponent onScan={handleScanResult} onClose={closeScanner} />
  {/if}
</div>

<style>
  .add-book {
    position: relative;
  }

  .add-book:focus-within {
    border-color: var(--hairline-strong);
  }

  /* Preview card styles */
  .preview-card {
    display: flex;
    gap: var(--s-4);
    padding: var(--s-4);
    background: var(--surface-sunken);
    border: 1px solid var(--hairline);
    border-radius: var(--r-md);
    margin-bottom: var(--s-5);
  }

  .preview-cover {
    width: 80px;
    height: 120px;
    object-fit: cover;
    border-radius: var(--r-sm);
    box-shadow: var(--shadow-2);
  }

  .preview-cover.placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--accent-tint);
    color: var(--accent);
    font-size: 0.75rem;
  }

  .preview-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .preview-title {
    margin: 0;
    font-size: 1.1875rem;
    font-weight: 500;
    color: var(--ink);
    line-height: 1.3;
    letter-spacing: -0.01em;
  }

  .preview-author {
    margin: var(--s-1) 0 0;
    font-size: 0.9rem;
  }

  /* Pill (segmented) section styles */
  .pill-section {
    margin-bottom: var(--s-4);
  }

  .pill-section .label {
    margin-bottom: var(--s-2);
  }

  .segmented {
    flex-wrap: wrap;
  }

  /* Preview actions */
  .preview-actions {
    display: flex;
    gap: var(--s-3);
    margin-top: var(--s-5);
    padding-top: var(--s-4);
    border-top: 1px solid var(--hairline);
  }

  .preview-actions .btn-outline {
    flex: 1;
  }

  .btn-confirm {
    flex: 2;
  }

  /* Tabs */
  .tabs {
    display: flex;
    margin-bottom: var(--s-5);
  }

  .tabs button {
    flex: 1;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: var(--s-3);
  }

  .error {
    margin: var(--s-3) 0 0;
    font-size: 0.875rem;
    color: var(--danger);
  }

  .isbn-row {
    display: flex;
    gap: var(--s-2);
  }

  .isbn-row .input {
    flex: 1;
  }

  .scan-btn {
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--ink-muted);
    background: var(--surface);
    border: 1px solid var(--hairline-strong);
    border-radius: var(--r-md);
    cursor: pointer;
    transition: color var(--dur-1) var(--ease-soft), border-color var(--dur-1) var(--ease-soft), background var(--dur-2) var(--ease-out);
  }

  .scan-btn:hover {
    color: var(--accent);
    border-color: var(--accent);
    background: var(--accent-tint);
  }

  .duplicate-warning {
    margin-top: var(--s-4);
    padding: var(--s-4);
    background: var(--accent-tint);
    border: 1px solid var(--accent);
    border-radius: var(--r-md);
  }

  .duplicate-warning p {
    margin: 0 0 var(--s-3);
    font-size: 0.9rem;
    color: var(--ink);
  }

  .duplicate-warning strong {
    font-weight: 600;
  }

  .duplicate-actions {
    display: flex;
    gap: var(--s-2);
  }

  .duplicate-actions .btn {
    flex: 1;
  }
</style>
