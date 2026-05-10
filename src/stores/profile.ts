import { persistentAtom } from '@nanostores/persistent';
import type { UserProfile, UserTopics, BookIntent } from '../lib/types';
import { currentUserId } from './auth';
import { shelf } from './shelf';

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
  if (!currentUserId.get()) return;
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
  if (!currentUserId.get()) return;
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

export function deriveLendingPersonality(): string {
  const books = Object.values(shelf.get());
  const ownedBooks = books.filter(b => b.ownership === 'have');
  if (ownedBooks.length === 0) return '';

  const intentCounts: Record<BookIntent, number> = {
    borrowable: 0,
    discussable: 0,
    giftable: 0,
    'class-resource': 0,
  };

  for (const book of ownedBooks) {
    for (const intent of book.intents) {
      intentCounts[intent]++;
    }
  }

  const total = ownedBooks.length;
  const borrowableRatio = intentCounts.borrowable / total;
  const discussableRatio = intentCounts.discussable / total;
  const giftableRatio = intentCounts.giftable / total;

  if (borrowableRatio > 0.5) return 'Generous lender';
  if (giftableRatio > 0.3) return 'Loves to gift books';
  if (discussableRatio > borrowableRatio) return 'Discussion-focused';
  if (borrowableRatio > 0.2) return 'Selective lender';
  if (borrowableRatio > 0) return 'Occasional lender';
  return 'Private collector';
}

export function updateLendingPersonality(personality: string, isOverride: boolean = true): void {
  updateProfile({
    lendingPersonality: personality,
    lendingPersonalityOverride: isOverride,
  });
}

export function refreshDerivedProfile(): void {
  const current = profile.get();
  if (!current.lendingPersonalityOverride) {
    const derived = deriveLendingPersonality();
    if (derived && derived !== current.lendingPersonality) {
      profile.set({ ...current, lendingPersonality: derived });
    }
  }
}
