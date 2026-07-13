<script lang="ts">
  import type { Book, BookIntent, BookVisibility, BookOwnership } from '../lib/types';
  import { useTranslations, type Lang } from '../i18n';
  import BookDetail from './BookDetail.svelte';

  interface Props {
    book: Book;
    lang?: Lang;
    onClose: () => void;
    onIntentsChange?: (intents: BookIntent[]) => void;
    onVisibilityChange?: (visibility: BookVisibility) => void;
    onOwnershipChange?: (ownership: BookOwnership) => void;
    onDelete?: (id: string) => void;
    onAddNote?: (text: string, visibility: BookVisibility) => void;
    onUpdateNote?: (noteId: string, updates: { text?: string; visibility?: BookVisibility }) => void;
    onDeleteNote?: (noteId: string) => void;
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
  }: Props = $props();

  const t = $derived(useTranslations(lang).shelf.card);

  let dialogRef: HTMLDivElement | null = $state(null);
  let closeBtnRef: HTMLButtonElement | null = $state(null);
  let previousActiveElement: Element | null = null;

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
      onClose();
      return;
    }

    if (event.key === 'Tab' && dialogRef) {
      const focusableElements = dialogRef.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    }
  }

  function handleScrimClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
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
      {#if book.coverUrl}
        <img class="sheet-cover" src={book.coverUrl} alt="" width="60" height="90" loading="lazy" decoding="async" />
      {:else}
        <div class="sheet-cover placeholder">
          <span>{book.title.charAt(0)}</span>
        </div>
      {/if}
      <h2 id="book-detail-sheet-title" class="visually-hidden">{book.title}</h2>
      <button
        class="close-btn"
        onclick={onClose}
        aria-label={t.closeDetailAria}
        bind:this={closeBtnRef}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
          <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" />
        </svg>
      </button>
    </div>

    <div class="sheet-body">
      <BookDetail
        {book}
        {lang}
        {onIntentsChange}
        {onVisibilityChange}
        {onOwnershipChange}
        {onDelete}
        {onAddNote}
        {onUpdateNote}
        {onDeleteNote}
      />
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

  .sheet-body {
    padding: var(--s-4);
    overflow-y: auto;
  }

  .sheet-body :global(.book-detail) {
    position: relative;
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
    .sheet-scrim {
      animation: none;
    }
  }
</style>
