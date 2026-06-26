<script lang="ts">
  import { parseGoodreadsCSV, parsedBookToBook, type ParsedBook } from '../lib/goodreads-import';
  import { loadBooksFromServer } from '../stores/shelf';
  import { useTranslations, type Lang } from '../i18n';

  let { lang = 'en' as Lang } = $props();
  const t = $derived(useTranslations(lang).shelf.import);

  type Step = 'upload' | 'preview' | 'importing' | 'done';

  let step: Step = $state('upload');
  let parsedBooks: ParsedBook[] = $state([]);
  let selectedIds: Set<number> = $state(new Set());
  let parseErrors: Array<{ row: number; message: string }> = $state([]);
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
      error = t.readError;
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
      error = t.noneSelected;
      return;
    }

    step = 'importing';

    try {
      const res = await fetch('/api/books/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ books: booksToImport }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t.importFailed);
      }

      importResult = await res.json();
      await loadBooksFromServer();
      step = 'done';
    } catch (e) {
      error = e instanceof Error ? e.message : t.importFailed;
      step = 'preview';
    }
  }

  function reset() {
    step = 'upload';
    parsedBooks = [];
    selectedIds = new Set();
    parseErrors = [];
    importResult = null;
    error = '';
  }

  function ownershipLabel(ownership: string): string {
    return ownership === 'seeking' ? t.seeking : t.have;
  }
</script>

