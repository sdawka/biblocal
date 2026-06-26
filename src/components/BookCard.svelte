<script lang="ts">
  import type { Book, BookIntent, BookVisibility, BookOwnership } from '../lib/types';
  import { useTranslations, type Lang } from '../i18n';

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
    readonly = false,
  }: Props = $props();

  const t = $derived(useTranslations(lang).shelf.card);
  const intentLabels = $derived(useTranslations(lang).shelf.intents.labels);

  let showDeleteConfirm = $state(false);

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

<article
  class="book-card card"
  class:seeking={book.ownership === 'seeking'}
  data-book-id={book.id}
>
  {#if book.coverUrl}
    <img src={book.coverUrl} alt="{book.title} cover" class="cover" width="60" height="90" loading="lazy" decoding="async" />
  {:else}
    <div class="cover placeholder">
      <span>{book.title.charAt(0)}</span>
    </div>
  {/if}

  <div class="info">
    <h3 class="title serif">{book.title}</h3>
    <p class="author muted">{book.author}</p>

    <div class="badges">
      {#if book.ownership === 'seeking'}
        <span class="pill" data-status="seeking-home">{t.seeking}</span>
      {/if}
      {#if book.visibility === 'private'}
        <span class="pill" data-status="private">{t.private}</span>
      {/if}
      {#each book.intents as intent}
        {#if readonly}
          <span class="pill" data-status={intent}>{intentLabels[intent]}</span>
        {:else}
          <button
            class="pill pill-button"
            data-status={intent}
            onclick={() => toggleIntent(intent)}
            aria-label={t.removeIntentAria.replace('{label}', intentLabels[intent]).replace('{title}', book.title)}
          >
            {intentLabels[intent]}
            <span class="pill-x" aria-hidden="true">
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
                <path d="M2 2l6 6M8 2l-6 6" />
              </svg>
            </span>
          </button>
        {/if}
      {/each}
    </div>

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

</article>

<style>
  .book-card {
    display: flex;
    gap: var(--s-4);
    padding: var(--s-4);
    position: relative;
    overflow: hidden;
    touch-action: pan-y;
  }

  .book-card.seeking {
    border-left: 3px solid var(--accent);
  }

  .book-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-2);
    border-color: var(--hairline-strong);
  }

  .cover {
    width: 60px;
    height: 90px;
    object-fit: cover;
    border-radius: var(--r-sm);
    flex-shrink: 0;
    box-shadow: var(--shadow-2);
  }

  .cover.placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--accent-tint);
    font-family: var(--font-display);
    font-size: 1.75rem;
    font-weight: 500;
    color: var(--accent);
  }

  .info {
    flex: 1;
    min-width: 0;
  }

  .title {
    margin: 0 0 var(--s-1);
    font-size: 1.0625rem;
    font-weight: 500;
    color: var(--ink);
    line-height: 1.3;
    letter-spacing: -0.01em;
  }

  .author {
    margin: 0 0 var(--s-3);
    font-size: 0.875rem;
  }

  .badges {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s-2);
  }

  .pill-button {
    border: none;
    cursor: pointer;
    min-height: 44px;
    transition: box-shadow var(--dur-1) var(--ease-soft), transform var(--dur-1) var(--ease-spring);
  }

  .pill-button:hover {
    box-shadow: inset 0 0 0 1px currentColor;
  }

  .pill-button:active {
    transform: scale(0.94);
  }

  .pill-x {
    display: inline-flex;
    align-items: center;
    opacity: 0.7;
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
  .book-card:hover .delete-btn,
  .book-card:focus-within .delete-btn,
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

  :global(.book-card.highlight-pulse) {
    animation: highlightPulse 1s var(--ease-out);
  }

  @keyframes highlightPulse {
    0% {
      box-shadow: 0 0 0 0 var(--focus-ring);
    }
    50% {
      box-shadow: 0 0 0 4px var(--focus-ring);
    }
    100% {
      box-shadow: var(--shadow-1);
    }
  }

  .notes {
    margin-top: var(--s-3);
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
    .book-card { transition: none; }
    .chevron { transition: none; }
  }
</style>
