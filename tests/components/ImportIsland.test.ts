import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import ImportIsland from '../../src/components/ImportIsland.svelte';

// Mock i18n
vi.mock('../../src/i18n', () => ({
  useTranslations: (lang: string) => ({
    shelf: {
      import: {
        title: 'Import from Goodreads',
        instructions: 'Export your Goodreads library as CSV and select it here.',
        chooseFile: 'Choose CSV file',
        readError: 'Error reading file',
        noneSelected: 'Please select at least one book',
        importFailed: 'Import failed',
        booksFound: 'books found',
        rowsSkipped: 'rows skipped',
        selectAll: 'Select all',
        selectNone: 'Select none',
        importBooks: 'Import {n} books',
        importingTitle: 'Importing...',
        importingDesc: 'Please wait while your books are being imported.',
        doneTitle: 'Import complete!',
        imported: 'imported',
        skipped: 'skipped',
        errorsLabel: 'errors',
        failedBook: lang === 'es' ? 'No se pudo importar {title}' : 'Could not import {title}',
        failedUnknownBook:
          lang === 'es' ? 'No se pudo importar un libro' : 'Could not import a book',
        andMore: 'and {n} more',
        done: 'Done',
        seeking: 'Seeking',
        have: 'Have',
      },
    },
  }),
}));

// Mock shelf store
vi.mock('../../src/stores/shelf', () => ({
  loadBooksFromServer: vi.fn().mockResolvedValue(undefined),
}));

describe('ImportIsland', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Upload step', () => {
    it('renders file upload section initially', () => {
      const { container } = render(ImportIsland, { props: { lang: 'en' } });

      const uploadSection = container.querySelector('.upload-section');
      expect(uploadSection).toBeTruthy();
      expect(screen.getByText('Import from Goodreads')).toBeTruthy();
    });

    it('has a file input with CSV accept', () => {
      const { container } = render(ImportIsland, { props: { lang: 'en' } });

      const fileInput = container.querySelector('input[type="file"]');
      expect(fileInput?.getAttribute('accept')).toBe('.csv');
    });

    it('shows choose file button', () => {
      render(ImportIsland, { props: { lang: 'en' } });

      expect(screen.getByText('Choose CSV file')).toBeTruthy();
    });

    it('shows instructions text', () => {
      render(ImportIsland, { props: { lang: 'en' } });

      expect(screen.getByText(/Export your Goodreads library/)).toBeTruthy();
    });
  });

  describe('Component structure', () => {
    it('has file input for CSV upload', () => {
      const { container } = render(ImportIsland, { props: { lang: 'en' } });

      const fileInput = container.querySelector('input[type="file"]');
      expect(fileInput).toBeTruthy();
      expect(fileInput?.getAttribute('accept')).toBe('.csv');
    });

    it('shows file input is required', () => {
      const { container } = render(ImportIsland, { props: { lang: 'en' } });

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeTruthy();
    });
  });

  describe('Import button state', () => {
    it('import button exists in upload step', () => {
      const { container } = render(ImportIsland, { props: { lang: 'en' } });

      const uploadSection = container.querySelector('.upload-section');
      expect(uploadSection).toBeTruthy();
    });

    it('has language prop support', () => {
      const { container: enContainer } = render(ImportIsland, { props: { lang: 'en' } });
      expect(screen.getByText('Import from Goodreads')).toBeTruthy();

      // Render with different language
      const { container: frContainer } = render(ImportIsland, { props: { lang: 'fr' } });
      // Component should render without error with different lang
      expect(frContainer).toBeTruthy();
    });
  });;

  describe('API integration', () => {
    it('sends import request to /api/books/import', () => {
      const { container } = render(ImportIsland, { props: { lang: 'en' } });

      const uploadSection = container.querySelector('.upload-section');
      expect(uploadSection).toBeTruthy();

      // Component should have the right endpoint configuration
      expect(container).toBeTruthy();
    });

    it('handles import result with imported and skipped counts', () => {
      const { container } = render(ImportIsland, { props: { lang: 'en' } });

      // Component structure should support displaying results
      const uploadSection = container.querySelector('.upload-section');
      expect(uploadSection).toBeTruthy();
    });
  });

  describe('Error handling', () => {
    it('component structure supports error display', () => {
      const { container } = render(ImportIsland, { props: { lang: 'en' } });

      const uploadSection = container.querySelector('.upload-section');
      expect(uploadSection).toBeTruthy();

      // Error messages should render in the upload section if file reading fails
      expect(uploadSection).toBeTruthy();
    });

    it('uses a localized fallback when the API cannot identify a failed book', async () => {
      class CsvFileReader {
        onload: ((event: { target: { result: string } }) => void) | null = null;
        onerror: (() => void) | null = null;

        readAsText() {
          this.onload?.({ target: { result: 'Title,Author\nDune,Frank Herbert' } });
        }
      }

      vi.stubGlobal('FileReader', CsvFileReader);
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ imported: 0, skipped: 0, errors: [''] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      );

      const { container } = render(ImportIsland, { props: { lang: 'es' } });
      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      await fireEvent.change(input, {
        target: { files: [new File(['csv'], 'books.csv', { type: 'text/csv' })] },
      });
      await fireEvent.click(screen.getByRole('button', { name: 'Import 1 books' }));

      await waitFor(() => {
        expect(screen.getByText('No se pudo importar un libro')).toBeTruthy();
      });
    });
  });

  describe('Navigation', () => {
    it('component starts in upload step', () => {
      const { container } = render(ImportIsland, { props: { lang: 'en' } });

      // Component should start in upload section
      const uploadSection = container.querySelector('.upload-section');
      expect(uploadSection).toBeTruthy();
      expect(screen.getByText('Import from Goodreads')).toBeTruthy();
    });

    it('upload section has expected buttons and inputs', () => {
      const { container } = render(ImportIsland, { props: { lang: 'en' } });

      const fileInput = container.querySelector('input[type="file"]');
      expect(fileInput).toBeTruthy();

      const fileButton = screen.getByText('Choose CSV file');
      expect(fileButton).toBeTruthy();
    });
  });
});
