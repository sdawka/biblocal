import { persistentAtom } from '@nanostores/persistent';
import type { UserProfile, UserTopics } from '../lib/types';

const DEFAULT_TOPICS: UserTopics = {
  curated: [],
  freeform: [],
  inferred: [],
};

const DEFAULT_PROFILE: UserProfile = {
  id: '',
  name: '',
  city: '',
  radiusKm: 5,
  topics: DEFAULT_TOPICS,
};

const jsonEncoder = {
  encode: JSON.stringify,
  decode: JSON.parse,
};

export const profile = persistentAtom<UserProfile>('biblocal:profile:v1', DEFAULT_PROFILE, jsonEncoder);

export const dismissedPrompts = persistentAtom<string[]>('biblocal:dismissed:v1', [], jsonEncoder);

export function initProfile(name: string, city: string): void {
  profile.set({
    ...DEFAULT_PROFILE,
    id: crypto.randomUUID(),
    name,
    city,
  });
}

export function isOnboarded(): boolean {
  const p = profile.get();
  return p.id !== '' && p.name !== '' && p.city !== '';
}

export function updateProfile(updates: Partial<UserProfile>): void {
  const current = profile.get();
  profile.set({ ...current, ...updates });
}

export function updateTopics(topics: Partial<UserTopics>): void {
  const current = profile.get();
  profile.set({
    ...current,
    topics: { ...current.topics, ...topics },
  });
}

export function dismissPrompt(promptId: string): void {
  const current = dismissedPrompts.get();
  if (!current.includes(promptId)) {
    dismissedPrompts.set([...current, promptId]);
  }
}

export function isPromptDismissed(promptId: string): boolean {
  return dismissedPrompts.get().includes(promptId);
}
