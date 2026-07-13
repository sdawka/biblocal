<script lang="ts">
  import type { Book, BookIntent, BookVisibility, BookOwnership } from '../lib/types';
  import type { Lang } from '../i18n';
  import BookDetail from './BookDetail.svelte';

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
</script>

<article
  class="book-card card"
  class:seeking={book.ownership === 'seeking'}
  data-book-id={book.id}
>
  {#if book.coverUrl}
    <img src={book.coverUrl} alt="{book.title} cover" class="cover" width="52" height="78" loading="lazy" decoding="async" />
  {:else}
    <div class="cover placeholder">
      <span>{book.title.charAt(0)}</span>
    </div>
  {/if}

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
    {readonly}
  />
</article>

<style>
  .book-card {
    display: flex;
    gap: var(--s-3);
    padding: var(--s-3);
    position: relative;
    overflow: hidden;
    touch-action: pan-y;
  }

  .book-card.seeking {
    /* Neutral edge instead of the gold bar; the quiet wash carries status. */
    border-left-color: var(--hairline);
    background: color-mix(in oklch, var(--st-seeking-bg) 40%, var(--surface));
  }

  /* Corner tick — the load-bearing status cue (survives if the wash doesn't
     paint), echoing the .pill leading dot. Sits inside the rounded card. */
  .book-card.seeking::before {
    content: '';
    position: absolute;
    top: var(--s-3);
    left: var(--s-3);
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--st-seeking-fg);
    z-index: 1;
  }

  /* Nudge the cover clear of the corner tick so the tick reads as a card pin,
     not a smudge on the cover. */
  .book-card.seeking .cover {
    margin-top: var(--s-2);
  }

  .book-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-2);
    border-color: var(--hairline-strong);
  }

  .cover {
    width: 52px;
    height: 78px;
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
    font-size: 1.4rem;
    font-weight: 500;
    color: var(--accent);
  }

  .book-card :global(.book-detail) {
    flex: 1;
    min-width: 0;
  }
</style>
