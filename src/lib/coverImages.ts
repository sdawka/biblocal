// Helpers for user-uploaded covers. Covers live in R2 (COVERS binding) under
// `<bookId>/<uuid>` and are served by /api/covers/<key>. Stored URLs are
// absolute so the mobile app can load them directly.

const UPLOADED_COVER_RE = /^https?:\/\/[^/]+\/api\/covers\/([^/]+\/[^/]+)$/;

export function isUploadedCoverUrl(url: string | null | undefined): boolean {
  return !!url && UPLOADED_COVER_RE.test(url);
}

/** R2 key of an uploaded cover URL, or null if it isn't one. */
export function coverKeyFromUrl(url: string): string | null {
  const match = url.match(UPLOADED_COVER_RE);
  return match ? match[1] : null;
}

/**
 * R2 key of an uploaded cover URL, but only if it belongs to `bookId`. Cleanup
 * paths use this so a stray URL can never delete another book's cover.
 */
export function ownedCoverKey(url: string, bookId: string): string | null {
  const key = coverKeyFromUrl(url);
  return key && key.startsWith(`${bookId}/`) ? key : null;
}

export function newCoverKey(bookId: string): string {
  return `${bookId}/${crypto.randomUUID()}`;
}

export function coverUrlForKey(origin: string, key: string): string {
  return `${origin}/api/covers/${key}`;
}
