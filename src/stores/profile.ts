import { persistentAtom } from '@nanostores/persistent';
import type { UserProfile, UserTopics } from '../lib/types';
import { currentUser } from './auth';

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

async function syncProfile(updates: Partial<UserProfile>): Promise<void> {
  if (!currentUser.get()) return;
  const serverUpdates: Record<string, unknown> = {};
  if (updates.name !== undefined) serverUpdates.name = updates.name;
  if (updates.city !== undefined) serverUpdates.city = updates.city;
  if (updates.radiusKm !== undefined) serverUpdates.radiusKm = updates.radiusKm;
  if (updates.borrowStyle !== undefined) serverUpdates.borrowStyle = updates.borrowStyle;
  if (updates.currentObsessions !== undefined) serverUpdates.currentObsessions = updates.currentObsessions;
  if (updates.topics?.curated !== undefined) serverUpdates.topicsCurated = updates.topics.curated;
  if (updates.topics?.freeform !== undefined) serverUpdates.topicsFreeform = updates.topics.freeform;
  if (Object.keys(serverUpdates).length === 0) return;
  try {
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(serverUpdates),
    });
  } catch (e) {
    console.error('Failed to sync profile:', e);
  }
}

export function initProfile(name: string, city: string): void {
  const newProfile = {
    ...DEFAULT_PROFILE,
    id: crypto.randomUUID(),
    name,
    city,
  };
  profile.set(newProfile);
  syncProfile({ name, city });
}

export function isOnboarded(): boolean {
  const p = profile.get();
  return p.id !== '' && p.name !== '' && p.city !== '';
}

export function updateProfile(updates: Partial<UserProfile>): void {
  const current = profile.get();
  profile.set({ ...current, ...updates });
  syncProfile(updates);
}

export function updateTopics(topics: Partial<UserTopics>): void {
  const current = profile.get();
  profile.set({
    ...current,
    topics: { ...current.topics, ...topics },
  });
  if (topics.curated !== undefined || topics.freeform !== undefined) {
    syncProfile({ topics: { ...current.topics, ...topics } });
  }
}

interface ServerProfile {
  id: string;
  name: string | null;
  city: string | null;
  radiusKm: number | null;
  borrowStyle: string | null;
  currentObsessions: string | null;
  topicsCurated: string | null;
  topicsFreeform: string | null;
}

export async function loadProfileFromServer(): Promise<void> {
  if (!currentUser.get()) return;
  try {
    const res = await fetch('/api/profile');
    if (!res.ok) return;
    const data = await res.json() as { profile: ServerProfile };
    const sp = data.profile;
    const current = profile.get();
    profile.set({
      ...DEFAULT_PROFILE,
      id: sp.id,
      name: sp.name || '',
      city: sp.city || '',
      radiusKm: sp.radiusKm || 5,
      borrowStyle: sp.borrowStyle || undefined,
      currentObsessions: sp.currentObsessions ? JSON.parse(sp.currentObsessions) : undefined,
      topics: {
        curated: sp.topicsCurated ? JSON.parse(sp.topicsCurated) : [],
        freeform: sp.topicsFreeform ? JSON.parse(sp.topicsFreeform) : [],
        inferred: current.topics.inferred,
      },
    });
  } catch (e) {
    console.error('Failed to load profile from server:', e);
  }
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
