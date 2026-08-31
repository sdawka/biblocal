/**
 * Integration tests for GET /api/users/[id] (public user profile).
 *
 * These invoke the REAL handler from src/pages/api/users/[id].ts against a
 * REAL in-memory SQLite database (via D1Shim), covering visibility filtering,
 * contact-info privacy, connection detection, and bookstore field projection.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET as getUserHandler } from '../../src/pages/api/users/[id]';
import { createTestDb } from '../helpers/test-db';
import { setTestDb, resetTestDb } from '../mocks/cloudflare-workers';
import { callApi, callApiAs } from '../helpers/api';
import type { D1Shim } from '../helpers/d1-shim';

const BASE = 'http://localhost';
const OWNER = 'profile-owner';
const VIEWER = 'profile-viewer';

let db: D1Shim;

function insertUser(
  id: string,
  fields: Record<string, unknown> = {},
): void {
  const now = Date.now();
  const row: Record<string, unknown> = {
    id,
    email: `${id}@test.local`,
    name: fields.name ?? id,
    city: fields.city ?? 'Montreal',
    type: fields.type ?? 'person',
    address: fields.address ?? null,
    neighborhood: fields.neighborhood ?? null,
    website: fields.website ?? null,
    phone: fields.phone ?? null,
    specialties: fields.specialties ?? null,
    added_by: fields.addedBy ?? null,
    contact_method: fields.contactMethod ?? null,
    contact_value: fields.contactValue ?? null,
    contact_visibility: fields.contactVisibility ?? 'hidden',
    topics_curated: fields.topicsCurated ?? null,
    topics_freeform: fields.topicsFreeform ?? null,
    created_at: now,
    updated_at: now,
  };
  const cols = Object.keys(row);
  db.prepare(
    `INSERT INTO users (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`
  )
    .bind(...cols.map((c) => row[c]))
    .run();
}

function insertBook(id: string, userId: string, title: string, visibility: string): void {
  const now = Date.now();
  db.prepare(
    `INSERT INTO books (id, user_id, title, author, status, visibility, ownership, intents, created_at, updated_at)
     VALUES (?, ?, ?, 'Author', 'visible', ?, 'have', '[]', ?, ?)`
  )
    .bind(id, userId, title, visibility, now, now)
    .run();
}

function insertConnection(from: string, to: string, status: string): void {
  db.prepare(
    `INSERT INTO connection_requests (id, from_user_id, to_user_id, status, created_at)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(`conn-${from}-${to}`, from, to, status, Date.now())
    .run();
}

beforeEach(() => {
  db = createTestDb();
  setTestDb(db);
});

afterEach(() => {
  resetTestDb();
});

describe('GET /api/users/:id', () => {
  it('returns 400 when the id param is missing', async () => {
    const { status, json } = await callApi(getUserHandler, {
      url: `${BASE}/api/users/`,
      params: {},
    });
    expect(status).toBe(400);
    expect((json as { error: string }).error).toBe('User ID required');
  });

  it('returns 404 for an unknown user', async () => {
    const { status, json } = await callApi(getUserHandler, {
      url: `${BASE}/api/users/nobody`,
      params: { id: 'nobody' },
    });
    expect(status).toBe(404);
    expect((json as { error: string }).error).toBe('User not found');
  });

  it('returns the profile with only visible books for an anonymous viewer', async () => {
    insertUser(OWNER, { name: 'Owner', topicsCurated: '["fiction"]' });
    insertBook('b-visible', OWNER, 'Public Book', 'visible');
    insertBook('b-private', OWNER, 'Private Book', 'private');

    const { status, json } = await callApi(getUserHandler, {
      url: `${BASE}/api/users/${OWNER}`,
      params: { id: OWNER },
    });

    expect(status).toBe(200);
    const body = json as {
      profile: Record<string, unknown>;
      books: { id: string; title: string }[];
      isOwnProfile: boolean;
      isConnected: boolean;
    };
    expect(body.profile.id).toBe(OWNER);
    expect(body.profile.name).toBe('Owner');
    expect(body.profile.topicsCurated).toEqual(['fiction']);
    expect(body.isOwnProfile).toBe(false);
    expect(body.isConnected).toBe(false);
    expect(body.books).toHaveLength(1);
    expect(body.books[0].title).toBe('Public Book');
  });

  describe('contact-info filtering', () => {
    const contact = {
      contactMethod: 'email',
      contactValue: 'owner@example.com',
      phone: '555-1234',
    };

    it('hides on-request contact info from anonymous viewers', async () => {
      insertUser(OWNER, { ...contact, contactVisibility: 'on-request' });

      const { json } = await callApi(getUserHandler, {
        url: `${BASE}/api/users/${OWNER}`,
        params: { id: OWNER },
      });
      const profile = (json as { profile: Record<string, unknown> }).profile;
      expect(profile.contactValue).toBeUndefined();
      expect(profile.contactMethod).toBeUndefined();
      expect(profile.phone).toBeUndefined();
    });

    it('hides on-request contact info from an unconnected authenticated viewer', async () => {
      insertUser(OWNER, { ...contact, contactVisibility: 'on-request' });
      insertUser(VIEWER);

      const { json } = await callApiAs(VIEWER, getUserHandler, {
        url: `${BASE}/api/users/${OWNER}`,
        params: { id: OWNER },
      });
      const profile = (json as { profile: Record<string, unknown> }).profile;
      expect(profile.contactValue).toBeUndefined();
    });

    it('shows on-request contact info to a connected viewer (either direction)', async () => {
      insertUser(OWNER, { ...contact, contactVisibility: 'on-request' });
      insertUser(VIEWER);
      insertConnection(OWNER, VIEWER, 'accepted');

      const { json } = await callApiAs(VIEWER, getUserHandler, {
        url: `${BASE}/api/users/${OWNER}`,
        params: { id: OWNER },
      });
      const body = json as { profile: Record<string, unknown>; isConnected: boolean };
      expect(body.isConnected).toBe(true);
      expect(body.profile.contactValue).toBe('owner@example.com');
      expect(body.profile.contactMethod).toBe('email');
      expect(body.profile.phone).toBe('555-1234');
    });

    it('does not treat a pending request as a connection', async () => {
      insertUser(OWNER, { ...contact, contactVisibility: 'on-request' });
      insertUser(VIEWER);
      insertConnection(VIEWER, OWNER, 'pending');

      const { json } = await callApiAs(VIEWER, getUserHandler, {
        url: `${BASE}/api/users/${OWNER}`,
        params: { id: OWNER },
      });
      const body = json as { profile: Record<string, unknown>; isConnected: boolean };
      expect(body.isConnected).toBe(false);
      expect(body.profile.contactValue).toBeUndefined();
    });

    it('shows public contact info to anonymous viewers', async () => {
      insertUser(OWNER, { ...contact, contactVisibility: 'public' });

      const { json } = await callApi(getUserHandler, {
        url: `${BASE}/api/users/${OWNER}`,
        params: { id: OWNER },
      });
      const profile = (json as { profile: Record<string, unknown> }).profile;
      expect(profile.contactValue).toBe('owner@example.com');
    });

    it('hides hidden contact info even from connected viewers', async () => {
      insertUser(OWNER, { ...contact, contactVisibility: 'hidden' });
      insertUser(VIEWER);
      insertConnection(VIEWER, OWNER, 'accepted');

      const { json } = await callApiAs(VIEWER, getUserHandler, {
        url: `${BASE}/api/users/${OWNER}`,
        params: { id: OWNER },
      });
      const profile = (json as { profile: Record<string, unknown> }).profile;
      expect(profile.contactValue).toBeUndefined();
    });

    it('never exposes the raw email field', async () => {
      insertUser(OWNER, { ...contact, contactVisibility: 'public' });

      const { json } = await callApi(getUserHandler, {
        url: `${BASE}/api/users/${OWNER}`,
        params: { id: OWNER },
      });
      const profile = (json as { profile: Record<string, unknown> }).profile;
      expect('email' in profile).toBe(false);
    });
  });

  describe('own profile', () => {
    it('marks isOwnProfile and always includes own contact info', async () => {
      insertUser(OWNER, {
        contactMethod: 'email',
        contactValue: 'owner@example.com',
        contactVisibility: 'hidden',
      });

      const { json } = await callApiAs(OWNER, getUserHandler, {
        url: `${BASE}/api/users/${OWNER}`,
        params: { id: OWNER },
      });
      const body = json as { profile: Record<string, unknown>; isOwnProfile: boolean };
      expect(body.isOwnProfile).toBe(true);
      expect(body.profile.contactValue).toBe('owner@example.com');
    });
  });

  describe('bookstore field projection', () => {
    it('includes store-specific fields for bookstore profiles', async () => {
      insertUser('store-1', {
        type: 'bookstore',
        neighborhood: 'Mile End',
        address: '123 Book St',
        website: 'https://books.example.com',
        specialties: '["Fiction","Poetry"]',
      });

      const { json } = await callApi(getUserHandler, {
        url: `${BASE}/api/users/store-1`,
        params: { id: 'store-1' },
      });
      const profile = (json as { profile: Record<string, unknown> }).profile;
      expect(profile.type).toBe('bookstore');
      expect(profile.neighborhood).toBe('Mile End');
      expect(profile.address).toBe('123 Book St');
      expect(profile.website).toBe('https://books.example.com');
      expect(profile.specialties).toEqual(['Fiction', 'Poetry']);
    });

    it('omits store-specific fields for person profiles', async () => {
      insertUser(OWNER, { neighborhood: 'Mile End', address: '123 Home St' });

      const { json } = await callApi(getUserHandler, {
        url: `${BASE}/api/users/${OWNER}`,
        params: { id: OWNER },
      });
      const profile = (json as { profile: Record<string, unknown> }).profile;
      expect('neighborhood' in profile).toBe(false);
      expect('address' in profile).toBe(false);
    });

    it('sanitizes unsafe website URLs on bookstore profiles', async () => {
      insertUser('store-2', {
        type: 'bookstore',
        // eslint-disable-next-line no-script-url
        website: 'javascript:alert(1)',
      });

      const { json } = await callApi(getUserHandler, {
        url: `${BASE}/api/users/store-2`,
        params: { id: 'store-2' },
      });
      const profile = (json as { profile: Record<string, unknown> }).profile;
      expect(profile.website).toBeNull();
    });
  });
});
