import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { currentUserId } from '../../src/stores/auth';
import { discoveryScope } from '../../src/stores/matches';

describe('discovery scope session boundary', () => {
  let priorUserId: string | null;
  let priorScope: ReturnType<typeof discoveryScope.get>;

  beforeEach(() => {
    priorUserId = currentUserId.get();
    priorScope = discoveryScope.get();
    currentUserId.set(null);
    discoveryScope.set('local');
  });

  afterEach(() => {
    currentUserId.set(priorUserId);
    discoveryScope.set(priorScope);
  });

  it('resets worldwide browsing when a different reader becomes active', () => {
    currentUserId.set('reader-a');
    discoveryScope.set('worldwide');

    currentUserId.set('reader-b');

    expect(discoveryScope.get()).toBe('local');
  });

  it('resets worldwide browsing on logout before the same reader returns', () => {
    currentUserId.set('reader-a');
    discoveryScope.set('worldwide');

    currentUserId.set(null);
    expect(discoveryScope.get()).toBe('local');

    discoveryScope.set('worldwide');
    currentUserId.set('reader-a');
    expect(discoveryScope.get()).toBe('local');
  });
});
