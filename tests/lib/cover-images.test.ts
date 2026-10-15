import { describe, it, expect } from 'vitest';
import {
  isUploadedCoverUrl,
  coverKeyFromUrl,
  ownedCoverKey,
  newCoverKey,
  coverUrlForKey,
} from '../../src/lib/coverImages';

const UPLOADED = 'https://biblocal.com/api/covers/book-1/019a4b2c-uuid';
const OPENLIB = 'https://covers.openlibrary.org/b/id/123-M.jpg';

describe('isUploadedCoverUrl', () => {
  it('matches /api/covers/<bookId>/<id> URLs on any origin', () => {
    expect(isUploadedCoverUrl(UPLOADED)).toBe(true);
    expect(isUploadedCoverUrl('http://localhost:4321/api/covers/b/c')).toBe(true);
  });
  it('rejects external, nested and empty values', () => {
    expect(isUploadedCoverUrl(OPENLIB)).toBe(false);
    expect(isUploadedCoverUrl('https://biblocal.com/api/covers/a/b/c')).toBe(false);
    expect(isUploadedCoverUrl(null)).toBe(false);
    expect(isUploadedCoverUrl(undefined)).toBe(false);
    expect(isUploadedCoverUrl('')).toBe(false);
  });
});

describe('coverKeyFromUrl', () => {
  it('extracts the R2 key', () => {
    expect(coverKeyFromUrl(UPLOADED)).toBe('book-1/019a4b2c-uuid');
  });
  it('returns null for non-uploaded URLs', () => {
    expect(coverKeyFromUrl(OPENLIB)).toBeNull();
  });
});

describe('ownedCoverKey', () => {
  it('returns the key when it belongs to the book', () => {
    expect(ownedCoverKey(UPLOADED, 'book-1')).toBe('book-1/019a4b2c-uuid');
  });
  it("refuses another book's key, including prefix look-alikes", () => {
    expect(ownedCoverKey(UPLOADED, 'book-2')).toBeNull();
    expect(ownedCoverKey('https://biblocal.com/api/covers/book-10/x', 'book-1')).toBeNull();
  });
});

describe('newCoverKey / coverUrlForKey', () => {
  it('round-trips through coverKeyFromUrl', () => {
    const key = newCoverKey('book-1');
    expect(key.startsWith('book-1/')).toBe(true);
    expect(newCoverKey('book-1')).not.toBe(key);
    expect(coverKeyFromUrl(coverUrlForKey('https://biblocal.com', key))).toBe(key);
  });
});
