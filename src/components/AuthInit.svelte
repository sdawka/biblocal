<script lang="ts">
  import { onMount } from 'svelte';
  import { onUserChange } from '../stores/auth';

  interface Props {
    userId: string;
  }

  let { userId }: Props = $props();

  onMount(() => {
    onUserChange(userId);
  });
</script>
