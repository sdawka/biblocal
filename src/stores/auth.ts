import { atom } from 'nanostores';
import type { User } from '../db/schema';

export const currentUser = atom<User | null>(null);
export const authLoading = atom<boolean>(true);

export async function checkAuth(): Promise<User | null> {
  authLoading.set(true);
  try {
    const res = await fetch('/api/auth/me');
    const data = (await res.json()) as { user: User | null };
    currentUser.set(data.user);
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
    window.location.href = '/';
  }
}
