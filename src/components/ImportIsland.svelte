<script lang="ts">
  import { parseGoodreadsCSV, parsedBookToBook, type ParsedBook } from '../lib/goodreads-import';
  import { loadBooksFromServer } from '../stores/shelf';

  type Step = 'upload' | 'preview' | 'importing' | 'done';

  let step: Step = $state('upload');
  let parsedBooks: ParsedBook[] = $state([]);
  let selectedIds: Set<number> = $state(new Set());
  let parseErrors: Array<{ row: number; message: string }> = $state([]);
  let importProgress = $state(0);
  let importResult: { imported: number; skipped: number; errors: string[] } | null = $state(null);
  let error = $state('');

  function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    error = '';
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const result = parseGoodreadsCSV(content);
      parsedBooks = result.books;
      parseErrors = result.errors;
      selectedIds = new Set(result.books.map((_, i) => i));
      step = 'preview';
    };
    reader.onerror = () => {
      error = 'Failed to read file';
    };
    reader.readAsText(file);
  }

  function toggleBook(index: number) {
    const newSet = new Set(selectedIds);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    selectedIds = newSet;
  }

  function selectAll() {
    selectedIds = new Set(parsedBooks.map((_, i) => i));
  }

  function selectNone() {
    selectedIds = new Set();
  }

  async function startImport() {
    const booksToImport = parsedBooks
      .filter((_, i) => selectedIds.has(i))
      .map(parsedBookToBook);

    if (booksToImport.length === 0) {
      error = 'No books selected';
      return;
    }

    step = 'importing';
    importProgress = 0;

    try {
      const res = await fetch('/api/books/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ books: booksToImport }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Import failed');
      }

      importResult = await res.json();
      await loadBooksFromServer();
      step = 'done';
    } catch (e) {
      error = e instanceof Error ? e.message : 'Import failed';
      step = 'preview';
    }
  }

  function reset() {
    step = 'upload';
    parsedBooks = [];
    selectedIds = new Set();
    parseErrors = [];
    importProgress = 0;
    importResult = null;
    error = '';
  }

  function ownershipLabel(ownership: string): string {
    return ownership === 'seeking' ? 'Seeking' : 'Have';
  }
</script>

