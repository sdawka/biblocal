import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  discoveryUsers,
  discoveryUsersLoaded,
  loadDiscoveryUsers,
  usersError,
  usersLoading,
} from '../../src/stores/users';
import { currentUserId } from '../../src/stores/auth';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

beforeEach(() => {
  discoveryUsers.set([]);
  discoveryUsersLoaded.set(false);
  usersError.set(null);
  usersLoading.set(false);
  currentUserId.set(null);
});

afterEach(() => vi.unstubAllGlobals());

describe('loadDiscoveryUsers', () => {
  it('caches a successful empty discovery response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('[]'));
    vi.stubGlobal('fetch', fetchMock);

    await loadDiscoveryUsers();
    await loadDiscoveryUsers();

    expect(discoveryUsers.get()).toEqual([]);
    expect(discoveryUsersLoaded.get()).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('permits retry after a failed discovery load', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(new Response('[]'));
    vi.stubGlobal('fetch', fetchMock);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await loadDiscoveryUsers();
    expect(discoveryUsersLoaded.get()).toBe(false);
    expect(usersError.get()).toBe('load-failed');
    await loadDiscoveryUsers();

    expect(discoveryUsersLoaded.get()).toBe(true);
    expect(usersError.get()).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    errorSpy.mockRestore();
  });

  it('reloads for a changed reader and ignores the prior readers late response', async () => {
    const first = deferred<Response>();
    const second = deferred<Response>();
    const fetchMock = vi.fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    vi.stubGlobal('fetch', fetchMock);

    currentUserId.set('reader-a');
    const firstLoad = loadDiscoveryUsers();
    currentUserId.set('reader-b');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    second.resolve(new Response('[{"id":"reader-a"}]'));
    await vi.waitFor(() => expect(discoveryUsers.get()).toEqual([{ id: 'reader-a' }]));

    first.resolve(new Response('[{"id":"reader-b"}]'));
    await firstLoad;

    expect(discoveryUsers.get()).toEqual([{ id: 'reader-a' }]);
    expect(discoveryUsersLoaded.get()).toBe(true);
    expect(usersLoading.get()).toBe(false);
  });
});
