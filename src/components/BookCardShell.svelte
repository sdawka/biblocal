<script lang="ts">
  import type { Snippet } from 'svelte';

  // Shared compact book-card surface: cover (or placeholder) + caller content.
  // Two render modes, one look:
  //  - with `onOpen`: an interactive <button> that opens the detail sheet
  //    (Biblio shelf) — fixed height so every card in the grid is identical.
  //  - without `onOpen`: a read-only <article> (store pages show other
  //    people's books, so there is no click-to-open contract there).
  interface Props {
    bookId: string;
    title: string;
    coverUrl?: string;
    /** Alt text for the cover image. Interactive cards keep it empty — the
        accessible name lives on the button, not the image. */
    coverAlt?: string;
    seeking?: boolean;
    onOpen?: () => void;
    ariaLabel?: string;
    children: Snippet;
  }

  let {
    bookId,
    title,
    coverUrl,
    coverAlt = '',
    seeking = false,
    onOpen,
    ariaLabel,
    children,
  }: Props = $props();
</script>

{#snippet content()}
  {#if coverUrl}
    <img src={coverUrl} alt={coverAlt} class="cover" width="52" height="78" loading="lazy" decoding="async" />
  {:else}
    <span class="cover placeholder" aria-hidden={onOpen ? 'true' : undefined}>
      <span>{title.charAt(0)}</span>
    </span>
  {/if}
  {@render children()}
{/snippet}

{#if onOpen}
  <button
    class="book-card card"
    class:seeking
    data-book-id={bookId}
    onclick={onOpen}
    aria-label={ariaLabel}
    aria-haspopup="dialog"
  >
    {@render content()}
  </button>
{:else}
  <article class="book-card card" class:seeking data-book-id={bookId}>
    {@render content()}
  </article>
{/if}

<style>
  .book-card {
    display: flex;
    gap: var(--s-3);
    padding: var(--s-3);
    overflow: hidden;
    touch-action: pan-y;
  }

  button.book-card {
    align-items: flex-start;
    width: 100%;
    height: 102px; /* 78px cover + 2 × var(--s-3) padding: every card identical */
    text-align: left;
    cursor: pointer;
  }

  article.book-card {
    position: relative;
  }

  .book-card.seeking {
    border-left-color: var(--hairline);
    background: color-mix(in oklch, var(--st-seeking-bg) 40%, var(--surface));
  }

  /* Read-only cards have no status-dot meta row, so seeking gets an explicit
     corner dot instead. */
  article.book-card.seeking::before {
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

  article.book-card.seeking .cover {
    margin-top: var(--s-2);
  }

  .book-card:hover,
  button.book-card:focus-visible {
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

  @media (prefers-reduced-motion: reduce) {
    button.book-card:hover,
    button.book-card:focus-visible {
      transform: none;
    }
  }
</style>
