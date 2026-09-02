import { atom } from 'nanostores';
import { checkUserIdentity, setLastUserId, clearUserData } from './sync';

export const currentUserId = atom<string | null>(null);
export const authLoading = atom<boolean>(false);

export async function onUserChange(userId: string | null): Promise<void> {
  const oldUserId = currentUserId.get();
  if (userId) {
    const identity = checkUserIdentity(userId);
    if (identity === 'different') {
      // Invalidate old async work before releasing only this tab's leases.
      currentUserId.set(userId);
      clearUserData();
      // Mirror onLogout: reset in-memory atoms before loading the new user's
      // data so the previous user's shelf/profile are not treated as
      // "local-only" and uploaded under the new user's credentials.
      const { shelf, shelfHydrated, endShelfSession } = await import('./shelf');
      if (oldUserId) endShelfSession(oldUserId);
      shelf.set({});
      shelfHydrated.set(false);
      const { profile, DEFAULT_PROFILE } = await import('./profile');
      profile.set(DEFAULT_PROFILE);
      const { connectionRequests } = await import('./connections');
      connectionRequests.set([]);
    }
    setLastUserId(userId);
    currentUserId.set(userId);

    const { loadBooksFromServer } = await import('./shelf');
    const { loadProfileFromServer } = await import('./profile');
    Promise.all([loadBooksFromServer(), loadProfileFromServer()]).catch(console.error);
  } else {
    currentUserId.set(null);
    if (oldUserId) {
      const { endShelfSession } = await import('./shelf');
      endShelfSession(oldUserId);
    }
  }
}

export async function onLogout(): Promise<void> {
  const oldUserId = currentUserId.get();
  currentUserId.set(null);
  clearUserData();
  // clearUserData() only wipes localStorage; reset the in-memory atoms too so
  // the previous user's shelf/profile don't linger until a page reload. Dynamic
  // import avoids a circular dependency (shelf/profile import from auth).
  const { shelf, shelfHydrated, endShelfSession } = await import('./shelf');
  if (oldUserId) endShelfSession(oldUserId);
  const { profile, DEFAULT_PROFILE } = await import('./profile');
  shelf.set({});
  shelfHydrated.set(false);
  profile.set(DEFAULT_PROFILE);
}
