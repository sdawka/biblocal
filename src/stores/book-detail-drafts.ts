import { atom } from 'nanostores';
import type { BookVisibility } from '../lib/types';
import { currentUserId } from './auth';

export interface BookDetailDraft {
  details?: {
    title: string;
    author: string;
  };
  note?: {
    text: string;
    visibility: BookVisibility;
  };
}

export interface BookDetailDraftSession {
  bookId: string;
  userId: string | null;
  generation: number;
}

// This atom is only an invalidation signal for open detail components. Draft
// contents live in the Map below and deliberately never use localStorage.
export const bookDetailDraftEpoch = atom(0);

const drafts = new Map<string, BookDetailDraft>();
let observedUserId: string | null | undefined;
let userSessionGeneration = 0;

function cloneDraft(draft: BookDetailDraft): BookDetailDraft {
  return {
    ...(draft.details ? { details: { ...draft.details } } : {}),
    ...(draft.note ? { note: { ...draft.note } } : {}),
  };
}

function observeUser(userId: string | null): void {
  if (userId === observedUserId) return;
  observedUserId = userId;
  userSessionGeneration += 1;
  drafts.clear();
  bookDetailDraftEpoch.set(userSessionGeneration);
}

currentUserId.subscribe(observeUser);

export function isCurrentBookDetailDraftSession(session: BookDetailDraftSession): boolean {
  const userId = currentUserId.get();
  observeUser(userId);
  return session.userId === userId && session.generation === userSessionGeneration;
}

export function startBookDetailDraftSession(bookId: string): BookDetailDraftSession {
  const userId = currentUserId.get();
  observeUser(userId);
  return { bookId, userId, generation: userSessionGeneration };
}

export function getBookDetailDraft(session: BookDetailDraftSession): BookDetailDraft | null {
  if (!isCurrentBookDetailDraftSession(session)) return null;
  const draft = drafts.get(session.bookId);
  return draft ? cloneDraft(draft) : null;
}

export function updateBookDetailDraft(
  session: BookDetailDraftSession,
  draft: BookDetailDraft,
): boolean {
  if (!isCurrentBookDetailDraftSession(session)) return false;
  if (!draft.details && !draft.note) {
    drafts.delete(session.bookId);
    return true;
  }
  drafts.set(session.bookId, cloneDraft(draft));
  return true;
}

export function clearBookDetailDraft(session: BookDetailDraftSession): boolean {
  return updateBookDetailDraft(session, {});
}

// It clears only this tab's volatile cache; it never touches browser storage.
// Publishing an invalidation also resets any still-mounted detail component.
export function clearBookDetailDrafts(): void {
  drafts.clear();
  bookDetailDraftEpoch.set(bookDetailDraftEpoch.get() + 1);
}
