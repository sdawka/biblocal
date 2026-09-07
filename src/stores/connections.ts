import { atom, computed } from 'nanostores';
import type { ConnectionRequest, ConnectionStatus, ContactMethod } from '../lib/types';
import { currentUserId } from './auth';

export const connectionRequests = atom<ConnectionRequest[]>([]);
export const connectionsLoading = atom(false);
export const connectionsError = atom<string | null>(null);

export interface AuthorizedContact {
  method: ContactMethod;
  value: string;
  phone?: string;
}

// Contact details are never part of discovery data. They only enter this
// session-scoped cache after the existing authorized profile endpoint confirms
// an accepted relationship for the current viewer.
export const authorizedContacts = atom<Record<string, AuthorizedContact>>({});

let observedUserId = currentUserId.get();
let connectionLoadSequence = 0;
let connectionSessionGeneration = 0;

currentUserId.subscribe((userId) => {
  if (userId === observedUserId) return;
  observedUserId = userId;
  connectionSessionGeneration += 1;
  connectionLoadSequence += 1;
  connectionRequests.set([]);
  authorizedContacts.set({});
  connectionsLoading.set(false);
  connectionsError.set(null);
});

export const incomingRequests = computed(
  [connectionRequests, currentUserId],
  (requests, userId) =>
    requests.filter((r) => r.toUserId === userId && r.status === 'pending')
);

export const outgoingRequests = computed(
  [connectionRequests, currentUserId],
  (requests, userId) =>
    requests.filter((r) => r.fromUserId === userId)
);

export const acceptedConnections = computed(
  [connectionRequests, currentUserId],
  (requests, userId) => {
    return requests.filter(
      (r) => r.status === 'accepted' && (r.fromUserId === userId || r.toUserId === userId)
    );
  }
);

export async function loadConnections({ retries = 0 }: { retries?: number } = {}): Promise<boolean> {
  const viewerId = currentUserId.get();
  if (!viewerId) return false;
  const loadSequence = ++connectionLoadSequence;
  const sessionGeneration = connectionSessionGeneration;
  connectionsLoading.set(true);
  connectionsError.set(null);
  let loaded = false;
  try {
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const res = await fetch('/api/connections');
        if (!res.ok) continue;
        const data = (await res.json()) as { connections?: ConnectionRequest[] };
        // A response for a former session must never populate the new viewer's
        // relationship state. A newer load in this session also wins.
        if (
          currentUserId.get() !== viewerId ||
          sessionGeneration !== connectionSessionGeneration ||
          loadSequence !== connectionLoadSequence
        ) return false;
        connectionRequests.set(data.connections ?? []);
        pruneAuthorizedContacts(data.connections ?? [], viewerId);
        loaded = true;
        return true;
      } catch (e) {
        if (attempt === retries) console.error('Failed to load connections:', e);
      }
    }
  } finally {
    if (
      currentUserId.get() === viewerId &&
      sessionGeneration === connectionSessionGeneration &&
      loadSequence === connectionLoadSequence
    ) {
      connectionsLoading.set(false);
      if (!loaded) connectionsError.set('Could not load connections');
    }
  }
  return false;
}

export async function loadAuthorizedContact(
  profileId: string
): Promise<{ success: true; contact: AuthorizedContact } | { success: false; error?: string }> {
  const viewerId = currentUserId.get();
  if (!viewerId || getConnectionStatus(profileId) !== 'accepted') {
    return { success: false, error: 'Not connected' };
  }

  const cached = authorizedContacts.get()[profileId];
  if (cached) return { success: true, contact: cached };
  const sessionGeneration = connectionSessionGeneration;

  try {
    const res = await fetch(`/api/users/${encodeURIComponent(profileId)}`);
    if (!res.ok) return { success: false, error: 'Contact unavailable' };
    const data = (await res.json()) as {
      profile?: { contactMethod?: unknown; contactValue?: unknown; phone?: unknown };
    };
    const method = data.profile?.contactMethod;
    const value = data.profile?.contactValue;
    if (!isContactMethod(method) || typeof value !== 'string' || !value.trim()) {
      return { success: false, error: 'Contact unavailable' };
    }
    // The server authorizes the endpoint, and this guard prevents a response
    // started under one session from leaking into the next one in this tab.
    if (
      currentUserId.get() !== viewerId ||
      sessionGeneration !== connectionSessionGeneration ||
      getConnectionStatus(profileId) !== 'accepted'
    ) {
      return { success: false, error: 'Session changed' };
    }
    const contact: AuthorizedContact = {
      method,
      value,
      ...(typeof data.profile?.phone === 'string' && data.profile.phone.trim()
        ? { phone: data.profile.phone }
        : {}),
    };
    authorizedContacts.set({ ...authorizedContacts.get(), [profileId]: contact });
    return { success: true, contact };
  } catch (e) {
    console.error('Failed to load authorized contact:', e);
    return { success: false, error: 'Network error' };
  }
}

function isContactMethod(value: unknown): value is ContactMethod {
  return value === 'email' || value === 'social' || value === 'custom';
}

function pruneAuthorizedContacts(requests: ConnectionRequest[], viewerId: string): void {
  const acceptedProfileIds = new Set(
    requests
      .filter(
        (request) =>
          request.status === 'accepted' &&
          (request.fromUserId === viewerId || request.toUserId === viewerId)
      )
      .map((request) =>
        request.fromUserId === viewerId ? request.toUserId : request.fromUserId
      )
  );
  const retained = Object.fromEntries(
    Object.entries(authorizedContacts.get()).filter(([profileId]) => acceptedProfileIds.has(profileId))
  );
  authorizedContacts.set(retained);
}

export async function sendConnectionRequest(toUserId: string): Promise<{ success: boolean; error?: string }> {
  if (!currentUserId.get()) return { success: false, error: 'Not authenticated' };
  try {
    const res = await fetch('/api/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toUserId }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to send request' };
    }
    await loadConnections();
    return { success: true };
  } catch (e) {
    console.error('Failed to send connection request:', e);
    return { success: false, error: 'Network error' };
  }
}

export async function respondToRequest(
  requestId: string,
  status: 'accepted' | 'declined'
): Promise<{ success: boolean; error?: string }> {
  if (!currentUserId.get()) return { success: false, error: 'Not authenticated' };
  try {
    const res = await fetch(`/api/connections/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to respond' };
    }
    await loadConnections();
    return { success: true };
  } catch (e) {
    console.error('Failed to respond to request:', e);
    return { success: false, error: 'Network error' };
  }
}

export function getConnectionStatus(userId: string): ConnectionStatus | null {
  const myId = currentUserId.get();
  const requests = connectionRequests.get();
  const request = requests.find(
    (r) =>
      (r.fromUserId === myId && r.toUserId === userId) ||
      (r.fromUserId === userId && r.toUserId === myId)
  );
  return request?.status ?? null;
}
