import { atom } from 'nanostores';
import type { UserProfile } from '../lib/types';

export const seedUsers = atom<UserProfile[]>([]);
export const usersLoading = atom<boolean>(false);
export const usersError = atom<string | null>(null);

export async function loadSeedUsers(): Promise<void> {
  if (seedUsers.get().length > 0) return;

  usersLoading.set(true);
  usersError.set(null);

  try {
    const res = await fetch('/api/users.json');
    if (!res.ok) throw new Error('Failed to load users');
    const data = await res.json();
    seedUsers.set(data);
  } catch (err) {
    usersError.set(err instanceof Error ? err.message : 'Unknown error');
  } finally {
    usersLoading.set(false);
  }
}
