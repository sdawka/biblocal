<script lang="ts">
  import { shelf } from '../stores/shelf';
  import ShelfIsland from './ShelfIsland.svelte';
  import EmptyShelfIsland from './EmptyShelfIsland.svelte';
  import type { Lang } from '../i18n';

  let { lang = 'en' as Lang } = $props();

  let isEmpty = $state(true);

  $effect(() => {
    const unsub = shelf.subscribe((s) => {
      isEmpty = Object.keys(s).length === 0;
    });
    return unsub;
  });
</script>

{#if isEmpty}
  <EmptyShelfIsland {lang} />
{:else}
  <ShelfIsland {lang} />
{/if}
