import { isbnVariants } from './openLibrary';

export interface SearchCandidate { title: string; url: string }

export class IsbnSearchError extends Error {
  constructor(readonly reason: 'timeout' | 'upstream' | 'response' | 'partial', readonly status?: number) {
    super('ISBN search temporarily unavailable');
    this.name = 'IsbnSearchError';
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function publicLink(value: string): string | null {
  if (value.length > 2048) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password
      || !host.includes('.') || /^[\d.]+$/.test(host) || host.includes(':')
      || /\.(localhost|local|internal|lan|home|test)$/.test(host)) return null;
    return url.href;
  } catch { return null; }
}

function parseSearch(data: unknown, isbn: string): SearchCandidate | null {
  if (!record(data) || !Array.isArray(data.results)) throw new IsbnSearchError('response');
  const patterns = isbnVariants(isbn).map((variant) =>
    new RegExp(`(^|[^a-z0-9])${variant.split('').join('[\\s-]*')}(?=$|[^a-z0-9])`, 'i'));
  let malformed = false;
  for (const result of data.results.slice(0, 20)) {
    if (!record(result) || typeof result.title !== 'string' || typeof result.url !== 'string'
      || (result.content !== undefined && typeof result.content !== 'string')) {
      malformed = true;
      continue;
    }
    const url = publicLink(result.url);
    const title = result.title.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 300);
    if (!url || !title) continue;
    // The result is a lead for manual confirmation, never a catalog record.
    const text = `${result.title}\n${result.content ?? ''}\n${result.url}`;
    if (patterns.some((pattern) => pattern.test(text))) return { title, url };
  }
  if (malformed) throw new IsbnSearchError('response');
  if (data.unresponsive_engines !== undefined
    && (!Array.isArray(data.unresponsive_engines) || data.unresponsive_engines.length > 0)) {
    throw new IsbnSearchError('partial');
  }
  return null;
}

/** One private request; deadline includes body streaming, with a 256 KiB cap. */
export async function searchIsbn(service: Pick<Fetcher, 'fetch'>, isbn: string): Promise<SearchCandidate | null> {
  const controller = new AbortController();
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      void reader?.cancel().catch(() => {});
      reject(new IsbnSearchError('timeout'));
    }, 6000);
  });
  try {
    return await Promise.race([deadline, (async () => {
      const url = new URL('http://localhost:8888/search');
      url.searchParams.set('q', `ISBN ${isbn}`);
      url.searchParams.set('format', 'json');
      const response = await service.fetch(url, {
        headers: { Accept: 'application/json' }, signal: controller.signal, redirect: 'manual',
      });
      if (controller.signal.aborted) {
        void response.body?.cancel().catch(() => {});
        throw new IsbnSearchError('timeout');
      }
      if (!response.ok) {
        void response.body?.cancel().catch(() => {});
        throw new IsbnSearchError('upstream', response.status);
      }
      if (!response.headers.get('content-type')?.toLowerCase().includes('application/json')
        || Number(response.headers.get('content-length')) > 262144 || !response.body) {
        void response.body?.cancel().catch(() => {});
        throw new IsbnSearchError('response');
      }
      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let bytes = 0;
      let text = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 262144) {
          void reader.cancel().catch(() => {});
          throw new IsbnSearchError('response');
        }
        text += decoder.decode(value, { stream: true });
      }
      text += decoder.decode();
      let data: unknown;
      try { data = JSON.parse(text); } catch { throw new IsbnSearchError('response'); }
      return parseSearch(data, isbn);
    })()]);
  } catch (error) {
    if (error instanceof IsbnSearchError) throw error;
    throw new IsbnSearchError('upstream');
  } finally {
    clearTimeout(timer);
  }
}
