<script lang="ts">
  import { profile, updateProfile, deriveLendingPersonality, updateLendingPersonality, requestGeolocation, setLocationFromCity, updateContactInfo } from '../stores/profile';
  import { shelf, getInferredTopics } from '../stores/shelf';
  import type { UserProfile, ContactMethod, ContactVisibility } from '../lib/types';
  import TopicPickerIsland from './TopicPickerIsland.svelte';
  import InterestConstellation from './InterestConstellation.svelte';

  let isEditing = $state(false);
  let requestingLocation = $state(false);
  let locationError = $state('');
  let editingPersonality = $state(false);
  let personalityInput = $state('');
  let showSaved = $state(false);
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;

  function showSavedIndicator() {
    if (saveTimeout) clearTimeout(saveTimeout);
    showSaved = true;
    saveTimeout = setTimeout(() => { showSaved = false; }, 2000);
  }

  let profileData = $state<UserProfile>({
    id: '',
    name: '',
    city: '',
    radiusKm: 5,
    topics: { curated: [], freeform: [], inferred: [] },
  });

  let borrowStyle = $state('');
  let obsessions = $state('');

  // Contact fields
  let contactMethod = $state<ContactMethod | ''>('');
  let contactValue = $state('');
  let contactVisibility = $state<ContactVisibility>('hidden');

  let hasTopics = $derived(
    profileData.topics.curated.length +
    profileData.topics.freeform.length +
    profileData.topics.inferred.length > 0
  );

  // Auto-subscribe to the profile store (idiomatic Svelte 5: $store auto-tracks
  // and auto-cleans, no manual subscribe/unsubscribe to leak).
  $effect(() => {
    const p = $profile;
    profileData = { ...p };
    borrowStyle = p.borrowStyle ?? '';
    obsessions = p.currentObsessions?.join(', ') ?? '';
    contactMethod = p.contactMethod ?? '';
    contactValue = p.contactValue ?? '';
    contactVisibility = p.contactVisibility ?? 'hidden';
  });

  $effect(() => {
    const inferred = getInferredTopics();
    if (
      JSON.stringify(inferred) !== JSON.stringify(profileData.topics.inferred)
    ) {
      updateProfile({
        topics: { ...profileData.topics, inferred },
      });
    }
  });

  $effect(() => {
    const _ = $shelf; // subscribe to changes
    const current = $profile;
    if (!current.lendingPersonalityOverride) {
      const derived = deriveLendingPersonality();
      if (derived && derived !== current.lendingPersonality) {
        updateLendingPersonality(derived, false);
      }
    }
  });

  function startEditPersonality() {
    personalityInput = $profile.lendingPersonality || '';
    editingPersonality = true;
  }

  function savePersonality() {
    updateLendingPersonality(personalityInput, true);
    editingPersonality = false;
  }

  function clearPersonalityOverride() {
    const derived = deriveLendingPersonality();
    updateLendingPersonality(derived, false);
  }

  async function handleEnableLocation() {
    requestingLocation = true;
    locationError = '';
    const result = await requestGeolocation('approximate');
    requestingLocation = false;
    if (!result.success) {
      locationError = result.error || 'Could not get location';
      // Fall back to city center
      if (profileData.city) {
        setLocationFromCity(profileData.city);
      }
    }
  }

  function handleContactSave() {
    if (contactMethod && contactValue) {
      updateContactInfo(contactMethod as ContactMethod, contactValue, contactVisibility);
      showSavedIndicator();
    }
  }

  function handleSave() {
    updateProfile({
      name: profileData.name,
      city: profileData.city,
      radiusKm: profileData.radiusKm,
      borrowStyle: borrowStyle || undefined,
      currentObsessions: obsessions
        ? obsessions.split(',').map((s) => s.trim())
        : undefined,
    });
    showSavedIndicator();
  }

  const CITIES = [
    'Montreal',
    'Toronto',
    'Vancouver',
    'Ottawa',
    'Calgary',
    'Edmonton',
    'Quebec City',
    'Winnipeg',
    'Halifax',
    'Victoria',
  ];
</script>

