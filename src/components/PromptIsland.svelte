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
  <div class="prompt">
    <div class="prompt-content">
      <p>{activePrompt.title}</p>

      {#if activePrompt.component === 'borrowStyle' || activePrompt.component === 'obsessions'}
        <input
          type="text"
          bind:value={inputValue}
          placeholder={activePrompt.component === 'borrowStyle'
            ? 'e.g., careful, 3-week returns'
            : 'e.g., program theory, parables'}
          onkeydown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        <div class="actions">
          <button onclick={handleSubmit}>Save</button>
          <button class="dismiss" onclick={handleDismiss}>Skip</button>
        </div>
      {:else}
        <p class="hint">Go to your profile to set this up.</p>
        <div class="actions">
          <a href="/profile">Edit Profile</a>
          <button class="dismiss" onclick={handleDismiss}>Later</button>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .prompt {
    padding: 1rem;
    background: #fffbeb;
    border: 1px solid #fcd34d;
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  .prompt-content p {
    margin: 0 0 0.75rem;
  }

  .hint {
    font-size: 0.875rem;
    color: #666;
  }

  input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    margin-bottom: 0.75rem;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
  }

  button,
  a {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    font-size: 0.875rem;
    cursor: pointer;
    text-decoration: none;
  }

  button:not(.dismiss),
  a {
    background: #0066cc;
    color: white;
  }

  .dismiss {
    background: transparent;
    color: #666;
  }
</style>
