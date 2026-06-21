/**
 * Single source of truth for sanitizing external URLs.
 *
 * A store's `website` is free-text and gets rendered into `<a href={...}>`.
 * Svelte does NOT sanitize URL schemes, so `javascript:` / `data:` URLs would
 * execute on click in the victim's authenticated session (stored XSS).
 *
 * Returns the trimmed URL only if it parses AND its protocol is exactly
 * `http:` or `https:`; otherwise null.
 */
export function safeExternalUrl(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const url = new URL(trimmed);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return trimmed;
    }
    return null;
  } catch {
    // new URL() throws on garbage input.
    return null;
  }
}