{#if isEditing}
  <!-- Edit Mode -->
  <div class="profile">
    <section class="card rise rise-1">
      <div class="section-header">
        <h2 class="serif">Edit Profile</h2>
        <div class="header-actions">
          {#if showSaved}
            <span class="saved-indicator" role="status">Saved</span>
          {/if}
          <button class="btn btn-tinted btn-sm" onclick={() => isEditing = false}>Done</button>
        </div>
      </div>

      <div class="field">
        <label class="label" for="name">Name</label>
        <input
          id="name"
          class="input"
          type="text"
          bind:value={profileData.name}
          onblur={handleSave}
        />
      </div>

      <div class="field">
        <label class="label" for="city">City</label>
        <select id="city" class="select" bind:value={profileData.city} onchange={handleSave}>
          {#each CITIES as city}
            <option value={city}>{city}</option>
          {/each}
        </select>
      </div>

      <div class="field">
        <label class="label" for="radius">Search radius: {profileData.radiusKm} km</label>
        <input
          id="radius"
          class="range"
          type="range"
          min="1"
          max="20"
          bind:value={profileData.radiusKm}
          onchange={handleSave}
        />
      </div>

      <div class="field location-field">
        <span class="label">Location</span>
        {#if profileData.latitude && profileData.longitude}
          <div class="location-status">
            <span class="location-badge">
              {#if profileData.locationPrecision === 'city'}
                Using city center
              {:else}
                Your location (~100m precision)
              {/if}
            </span>
            <button class="btn btn-outline btn-sm" onclick={handleEnableLocation} disabled={requestingLocation}>
              {requestingLocation ? 'Getting…' : 'Update'}
            </button>
          </div>
        {:else}
          <button class="btn btn-outline btn-location" onclick={handleEnableLocation} disabled={requestingLocation}>
            {requestingLocation ? 'Getting location…' : 'Enable precise location'}
          </button>
          <p class="location-hint faint">Your location is stored approximately (~100m) and never shared with other users.</p>
        {/if}
        {#if locationError}
          <p class="location-error" role="alert">{locationError}</p>
        {/if}
      </div>
    </section>

    <section class="card rise rise-2">
      <h2 class="serif">Contact Info</h2>
      <p class="section-desc muted">Let matches connect with you. Only shared when you accept a connection request.</p>

      <div class="field">
        <label class="label" for="contact-method">How can people reach you?</label>
        <select id="contact-method" class="select" bind:value={contactMethod} onchange={handleContactSave}>
          <option value="">Select…</option>
          <option value="email">Email</option>
          <option value="social">Social media</option>
          <option value="custom">Other</option>
        </select>
      </div>

      {#if contactMethod}
        <div class="field">
          <label class="label" for="contact-value">
            {#if contactMethod === 'email'}Email address
            {:else if contactMethod === 'social'}Social handle or link
            {:else}Contact info
            {/if}
          </label>
          <input
            id="contact-value"
            class="input"
            type="text"
            bind:value={contactValue}
            placeholder={contactMethod === 'email' ? 'you@example.com' : contactMethod === 'social' ? '@handle or URL' : 'How to reach you'}
            onblur={handleContactSave}
          />
        </div>

        <div class="field">
          <label class="label" for="contact-visibility">Visibility</label>
          <select id="contact-visibility" class="select" bind:value={contactVisibility} onchange={handleContactSave}>
            <option value="hidden">Hidden (no contact)</option>
            <option value="on-request">On request (reveal when accepted)</option>
            <option value="public">Public (visible on match cards)</option>
          </select>
        </div>
      {/if}
    </section>

    <section class="card rise rise-3">
      <h2 class="serif">Your Interests</h2>
      <TopicPickerIsland mode="both" maxCurated={5} />

      <div class="constellation-wrapper">
        <h3>Your Interest Constellation</h3>
        <InterestConstellation
          curated={profileData.topics.curated}
          freeform={profileData.topics.freeform}
          inferred={profileData.topics.inferred}
        />
      </div>
    </section>

    <section class="card rise rise-4">
      <h2 class="serif">Optional Details</h2>

      <div class="field">
        <label class="label" for="borrow">Lending style</label>
        <input
          id="borrow"
          class="input"
          type="text"
          bind:value={borrowStyle}
          placeholder="e.g., careful, notes welcome, 3-week returns"
          onblur={handleSave}
        />
      </div>

      <div class="field">
        <label class="label" for="obsessions">Current obsessions (comma-separated)</label>
        <input
          id="obsessions"
          class="input"
          type="text"
          bind:value={obsessions}
          placeholder="e.g., program theory, parables, coordination"
          onblur={handleSave}
        />
      </div>
    </section>

    <section class="card rise rise-5">
      <h2 class="serif">Lending Style</h2>
      {#if editingPersonality}
        <div class="edit-row">
          <input class="input" type="text" bind:value={personalityInput} placeholder="e.g., Generous lender" />
          <button class="btn btn-filled btn-sm" onclick={savePersonality}>Save</button>
          <button class="btn btn-plain btn-sm" onclick={() => editingPersonality = false}>Cancel</button>
        </div>
      {:else}
        <div class="derived-value">
          <span class="value">{$profile.lendingPersonality || 'Add some books to see your style'}</span>
          {#if $profile.lendingPersonality}
            <button class="btn btn-outline btn-sm" onclick={startEditPersonality}>Edit</button>
            {#if $profile.lendingPersonalityOverride}
              <button class="btn btn-plain btn-sm" onclick={clearPersonalityOverride}>Reset to auto</button>
            {/if}
          {/if}
        </div>
      {/if}
    </section>
  </div>
{:else}
  <!-- View Mode -->
  <div class="profile-view">
    <header class="profile-header card rise rise-1">
      <div class="identity">
        <h2 class="name serif">{profileData.name || 'Your Profile'}</h2>
        {#if profileData.city}
          <span class="location muted">{profileData.city} · {profileData.radiusKm} km radius</span>
        {/if}
      </div>
      <button class="btn btn-tinted btn-sm" onclick={() => isEditing = true}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
        Edit
      </button>
    </header>

    <section class="constellation-hero rise rise-2">
      {#if hasTopics}
        <InterestConstellation
          curated={profileData.topics.curated}
          freeform={profileData.topics.freeform}
          inferred={profileData.topics.inferred}
        />
      {:else}
        <div class="empty-constellation card">
          <p class="muted">Your interest constellation awaits</p>
          <button class="btn btn-filled" onclick={() => isEditing = true}>
            Add interests
          </button>
        </div>
      {/if}
    </section>

    {#if borrowStyle || obsessions}
      <section class="profile-details card rise rise-3">
        {#if borrowStyle}
          <blockquote class="lending-style serif">"{borrowStyle}"</blockquote>
        {/if}
        {#if obsessions}
          <p class="obsessions">
            <span class="label-inline muted">Currently obsessing over:</span>
            <span class="value">{obsessions}</span>
          </p>
        {/if}
      </section>
    {/if}

    {#if $profile.lendingPersonality}
      <section class="profile-details lending-personality-view card rise rise-4">
        <p class="eyebrow personality-label">Lending Personality</p>
        <p class="personality-value serif">{$profile.lendingPersonality}</p>
        {#if $profile.lendingPersonalityOverride}
          <span class="override-badge">custom</span>
        {/if}
      </section>
    {/if}
  </div>
{/if}

<style>
  .profile,
  .profile-view {
    max-width: 640px;
    display: flex;
    flex-direction: column;
    gap: var(--s-5);
  }

  h2 {
    margin: 0 0 var(--s-5);
    font-size: 1.375rem;
    font-weight: 500;
    color: var(--ink);
  }

  h3 {
    margin: var(--s-5) 0 var(--s-3);
    font-family: var(--font-ui);
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--ink-muted);
  }

  .field {
    margin-bottom: var(--s-4);
  }

  .field:last-child {
    margin-bottom: 0;
  }

  /* Range slider */
  /* Appearance comes from the shared .range in theme.css; only positioning here. */
  .range { margin-top: var(--s-2); }

  .constellation-wrapper {
    margin-top: var(--s-6);
    padding-top: var(--s-4);
    border-top: 1px solid var(--hairline);
  }

  .constellation-wrapper h3 {
    margin: 0 0 var(--s-3);
    text-align: center;
  }

  /* Header / identity */
  .profile-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--s-4);
  }

  .identity {
    display: flex;
    flex-direction: column;
    gap: var(--s-1);
  }

  .name {
    margin: 0;
    font-size: 1.75rem;
    font-weight: 500;
    color: var(--ink);
  }

  .location {
    font-size: 0.95rem;
  }

  /* Edit-section header */
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--s-3);
    margin-bottom: var(--s-5);
  }

  .section-header h2 {
    margin: 0;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: var(--s-3);
  }

  .saved-indicator {
    padding: 0.2rem 0.6rem;
    font-family: var(--font-ui);
    font-size: 0.75rem;
    font-weight: 590;
    color: var(--accent);
    background: var(--accent-tint);
    border-radius: var(--r-full);
    animation: fadeInOut 2s var(--ease-soft) forwards;
  }

  @keyframes fadeInOut {
    0% { opacity: 0; transform: translateY(-4px); }
    15% { opacity: 1; transform: translateY(0); }
    85% { opacity: 1; transform: translateY(0); }
    100% { opacity: 0; transform: translateY(-4px); }
  }

  /* Constellation hero */
  .constellation-hero {
    border-radius: var(--r-lg);
    overflow: hidden;
    box-shadow: var(--shadow-2);
  }

  .empty-constellation {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--s-4);
    padding: var(--s-8) var(--s-6);
    text-align: center;
    border-style: dashed;
  }

  .empty-constellation p {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.125rem;
  }

  /* Detail sections */
  .lending-style {
    margin: 0 0 var(--s-4);
    padding: var(--s-3) var(--s-4);
    font-size: 1.0625rem;
    font-style: italic;
    color: var(--ink);
    background: var(--surface-sunken);
    border-left: 3px solid var(--accent);
    border-radius: 0 var(--r-md) var(--r-md) 0;
  }

  .lending-style:last-child {
    margin-bottom: 0;
  }

  .obsessions {
    margin: 0;
    font-size: 0.95rem;
    color: var(--ink);
  }

  .obsessions .label-inline {
    font-weight: 590;
  }

  /* Lending-personality edit/view rows */
  .derived-value {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    flex-wrap: wrap;
  }

  .derived-value .value {
    font-size: 1.0625rem;
    color: var(--ink);
  }

  .edit-row {
    display: flex;
    gap: var(--s-2);
    align-items: center;
    flex-wrap: wrap;
  }

  .edit-row .input {
    flex: 1;
    min-width: 200px;
  }

  .lending-personality-view {
    position: relative;
  }

  .personality-label {
    margin: 0 0 var(--s-1);
  }

  .personality-value {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 500;
    color: var(--ink);
  }

  .override-badge {
    position: absolute;
    top: var(--s-4);
    right: var(--s-4);
    padding: 0.2rem 0.5rem;
    font-family: var(--font-ui);
    font-size: 0.7rem;
    font-weight: 640;
    color: var(--ink-muted);
    background: var(--surface-sunken);
    border-radius: var(--r-full);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  /* Location */
  .location-field {
    margin-top: var(--s-4);
    padding-top: var(--s-4);
    border-top: 1px solid var(--hairline);
  }

  .location-status {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    flex-wrap: wrap;
  }

  .location-badge {
    padding: 0.35rem 0.7rem;
    font-family: var(--font-ui);
    font-size: 0.85rem;
    font-weight: 540;
    color: var(--accent);
    background: var(--accent-tint);
    border-radius: var(--r-full);
  }

  .btn-location {
    width: 100%;
  }

  .location-hint {
    margin: var(--s-2) 0 0;
    font-size: 0.8rem;
  }

  .location-error {
    margin: var(--s-2) 0 0;
    font-size: 0.85rem;
    color: var(--danger);
  }

  .section-desc {
    margin: calc(-1 * var(--s-2)) 0 var(--s-4);
    font-size: 0.9rem;
  }

  @media (max-width: 600px) {
    .profile-header {
      flex-direction: column;
    }
  }
</style>
