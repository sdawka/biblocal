import { describe, it, expect } from 'vitest';
import { parseGoodreadsCSV, parsedBookToBook } from '../../src/lib/goodreads-import';

describe('parseGoodreadsCSV', () => {
  it('parses a valid CSV row', () => {
    const csv = `Title,Author,ISBN13,ISBN,My Rating,Average Rating,Publisher,Year Published,Original Publication Year,Date Read,Date Added,Bookshelves,Exclusive Shelf,My Review,Private Notes,Number of Pages
The Great Gatsby,F. Scott Fitzgerald,="9780743273565",="0743273567",5,3.93,Scribner,2004,1925,2023/05/15,2023/01/10,favorites,read,Amazing book!,My notes,180`;

    const result = parseGoodreadsCSV(csv);

    expect(result.books).toHaveLength(1);
    expect(result.errors).toHaveLength(0);

    const book = result.books[0];
    expect(book.title).toBe('The Great Gatsby');
    expect(book.author).toBe('F. Scott Fitzgerald');
    expect(book.isbn).toBe('9780743273565');
    expect(book.ownership).toBe('have');
    expect(book.visibility).toBe('visible');
    expect(book.rating).toBe(5);
    expect(book.notes).toContain('Goodreads rating: 5/5');
    expect(book.notes).toContain('Review: Amazing book!');
    expect(book.notes).toContain('Notes: My notes');
  });

  it('maps to-read shelf to seeking ownership', () => {
    const csv = `Title,Author,ISBN13,ISBN,My Rating,Average Rating,Publisher,Year Published,Original Publication Year,Date Read,Date Added,Bookshelves,Exclusive Shelf,My Review,Private Notes,Number of Pages
Dune,Frank Herbert,="9780441172719",,,4.23,Ace,1990,1965,,,sci-fi,to-read,,,412`;

    const result = parseGoodreadsCSV(csv);

    expect(result.books[0].ownership).toBe('seeking');
    expect(result.books[0].visibility).toBe('visible');
  });

  it('handles missing ISBN gracefully', () => {
    const csv = `Title,Author,ISBN13,ISBN,My Rating,Average Rating,Publisher,Year Published,Original Publication Year,Date Read,Date Added,Bookshelves,Exclusive Shelf,My Review,Private Notes,Number of Pages
No ISBN Book,Unknown Author,,,0,3.5,Publisher,2020,2020,,,shelf,read,,,200`;

    const result = parseGoodreadsCSV(csv);

    expect(result.books[0].isbn).toBeUndefined();
  });

  it('handles quoted fields with commas', () => {
    const csv = `Title,Author,ISBN13,ISBN,My Rating,Average Rating,Publisher,Year Published,Original Publication Year,Date Read,Date Added,Bookshelves,Exclusive Shelf,My Review,Private Notes,Number of Pages
"The Sun Also Rises, A Novel",Ernest Hemingway,="9780743297332",,,3.82,Scribner,2006,1926,,,classics,read,"Great book, loved it",,251`;

    const result = parseGoodreadsCSV(csv);

    expect(result.books[0].title).toBe('The Sun Also Rises, A Novel');
    expect(result.books[0].notes).toContain('Review: Great book, loved it');
  });

  it('skips rows with missing title or author', () => {
    const csv = `Title,Author,ISBN13,ISBN,My Rating,Average Rating,Publisher,Year Published,Original Publication Year,Date Read,Date Added,Bookshelves,Exclusive Shelf,My Review,Private Notes,Number of Pages
,Missing Author,="1234567890123",,,3.5,Publisher,2020,2020,,,shelf,read,,,200
Missing Title,,="1234567890124",,,3.5,Publisher,2020,2020,,,shelf,read,,,200
Valid Book,Valid Author,="1234567890125",,,3.5,Publisher,2020,2020,,,shelf,read,,,200`;

    const result = parseGoodreadsCSV(csv);

    expect(result.books).toHaveLength(1);
    expect(result.books[0].title).toBe('Valid Book');
    expect(result.errors).toHaveLength(2);
  });
});

describe('parsedBookToBook', () => {
  it('converts parsed book to Book format', () => {
    const parsed = {
      title: 'Test Book',
      author: 'Test Author',
      isbn: '9780123456789',
      visibility: 'visible' as const,
      ownership: 'have' as const,
      intents: [],
      notes: 'Some notes',
      rating: 4,
    };

    const book = parsedBookToBook(parsed);

    expect(book.title).toBe('Test Book');
    expect(book.author).toBe('Test Author');
    expect(book.isbn).toBe('9780123456789');
    expect(book.addedVia).toBe('goodreads');
    expect(book.visibility).toBe('visible');
    expect(book.ownership).toBe('have');
  });
});
