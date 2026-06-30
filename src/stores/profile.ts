import { persistentAtom } from '@nanostores/persistent';
import type { UserProfile, UserTopics, BookIntent, LocationPrecision, ContactMethod, ContactVisibility } from '../lib/types';
import { currentUserId } from './auth';
import { shelf } from './shelf';
import { reportSyncError } from './sync-status';
import { getCityCoordinates, roundCoordinates } from '../lib/geo';

function safeJsonDecode<T>(defaultValue: T) {
  return (str: string): T => {
    try {
      return JSON.parse(str);
    } catch {
      return defaultValue;
    }
  };
}

const DEFAULT_TOPICS: UserTopics = {
  curated: [],
  freeform: [],
  inferred: [],
};

export const DEFAULT_PROFILE: UserProfile = {
  id: '',
  name: '',
  city: '',
  radiusKm: 5,
  topics: DEFAULT_TOPICS,
};

export const profile = persistentAtom<UserProfile>('biblocal:profile:v1', DEFAULT_PROFILE, {
  encode: JSON.stringify,
  decode: safeJsonDecode(DEFAULT_PROFILE),
});

export const dismissedPrompts = persistentAtom<string[]>('biblocal:dismissed:v1', [], {
  encode: JSON.stringify,
  decode: safeJsonDecode([]),
});

const PROFILE_SYNC_ERROR = 'Could not save your profile. Please try again.';

// `prior` is the profile snapshot captured before the optimistic set, so a
// failed sync can revert the local change instead of letting it persist only
// locally (and silently vanish on the next server-backed reload).
async function syncProfile(updates: Partial<UserProfile>, prior?: UserProfile): Promise<void> {
  if (!currentUserId.get()) return;
  const serverUpdates: Record<string, unknown> = {};
  if (updates.name !== undefined) serverUpdates.name = updates.name;
  if (updates.city !== undefined) serverUpdates.city = updates.city;
  if (updates.radiusKm !== undefined) serverUpdates.radiusKm = updates.radiusKm;
  if (updates.borrowStyle !== undefined) serverUpdates.borrowStyle = updates.borrowStyle;
  if (updates.currentObsessions !== undefined) serverUpdates.currentObsessions = updates.currentObsessions;
  if (updates.topics?.curated !== undefined) serverUpdates.topicsCurated = updates.topics.curated;
  if (updates.topics?.freeform !== undefined) serverUpdates.topicsFreeform = updates.topics.freeform;
  // Geolocation
  if (updates.latitude !== undefined) serverUpdates.latitude = updates.latitude;
  if (updates.longitude !== undefined) serverUpdates.longitude = updates.longitude;
  if (updates.locationPrecision !== undefined) serverUpdates.locationPrecision = updates.locationPrecision;
  // Contact
  if (updates.contactMethod !== undefined) serverUpdates.contactMethod = updates.contactMethod;
  if (updates.contactValue !== undefined) serverUpdates.contactValue = updates.contactValue;
  if (updates.contactVisibility !== undefined) serverUpdates.contactVisibility = updates.contactVisibility;
  if (Object.keys(serverUpdates).length === 0) return;
  try {
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(serverUpdates),
    });
    if (!res.ok) {
      console.error('Failed to sync profile:', await res.text());
      if (prior) profile.set(prior);
      reportSyncError(PROFILE_SYNC_ERROR);
    }
  } catch (e) {
    console.error('Failed to sync profile:', e);
    if (prior) profile.set(prior);
    reportSyncError(PROFILE_SYNC_ERROR);
  }
}

export function initProfile(name: string, city: string): void {
  const prior = profile.get();
  const newProfile = {
    ...DEFAULT_PROFILE,
    id: crypto.randomUUID(),
    name,
    city,
  };
  profile.set(newProfile);
  syncProfile({ name, city }, prior);
}

export function isOnboarded(): boolean {
  const p = profile.get();
  return p.id !== '' && p.name !== '' && p.city !== '';
}

