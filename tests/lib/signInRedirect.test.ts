import { atom } from 'nanostores';
import { describe, expect, it, vi } from 'vitest';
import { watchSignInRedirect } from '../../src/lib/signInRedirect';

function setup(isLoaded = false, status?: string) {
  const loaded = atom(isLoaded);
  const session = atom<{ status: string } | null | undefined>(status ? { status } : undefined);
  const redirect = vi.fn();
  const stop = watchSignInRedirect(loaded, session, redirect);
  return { loaded, session, redirect, stop };
}

describe('homepage sign-in redirect', () => {
  it('leaves the landing page as soon as a delayed session becomes active', () => {
    const state = setup();
    state.loaded.set(true);
    state.session.set(null);
    expect(state.redirect).not.toHaveBeenCalled();
    state.session.set({ status: 'active' });
    expect(state.redirect).toHaveBeenCalledTimes(1);
    state.stop();
  });

  it('waits for Clerk to load even if an active session is already present', () => {
    const state = setup(false, 'active');
    expect(state.redirect).not.toHaveBeenCalled();
    state.loaded.set(true);
    expect(state.redirect).toHaveBeenCalledTimes(1);
    state.stop();
  });

  it('redirects an already-loaded active session without waiting for another event', () => {
    const state = setup(true, 'active');
    expect(state.redirect).toHaveBeenCalledTimes(1);
    state.stop();
  });

  it('does not interrupt pending sign-in tasks or expired sessions', () => {
    const state = setup(true, 'pending');
    state.session.set({ status: 'expired' });
    expect(state.redirect).not.toHaveBeenCalled();
    state.session.set({ status: 'active' });
    expect(state.redirect).toHaveBeenCalledTimes(1);
    state.stop();
  });

  it('navigates once despite repeated session updates', () => {
    const state = setup(true, 'active');
    state.session.set({ status: 'active' });
    state.loaded.set(false);
    state.loaded.set(true);
    expect(state.redirect).toHaveBeenCalledTimes(1);
    state.stop();
  });

  it('does not navigate after the page unsubscribes', () => {
    const state = setup(true);
    state.stop();
    state.session.set({ status: 'active' });
    expect(state.redirect).not.toHaveBeenCalled();
  });
});