<div class="import-container">
  {#if step === 'upload'}
    <div class="upload-section">
      <h3>{t.title}</h3>
      <p class="instructions">
        {t.instructions}
      </p>
      <label class="file-input">
        <input type="file" accept=".csv" onchange={handleFileSelect} />
        <span class="btn btn-filled file-btn">{t.chooseFile}</span>
      </label>
      {#if error}
        <p class="error">{error}</p>
      {/if}
    </div>

  {:else if step === 'preview'}
    <div class="preview-section">
      <div class="preview-header">
        <h3>{parsedBooks.length} {t.booksFound}</h3>
        <div class="select-actions">
          <button type="button" class="btn btn-plain btn-sm" onclick={selectAll}>{t.selectAll}</button>
          <button type="button" class="btn btn-plain btn-sm" onclick={selectNone}>{t.selectNone}</button>
        </div>
      </div>

      {#if parseErrors.length > 0}
        <div class="parse-warnings">
          {parseErrors.length} {t.rowsSkipped}
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
              <span class="book-title serif">{book.title}</span>
              <span class="book-author muted">{book.author}</span>
            </div>
            <span class="pill">{ownershipLabel(book.ownership)}</span>
          </label>
        {/each}
      </div>

      <div class="preview-actions">
        <button type="button" class="btn btn-outline btn-cancel" onclick={reset}>{t.cancel}</button>
        <button
          type="button"
          class="btn btn-filled btn-import"
          onclick={startImport}
          disabled={selectedIds.size === 0}
        >
          {t.importBooks.replace('{n}', String(selectedIds.size))}
        </button>
      </div>

      {#if error}
        <p class="error">{error}</p>
      {/if}
    </div>

  {:else if step === 'importing'}
    <div class="importing-section">
      <h3>{t.importingTitle}</h3>
      <p class="instructions">
        {t.importingDesc}
      </p>
      <div class="spinner"></div>
    </div>

  {:else if step === 'done'}
    <div class="done-section">
      <h3>{t.doneTitle}</h3>
      {#if importResult}
        <div class="result-stats">
          <div class="stat">
            <span class="stat-num">{importResult.imported}</span>
            <span class="stat-label">{t.imported}</span>
          </div>
          {#if importResult.skipped > 0}
            <div class="stat">
              <span class="stat-num">{importResult.skipped}</span>
              <span class="stat-label">{t.skipped}</span>
            </div>
          {/if}
        </div>
        {#if importResult.errors.length > 0}
          <div class="import-errors">
            <p>{importResult.errors.length} {t.errorsLabel}</p>
            <ul>
              {#each importResult.errors.slice(0, 5) as err}
                <li>{err}</li>
              {/each}
              {#if importResult.errors.length > 5}
                <li>{t.andMore.replace('{n}', String(importResult.errors.length - 5))}</li>
              {/if}
            </ul>
          </div>
        {/if}
      {/if}
      <button type="button" class="btn btn-filled btn-done" onclick={reset}>{t.done}</button>
    </div>
  {/if}
</div>

<style>
  .import-container {
    padding: var(--s-5);
    background: var(--surface);
    border: 1px solid var(--hairline);
    border-radius: var(--r-lg);
    box-shadow: var(--shadow-1);
  }

  h3 {
    margin: 0 0 var(--s-3);
    font-size: 1.1875rem;
    font-weight: 500;
    color: var(--ink);
  }

  .instructions {
    margin: 0 0 var(--s-4);
    font-size: 0.9rem;
    color: var(--ink-muted);
    line-height: 1.5;
  }

  .file-input {
    display: block;
  }

  .file-input input {
    display: none;
  }

  .file-btn {
    display: inline-flex;
  }

  .preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--s-4);
  }

  .preview-header h3 {
    margin: 0;
  }

  .select-actions {
    display: flex;
    gap: var(--s-1);
  }

  .parse-warnings {
    padding: var(--s-2) var(--s-3);
    margin-bottom: var(--s-4);
    font-size: 0.85rem;
    color: var(--st-seeking-fg);
    background: var(--st-seeking-bg);
    border-radius: var(--r-sm);
  }

  .book-list {
    max-height: 300px;
    overflow-y: auto;
    margin-bottom: var(--s-4);
    border: 1px solid var(--hairline);
    border-radius: var(--r-md);
  }

  .book-row {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    padding: var(--s-3);
    border-bottom: 1px solid var(--hairline);
    cursor: pointer;
    transition: background var(--dur-1) var(--ease-soft);
  }

  .book-row:last-child {
    border-bottom: none;
  }

  .book-row:hover {
    background: var(--surface-sunken);
  }

  .book-row.selected {
    background: var(--accent-tint);
  }

  .book-row input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: var(--accent);
  }

  .book-info {
    flex: 1;
    min-width: 0;
  }

  .book-title {
    display: block;
    font-size: 0.9375rem;
    font-weight: 500;
    color: var(--ink);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .book-author {
    display: block;
    font-size: 0.8rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .book-row .pill {
    flex-shrink: 0;
  }

  .preview-actions {
    display: flex;
    gap: var(--s-3);
  }

  .btn-cancel {
    flex: 1;
  }

  .btn-import {
    flex: 2;
  }

  .error {
    margin: var(--s-3) 0 0;
    font-size: 0.875rem;
    color: var(--danger);
  }

  .importing-section {
    text-align: center;
    padding: var(--s-6) 0;
  }

  .spinner {
    width: 40px;
    height: 40px;
    margin: var(--s-5) auto 0;
    border: 3px solid var(--hairline);
    border-top-color: var(--accent);
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
    gap: var(--s-6);
    margin: var(--s-5) 0;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .stat-num {
    font-family: var(--font-display);
    font-size: 2rem;
    font-weight: 500;
    color: var(--accent);
  }

  .stat-label {
    font-size: 0.85rem;
    color: var(--ink-muted);
  }

  .import-errors {
    margin: var(--s-4) 0;
    padding: var(--s-3);
    text-align: left;
    font-size: 0.85rem;
    color: var(--danger);
    background: var(--danger-tint);
    border-radius: var(--r-sm);
  }

  .import-errors p {
    margin: 0 0 var(--s-2);
    font-weight: 590;
  }

  .import-errors ul {
    margin: 0;
    padding-left: var(--s-5);
  }

  .import-errors li {
    margin-bottom: var(--s-1);
  }

  .btn-done {
    min-width: 8rem;
  }

  @media (prefers-reduced-motion: reduce) {
    .spinner { animation-duration: 0.8s; }
  }
</style>
