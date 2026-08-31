<script lang="ts">
  import { CURATED_TOPICS } from '../stores/topics';
  import { profile, updateTopics } from '../stores/profile';
  import type { UserTopics } from '../lib/types';
  import { localizeTopicLabel, useTranslations, type Lang } from '../i18n';

  interface Props {
    mode?: 'curated' | 'freeform' | 'both';
    maxCurated?: number;
    lang?: Lang;
  }

  let { mode = 'both', maxCurated = 5, lang = 'en' as Lang }: Props = $props();
  const t = $derived(useTranslations(lang).profile.topicPicker);

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
      <h3>{t.pickHeading} <span class="count-tag">{topics.curated.length}/{maxCurated}</span></h3>
      <div class="curated-grid" role="group" aria-label={t.curatedGroupLabel}>
        {#each CURATED_TOPICS as topic}
          <button
            class="chip"
            class:selected={topics.curated.includes(topic)}
            aria-pressed={topics.curated.includes(topic)}
            onclick={() => toggleCurated(topic)}
            disabled={!topics.curated.includes(topic) &&
              topics.curated.length >= maxCurated}
          >
            {localizeTopicLabel(topic, lang)}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  {#if mode === 'freeform' || mode === 'both'}
    <div class="section">
      <h3>{t.addOwnHeading}</h3>
      <div class="freeform-input">
        <input
          class="input"
          type="text"
          bind:value={freeformInput}
          placeholder={t.freeformPlaceholder}
          onkeydown={(e) =>
            e.key === 'Enter' && (e.preventDefault(), addFreeform())}
        />
        <button class="btn btn-tinted" onclick={addFreeform}>{t.add}</button>
      </div>
      {#if topics.freeform.length > 0}
        <div class="freeform-tags">
          {#each topics.freeform as tag}
            <span class="tag">
              {tag}
              <button
                class="tag-remove"
                aria-label={t.removeTag.replace('{tag}', tag)}
                onclick={() => removeFreeform(tag)}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
                  <path d="M3 3l6 6M9 3l-6 6" />
                </svg>
              </button>
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
    gap: var(--s-6);
  }

  .section h3 {
    margin: 0 0 var(--s-3);
    font-family: var(--font-ui);
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--ink-muted);
    display: flex;
    align-items: baseline;
    gap: var(--s-2);
  }

  .count-tag {
    font-size: 0.8125rem;
    font-weight: 590;
    color: var(--ink-faint);
  }

  .curated-grid {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s-2);
  }

  /* Visuals come from the shared .chip in theme.css; only the topic-specific
     capitalization is overridden here. */
  .chip {
    text-transform: capitalize;
  }

  .freeform-input {
    display: flex;
    gap: var(--s-2);
  }

  .freeform-input .input {
    flex: 1;
  }

  .freeform-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s-2);
    margin-top: var(--s-3);
  }

  .tag {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.25rem 0.35rem 0.25rem 0.7rem;
    font-family: var(--font-ui);
    font-size: 0.8125rem;
    font-weight: 540;
    color: var(--accent);
    background: var(--accent-tint);
    border-radius: var(--r-full);
  }

  .tag-remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: var(--r-full);
    cursor: pointer;
    color: var(--accent);
    transition: color var(--dur-1) var(--ease-soft), background var(--dur-1) var(--ease-soft);
  }

  .tag-remove:hover {
    color: var(--danger);
    background: var(--danger-tint);
  }
</style>
