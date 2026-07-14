<script lang="ts">
  import type { Book, BookIntent, BookVisibility, BookOwnership } from '../lib/types';
  import { useTranslations, type Lang } from '../i18n';
  import { INTENT_OPTIONS } from '../lib/intents';

  interface Props {
    book: Book;
    lang?: Lang;
    onIntentsChange?: (intents: BookIntent[]) => void;
    onVisibilityChange?: (visibility: BookVisibility) => void;
    onOwnershipChange?: (ownership: BookOwnership) => void;
    onDelete?: (id: string) => void;
    onAddNote?: (text: string, visibility: BookVisibility) => void;
    onUpdateNote?: (noteId: string, updates: { text?: string; visibility?: BookVisibility }) => void;
    onDeleteNote?: (noteId: string) => void;
    onUpdateDetails?: (updates: { title: string; author: string }) => void;
    readonly?: boolean;
  }

  let {
    book,
    lang = 'en' as Lang,
    onIntentsChange,
    onVisibilityChange,
    onOwnershipChange,
    onDelete,
    onAddNote,
    onUpdateNote,
    onDeleteNote,
    onUpdateDetails,
    readonly = false,
  }: Props = $props();

  const t = $derived(useTranslations(lang).shelf.card);
  const intentLabels = $derived(useTranslations(lang).shelf.intents.labels);
  const ta = $derived(useTranslations(lang).shelf.add);

  let showDeleteConfirm = $state(false);

  let editingDetails = $state(false);
  let draftTitle = $state('');
  let draftAuthor = $state('');

  function startEditDetails() {
    draftTitle = book.title;
    draftAuthor = book.author;
    editingDetails = true;
  }

  function saveDetails() {
    const title = draftTitle.trim();
    const author = draftAuthor.trim();
    if (!title || !author) return;
    onUpdateDetails?.({ title, author });
    editingDetails = false;
  }

  function handleDeleteClick() {
    showDeleteConfirm = true;
  }

  function confirmDelete() {
    onDelete?.(book.id);
    showDeleteConfirm = false;
  }

  function cancelDelete() {
    showDeleteConfirm = false;
  }

  function toggleIntent(intent: BookIntent) {
    const newIntents = book.intents.includes(intent)
      ? book.intents.filter(i => i !== intent)
      : [...book.intents, intent];
    onIntentsChange?.(newIntents);
  }

  // ─── Notes ──────────────────────────────────────────────────────────────
  const notes = $derived(book.notes ?? []);
  let notesOpen = $state(false);
  let draftText = $state('');
  let draftVisibility = $state<BookVisibility>('private');

  function submitNote() {
    const text = draftText.trim();
    if (!text) return;
    onAddNote?.(text, draftVisibility);
    draftText = '';
    draftVisibility = 'private';
  }

  function toggleNoteVisibility(noteId: string, current: BookVisibility) {
    onUpdateNote?.(noteId, { visibility: current === 'visible' ? 'private' : 'visible' });
  }
</script>

