import { describe, it, expect } from 'vitest';
import { filterContactInfo } from '../../src/lib/privacy';
import type { ContactVisibility } from '../../src/lib/types';

describe('filterContactInfo', () => {
  const baseUser = {
    contactMethod: 'email' as const,
    contactValue: 'test@example.com',
    phone: '555-1234',
  };

  describe('with hidden visibility', () => {
    it('returns null when not connected', () => {
      const user = { ...baseUser, contactVisibility: 'hidden' as ContactVisibility };
      const result = filterContactInfo(user, false);
      expect(result).toBeNull();
    });

    it('returns null even when connected', () => {
      const user = { ...baseUser, contactVisibility: 'hidden' as ContactVisibility };
      const result = filterContactInfo(user, true);
      expect(result).toBeNull();
    });
  });

  describe('with on-request visibility', () => {
    it('returns null when not connected', () => {
      const user = { ...baseUser, contactVisibility: 'on-request' as ContactVisibility };
      const result = filterContactInfo(user, false);
      expect(result).toBeNull();
    });

    it('returns contact info when connected', () => {
      const user = { ...baseUser, contactVisibility: 'on-request' as ContactVisibility };
      const result = filterContactInfo(user, true);
      expect(result).toEqual({
        contactMethod: 'email',
        contactValue: 'test@example.com',
        phone: '555-1234',
      });
    });
  });

  describe('with public visibility', () => {
    it('returns contact info when not connected', () => {
      const user = { ...baseUser, contactVisibility: 'public' as ContactVisibility };
      const result = filterContactInfo(user, false);
      expect(result).toEqual({
        contactMethod: 'email',
        contactValue: 'test@example.com',
        phone: '555-1234',
      });
    });

    it('returns contact info when connected', () => {
      const user = { ...baseUser, contactVisibility: 'public' as ContactVisibility };
      const result = filterContactInfo(user, true);
      expect(result).toEqual({
        contactMethod: 'email',
        contactValue: 'test@example.com',
        phone: '555-1234',
      });
    });
  });

  describe('with undefined visibility', () => {
    it('defaults to hidden and returns null', () => {
      const user = { ...baseUser, contactVisibility: undefined };
      const result = filterContactInfo(user, false);
      expect(result).toBeNull();
    });

    it('defaults to hidden even when connected', () => {
      const user = { ...baseUser, contactVisibility: undefined };
      const result = filterContactInfo(user, true);
      expect(result).toBeNull();
    });
  });

  describe('with partial contact info', () => {
    it('returns partial info when some fields are undefined', () => {
      const user = {
        contactMethod: 'email' as const,
        contactValue: 'test@example.com',
        contactVisibility: 'public' as ContactVisibility,
      };
      const result = filterContactInfo(user, false);
      expect(result).toEqual({
        contactMethod: 'email',
        contactValue: 'test@example.com',
        phone: undefined,
      });
    });

    it('returns empty object for user with no contact fields', () => {
      const user = {
        contactVisibility: 'public' as ContactVisibility,
      };
      const result = filterContactInfo(user, false);
      expect(result).toEqual({
        contactMethod: undefined,
        contactValue: undefined,
        phone: undefined,
      });
    });
  });
});
