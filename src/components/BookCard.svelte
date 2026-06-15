<script lang="ts">
  import { Spring } from 'svelte/motion';
  import type { Book, BookIntent, BookVisibility, BookOwnership } from '../lib/types';

  interface Props {
    book: Book;
    onIntentsChange?: (intents: BookIntent[]) => void;
    onVisibilityChange?: (visibility: BookVisibility) => void;
    onOwnershipChange?: (ownership: BookOwnership) => void;
    onDelete?: (id: string) => void;
    readonly?: boolean;
  }

  let { book, onIntentsChange, onVisibilityChange, onOwnershipChange, onDelete, readonly = false }: Props = $props();

  let showDeleteConfirm = $state(false);

  // Physical, interruptible swipe offset.
  const swipe = new Spring(0, { stiffness: 0.18, damping: 0.72 });
  let swipeOpen = $state(false);
  let startX = 0;
  let isSwiping = false;
  const SWIPE_THRESHOLD = 80;

  function handleTouchStart(e: TouchEvent) {
    if (readonly || !onDelete) return;
    startX = e.touches[0].clientX;
    isSwiping = true;
  }

  function handleTouchMove(e: TouchEvent) {
    if (!isSwiping) return;
    const currentX = e.touches[0].clientX;
    const diff = startX - currentX;
    // Only allow left swipe, cap at threshold
    const next = Math.min(Math.max(diff, 0), SWIPE_THRESHOLD);
    swipe.set(next, { instant: true });
  }

  function handleTouchEnd() {
    if (!isSwiping) return;
    isSwiping = false;
    // Snap to threshold or back to 0
    if (swipe.current >= SWIPE_THRESHOLD * 0.6) {
      swipe.set(SWIPE_THRESHOLD);
      swipeOpen = true;
    } else {
      swipe.set(0);
      swipeOpen = false;
    }
  }

  function handleSwipeDelete() {
    onDelete?.(book.id);
    swipe.set(0);
    swipeOpen = false;
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

  const INTENT_LABELS: Record<BookIntent, string> = {
    borrowable: 'Lend',
    discussable: 'Discuss',
    giftable: 'Gift',
    'class-resource': 'Class',
  };

  function toggleIntent(intent: BookIntent) {
    const newIntents = book.intents.includes(intent)
      ? book.intents.filter(i => i !== intent)
      : [...book.intents, intent];
    onIntentsChange?.(newIntents);
  }
</script>

<article
  class="book-card card"
  class:seeking={book.ownership === 'seeking'}
  class:swiping={swipeOpen || swipe.current > 0}
  data-book-id={book.id}
  ontouchstart={handleTouchStart}
  ontouchmove={handleTouchMove}
  ontouchend={handleTouchEnd}
  ontouchcancel={() => { isSwiping = false; swipe.set(0); swipeOpen = false; }}
  style="transform: translateX(-{swipe.current}px)"
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
        <span class="pill" data-status="seeking-home">Seeking</span>
      {/if}
      {#if book.visibility === 'private'}
        <span class="pill" data-status="private">Private</span>
      {/if}
      {#each book.intents as intent}
        {#if readonly}
          <span class="pill" data-status={intent}>{INTENT_LABELS[intent]}</span>
        {:else}
          <button
            class="pill pill-button"
            data-status={intent}
            onclick={() => toggleIntent(intent)}
            aria-label="Remove {INTENT_LABELS[intent]} intent from {book.title}"
          >
            {INTENT_LABELS[intent]}
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
      <span class="verified" title="Added via ISBN scan" aria-label="Added via ISBN scan">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M13.5 4.5 6 12 2.5 8.5" />
        </svg>
      </span>
    {/if}
  </div>

  {#if !readonly && onDelete}
    <button
      class="delete-btn"
      onclick={handleDeleteClick}
      aria-label="Delete {book.title} from shelf"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
        <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" />
      </svg>
    </button>

    {#if showDeleteConfirm}
      <div class="delete-confirm glass">
        <p class="serif">Remove from shelf?</p>
        <div class="delete-actions">
          <button class="btn btn-outline btn-sm" onclick={cancelDelete}>Cancel</button>
          <button class="btn btn-filled btn-sm btn-remove" onclick={confirmDelete}>Remove</button>
        </div>
      </div>
    {/if}
  {/if}

  {#if !readonly && onDelete && swipe.current > 0}
    <button
      class="swipe-delete"
      style="width: {swipe.current}px"
      onclick={handleSwipeDelete}
      aria-label="Delete {book.title}"
    >
      Delete
    </button>
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

  .book-card:hover:not(.swiping) {
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

  .swipe-delete {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-ui);
    font-size: 0.875rem;
    font-weight: 590;
    color: var(--danger-on);
    background: var(--danger);
    border: none;
    border-radius: 0 var(--r-lg) var(--r-lg) 0;
    cursor: pointer;
    min-width: 60px;
  }

  @media (prefers-reduced-motion: reduce) {
    .book-card { transition: none; }
  }
</style>
