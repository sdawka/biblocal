import type { Book, BookVisibility, BookOwnership, BookIntent } from './types';

export interface GoodreadsRow {
  'Title': string;
  'Author': string;
  'ISBN13': string;
  'ISBN': string;
  'My Rating': string;
  'Average Rating': string;
  'Publisher': string;
  'Year Published': string;
  'Original Publication Year': string;
  'Date Read': string;
  'Date Added': string;
  'Bookshelves': string;
  'Exclusive Shelf': string;
  'My Review': string;
  'Private Notes': string;
  'Number of Pages': string;
}

export interface ParsedBook {
  title: string;
  author: string;
  isbn?: string;
  visibility: BookVisibility;
  ownership: BookOwnership;
  intents: BookIntent[];
  notes?: string;
  rating?: number;
  dateRead?: string;
}

export interface ImportResult {
  books: ParsedBook[];
  errors: Array<{ row: number; message: string }>;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function cleanISBN(isbn: string): string | undefined {
  const cleaned = isbn.replace(/[="]/g, '').trim();
  if (!cleaned || cleaned === '') return undefined;
  return cleaned;
}

function mapShelfToOwnership(shelf: string): { ownership: BookOwnership; visibility: BookVisibility } {
  const lowerShelf = shelf.toLowerCase();
  if (lowerShelf === 'to-read' || lowerShelf.includes('want-to-read')) {
    return { ownership: 'seeking', visibility: 'visible' };
  }
  return { ownership: 'have', visibility: 'visible' };
}

function buildNotes(rating: string, review: string, privateNotes: string): string | undefined {
  const parts: string[] = [];

  if (rating && rating !== '0') {
    parts.push(`Goodreads rating: ${rating}/5`);
  }
  if (review && review.trim()) {
    parts.push(`Review: ${review.trim()}`);
  }
  if (privateNotes && privateNotes.trim()) {
    parts.push(`Notes: ${privateNotes.trim()}`);
  }

  return parts.length > 0 ? parts.join('\n\n') : undefined;
}

export function parseGoodreadsCSV(csvContent: string): ImportResult {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    return { books: [], errors: [{ row: 0, message: 'CSV file is empty or has no data rows' }] };
  }

  const headers = parseCSVLine(lines[0]);
  const titleIdx = headers.indexOf('Title');
  const authorIdx = headers.indexOf('Author');
  const isbn13Idx = headers.indexOf('ISBN13');
  const isbnIdx = headers.indexOf('ISBN');
  const ratingIdx = headers.indexOf('My Rating');
  const dateReadIdx = headers.indexOf('Date Read');
  const shelfIdx = headers.indexOf('Exclusive Shelf');
  const reviewIdx = headers.indexOf('My Review');
  const notesIdx = headers.indexOf('Private Notes');

  if (titleIdx === -1 || authorIdx === -1) {
    return { books: [], errors: [{ row: 0, message: 'CSV missing required Title or Author columns' }] };
  }

  const books: ParsedBook[] = [];
  const errors: Array<{ row: number; message: string }> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);

    const title = values[titleIdx]?.trim();
    const author = values[authorIdx]?.trim();

    if (!title || !author) {
      errors.push({ row: i + 1, message: 'Missing title or author' });
      continue;
    }

    const isbn = cleanISBN(values[isbn13Idx] || '') || cleanISBN(values[isbnIdx] || '');
    const exclusiveShelf = values[shelfIdx] || '';
    const { ownership, visibility } = mapShelfToOwnership(exclusiveShelf);
    const notes = buildNotes(
      values[ratingIdx] || '',
      values[reviewIdx] || '',
      values[notesIdx] || ''
    );
    const rating = parseInt(values[ratingIdx] || '0', 10);

    books.push({
      title,
      author,
      isbn,
      visibility,
      ownership,
      intents: [],
      notes,
      rating: rating > 0 ? rating : undefined,
      dateRead: values[dateReadIdx] || undefined,
    });
  }

  return { books, errors };
}

export function parsedBookToBook(parsed: ParsedBook): Omit<Book, 'id' | 'addedAt'> {
  return {
    title: parsed.title,
    author: parsed.author,
    isbn: parsed.isbn,
    visibility: parsed.visibility,
    ownership: parsed.ownership,
    intents: parsed.intents,
    notes: parsed.notes,
    addedVia: 'goodreads',
  };
}