<div class="import-container">
  {#if step === 'upload'}
    <div class="upload-section">
      <h3>Import from Goodreads</h3>
      <p class="instructions">
        Export your library from Goodreads (My Books &rarr; Import/Export &rarr; Export Library),
        then upload the CSV file here.
      </p>
      <label class="file-input">
        <input type="file" accept=".csv" onchange={handleFileSelect} />
        <span class="file-btn">Choose CSV File</span>
      </label>
      {#if error}
        <p class="error">{error}</p>
      {/if}
    </div>

  {:else if step === 'preview'}
    <div class="preview-section">
      <div class="preview-header">
        <h3>{parsedBooks.length} books found</h3>
        <div class="select-actions">
          <button type="button" class="link-btn" onclick={selectAll}>Select all</button>
          <button type="button" class="link-btn" onclick={selectNone}>Select none</button>
        </div>
      </div>

      {#if parseErrors.length > 0}
        <div class="parse-warnings">
          {parseErrors.length} rows had issues and were skipped
        </div>
      {/if}

      <div class="book-list">
        {#each parsedBooks as book, i}
          <label class="book-row" class:selected={selectedIds.has(i)}>
            <input
              type="checkbox"
              checked={selectedIds.has(i)}
              onchange={() => toggleBook(i)}
            />
            <div class="book-info">
              <span class="book-title">{book.title}</span>
              <span class="book-author">{book.author}</span>
            </div>
            <span class="book-ownership">{ownershipLabel(book.ownership)}</span>
          </label>
        {/each}
      </div>

      <div class="preview-actions">
        <button type="button" class="btn-cancel" onclick={reset}>Cancel</button>
        <button
          type="button"
          class="btn-import"
          onclick={startImport}
          disabled={selectedIds.size === 0}
        >
          Import {selectedIds.size} books
        </button>
      </div>

      {#if error}
        <p class="error">{error}</p>
      {/if}
    </div>

  {:else if step === 'importing'}
    <div class="importing-section">
      <h3>Importing books...</h3>
      <p class="instructions">
        Fetching cover images from Open Library. This may take a moment.
      </p>
      <div class="spinner"></div>
    </div>

  {:else if step === 'done'}
    <div class="done-section">
      <h3>Import complete</h3>
      {#if importResult}
        <div class="result-stats">
          <div class="stat">
            <span class="stat-num">{importResult.imported}</span>
            <span class="stat-label">imported</span>
          </div>
          {#if importResult.skipped > 0}
            <div class="stat">
              <span class="stat-num">{importResult.skipped}</span>
              <span class="stat-label">skipped (duplicates)</span>
            </div>
          {/if}
        </div>
        {#if importResult.errors.length > 0}
          <div class="import-errors">
            <p>{importResult.errors.length} errors:</p>
            <ul>
              {#each importResult.errors.slice(0, 5) as err}
                <li>{err}</li>
              {/each}
              {#if importResult.errors.length > 5}
                <li>...and {importResult.errors.length - 5} more</li>
              {/if}
            </ul>
          </div>
        {/if}
      {/if}
      <button type="button" class="btn-done" onclick={reset}>Done</button>
    </div>
  {/if}
</div>

<style>
  .import-container {
    padding: 1.25rem;
    background: var(--color-cream);
    border: 1px solid var(--color-gold-pale);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-card);
  }

  h3 {
    margin: 0 0 0.75rem;
    font-family: var(--font-display);
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-ink);
  }

  .instructions {
    margin: 0 0 1rem;
    font-family: var(--font-body);
    font-size: 0.9rem;
    color: var(--color-ink-faded);
    line-height: 1.5;
  }

  .file-input {
    display: block;
  }

  .file-input input {
    display: none;
  }

  .file-btn {
    display: inline-block;
    padding: 0.75rem 1.5rem;
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
  }

  .file-btn:hover {
    background: linear-gradient(
      to bottom,
      var(--color-forest),
      var(--color-forest-dark),
      #152218
    );
  }

  .preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .preview-header h3 {
    margin: 0;
  }

  .select-actions {
    display: flex;
    gap: 1rem;
  }

  .link-btn {
    padding: 0;
    font-family: var(--font-body);
    font-size: 0.85rem;
    color: var(--color-forest);
    background: none;
    border: none;
    cursor: pointer;
    text-decoration: underline;
  }

  .link-btn:hover {
    color: var(--color-forest-dark);
  }

  .parse-warnings {
    padding: 0.5rem 0.75rem;
    margin-bottom: 1rem;
    font-family: var(--font-body);
    font-size: 0.85rem;
    color: var(--color-burgundy-dark);
    background: rgba(128, 21, 21, 0.1);
    border-radius: var(--radius-sm);
  }

  .book-list {
    max-height: 300px;
    overflow-y: auto;
    margin-bottom: 1rem;
    border: 1px solid var(--color-gold-pale);
    border-radius: var(--radius-sm);
  }

  .book-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.625rem 0.75rem;
    border-bottom: 1px solid var(--color-gold-pale);
    cursor: pointer;
    transition: background var(--transition-quick);
  }

  .book-row:last-child {
    border-bottom: none;
  }

  .book-row:hover {
    background: var(--color-paper);
  }

  .book-row.selected {
    background: rgba(44, 74, 57, 0.05);
  }

  .book-row input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: var(--color-forest);
  }

  .book-info {
    flex: 1;
    min-width: 0;
  }

  .book-title {
    display: block;
    font-family: var(--font-display);
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--color-ink);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .book-author {
    display: block;
    font-family: var(--font-body);
    font-size: 0.8rem;
    color: var(--color-ink-faded);
    font-style: italic;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .book-ownership {
    flex-shrink: 0;
    padding: 0.25rem 0.5rem;
    font-family: var(--font-display);
    font-size: 0.75rem;
    color: var(--color-ink-faded);
    background: var(--color-paper);
    border: 1px solid var(--color-gold-pale);
    border-radius: 9999px;
  }

  .preview-actions {
    display: flex;
    gap: 0.75rem;
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

  .btn-import {
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
  }

  .btn-import:hover:not(:disabled) {
    background: linear-gradient(
      to bottom,
      var(--color-forest),
      var(--color-forest-dark),
      #152218
    );
  }

  .btn-import:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .error {
    margin: 0.75rem 0 0;
    font-family: var(--font-body);
    font-size: 0.875rem;
    font-style: italic;
    color: var(--color-burgundy-dark);
  }

  .importing-section {
    text-align: center;
    padding: 2rem 0;
  }

  .spinner {
    width: 40px;
    height: 40px;
    margin: 1.5rem auto 0;
    border: 3px solid var(--color-gold-pale);
    border-top-color: var(--color-forest);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .done-section {
    text-align: center;
  }

  .result-stats {
    display: flex;
    justify-content: center;
    gap: 2rem;
    margin: 1.5rem 0;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .stat-num {
    font-family: var(--font-display);
    font-size: 2rem;
    font-weight: 700;
    color: var(--color-forest);
  }

  .stat-label {
    font-family: var(--font-body);
    font-size: 0.85rem;
    color: var(--color-ink-faded);
  }

  .import-errors {
    margin: 1rem 0;
    padding: 0.75rem;
    text-align: left;
    font-family: var(--font-body);
    font-size: 0.85rem;
    color: var(--color-burgundy-dark);
    background: rgba(128, 21, 21, 0.1);
    border-radius: var(--radius-sm);
  }

  .import-errors p {
    margin: 0 0 0.5rem;
    font-weight: 500;
  }

  .import-errors ul {
    margin: 0;
    padding-left: 1.25rem;
  }

  .import-errors li {
    margin-bottom: 0.25rem;
  }

  .btn-done {
    padding: 0.75rem 2rem;
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
  }

  .btn-done:hover {
    background: linear-gradient(
      to bottom,
      var(--color-forest),
      var(--color-forest-dark),
      #152218
    );
  }
</style>
