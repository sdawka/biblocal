import { describe, it, expect, vi, beforeEach } from 'vitest';
import { filterContactInfo } from '../../src/lib/privacy';
import type { ContactVisibility } from '../../src/lib/types';

// Unit tests for the public profile endpoint logic
// These test the data transformation logic without requiring the full API stack

describe('Public User Profile Logic', () => {
  describe('visible books filtering', () => {
    it('includes only visible books in public profile', () => {
      const allBooks = [
        { id: '1', title: 'Visible Book', visibility: 'visible' },
        { id: '2', title: 'Private Book', visibility: 'private' },
        { id: '3', title: 'Another Visible', visibility: 'visible' },
      ];

      const visibleBooks = allBooks.filter((b) => b.visibility === 'visible');

      expect(visibleBooks).toHaveLength(2);
      expect(visibleBooks.map((b) => b.title)).toEqual(['Visible Book', 'Another Visible']);
    });
  });

  describe('contact info filtering for profiles', () => {
    const profileUser = {
      contactMethod: 'email' as const,
      contactValue: 'user@example.com',
      phone: '555-1234',
      contactVisibility: 'on-request' as ContactVisibility,
    };

    it('hides contact info for unconnected viewers', () => {
      const isConnected = false;
      const result = filterContactInfo(profileUser, isConnected);
      expect(result).toBeNull();
    });

    it('shows contact info for connected viewers', () => {
      const isConnected = true;
      const result = filterContactInfo(profileUser, isConnected);
      expect(result).toEqual({
        contactMethod: 'email',
        contactValue: 'user@example.com',
        phone: '555-1234',
      });
    });

    it('always shows contact info when visibility is public', () => {
      const publicUser = { ...profileUser, contactVisibility: 'public' as ContactVisibility };
      const result = filterContactInfo(publicUser, false);
      expect(result).not.toBeNull();
    });
  });

  describe('bookstore profile fields', () => {
    it('includes store-specific fields for bookstore type', () => {
      const storeProfile = {
        id: 'store-123',
        name: 'Test Bookstore',
        city: 'Montreal',
        type: 'bookstore',
        neighborhood: 'Mile End',
        address: '123 Book St',
        website: 'https://books.example.com',
        specialties: '["Fiction", "Poetry"]',
      };

      // Simulate the API response building
      const publicProfile = {
        id: storeProfile.id,
        name: storeProfile.name,
        city: storeProfile.city,
        type: storeProfile.type,
        ...(storeProfile.type === 'bookstore' && {
          neighborhood: storeProfile.neighborhood,
          address: storeProfile.address,
          website: storeProfile.website,
          specialties: JSON.parse(storeProfile.specialties),
        }),
      };

      expect(publicProfile.neighborhood).toBe('Mile End');
      expect(publicProfile.address).toBe('123 Book St');
      expect(publicProfile.website).toBe('https://books.example.com');
      expect(publicProfile.specialties).toEqual(['Fiction', 'Poetry']);
    });

    it('excludes store-specific fields for person type', () => {
      const personProfile = {
        id: 'user-123',
        name: 'Test User',
        city: 'Montreal',
        type: 'person',
        neighborhood: 'Mile End', // should not appear in output
        address: '123 Home St', // should not appear in output
      };

      // Simulate the API response building
      const publicProfile = {
        id: personProfile.id,
        name: personProfile.name,
        city: personProfile.city,
        type: personProfile.type,
        ...(personProfile.type === 'bookstore' && {
          neighborhood: personProfile.neighborhood,
          address: personProfile.address,
        }),
      };

      expect(publicProfile.neighborhood).toBeUndefined();
      expect(publicProfile.address).toBeUndefined();
    });
  });

  describe('own profile detection', () => {
    it('identifies when viewer is profile owner', () => {
      const viewerId = 'user-123';
      const profileId = 'user-123';
      const isOwnProfile = viewerId === profileId;
      expect(isOwnProfile).toBe(true);
    });

    it('identifies when viewer is not profile owner', () => {
      const viewerId = 'user-123';
      const profileId = 'user-456';
      const isOwnProfile = viewerId === profileId;
      expect(isOwnProfile).toBe(false);
    });

    it('handles null viewer (not authenticated)', () => {
      const viewerId = null;
      const profileId = 'user-123';
      const isOwnProfile = viewerId === profileId;
      expect(isOwnProfile).toBe(false);
    });
  });

  describe('book response transformation', () => {
    it('parses JSON fields correctly', () => {
      const dbBook = {
        id: 'book-123',
        title: 'Test Book',
        author: 'Test Author',
        isbn: '978-0-123456-78-9',
        coverUrl: 'https://covers.example.com/book.jpg',
        visibility: 'visible',
        ownership: 'have',
        intents: '["borrowable", "discussable"]',
        subjects: '["Fiction", "Science"]',
      };

      const transformed = {
        id: dbBook.id,
        title: dbBook.title,
        author: dbBook.author,
        isbn: dbBook.isbn,
        coverUrl: dbBook.coverUrl,
        visibility: dbBook.visibility,
        ownership: dbBook.ownership,
        intents: dbBook.intents ? JSON.parse(dbBook.intents) : [],
        subjects: dbBook.subjects ? JSON.parse(dbBook.subjects) : [],
      };

      expect(transformed.intents).toEqual(['borrowable', 'discussable']);
      expect(transformed.subjects).toEqual(['Fiction', 'Science']);
    });

    it('handles null JSON fields', () => {
      const dbBook = {
        id: 'book-123',
        title: 'Test Book',
        author: 'Test Author',
        visibility: 'visible',
        ownership: 'have',
        intents: null,
        subjects: null,
      };

      const transformed = {
        id: dbBook.id,
        title: dbBook.title,
        author: dbBook.author,
        visibility: dbBook.visibility,
        ownership: dbBook.ownership,
        intents: dbBook.intents ? JSON.parse(dbBook.intents) : [],
        subjects: dbBook.subjects ? JSON.parse(dbBook.subjects) : [],
      };

      expect(transformed.intents).toEqual([]);
      expect(transformed.subjects).toEqual([]);
    });
  });
});
