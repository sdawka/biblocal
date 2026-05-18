<script lang="ts">
  import { onMount } from 'svelte';
  import {
    connectionRequests,
    incomingRequests,
    loadConnections,
    respondToRequest,
    connectionsLoading,
  } from '../stores/connections';
  import type { ConnectionRequest } from '../lib/types';

  let incoming = $state<ConnectionRequest[]>([]);
  let loading = $state(false);
  let responding = $state<string | null>(null);

  $effect(() =>
    incomingRequests.subscribe((r) => {
      incoming = r;
    })
  );

  $effect(() =>
    connectionsLoading.subscribe((l) => {
      loading = l;
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
  <section class="connection-requests">
    <h2>Connection Requests ({incoming.length})</h2>
    <div class="requests-list">
      {#each incoming as request (request.id)}
        <div class="request-card">
          <div class="request-info">
            <span class="from-name">{request.fromUser?.name || 'Someone'}</span>
            <span class="from-city">{request.fromUser?.city || ''}</span>
          </div>
          <div class="request-actions">
            <button
              class="btn-accept"
              onclick={() => handleRespond(request.id, 'accepted')}
              disabled={responding === request.id}
            >
              {responding === request.id ? '...' : 'Accept'}
            </button>
            <button
              class="btn-decline"
              onclick={() => handleRespond(request.id, 'declined')}
              disabled={responding === request.id}
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
    padding: 1.5rem;
    background: var(--color-cream);
    border: 1px solid var(--color-gold-pale);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-card);
    margin-bottom: 1.25rem;
  }

  h2 {
    margin: 0 0 1rem;
    font-family: var(--font-display);
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-ink);
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--color-gold-pale);
  }

  .requests-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .request-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background: var(--color-paper);
    border: 1px solid var(--color-gold-pale);
    border-radius: var(--radius-sm);
  }

  .request-info {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .from-name {
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 500;
    color: var(--color-ink);
  }

  .from-city {
    font-family: var(--font-body);
    font-size: 0.85rem;
    color: var(--color-ink-faded);
  }

  .request-actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn-accept,
  .btn-decline {
    padding: 0.375rem 0.75rem;
    font-family: var(--font-display);
    font-size: 0.85rem;
    font-weight: 500;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--transition-quick);
  }

  .btn-accept {
    color: var(--color-cream);
    background: var(--color-forest);
    border: 1px solid var(--color-forest);
  }

  .btn-accept:hover:not(:disabled) {
    background: #1a6b1a;
  }

  .btn-decline {
    color: var(--color-ink);
    background: var(--color-paper);
    border: 1px solid var(--color-gold-pale);
  }

  .btn-decline:hover:not(:disabled) {
    border-color: var(--color-burgundy);
    color: var(--color-burgundy);
  }

  .btn-accept:disabled,
  .btn-decline:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
