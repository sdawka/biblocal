import type { ConnectionStatus } from './types';

export interface ConnectButtonState {
  /** Label to show on the connect control. */
  label: string;
  /** Whether the control should be a real (clickable) request button. */
  actionable: boolean;
}

/**
 * Maps the current connection status (relative to the viewing user) plus any
 * in-flight/result state into the label + actionability of the connect control.
 *
 * - `null` status → no relationship yet, button is actionable ("Request to Connect").
 * - `pending` → a request already exists; show "Requested", not actionable.
 * - `accepted` → already connected; show "Connected", not actionable.
 * - `declined` → previous request was declined; allow re-requesting.
 */
export function connectButtonState(
  status: ConnectionStatus | null,
  opts: { pending?: boolean; sent?: boolean } = {}
): ConnectButtonState {
  if (opts.pending) {
    return { label: 'Requesting…', actionable: false };
  }
  if (opts.sent || status === 'pending') {
    return { label: 'Requested', actionable: false };
  }
  if (status === 'accepted') {
    return { label: 'Connected', actionable: false };
  }
  // null or declined → can (re)send a request.
  return { label: 'Request to Connect', actionable: true };
}
