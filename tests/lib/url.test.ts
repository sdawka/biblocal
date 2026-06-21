import { describe, it, expect } from 'vitest';
import { safeExternalUrl } from '../../src/lib/url';

describe('safeExternalUrl', () => {
  it('returns null for dangerous URL schemes', () => {
    expect(safeExternalUrl('javascript:alert(1)')).toBeNull();
    expect(safeExternalUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(safeExternalUrl('vbscript:msgbox(1)')).toBeNull();
  });

  it('returns null for empty / whitespace / nullish input', () => {
    expect(safeExternalUrl('  ')).toBeNull();
    expect(safeExternalUrl('')).toBeNull();
    expect(safeExternalUrl(null)).toBeNull();
    expect(safeExternalUrl(undefined)).toBeNull();
  });

  it('returns null for unparseable garbage', () => {
    expect(safeExternalUrl('not a url')).toBeNull();
  });

  it('returns the URL for valid http/https', () => {
    expect(safeExternalUrl('http://x.com')).toBe('http://x.com');
    expect(safeExternalUrl('https://x.com/path?q=1')).toBe('https://x.com/path?q=1');
  });

  it('trims surrounding whitespace on a valid URL', () => {
    expect(safeExternalUrl('  https://x.com  ')).toBe('https://x.com');
  });
});
