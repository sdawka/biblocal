import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  discoveryUsers,
  discoveryUsersLoaded,
  loadDiscoveryUsers,
  usersError,
  usersLoading,
} from '../../src/stores/users';

beforeEach(() => {
  discoveryUsers.set([]);
  discoveryUsersLoaded.set(false);
  usersError.set(null);
  usersLoading.set(false);
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
});
