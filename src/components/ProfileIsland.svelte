<script lang="ts">
  import { profile, updateProfile } from '../stores/profile';
  import { getInferredTopics } from '../stores/shelf';
  import type { UserProfile } from '../lib/types';
  import TopicPickerIsland from './TopicPickerIsland.svelte';

  let profileData = $state<UserProfile>({
    id: '',
    name: '',
    city: '',
    radiusKm: 5,
    topics: { curated: [], freeform: [], inferred: [] },
  });

  let borrowStyle = $state('');
  let obsessions = $state('');

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
    'Demo City',
    'New York',
    'Los Angeles',
    'Chicago',
    'Houston',
    'Phoenix',
    'Philadelphia',
    'San Antonio',
    'San Diego',
    'Dallas',
  ];
</script>

<div class="profile">
  <section>
    <h2>Your Profile</h2>

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

    {#if profileData.topics.inferred.length > 0}
      <div class="inferred">
        <h3>Inferred from your books</h3>
        <div class="tags">
          {#each profileData.topics.inferred as topic}
            <span class="tag">{topic.replace('-', ' ')}</span>
          {/each}
        </div>
      </div>
    {/if}
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
</div>

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

  .inferred {
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--color-gold-pale);
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .tag {
    padding: 0.2rem 0.625rem;
    font-family: var(--font-body);
    font-size: 0.8rem;
    color: var(--color-ink);
    background: linear-gradient(
      to bottom,
      var(--color-gold-pale),
      var(--color-gold-light) 50%,
      var(--color-gold-pale)
    );
    border: 1px solid var(--color-gold);
    border-radius: 2px;
    text-transform: capitalize;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.4),
      0 1px 2px rgba(0, 0, 0, 0.1);
  }
</style>
