import { beforeEach, describe, expect, it, vi } from 'vitest';
import { currentUserId } from '../../src/stores/auth';
import {
  clearBookDetailDrafts,
  getBookDetailDraft,
  startBookDetailDraftSession,
  updateBookDetailDraft,
} from '../../src/stores/book-detail-drafts';

describe('book detail drafts', () => {
  beforeEach(() => {
    currentUserId.set(null);
    clearBookDetailDrafts();
  });

  it('keeps title, author, note text, and note visibility in memory for the active session', () => {
    currentUserId.set('reader-a');
    const session = startBookDetailDraftSession('book-1');

    updateBookDetailDraft(session, {
      details: { title: 'Dune Messiah', author: 'Frank Herbert' },
      note: { text: 'The ending changes the first book.', visibility: 'visible' },
    });

    expect(getBookDetailDraft(session)).toEqual({
      details: { title: 'Dune Messiah', author: 'Frank Herbert' },
      note: { text: 'The ending changes the first book.', visibility: 'visible' },
    });
  });

  it('clears drafts and rejects a suspended old-session writer across A to B to A', () => {
    currentUserId.set('reader-a');
    const oldSession = startBookDetailDraftSession('book-1');
    updateBookDetailDraft(oldSession, {
      details: { title: 'Private draft', author: 'Reader A' },
    });

    currentUserId.set('reader-b');
    currentUserId.set('reader-a');
    const newSession = startBookDetailDraftSession('book-1');

    // Models an input or async completion that began before the account
    // changed and resolves after reader A returns in the same browser tab.
    expect(updateBookDetailDraft(oldSession, {
      note: { text: 'Must not reappear', visibility: 'private' },
    })).toBe(false);
    expect(getBookDetailDraft(newSession)).toBeNull();
  });

  it('does not write private draft data to browser storage', () => {
    currentUserId.set('reader-a');
    const session = startBookDetailDraftSession('book-private');
    const write = vi.spyOn(localStorage, 'setItem');
    updateBookDetailDraft(session, {
      note: { text: 'Keep this in memory only.', visibility: 'private' },
    });

    expect(write).not.toHaveBeenCalled();
    write.mockRestore();
  });
});
