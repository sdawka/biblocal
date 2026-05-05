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
    padding: 1rem;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background: #fafafa;
  }

  .tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .tabs button {
    padding: 0.5rem 1rem;
    border: 1px solid #ccc;
    background: white;
    border-radius: 4px;
    cursor: pointer;
  }

  .tabs button.active {
    background: #0066cc;
    color: white;
    border-color: #0066cc;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  input,
  select {
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 1rem;
  }

  button[type='submit'] {
    padding: 0.75rem;
    background: #0066cc;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
  }

  button[type='submit']:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .error {
    margin: 0.5rem 0 0;
    color: #dc2626;
    font-size: 0.875rem;
  }
</style>
