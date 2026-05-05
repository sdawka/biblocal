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
    max-width: 600px;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  section {
    padding: 1.5rem;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background: white;
  }

  h2 {
    margin: 0 0 1rem;
    font-size: 1.25rem;
  }

  h3 {
    margin: 1rem 0 0.5rem;
    font-size: 1rem;
    color: #666;
  }

  .field {
    margin-bottom: 1rem;
  }

  .field:last-child {
    margin-bottom: 0;
  }

  label {
    display: block;
    margin-bottom: 0.25rem;
    font-size: 0.875rem;
    font-weight: 500;
  }

  input[type='text'],
  select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 1rem;
  }

  input[type='range'] {
    width: 100%;
  }

  .inferred {
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid #e0e0e0;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .tag {
    padding: 0.25rem 0.5rem;
    background: #e8f4f8;
    border-radius: 4px;
    font-size: 0.875rem;
    text-transform: capitalize;
  }
</style>
