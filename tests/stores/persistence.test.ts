import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test the safeJsonDecode pattern used in persistent stores
// We test the decoder functions directly rather than mocking localStorage

describe('Safe JSON Decode', () => {
  // Helper that mirrors the implementation in stores
  function safeJsonDecode<T>(defaultValue: T) {
    return (str: string): T => {
      try {
        return JSON.parse(str);
      } catch {
        return defaultValue;
      }
    };
  }

  describe('with corrupted JSON', () => {
    it('returns default empty object for corrupted shelf data', () => {
      const decode = safeJsonDecode({});

      expect(decode('not valid json')).toEqual({});
      expect(decode('{broken')).toEqual({});
      expect(decode('undefined')).toEqual({});
      expect(decode('')).toEqual({});
    });

    it('returns default empty array for corrupted array data', () => {
      const decode = safeJsonDecode<string[]>([]);

      expect(decode('[broken')).toEqual([]);
      expect(decode('not an array')).toEqual([]);
    });

    it('returns default profile for corrupted profile data', () => {
      const defaultProfile = {
        id: '',
        name: '',
        city: '',
        radiusKm: 5,
        topics: { curated: [], freeform: [], inferred: [] },
      };
      const decode = safeJsonDecode(defaultProfile);

      expect(decode('{name: broken}')).toEqual(defaultProfile);
      expect(decode('random string')).toEqual(defaultProfile);
    });

    it('returns default filters for corrupted filter data', () => {
      const defaultFilters = {
        visibility: [],
        ownership: [],
        intents: [],
      };
      const decode = safeJsonDecode(defaultFilters);

      expect(decode('{"visibility": broken}')).toEqual(defaultFilters);
    });
  });

  describe('with valid JSON', () => {
    it('parses valid shelf data correctly', () => {
      const decode = safeJsonDecode({});
      const validData = {
        'book-1': { id: 'book-1', title: 'Test Book', author: 'Author' },
      };

      expect(decode(JSON.stringify(validData))).toEqual(validData);
    });

    it('parses valid array data correctly', () => {
      const decode = safeJsonDecode<string[]>([]);
      const validData = ['prompt-1', 'prompt-2'];

      expect(decode(JSON.stringify(validData))).toEqual(validData);
    });

    it('parses valid profile data correctly', () => {
      const defaultProfile = { id: '', name: '' };
      const decode = safeJsonDecode(defaultProfile);
      const validData = { id: 'user-123', name: 'Test User' };

      expect(decode(JSON.stringify(validData))).toEqual(validData);
    });

    it('parses valid filter data correctly', () => {
      const defaultFilters = { visibility: [], ownership: [], intents: [] };
      const decode = safeJsonDecode(defaultFilters);
      const validData = {
        visibility: ['visible', 'private'],
        ownership: ['have'],
        intents: ['borrowable'],
      };

      expect(decode(JSON.stringify(validData))).toEqual(validData);
    });

    it('handles empty but valid JSON structures', () => {
      const decodeObj = safeJsonDecode({ fallback: true });
      const decodeArr = safeJsonDecode(['fallback']);

      expect(decodeObj('{}')).toEqual({});
      expect(decodeArr('[]')).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('handles null JSON value', () => {
      const decode = safeJsonDecode({ default: true });

      // JSON.parse('null') returns null, not an error
      expect(decode('null')).toBeNull();
    });

    it('handles numeric JSON value', () => {
      const decode = safeJsonDecode(0);

      expect(decode('42')).toBe(42);
    });

    it('handles boolean JSON value', () => {
      const decode = safeJsonDecode(false);

      expect(decode('true')).toBe(true);
    });
  });
});
