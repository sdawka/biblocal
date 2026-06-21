import { atom } from 'nanostores';

/**
 * Holds the latest user-facing sync error message, or null when there's none.
 *
 * Store mutators update the local nanostore optimistically and fire a
 * background sync. When that sync fails, the mutator's sync helper rolls the
 * store back and calls `reportSyncError(...)` so the UI (SyncErrorToast) can
 * surface the failure instead of silently dropping the change.
 */
export const syncError = atom<string | null>(null);

export function reportSyncError(message: string): void {
  syncError.set(message);
}

export function clearSyncError(): void {
  syncError.set(null);
}
