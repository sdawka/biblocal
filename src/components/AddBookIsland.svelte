<script lang="ts">
  import { addBook } from '../stores/shelf';
  import { fetchByIsbn, isValidIsbn } from '../lib/openLibrary';
  import type { BookVisibility, BookOwnership, BookIntent } from '../lib/types';

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

  const INTENT_OPTIONS: { value: BookIntent; label: string }[] = [
    { value: 'borrowable', label: 'Lend' },
    { value: 'discussable', label: 'Discuss' },
    { value: 'giftable', label: 'Gift' },
    { value: 'class-resource', label: 'Class' },
  ];

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

<div class="add-book">
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
        <h3 class="preview-title">{previewBook.title}</h3>
        <p class="preview-author">{previewBook.author}</p>
      </div>
    </div>

    <div class="pill-section">
      <label class="pill-label">I...</label>
      <div class="pill-group">
        <button
          type="button"
          class="pill ownership"
          class:active={ownership === 'have'}
          onclick={() => ownership = 'have'}
        >
          have this
        </button>
        <button
          type="button"
          class="pill ownership"
          class:active={ownership === 'seeking'}
          onclick={() => ownership = 'seeking'}
        >
          am seeking
        </button>
      </div>
    </div>

    {#if ownership === 'have'}
      <div class="pill-section">
        <label class="pill-label">I will...</label>
        <div class="pill-group">
          {#each INTENT_OPTIONS as opt}
            <button
              type="button"
              class="pill intent"
              class:active={intents.includes(opt.value)}
              onclick={() => toggleIntent(opt.value)}
            >
              {opt.label}
            </button>
          {/each}
        </div>
      </div>
    {/if}

    <div class="pill-section">
      <div class="pill-group">
        <button
          type="button"
          class="pill visibility"
          class:active={visibility === 'private'}
          onclick={() => visibility = visibility === 'private' ? 'visible' : 'private'}
        >
          Private
        </button>
      </div>
    </div>

    <div class="preview-actions">
      <button type="button" class="btn-cancel" onclick={resetForm}>
        Cancel
      </button>
      <button type="button" class="btn-confirm" onclick={confirmAdd}>
        Add to Shelf
      </button>
    </div>
  {:else}
    <!-- Entry mode -->
    <div class="tabs">
      <button class:active={mode === 'isbn'} onclick={() => switchMode('isbn')}>
        ISBN Lookup
      </button>
      <button
        class:active={mode === 'manual'}
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
            📷
          </button>
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Looking up...' : 'Look Up Book'}
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
          type="text"
          bind:value={title}
          placeholder="Book title"
          aria-label="Book title"
          aria-invalid={error && mode === 'manual' && !title.trim() ? 'true' : undefined}
          aria-describedby={error && mode === 'manual' ? 'manual-error' : undefined}
        />
        <input
          type="text"
          bind:value={author}
          placeholder="Author"
          aria-label="Author name"
          aria-invalid={error && mode === 'manual' && !author.trim() ? 'true' : undefined}
          aria-describedby={error && mode === 'manual' ? 'manual-error' : undefined}
        />
        <button type="submit">Preview Book</button>
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
    padding: 1.25rem;
    background: var(--color-cream);
    border: 1px solid var(--color-gold-pale);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-card);
    position: relative;
    transition: box-shadow var(--transition-gentle);
  }

  .add-book:focus-within {
    box-shadow: var(--shadow-card), 0 0 0 2px rgba(184, 134, 11, 0.1);
  }

  /* Preview card styles */
  .preview-card {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    background: var(--color-paper);
    border: 1px solid var(--color-gold-pale);
    border-radius: var(--radius-sm);
    margin-bottom: 1.25rem;
  }

  .preview-cover {
    width: 80px;
    height: 120px;
    object-fit: cover;
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow-card);
  }

  .preview-cover.placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-gold-pale);
    color: var(--color-ink-light);
    font-size: 0.75rem;
    font-style: italic;
  }

  .preview-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .preview-title {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-ink);
    line-height: 1.3;
  }

  .preview-author {
    margin: 0.25rem 0 0;
    font-family: var(--font-body);
    font-size: 0.9rem;
    color: var(--color-ink-faded);
    font-style: italic;
  }

  /* Pill section styles */
  .pill-section {
    margin-bottom: 1rem;
  }

  .pill-label {
    display: block;
    font-family: var(--font-body);
    font-size: 0.85rem;
    color: var(--color-ink-faded);
    margin-bottom: 0.5rem;
  }

  .pill-group {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .pill {
    padding: 0.5rem 1rem;
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

  /* Preview actions */
  .preview-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 1.25rem;
    padding-top: 1rem;
    border-top: 1px solid var(--color-gold-pale);
  }

  .btn-cancel {
    flex: 1;
    padding: 0.75rem 1rem;
    font-family: var(--font-display);
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--color-ink-faded);
    background: var(--color-paper);
    border: 1px solid var(--color-gold-pale);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--transition-quick);
  }

  .btn-cancel:hover {
    border-color: var(--color-gold);
    color: var(--color-ink);
  }

  .btn-confirm {
    flex: 2;
    padding: 0.75rem 1.25rem;
    font-family: var(--font-display);
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--color-cream);
    background: linear-gradient(
      to bottom,
      var(--color-forest-light),
      var(--color-forest),
      var(--color-forest-dark)
    );
    border: 1px solid var(--color-forest-dark);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--transition-gentle);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.15),
      0 2px 4px rgba(44, 74, 57, 0.3);
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
  }

  .btn-confirm:hover {
    background: linear-gradient(
      to bottom,
      var(--color-forest),
      var(--color-forest-dark),
      #152218
    );
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.1),
      0 4px 8px rgba(44, 74, 57, 0.4);
    transform: translateY(-1px);
  }

  .btn-confirm:active {
    transform: translateY(0);
    box-shadow:
      inset 0 2px 4px rgba(0, 0, 0, 0.2),
      0 1px 2px rgba(44, 74, 57, 0.3);
  }

  /* Tabs and form styles */
  .tabs {
    display: flex;
    gap: 0.375rem;
    margin-bottom: 1.25rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--color-gold-pale);
  }

  .tabs button {
    flex: 1;
    padding: 0.625rem 1rem;
    font-family: var(--font-display);
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--color-ink-faded);
    background: var(--color-paper);
    border: 1px solid var(--color-gold-pale);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--transition-quick);
  }

  .tabs button:hover {
    border-color: var(--color-gold);
    color: var(--color-ink);
  }

  .tabs button.active {
    color: var(--color-ink);
    background: linear-gradient(
      to bottom,
      var(--color-gold-pale),
      var(--color-gold-light) 50%,
      var(--color-gold-pale)
    );
    border-color: var(--color-gold);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.4),
      0 1px 2px rgba(0, 0, 0, 0.1);
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
  }

  input {
    padding: 0.625rem 0.875rem;
    font-family: var(--font-body);
    font-size: 1rem;
    color: var(--color-ink);
    background: var(--color-paper);
    border: 1px solid var(--color-gold-pale);
    border-radius: var(--radius-sm);
    transition: all var(--transition-quick);
    box-shadow: var(--shadow-inset);
  }

  input::placeholder {
    color: var(--color-ink-light);
    font-style: italic;
  }

  input:focus {
    outline: none;
    border-color: var(--color-gold);
    box-shadow: var(--shadow-inset), 0 0 0 3px rgba(184, 134, 11, 0.15);
  }

  button[type='submit'] {
    padding: 0.75rem 1.25rem;
    font-family: var(--font-display);
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--color-cream);
    background: linear-gradient(
      to bottom,
      var(--color-forest-light),
      var(--color-forest),
      var(--color-forest-dark)
    );
    border: 1px solid var(--color-forest-dark);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--transition-gentle);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.15),
      0 2px 4px rgba(44, 74, 57, 0.3);
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
  }

  button[type='submit']:hover:not(:disabled) {
    background: linear-gradient(
      to bottom,
      var(--color-forest),
      var(--color-forest-dark),
      #152218
    );
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.1),
      0 4px 8px rgba(44, 74, 57, 0.4);
    transform: translateY(-1px);
  }

  button[type='submit']:active:not(:disabled) {
    transform: translateY(0);
    box-shadow:
      inset 0 2px 4px rgba(0, 0, 0, 0.2),
      0 1px 2px rgba(44, 74, 57, 0.3);
  }

  button[type='submit']:focus {
    outline: 2px solid var(--color-gold);
    outline-offset: 2px;
  }

  button[type='submit']:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .error {
    margin: 0.625rem 0 0;
    font-family: var(--font-body);
    font-size: 0.875rem;
    font-style: italic;
    color: var(--color-burgundy-dark);
  }

  .isbn-row {
    display: flex;
    gap: 0.5rem;
  }

  .isbn-row input {
    flex: 1;
  }

  .scan-btn {
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    background: var(--color-paper);
    border: 1px solid var(--color-gold-pale);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--transition-quick);
  }

  .scan-btn:hover {
    border-color: var(--color-gold);
    background: var(--color-gold-pale);
  }

  .scan-btn:focus {
    outline: 2px solid var(--color-gold);
    outline-offset: 2px;
  }
</style>
