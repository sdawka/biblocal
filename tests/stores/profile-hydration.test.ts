import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { currentUserId } from '../../src/stores/auth';
import {
  DEFAULT_PROFILE,
  clearContactInfo,
  loadProfileFromServer,
  profile,
  profileHydrated,
  profileLoadError,
  requestGeolocation,
} from '../../src/stores/profile';

describe('profile loading and geolocation lifecycle', () => {
  beforeEach(() => {
    currentUserId.set(null);
    profile.set(DEFAULT_PROFILE);
    profileHydrated.set(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    currentUserId.set(null);
    profile.set(DEFAULT_PROFILE);
    profileHydrated.set(false);
  });

  it('settles profile hydration after an active-user load failure', async () => {
    currentUserId.set('reader-a');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false } as Response));

    await loadProfileFromServer();

    expect(profileHydrated.get()).toBe(true);
    expect(profileLoadError.get()).toBe('load-failed');
  });

  it('does not let a stale profile response mark a new user as hydrated', async () => {
    currentUserId.set('reader-a');
    let release!: () => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => {
      release = () => resolve({ ok: true, json: async () => ({ profile: {} }) } as Response);
    })));

    const load = loadProfileFromServer();
    currentUserId.set('reader-b');
    release();
    await load;

    expect(profileHydrated.get()).toBe(false);
  });

  it('does not persist a geolocation callback after the viewer changes', async () => {
    currentUserId.set('reader-a');
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    let succeed!: PositionCallback;
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: vi.fn((success: PositionCallback) => {
          succeed = success;
        }),
      },
    });

    const request = requestGeolocation('exact');
    currentUserId.set('reader-b');
    succeed({ coords: { latitude: 45.5, longitude: -73.5 } } as GeolocationPosition);

    await expect(request).resolves.toEqual(expect.objectContaining({ success: false }));
    expect(profile.get()).toEqual(DEFAULT_PROFILE);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('reports failure when saving a geolocation result fails', async () => {
    currentUserId.set('reader-a');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, text: async () => 'offline' } as Response));
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: vi.fn((success: PositionCallback) => {
          success({ coords: { latitude: 45.5, longitude: -73.5 } } as GeolocationPosition);
        }),
      },
    });

    await expect(requestGeolocation('exact')).resolves.toEqual(expect.objectContaining({ success: false }));
  });

  it('persists an explicit contact clear and keeps the hidden local default', async () => {
    currentUserId.set('reader-a');
    profile.set({
      ...DEFAULT_PROFILE,
      contactMethod: 'email',
      contactValue: 'reader@example.test',
      contactVisibility: 'public',
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => '' } as Response));

    await expect(clearContactInfo()).resolves.toBe(true);

    expect(profile.get()).toEqual(expect.objectContaining({
      contactMethod: undefined,
      contactValue: undefined,
      contactVisibility: 'hidden',
    }));
    expect(fetch).toHaveBeenCalledWith('/api/profile', expect.objectContaining({
      body: JSON.stringify({ contactMethod: null, contactValue: null, contactVisibility: null }),
    }));
  });

  it('restores contact details when clearing them cannot be saved', async () => {
    currentUserId.set('reader-a');
    profile.set({
      ...DEFAULT_PROFILE,
      contactMethod: 'email',
      contactValue: 'reader@example.test',
      contactVisibility: 'public',
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, text: async () => 'offline' } as Response));

    await expect(clearContactInfo()).resolves.toBe(false);

    expect(profile.get()).toEqual(expect.objectContaining({
      contactMethod: 'email',
      contactValue: 'reader@example.test',
      contactVisibility: 'public',
    }));
  });
});
