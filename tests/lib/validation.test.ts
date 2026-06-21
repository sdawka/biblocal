import { describe, it, expect } from 'vitest';
import {
  validateEnum,
  safeJsonArray,
  VALID_STATUS,
  VALID_CONTACT_METHOD,
  VALID_LOCATION_PRECISION,
} from '../../src/lib/validation';

describe('safeJsonArray', () => {
  it('parses a valid JSON array', () => {
    expect(safeJsonArray('["a","b"]')).toEqual(['a', 'b']);
    expect(safeJsonArray('[]')).toEqual([]);
  });

  it('returns [] for a JSON object (non-array)', () => {
    expect(safeJsonArray('{"a":1}')).toEqual([]);
  });

  it('returns [] for a JSON scalar (non-array)', () => {
    expect(safeJsonArray('42')).toEqual([]);
    expect(safeJsonArray('"hello"')).toEqual([]);
  });

  it('returns [] for unparseable garbage', () => {
    expect(safeJsonArray('garbage')).toEqual([]);
    expect(safeJsonArray('[unclosed')).toEqual([]);
  });

  it('returns [] for null / undefined / empty', () => {
    expect(safeJsonArray(null)).toEqual([]);
    expect(safeJsonArray(undefined)).toEqual([]);
    expect(safeJsonArray('')).toEqual([]);
  });
});

describe('new VALID_* enum sets via validateEnum', () => {
  it('VALID_STATUS accepts all book statuses', () => {
    for (const v of ['private', 'visible', 'borrowable', 'discussable', 'giftable']) {
      expect(validateEnum(v, VALID_STATUS)).toBe(v);
    }
    expect(validateEnum('seeking-home', VALID_STATUS)).toBeNull();
    expect(validateEnum('', VALID_STATUS)).toBeNull();
    expect(validateEnum(123, VALID_STATUS)).toBeNull();
  });

  it('VALID_CONTACT_METHOD accepts email/social/custom', () => {
    for (const v of ['email', 'social', 'custom']) {
      expect(validateEnum(v, VALID_CONTACT_METHOD)).toBe(v);
    }
    expect(validateEnum('phone', VALID_CONTACT_METHOD)).toBeNull();
  });

  it('VALID_LOCATION_PRECISION accepts exact/approximate/city', () => {
    for (const v of ['exact', 'approximate', 'city']) {
      expect(validateEnum(v, VALID_LOCATION_PRECISION)).toBe(v);
    }
    expect(validateEnum('precise', VALID_LOCATION_PRECISION)).toBeNull();
  });
});
