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

export async function onLogout(): Promise<void> {
  currentUserId.set(null);
  clearUserData();
  // clearUserData() only wipes localStorage; reset the in-memory atoms too so
  // the previous user's shelf/profile don't linger until a page reload. Dynamic
  // import avoids a circular dependency (shelf/profile import from auth).
  const { shelf } = await import('./shelf');
  const { profile, DEFAULT_PROFILE } = await import('./profile');
  shelf.set({});
  profile.set(DEFAULT_PROFILE);
}
