<script lang="ts">
  import { profile, updateProfile, deriveLendingPersonality, updateLendingPersonality } from '../stores/profile';
  import { shelf, getInferredTopics } from '../stores/shelf';
  import type { UserProfile } from '../lib/types';
  import TopicPickerIsland from './TopicPickerIsland.svelte';
  import InterestConstellation from './InterestConstellation.svelte';

  let isEditing = $state(false);
  let editingPersonality = $state(false);
  let personalityInput = $state('');

  let profileData = $state<UserProfile>({
    id: '',
    name: '',
    city: '',
    radiusKm: 5,
    topics: { curated: [], freeform: [], inferred: [] },
  });

  let borrowStyle = $state('');
  let obsessions = $state('');

  let hasTopics = $derived(
    profileData.topics.curated.length +
    profileData.topics.freeform.length +
    profileData.topics.inferred.length > 0
  );

  $effect(() =>
    profile.subscribe((p) => {
      profileData = { ...p };
      borrowStyle = p.borrowStyle ?? '';
      obsessions = p.currentObsessions?.join(', ') ?? '';
    })
  );

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
    <section>
      <div class="section-header">
        <h2>Edit Profile</h2>
        <button class="btn-done" onclick={() => isEditing = false}>Done</button>
      </div>

      <div class="field">
        <label for="name">Name</label>
        <input
          id="name"
          type="text"
          bind:value={profileData.name}
          onblur={handleSave}
        />
      </div>

      <div class="field">
        <label for="city">City</label>
        <select id="city" bind:value={profileData.city} onchange={handleSave}>
          {#each CITIES as city}
            <option value={city}>{city}</option>
          {/each}
        </select>
      </div>

      <div class="field">
        <label for="radius">Search radius: {profileData.radiusKm} km</label>
        <input
          id="radius"
          type="range"
          min="1"
          max="20"
          bind:value={profileData.radiusKm}
          onchange={handleSave}
        />
      </div>
    </section>

    <section>
      <h2>Your Interests</h2>
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

    <section>
      <h2>Optional Details</h2>

      <div class="field">
        <label for="borrow">Lending style</label>
        <input
          id="borrow"
          type="text"
          bind:value={borrowStyle}
          placeholder="e.g., careful, notes welcome, 3-week returns"
          onblur={handleSave}
        />
      </div>

      <div class="field">
        <label for="obsessions">Current obsessions (comma-separated)</label>
        <input
          id="obsessions"
          type="text"
          bind:value={obsessions}
          placeholder="e.g., program theory, parables, coordination"
          onblur={handleSave}
        />
      </div>
    </section>

    <section class="profile-section">
      <h2>Lending Style</h2>
      {#if editingPersonality}
        <div class="edit-row">
          <input type="text" bind:value={personalityInput} placeholder="e.g., Generous lender" />
          <button onclick={savePersonality}>Save</button>
          <button class="secondary" onclick={() => editingPersonality = false}>Cancel</button>
        </div>
      {:else}
        <div class="derived-value">
          <span class="value">{$profile.lendingPersonality || 'Add some books to see your style'}</span>
          {#if $profile.lendingPersonality}
            <button class="edit-btn" onclick={startEditPersonality}>Edit</button>
            {#if $profile.lendingPersonalityOverride}
              <button class="clear-btn" onclick={clearPersonalityOverride}>Reset to auto</button>
            {/if}
          {/if}
        </div>
      {/if}
    </section>
  </div>
{:else}
  <!-- View Mode -->
  <div class="profile-view">
    <header class="profile-header">
      <div class="identity">
        <h1 class="name">{profileData.name || 'Your Profile'}</h1>
        {#if profileData.city}
          <span class="location">{profileData.city} · {profileData.radiusKm} km radius</span>
        {/if}
      </div>
      <button class="btn-edit" onclick={() => isEditing = true}>
        <span class="edit-icon">✎</span> Edit
      </button>
    </header>

    <section class="constellation-hero">
      {#if hasTopics}
        <InterestConstellation
          curated={profileData.topics.curated}
          freeform={profileData.topics.freeform}
          inferred={profileData.topics.inferred}
        />
      {:else}
        <div class="empty-constellation">
          <p>Your interest constellation awaits</p>
          <button class="btn-add-interests" onclick={() => isEditing = true}>
            Add interests
          </button>
        </div>
      {/if}
    </section>

    {#if borrowStyle || obsessions}
      <section class="profile-details">
        {#if borrowStyle}
          <blockquote class="lending-style">"{borrowStyle}"</blockquote>
        {/if}
        {#if obsessions}
          <p class="obsessions">
            <span class="label">Currently obsessing over:</span>
            <span class="value">{obsessions}</span>
          </p>
        {/if}
      </section>
    {/if}

    {#if $profile.lendingPersonality}
      <section class="profile-details lending-personality-view">
        <p class="personality-label">Lending Personality</p>
        <p class="personality-value">{$profile.lendingPersonality}</p>
        {#if $profile.lendingPersonalityOverride}
          <span class="override-badge">custom</span>
        {/if}
      </section>
    {/if}
  </div>
{/if}

<style>
  .profile {
    max-width: 640px;
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
  }

  section {
    padding: 1.75rem;
    background: var(--color-cream);
    border: 1px solid var(--color-gold-pale);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-card);
    position: relative;
    opacity: 0;
    animation: fadeInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }

  section:nth-child(1) { animation-delay: 0.05s; }
  section:nth-child(2) { animation-delay: 0.12s; }
  section:nth-child(3) { animation-delay: 0.19s; }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Subtle corner dots */
  section::before,
  section::after {
    content: '';
    position: absolute;
    width: 4px;
    height: 4px;
    background: var(--color-gold);
    border-radius: 50%;
    opacity: 0.25;
  }

  section::before {
    top: 10px;
    left: 10px;
  }

  section::after {
    bottom: 10px;
    right: 10px;
  }

  h2 {
    margin: 0 0 1.25rem;
    font-family: var(--font-display);
    font-size: 1.375rem;
    font-weight: 600;
    color: var(--color-ink);
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--color-gold-pale);
  }

  h3 {
    margin: 1.25rem 0 0.625rem;
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 500;
    color: var(--color-ink-faded);
  }

  .field {
    margin-bottom: 1.125rem;
  }

  .field:last-child {
    margin-bottom: 0;
  }

  label {
    display: block;
    margin-bottom: 0.375rem;
    font-family: var(--font-display);
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-ink-faded);
    letter-spacing: 0.02em;
  }

  input[type='text'],
  select {
    width: 100%;
    padding: 0.625rem 0.875rem;
    font-family: var(--font-body);
    font-size: 1rem;
    color: var(--color-ink);
    background: var(--color-paper);
    border: 1px solid var(--color-gold-pale);
    border-radius: var(--radius-sm);
    transition: all var(--transition-quick);
    box-shadow: var(--shadow-inset);
  }

  input[type='text']::placeholder {
    color: var(--color-ink-light);
    font-style: italic;
  }

  input[type='text']:focus,
  select:focus {
    outline: none;
    border-color: var(--color-gold);
    box-shadow: var(--shadow-inset), 0 0 0 3px rgba(184, 134, 11, 0.15);
  }

  select {
    appearance: none;
    padding-right: 2.5rem;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B5B4F' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.875rem center;
    cursor: pointer;
  }

  input[type='range'] {
    width: 100%;
    height: 6px;
    margin-top: 0.5rem;
    appearance: none;
    background: linear-gradient(
      to right,
      var(--color-gold-pale),
      var(--color-gold)
    );
    border-radius: 3px;
    cursor: pointer;
  }

  input[type='range']::-webkit-slider-thumb {
    appearance: none;
    width: 18px;
    height: 18px;
    background: linear-gradient(
      to bottom,
      var(--color-mahogany-light),
      var(--color-mahogany)
    );
    border: 2px solid var(--color-gold);
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  input[type='range']::-moz-range-thumb {
    width: 18px;
    height: 18px;
    background: linear-gradient(
      to bottom,
      var(--color-mahogany-light),
      var(--color-mahogany)
    );
    border: 2px solid var(--color-gold);
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .constellation-wrapper {
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--color-gold-pale);
  }

  .constellation-wrapper h3 {
    margin: 0 0 0.75rem;
    font-family: var(--font-display);
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--color-ink-faded);
    text-align: center;
  }

  /* View Mode Styles */
  .profile-view {
    max-width: 640px;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .profile-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 1.5rem;
    background: var(--color-cream);
    border: 1px solid var(--color-gold-pale);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-card);
  }

  .identity {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .name {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.75rem;
    font-weight: 600;
    color: var(--color-ink);
  }

  .location {
    font-family: var(--font-body);
    font-size: 0.95rem;
    color: var(--color-ink-faded);
  }

  .btn-edit, .btn-done {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 1rem;
    font-family: var(--font-display);
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-ink);
    background: var(--color-paper);
    border: 1px solid var(--color-gold-pale);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--transition-quick);
  }

  .btn-edit:hover, .btn-done:hover {
    border-color: var(--color-gold);
    background: var(--color-gold-pale);
  }

  .edit-icon {
    font-size: 1rem;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.25rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--color-gold-pale);
  }

  .section-header h2 {
    margin: 0;
    padding: 0;
    border: none;
  }

  .constellation-hero {
    border-radius: var(--radius-md);
    overflow: hidden;
    box-shadow: var(--shadow-lifted);
  }

  .empty-constellation {
    padding: 3rem 2rem;
    text-align: center;
    background: linear-gradient(
      135deg,
      var(--color-ink) 0%,
      #1a1612 50%,
      var(--color-mahogany-deep) 100%
    );
    border-radius: var(--radius-md);
  }

  .empty-constellation p {
    margin: 0 0 1rem;
    font-family: var(--font-display);
    font-size: 1.125rem;
    color: var(--color-gold-pale);
    font-style: italic;
  }

  .btn-add-interests {
    padding: 0.625rem 1.25rem;
    font-family: var(--font-display);
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--color-ink);
    background: linear-gradient(to bottom, var(--color-gold-pale), var(--color-gold));
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--transition-quick);
  }

  .btn-add-interests:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(184, 134, 11, 0.3);
  }

  .profile-details {
    padding: 1.5rem;
    background: var(--color-cream);
    border: 1px solid var(--color-gold-pale);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-card);
  }

  .lending-style {
    margin: 0 0 1rem;
    padding: 0.75rem 1rem;
    font-family: var(--font-body);
    font-size: 1rem;
    font-style: italic;
    color: var(--color-ink);
    background: var(--color-paper);
    border-left: 3px solid var(--color-gold);
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  }

  .lending-style:last-child {
    margin-bottom: 0;
  }

  .obsessions {
    margin: 0;
    font-family: var(--font-body);
    font-size: 0.95rem;
    color: var(--color-ink);
  }

  .obsessions .label {
    color: var(--color-ink-faded);
    font-weight: 500;
  }

  .obsessions .value {
    font-style: italic;
  }

  /* Lending Style Section (Edit Mode) */
  .profile-section h2 {
    margin: 0 0 1rem;
    font-family: var(--font-display);
    font-size: 1.375rem;
    font-weight: 600;
    color: var(--color-ink);
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--color-gold-pale);
  }

  .derived-value {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .derived-value .value {
    font-family: var(--font-body);
    font-size: 1rem;
    color: var(--color-ink);
    font-style: italic;
  }

  .edit-btn,
  .clear-btn {
    padding: 0.375rem 0.75rem;
    font-family: var(--font-display);
    font-size: 0.8rem;
    font-weight: 500;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--transition-quick);
  }

  .edit-btn {
    color: var(--color-ink);
    background: var(--color-paper);
    border: 1px solid var(--color-gold-pale);
  }

  .edit-btn:hover {
    border-color: var(--color-gold);
    background: var(--color-gold-pale);
  }

  .clear-btn {
    color: var(--color-ink-faded);
    background: transparent;
    border: 1px dashed var(--color-gold-pale);
  }

  .clear-btn:hover {
    border-color: var(--color-gold);
    color: var(--color-ink);
  }

  .edit-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .edit-row input[type='text'] {
    flex: 1;
    min-width: 200px;
  }

  .edit-row button {
    padding: 0.625rem 1rem;
    font-family: var(--font-display);
    font-size: 0.875rem;
    font-weight: 500;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--transition-quick);
  }

  .edit-row button:first-of-type {
    color: var(--color-cream);
    background: var(--color-mahogany);
    border: 1px solid var(--color-mahogany);
  }

  .edit-row button:first-of-type:hover {
    background: var(--color-mahogany-light);
  }

  .edit-row button.secondary {
    color: var(--color-ink);
    background: var(--color-paper);
    border: 1px solid var(--color-gold-pale);
  }

  .edit-row button.secondary:hover {
    border-color: var(--color-gold);
    background: var(--color-gold-pale);
  }

  /* Lending Personality View Mode */
  .lending-personality-view {
    position: relative;
  }

  .personality-label {
    margin: 0 0 0.25rem;
    font-family: var(--font-display);
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--color-ink-faded);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .personality-value {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.125rem;
    font-weight: 500;
    color: var(--color-ink);
  }

  .override-badge {
    position: absolute;
    top: 1rem;
    right: 1rem;
    padding: 0.25rem 0.5rem;
    font-family: var(--font-display);
    font-size: 0.7rem;
    font-weight: 500;
    color: var(--color-ink-faded);
    background: var(--color-gold-pale);
    border-radius: var(--radius-xs, 3px);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
</style>
