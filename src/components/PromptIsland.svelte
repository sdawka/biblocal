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
  /* Subtle note aesthetic */
  .prompt {
    padding: 1.25rem 1.5rem;
    background: var(--color-paper);
    border: 1px solid var(--color-gold-pale);
    border-left: 3px solid var(--color-gold);
    border-radius: var(--radius-sm);
    margin-bottom: 1.25rem;
    box-shadow: var(--shadow-card);
    position: relative;
    animation: slideIn 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-8px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .prompt-content p {
    margin: 0 0 0.875rem;
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 500;
    color: var(--color-ink);
    line-height: 1.4;
  }

  .hint {
    font-family: var(--font-body);
    font-size: 0.875rem;
    font-style: italic;
    color: var(--color-ink-faded);
  }

  input {
    width: 100%;
    padding: 0.625rem 0.875rem;
    font-family: var(--font-body);
    font-size: 1rem;
    color: var(--color-ink);
    background: var(--color-cream);
    border: 1px solid var(--color-gold-pale);
    border-radius: var(--radius-sm);
    margin-bottom: 0.875rem;
    transition: all var(--transition-quick);
    box-shadow: var(--shadow-inset);
  }

  input::placeholder {
    color: var(--color-ink-light);
    font-style: italic;
  }

  input:focus {
    outline: none;
    border-color: var(--color-gold);
    box-shadow: var(--shadow-inset), 0 0 0 3px rgba(184, 134, 11, 0.15);
  }

  .actions {
    display: flex;
    gap: 0.625rem;
  }

  button,
  a {
    padding: 0.5rem 1rem;
    font-family: var(--font-display);
    font-size: 0.85rem;
    font-weight: 500;
    border-radius: var(--radius-sm);
    cursor: pointer;
    text-decoration: none;
    transition: all var(--transition-quick);
  }

  button:not(.dismiss),
  a {
    color: var(--color-cream);
    background: linear-gradient(
      to bottom,
      var(--color-burgundy-light),
      var(--color-burgundy),
      var(--color-burgundy-dark)
    );
    border: 1px solid var(--color-burgundy-dark);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.15),
      0 2px 4px rgba(74, 44, 42, 0.25);
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
  }

  button:not(.dismiss):hover,
  a:hover {
    background: linear-gradient(
      to bottom,
      var(--color-burgundy),
      var(--color-burgundy-dark),
      #4A1F25
    );
    transform: translateY(-1px);
  }

  .dismiss {
    background: transparent;
    border: 1px solid var(--color-gold-pale);
    color: var(--color-ink-faded);
  }

  .dismiss:hover {
    border-color: var(--color-gold);
    color: var(--color-ink);
    background: var(--color-cream);
  }
</style>
