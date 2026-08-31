/**
 * Integration tests for PATCH /api/profile.
 *
 * These invoke the REAL handler from src/pages/api/profile.ts against a REAL
 * in-memory SQLite database (via D1Shim), covering auth, field allowlisting,
 * validation hardening, and isolation between users.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PATCH as patchProfileHandler } from '../../src/pages/api/profile';
import { createTestDb, seedUser } from '../helpers/test-db';
import { setTestDb, resetTestDb } from '../mocks/cloudflare-workers';
import { callApi, callApiAs } from '../helpers/api';
import type { D1Shim } from '../helpers/d1-shim';

const BASE = 'http://localhost';
const USER_A = 'profile-user-a';
const USER_B = 'profile-user-b';

let db: D1Shim;

async function userRow(id: string): Promise<Record<string, unknown> | undefined> {
  const { results } = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).all();
  return results[0];
}

function patchAs(userId: string, body: unknown) {
  return callApiAs(userId, patchProfileHandler, {
    method: 'PATCH',
    url: `${BASE}/api/profile`,
    body,
  });
}

beforeEach(() => {
  db = createTestDb();
  setTestDb(db);
  seedUser(db, USER_A);
  seedUser(db, USER_B);
});

afterEach(() => {
  resetTestDb();
});

describe('PATCH /api/profile', () => {
  it('returns 401 when unauthenticated', async () => {
    const { status, json } = await callApi(patchProfileHandler, {
      method: 'PATCH',
      url: `${BASE}/api/profile`,
      body: { name: 'Anon' },
    });
    expect(status).toBe(401);
    expect((json as { error: string }).error).toBe('Not authenticated');
  });

  it('updates allowed fields and persists them', async () => {
    const { status, json } = await patchAs(USER_A, {
      name: 'Alice',
      city: 'Montreal',
      radiusKm: 10,
      borrowStyle: 'careful',
      contactMethod: 'email',
      contactValue: 'alice@example.com',
      contactVisibility: 'on-request',
      latitude: 45.5,
      longitude: -73.55,
      locationPrecision: 'approximate',
    });

    expect(status).toBe(200);
    const profile = (json as { profile: Record<string, unknown> }).profile;
    expect(profile.name).toBe('Alice');
    expect(profile.radiusKm).toBe(10);
    expect(profile.contactVisibility).toBe('on-request');

    const row = await userRow(USER_A);
    expect(row?.name).toBe('Alice');
    expect(row?.city).toBe('Montreal');
    expect(row?.latitude).toBe(45.5);
  });

  it('serializes array fields to JSON', async () => {
    const { status } = await patchAs(USER_A, {
      topicsCurated: ['fiction', 'history'],
      topicsFreeform: ['Le Guin fan'],
      currentObsessions: ['mycology'],
    });

    expect(status).toBe(200);
    const row = await userRow(USER_A);
    expect(JSON.parse(row?.topics_curated as string)).toEqual(['fiction', 'history']);
    expect(JSON.parse(row?.topics_freeform as string)).toEqual(['Le Guin fan']);
    expect(JSON.parse(row?.current_obsessions as string)).toEqual(['mycology']);
  });

  it('creates the user row on first PATCH (auto-provisioning)', async () => {
    const newUser = 'brand-new-user';
    const { status } = await patchAs(newUser, { name: 'Newcomer' });
    expect(status).toBe(200);

    const row = await userRow(newUser);
    expect(row).toBeDefined();
    expect(row?.name).toBe('Newcomer');
  });

  it('only updates the authenticated user, never anyone else', async () => {
    await patchAs(USER_B, { name: 'Original B' });

    const { status } = await patchAs(USER_A, { name: 'Sneaky A' });
    expect(status).toBe(200);

    const rowB = await userRow(USER_B);
    expect(rowB?.name).toBe('Original B');
  });

  it('ignores fields outside the allowlist (id, email, type, addedBy)', async () => {
    const { status } = await patchAs(USER_A, {
      name: 'Alice',
      id: 'hacked-id',
      email: 'evil@example.com',
      type: 'bookstore',
      addedBy: USER_A,
    });

    expect(status).toBe(200);
    const row = await userRow(USER_A);
    expect(row?.id).toBe(USER_A);
    expect(row?.email).toBe(`${USER_A}@test.local`);
    expect(row?.type).toBe('person');
    expect(row?.added_by).toBeNull();
  });

  describe('validation failures return 400', () => {
    it('rejects invalid contactVisibility', async () => {
      const { status, json } = await patchAs(USER_A, { contactVisibility: 'everyone' });
      expect(status).toBe(400);
      expect((json as { error: string }).error).toContain('Invalid contactVisibility');
    });

    it('rejects invalid contactMethod', async () => {
      const { status } = await patchAs(USER_A, { contactMethod: 'telepathy' });
      expect(status).toBe(400);
    });

    it('rejects invalid locationPrecision', async () => {
      const { status } = await patchAs(USER_A, { locationPrecision: 'galaxy' });
      expect(status).toBe(400);
    });

    it('rejects out-of-range or non-numeric latitude/longitude', async () => {
      expect((await patchAs(USER_A, { latitude: 91 })).status).toBe(400);
      expect((await patchAs(USER_A, { latitude: '45.5' })).status).toBe(400);
      expect((await patchAs(USER_A, { longitude: -181 })).status).toBe(400);
    });

    it('rejects invalid radiusKm values', async () => {
      expect((await patchAs(USER_A, { radiusKm: 0 })).status).toBe(400);
      expect((await patchAs(USER_A, { radiusKm: 2.5 })).status).toBe(400);
      expect((await patchAs(USER_A, { radiusKm: 501 })).status).toBe(400);
      expect((await patchAs(USER_A, { radiusKm: 'far' })).status).toBe(400);
    });

    it('rejects non-string and over-long string fields', async () => {
      expect((await patchAs(USER_A, { name: 42 })).status).toBe(400);
      expect((await patchAs(USER_A, { name: 'x'.repeat(121) })).status).toBe(400);
      expect((await patchAs(USER_A, { city: 'x'.repeat(121) })).status).toBe(400);
      expect((await patchAs(USER_A, { borrowStyle: 'x'.repeat(501) })).status).toBe(400);
    });

    it('rejects non-array and oversized array fields', async () => {
      expect((await patchAs(USER_A, { topicsCurated: 'fiction' })).status).toBe(400);
      expect(
        (await patchAs(USER_A, { currentObsessions: Array(51).fill('x') })).status
      ).toBe(400);
    });

    it('a rejected update leaves the row unchanged', async () => {
      await patchAs(USER_A, { name: 'Before' });
      await patchAs(USER_A, { name: 'After', contactVisibility: 'everyone' });

      const row = await userRow(USER_A);
      expect(row?.name).toBe('Before');
    });
  });

  it('currently answers a malformed JSON body with 500 (pins existing behavior)', async () => {
    // Unlike the hardened endpoints that use readJsonBody(), PATCH /api/profile
    // calls request.json() directly, so malformed JSON falls into the catch-all
    // 500. If the handler is ever migrated to readJsonBody(), update this to 400.
    const { status } = await callApiAs(USER_A, patchProfileHandler, {
      method: 'PATCH',
      url: `${BASE}/api/profile`,
      rawBody: 'not-json{',
    });
    expect(status).toBe(500);
  });
});
