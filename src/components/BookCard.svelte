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

  // Mirror BookSpine: fold visual status (edge tick, dots, lock) into the
  // accessible name so the button reads the same as the card looks.
  const statusSuffix = $derived.by(() => {
    const parts: string[] = [];
    if (book.ownership === 'seeking') parts.push(t.seeking);
    if (book.visibility === 'private') parts.push(t.private);
    if (book.intents.length > 0) {
      parts.push(book.intents.map((intent) => intentLabels[intent]).join(', '));
    }
    return parts.length > 0 ? ` — ${parts.join(' · ')}` : '';
  });
  const openLabel = $derived(t.openDetailAria.replace('{title}', book.title) + statusSuffix);
</script>

<button
  class="book-card card"
  class:seeking={book.ownership === 'seeking'}
  data-book-id={book.id}
  onclick={() => onOpen(book.id)}
  aria-label={openLabel}
  aria-haspopup="dialog"
>
  {#if book.coverUrl}
    <img src={book.coverUrl} alt="" class="cover" width="52" height="78" loading="lazy" decoding="async" />
  {:else}
    <span class="cover placeholder" aria-hidden="true">
      <span>{book.title.charAt(0)}</span>
    </span>
  {/if}

  <span class="info">
    <span class="title serif">{book.title}</span>
    <span class="author muted">{book.author}</span>
    <span class="meta" aria-hidden="true">
      {#if book.ownership === 'seeking'}
        <span class="dot" data-status="seeking"></span>
      {/if}
      {#each book.intents as intent}
        <span class="dot" data-status={intent}></span>
      {/each}
      {#if book.visibility === 'private'}
        <svg class="lock" width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2.5" y="5.5" width="7" height="5" rx="1" />
          <path d="M4 5.5V4a2 2 0 0 1 4 0v1.5" />
        </svg>
      {/if}
    </span>
  </span>
</button>

<style>
  .book-card {
    display: flex;
    align-items: flex-start;
    gap: var(--s-3);
    width: 100%;
    height: 102px; /* 78px cover + 2 × var(--s-3) padding: every card identical */
    padding: var(--s-3);
    text-align: left;
    cursor: pointer;
    overflow: hidden;
    touch-action: pan-y;
  }

  .book-card.seeking {
    border-left-color: var(--hairline);
    background: color-mix(in oklch, var(--st-seeking-bg) 40%, var(--surface));
  }

  .book-card:hover,
  .book-card:focus-visible {
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

  .info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
  }

  .title {
    font-size: 0.9375rem;
    font-weight: 500;
    color: var(--ink);
    line-height: 1.28;
    letter-spacing: -0.01em;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .author {
    font-size: 0.8125rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .meta {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: auto;
    color: var(--ink-faint);
  }

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
  }

  .dot[data-status='borrowable'] { background: var(--st-borrowable-fg); }
  .dot[data-status='discussable'] { background: var(--st-discussable-fg); }
  .dot[data-status='giftable'] { background: var(--st-giftable-fg); }
  .dot[data-status='seeking'] { background: var(--st-seeking-fg); }

  .lock {
    display: block;
  }

  @media (prefers-reduced-motion: reduce) {
    .book-card:hover,
    .book-card:focus-visible {
      transform: none;
    }
  }
</style>
