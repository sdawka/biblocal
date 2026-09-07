import { describe, it, expect, vi, beforeEach } from 'vitest';

let mockUserId: string | null = 'test-user-123';

vi.mock('../../src/stores/auth', () => ({
  currentUserId: { get: () => mockUserId },
}));

import {
  profile,
  dismissedPrompts,
  initProfile,
  isOnboarded,
  updateProfile,
  updateTopics,
  loadProfileFromServer,
  dismissPrompt,
  isPromptDismissed,
} from '../../src/stores/profile';
import { clearSyncError, syncError } from '../../src/stores/sync-status';

describe('Profile Store', () => {
  beforeEach(async () => {
    // Advance the store's session generation so late PATCH responses from a
    // prior test cannot settle into this test's profile atom.
    mockUserId = null;
    await updateProfile({});
    mockUserId = 'test-user-123';
    await updateProfile({});
    clearSyncError();
    profile.set({
      id: '',
      name: '',
      city: '',
      radiusKm: 5,
      topics: { curated: [], freeform: [], inferred: [] },
    });
    dismissedPrompts.set([]);
  });

  describe('initProfile', () => {
    it('initializes profile with name and city', () => {
      initProfile('Jane Doe', 'San Francisco');

      const p = profile.get();
      expect(p.name).toBe('Jane Doe');
      expect(p.city).toBe('San Francisco');
      expect(p.id).toBeDefined();
      expect(p.id).not.toBe('');
    });

    it('syncs to server', () => {
      initProfile('Test User', 'NYC');

      expect(fetch).toHaveBeenCalledWith('/api/profile', expect.objectContaining({
        method: 'PATCH',
      }));
    });
  });

  describe('isOnboarded', () => {
    it('returns false for empty profile', () => {
      expect(isOnboarded()).toBe(false);
    });

    it('returns true after initialization', () => {
      initProfile('User', 'City');
      expect(isOnboarded()).toBe(true);
    });

    it('returns false if name is empty', () => {
      profile.set({ ...profile.get(), id: 'abc', city: 'NYC' });
      expect(isOnboarded()).toBe(false);
    });

    it('returns false if city is empty', () => {
      profile.set({ ...profile.get(), id: 'abc', name: 'User' });
      expect(isOnboarded()).toBe(false);
    });
  });

  describe('updateProfile', () => {
    it('updates profile fields', () => {
      initProfile('Jane', 'SF');

      updateProfile({ radiusKm: 10, borrowStyle: 'flexible' });

      const p = profile.get();
      expect(p.radiusKm).toBe(10);
      expect(p.borrowStyle).toBe('flexible');
      expect(p.name).toBe('Jane'); // unchanged
    });

    it('syncs updates to server', () => {
      profile.set({ ...profile.get(), id: 'profile-user', name: 'User', city: 'City' });

      updateProfile({ radiusKm: 15 });

      expect(fetch).toHaveBeenCalledWith('/api/profile', expect.objectContaining({
        method: 'PATCH',
        body: expect.stringContaining('radiusKm'),
      }));
    });

    it('sends a second profile PATCH only after the first settles', async () => {
      let resolveFirst!: (response: Response) => void;
      vi.stubGlobal('fetch', vi.fn()
        .mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveFirst = resolve; }))
        .mockResolvedValueOnce({ ok: true, text: async () => '' } as Response));

      const first = updateProfile({ name: 'First draft' });
      const second = updateProfile({ name: 'Second draft' });

      expect(fetch).toHaveBeenCalledTimes(1);

      resolveFirst({ ok: true, text: async () => '' } as Response);
      await expect(first).resolves.toBe(true);
      await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
      await expect(second).resolves.toBe(true);
      expect(profile.get().name).toBe('Second draft');
    });

    it('continues with the next profile PATCH after the first fails', async () => {
      let resolveFirst!: (response: Response) => void;
      let resolveSecond!: (response: Response) => void;
      vi.stubGlobal('fetch', vi.fn()
        .mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveFirst = resolve; }))
        .mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveSecond = resolve; })));

      const first = updateProfile({ name: 'First draft' });
      const second = updateProfile({ name: 'Second draft' });

      resolveFirst({ ok: false, text: async () => 'offline' } as Response);
      await expect(first).resolves.toBe(false);
      await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

      resolveSecond({ ok: true, text: async () => '' } as Response);
      await expect(second).resolves.toBe(true);
      expect(profile.get().name).toBe('Second draft');
    });

    it('does not send queued profile PATCHes after logout', async () => {
      let resolveFirst!: (response: Response) => void;
      vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => { resolveFirst = resolve; })));

      const first = updateProfile({ name: 'First draft' });
      const second = updateProfile({ name: 'Second draft' });
      expect(fetch).toHaveBeenCalledTimes(1);

      mockUserId = null;
      await updateProfile({});
      resolveFirst({ ok: true, text: async () => '' } as Response);

      await expect(first).resolves.toBe(false);
      await expect(second).resolves.toBe(false);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('keeps a newer value when an older save for the same field fails', async () => {
      let resolveFirst!: (response: Response) => void;
      let resolveSecond!: (response: Response) => void;
      vi.stubGlobal('fetch', vi.fn()
        .mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveFirst = resolve; }))
        .mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveSecond = resolve; })));

      const first = updateProfile({ name: 'First draft' });
      const second = updateProfile({ name: 'Second draft' });

      resolveFirst({ ok: false, text: async () => 'offline' } as Response);
      await expect(first).resolves.toBe(false);

      expect(profile.get().name).toBe('Second draft');

      resolveSecond({ ok: true, text: async () => '' } as Response);
      await expect(second).resolves.toBe(true);
      expect(syncError.get()).toBeNull();
    });

    it('reports the failure when the newer save for the same field also fails', async () => {
      let resolveFirst!: (response: Response) => void;
      let resolveSecond!: (response: Response) => void;
      vi.stubGlobal('fetch', vi.fn()
        .mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveFirst = resolve; }))
        .mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveSecond = resolve; })));

      const first = updateProfile({ name: 'First draft' });
      const second = updateProfile({ name: 'Second draft' });

      resolveFirst({ ok: false, text: async () => 'offline' } as Response);
      await expect(first).resolves.toBe(false);
      expect(syncError.get()).toBeNull();

      resolveSecond({ ok: false, text: async () => 'offline' } as Response);
      await expect(second).resolves.toBe(false);
      expect(syncError.get()).toBe('Could not save your profile. Please try again.');
    });

    it('does not roll back a profile after the active user changes', async () => {
      let resolveSave!: (response: Response) => void;
      vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => { resolveSave = resolve; })));

      const save = updateProfile({ name: 'First user draft' });
      mockUserId = 'another-user';
      profile.set({ ...profile.get(), id: 'another-user', name: 'Another user' });

      resolveSave({ ok: false, text: async () => 'offline' } as Response);
      await expect(save).resolves.toBe(false);

      expect(profile.get().name).toBe('Another user');
      expect(syncError.get()).toBeNull();
    });

    it('does not let an old load overwrite an A-to-B-to-A session', async () => {
      let resolveLoad!: (response: Response) => void;
      vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => { resolveLoad = resolve; })));

      const oldLoad = loadProfileFromServer();
      mockUserId = 'another-user';
      await updateProfile({});
      mockUserId = 'test-user-123';
      await updateProfile({});
      profile.set({ ...profile.get(), id: 'fresh-A', name: 'Fresh A' });

      resolveLoad({
        ok: true,
        json: async () => ({
          profile: {
            id: 'stale-A', name: 'Stale A', city: 'Toronto', radiusKm: 5,
            borrowStyle: null, currentObsessions: null, topicsCurated: null, topicsFreeform: null,
            latitude: null, longitude: null, locationPrecision: null,
            contactMethod: null, contactValue: null, contactVisibility: null,
          },
        }),
      } as Response);
      await oldLoad;

      expect(profile.get().name).toBe('Fresh A');
      expect(profile.get().id).toBe('fresh-A');
    });
  });

  describe('updateTopics', () => {
    it('updates curated topics', () => {
      initProfile('User', 'City');

      updateTopics({ curated: ['Fiction', 'History'] });

      expect(profile.get().topics.curated).toEqual(['Fiction', 'History']);
    });

    it('updates freeform topics', () => {
      initProfile('User', 'City');

      updateTopics({ freeform: ['Rare Books', 'First Editions'] });

      expect(profile.get().topics.freeform).toEqual(['Rare Books', 'First Editions']);
    });

    it('preserves other topic types', () => {
      initProfile('User', 'City');
      profile.set({
        ...profile.get(),
        topics: { curated: ['A'], freeform: ['B'], inferred: ['C'] },
      });

      updateTopics({ curated: ['X'] });

      const topics = profile.get().topics;
      expect(topics.curated).toEqual(['X']);
      expect(topics.freeform).toEqual(['B']); // unchanged
      expect(topics.inferred).toEqual(['C']); // unchanged
    });

    it('keeps a newer topic field when an older topic save fails', async () => {
      let resolveCurated!: (response: Response) => void;
      let resolveFreeform!: (response: Response) => void;
      vi.stubGlobal('fetch', vi.fn()
        .mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveCurated = resolve; }))
        .mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveFreeform = resolve; })));

      const curated = updateTopics({ curated: ['Fiction'] });
      const freeform = updateTopics({ freeform: ['Poetry'] });

      resolveCurated({ ok: false, text: async () => 'offline' } as Response);
      await expect(curated).resolves.toBe(false);

      expect(profile.get().topics).toEqual({ curated: [], freeform: ['Poetry'], inferred: [] });

      resolveFreeform({ ok: true, text: async () => '' } as Response);
      await expect(freeform).resolves.toBe(true);
    });
  });

  describe('dismissedPrompts', () => {
    it('dismisses a prompt', () => {
      expect(isPromptDismissed('onboarding-welcome')).toBe(false);

      dismissPrompt('onboarding-welcome');

      expect(isPromptDismissed('onboarding-welcome')).toBe(true);
    });

    it('does not duplicate dismissed prompts', () => {
      dismissPrompt('test-prompt');
      dismissPrompt('test-prompt');
      dismissPrompt('test-prompt');

      expect(dismissedPrompts.get()).toEqual(['test-prompt']);
    });

    it('can dismiss multiple prompts', () => {
      dismissPrompt('prompt-1');
      dismissPrompt('prompt-2');

      expect(isPromptDismissed('prompt-1')).toBe(true);
      expect(isPromptDismissed('prompt-2')).toBe(true);
      expect(isPromptDismissed('prompt-3')).toBe(false);
    });
  });

  describe('radiusKm', () => {
    it('defaults to 5km', () => {
      expect(profile.get().radiusKm).toBe(5);
    });

    it('can be updated', () => {
      initProfile('User', 'City');
      updateProfile({ radiusKm: 20 });
      expect(profile.get().radiusKm).toBe(20);
    });
  });

  describe('currentObsessions', () => {
    it('can store multiple obsessions', () => {
      initProfile('User', 'City');
      updateProfile({
        currentObsessions: ['Victorian novels', 'Map collecting', 'Book binding'],
      });

      expect(profile.get().currentObsessions).toEqual([
        'Victorian novels',
        'Map collecting',
        'Book binding',
      ]);
    });
  });
});
