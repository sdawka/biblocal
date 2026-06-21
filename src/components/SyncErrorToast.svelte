<script lang="ts">
  import { syncError, clearSyncError } from '../stores/sync-status';
</script>

{#if $syncError}
  <div class="sync-toast rise" role="alert">
    <p class="sync-toast-msg">{$syncError}</p>
    <button
      type="button"
      class="sync-toast-close"
      aria-label="Dismiss"
      onclick={clearSyncError}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
        <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" />
      </svg>
    </button>
  </div>
{/if}

<style>
  .sync-toast {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    padding: var(--s-4) var(--s-5);
    margin-bottom: var(--s-5);
    background: var(--danger-tint);
    border: 1px solid var(--hairline);
    border-left: 3px solid var(--danger);
    border-radius: var(--r-lg);
    box-shadow: var(--shadow-1);
  }

  .sync-toast-msg {
    flex: 1;
    margin: 0;
    font-family: var(--font-ui);
    font-size: 0.9375rem;
    line-height: 1.4;
    color: var(--ink);
  }

  .sync-toast-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    color: var(--ink-muted);
    background: transparent;
    border: none;
    border-radius: var(--r-full);
    cursor: pointer;
    transition: color var(--dur-2) var(--ease-out), background var(--dur-2) var(--ease-out);
  }

  .sync-toast-close:hover {
    color: var(--ink);
    background: var(--surface);
  }
</style>
