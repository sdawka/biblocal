/**
 * Integration tests for GET /api/users.json (public discovery-map feed).
 *
 * The endpoint is intentionally public and serves seed data projected through
 * an explicit allowlist. These tests invoke the REAL handler and assert the
 * projection never leaks sensitive fields regardless of the seed contents.
 */

import { describe, it, expect } from 'vitest';
import { GET as getUsersJsonHandler } from '../../src/pages/api/users.json';
import { callApi } from '../../tests/helpers/api';

type PublicUser = Record<string, unknown> & {
  contactVisibility?: string;
  shelf?: Record<string, unknown>[];
};

async function fetchUsers(): Promise<PublicUser[]> {
  const { status, json } = await callApi(getUsersJsonHandler, {
    url: 'http://localhost/api/users.json',
  });
  expect(status).toBe(200);
  expect(Array.isArray(json)).toBe(true);
  return json as PublicUser[];
}

describe('GET /api/users.json', () => {
  it('returns a non-empty array without authentication', async () => {
    const users = await fetchUsers();
    expect(users.length).toBeGreaterThan(0);
  });

  it('never emits a raw email field', async () => {
    const users = await fetchUsers();
    for (const user of users) {
      expect('email' in user).toBe(false);
    }
  });

  it('emits contact details only for users with public contact visibility', async () => {
    const users = await fetchUsers();
    for (const user of users) {
      if (user.contactVisibility !== 'public') {
        expect(user.contactMethod).toBeUndefined();
        expect(user.contactValue).toBeUndefined();
      }
    }
    // The seed data contains at least one user of each kind, so both branches
    // of the projection are actually exercised.
    expect(users.some((u) => u.contactVisibility === 'public')).toBe(true);
    expect(users.some((u) => u.contactVisibility && u.contactVisibility !== 'public')).toBe(true);
  });

  it('includes contact details for public-visibility users', async () => {
    const users = await fetchUsers();
    const publicUser = users.find((u) => u.contactVisibility === 'public');
    expect(publicUser).toBeDefined();
    expect(publicUser?.contactValue).toBeDefined();
  });

  it('projects shelf books through the book allowlist', async () => {
    const users = await fetchUsers();
    const withShelf = users.filter((u) => Array.isArray(u.shelf) && u.shelf.length > 0);
    expect(withShelf.length).toBeGreaterThan(0);
    for (const user of withShelf) {
      for (const book of user.shelf!) {
        // Fields the map reads survive the projection…
        expect(book.id).toBeDefined();
        expect(book.title).toBeDefined();
        // …and unlisted fields never do.
        expect('notes' in book && book.notes !== undefined).toBe(false);
      }
    }
  });

  it('keeps only map-safe user fields (no phone or address book internals)', async () => {
    const users = await fetchUsers();
    for (const user of users) {
      expect(user.phone).toBeUndefined();
      expect(user.addedBy).toBeUndefined();
    }
  });
});
