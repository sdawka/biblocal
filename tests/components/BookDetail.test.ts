import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen, within } from '@testing-library/svelte';
import BookDetail from '../../src/components/BookDetail.svelte';
import type { Book } from '../../src/lib/types';

// Mock i18n — mirrors the shape used by BookCard.test.ts, extended with the
// `add` namespace (ownership/visibility prompts) and Task 7's card.* keys.
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
        ownership: {
          prompt: 'I…',
          groupLabel: 'Ownership',
          have: 'have this',
          seeking: 'am seeking',
        },
        visibility: {
          prompt: 'Who can see this?',
          groupLabel: 'Visibility',
          visible: 'Visible',
          private: 'Private',
        },
      },
    },
  }),
}));

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

describe('BookDetail', () => {
  describe('title/author edit', () => {
    it('shows the pencil-edit affordance only when onUpdateDetails is provided and not readonly', () => {
      const { queryByLabelText, rerender } = render(BookDetail, {
        props: { book: makeBook(), lang: 'en' },
      });
      expect(queryByLabelText('Edit title & author')).toBeNull();

      rerender({ book: makeBook(), lang: 'en', onUpdateDetails: vi.fn() });
      expect(screen.getByLabelText('Edit title & author')).toBeTruthy();
    });

    it('does not show the edit affordance for readonly consumers even with onUpdateDetails set', () => {
      render(BookDetail, {
        props: { book: makeBook(), lang: 'en', onUpdateDetails: vi.fn(), readonly: true },
      });
      expect(screen.queryByLabelText('Edit title & author')).toBeNull();
    });

    it('clicking the pencil opens an editable form pre-filled with the current title/author', async () => {
      render(BookDetail, {
        props: { book: makeBook({ title: 'Dune', author: 'Frank Herbert' }), lang: 'en', onUpdateDetails: vi.fn() },
      });

      await fireEvent.click(screen.getByLabelText('Edit title & author'));

      const titleInput = screen.getByLabelText('Title') as HTMLInputElement;
      const authorInput = screen.getByLabelText('Author') as HTMLInputElement;
      expect(titleInput.value).toBe('Dune');
      expect(authorInput.value).toBe('Frank Herbert');
    });

    it('saving calls onUpdateDetails with trimmed title/author and closes the editor', async () => {
      const onUpdateDetails = vi.fn();
      render(BookDetail, {
        props: { book: makeBook({ title: 'Dune', author: 'Frank Herbert' }), lang: 'en', onUpdateDetails },
      });

      await fireEvent.click(screen.getByLabelText('Edit title & author'));
      const titleInput = screen.getByLabelText('Title') as HTMLInputElement;
      const authorInput = screen.getByLabelText('Author') as HTMLInputElement;

      await fireEvent.input(titleInput, { target: { value: '  Dune Messiah  ' } });
      await fireEvent.input(authorInput, { target: { value: '  Frank Herbert  ' } });
      await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      expect(onUpdateDetails).toHaveBeenCalledWith({ title: 'Dune Messiah', author: 'Frank Herbert' });
      expect(screen.queryByLabelText('Title')).toBeNull();
    });

    it('cancel closes the editor without calling onUpdateDetails', async () => {
      const onUpdateDetails = vi.fn();
      render(BookDetail, {
        props: { book: makeBook({ title: 'Dune', author: 'Frank Herbert' }), lang: 'en', onUpdateDetails },
      });

      await fireEvent.click(screen.getByLabelText('Edit title & author'));
      await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(onUpdateDetails).not.toHaveBeenCalled();
      expect(screen.getByText('Dune')).toBeTruthy();
    });

    it('disables Save when title or author is blank', async () => {
      render(BookDetail, {
        props: { book: makeBook({ title: 'Dune', author: 'Frank Herbert' }), lang: 'en', onUpdateDetails: vi.fn() },
      });

      await fireEvent.click(screen.getByLabelText('Edit title & author'));
      const titleInput = screen.getByLabelText('Title') as HTMLInputElement;
      await fireEvent.input(titleInput, { target: { value: '   ' } });

      expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(true);
    });
  });

  describe('all-intent toggle pills', () => {
    it('renders all three intent options as aria-pressed toggles when onIntentsChange is present', () => {
      render(BookDetail, {
        props: { book: makeBook({ intents: ['borrowable'] }), lang: 'en', onIntentsChange: vi.fn() },
      });

      const lending = screen.getByRole('button', { name: 'Lending' });
      const discussion = screen.getByRole('button', { name: 'Discussion' });
      const gifting = screen.getByRole('button', { name: 'Gifting' });
      expect(lending.getAttribute('aria-pressed')).toBe('true');
      expect(discussion.getAttribute('aria-pressed')).toBe('false');
      expect(gifting.getAttribute('aria-pressed')).toBe('false');
    });

    it('clicking a pressed pill removes that intent', async () => {
      const onIntentsChange = vi.fn();
      render(BookDetail, {
        props: { book: makeBook({ intents: ['borrowable', 'giftable'] }), lang: 'en', onIntentsChange },
      });

      await fireEvent.click(screen.getByRole('button', { name: 'Lending' }));
      expect(onIntentsChange).toHaveBeenCalledWith(['giftable']);
    });

    it('clicking an unpressed pill adds that intent', async () => {
      const onIntentsChange = vi.fn();
      render(BookDetail, {
        props: { book: makeBook({ intents: ['borrowable'] }), lang: 'en', onIntentsChange },
      });

      await fireEvent.click(screen.getByRole('button', { name: 'Discussion' }));
      expect(onIntentsChange).toHaveBeenCalledWith(['borrowable', 'discussable']);
    });

    it('readonly (or missing onIntentsChange) renders only active intents as plain non-interactive pills', () => {
      const { container } = render(BookDetail, {
        props: { book: makeBook({ intents: ['borrowable'] }), lang: 'en', readonly: true },
      });

      expect(screen.queryByRole('button', { name: 'Discussion' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Gifting' })).toBeNull();
      const lendingPill = container.querySelector('.pill[data-status="borrowable"]');
      expect(lendingPill).toBeTruthy();
      expect(lendingPill?.tagName).toBe('SPAN');
    });
  });

  describe('ownership/visibility dimension toggles', () => {
    it('renders the ownership segmented control only when onOwnershipChange is present, and calls it on click', async () => {
      const onOwnershipChange = vi.fn();
      render(BookDetail, {
        props: { book: makeBook({ ownership: 'have' }), lang: 'en', onOwnershipChange },
      });

      const group = screen.getByRole('group', { name: 'Ownership' });
      await fireEvent.click(within(group).getByRole('button', { name: 'am seeking' }));
      expect(onOwnershipChange).toHaveBeenCalledWith('seeking');
    });

    it('renders the visibility segmented control only when onVisibilityChange is present, and calls it on click', async () => {
      const onVisibilityChange = vi.fn();
      render(BookDetail, {
        props: { book: makeBook({ visibility: 'visible' }), lang: 'en', onVisibilityChange },
      });

      const group = screen.getByRole('group', { name: 'Visibility' });
      await fireEvent.click(within(group).getByRole('button', { name: 'Private' }));
      expect(onVisibilityChange).toHaveBeenCalledWith('private');
    });

    it('does not render dimension rows when neither callback is provided', () => {
      const { container } = render(BookDetail, {
        props: { book: makeBook(), lang: 'en' },
      });
      expect(container.querySelector('.dimensions')).toBeNull();
    });

    it('does not render dimension rows for readonly consumers even if callbacks are (mistakenly) passed', () => {
      const { container } = render(BookDetail, {
        props: {
          book: makeBook(),
          lang: 'en',
          readonly: true,
          onOwnershipChange: vi.fn(),
          onVisibilityChange: vi.fn(),
        },
      });
      expect(container.querySelector('.dimensions')).toBeNull();
    });
  });

  describe('readonly consumer parity (e.g. StoreDetailIsland)', () => {
    it('renders unchanged for a plain readonly usage: no edit pencil, no dimension rows, no delete button', () => {
      const { container } = render(BookDetail, {
        props: { book: makeBook({ title: 'Dune', intents: ['borrowable'] }), lang: 'en', readonly: true },
      });

      expect(screen.queryByLabelText('Edit title & author')).toBeNull();
      expect(container.querySelector('.dimensions')).toBeNull();
      expect(container.querySelector('.delete-btn')).toBeNull();
      expect(screen.getByText('Dune')).toBeTruthy();
    });
  });

  describe('draft-state reset on book switch', () => {
    it('closes an open edit form when the component switches to a different book id', async () => {
      const { rerender } = render(BookDetail, {
        props: { book: makeBook({ id: 'book-1', title: 'Dune' }), lang: 'en', onUpdateDetails: vi.fn() },
      });

      await fireEvent.click(screen.getByLabelText('Edit title & author'));
      expect(screen.getByLabelText('Title')).toBeTruthy();

      await rerender({
        book: makeBook({ id: 'book-2', title: 'Solaris', author: 'Stanisław Lem' }),
        lang: 'en',
        onUpdateDetails: vi.fn(),
      });

      expect(screen.queryByLabelText('Title')).toBeNull();
      expect(screen.getByText('Solaris')).toBeTruthy();
    });

    it('keeps an in-progress draft when the same book is updated in place (same id)', async () => {
      const { rerender } = render(BookDetail, {
        props: { book: makeBook({ id: 'book-1', title: 'Dune' }), lang: 'en', onUpdateDetails: vi.fn() },
      });

      await fireEvent.click(screen.getByLabelText('Edit title & author'));
      const titleInput = screen.getByLabelText('Title') as HTMLInputElement;
      await fireEvent.input(titleInput, { target: { value: 'Dune Messiah' } });

      // Same id, new object — e.g. an intent toggle synced from the store.
      await rerender({
        book: makeBook({ id: 'book-1', title: 'Dune', intents: ['borrowable'] }),
        lang: 'en',
        onUpdateDetails: vi.fn(),
      });

      expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('Dune Messiah');
    });
  });
});
