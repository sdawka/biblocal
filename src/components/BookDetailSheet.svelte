<script lang="ts">
  import type { Book, BookIntent, BookVisibility, BookOwnership } from '../lib/types';
  import { useTranslations, type Lang } from '../i18n';
  import { isHostedCoverUrl } from '../lib/coverImages';
  import BookDetail from './BookDetail.svelte';

  interface Props {
    book: Book;
    lang?: Lang;
    onClose: () => void;
    onIntentsChange?: (intents: BookIntent[]) => void;
    onVisibilityChange?: (visibility: BookVisibility) => void;
    onOwnershipChange?: (ownership: BookOwnership) => void;
    onDelete?: (id: string) => Promise<boolean>;
    onAddNote?: (text: string, visibility: BookVisibility) => void;
    onUpdateNote?: (noteId: string, updates: { text?: string; visibility?: BookVisibility }) => void;
    onDeleteNote?: (noteId: string) => void;
    onUpdateDetails?: (updates: { title: string; author: string }) => void;
    onUploadCover?: (file: File) => Promise<boolean>;
    onResetCover?: () => Promise<boolean>;
  }

  let {
    book,
    lang = 'en' as Lang,
    onClose,
    onIntentsChange,
    onVisibilityChange,
    onOwnershipChange,
    onDelete,
    onAddNote,
    onUpdateNote,
    onDeleteNote,
    onUpdateDetails,
    onUploadCover,
    onResetCover,
  }: Props = $props();

  const t = $derived(useTranslations(lang).shelf.card);

  let dialogRef: HTMLDivElement | null = $state(null);
  let closeBtnRef: HTMLButtonElement | null = $state(null);
  let previousActiveElement: Element | null = null;

  let fileInputRef: HTMLInputElement | null = $state(null);
  let uploading = $state(false);
  let deleting = $state(false);

  // Explicit transient-state reset keyed on the book id: if the sheet ever
  // switches books while open (e.g. a future next/prev affordance), a stale
  // "Uploading…" flag must not leak onto the next book. Draft editing state
  // resets the same way inside BookDetail.
  // svelte-ignore state_referenced_locally -- intentionally captures the initial id
  let sheetBookId = book.id;
  $effect(() => {
    if (book.id === sheetBookId) return;
    sheetBookId = book.id;
    uploading = false;
  });
  const canReset = $derived(!!book.fetchedCoverUrl && isHostedCoverUrl(book.coverUrl));

  async function handleFileChange(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (deleting || !file || !onUploadCover) return;
    uploading = true;
    await onUploadCover(file);
    uploading = false;
  }

  async function handleResetCover() {
    if (deleting || !onResetCover) return;
    uploading = true;
    await onResetCover();
    uploading = false;
  }

  async function handleDelete(id: string): Promise<boolean> {
    if (!onDelete || deleting) return false;
    deleting = true;
    dialogRef?.focus();
    const removed = await onDelete(id);
    deleting = false;
    if (removed) onClose();
    return removed;
  }

  // Focus trap and restoration, following the ScannerIsland pattern.
  $effect(() => {
    previousActiveElement = document.activeElement;
    closeBtnRef?.focus();

    return () => {
      if (previousActiveElement && previousActiveElement instanceof HTMLElement) {
        previousActiveElement.focus();
      }
    };
  });

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      if (!deleting) onClose();
      return;
    }

    if (event.key === 'Tab' && dialogRef) {
      const focusableElements = dialogRef.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (!firstElement || !lastElement) {
        event.preventDefault();
        dialogRef.focus();
      } else if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    }
  }

  function handleScrimClick(event: MouseEvent) {
    if (!deleting && event.target === event.currentTarget) {
      onClose();
    }
  }
</script>

<div
  class="sheet-scrim"
  onclick={handleScrimClick}
  onkeydown={handleKeyDown}
  role="dialog"
  aria-modal="true"
  aria-labelledby="book-detail-sheet-title"
  tabindex="-1"
  bind:this={dialogRef}
