import { describe, it, expect } from 'vitest';
import { isHostedCoverUrl, hostedImageIdFromUrl, pickCoverVariant } from '../../src/lib/coverImages';

const HOSTED = 'https://imagedelivery.net/AbC123hash/019a4b2c-uuid/public';
const OPENLIB = 'https://covers.openlibrary.org/b/id/12345-M.jpg';

describe('isHostedCoverUrl', () => {
  it('matches imagedelivery.net variant URLs', () => {
    expect(isHostedCoverUrl(HOSTED)).toBe(true);
  });
  it('rejects OpenLibrary URLs, null, undefined, and empty', () => {
    expect(isHostedCoverUrl(OPENLIB)).toBe(false);
    expect(isHostedCoverUrl(null)).toBe(false);
    expect(isHostedCoverUrl(undefined)).toBe(false);
    expect(isHostedCoverUrl('')).toBe(false);
  });
});

describe('hostedImageIdFromUrl', () => {
  it('extracts the image id from a hosted URL', () => {
    expect(hostedImageIdFromUrl(HOSTED)).toBe('019a4b2c-uuid');
  });
  it('returns null for non-hosted URLs', () => {
    expect(hostedImageIdFromUrl(OPENLIB)).toBeNull();
  });
});

describe('pickCoverVariant', () => {
  it('prefers the public variant', () => {
    const variants = [
      'https://imagedelivery.net/h/id/thumbnail',
      'https://imagedelivery.net/h/id/public',
    ];
    expect(pickCoverVariant(variants)).toBe('https://imagedelivery.net/h/id/public');
  });
  it('falls back to the first variant', () => {
    expect(pickCoverVariant(['https://imagedelivery.net/h/id/cover'])).toBe(
      'https://imagedelivery.net/h/id/cover'
    );
  });
  it('returns null for an empty list', () => {
    expect(pickCoverVariant([])).toBeNull();
  });
});
