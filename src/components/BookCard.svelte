<script lang="ts">
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

<article class="book-card" class:seeking={book.ownership === 'seeking'}>
  {#if book.coverUrl}
    <img src={book.coverUrl} alt="{book.title} cover" class="cover" />
  {:else}
    <div class="cover placeholder">
      <span>{book.title.charAt(0)}</span>
    </div>
  {/if}

  <div class="info">
    <h3 class="title">{book.title}</h3>
    <p class="author">{book.author}</p>

    <div class="badges">
      {#if book.ownership === 'seeking'}
        <span class="badge seeking">Seeking</span>
      {/if}
      {#if book.visibility === 'private'}
        <span class="badge private">Private</span>
      {/if}
      {#each book.intents as intent}
        {#if readonly}
          <span class="badge intent">{INTENT_LABELS[intent]}</span>
        {:else}
          <button
            class="badge intent active"
            onclick={() => toggleIntent(intent)}
            aria-label="Remove {INTENT_LABELS[intent]} intent from {book.title}"
          >
            {INTENT_LABELS[intent]} ✕
          </button>
        {/if}
      {/each}
    </div>

    {#if book.addedVia === 'scan'}
      <span class="verified" title="Added via ISBN scan">✓</span>
    {/if}
  </div>

  {#if !readonly && onDelete}
    <button
      class="delete-btn"
      onclick={handleDeleteClick}
      aria-label="Delete {book.title} from shelf"
    >
      ✕
    </button>

    {#if showDeleteConfirm}
      <div class="delete-confirm">
        <p>Remove from shelf?</p>
        <div class="delete-actions">
          <button class="btn-cancel" onclick={cancelDelete}>Cancel</button>
          <button class="btn-remove" onclick={confirmDelete}>Remove</button>
        </div>
      </div>
    {/if}
  {/if}
</article>

<style>
  .book-card {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    background: var(--color-cream);
    background-image: var(--texture-paper-fine), var(--texture-aged);
    border: 1px solid var(--color-gold-pale);
    border-radius: var(--radius-md);
    position: relative;
    box-shadow: var(--shadow-resting);
    transition: all var(--transition-gentle);
  }

  .book-card.seeking {
    border-left: 3px solid var(--color-burgundy);
  }

  .book-card::before,
  .book-card::after {
    content: '';
    position: absolute;
    width: 10px;
    height: 10px;
    border: 1px solid var(--color-gold);
    opacity: 0;
    transition: opacity var(--transition-gentle);
    pointer-events: none;
  }

  .book-card::before {
    top: 6px;
    left: 6px;
    border-right: none;
    border-bottom: none;
  }

  .book-card::after {
    bottom: 6px;
    right: 6px;
    border-left: none;
    border-top: none;
  }

  .book-card:hover {
    box-shadow: var(--shadow-hover);
    transform: translateY(-2px);
    border-color: var(--color-gold);
  }

  .book-card:hover::before,
  .book-card:hover::after {
    opacity: 0.5;
  }

  .cover {
    width: 60px;
    height: 90px;
    object-fit: cover;
    border-radius: 2px;
    flex-shrink: 0;
    box-shadow: 2px 2px 6px rgba(44, 24, 16, 0.2);
  }

  .cover.placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(
      to bottom,
      var(--color-mahogany-light),
      var(--color-mahogany)
    );
    font-family: var(--font-display);
    font-size: 1.75rem;
    font-weight: 600;
    font-style: italic;
    color: var(--color-gold);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }

  .info {
    flex: 1;
    min-width: 0;
  }

  .title {
    margin: 0 0 0.25rem;
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-ink);
    line-height: 1.3;
  }

  .author {
    margin: 0 0 0.625rem;
    font-family: var(--font-body);
    font-size: 0.875rem;
    font-style: italic;
    color: var(--color-ink-faded);
  }

  .badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .badge {
    display: inline-block;
    padding: 0.15rem 0.4rem;
    font-family: var(--font-display);
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    border-radius: 2px;
    border: none;
    cursor: default;
  }

  .badge.seeking {
    background: var(--color-burgundy);
    color: var(--color-cream);
  }

  .badge.private {
    background: var(--color-ink-faded);
    color: var(--color-cream);
  }

  .badge.intent {
    background: var(--color-gold-pale);
    color: var(--color-forest-dark);
  }

  .badge.intent.active {
    cursor: pointer;
    transition: opacity var(--transition-quick);
    min-height: 44px;
    min-width: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .badge.intent.active:hover {
    opacity: 0.8;
  }

  button.badge {
    font-family: inherit;
  }

  .verified {
    margin-left: 0.5rem;
    color: var(--color-forest);
    font-size: 0.9rem;
  }

  .delete-btn {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
    color: var(--color-ink-faded);
    background: var(--color-cream);
    border: 1px solid var(--color-gold-pale);
    border-radius: 50%;
    cursor: pointer;
    opacity: 0;
    transition: all var(--transition-quick);
    z-index: 2;
  }

  .book-card:hover .delete-btn {
    opacity: 1;
  }

  .delete-btn:hover {
    color: var(--color-cream);
    background: var(--color-burgundy);
    border-color: var(--color-burgundy-dark);
  }

  .delete-confirm {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    background: rgba(253, 250, 243, 0.95);
    border-radius: var(--radius-md);
    z-index: 3;
  }

  .delete-confirm p {
    margin: 0;
    font-family: var(--font-display);
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--color-ink);
  }

  .delete-actions {
    display: flex;
    gap: 0.5rem;
  }

  .delete-confirm .btn-cancel {
    padding: 0.5rem 1rem;
    font-family: var(--font-display);
    font-size: 0.85rem;
    color: var(--color-ink-faded);
    background: var(--color-paper);
    border: 1px solid var(--color-gold-pale);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--transition-quick);
  }

  .delete-confirm .btn-cancel:hover {
    border-color: var(--color-gold);
    color: var(--color-ink);
  }

  .delete-confirm .btn-remove {
    padding: 0.5rem 1rem;
    font-family: var(--font-display);
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-cream);
    background: var(--color-burgundy);
    border: 1px solid var(--color-burgundy-dark);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--transition-quick);
  }

  .delete-confirm .btn-remove:hover {
    background: var(--color-burgundy-dark);
  }
</style>
