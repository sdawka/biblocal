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

interface UserSession {
  userId: string;
  generation: number;
}

type ProfileField = Exclude<keyof UserProfile, 'topics'> | 'topics.curated' | 'topics.freeform';
type ProfileUpdates = Omit<Partial<UserProfile>, 'topics'> & { topics?: Partial<UserTopics> };

interface ProfileFieldMutation {
  token: symbol;
  value: unknown;
  status: 'pending' | 'succeeded' | 'failed';
}

interface ProfileFieldProvenance {
  confirmed: unknown;
  mutations: ProfileFieldMutation[];
}

const PROFILE_SERVER_FIELDS = [
  'name',
  'city',
  'radiusKm',
  'borrowStyle',
  'currentObsessions',
  'latitude',
  'longitude',
  'locationPrecision',
  'contactMethod',
  'contactValue',
  'contactVisibility',
] as const satisfies ReadonlyArray<Exclude<keyof UserProfile, 'topics'>>;

const profileFieldProvenance = new Map<ProfileField, ProfileFieldProvenance>();
let profileSyncTail: Promise<void> | null = null;
let observedUserId: string | null | undefined;
let userSessionGeneration = 0;

function resetProfileMutationState(): void {
  profileFieldProvenance.clear();
  profileSyncTail = null;
}

function observeUser(userId: string | null): void {
  if (userId === observedUserId) return;
  observedUserId = userId;
  userSessionGeneration += 1;
  resetProfileMutationState();
}

const subscribeToUserId = (currentUserId as unknown as {
  subscribe?: (listener: (userId: string | null) => void) => () => void;
}).subscribe;
if (subscribeToUserId) {
  subscribeToUserId.call(currentUserId, observeUser);
}

function captureUserSession(): UserSession | null {
  const userId = currentUserId.get();
  observeUser(userId);
  return userId ? { userId, generation: userSessionGeneration } : null;
}

function isCurrentUserSession(session: UserSession): boolean {
  const current = captureUserSession();
  return current !== null
    && current.userId === session.userId
    && current.generation === session.generation;
}

function fieldValue(source: UserProfile, field: ProfileField): unknown {
  if (field === 'topics.curated') return source.topics.curated;
  if (field === 'topics.freeform') return source.topics.freeform;
  return source[field];
}

function setFieldValue(source: UserProfile, field: ProfileField, value: unknown): UserProfile {
  if (field === 'topics.curated') {
    return { ...source, topics: { ...source.topics, curated: value as string[] } };
  }
  if (field === 'topics.freeform') {
    return { ...source, topics: { ...source.topics, freeform: value as string[] } };
  }
  return { ...source, [field]: value } as UserProfile;
}

function mutationFields(prior: UserProfile, updates: ProfileUpdates): Map<ProfileField, symbol> {
  const fields = new Map<ProfileField, symbol>();
  for (const field of PROFILE_SERVER_FIELDS) {
    if (updates[field] === undefined) continue;
    const token = Symbol(field);
    const provenance = profileFieldProvenance.get(field) ?? {
      confirmed: fieldValue(prior, field),
      mutations: [],
    };
    provenance.mutations.push({ token, value: updates[field], status: 'pending' });
    profileFieldProvenance.set(field, provenance);
    fields.set(field, token);
  }
  for (const key of ['curated', 'freeform'] as const) {
    if (updates.topics?.[key] === undefined) continue;
    const field = `topics.${key}` as const;
    const token = Symbol(field);
    const provenance = profileFieldProvenance.get(field) ?? {
      confirmed: fieldValue(prior, field),
      mutations: [],
    };
    provenance.mutations.push({ token, value: updates.topics[key], status: 'pending' });
    profileFieldProvenance.set(field, provenance);
    fields.set(field, token);
  }
  return fields;
}

function latestProfileFieldValue(provenance: ProfileFieldProvenance): unknown {
  for (let index = provenance.mutations.length - 1; index >= 0; index -= 1) {
    const mutation = provenance.mutations[index];
    if (mutation.status !== 'failed') return mutation.value;
  }
  return provenance.confirmed;
}

function settleProfileFields(fields: Map<ProfileField, symbol>, outcome: 'succeeded' | 'failed'): boolean {
  let next = profile.get();
  let shouldReportFailure = false;
  for (const [field, token] of fields) {
    const provenance = profileFieldProvenance.get(field);
    if (!provenance) continue;
    const mutation = provenance.mutations.find((entry) => entry.token === token);
    if (!mutation) continue;
    mutation.status = outcome;
    if (outcome === 'failed' && provenance.mutations.at(-1)?.status === 'failed') {
      shouldReportFailure = true;
    }
    const value = latestProfileFieldValue(provenance);
    if (!Object.is(fieldValue(next, field), value)) {
      next = setFieldValue(next, field, value);
    }
    while (provenance.mutations[0]?.status !== 'pending') {
      const settled = provenance.mutations.shift();
      if (!settled) break;
      if (settled.status === 'succeeded') provenance.confirmed = settled.value;
    }
    if (provenance.mutations.length === 0) profileFieldProvenance.delete(field);
  }
  if (next !== profile.get()) profile.set(next);
  return shouldReportFailure;
}

