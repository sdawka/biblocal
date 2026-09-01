import { atom } from 'nanostores';
import type { UserProfile } from '../lib/types';

export const discoveryUsers = atom<UserProfile[]>([]);
export const usersLoading = atom<boolean>(false);
export const usersError = atom<'load-failed' | null>(null);

// In-flight guard: if two callers race, they share the same promise.
let _loadDiscoveryUsersPromise: Promise<void> | null = null;

export async function loadDiscoveryUsers(): Promise<void> {
  if (discoveryUsers.get().length > 0) return;
  if (_loadDiscoveryUsersPromise) return _loadDiscoveryUsersPromise;

  _loadDiscoveryUsersPromise = (async () => {
    usersLoading.set(true);
    usersError.set(null);
    try {
      const res = await fetch('/api/users.json');
      if (!res.ok) throw new Error(`Failed to load users (${res.status})`);
      const data = (await res.json()) as UserProfile[];
      discoveryUsers.set(data);
    } catch (err) {
      console.error('Failed to load users:', err);
      usersError.set('load-failed');
    } finally {
      usersLoading.set(false);
      _loadDiscoveryUsersPromise = null;
    }
  })();

  return _loadDiscoveryUsersPromise;
}
