import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import BookCard from '../../src/components/BookCard.svelte';
import type { Book } from '../../src/lib/types';

// Mock i18n
vi.mock('../../src/i18n', () => ({
  useTranslations: (lang: string) => ({
    shelf: {
      card: {
        openDetailAria: 'View details for {title}',
        seeking: 'Seeking',
        private: 'Private',
      },
      intents: {
        labels: {
          borrowable: 'Lending',
          discussable: 'Discussion',
          giftable: 'Gifting',
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

describe('BookCard', () => {
  describe('Basic rendering', () => {
    it('renders title and author', () => {
      const { getByText } = render(BookCard, {
        props: { book: makeBook({ title: 'Crime and Punishment', author: 'Dostoevsky' }), lang: 'en', onOpen: vi.fn() },
      });

      expect(getByText('Crime and Punishment')).toBeTruthy();
      expect(getByText('Dostoevsky')).toBeTruthy();
    });

    it('renders cover image when coverUrl provided', () => {
      const { container } = render(BookCard, {
        props: { book: makeBook({ coverUrl: 'https://example.com/cover.jpg' }), lang: 'en', onOpen: vi.fn() },
      });

      const img = container.querySelector('img.cover') as HTMLImageElement;
      expect(img).toBeTruthy();
      expect(img?.src).toBe('https://example.com/cover.jpg');
      // Cover is decorative; the accessible name lives on the button, not the image.
      expect(img?.alt).toBe('');
    });

    it('renders placeholder with first letter when no coverUrl', () => {
      const { container } = render(BookCard, {
        props: { book: makeBook({ coverUrl: undefined, title: 'Dune' }), lang: 'en', onOpen: vi.fn() },
      });

      expect(container.querySelector('img.cover')).toBeNull();
      const placeholder = container.querySelector('.cover.placeholder');
      expect(placeholder).toBeTruthy();
      expect(placeholder?.textContent).toBe('D');
    });

    it('renders data-book-id attribute', () => {
      const { container } = render(BookCard, {
        props: { book: makeBook({ id: 'my-book-123' }), lang: 'en', onOpen: vi.fn() },
      });

      const button = container.querySelector('[data-book-id]');
      expect(button?.getAttribute('data-book-id')).toBe('my-book-123');
    });

    it('renders as a button with dialog affordance', () => {
      const { container } = render(BookCard, { props: { book: makeBook(), lang: 'en', onOpen: vi.fn() } });

      const button = container.querySelector('button.book-card');
      expect(button).toBeTruthy();
      expect(button?.getAttribute('aria-haspopup')).toBe('dialog');
    });
  });

  describe('onOpen', () => {
    it('calls onOpen with the book id when clicked', () => {
      const onOpen = vi.fn();
      const { container } = render(BookCard, {
        props: { book: makeBook({ id: 'clickable-book' }), lang: 'en', onOpen },
      });

      fireEvent.click(container.querySelector('.book-card')!);

      expect(onOpen).toHaveBeenCalledWith('clickable-book');
    });
  });

  describe('Status', () => {
    it('applies the seeking class when ownership is seeking', () => {
      const { container } = render(BookCard, {
        props: { book: makeBook({ ownership: 'seeking' }), lang: 'en', onOpen: vi.fn() },
      });

      expect(container.querySelector('.book-card')?.classList.contains('seeking')).toBe(true);
    });

    it('renders a seeking status dot when ownership is seeking', () => {
      const { container } = render(BookCard, {
        props: { book: makeBook({ ownership: 'seeking' }), lang: 'en', onOpen: vi.fn() },
      });

      expect(container.querySelector('.dot[data-status="seeking"]')).toBeTruthy();
    });

    it('renders a status dot per intent', () => {
      const { container } = render(BookCard, {
        props: { book: makeBook({ intents: ['borrowable', 'discussable'] }), lang: 'en', onOpen: vi.fn() },
      });

      expect(container.querySelector('.dot[data-status="borrowable"]')).toBeTruthy();
      expect(container.querySelector('.dot[data-status="discussable"]')).toBeTruthy();
    });

    it('renders a lock icon when visibility is private', () => {
      const { container } = render(BookCard, {
        props: { book: makeBook({ visibility: 'private' }), lang: 'en', onOpen: vi.fn() },
      });

      expect(container.querySelector('.lock')).toBeTruthy();
    });

    it('does not render a lock icon when visibility is visible', () => {
      const { container } = render(BookCard, {
        props: { book: makeBook({ visibility: 'visible' }), lang: 'en', onOpen: vi.fn() },
      });

      expect(container.querySelector('.lock')).toBeNull();
    });
  });

  describe('aria-label', () => {
    it('is just the title when there is no status to report', () => {
      const { container } = render(BookCard, {
        props: { book: makeBook({ title: 'Dune', ownership: 'have', intents: [] }), lang: 'en', onOpen: vi.fn() },
      });

      expect(container.querySelector('.book-card')?.getAttribute('aria-label')).toBe('View details for Dune');
    });

    it('folds in the seeking status', () => {
      const { container } = render(BookCard, {
        props: { book: makeBook({ title: 'Dune', ownership: 'seeking', intents: [] }), lang: 'en', onOpen: vi.fn() },
      });

      expect(container.querySelector('.book-card')?.getAttribute('aria-label')).toBe('View details for Dune — Seeking');
    });

    it('folds in the private status', () => {
      const { container } = render(BookCard, {
        props: { book: makeBook({ title: 'Dune', visibility: 'private' }), lang: 'en', onOpen: vi.fn() },
      });

      expect(container.querySelector('.book-card')?.getAttribute('aria-label')).toBe('View details for Dune — Private');
    });

    it('folds in intent labels', () => {
      const { container } = render(BookCard, {
        props: { book: makeBook({ title: 'Dune', intents: ['borrowable', 'discussable'] }), lang: 'en', onOpen: vi.fn() },
      });

      expect(container.querySelector('.book-card')?.getAttribute('aria-label')).toBe('View details for Dune — Lending, Discussion');
    });

    it('folds in seeking, private, and intent labels together', () => {
      const { container } = render(BookCard, {
        props: {
          book: makeBook({ title: 'Dune', ownership: 'seeking', visibility: 'private', intents: ['giftable'] }),
          lang: 'en',
          onOpen: vi.fn(),
        },
      });

      expect(container.querySelector('.book-card')?.getAttribute('aria-label')).toBe(
        'View details for Dune — Seeking · Private · Gifting'
      );
    });
  });
});