>
  <div class="sheet-panel glass">
    <div class="sheet-header">
      <div class="cover-block">
        {#if book.coverUrl}
          <img class="sheet-cover" src={book.coverUrl} alt="" width="60" height="90" loading="lazy" decoding="async" />
        {:else}
          <div class="sheet-cover placeholder">
            <span>{book.title.charAt(0)}</span>
          </div>
        {/if}
        {#if onUploadCover}
          <input
            type="file"
            accept="image/*"
            class="visually-hidden-input"
            bind:this={fileInputRef}
            onchange={handleFileChange}
            disabled={deleting}
          />
          <button
            class="btn btn-outline btn-sm"
            onclick={() => fileInputRef?.click()}
            disabled={uploading || deleting}
            aria-label={t.changeCoverAria.replace('{title}', book.title)}
          >
            {uploading ? t.uploadingCover : t.changeCover}
          </button>
          {#if canReset && onResetCover}
            <button class="btn btn-plain btn-sm" onclick={handleResetCover} disabled={uploading || deleting}>
              {t.resetCover}
            </button>
          {/if}
        {/if}
      </div>
      <h2 id="book-detail-sheet-title" class="visually-hidden">{book.title}</h2>
      <button
        class="close-btn"
        onclick={() => { if (!deleting) onClose(); }}
        disabled={deleting}
        aria-label={t.closeDetailAria}
        bind:this={closeBtnRef}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
          <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" />
        </svg>
      </button>
    </div>

    <div class="sheet-body">
      <fieldset class="sheet-mutations" disabled={deleting}>
        <BookDetail
          {book}
          {lang}
          {onIntentsChange}
          {onVisibilityChange}
          {onOwnershipChange}
          onDelete={onDelete ? handleDelete : undefined}
          {onAddNote}
          {onUpdateNote}
          {onDeleteNote}
          {onUpdateDetails}
        />
      </fieldset>
    </div>
  </div>
</div>

<style>
  .sheet-scrim {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--s-5);
    background: oklch(0 0 0 / 0.5);
    z-index: 100;
    animation: fade var(--dur-2) var(--ease-soft) both;
  }

  .sheet-panel {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 440px;
    max-height: 85vh;
    background: var(--surface);
    border-radius: var(--r-lg);
    box-shadow: var(--shadow-4);
    overflow: hidden;
  }

  .sheet-header {
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: var(--s-3);
    padding: var(--s-4) var(--s-4) 0;
    flex-shrink: 0;
  }

  .cover-block {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--s-2);
    flex-shrink: 0;
  }

  .visually-hidden-input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }

  .sheet-cover {
    width: 60px;
    height: 90px;
    object-fit: cover;
    border-radius: var(--r-sm);
    box-shadow: var(--shadow-2);
    flex-shrink: 0;
  }

  .sheet-cover.placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--accent-tint);
    font-family: var(--font-display);
    font-size: 1.4rem;
    font-weight: 500;
    color: var(--accent);
  }

  .close-btn {
    position: absolute;
    top: var(--s-3);
    right: var(--s-3);
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--ink-muted);
    background: var(--surface);
    border: 1px solid var(--hairline);
    border-radius: var(--r-full);
    cursor: pointer;
    transition: color var(--dur-1) var(--ease-soft), background var(--dur-1) var(--ease-soft),
                border-color var(--dur-1) var(--ease-soft);
  }

  .close-btn:hover {
    color: var(--accent-on);
    background: var(--accent);
    border-color: var(--accent);
  }

  /* Touch devices have no hover precision, so enlarge the close control to a
     full 44px tap target; pointer devices keep the compact 32px size above. */
  @media (hover: none) {
    .close-btn {
      width: 44px;
      height: 44px;
    }
  }

  .sheet-body {
    padding: var(--s-4);
    overflow-y: auto;
  }

  .sheet-mutations {
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
  }

  .sheet-body :global(.book-detail) {
    position: relative;
  }

  @media (max-width: 600px) {
    .sheet-scrim {
      align-items: flex-end;
      padding: 0;
    }

    .sheet-panel {
      width: 100%;
      max-width: none;
      max-height: min(88vh, 48rem);
      border-radius: var(--r-lg) var(--r-lg) 0 0;
      animation: sheet-rise var(--dur-2) var(--ease-soft) both;
    }

    .sheet-header {
      padding: var(--s-4) var(--s-4) 0;
    }

    .sheet-body {
      padding: var(--s-4) var(--s-4) calc(var(--s-5) + env(safe-area-inset-bottom));
    }
  }

  @keyframes sheet-rise {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    .sheet-scrim, .sheet-panel {
      animation: none;
    }
  }
</style>
