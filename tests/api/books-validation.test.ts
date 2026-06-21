import { describe, it, expect } from 'vitest';
import {
  validateEnum,
  validateIntents,
  VALID_VISIBILITY,
  VALID_OWNERSHIP,
  VALID_STATUS,
  VALID_INTENTS,
} from '../../src/lib/validation';

/**
 * The real handlers import `cloudflare:workers` and run D1 queries, so they
 * cannot be invoked directly under vitest. Following the established pattern in
 * tests/api/visibility-security.test.ts, these simulate the exact
 * validation / persistence logic the POST and PATCH handlers run and assert the
 * data-integrity boundary.
 */

// --- POST /api/books validation ---------------------------------------------

// Mirror of the POST handler's enum gate: default when omitted, reject (null)
// when present-but-invalid.
function postEnum(value: unknown, allowed: readonly string[], fallback: string): string | null {
  if (value === undefined) return fallback;
  return validateEnum(value, allowed); // null => handler returns 400
}

describe('POST /api/books enum validation', () => {
  it('rejects invalid visibility (400)', () => {
    expect(postEnum('public', VALID_VISIBILITY, 'visible')).toBeNull();
  });
  it('rejects invalid ownership (400)', () => {
    expect(postEnum('borrowing', VALID_OWNERSHIP, 'have')).toBeNull();
  });
  it('rejects invalid status (400)', () => {
    expect(postEnum('seeking-home', VALID_STATUS, 'visible')).toBeNull();
  });

  it('defaults to safe values when omitted', () => {
    expect(postEnum(undefined, VALID_VISIBILITY, 'visible')).toBe('visible');
    expect(postEnum(undefined, VALID_OWNERSHIP, 'have')).toBe('have');
    expect(postEnum(undefined, VALID_STATUS, 'visible')).toBe('visible');
  });

  it('accepts valid values', () => {
    expect(postEnum('private', VALID_VISIBILITY, 'visible')).toBe('private');
    expect(postEnum('seeking', VALID_OWNERSHIP, 'have')).toBe('seeking');
    expect(postEnum('borrowable', VALID_STATUS, 'visible')).toBe('borrowable');
  });
});

describe('POST /api/books intents always stored as a sanitized array', () => {
  // Handler always does JSON.stringify(validateIntents(body.intents)).
  function storedIntents(input: unknown): string {
    return JSON.stringify(validateIntents(input));
  }

  it('a raw string is never stored verbatim — becomes []', () => {
    expect(storedIntents('borrowable')).toBe('[]');
  });
  it('undefined becomes []', () => {
    expect(storedIntents(undefined)).toBe('[]');
  });
  it('invalid array entries are filtered out', () => {
    expect(storedIntents(['borrowable', 'hack', 'giftable'])).toBe(
      JSON.stringify(['borrowable', 'giftable'])
    );
  });
  it('valid intents survive', () => {
    expect(JSON.parse(storedIntents([...VALID_INTENTS]))).toEqual([...VALID_INTENTS]);
  });
});

describe('POST /api/books id idempotency', () => {
  // Handler: id: body.id || generateId()
  function chosenId(bodyId: string | undefined, generated: string): string {
    return bodyId || generated;
  }
  it('honors a client-supplied id', () => {
    expect(chosenId('client-uuid-123', 'server-gen')).toBe('client-uuid-123');
  });
  it('falls back to a server id when omitted', () => {
    expect(chosenId(undefined, 'server-gen')).toBe('server-gen');
  });
});

describe('POST /api/books isbn dedup', () => {
  const existingBooks = [
    { id: 'book-1', userId: 'u1', isbn: '9780000000001', title: 'Dune' },
  ];

  // Mirror of the dedup SELECT: same userId + isbn => return existing (200).
  function findDuplicate(userId: string, isbn: string | undefined) {
    if (!isbn) return undefined;
    return existingBooks.find((b) => b.userId === userId && b.isbn === isbn);
  }

  it('returns the existing book when userId + isbn match', () => {
    const dup = findDuplicate('u1', '9780000000001');
    expect(dup).toBeDefined();
    expect(dup!.id).toBe('book-1');
  });
  it('does not dedup across users', () => {
    expect(findDuplicate('u2', '9780000000001')).toBeUndefined();
  });
  it('does not dedup when isbn is absent', () => {
    expect(findDuplicate('u1', undefined)).toBeUndefined();
  });
  it('does not dedup a different isbn', () => {
    expect(findDuplicate('u1', '9780000000002')).toBeUndefined();
  });
});

// --- PATCH /api/books/:id validation ----------------------------------------

describe('PATCH /api/books/:id rejects non-array intents/subjects', () => {
  // Mirror of the PATCH guards.
  function patchIntentsValid(intents: unknown): boolean {
    if (!Array.isArray(intents)) return false; // 400
    return intents.every((i) => validateEnum(i, VALID_INTENTS) !== null);
  }
  function patchSubjectsValid(subjects: unknown): boolean {
    return Array.isArray(subjects); // non-array => 400
  }

  it('rejects a raw string for intents', () => {
    expect(patchIntentsValid('borrowable')).toBe(false);
  });
  it('rejects an object for subjects', () => {
    expect(patchSubjectsValid({ a: 1 })).toBe(false);
  });
  it('rejects an array with invalid intent values', () => {
    expect(patchIntentsValid(['borrowable', 'evil'])).toBe(false);
  });
  it('accepts a valid intents array', () => {
    expect(patchIntentsValid(['borrowable'])).toBe(true);
  });
  it('accepts a subjects array', () => {
    expect(patchSubjectsValid(['poetry'])).toBe(true);
  });
});

describe('PATCH /api/books/:id rejects invalid status', () => {
  function patchStatusValid(status: unknown): boolean {
    return validateEnum(status, VALID_STATUS) !== null;
  }
  it('rejects an unknown status (400)', () => {
    expect(patchStatusValid('seeking-home')).toBe(false);
  });
  it('accepts a valid status', () => {
    expect(patchStatusValid('discussable')).toBe(true);
  });
});

describe('PATCH /api/books/:id persists arrays as stringified validated arrays', () => {
  it('intents are sanitized before persistence', () => {
    const persisted = JSON.stringify(validateIntents(['borrowable', 'bogus']));
    expect(persisted).toBe(JSON.stringify(['borrowable']));
  });
});
