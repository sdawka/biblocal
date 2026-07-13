<script lang="ts">
  import type { Book } from '../lib/types';
  import { useTranslations, type Lang } from '../i18n';

  interface Props {
    book: Book;
    lang?: Lang;
    onOpen: (id: string) => void;
  }

  let { book, lang = 'en' as Lang, onOpen }: Props = $props();

  const t = $derived(useTranslations(lang).shelf.card);
  const intentLabels = $derived(useTranslations(lang).shelf.intents.labels);

  // Sighted users see seeking/intent status via the edge tick + peek dots;
  // fold the same status into the accessible name, mirroring BookDetail.
  const statusSuffix = $derived.by(() => {
    const parts: string[] = [];
    if (book.ownership === 'seeking') parts.push(t.seeking);
    if (book.intents.length > 0) {
      parts.push(book.intents.map((intent) => intentLabels[intent]).join(', '));
    }
    return parts.length > 0 ? ` — ${parts.join(' · ')}` : '';
  });
  const openLabel = $derived(t.openDetailAria.replace('{title}', book.title) + statusSuffix);
</script>

<button
  class="spine"
  class:no-cover={!book.coverUrl}
  class:seeking={book.ownership === 'seeking'}
  data-book-id={book.id}
  onclick={() => onOpen(book.id)}
  aria-label={openLabel}
  aria-haspopup="dialog"
>
  {#if book.coverUrl}
    <img class="cover" src={book.coverUrl} alt="" width="300" height="450" loading="lazy" decoding="async" />
  {:else}
    <span class="binding">
      <span class="binding-title serif">{book.title}</span>
      <span class="binding-author muted">{book.author}</span>
    </span>
  {/if}
  <span class="peek" aria-hidden="true">
    <span class="peek-title serif">{book.title}</span>
    <span class="peek-author">{book.author}</span>
    <span class="peek-dots">
      {#each book.intents as intent}
        <span class="dot" data-status={intent}></span>
      {/each}
    </span>
  </span>
</button>

<style>
  .spine {
    position: relative;
    aspect-ratio: 2 / 3;
    width: 100%;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    border-radius: 2px var(--r-sm) var(--r-sm) 2px;
    box-shadow: var(--shadow-3);
    overflow: hidden;
    transition: transform var(--dur-2) var(--ease-spring), box-shadow var(--dur-2) var(--ease-out);
  }

  /* Spine gutter: a dark gradient down the left binding edge. */
  .spine::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    width: 6px;
    background: linear-gradient(to right, oklch(0 0 0 / 0.35), transparent);
    z-index: 2;
    pointer-events: none;
  }

  /* Fore-edge: repeating page-lines down the right edge. */
  .spine::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 3px;
    background: repeating-linear-gradient(
      to bottom,
      oklch(1 0 0 / 0.5) 0,
      oklch(1 0 0 / 0.5) 1px,
      oklch(0 0 0 / 0.08) 1px,
      oklch(0 0 0 / 0.08) 3px
    );
    z-index: 2;
    pointer-events: none;
  }

  .spine:hover,
  .spine:focus-visible {
    transform: translateY(-4px);
    box-shadow: var(--shadow-4);
  }

  .spine .cover {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .spine.no-cover {
    background: var(--accent-tint);
  }

  .binding {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: var(--s-2);
    padding: var(--s-3);
    color: var(--accent);
    text-align: left;
  }

  .binding-title {
    font-size: 0.9375rem;
    font-weight: 500;
    line-height: 1.25;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .binding-author {
    font-size: 0.75rem;
  }

  .peek {
    position: absolute;
    inset: auto 0 0 0;
    z-index: 3;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: var(--s-2) var(--s-3) var(--s-3);
    color: #fff;
    background: linear-gradient(to top, oklch(0 0 0 / 0.78), oklch(0 0 0 / 0.5) 55%, transparent);
    opacity: 0;
    transform: translateY(4px);
    transition: opacity var(--dur-2) var(--ease-out), transform var(--dur-2) var(--ease-out);
  }

  .spine:hover .peek,
  .spine:focus-visible .peek {
    opacity: 1;
    transform: translateY(0);
  }

  .peek-title {
    font-size: 0.8125rem;
    font-weight: 500;
    line-height: 1.25;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .peek-author {
    font-size: 0.6875rem;
    opacity: 0.85;
  }

  .peek-dots {
    display: flex;
    gap: 4px;
    margin-top: 2px;
  }

  .peek-dots .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
  }

  .peek-dots .dot[data-status="borrowable"] { background: var(--st-borrowable-fg); }
  .peek-dots .dot[data-status="discussable"] { background: var(--st-discussable-fg); }
  .peek-dots .dot[data-status="giftable"] { background: var(--st-giftable-fg); }

  /* Seeking cue that survives without hover. */
  .spine.seeking::before {
    box-shadow: inset 3px 0 0 var(--st-seeking-fg);
  }

  /* Touch devices have no hover precision — the peek relies on tap→sheet. */
  @media (hover: none) {
    .peek {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .spine {
      transition: none;
    }
    .peek {
      transform: none;
    }
  }
</style>
