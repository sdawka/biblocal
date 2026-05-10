import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/stores/auth', () => ({
  currentUserId: { get: vi.fn(() => null) },
}));

import { currentUserId } from '../../src/stores/auth';
import {
  isAuthenticated,
  checkUserIdentity,
  setLastUserId,
  clearUserData,
} from '../../src/stores/sync';

describe('Sync Store', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(currentUserId.get).mockReturnValue(null);
  });

  describe('isAuthenticated', () => {
    it('returns false when no user', () => {
      expect(isAuthenticated()).toBe(false);
    });

    it('returns true when user is set', () => {
      vi.mocked(currentUserId.get).mockReturnValue('user-123');
      expect(isAuthenticated()).toBe(true);
    });
  });

  describe('checkUserIdentity', () => {
    it('returns "new" for first-time user', () => {
      expect(checkUserIdentity('user-123')).toBe('new');
    });

    it('returns "same" for returning user', () => {
      setLastUserId('user-123');
      expect(checkUserIdentity('user-123')).toBe('same');
    });

    it('returns "different" for different user', () => {
      setLastUserId('user-123');
      expect(checkUserIdentity('user-456')).toBe('different');
    });
  });

  describe('setLastUserId', () => {
    it('stores user ID in localStorage', () => {
      setLastUserId('test-user');
      expect(localStorage.getItem('biblocal:lastUserId')).toBe('test-user');
    });

    it('overwrites previous user ID', () => {
      setLastUserId('user-1');
      setLastUserId('user-2');
      expect(localStorage.getItem('biblocal:lastUserId')).toBe('user-2');
    });
  });

  describe('clearUserData', () => {
    it('clears all biblocal data from localStorage', () => {
      localStorage.setItem('biblocal:shelf:v1', '{}');
      localStorage.setItem('biblocal:profile:v1', '{}');
      localStorage.setItem('biblocal:dismissed:v1', '[]');
      localStorage.setItem('biblocal:filter:v1', '"all"');
      localStorage.setItem('biblocal:lastUserId', 'user-123');
      localStorage.setItem('other-app:data', 'should-stay');

      clearUserData();

      expect(localStorage.getItem('biblocal:shelf:v1')).toBeNull();
      expect(localStorage.getItem('biblocal:profile:v1')).toBeNull();
      expect(localStorage.getItem('biblocal:dismissed:v1')).toBeNull();
      expect(localStorage.getItem('biblocal:filter:v1')).toBeNull();
      expect(localStorage.getItem('biblocal:lastUserId')).toBeNull();
      expect(localStorage.getItem('other-app:data')).toBe('should-stay');
    });
  });
});