export function updateProfile(updates: Partial<UserProfile>): void {
  const current = profile.get();
  profile.set({ ...current, ...updates });
  syncProfile(updates, current);
}

export function updateTopics(topics: Partial<UserTopics>): void {
  const current = profile.get();
  profile.set({
    ...current,
    topics: { ...current.topics, ...topics },
  });
  if (topics.curated !== undefined || topics.freeform !== undefined) {
    syncProfile({ topics: { ...current.topics, ...topics } }, current);
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
  // Geolocation
  latitude: number | null;
  longitude: number | null;
  locationPrecision: string | null;
  // Contact
  contactMethod: string | null;
  contactValue: string | null;
  contactVisibility: string | null;
}

export async function loadProfileFromServer(): Promise<void> {
  // Capture the user this load is for; if it changes mid-flight (fast re-login
  // as a different user), bail before set() so a slow response can't overwrite
  // the newer user's freshly-loaded profile.
  const loadingFor = currentUserId.get();
  if (!loadingFor) return;
  try {
    const res = await fetch('/api/profile');
    if (currentUserId.get() !== loadingFor) return;
    if (!res.ok) return;
    const data = await res.json() as { profile: ServerProfile };
    if (currentUserId.get() !== loadingFor) return;
    const sp = data.profile;
    const current = profile.get();
    profile.set({
      ...DEFAULT_PROFILE,
      id: sp.id,
      name: sp.name || '',
      city: sp.city || '',
      radiusKm: sp.radiusKm || 5,
      borrowStyle: sp.borrowStyle || undefined,
      currentObsessions: sp.currentObsessions
        ? (() => {
            try {
              return JSON.parse(sp.currentObsessions);
            } catch {
              // Handle plain string (e.g., "recursive narratives, unreliable narrators")
              return sp.currentObsessions.split(',').map((s: string) => s.trim()).filter(Boolean);
            }
          })()
        : undefined,
      topics: {
        curated: sp.topicsCurated ? safeJsonDecode<string[]>([])(sp.topicsCurated) : [],
        freeform: sp.topicsFreeform ? safeJsonDecode<string[]>([])(sp.topicsFreeform) : [],
        inferred: current.topics.inferred,
      },
      // Geolocation
      latitude: sp.latitude ?? undefined,
      longitude: sp.longitude ?? undefined,
      locationPrecision: (sp.locationPrecision as LocationPrecision) ?? 'city',
      // Contact
      contactMethod: (sp.contactMethod as ContactMethod) ?? undefined,
      contactValue: sp.contactValue ?? undefined,
      contactVisibility: (sp.contactVisibility as ContactVisibility) ?? 'hidden',
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

export interface GeolocationResult {
  success: boolean;
  lat?: number;
  lng?: number;
  error?: string;
}

export async function requestGeolocation(precision: LocationPrecision = 'approximate'): Promise<GeolocationResult> {
  if (!navigator.geolocation) {
    return { success: false, error: 'Geolocation not supported' };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = roundCoordinates(
          position.coords.latitude,
          position.coords.longitude,
          precision
        );
        updateProfile({
          latitude: coords.lat,
          longitude: coords.lng,
          locationPrecision: precision,
        });
        resolve({ success: true, lat: coords.lat, lng: coords.lng });
      },
      (error) => {
        resolve({ success: false, error: error.message });
      },
      { enableHighAccuracy: precision === 'exact', timeout: 10000 }
    );
  });
}

export function setLocationFromCity(city: string): void {
  const coords = getCityCoordinates(city);
  if (coords) {
    updateProfile({
      latitude: coords.lat,
      longitude: coords.lng,
      locationPrecision: 'city',
    });
  }
}

export function updateContactInfo(
  method: ContactMethod,
  value: string,
  visibility: ContactVisibility
): void {
  updateProfile({
    contactMethod: method,
    contactValue: value,
    contactVisibility: visibility,
  });
}
