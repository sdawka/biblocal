import { beforeEach, describe, it, expect, vi } from 'vitest';
import {
  fetchByIsbn,
  isBookEan13,
  isValidIsbn,
  OpenLibraryNetworkError,
} from '../../src/lib/openLibrary';

function response(ok: boolean, body: unknown, status = ok ? 200 : 404): Response {
  return { ok, status, json: async () => body } as Response;
}

beforeEach(() => {
  localStorage.clear();
  vi.mocked(fetch).mockReset();
});

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

describe('fetchByIsbn', () => {
  it('tries an ISBN-10 equivalent when Open Library lacks the scanned ISBN-13', async () => {
    vi.mocked(fetch).mockImplementation(async (url) => {
      const value = String(url);
      if (value.includes('/isbn/9780439420891.json')) return response(false, {});
      if (value.includes('/isbn/043942089X.json')) {
        return response(true, { title: 'The Tales of Beedle the Bard' });
      }
      return response(true, {});
    });

    await expect(fetchByIsbn('9780439420891')).resolves.toMatchObject({
      isbn: '9780439420891',
      title: 'The Tales of Beedle the Bard',
    });
    expect(fetch).toHaveBeenCalledWith(
      'https://openlibrary.org/isbn/043942089X.json',
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it('tries an ISBN-13 equivalent when Open Library lacks a valid ISBN-10', async () => {
    vi.mocked(fetch).mockImplementation(async (url) => {
      const value = String(url);
      if (value.includes('/isbn/043942089X.json')) return response(false, {});
      if (value.includes('/isbn/9780439420891.json')) return response(true, { title: 'The Tales of Beedle the Bard' });
      return response(true, {});
    });

    await expect(fetchByIsbn('043942089X')).resolves.toMatchObject({ title: 'The Tales of Beedle the Bard' });
    expect(fetch).toHaveBeenCalledWith(
      'https://openlibrary.org/isbn/9780439420891.json',
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it('does not derive an ISBN-10 form for a 979 ISBN-13', async () => {
    vi.mocked(fetch).mockImplementation(async (url) => {
      if (String(url).includes('openlibrary.org')) return response(true, { title: '979 edition' });
      throw new Error('Google should not be needed');
    });

    await fetchByIsbn('9791234567896');
    const openLibraryCalls = vi.mocked(fetch).mock.calls.filter(([url]) => String(url).includes('openlibrary.org/isbn/'));
    expect(openLibraryCalls).toHaveLength(1);
    expect(String(openLibraryCalls[0][0])).toContain('/isbn/9791234567896.json');
  });

  it('does not derive a second ISBN form from an invalid checksum', async () => {
    vi.mocked(fetch).mockImplementation(async (url) => {
      if (String(url).includes('openlibrary.org')) return response(false, {});
      return response(true, { totalItems: 0, items: [] });
    });

    await fetchByIsbn('9780439420892');
    const openLibraryCalls = vi.mocked(fetch).mock.calls.filter(([url]) => String(url).includes('openlibrary.org/isbn/'));
    expect(openLibraryCalls).toHaveLength(1);
  });

  it('falls back to an exact Google Books ISBN result when Open Library has no record', async () => {
    vi.mocked(fetch).mockImplementation(async (url) => {
      const value = String(url);
      if (value.includes('openlibrary.org')) return response(false, {});
      if (value.includes('www.googleapis.com/books/v1/volumes')) {
        return response(true, {
          items: [{
            volumeInfo: {
              title: 'Small Press Book',
              authors: ['A. Writer'],
              industryIdentifiers: [{ type: 'ISBN_13', identifier: '9780439420891' }],
              imageLinks: { thumbnail: 'http://books.google.test/cover.jpg' },
              categories: ['Independent publishing'],
            },
          }],
        });
      }
      throw new Error(`Unexpected request: ${value}`);
    });

    await expect(fetchByIsbn('9780439420891')).resolves.toEqual({
      isbn: '9780439420891',
      title: 'Small Press Book',
      author: 'A. Writer',
      coverUrl: 'https://books.google.test/cover.jpg',
      subjects: ['Independent publishing'],
    });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('q=isbn%3A9780439420891'),
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it('uses an exact Open Library search result before trying Google Books', async () => {
    vi.mocked(fetch).mockImplementation(async (url) => {
      const value = String(url);
      if (value.includes('/isbn/')) return response(false, {});
      if (value.includes('/search.json')) {
        return response(true, {
          numFound: 1,
          docs: [{
            title: 'Indexed custom edition',
            author_name: ['Small Press Author'],
            isbn: ['9780439420891'],
            cover_i: 12345,
            subject: ['Local publishing'],
          }],
        });
      }
      throw new Error('Google should not be needed');
    });

    await expect(fetchByIsbn('9780439420891')).resolves.toEqual({
      isbn: '9780439420891',
      title: 'Indexed custom edition',
      author: 'Small Press Author',
      coverUrl: 'https://covers.openlibrary.org/b/id/12345-M.jpg',
      subjects: ['Local publishing'],
    });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/search.json?isbn=9780439420891&fields=title%2Cauthor_name%2Ccover_i%2Csubject%2Cisbn&limit=10'),
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it('rejects an Open Library search document that does not declare the ISBN', async () => {
    vi.mocked(fetch).mockImplementation(async (url) => {
      if (String(url).includes('/isbn/')) return response(false, {});
      if (String(url).includes('/search.json')) {
        return response(true, { numFound: 1, docs: [{ title: 'Unrelated result', isbn: ['9780000000000'] }] });
      }
      if (String(url).startsWith('/api/books/isbn-search?')) return response(true, { candidate: null });
      return response(true, { totalItems: 0, items: [] });
    });

    await expect(fetchByIsbn('9780439420891')).resolves.toBeNull();
  });

  it('does not accept a Google Books search result with a different ISBN', async () => {
    vi.mocked(fetch).mockImplementation(async (url) => {
      if (String(url).includes('openlibrary.org')) return response(false, {});
      if (String(url).startsWith('/api/books/isbn-search?')) return response(true, { candidate: null });
      return response(true, {
        items: [{ volumeInfo: { title: 'Wrong edition', industryIdentifiers: [{ identifier: '9780000000000' }] } }],
      });
    });

    await expect(fetchByIsbn('9780439420891')).resolves.toBeNull();
  });

  it('reports an outage only after both providers are unavailable', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(fetchByIsbn('9780439420891')).rejects.toBeInstanceOf(OpenLibraryNetworkError);
  });

  it('keeps the error retryable when one provider is down even if the other finds no match', async () => {
    vi.mocked(fetch).mockImplementation(async (url) => {
      if (String(url).includes('openlibrary.org')) throw new TypeError('Failed to fetch');
      return response(true, { totalItems: 0, items: [] });
    });

    await expect(fetchByIsbn('9780439420891')).rejects.toBeInstanceOf(OpenLibraryNetworkError);
  });

  it('uses Google Books when Open Library is unavailable and Google finds an exact ISBN', async () => {
    vi.mocked(fetch).mockImplementation(async (url) => {
      if (String(url).includes('openlibrary.org')) throw new TypeError('Failed to fetch');
      return response(true, { totalItems: 1, items: [{ volumeInfo: {
        title: 'Fallback title',
        industryIdentifiers: [{ identifier: '9780439420891' }],
      } }] });
    });

    await expect(fetchByIsbn('9780439420891')).resolves.toMatchObject({ title: 'Fallback title' });
  });

  it.each([429, 503])('treats a provider HTTP %i response as unresolved', async (status) => {
    vi.mocked(fetch).mockImplementation(async (url) => {
      if (String(url).includes('openlibrary.org')) return response(false, {}, status);
      return response(true, { totalItems: 0, items: [] });
    });

    await expect(fetchByIsbn('9780439420891')).rejects.toBeInstanceOf(OpenLibraryNetworkError);
  });

  it('treats malformed provider data as unresolved', async () => {
    vi.mocked(fetch).mockImplementation(async () => response(true, { unexpected: true }));

    await expect(fetchByIsbn('9780439420891')).rejects.toBeInstanceOf(OpenLibraryNetworkError);
  });

  it('caches a successful fallback lookup', async () => {
    vi.mocked(fetch).mockImplementation(async (url) => {
      if (String(url).includes('openlibrary.org')) return response(false, {});
      return response(true, {
        items: [{ volumeInfo: {
          title: 'Cached book',
          authors: ['Reader'],
          industryIdentifiers: [{ identifier: '9780439420891' }],
        } }],
      });
    });

    await fetchByIsbn('9780439420891');
    const callsAfterFirstLookup = vi.mocked(fetch).mock.calls.length;
    await fetchByIsbn('9780439420891');
    expect(fetch).toHaveBeenCalledTimes(callsAfterFirstLookup);
  });

  it('uses the private ISBN search only after catalogues miss, without caching its possible match', async () => {
    vi.mocked(fetch).mockImplementation(async (url) => {
      const value = String(url);
      if (value.includes('openlibrary.org/isbn/')) return response(false, {});
      if (value.includes('openlibrary.org/search.json')) return response(true, { numFound: 0, docs: [] });
      if (value.includes('www.googleapis.com/books/v1/volumes')) return response(true, { totalItems: 0, items: [] });
      if (value.startsWith('/api/books/isbn-search?')) {
        return response(true, { candidate: { title: 'Small Press Title', url: 'https://example.test/result' } });
      }
      throw new Error(`Unexpected request: ${value}`);
    });

    await expect(fetchByIsbn('9780439420891')).resolves.toEqual({
      isbn: '9780439420891',
      title: 'Small Press Title',
      author: '',
      webMatch: { url: 'https://example.test/result' },
    });

    const callsAfterFirstLookup = vi.mocked(fetch).mock.calls.length;
    await fetchByIsbn('9780439420891');
    expect(fetch).toHaveBeenCalledTimes(callsAfterFirstLookup * 2);
  });

  it('keeps a malformed private-search candidate retryable', async () => {
    vi.mocked(fetch).mockImplementation(async (url) => {
      const value = String(url);
      if (value.includes('openlibrary.org/isbn/')) return response(false, {});
      if (value.includes('openlibrary.org/search.json')) return response(true, { numFound: 0, docs: [] });
      if (value.includes('www.googleapis.com/books/v1/volumes')) return response(true, { totalItems: 0, items: [] });
      return response(true, { candidate: { title: 'Unsafe', url: 'javascript:alert(1)' } });
    });

    await expect(fetchByIsbn('9780439420891')).rejects.toBeInstanceOf(OpenLibraryNetworkError);
  });
});
