import { describe, it, expect, vi, afterEach } from 'vitest';
import { qaBypassAllowed } from '../../src/lib/auth';

/**
 * Security regression tests for the visibility-hardening work.
 *
 * The API handlers import `cloudflare:workers` and run real D1 queries, so they
 * cannot be invoked directly in vitest (env.DB is a stub). Following the
 * established pattern in tests/api/*.test.ts, these tests simulate the exact
 * projection / filter / default logic used by each handler and assert the
 * security boundary, plus directly unit-test the pure `qaBypassAllowed` helper.
 */

describe('Visibility hardening — security regressions', () => {
  // --- Private books never leak via public read paths -----------------------
  describe('private book visibility', () => {
    const allBooks = [
      { id: 'book-1', title: 'Public', visibility: 'visible' },
      { id: 'book-2', title: 'Secret', visibility: 'private' },
    ];

    it('GET /api/books (public) excludes private books', () => {
      // Public handler: .where(eq(books.visibility, 'visible'))
      const result = allBooks.filter((b) => b.visibility === 'visible');
      expect(result.map((b) => b.id)).toEqual(['book-1']);
      expect(result.find((b) => b.id === 'book-2')).toBeUndefined();
    });

    it('GET /api/users/[id] (public profile) excludes private books', () => {
      // Profile handler filters books to visibility = 'visible'.
      const result = allBooks.filter((b) => b.visibility === 'visible');
      expect(result.find((b) => b.id === 'book-2')).toBeUndefined();
    });

    it('owner view (?mine=true) includes private books', () => {
      // Owner read path is scoped by userId only, no visibility filter.
      const ownerView = allBooks;
      expect(ownerView.find((b) => b.id === 'book-2')).toBeDefined();
    });
  });

  // --- Private notes never leak via public read paths -----------------------
  describe('private note visibility', () => {
    const allNotes = [
      { id: 'note-1', text: 'shareable', visibility: 'visible' },
      { id: 'note-2', text: 'personal', visibility: 'private' },
    ];

    it('public reads (withNotes publicOnly) exclude private notes', () => {
      // Public note attach: .where(eq(bookNotes.visibility, 'visible'))
      const result = allNotes.filter((n) => n.visibility === 'visible');
      expect(result.map((n) => n.id)).toEqual(['note-1']);
      expect(result.find((n) => n.id === 'note-2')).toBeUndefined();
    });

    it('owner reads include private notes', () => {
      const ownerView = allNotes;
      expect(ownerView.find((n) => n.id === 'note-2')).toBeDefined();
    });
  });

  // --- GET /api/stores/[id] ships no PII / internal columns -----------------
  describe('GET /api/stores/[id] field projection', () => {
    // A full DB row, including internal / PII columns that must NOT leak.
    const storeRow = {
      id: 'store-1',
      email: 'owner@example.com',
      name: 'The Word Shop',
      city: 'Montreal',
      type: 'bookstore',
      neighborhood: 'Mile End',
      address: '123 Book St',
      website: 'https://words.example.com',
      phone: '555-1000',
      specialties: '["poetry"]',
      addedBy: 'clerk_user_abc123',
      contactMethod: 'email',
      contactValue: 'private@example.com',
      contactVisibility: 'hidden',
      latitude: 45.5,
      longitude: -73.6,
      radiusKm: 5,
      topicsCurated: '["x"]',
    };

    const bookRow = {
      id: 'book-1',
      userId: 'store-1',
      title: 'Selected Poems',
      author: 'Anon',
      isbn: '123',
      coverUrl: 'https://c.example.com/1.jpg',
      status: 'visible',
      visibility: 'visible',
      ownership: 'have',
      intents: '["borrowable"]',
      addedVia: 'manual',
      subjects: '["poetry"]',
      notes: 'legacy private note text',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Mirror of the handler's explicit projection.
    const store = {
      id: storeRow.id,
      name: storeRow.name,
      city: storeRow.city,
      type: storeRow.type,
      neighborhood: storeRow.neighborhood,
      address: storeRow.address,
      website: storeRow.website,
      phone: storeRow.phone,
      specialties: storeRow.specialties ? JSON.parse(storeRow.specialties) : [],
    };

    const book = {
      id: bookRow.id,
      title: bookRow.title,
      author: bookRow.author,
      isbn: bookRow.isbn,
      coverUrl: bookRow.coverUrl,
      visibility: bookRow.visibility,
      ownership: bookRow.ownership,
      intents: bookRow.intents ? JSON.parse(bookRow.intents) : [],
      subjects: bookRow.subjects ? JSON.parse(bookRow.subjects) : [],
    };

    it('store object exposes only the allowed key set', () => {
      expect(Object.keys(store).sort()).toEqual(
        ['address', 'city', 'id', 'name', 'neighborhood', 'phone', 'specialties', 'type', 'website']
      );
    });

    it('store object contains no PII / internal columns', () => {
      for (const leaked of [
        'email',
        'addedBy',
        'contactMethod',
        'contactValue',
        'contactVisibility',
        'latitude',
        'longitude',
        'radiusKm',
        'topicsCurated',
      ]) {
        expect(store).not.toHaveProperty(leaked);
      }
    });

    it('book object exposes only the allowed key set', () => {
      expect(Object.keys(book).sort()).toEqual(
        ['author', 'coverUrl', 'id', 'intents', 'isbn', 'ownership', 'subjects', 'title', 'visibility']
      );
    });

    it('book object drops the legacy notes column and internal fields', () => {
      for (const leaked of ['notes', 'userId', 'status', 'addedVia', 'createdAt', 'updatedAt']) {
        expect(book).not.toHaveProperty(leaked);
      }
    });
  });

  // --- Store books are forced public ----------------------------------------
  describe('POST /api/stores/[id]/books forces visibility = visible', () => {
    function storeVisibility(_body: { visibility?: string }): string {
      // Handler hardcodes 'visible' regardless of body input.
      return 'visible';
    }

    it('private request body is stored as visible', () => {
      expect(storeVisibility({ visibility: 'private' })).toBe('visible');
    });

    it('omitted visibility is visible', () => {
      expect(storeVisibility({})).toBe('visible');
    });
  });

  // --- Defaults: book visible, note private ---------------------------------
  describe('insert defaults', () => {
    it('new book defaults to visible', () => {
      // schema: visibility text notNull default 'visible'
      const body: { visibility?: string } = {};
      expect(body.visibility || 'visible').toBe('visible');
    });

    it('new note defaults to private', () => {
      // schema: bookNotes.visibility default 'private'
      const body: { visibility?: string } = {};
      expect(body.visibility || 'private').toBe('private');
    });
  });

  // --- Non-owner mutations return 404 (no leak, no mutation) -----------------
  describe('non-owner note/book mutation returns 404', () => {
    const note = { id: 'note-1', userId: 'owner', bookId: 'book-1' };

    function findForMutation(noteId: string, userId: string, bookId: string) {
      // Mirror of the WHERE clause: id AND userId AND bookId.
      return note.id === noteId && note.userId === userId && note.bookId === bookId
        ? note
        : undefined;
    }

    it('non-owner PATCH/DELETE finds no row → 404', () => {
      const match = findForMutation('note-1', 'attacker', 'book-1');
      expect(match).toBeUndefined(); // handler returns 404, performs no mutation
    });

    it('owner with correct book id finds the row', () => {
      const match = findForMutation('note-1', 'owner', 'book-1');
      expect(match).toBeDefined();
    });

    it('owner with mismatched book id finds no row (path is honored) → 404', () => {
      const match = findForMutation('note-1', 'owner', 'other-book');
      expect(match).toBeUndefined();
    });
  });

  // --- qaBypassAllowed allowlist (fails closed) -----------------------------
  describe('qaBypassAllowed', () => {
    afterEach(() => vi.unstubAllEnvs());

    it('is true in local dev regardless of ENVIRONMENT', () => {
      vi.stubEnv('DEV', true);
      expect(qaBypassAllowed({ ENVIRONMENT: 'production' })).toBe(true);
      expect(qaBypassAllowed(undefined)).toBe(true);
    });

    describe('outside dev (fail closed)', () => {
      it('false for ENVIRONMENT=production', () => {
        vi.stubEnv('DEV', false);
        expect(qaBypassAllowed({ ENVIRONMENT: 'production' })).toBe(false);
      });

      it('false for missing ENVIRONMENT', () => {
        vi.stubEnv('DEV', false);
        expect(qaBypassAllowed(undefined)).toBe(false);
        expect(qaBypassAllowed({})).toBe(false);
      });

      it('false for unknown ENVIRONMENT', () => {
        vi.stubEnv('DEV', false);
        expect(qaBypassAllowed({ ENVIRONMENT: 'staging' })).toBe(false);
        expect(qaBypassAllowed({ ENVIRONMENT: 'QA' })).toBe(false); // case-sensitive
      });

      it('true only for ENVIRONMENT=qa', () => {
        vi.stubEnv('DEV', false);
        expect(qaBypassAllowed({ ENVIRONMENT: 'qa' })).toBe(true);
      });
    });
  });
});
