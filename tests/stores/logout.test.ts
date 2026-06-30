import { describe, it, expect, beforeEach } from 'vitest';
import { onUserChange, onLogout, currentUserId } from '../../src/stores/auth';
import { shelf } from '../../src/stores/shelf';
import { profile, DEFAULT_PROFILE } from '../../src/stores/profile';

describe('onLogout resets in-memory state', () => {
  beforeEach(() => {
    localStorage.clear();
    currentUserId.set(null);
    shelf.set({});
    profile.set(DEFAULT_PROFILE);
  });

  it('clears the in-memory shelf and profile atoms (not just localStorage)', async () => {
    // Simulate a logged-in user with data loaded into the in-memory atoms.
    await onUserChange('user-123');
    shelf.set({
      'book-1': {
        id: 'book-1',
        title: 'Old Book',
        author: 'Old Author',
        visibility: 'visible',
        ownership: 'have',
        intents: [],
        addedVia: 'manual',
        addedAt: Date.now(),
      },
    });
    profile.set({ ...DEFAULT_PROFILE, id: 'p1', name: 'Old User', city: 'Old City' });

    expect(Object.keys(shelf.get())).toHaveLength(1);
    expect(profile.get().name).toBe('Old User');

    await onLogout();

    expect(currentUserId.get()).toBeNull();
    expect(shelf.get()).toEqual({});
    expect(profile.get()).toEqual(DEFAULT_PROFILE);
  });
});
