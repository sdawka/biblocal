import { atom, computed } from 'nanostores';
import type { ConnectionRequest, ConnectionStatus } from '../lib/types';
import { currentUserId } from './auth';

export const connectionRequests = atom<ConnectionRequest[]>([]);
export const connectionsLoading = atom(false);

export const incomingRequests = computed(connectionRequests, (requests) =>
  requests.filter((r) => r.toUserId === currentUserId.get() && r.status === 'pending')
);

export const outgoingRequests = computed(connectionRequests, (requests) =>
  requests.filter((r) => r.fromUserId === currentUserId.get())
);

export const acceptedConnections = computed(connectionRequests, (requests) => {
  const userId = currentUserId.get();
  return requests.filter(
    (r) => r.status === 'accepted' && (r.fromUserId === userId || r.toUserId === userId)
  );
});

export async function loadConnections(): Promise<void> {
  if (!currentUserId.get()) return;
  connectionsLoading.set(true);
  try {
    const res = await fetch('/api/connections');
    if (!res.ok) return;
    const data = (await res.json()) as { connections: ConnectionRequest[] };
    connectionRequests.set(data.connections);
  } catch (e) {
    console.error('Failed to load connections:', e);
  } finally {
    connectionsLoading.set(false);
  }
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
