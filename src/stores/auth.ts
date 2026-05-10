import { atom } from 'nanostores';
import { checkUserIdentity, setLastUserId, clearUserData } from './sync';

export const currentUserId = atom<string | null>(null);
export const authLoading = atom<boolean>(false);

export async function onUserChange(userId: string | null): Promise<void> {
  if (userId) {
    const identity = checkUserIdentity(userId);
    if (identity === 'different') {
      clearUserData();
    }
    setLastUserId(userId);
    currentUserId.set(userId);

    const { loadBooksFromServer } = await import('./shelf');
    const { loadProfileFromServer } = await import('./profile');
    Promise.all([loadBooksFromServer(), loadProfileFromServer()]).catch(console.error);
  } else {
    currentUserId.set(null);
  }
}

export function onLogout(): void {
  currentUserId.set(null);
  clearUserData();
}
