import { describe, it, expect } from 'vitest';
import { isBookEan13, isValidIsbn } from '../../src/lib/openLibrary';

describe('isValidIsbn', () => {
  it('accepts a 13-digit ISBN', () => {
    expect(isValidIsbn('9780465026562')).toBe(true);
  });

  it('accepts a 10-digit ISBN', () => {
    expect(isValidIsbn('0465026567')).toBe(true);
  });

  it('accepts an ISBN-10 ending in X (upper or lower case)', () => {
    expect(isValidIsbn('043942089X')).toBe(true);
    expect(isValidIsbn('043942089x')).toBe(true);
  });

  it('rejects X anywhere but the ISBN-10 check-digit position', () => {
    expect(isValidIsbn('X439420891')).toBe(false);
    expect(isValidIsbn('978046502656X')).toBe(false);
  });

  it('tolerates hyphens and spaces', () => {
    expect(isValidIsbn('0-439-42089-X')).toBe(true);
  });

  it('rejects garbage and wrong lengths', () => {
    expect(isValidIsbn('not-an-isbn')).toBe(false);
    expect(isValidIsbn('12345')).toBe(false);
  });
});

describe('isBookEan13', () => {
  it('accepts a valid 978 ISBN-13', () => {
    // Gödel, Escher, Bach — known-good check digit.
    expect(isBookEan13('9780465026562')).toBe(true);
  });

  it('accepts a valid 979 ISBN-13', () => {
    expect(isBookEan13('9791234567896')).toBe(true);
  });

  it('rejects a non-book barcode (price/UPC prefix)', () => {
    expect(isBookEan13('5012345678900')).toBe(false);
  });

  it('rejects a 978 code with a bad check digit', () => {
    expect(isBookEan13('9780465026563')).toBe(false);
  });

  it('rejects short codes and ISBN-10', () => {
    expect(isBookEan13('0465026567')).toBe(false);
    expect(isBookEan13('12345678')).toBe(false);
  });

  it('tolerates hyphens and spaces', () => {
    expect(isBookEan13('978-0-465-02656-2')).toBe(true);
  });
});
