// @vitest-environment node
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../../src/pages/api/books/isbn-search';
import { callApi, callApiAs } from '../helpers/api';
import { env } from '../mocks/cloudflare-workers';

const url = 'https://biblocal.com/api/books/isbn-search?isbn=9780439420891';
const candidate = { title: 'A book', url: 'https://publisher.example/book/9780439420891' };
const fetchSearch = vi.fn();
const limit = vi.fn();
const match = vi.fn();
const put = vi.fn();
beforeEach(() => {
  Object.assign(env, { SEARXNG: { fetch: fetchSearch }, ISBN_SEARCH_LIMIT: { limit } });
  limit.mockResolvedValue({ success: true });
  fetchSearch.mockImplementation(async () => Response.json({ results: [candidate] }));
  match.mockResolvedValue(undefined);
  put.mockResolvedValue(undefined);
  vi.stubGlobal('caches', { open: async () => ({ match, put }) });
});
afterEach(() => {
  Reflect.deleteProperty(env, 'SEARXNG');
  Reflect.deleteProperty(env, 'ISBN_SEARCH_LIMIT');
});
describe('ISBN search API', () => {
  it('requires authentication before touching the private service or cache', async () => {
    expect((await callApi(GET, { url })).status).toBe(401);
    expect(fetchSearch).not.toHaveBeenCalled();
    expect(match).not.toHaveBeenCalled();
  });
  it.each(['hello', '9780439420892', 'https://localhost', '123', '9780439420891&q=secret'])('rejects invalid ISBN input: %s', async (isbn) => {
    expect((await callApiAs('reader', GET, { url: `${url.split('?')[0]}?isbn=${encodeURIComponent(isbn)}` })).status).toBe(400);
    expect(fetchSearch).not.toHaveBeenCalled();
  });
  it('uses the Clerk user for the request limit and returns only the candidate', async () => {
    const result = await callApi(GET, { url, locals: { auth: () => ({ userId: 'reader' }) } });
    expect(result).toEqual({ status: 200, json: { candidate } });
    expect(limit).toHaveBeenCalledWith({ key: 'isbn:reader' });
    expect(put).toHaveBeenCalled();
  });
  it('blocks excessive calls without searching', async () => {
    limit.mockResolvedValue({ success: false });
    expect((await callApiAs('reader', GET, { url })).status).toBe(429);
    expect(fetchSearch).not.toHaveBeenCalled();
  });
  it.each(['SEARXNG', 'ISBN_SEARCH_LIMIT'])('fails closed when %s is missing', async (key) => {
    Reflect.deleteProperty(env, key);
    expect((await callApiAs('reader', GET, { url })).status).toBe(503);
    expect(fetchSearch).not.toHaveBeenCalled();
  });
  it('fails closed when rate limiting fails', async () => {
    limit.mockRejectedValue(new Error('private infrastructure detail'));
    const result = await callApiAs('reader', GET, { url });
    expect(result.status).toBe(503);
    expect(JSON.stringify(result.json)).not.toContain('private infrastructure detail');
    expect(fetchSearch).not.toHaveBeenCalled();
  });
  it('serves cached matches only after checking auth and rate limit', async () => {
    match.mockResolvedValue(Response.json({ candidate }));
    expect(await callApiAs('reader', GET, { url })).toEqual({ status: 200, json: { candidate } });
    expect(limit).toHaveBeenCalled();
    expect(fetchSearch).not.toHaveBeenCalled();
  });
  it('normalizes equivalent ISBNs to the same cache key', async () => {
    await callApiAs('reader', GET, { url });
    const first = match.mock.calls[0][0];
    await callApiAs('reader', GET, { url: url.replace('9780439420891', '0-439-42089-X') });
    expect(match.mock.calls[1][0]).toEqual(first);
  });
  it('continues without cache when it is unavailable', async () => {
    match.mockRejectedValue(new Error('cache read'));
    put.mockRejectedValue(new Error('cache write'));
    expect((await callApiAs('reader', GET, { url })).status).toBe(200);
  });
  it('caches a complete no-match response briefly', async () => {
    fetchSearch.mockResolvedValue(Response.json({ results: [] }));
    expect(await callApiAs('reader', GET, { url })).toEqual({ status: 200, json: { candidate: null } });
    expect(put.mock.calls[0][1].headers.get('Cache-Control')).toBe('public, max-age=300');
  });
  it('does not cache an unavailable search as a missing book', async () => {
    fetchSearch.mockRejectedValue(new Error('private upstream details'));
    const result = await callApiAs('reader', GET, { url });
    expect(result.status).toBe(503);
    expect(JSON.stringify(result.json)).not.toContain('private upstream details');
    expect(put).not.toHaveBeenCalled();
  });
});
