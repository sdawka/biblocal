// Helpers for covers hosted on Cloudflare Images. Delivery URLs look like
// https://imagedelivery.net/<account-hash>/<image-id>/<variant>.

const HOSTED_COVER_RE = /^https:\/\/imagedelivery\.net\/[^/]+\/([^/]+)\/[^/]+$/;

export function isHostedCoverUrl(url: string | null | undefined): boolean {
  return !!url && HOSTED_COVER_RE.test(url);
}

export function hostedImageIdFromUrl(url: string): string | null {
  const match = url.match(HOSTED_COVER_RE);
  return match ? match[1] : null;
}

export function pickCoverVariant(variants: string[]): string | null {
  if (variants.length === 0) return null;
  return variants.find((v) => /\/public$/.test(v)) ?? variants[0];
}
