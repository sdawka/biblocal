<script lang="ts">
  import { getBookCount } from '../stores/shelf';
  import {
    profile,
    dismissPrompt,
    isPromptDismissed,
    updateProfile,
  } from '../stores/profile';
  import type { UserProfile } from '../lib/types';

  interface Prompt {
    id: string;
    trigger: () => boolean;
    title: string;
    component: 'topics' | 'freeform' | 'borrowStyle' | 'obsessions';
  }

  const PROMPTS: Prompt[] = [
    {
      id: 'topics-3',
      trigger: () =>
        getBookCount() >= 3 &&
        (profile.get().topics?.curated?.length ?? 0) === 0,
      title: 'Pick 3 topics that describe your reading taste',
      component: 'topics',
    },
    {
      id: 'freeform-5',
      trigger: () =>
        getBookCount() >= 5 &&
        (profile.get().topics?.freeform?.length ?? 0) === 0,
      title: 'Add any tags that describe your interests',
      component: 'freeform',
    },
    {
      id: 'borrow-first-match',
      trigger: () => !profile.get().borrowStyle,
      title: 'How would you describe your lending style?',
      component: 'borrowStyle',
    },
    {
      id: 'obsessions-10',
      trigger: () => getBookCount() >= 10 && !profile.get().currentObsessions,
      title: 'What are you currently obsessed with?',
      component: 'obsessions',
    },
  ];

  interface Props {
    context?: 'shelf' | 'matches';
  }

  let { context = 'shelf' }: Props = $props();

  let profileData = $state<UserProfile | null>(null);
  let activePrompt = $state<Prompt | null>(null);
  let inputValue = $state('');

  $effect(() =>
    profile.subscribe((p) => {
      profileData = p;

      for (const prompt of PROMPTS) {
        if (!isPromptDismissed(prompt.id) && prompt.trigger()) {
          if (context === 'matches' && prompt.id === 'borrow-first-match') {
            activePrompt = prompt;
            break;
          } else if (context === 'shelf' && prompt.id !== 'borrow-first-match') {
            activePrompt = prompt;
            break;
          }
        }
      }

      if (!PROMPTS.some((p) => !isPromptDismissed(p.id) && p.trigger())) {
        activePrompt = null;
      }
    })
  );

  function handleDismiss() {
    if (activePrompt) {
      dismissPrompt(activePrompt.id);
      activePrompt = null;
    }
  }

  function handleSubmit() {
    if (!activePrompt || !inputValue.trim()) return;

    if (activePrompt.component === 'borrowStyle') {
      updateProfile({ borrowStyle: inputValue.trim() });
    } else if (activePrompt.component === 'obsessions') {
      updateProfile({
        currentObsessions: inputValue
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      });
    }

    dismissPrompt(activePrompt.id);
    activePrompt = null;
    inputValue = '';
  }
</script>

{#if activePrompt}
  <div class="prompt rise">
    <div class="prompt-content">
      <p class="prompt-title">{activePrompt.title}</p>

      {#if activePrompt.component === 'borrowStyle' || activePrompt.component === 'obsessions'}
        <input
          class="input"
          type="text"
          bind:value={inputValue}
          placeholder={activePrompt.component === 'borrowStyle'
            ? 'e.g., careful, 3-week returns'
            : 'e.g., program theory, parables'}
          onkeydown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        <div class="actions">
          <button class="btn btn-filled btn-sm" onclick={handleSubmit}>Save</button>
          <button class="btn btn-plain btn-sm" onclick={handleDismiss}>Skip</button>
        </div>
      {:else}
        <p class="hint muted">Go to your profile to set this up.</p>
        <div class="actions">
          <a class="btn btn-filled btn-sm" href="/profile">Edit Profile</a>
          <button class="btn btn-plain btn-sm" onclick={handleDismiss}>Later</button>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .prompt {
    padding: var(--s-5);
    background: var(--accent-tint);
    border: 1px solid var(--hairline);
    border-left: 3px solid var(--accent);
    border-radius: var(--r-lg);
    margin-bottom: var(--s-5);
    box-shadow: var(--shadow-1);
  }

  .prompt-title {
    margin: 0 0 var(--s-3);
    font-family: var(--font-display);
    font-size: 1.0625rem;
    font-weight: 500;
    color: var(--ink);
    line-height: 1.4;
  }

  .hint {
    margin: 0 0 var(--s-3);
    font-size: 0.875rem;
  }

  .input {
    margin-bottom: var(--s-3);
  }

  .actions {
    display: flex;
    gap: var(--s-2);
  }
</style>
