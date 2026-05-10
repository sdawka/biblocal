<script lang="ts">
  import { shelf } from '../stores/shelf';
  import ShelfIsland from './ShelfIsland.svelte';
  import EmptyShelfIsland from './EmptyShelfIsland.svelte';

  let isEmpty = $state(true);

  $effect(() => {
    const unsub = shelf.subscribe((s) => {
      isEmpty = Object.keys(s).length === 0;
    });
    return unsub;
  });
</script>

{#if isEmpty}
  <EmptyShelfIsland />
{:else}
  <ShelfIsland />
{/if}
