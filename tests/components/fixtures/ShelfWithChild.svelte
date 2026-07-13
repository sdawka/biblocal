<!-- Test-only wrapper: Shelf.svelte's public API is a default <slot />, and
     @testing-library/svelte has no first-class way to pass slotted content to
     a component under test directly, so this fixture supplies it. -->
<script lang="ts">
  import Shelf from '../../../src/components/Shelf.svelte';
</script>

<Shelf>
  <div data-testid="slotted-child">hello</div>
</Shelf>
