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
    gap: 1.75rem;
  }

  .section h3 {
    margin: 0 0 0.875rem;
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 500;
    color: var(--color-ink-faded);
  }

  .curated-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .topic-chip {
    padding: 0.375rem 0.875rem;
    font-family: var(--font-body);
    font-size: 0.85rem;
    color: var(--color-ink);
    background: var(--color-paper);
    border: 1px solid var(--color-gold-pale);
    border-radius: 2px;
    cursor: pointer;
    text-transform: capitalize;
    transition: all var(--transition-quick);
    box-shadow: var(--shadow-inset);
  }

  .topic-chip:hover:not(:disabled) {
    border-color: var(--color-gold);
    background: var(--color-cream);
  }

  .topic-chip.selected {
    color: var(--color-cream);
    background: linear-gradient(
      to bottom,
      var(--color-burgundy-light),
      var(--color-burgundy),
      var(--color-burgundy-dark)
    );
    border-color: var(--color-burgundy-dark);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.15),
      0 1px 2px rgba(74, 44, 42, 0.2);
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
  }

  .topic-chip:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .freeform-input {
    display: flex;
    gap: 0.5rem;
  }

  .freeform-input input {
    flex: 1;
    padding: 0.625rem 0.875rem;
    font-family: var(--font-body);
    font-size: 0.95rem;
    color: var(--color-ink);
    background: var(--color-paper);
    border: 1px solid var(--color-gold-pale);
    border-radius: var(--radius-sm);
    transition: all var(--transition-quick);
    box-shadow: var(--shadow-inset);
  }

  .freeform-input input::placeholder {
    color: var(--color-ink-light);
    font-style: italic;
  }

  .freeform-input input:focus {
    outline: none;
    border-color: var(--color-gold);
    box-shadow: var(--shadow-inset), 0 0 0 3px rgba(184, 134, 11, 0.15);
  }

  .freeform-input button {
    padding: 0.625rem 1.25rem;
    font-family: var(--font-display);
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--color-cream);
    background: linear-gradient(
      to bottom,
      var(--color-forest-light),
      var(--color-forest),
      var(--color-forest-dark)
    );
    border: 1px solid var(--color-forest-dark);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--transition-gentle);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.15),
      0 2px 4px rgba(44, 74, 57, 0.25);
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
  }

  .freeform-input button:hover {
    background: linear-gradient(
      to bottom,
      var(--color-forest),
      var(--color-forest-dark),
      #152218
    );
    transform: translateY(-1px);
  }

  .freeform-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.875rem;
  }

  .tag {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.625rem;
    font-family: var(--font-body);
    font-size: 0.85rem;
    color: var(--color-ink);
    background: linear-gradient(
      to bottom,
      var(--color-gold-pale),
      var(--color-gold-light) 50%,
      var(--color-gold-pale)
    );
    border: 1px solid var(--color-gold);
    border-radius: 2px;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.4),
      0 1px 2px rgba(0, 0, 0, 0.1);
  }

  .tag button {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    font-size: 0.9rem;
    line-height: 1;
    color: var(--color-ink-faded);
    transition: color var(--transition-quick);
  }

  .tag button:hover {
    color: var(--color-burgundy);
  }
</style>
