import { atom } from 'nanostores';
import type { User } from '../db/schema';
import { checkUserIdentity, setLastUserId, clearUserData } from './sync';

export const currentUser = atom<User | null>(null);
export const authLoading = atom<boolean>(true);

export async function checkAuth(): Promise<User | null> {
  authLoading.set(true);
  try {
    const res = await fetch('/api/auth/me');
    const data = (await res.json()) as { user: User | null };
    currentUser.set(data.user);

    if (data.user) {
      const identity = checkUserIdentity(data.user.id);
      if (identity === 'different') {
        clearUserData();
      }
      setLastUserId(data.user.id);

      const { loadBooksFromServer } = await import('./shelf');
      const { loadProfileFromServer } = await import('./profile');
      Promise.all([loadBooksFromServer(), loadProfileFromServer()]).catch(console.error);
    }

    return data.user;
  } catch {
    currentUser.set(null);
    return null;
  } finally {
    authLoading.set(false);
  }
}

export async function logout(): Promise<void> {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } finally {
    currentUser.set(null);
    clearUserData();
    window.location.href = '/';
  }
}
