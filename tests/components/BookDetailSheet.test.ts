import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/svelte';
import BookDetailSheet from '../../src/components/BookDetailSheet.svelte';
import type { Book } from '../../src/lib/types';

// Mock i18n — same shape as BookDetail.test.ts, extended with the cover keys.
vi.mock('../../src/i18n', () => ({
  useTranslations: (lang: string) => ({
    shelf: {
      card: {
        seeking: 'Seeking',
        private: 'Private',
        removeIntentAria: 'Remove {label} intent from {title}',
        addedViaScan: 'Added via ISBN scan',
        deleteAria: 'Delete {title} from shelf',
        removeConfirm: 'Remove from shelf?',
        cancel: 'Cancel',
        remove: 'Remove',
        removing: 'Removing…',
        removeFailed: 'Could not remove this book. Try again.',
        removeConfirmLabel: 'Confirm removal',
        openDetailAria: 'View details for {title}',
        closeDetailAria: 'Close',
        changeCover: 'Change cover',
        resetCover: 'Use original cover',
        uploadingCover: 'Uploading…',
        changeCoverAria: 'Upload a custom cover for {title}',
        editDetails: 'Edit title & author',
        editTitleLabel: 'Title',
        editAuthorLabel: 'Author',
        save: 'Save',
        notes: {
          addNote: 'Add a note',
          noteSingular: 'note',
          notePlural: 'notes',
          public: 'Public',
          private: 'Private',
          togglePrivacyPublic: 'Toggle privacy (public)',
          togglePrivacyPrivate: 'Toggle privacy (private)',
          deleteNoteAria: 'Delete this note',
          placeholder: 'What did you like about this book?',
          privacyGroupLabel: 'Note privacy',
          addNoteButton: 'Add note',
        },
      },
      intents: {
        labels: {
          borrowable: 'Lending',
          discussable: 'Discussion',
          giftable: 'Gifting',
        },
      },
      add: {
        ownership: { prompt: 'I…', groupLabel: 'Ownership', have: 'have this', seeking: 'am seeking' },
        visibility: { prompt: 'Who can see this?', groupLabel: 'Visibility', visible: 'Visible', private: 'Private' },
      },
    },
  }),
}));

const HOSTED_URL = 'https://imagedelivery.net/abc123/image-id/public';
const OTHER_URL = 'https://example.com/cover.jpg';

function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: 'book-1',
    title: 'Test Book',
    author: 'Test Author',
    visibility: 'visible',
    ownership: 'have',
    intents: [],
    addedVia: 'manual',
    addedAt: Date.now(),
    ...overrides,
  };
}

function makeFile(name = 'cover.png') {
  return new File(['fake-image-bytes'], name, { type: 'image/png' });
}

