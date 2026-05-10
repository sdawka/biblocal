<script lang="ts">
  import type { Book, BookIntent, BookVisibility, BookOwnership } from '../lib/types';

  interface Props {
    book: Book;
    onIntentsChange?: (intents: BookIntent[]) => void;
    onVisibilityChange?: (visibility: BookVisibility) => void;
    onOwnershipChange?: (ownership: BookOwnership) => void;
    readonly?: boolean;
  }

  let { book, onIntentsChange, onVisibilityChange, onOwnershipChange, readonly = false }: Props = $props();

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
          <button class="badge intent active" onclick={() => toggleIntent(intent)}>
            {INTENT_LABELS[intent]} ✕
          </button>
        {/if}
      {/each}
    </div>

    {#if book.addedVia === 'scan'}
      <span class="verified" title="Added via ISBN scan">✓</span>
    {/if}
  </div>
</article>

<style>
  .book-card {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    background: var(--color-cream);
    border: 1px solid var(--color-gold-pale);
    border-radius: var(--radius-md);
    position: relative;
    box-shadow: var(--shadow-card);
    transition: all var(--transition-gentle);
  }

  .book-card.seeking {
    border-left: 3px solid var(--color-burgundy);
  }

  /* Subtle corner dots */
  .book-card::before,
  .book-card::after {
    content: '';
    position: absolute;
    width: 3px;
    height: 3px;
    background: var(--color-gold);
    border-radius: 50%;
    opacity: 0.25;
    transition: opacity var(--transition-gentle);
  }

  .book-card::before {
    top: 6px;
    left: 6px;
  }

  .book-card::after {
    bottom: 6px;
    right: 6px;
  }

  .book-card:hover {
    box-shadow: var(--shadow-lifted);
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
</style>
