import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import BookSpine from '../../src/components/BookSpine.svelte';
import type { Book } from '../../src/lib/types';

// Mock i18n
vi.mock('../../src/i18n', () => ({
  useTranslations: (lang: string) => ({
    shelf: {
      card: {
        openDetailAria: 'View details for {title}',
        closeDetailAria: 'Close',
        seeking: 'Seeking',
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

describe('BookSpine', () => {
  it('renders with data-book-id', () => {
    const book = makeBook({ id: 'my-book-123' });
    const { container } = render(BookSpine, { props: { book, lang: 'en', onOpen: vi.fn() } });

    const spine = container.querySelector('[data-book-id]');
    expect(spine).toBeTruthy();
    expect(spine?.getAttribute('data-book-id')).toBe('my-book-123');
  });

  it('shows cover img when coverUrl present', () => {
    const book = makeBook({ coverUrl: 'https://example.com/cover.jpg' });
    const { container } = render(BookSpine, { props: { book, lang: 'en', onOpen: vi.fn() } });

    const img = container.querySelector('img.cover') as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img?.src).toBe('https://example.com/cover.jpg');
  });

  it('shows binding placeholder when coverUrl absent', () => {
    const book = makeBook({ coverUrl: undefined, title: 'Dune' });
    const { container } = render(BookSpine, { props: { book, lang: 'en', onOpen: vi.fn() } });

    expect(container.querySelector('img.cover')).toBeNull();
    const binding = container.querySelector('.binding');
    expect(binding).toBeTruthy();
    expect(container.querySelector('.binding-title')?.textContent).toBe('Dune');
  });

  it('calls onOpen with the book id when clicked', () => {
    const onOpen = vi.fn();
    const book = makeBook({ id: 'clickable-book' });
    const { container } = render(BookSpine, { props: { book, lang: 'en', onOpen } });

    const spine = container.querySelector('.spine');
    fireEvent.click(spine!);

    expect(onOpen).toHaveBeenCalledWith('clickable-book');
  });

  it('applies the seeking class when ownership is seeking', () => {
    const book = makeBook({ ownership: 'seeking' });
    const { container } = render(BookSpine, { props: { book, lang: 'en', onOpen: vi.fn() } });

    const spine = container.querySelector('.spine');
    expect(spine?.classList.contains('seeking')).toBe(true);
  });

  it('renders a status dot per intent', () => {
    const book = makeBook({ intents: ['borrowable', 'discussable'] });
    const { container } = render(BookSpine, { props: { book, lang: 'en', onOpen: vi.fn() } });

    expect(container.querySelector('.peek-dots .dot[data-status="borrowable"]')).toBeTruthy();
    expect(container.querySelector('.peek-dots .dot[data-status="discussable"]')).toBeTruthy();
  });

  it('aria-label is just the title when there is no status to report', () => {
    const book = makeBook({ title: 'Dune', ownership: 'have', intents: [] });
    const { container } = render(BookSpine, { props: { book, lang: 'en', onOpen: vi.fn() } });

    const spine = container.querySelector('.spine');
    expect(spine?.getAttribute('aria-label')).toBe('View details for Dune');
  });

  it('aria-label folds in the seeking status', () => {
    const book = makeBook({ title: 'Dune', ownership: 'seeking', intents: [] });
    const { container } = render(BookSpine, { props: { book, lang: 'en', onOpen: vi.fn() } });

    const spine = container.querySelector('.spine');
    expect(spine?.getAttribute('aria-label')).toBe('View details for Dune — Seeking');
  });

  it('aria-label folds in intent labels', () => {
    const book = makeBook({ title: 'Dune', ownership: 'have', intents: ['borrowable', 'discussable'] });
    const { container } = render(BookSpine, { props: { book, lang: 'en', onOpen: vi.fn() } });

    const spine = container.querySelector('.spine');
    expect(spine?.getAttribute('aria-label')).toBe('View details for Dune — Lending, Discussion');
  });

  it('aria-label folds in both seeking and intent labels', () => {
    const book = makeBook({ title: 'Dune', ownership: 'seeking', intents: ['giftable'] });
    const { container } = render(BookSpine, { props: { book, lang: 'en', onOpen: vi.fn() } });

    const spine = container.querySelector('.spine');
    expect(spine?.getAttribute('aria-label')).toBe('View details for Dune — Seeking · Gifting');
  });
});