describe('BookDetailSheet', () => {
  describe('cover upload', () => {
    it('does not render a "Change cover" button when onUploadCover is not provided', () => {
      render(BookDetailSheet, { props: { book: makeBook(), lang: 'en', onClose: vi.fn() } });
      expect(screen.queryByLabelText(/Upload a custom cover/)).toBeNull();
    });

    it('clicking "Change cover" and picking a file calls onUploadCover with that file', async () => {
      const onUploadCover = vi.fn().mockResolvedValue(true);
      const { container } = render(BookDetailSheet, {
        props: { book: makeBook(), lang: 'en', onClose: vi.fn(), onUploadCover },
      });

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeTruthy();

      const file = makeFile();
      await fireEvent.change(fileInput, { target: { files: [file] } });

      expect(onUploadCover).toHaveBeenCalledWith(file);
    });

    it('clears the file input value after a change so re-picking the same file re-fires', async () => {
      const onUploadCover = vi.fn().mockResolvedValue(true);
      const { container } = render(BookDetailSheet, {
        props: { book: makeBook(), lang: 'en', onClose: vi.fn(), onUploadCover },
      });

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = makeFile();
      await fireEvent.change(fileInput, { target: { files: [file] } });

      expect(fileInput.value).toBe('');
    });

    it('disables both cover buttons while an upload is in flight', async () => {
      let resolveUpload!: (v: boolean) => void;
      const onUploadCover = vi.fn(() => new Promise<boolean>((r) => { resolveUpload = r; }));
      const { container } = render(BookDetailSheet, {
        props: {
          book: makeBook({ coverUrl: HOSTED_URL, fetchedCoverUrl: OTHER_URL }),
          lang: 'en',
          onClose: vi.fn(),
          onUploadCover,
          onResetCover: vi.fn().mockResolvedValue(true),
        },
      });

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      await fireEvent.change(fileInput, { target: { files: [makeFile()] } });

      // The change-cover button keeps its aria-label (accessible name), so
      // query it by that; only its visible text swaps to "Uploading…".
      const changeCoverBtn = screen.getByRole('button', { name: /Upload a custom cover/ });
      const resetBtn = screen.getByRole('button', { name: 'Use original cover' });
      expect(changeCoverBtn.textContent).toBe('Uploading…');
      expect((changeCoverBtn as HTMLButtonElement).disabled).toBe(true);
      expect((resetBtn as HTMLButtonElement).disabled).toBe(true);

      resolveUpload(true);
    });
  });

  describe('reset cover visibility rule', () => {
    it('shows the reset button when fetchedCoverUrl exists and coverUrl is a hosted URL', () => {
      render(BookDetailSheet, {
        props: {
          book: makeBook({ coverUrl: HOSTED_URL, fetchedCoverUrl: OTHER_URL }),
          lang: 'en',
          onClose: vi.fn(),
          onUploadCover: vi.fn(),
          onResetCover: vi.fn(),
        },
      });
      expect(screen.getByRole('button', { name: 'Use original cover' })).toBeTruthy();
    });

    it('hides the reset button when there is no fetchedCoverUrl (never had a fetched cover)', () => {
      render(BookDetailSheet, {
        props: {
          book: makeBook({ coverUrl: HOSTED_URL, fetchedCoverUrl: undefined }),
          lang: 'en',
          onClose: vi.fn(),
          onUploadCover: vi.fn(),
          onResetCover: vi.fn(),
        },
      });
      expect(screen.queryByRole('button', { name: 'Use original cover' })).toBeNull();
    });

    it('hides the reset button when the current cover is not a hosted URL (already using the fetched cover)', () => {
      render(BookDetailSheet, {
        props: {
          book: makeBook({ coverUrl: OTHER_URL, fetchedCoverUrl: OTHER_URL }),
          lang: 'en',
          onClose: vi.fn(),
          onUploadCover: vi.fn(),
          onResetCover: vi.fn(),
        },
      });
      expect(screen.queryByRole('button', { name: 'Use original cover' })).toBeNull();
    });

    it('hides the reset button entirely when onResetCover is not provided, even if canReset would be true', () => {
      render(BookDetailSheet, {
        props: {
          book: makeBook({ coverUrl: HOSTED_URL, fetchedCoverUrl: OTHER_URL }),
          lang: 'en',
          onClose: vi.fn(),
          onUploadCover: vi.fn(),
        },
      });
      expect(screen.queryByRole('button', { name: 'Use original cover' })).toBeNull();
    });

    it('clicking reset calls onResetCover', async () => {
      const onResetCover = vi.fn().mockResolvedValue(true);
      render(BookDetailSheet, {
        props: {
          book: makeBook({ coverUrl: HOSTED_URL, fetchedCoverUrl: OTHER_URL }),
          lang: 'en',
          onClose: vi.fn(),
          onUploadCover: vi.fn(),
          onResetCover,
        },
      });

      await fireEvent.click(screen.getByRole('button', { name: 'Use original cover' }));
      expect(onResetCover).toHaveBeenCalled();
    });
  });

  describe('onUpdateDetails passthrough', () => {
    it('passes onUpdateDetails through to BookDetail so the edit pencil renders', () => {
      render(BookDetailSheet, {
        props: { book: makeBook(), lang: 'en', onClose: vi.fn(), onUpdateDetails: vi.fn() },
      });
      expect(screen.getByLabelText('Edit title & author')).toBeTruthy();
    });
  });
});
