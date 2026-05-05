<script lang="ts">
  import { CURATED_TOPICS } from '../stores/topics';
  import { profile, updateTopics } from '../stores/profile';
  import type { UserTopics } from '../lib/types';

  interface Props {
    mode?: 'curated' | 'freeform' | 'both';
    maxCurated?: number;
  }

  let { mode = 'both', maxCurated = 5 }: Props = $props();

  let topics = $state<UserTopics>({ curated: [], freeform: [], inferred: [] });
  let freeformInput = $state('');

  $effect(() =>
    profile.subscribe((p) => {
      topics = { ...p.topics };
    })
  );

  function toggleCurated(topic: string) {
    const current = topics.curated;
    if (current.includes(topic)) {
      updateTopics({ curated: current.filter((t) => t !== topic) });
    } else if (current.length < maxCurated) {
      updateTopics({ curated: [...current, topic] });
    }
  }

  function addFreeform() {
    const tag = freeformInput.trim().toLowerCase();
    if (tag && !topics.freeform.includes(tag)) {
      updateTopics({ freeform: [...topics.freeform, tag] });
      freeformInput = '';
    }
  }

  function removeFreeform(tag: string) {
    updateTopics({ freeform: topics.freeform.filter((t) => t !== tag) });
  }
</script>

<div class="topic-picker">
  {#if mode === 'curated' || mode === 'both'}
    <div class="section">
      <h3>Pick your interests ({topics.curated.length}/{maxCurated})</h3>
      <div class="curated-grid">
        {#each CURATED_TOPICS as topic}
          <button
            class="topic-chip"
            class:selected={topics.curated.includes(topic)}
            onclick={() => toggleCurated(topic)}
            disabled={!topics.curated.includes(topic) &&
              topics.curated.length >= maxCurated}
          >
            {topic.replace('-', ' ')}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  {#if mode === 'freeform' || mode === 'both'}
    <div class="section">
      <h3>Add your own tags</h3>
      <div class="freeform-input">
        <input
          type="text"
          bind:value={freeformInput}
          placeholder="e.g., Le Guin fan, solarpunk"
          onkeydown={(e) =>
            e.key === 'Enter' && (e.preventDefault(), addFreeform())}
        />
        <button onclick={addFreeform}>Add</button>
      </div>
      {#if topics.freeform.length > 0}
        <div class="freeform-tags">
          {#each topics.freeform as tag}
            <span class="tag">
              {tag}
              <button onclick={() => removeFreeform(tag)}>x</button>
            </span>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .topic-picker {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .section h3 {
    margin: 0 0 0.75rem;
    font-size: 1rem;
  }

  .curated-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .topic-chip {
    padding: 0.375rem 0.75rem;
    border: 1px solid #ccc;
    border-radius: 16px;
    background: white;
    font-size: 0.875rem;
    cursor: pointer;
    text-transform: capitalize;
  }

  .topic-chip.selected {
    background: #0066cc;
    color: white;
    border-color: #0066cc;
  }

  .topic-chip:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .freeform-input {
    display: flex;
    gap: 0.5rem;
  }

  .freeform-input input {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
  }

  .freeform-input button {
    padding: 0.5rem 1rem;
    background: #0066cc;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .freeform-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }

  .tag {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    background: #e8f4f8;
    border-radius: 4px;
    font-size: 0.875rem;
  }

  .tag button {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    font-size: 1rem;
    line-height: 1;
  }
</style>
