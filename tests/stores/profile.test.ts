import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/stores/auth', () => ({
  currentUserId: { get: () => 'test-user-123' },
}));

import {
  profile,
  dismissedPrompts,
  initProfile,
  isOnboarded,
  updateProfile,
  updateTopics,
  dismissPrompt,
  isPromptDismissed,
} from '../../src/stores/profile';

describe('Profile Store', () => {
  beforeEach(() => {
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
      initProfile('User', 'City');
      vi.clearAllMocks();

      updateProfile({ radiusKm: 15 });

      expect(fetch).toHaveBeenCalledWith('/api/profile', expect.objectContaining({
        method: 'PATCH',
        body: expect.stringContaining('radiusKm'),
      }));
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
