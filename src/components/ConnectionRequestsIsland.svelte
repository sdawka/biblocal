<script lang="ts">
  import { onMount } from 'svelte';
  import {
    incomingRequests,
    loadConnections,
    respondToRequest,
  } from '../stores/connections';
  import type { ConnectionRequest } from '../lib/types';

  let incoming = $state<ConnectionRequest[]>([]);
  let responding = $state<string | null>(null);

  $effect(() =>
    incomingRequests.subscribe((r) => {
      incoming = r;
    })
  );

  onMount(() => {
    loadConnections();
  });

  async function handleRespond(requestId: string, status: 'accepted' | 'declined') {
    responding = requestId;
    await respondToRequest(requestId, status);
    responding = null;
  }
</script>

{#if incoming.length > 0}
  <section class="connection-requests card rise">
    <h2 class="serif">Connection Requests <span class="count-tag">{incoming.length}</span></h2>
    <div class="requests-list">
      {#each incoming as request (request.id)}
        <div class="request-card card">
          <div class="request-info">
            <span class="from-name serif">{request.fromUser?.name || 'Someone'}</span>
            {#if request.fromUser?.city}
              <span class="from-city muted">{request.fromUser.city}</span>
            {/if}
          </div>
          <div class="request-actions">
            <button
              class="btn btn-filled btn-sm"
              onclick={() => handleRespond(request.id, 'accepted')}
              disabled={responding === request.id}
              aria-label={`Accept connection request from ${request.fromUser?.name || 'Someone'}`}
            >
              {responding === request.id ? '…' : 'Accept'}
            </button>
            <button
              class="btn btn-sm btn-decline"
              onclick={() => handleRespond(request.id, 'declined')}
              disabled={responding === request.id}
              aria-label={`Decline connection request from ${request.fromUser?.name || 'Someone'}`}
            >
              Decline
            </button>
          </div>
        </div>
      {/each}
    </div>
  </section>
{/if}

<style>
  .connection-requests {
    margin-bottom: var(--s-5);
  }

  h2 {
    margin: 0 0 var(--s-4);
    font-size: 1.25rem;
    font-weight: 500;
    display: flex;
    align-items: baseline;
    gap: var(--s-2);
  }

  .count-tag {
    font-family: var(--font-ui);
    font-size: 0.8125rem;
    font-weight: 590;
    color: var(--ink-faint);
  }

  .requests-list {
    display: flex;
    flex-direction: column;
    gap: var(--s-3);
  }

  .request-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--s-3);
    flex-wrap: wrap;
    padding: var(--s-3) var(--s-4);
    background: var(--surface-sunken);
    box-shadow: none;
  }

  .request-info {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .from-name {
    font-size: 1.0625rem;
    font-weight: 500;
    color: var(--ink);
  }

  .from-city {
    font-size: 0.85rem;
  }

  .request-actions {
    display: flex;
    gap: var(--s-2);
  }

  .btn-decline {
    background: var(--danger-tint);
    color: var(--danger);
  }

  .btn-decline:hover:not(:disabled) {
    box-shadow: inset 0 0 0 1px var(--danger);
  }

  .btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
</style>
