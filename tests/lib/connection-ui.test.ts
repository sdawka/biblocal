import { describe, it, expect } from 'vitest';
import { connectButtonState } from '../../src/lib/connection-ui';

describe('connectButtonState', () => {
  it('is actionable with no existing relationship', () => {
    expect(connectButtonState(null)).toEqual({
      label: 'Request to Connect',
      actionable: true,
    });
  });

  it('allows re-requesting after a declined request', () => {
    expect(connectButtonState('declined')).toEqual({
      label: 'Request to Connect',
      actionable: true,
    });
  });

  it('shows Requested and is not actionable when a request is pending', () => {
    expect(connectButtonState('pending')).toEqual({
      label: 'Requested',
      actionable: false,
    });
  });

  it('shows Connected and is not actionable once accepted', () => {
    expect(connectButtonState('accepted')).toEqual({
      label: 'Connected',
      actionable: false,
    });
  });

  it('reflects an in-flight request regardless of stored status', () => {
    expect(connectButtonState(null, { pending: true })).toEqual({
      label: 'Requesting…',
      actionable: false,
    });
    expect(connectButtonState('declined', { pending: true }).actionable).toBe(false);
  });

  it('shows Requested optimistically after a successful send', () => {
    // `sent` covers the window before the store refresh lands.
    expect(connectButtonState(null, { sent: true })).toEqual({
      label: 'Requested',
      actionable: false,
    });
  });

  it('prioritizes pending (in-flight) over sent', () => {
    expect(connectButtonState(null, { pending: true, sent: true }).label).toBe('Requesting…');
  });
});
