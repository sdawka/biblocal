import { describe, it, expect, beforeEach } from 'vitest';
import { atom } from 'nanostores';

// Re-export a controllable currentUserId for testing
// We test the computed stores directly by manipulating the atoms
const currentUserId = atom<string | null>('user-1');
const connectionRequests = atom<ConnectionRequest[]>([]);
import type { ConnectionRequest } from '../../src/lib/types';
import { computed } from 'nanostores';

// Replicate the computed stores with our controllable atoms
const incomingRequests = computed(
  [connectionRequests, currentUserId],
  (requests, userId) =>
    requests.filter((r) => r.toUserId === userId && r.status === 'pending')
);

const outgoingRequests = computed(
  [connectionRequests, currentUserId],
  (requests, userId) =>
    requests.filter((r) => r.fromUserId === userId)
);

const acceptedConnections = computed(
  [connectionRequests, currentUserId],
  (requests, userId) => {
    return requests.filter(
      (r) => r.status === 'accepted' && (r.fromUserId === userId || r.toUserId === userId)
    );
  }
);

describe('Connection Stores', () => {
  beforeEach(() => {
    connectionRequests.set([]);
    currentUserId.set('user-1');
  });

  describe('incomingRequests', () => {
    it('filters pending requests to current user', () => {
      const requests: ConnectionRequest[] = [
        { id: '1', fromUserId: 'other', toUserId: 'user-1', status: 'pending', createdAt: Date.now() },
        { id: '2', fromUserId: 'another', toUserId: 'user-1', status: 'accepted', createdAt: Date.now() },
        { id: '3', fromUserId: 'user-1', toUserId: 'other', status: 'pending', createdAt: Date.now() },
      ];
      connectionRequests.set(requests);

      const incoming = incomingRequests.get();
      expect(incoming).toHaveLength(1);
      expect(incoming[0].id).toBe('1');
    });

    it('updates when currentUserId changes', () => {
      const requests: ConnectionRequest[] = [
        { id: '1', fromUserId: 'other', toUserId: 'user-1', status: 'pending', createdAt: Date.now() },
        { id: '2', fromUserId: 'other', toUserId: 'user-2', status: 'pending', createdAt: Date.now() },
      ];
      connectionRequests.set(requests);

      expect(incomingRequests.get()).toHaveLength(1);
      expect(incomingRequests.get()[0].id).toBe('1');

      // Change user
      currentUserId.set('user-2');

      expect(incomingRequests.get()).toHaveLength(1);
      expect(incomingRequests.get()[0].id).toBe('2');
    });

    it('returns empty when user is null', () => {
      const requests: ConnectionRequest[] = [
        { id: '1', fromUserId: 'other', toUserId: 'user-1', status: 'pending', createdAt: Date.now() },
      ];
      connectionRequests.set(requests);

      currentUserId.set(null);

      expect(incomingRequests.get()).toHaveLength(0);
    });
  });

  describe('outgoingRequests', () => {
    it('filters requests from current user', () => {
      const requests: ConnectionRequest[] = [
        { id: '1', fromUserId: 'user-1', toUserId: 'other', status: 'pending', createdAt: Date.now() },
        { id: '2', fromUserId: 'user-1', toUserId: 'another', status: 'accepted', createdAt: Date.now() },
        { id: '3', fromUserId: 'other', toUserId: 'user-1', status: 'pending', createdAt: Date.now() },
      ];
      connectionRequests.set(requests);

      const outgoing = outgoingRequests.get();
      expect(outgoing).toHaveLength(2);
      expect(outgoing.map(r => r.id)).toContain('1');
      expect(outgoing.map(r => r.id)).toContain('2');
    });

    it('updates when currentUserId changes', () => {
      const requests: ConnectionRequest[] = [
        { id: '1', fromUserId: 'user-1', toUserId: 'other', status: 'pending', createdAt: Date.now() },
        { id: '2', fromUserId: 'user-2', toUserId: 'other', status: 'pending', createdAt: Date.now() },
      ];
      connectionRequests.set(requests);

      expect(outgoingRequests.get()).toHaveLength(1);
      expect(outgoingRequests.get()[0].id).toBe('1');

      // Change user
      currentUserId.set('user-2');

      expect(outgoingRequests.get()).toHaveLength(1);
      expect(outgoingRequests.get()[0].id).toBe('2');
    });
  });

  describe('acceptedConnections', () => {
    it('filters accepted connections involving current user', () => {
      const requests: ConnectionRequest[] = [
        { id: '1', fromUserId: 'user-1', toUserId: 'other', status: 'accepted', createdAt: Date.now() },
        { id: '2', fromUserId: 'another', toUserId: 'user-1', status: 'accepted', createdAt: Date.now() },
        { id: '3', fromUserId: 'other', toUserId: 'another', status: 'accepted', createdAt: Date.now() },
        { id: '4', fromUserId: 'user-1', toUserId: 'someone', status: 'pending', createdAt: Date.now() },
      ];
      connectionRequests.set(requests);

      const accepted = acceptedConnections.get();
      expect(accepted).toHaveLength(2);
      expect(accepted.map(r => r.id)).toContain('1');
      expect(accepted.map(r => r.id)).toContain('2');
    });

    it('updates when currentUserId changes', () => {
      const requests: ConnectionRequest[] = [
        { id: '1', fromUserId: 'user-1', toUserId: 'other', status: 'accepted', createdAt: Date.now() },
        { id: '2', fromUserId: 'user-2', toUserId: 'other', status: 'accepted', createdAt: Date.now() },
      ];
      connectionRequests.set(requests);

      expect(acceptedConnections.get()).toHaveLength(1);
      expect(acceptedConnections.get()[0].id).toBe('1');

      // Change user
      currentUserId.set('user-2');

      expect(acceptedConnections.get()).toHaveLength(1);
      expect(acceptedConnections.get()[0].id).toBe('2');
    });

    it('includes both directions (from and to user)', () => {
      currentUserId.set('center-user');
      const requests: ConnectionRequest[] = [
        { id: '1', fromUserId: 'center-user', toUserId: 'other', status: 'accepted', createdAt: Date.now() },
        { id: '2', fromUserId: 'another', toUserId: 'center-user', status: 'accepted', createdAt: Date.now() },
      ];
      connectionRequests.set(requests);

      const accepted = acceptedConnections.get();
      expect(accepted).toHaveLength(2);
    });
  });
});