<div class="book-detail">
  <div class="info">
    {#if editingDetails}
      <div class="details-edit">
        <label class="details-field">
          <span class="details-label">{t.editTitleLabel}</span>
          <input class="input" bind:value={draftTitle} />
        </label>
        <label class="details-field">
          <span class="details-label">{t.editAuthorLabel}</span>
          <input class="input" bind:value={draftAuthor} />
        </label>
        <div class="details-actions">
          <button class="btn btn-outline btn-sm" onclick={() => (editingDetails = false)}>{t.cancel}</button>
          <button class="btn btn-filled btn-sm" onclick={saveDetails} disabled={!draftTitle.trim() || !draftAuthor.trim()}>{t.save}</button>
        </div>
      </div>
    {:else}
      <h3 class="title serif">
        {book.title}
        {#if !readonly && onUpdateDetails}
          <button class="edit-details" onclick={startEditDetails} aria-label={t.editDetails}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 2.5l1.5 1.5L5 10.5l-2 .5.5-2z" />
            </svg>
          </button>
        {/if}
      </h3>
      <p class="author muted">{book.author}</p>
    {/if}

    <div class="badges">
      {#if book.ownership === 'seeking'}
        <span class="pill" data-status="seeking-home">{t.seeking}</span>
      {/if}
      {#if book.visibility === 'private'}
        <span class="pill" data-status="private">{t.private}</span>
      {/if}
      {#if readonly || !onIntentsChange}
        {#each book.intents as intent}
          <span class="pill" data-status={intent}>{intentLabels[intent]}</span>
        {/each}
      {:else}
        {#each INTENT_OPTIONS as opt}
          <button
            class="pill pill-button"
            class:pill-off={!book.intents.includes(opt.value)}
            data-status={opt.value}
            aria-pressed={book.intents.includes(opt.value)}
            onclick={() => toggleIntent(opt.value)}
          >
            {intentLabels[opt.value]}
          </button>
        {/each}
      {/if}
    </div>

    {#if !readonly && (onOwnershipChange || onVisibilityChange)}
      <div class="dimensions">
        {#if onOwnershipChange}
          <div class="dimension-row">
            <span class="dimension-label">{ta.ownership.prompt}</span>
            <div class="segmented segmented-sm" role="group" aria-label={ta.ownership.groupLabel}>
              <button type="button" aria-pressed={book.ownership === 'have'} onclick={() => onOwnershipChange?.('have')}>{ta.ownership.have}</button>
              <button type="button" aria-pressed={book.ownership === 'seeking'} onclick={() => onOwnershipChange?.('seeking')}>{ta.ownership.seeking}</button>
            </div>
          </div>
        {/if}
        {#if onVisibilityChange}
          <div class="dimension-row">
            <span class="dimension-label">{ta.visibility.prompt}</span>
            <div class="segmented segmented-sm" role="group" aria-label={ta.visibility.groupLabel}>
              <button type="button" aria-pressed={book.visibility === 'visible'} onclick={() => onVisibilityChange?.('visible')}>{ta.visibility.visible}</button>
              <button type="button" aria-pressed={book.visibility === 'private'} onclick={() => onVisibilityChange?.('private')}>{ta.visibility.private}</button>
            </div>
          </div>
        {/if}
      </div>
    {/if}

    {#if book.addedVia === 'scan'}
      <span class="verified" title={t.addedViaScan} aria-label={t.addedViaScan}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M13.5 4.5 6 12 2.5 8.5" />
        </svg>
      </span>
    {/if}

    {#if !readonly || notes.length > 0}
      <div class="notes">
        <button
          class="notes-toggle"
          aria-expanded={notesOpen}
          onclick={() => (notesOpen = !notesOpen)}
        >
          <svg class="chevron" class:open={notesOpen} width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 2l4 3-4 3" />
          </svg>
          {#if notes.length > 0}
            {notes.length} {notes.length === 1 ? t.notes.noteSingular : t.notes.notePlural}
          {:else}
            {t.notes.addNote}
          {/if}
        </button>

        {#if notesOpen}
          <div class="notes-body">
            {#each notes as note (note.id)}
              <div class="note">
                <p class="note-text">{note.text}</p>
                <div class="note-controls">
                  {#if readonly}
                    {#if note.visibility === 'visible'}
                      <span class="pill pill-sm" data-status="visible">{t.notes.public}</span>
                    {/if}
                  {:else}
                    <button
                      class="pill pill-sm pill-button"
                      data-status={note.visibility === 'visible' ? 'visible' : 'private'}
                      onclick={() => toggleNoteVisibility(note.id, note.visibility)}
                      aria-label={note.visibility === 'visible' ? t.notes.togglePrivacyPublic : t.notes.togglePrivacyPrivate}
                    >
                      {note.visibility === 'visible' ? t.notes.public : t.notes.private}
                    </button>
                    <button
                      class="note-delete"
                      onclick={() => onDeleteNote?.(note.id)}
                      aria-label={t.notes.deleteNoteAria}
                    >
                      <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M2 2l6 6M8 2l-6 6" /></svg>
                    </button>
                  {/if}
                </div>
              </div>
            {/each}

            {#if !readonly}
              <div class="note-add">
                <textarea
                  class="textarea note-input"
                  bind:value={draftText}
                  placeholder={t.notes.placeholder}
                  rows="2"
                ></textarea>
                <div class="note-add-actions">
                  <div class="segmented segmented-sm" role="group" aria-label={t.notes.privacyGroupLabel}>
                    <button type="button" aria-pressed={draftVisibility === 'private'} onclick={() => (draftVisibility = 'private')}>{t.notes.private}</button>
                    <button type="button" aria-pressed={draftVisibility === 'visible'} onclick={() => (draftVisibility = 'visible')}>{t.notes.public}</button>
                  </div>
                  <button class="btn btn-filled btn-sm" onclick={submitNote} disabled={!draftText.trim()}>{t.notes.addNoteButton}</button>
                </div>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {/if}
  </div>

  {#if !readonly && onDelete}
    <button
      class="delete-btn"
      onclick={handleDeleteClick}
      aria-label={t.deleteAria.replace('{title}', book.title)}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
        <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" />
      </svg>
    </button>

    {#if showDeleteConfirm}
      <div class="delete-confirm glass">
        <p class="serif">{t.removeConfirm}</p>
        <div class="delete-actions">
          <button class="btn btn-outline btn-sm" onclick={cancelDelete}>{t.cancel}</button>
          <button class="btn btn-filled btn-sm btn-remove" onclick={confirmDelete}>{t.remove}</button>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .book-detail {
    position: relative;
  }

  .info {
    flex: 1;
    min-width: 0;
  }

  .title {
    margin: 0 0 2px;
    font-size: 0.9375rem;
    font-weight: 500;
    color: var(--ink);
    line-height: 1.28;
    letter-spacing: -0.01em;
  }

  .author {
    margin: 0 0 var(--s-2);
    font-size: 0.8125rem;
  }

  .badges {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s-1);
  }

  .pill-button {
    border: none;
    cursor: pointer;
    min-height: 30px;
    transition: box-shadow var(--dur-1) var(--ease-soft), transform var(--dur-1) var(--ease-spring);
  }

  /* Touch devices have no hover precision, so keep pills at a full 44px tap
     target; pointer devices get the compact size above. */
  @media (hover: none) {
    .pill-button {
      min-height: 44px;
    }
  }

  .pill-button:hover {
    box-shadow: inset 0 0 0 1px currentColor;
  }

  .pill-button:active {
    transform: scale(0.94);
  }

  .edit-details {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    margin-left: var(--s-1);
    color: var(--ink-muted);
    background: none;
    border: none;
    border-radius: var(--r-full);
    cursor: pointer;
    vertical-align: middle;
    transition: color var(--dur-1) var(--ease-soft);
  }

  .edit-details:hover {
    color: var(--accent);
  }

  .details-edit {
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
    margin-bottom: var(--s-2);
  }

  .details-field {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .details-label {
    font-family: var(--font-ui);
    font-size: 0.75rem;
    font-weight: 590;
    color: var(--ink-muted);
  }

  .details-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--s-2);
  }

  .pill-off {
    opacity: 0.45;
  }

  .pill-off:hover {
    opacity: 1;
  }

  .dimensions {
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
    margin-top: var(--s-3);
  }

  .dimension-row {
    display: flex;
    align-items: center;
    gap: var(--s-3);
  }

  .dimension-label {
    font-family: var(--font-ui);
    font-size: 0.8125rem;
    font-weight: 590;
    color: var(--ink-muted);
    min-width: 3rem;
  }

  .verified {
    display: inline-flex;
    align-items: center;
    margin-top: var(--s-2);
    color: var(--accent);
  }

  .delete-btn {
    position: absolute;
    top: var(--s-2);
    right: var(--s-2);
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--ink-muted);
    background: var(--surface);
    border: 1px solid var(--hairline);
    border-radius: var(--r-full);
    cursor: pointer;
    opacity: 0;
    transition: opacity var(--dur-2) var(--ease-out), color var(--dur-1) var(--ease-soft),
                background var(--dur-1) var(--ease-soft), border-color var(--dur-1) var(--ease-soft);
    z-index: 2;
  }

  /* Reveal on hover AND keyboard focus so the control isn't invisible to keyboard users. */
  .book-detail:hover .delete-btn,
  .book-detail:focus-within .delete-btn,
  .delete-btn:focus-visible {
    opacity: 1;
  }

  /* Touch devices have no hover, so the delete control is always shown and
     enlarged to a proper 44px tap target. .info reserves space on the right so
     the button never sits on top of the title. */
  @media (hover: none) {
    .delete-btn {
      opacity: 1;
      width: 44px;
      height: 44px;
    }
    .info {
      padding-right: calc(44px + var(--s-2));
    }
  }

  .delete-btn:hover {
    color: var(--accent-on);
    background: var(--accent);
    border-color: var(--accent);
  }

  .delete-confirm {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--s-3);
    border-radius: var(--r-lg);
    z-index: 3;
    animation: fade var(--dur-2) var(--ease-soft) both;
  }

  .delete-confirm p {
    margin: 0;
    font-size: 1rem;
    font-weight: 500;
    color: var(--ink);
  }

  .delete-actions {
    display: flex;
    gap: var(--s-2);
  }

  /* Make the destructive confirm read as destructive while staying on-token. */
  .btn-remove {
    --accent: var(--danger);
    --accent-on: var(--danger-on);
    --accent-hover: var(--danger-hover);
  }

  .notes {
    margin-top: var(--s-2);
  }

  .notes-toggle {
    display: inline-flex;
    align-items: center;
    gap: var(--s-2);
    padding: 0;
    background: none;
    border: none;
    cursor: pointer;
    font-family: var(--font-ui);
    font-size: 0.8125rem;
    font-weight: 590;
    color: var(--ink-muted);
    transition: color var(--dur-1) var(--ease-soft);
  }

  .notes-toggle:hover {
    color: var(--accent);
  }

  .chevron {
    transition: transform var(--dur-1) var(--ease-soft);
  }

  .chevron.open {
    transform: rotate(90deg);
  }

  .notes-body {
    display: flex;
    flex-direction: column;
    gap: var(--s-3);
    margin-top: var(--s-3);
  }

  .note {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--s-3);
  }

  .note-text {
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.45;
    color: var(--ink);
    white-space: pre-wrap;
    flex: 1;
    min-width: 0;
  }

  .note-controls {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    flex-shrink: 0;
  }

  .pill-sm {
    font-size: 0.6875rem;
    padding: 0.15rem 0.5rem;
    min-height: 0;
  }

  .note-delete {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    color: var(--ink-muted);
    background: none;
    border: none;
    border-radius: var(--r-full);
    cursor: pointer;
    transition: color var(--dur-1) var(--ease-soft);
  }

  .note-delete:hover {
    color: var(--danger);
  }

  .note-add {
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
  }

  .note-input {
    min-height: 56px;
    font-size: 0.875rem;
  }

  .note-add-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--s-2);
  }

  .segmented-sm button {
    font-size: 0.75rem;
    padding: 0.3rem 0.6rem;
  }

  @media (prefers-reduced-motion: reduce) {
    .chevron { transition: none; }
  }
</style>