function serverProfileUpdates(updates: ProfileUpdates): Record<string, unknown> {
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
  return serverUpdates;
}

async function sendProfilePatch(
  serverUpdates: Record<string, unknown>,
  session: UserSession,
  fields: Map<ProfileField, symbol>,
): Promise<boolean> {
  try {
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(serverUpdates),
    });
    if (!isCurrentUserSession(session)) return false;
    if (!res.ok) {
      console.error('Failed to sync profile:', await res.text());
      if (!isCurrentUserSession(session)) return false;
      if (settleProfileFields(fields, 'failed')) reportSyncError(PROFILE_SYNC_ERROR);
      return false;
    }
    settleProfileFields(fields, 'succeeded');
    return true;
  } catch (e) {
    if (!isCurrentUserSession(session)) return false;
    console.error('Failed to sync profile:', e);
    if (settleProfileFields(fields, 'failed')) reportSyncError(PROFILE_SYNC_ERROR);
    return false;
  }
}

function syncProfile(
  updates: ProfileUpdates,
  session: UserSession | null,
  fields: Map<ProfileField, symbol>,
): Promise<boolean> {
  const serverUpdates = serverProfileUpdates(updates);
  if (Object.keys(serverUpdates).length === 0) return Promise.resolve(true);
  if (!session) return Promise.resolve(false);

  const run = () => {
    if (!isCurrentUserSession(session)) return false;
    return sendProfilePatch(serverUpdates, session, fields);
  };
  const queued = profileSyncTail ? profileSyncTail.then(run) : Promise.resolve(run());
  // Each queue link resolves regardless of the PATCH outcome, so a failure
  // rolls back its optimistic fields but never blocks the user's next save.
  const tail = queued.then(() => undefined, () => undefined);
  profileSyncTail = tail;
  void tail.then(() => {
    if (profileSyncTail === tail) profileSyncTail = null;
  });
  return queued;
}

export function initProfile(name: string, city: string): void {
  const prior = profile.get();
  const session = captureUserSession();
  const fields = mutationFields(prior, { name, city });
  const newProfile = {
    ...DEFAULT_PROFILE,
    id: crypto.randomUUID(),
    name,
    city,
  };
  profile.set(newProfile);
  void syncProfile({ name, city }, session, fields);
}

export function isOnboarded(): boolean {
  const p = profile.get();
  return p.id !== '' && p.name !== '' && p.city !== '';
}

export function updateProfile(updates: Partial<UserProfile>): Promise<boolean> {
  const current = profile.get();
  const session = captureUserSession();
  const fields = mutationFields(current, updates);
  profile.set({
    ...current,
    ...updates,
    topics: updates.topics ? { ...current.topics, ...updates.topics } : current.topics,
  });
  return syncProfile(updates, session, fields);
}

export function updateTopics(topics: Partial<UserTopics>): Promise<boolean> {
  const current = profile.get();
  const session = captureUserSession();
  const updates = { topics };
  const fields = mutationFields(current, updates);
  profile.set({
    ...current,
    topics: { ...current.topics, ...topics },
  });
  if (topics.curated !== undefined || topics.freeform !== undefined) {
    return syncProfile(updates, session, fields);
  }
  return Promise.resolve(true);
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
  const loadingFor = captureUserSession();
  if (!loadingFor) return;
  try {
    const res = await fetch('/api/profile');
    if (!isCurrentUserSession(loadingFor)) return;
    if (!res.ok) return;
    const data = await res.json() as { profile: ServerProfile };
    if (!isCurrentUserSession(loadingFor)) return;
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

export function updateLendingPersonality(personality: string, isOverride: boolean = true): Promise<boolean> {
  return updateProfile({
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

export function setLocationFromCity(city: string): Promise<boolean> {
  const coords = getCityCoordinates(city);
  if (coords) {
    return updateProfile({
      latitude: coords.lat,
      longitude: coords.lng,
      locationPrecision: 'city',
    });
  }
  return Promise.resolve(true);
}

export function updateContactInfo(
  method: ContactMethod,
  value: string,
  visibility: ContactVisibility
): Promise<boolean> {
  return updateProfile({
    contactMethod: method,
    contactValue: value,
    contactVisibility: visibility,
  });
}
