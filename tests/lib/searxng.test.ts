// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest';
import { searchIsbn } from '../../src/lib/searxng';

const isbn = '9780439420891';
const hit = { title: 'Small press book', url: 'https://publisher.example/book', content: 'ISBN 978-0-439-42089-1' };
function service(body: unknown, status = 200) {
  return { fetch: vi.fn().mockResolvedValue(Response.json(body, { status })) };
}
afterEach(() => vi.useRealTimers());

describe('private ISBN search', () => {
  it('searches only the ISBN and returns an exact match as an unverified candidate', async () => {
    const binding = service({ results: [hit] });
    expect(await searchIsbn(binding, isbn)).toEqual({ title: hit.title, url: hit.url });
    const [url, init] = binding.fetch.mock.calls[0];
    expect(url.origin).toBe('http://localhost:8888');
    expect(url.pathname).toBe('/search');
    expect(url.searchParams.get('q')).toBe('ISBN 9780439420891');
    expect(url.searchParams.get('format')).toBe('json');
    expect(init.headers).toEqual({ Accept: 'application/json' });
    expect(init.redirect).toBe('manual');
    expect(init.signal).toBeDefined();
  });
  it('accepts an equivalent ISBN-10 and safely bounds displayed titles', async () => {
    expect(await searchIsbn(service({ results: [{ ...hit, title: '<b>Book</b>', content: 'ISBN: 043942089X' }] }), isbn))
      .toEqual({ title: 'Book', url: hit.url });
  });
  it.each(['9780439420892', '19780439420891', '97804394208910', 'not the ISBN'])('rejects unrelated or partial identifiers: %s', async (content) => {
    expect(await searchIsbn(service({ results: [{ ...hit, content }] }), isbn)).toBeNull();
  });
  it.each(['javascript:alert(1)', 'https://user:pass@publisher.example/', 'http://localhost/', 'http://127.0.0.1/', 'http://[::1]/', 'https://printer.local/'])('rejects unsafe result links: %s', async (url) => {
    expect(await searchIsbn(service({ results: [{ ...hit, url }] }), isbn)).toBeNull();
  });
  it('returns null for a complete empty search', async () => {
    expect(await searchIsbn(service({ results: [], unresponsive_engines: [] }), isbn)).toBeNull();
  });
  it('does not mistake partial engine failure for no match', async () => {
    await expect(searchIsbn(service({ results: [], unresponsive_engines: [['google', 'timeout']] }), isbn)).rejects.toThrow();
  });
  it('uses a valid match even if another engine failed', async () => {
    expect(await searchIsbn(service({ results: [hit], unresponsive_engines: [['google', 'timeout']] }), isbn)).toEqual({ title: hit.title, url: hit.url });
  });
  it.each([302, 403, 429, 500, 502])('handles upstream HTTP %s without following redirects', async (status) => {
    await expect(searchIsbn(service({}, status), isbn)).rejects.toThrow();
  });
  it.each([null, {}, { results: {} }, { results: [null] }])('rejects malformed search data %j', async (body) => {
    await expect(searchIsbn(service(body), isbn)).rejects.toThrow();
  });
  it('rejects HTML and invalid JSON', async () => {
    const binding = { fetch: vi.fn().mockResolvedValue(new Response('<html>Unavailable</html>')) };
    await expect(searchIsbn(binding, isbn)).rejects.toThrow();
    binding.fetch.mockResolvedValue(new Response('{', { headers: { 'Content-Type': 'application/json' } }));
    await expect(searchIsbn(binding, isbn)).rejects.toThrow();
  });
  it('rejects oversized bodies even without Content-Length', async () => {
    await expect(searchIsbn(service({ results: [], padding: 'x'.repeat(270000) }), isbn)).rejects.toThrow();
  });
  it('bounds a hung request even when the service ignores abort', async () => {
    vi.useFakeTimers();
    const binding = { fetch: vi.fn().mockReturnValue(new Promise(() => {})) };
    const check = expect(searchIsbn(binding, isbn)).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(6000);
    await check;
    expect(binding.fetch.mock.calls[0][1].signal.aborted).toBe(true);
  });
  it('bounds a stalled response body', async () => {
    vi.useFakeTimers();
    const cancel = vi.fn();
    const binding = { fetch: vi.fn().mockResolvedValue(new Response(new ReadableStream({ cancel }), { headers: { 'Content-Type': 'application/json' } })) };
    const check = expect(searchIsbn(binding, isbn)).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(6000);
    await check;
    expect(cancel).toHaveBeenCalled();
  });
});
