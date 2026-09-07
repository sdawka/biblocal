/**
 * Integration coverage for bookstore location fields.
 *
 * These tests invoke the real store handlers against migrated in-memory
 * SQLite through the D1 shim. They pin the explicit city contract and the
 * trim/blank behavior used by both POST and PATCH.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GET as getStoreHandler, PATCH as patchStoreHandler } from '../../src/pages/api/stores/[id]';
import { GET as getStoresHandler, POST as postStoreHandler } from '../../src/pages/api/stores';
import { createTestDb, seedUser } from '../helpers/test-db';
import { setTestDb, resetTestDb } from '../mocks/cloudflare-workers';
import { callApiAs } from '../helpers/api';
import type { D1Shim } from '../helpers/d1-shim';

const BASE = 'http://localhost';
const OWNER = 'store-location-owner';

let db: D1Shim;

beforeEach(() => {
  db = createTestDb();
  setTestDb(db);
  seedUser(db, OWNER);
});

afterEach(() => {
  resetTestDb();
});

const validStore = {
  name: 'The City Shelf',
  city: 'Montreal',
  neighborhood: 'Mile End',
  address: '123 Saint-Laurent Blvd',
};

async function createStore(overrides: Record<string, unknown> = {}) {
  return callApiAs(OWNER, postStoreHandler, {
    method: 'POST',
    url: `${BASE}/api/stores`,
    body: { ...validStore, ...overrides },
  });
}

describe('POST /api/stores — explicit city location', () => {
  it('rejects a missing city instead of applying a default city', async () => {
    const { status } = await createStore({ city: undefined });

    expect(status).toBe(400);
    const { results } = await db.prepare("SELECT COUNT(*) AS count FROM users WHERE type = 'bookstore'").bind().all();
    expect(results[0].count).toBe(0);
  });

  it('rejects a whitespace-only city', async () => {
    const { status } = await createStore({ city: '   ' });

    expect(status).toBe(400);
  });

  it.each(['name', 'city', 'neighborhood', 'address'] as const)('rejects a blank %s', async (field) => {
    const { status } = await createStore({ [field]: ' \t ' });

    expect(status).toBe(400);
  });

  it('trims location fields before persisting and returns the city in the list projection', async () => {
    const created = await createStore({
      name: '  The City Shelf  ',
      city: '  Toronto  ',
      neighborhood: '  Annex  ',
      address: '  123 Bloor St  ',
    });

    expect(created.status).toBe(201);
    const id = (created.json as { id: string }).id;
    const { results } = await db
      .prepare('SELECT name, city, neighborhood, address FROM users WHERE id = ?')
      .bind(id)
      .all();
    expect(results[0]).toMatchObject({
      name: 'The City Shelf',
      city: 'Toronto',
      neighborhood: 'Annex',
      address: '123 Bloor St',
    });

    const listed = await callApiAs(OWNER, getStoresHandler, {
      url: `${BASE}/api/stores?city=Toronto`,
    });
    expect(listed.status).toBe(200);
    expect((listed.json as { stores: { id: string; city: string }[] }).stores).toEqual([
      expect.objectContaining({ id, city: 'Toronto' }),
    ]);
  });

  it('rejects a city longer than the supported limit', async () => {
    const { status } = await createStore({ city: 'C'.repeat(121) });

    expect(status).toBe(400);
  });
});

describe('GET /api/stores/:id — persisted city', () => {
  it('shows the persisted city in the detail projection', async () => {
    const created = await createStore({ city: '  Vancouver  ' });
    const id = (created.json as { id: string }).id;

    const detail = await callApiAs(OWNER, getStoreHandler, {
      url: `${BASE}/api/stores/${id}`,
      params: { id },
    });

    expect(detail.status).toBe(200);
    expect((detail.json as { store: { city: string } }).store.city).toBe('Vancouver');
  });
});

describe('PATCH /api/stores/:id — explicit city location', () => {
  it('rejects a whitespace-only city', async () => {
    const created = await createStore();
    const id = (created.json as { id: string }).id;

    const patched = await callApiAs(OWNER, patchStoreHandler, {
      method: 'PATCH',
      url: `${BASE}/api/stores/${id}`,
      params: { id },
      body: { city: ' \t ' },
    });

    expect(patched.status).toBe(400);
  });

  it('trims a supplied city before persisting it', async () => {
    const created = await createStore();
    const id = (created.json as { id: string }).id;

    const patched = await callApiAs(OWNER, patchStoreHandler, {
      method: 'PATCH',
      url: `${BASE}/api/stores/${id}`,
      params: { id },
      body: { city: '  Halifax  ' },
    });

    expect(patched.status).toBe(200);
    expect((patched.json as { store: { city: string } }).store.city).toBe('Halifax');
    const { results } = await db.prepare('SELECT city FROM users WHERE id = ?').bind(id).all();
    expect(results[0].city).toBe('Halifax');
  });
});
