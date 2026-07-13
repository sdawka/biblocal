<script lang="ts">
  import { discovery, discoveryBooks } from '../stores/matches';
  import { groupByIntent } from '../lib/discoveryBooks';
  import BookDiscoveryRow from './BookDiscoveryRow.svelte';
  import MatchCardIsland from './MatchCardIsland.svelte';
  import MatchMapIsland from './MatchMapIsland.svelte';
  import { loadSeedUsers } from '../stores/users';
  import { useTranslations, type Lang } from '../i18n';
  import type { LocalBook, Match } from '../lib/types';

  let { lang = 'en' as Lang }: { lang?: Lang } = $props();
  const t = $derived(useTranslations(lang).matches);

  type View = 'books' | 'people' | 'map';
  let view = $state<View>('books');
  let query = $state('');

  let books = $state<LocalBook[]>([]);
  let people = $state<Match[]>([]);
  let expandedId = $state<string | null>(null);

  // MatchMapIsland calls loadSeedUsers() itself in onMount, so this effect only
  // needs to trigger the load when the Books/People views are shown without
  // ever mounting the map — loadSeedUsers() is idempotent (guards on
  // seedUsers already populated / an in-flight fetch), so no double-load risk.
  $effect(() => {
    const u1 = discoveryBooks.subscribe((b) => (books = b));
    const u2 = discovery.subscribe((m) => (people = m));
    loadSeedUsers();
    return () => {
      u1();
      u2();
    };
  });

  const filtered = $derived(
    query.trim()
      ? books.filter((b) =>
          (b.book.title + ' ' + b.book.author)
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
      : books,
  );
  const groups = $derived(groupByIntent(filtered));
</script>

<div class="local">
  <div class="tabs" role="tablist">
    <button
      role="tab"
      aria-selected={view === 'books'}
      class:active={view === 'books'}
      onclick={() => (view = 'books')}
    >
      {t.views.books}
    </button>
    <button
      role="tab"
      aria-selected={view === 'people'}
      class:active={view === 'people'}
      onclick={() => (view = 'people')}
    >
      {t.views.people}
    </button>
    <button
      role="tab"
      aria-selected={view === 'map'}
      class:active={view === 'map'}
      onclick={() => (view = 'map')}
    >
      {t.views.map}
    </button>
  </div>

  {#if view === 'books'}
    <input class="search" type="search" placeholder="Search title or author" bind:value={query} />
    {#if groups.length === 0}
      <p class="empty">{t.empty.books}</p>
    {:else}
      {#each groups as group (group.intent)}
        <section class="group">
          <h2 class="group-head">{t.groups[group.intent]}</h2>
          {#each group.books as row (row.owner.id + row.book.id + row.intent)}
            <BookDiscoveryRow {row} {lang} />
          {/each}
        </section>
      {/each}
    {/if}
  {:else if view === 'people'}
    <div class="people">
      {#each people as match (match.user.id)}
        <MatchCardIsland
          {match}
          {lang}
          expanded={expandedId === match.user.id}
          onToggle={() => (expandedId = expandedId === match.user.id ? null : match.user.id)}
        />
      {/each}
    </div>
  {:else}
    <MatchMapIsland {lang} />
  {/if}
</div>

<style>
  .tabs {
    display: flex;
    gap: var(--s-2);
    margin-bottom: var(--s-4);
  }
  .tabs button {
    padding: 0.5rem 1rem;
    border-radius: var(--r-full);
    border: 1px solid var(--hairline-strong);
    background: var(--surface);
    color: var(--ink-muted);
    cursor: pointer;
    font-weight: 590;
  }
  .tabs button.active {
    color: var(--accent);
    border-color: var(--accent);
    background: var(--accent-tint);
  }
  .search {
    width: 100%;
    padding: 0.6rem 1rem;
    margin-bottom: var(--s-4);
    border: 1px solid var(--hairline-strong);
    border-radius: var(--r-full);
  }
  .people {
    display: flex;
    flex-direction: column;
    gap: var(--s-4);
  }
  .group-head {
    font-family: var(--font-display);
    font-size: 1.1rem;
    margin: var(--s-4) 0 var(--s-2);
  }
  .empty {
    color: var(--ink-muted);
    padding: var(--s-6) 0;
    text-align: center;
  }
</style>
