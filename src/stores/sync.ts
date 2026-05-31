import { currentUserId } from './auth';

const USER_ID_KEY = 'biblocal:lastUserId';

export function isAuthenticated(): boolean {
  return currentUserId.get() !== null;
}

export function checkUserIdentity(userId: string): 'same' | 'different' | 'new' {
  const lastUserId = localStorage.getItem(USER_ID_KEY);
  if (!lastUserId) return 'new';
  return lastUserId === userId ? 'same' : 'different';
}

export function setLastUserId(userId: string): void {
  localStorage.setItem(USER_ID_KEY, userId);
}

export function clearUserData(): void {
  localStorage.removeItem('biblocal:shelf:v1');
  localStorage.removeItem('biblocal:profile:v1');
  localStorage.removeItem('biblocal:dismissed:v1');
  localStorage.removeItem('biblocal:filter:v1');
  localStorage.removeItem('biblocal:filter:v2');
  localStorage.removeItem('biblocal:filter:v3');
  localStorage.removeItem(USER_ID_KEY);
}
