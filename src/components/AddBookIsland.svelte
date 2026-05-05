<script lang="ts">
  import { addBook } from '../stores/shelf';
  import { fetchByIsbn, isValidIsbn } from '../lib/openLibrary';
  import type { BookStatus } from '../lib/types';

  type Mode = 'isbn' | 'manual';

  let mode: Mode = $state('isbn');
  let isbn = $state('');
  let title = $state('');
  let author = $state('');
  let status: BookStatus = $state('visible');
  let loading = $state(false);
  let error = $state('');

  const STATUS_OPTIONS: { value: BookStatus; label: string }[] = [
    { value: 'visible', label: 'Visible' },
    { value: 'borrowable', label: 'Will lend' },
    { value: 'discussable', label: 'Will discuss' },
    { value: 'giftable', label: 'Free to good home' },
    { value: 'class-resource', label: 'Class resource' },
    { value: 'seeking-home', label: 'Looking for this' },
    { value: 'private', label: 'Private' },
  ];

  async function handleIsbnSubmit() {
    if (!isValidIsbn(isbn)) {
      error = 'Please enter a valid 10 or 13 digit ISBN';
      return;
    }

    loading = true;
    error = '';

    const bookData = await fetchByIsbn(isbn);

    if (bookData) {
      addBook({
        ...bookData,
        status,
        addedVia: 'scan',
      });
      isbn = '';
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

    addBook({
      title: title.trim(),
      author: author.trim(),
      status,
      addedVia: 'manual',
    });

    title = '';
    author = '';
    error = '';
    mode = 'isbn';
  }

  function switchMode(newMode: Mode) {
    mode = newMode;
    error = '';
  }
</script>

<div class="add-book">
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
      <input
        type="text"
        bind:value={isbn}
        placeholder="Enter ISBN (e.g., 9780465026562)"
        disabled={loading}
      />
      <select bind:value={status}>
        {#each STATUS_OPTIONS as opt}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
      <button type="submit" disabled={loading}>
        {loading ? 'Looking up...' : 'Add Book'}
      </button>
    </form>
  {:else}
    <form
      onsubmit={(e) => {
        e.preventDefault();
        handleManualSubmit();
      }}
    >
      <input type="text" bind:value={title} placeholder="Book title" />
      <input type="text" bind:value={author} placeholder="Author" />
      <select bind:value={status}>
        {#each STATUS_OPTIONS as opt}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
      <button type="submit">Add Book</button>
    </form>
  {/if}

  {#if error}
    <p class="error">{error}</p>
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

  input,
  select {
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

  input:focus,
  select:focus {
    outline: none;
    border-color: var(--color-gold);
    box-shadow: var(--shadow-inset), 0 0 0 3px rgba(184, 134, 11, 0.15);
  }

  select {
    appearance: none;
    padding-right: 2.5rem;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B5B4F' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.875rem center;
    cursor: pointer;
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
    color: #8B2500;
  }
</style>
