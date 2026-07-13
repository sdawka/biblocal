<script lang="ts">
  import type { LocalBook } from '../lib/types';
  import { formatDistance } from '../lib/geo';
  import type { Lang } from '../i18n';

  let { row, lang = 'en' as Lang }: { row: LocalBook; lang?: Lang } = $props();
  let open = $state(false);
</script>

<article class="book-row" class:taste={row.isTasteMatch}>
  <button class="row-main" type="button" onclick={() => (open = !open)}>
    {#if row.book.coverUrl}
      <img class="cover" src={row.book.coverUrl} alt="" loading="lazy" />
    {:else}
      <span class="cover placeholder" aria-hidden="true">📖</span>
    {/if}
    <span class="meta">
      <span class="title">{row.book.title}</span>
      <span class="author">{row.book.author}</span>
      <span class="owner">
        {row.owner.name}
        {#if row.distanceKm != null}· {formatDistance(row.distanceKm)}{/if}
        {#if row.isTasteMatch}· <span class="star">★ fit</span>{/if}
      </span>
    </span>
  </button>
  {#if open}
    <div class="row-detail">
      <a class="btn btn-sm" href={`/local?owner=${row.owner.id}`}>See {row.owner.name}'s shelf</a>
    </div>
  {/if}
</article>

<style>
  .book-row { border-bottom: 1px solid var(--hairline); }
  .row-main { display: flex; gap: var(--s-3); align-items: center; width: 100%; padding: var(--s-3) 0; background: none; border: none; text-align: left; cursor: pointer; }
  .cover { width: 40px; height: 60px; object-fit: cover; border-radius: var(--r-sm); }
  .cover.placeholder { display: inline-flex; align-items: center; justify-content: center; font-size: 1.5rem; background: var(--surface-sunken); }
  .meta { display: flex; flex-direction: column; gap: 2px; }
  .title { font-weight: 590; color: var(--ink); }
  .author, .owner { font-size: 0.85rem; color: var(--ink-muted); }
  .star { color: var(--accent); }
  .row-detail { padding: 0 0 var(--s-3); }
</style>
