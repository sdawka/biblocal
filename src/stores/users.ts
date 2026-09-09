import { atom } from 'nanostores';
import type { UserProfile } from '../lib/types';
import { currentUserId } from './auth';

export const discoveryUsers = atom<UserProfile[]>([]);
export const discoveryUsersLoaded = atom<boolean>(false);
export const usersLoading = atom<boolean>(false);
export const usersError = atom<'load-failed' | null>(null);

// In-flight guard: if two callers race, they share the same promise.
let _loadDiscoveryUsersPromise: Promise<void> | null = null;
let loadGeneration = 0;
let discoveryViewerId = currentUserId.get();

currentUserId.subscribe((viewerId) => {
  if (viewerId === discoveryViewerId) return;
  discoveryViewerId = viewerId;

  const shouldReload =
    discoveryUsersLoaded.get() || usersLoading.get() || usersError.get() !== null;
  loadGeneration += 1;
  _loadDiscoveryUsersPromise = null;
  discoveryUsers.set([]);
  discoveryUsersLoaded.set(false);
  usersLoading.set(false);
  usersError.set(null);

  // Once Local has requested its viewer-specific feed, keep it aligned with
  // subsequent sign-in, sign-out, and account changes in the same page.
  if (shouldReload) void loadDiscoveryUsers();
});

export async function loadDiscoveryUsers(): Promise<void> {
  if (discoveryUsersLoaded.get()) return;
  if (_loadDiscoveryUsersPromise) return _loadDiscoveryUsersPromise;

  const generation = loadGeneration;
  const requestPromise = (async () => {
    usersLoading.set(true);
    usersError.set(null);
    try {
      const res = await fetch('/api/users.json');
      if (!res.ok) throw new Error(`Failed to load users (${res.status})`);
      const data = (await res.json()) as UserProfile[];
      if (generation !== loadGeneration) return;
      discoveryUsers.set(data);
      discoveryUsersLoaded.set(true);
    } catch (err) {
      if (generation !== loadGeneration) return;
      console.error('Failed to load users:', err);
      usersError.set('load-failed');
      discoveryUsersLoaded.set(false);
    } finally {
      if (generation === loadGeneration) usersLoading.set(false);
    }
  })();
  _loadDiscoveryUsersPromise = requestPromise;
  void requestPromise.then(() => {
    if (_loadDiscoveryUsersPromise === requestPromise) {
      _loadDiscoveryUsersPromise = null;
    }
  });

  return requestPromise;
}
