<script lang="ts">
  import MatchMapIsland from './MatchMapIsland.svelte';
  import type { Lang } from '../i18n';
  let { lang = 'en' as Lang }: { lang?: Lang } = $props();
</script>

<MatchMapIsland {lang} />
