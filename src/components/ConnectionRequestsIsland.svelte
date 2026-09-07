<script lang="ts">
  import { onMount } from 'svelte';
  import {
    acceptedConnections,
    authorizedContacts,
    connectionsError,
    incomingRequests,
    loadAuthorizedContact,
    loadConnections,
    respondToRequest,
  } from '../stores/connections';
  import { currentUserId } from '../stores/auth';
  import type { ConnectionRequest } from '../lib/types';
  import { safeExternalUrl } from '../lib/url';
  import { useTranslations, type Lang } from '../i18n';

  let { lang = 'en' as Lang }: { lang?: Lang } = $props();
  const t = $derived(useTranslations(lang).matches.requests);
  const cardT = $derived(useTranslations(lang).matches.card);

  // readonly: mirrors the nanostore's readonly array; never mutated here.
  let incoming = $state<readonly ConnectionRequest[]>([]);
  let accepted = $state<readonly ConnectionRequest[]>([]);
  let contacts = $state($authorizedContacts);
  let connectionError = $state(connectionsError.get());
  let responding = $state<string | null>(null);
  let contactLoading = $state<string | null>(null);
  // requestId -> error message for a failed accept/decline.
  let respondErrors = $state<Record<string, string>>({});

  $effect(() =>
    incomingRequests.subscribe((r) => {
      incoming = r;
    })
  );
  $effect(() => acceptedConnections.subscribe((r) => (accepted = r)));
  $effect(() => authorizedContacts.subscribe((c) => (contacts = c)));
  $effect(() => connectionsError.subscribe((error) => (connectionError = error)));
  $effect(() => currentUserId.subscribe(() => (contactLoading = null)));

  onMount(() => {
    loadConnections({ retries: 1 });
  });

  async function handleRespond(requestId: string, status: 'accepted' | 'declined') {
    responding = requestId;
    // Clear any prior error for this request before retrying.
    const { [requestId]: _cleared, ...rest } = respondErrors;
    respondErrors = rest;
    const result = await respondToRequest(requestId, status);
    responding = null;
    if (!result.success) {
      respondErrors = {
        ...respondErrors,
        [requestId]: t.couldNotRespond,
      };
    }
  }

  function otherPerson(request: ConnectionRequest) {
    return request.fromUserId === currentUserId.get() ? request.toUser : request.fromUser;
  }

  async function handleViewContact(request: ConnectionRequest) {
    const person = otherPerson(request);
    if (!person || contactLoading === person.id) return;
    const { [request.id]: _cleared, ...rest } = respondErrors;
    respondErrors = rest;
    const viewerId = currentUserId.get();
    contactLoading = person.id;
    const result = await loadAuthorizedContact(person.id);
    if (currentUserId.get() !== viewerId) return;
    contactLoading = null;
    if (!result.success) {
      respondErrors = { ...respondErrors, [request.id]: cardT.contactUnavailable };
    }
  }

  function retryConnections() {
    loadConnections({ retries: 1 });
  }
</script>

{#if incoming.length > 0 || accepted.length > 0 || connectionError}
  <section class="connection-requests card rise">
    <h2 class="serif">{t.title} <span class="count-tag">{incoming.length + accepted.length}</span></h2>
    {#if connectionError}
      <div class="connection-load-error" role="alert">
        <p>{t.couldNotLoad}</p>
        <button class="btn btn-sm" type="button" onclick={retryConnections}>{t.retry}</button>
      </div>
    {/if}
    <div class="requests-list">
      {#each incoming as request (request.id)}
        <div class="request-card card">
          <div class="request-info">
            <span class="from-name serif">{request.fromUser?.name || t.someone}</span>
            {#if request.fromUser?.city}
              <span class="from-city muted">{request.fromUser.city}</span>
            {/if}
          </div>
          <div class="request-actions">
            <button
              class="btn btn-filled btn-sm"
              onclick={() => handleRespond(request.id, 'accepted')}
              disabled={responding === request.id}
              aria-label={t.acceptAria.replace('{name}', request.fromUser?.name || t.someone)}
            >
              {responding === request.id ? '…' : t.accept}
            </button>
            <button
              class="btn btn-sm btn-decline"
              onclick={() => handleRespond(request.id, 'declined')}
              disabled={responding === request.id}
              aria-label={t.declineAria.replace('{name}', request.fromUser?.name || t.someone)}
            >
              {t.decline}
            </button>
          </div>
          {#if respondErrors[request.id]}
            <p class="respond-error" role="alert">{respondErrors[request.id]}</p>
          {/if}
        </div>
      {/each}
      {#each accepted as request (request.id)}
        {@const person = otherPerson(request)}
        {#if person}
          {@const contact = contacts[person.id]}
          <div class="request-card card accepted-card">
            <div class="request-info">
              <span class="from-name serif">{person.name || t.someone}</span>
              {#if person.city}
                <span class="from-city muted">{person.city}</span>
              {/if}
            </div>
            <div class="request-actions">
              {#if contact}
                {#if contact.method === 'email'}
                  <a class="btn btn-filled btn-sm" href={`mailto:${contact.value}`}>📧 {contact.value}</a>
                {:else if safeExternalUrl(contact.value)}
                  <a class="btn btn-filled btn-sm" href={safeExternalUrl(contact.value)} target="_blank" rel="noopener noreferrer">{contact.value}</a>
                {:else}
                  <span class="contact-value">{contact.value}</span>
                {/if}
              {:else}
                <button
                  class="btn btn-filled btn-sm"
                  onclick={() => handleViewContact(request)}
                  disabled={contactLoading === person.id}
                  aria-busy={contactLoading === person.id}
                >
                  {contactLoading === person.id ? cardT.loadingContact : cardT.viewContact}
                </button>
              {/if}
            </div>
            {#if respondErrors[request.id]}
              <p class="respond-error" role="alert">{respondErrors[request.id]}</p>
            {/if}
          </div>
        {/if}
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

  .connection-load-error {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--s-3);
    margin-bottom: var(--s-3);
    padding: var(--s-3);
    border: 1px solid var(--danger);
    border-radius: var(--r-md);
    color: var(--danger);
  }

  .connection-load-error p { margin: 0; font-family: var(--font-ui); font-size: 0.875rem; }

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

  .accepted-card {
    border-left: 3px solid var(--accent);
  }

  .contact-value {
    font-family: var(--font-ui);
    font-size: 0.875rem;
    color: var(--ink);
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

  .respond-error {
    flex-basis: 100%;
    margin: var(--s-2) 0 0;
    font-family: var(--font-ui);
    font-size: 0.8rem;
    color: var(--danger);
  }
</style>
