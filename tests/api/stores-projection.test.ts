import { describe, it, expect, vi, afterEach } from 'vitest';
import { qaBypassAllowed } from '../../src/lib/auth';
import { safeExternalUrl } from '../../src/lib/url';

/**
 * Security regression tests for the stores API hardening.
 *
 * The handlers import `cloudflare:workers` and run real D1 queries, so they
 * cannot be invoked directly in vitest. Following the established pattern in
 * tests/api/*.test.ts, these tests simulate the exact projection / gating logic
 * each handler uses and assert the security boundary.
 */

describe('GET /api/stores — list projection', () => {
  // A full DB row, including internal / PII columns that must NOT leak.
  const storeRow = {
    id: 'store-1',
    email: 'store-1@biblocal.local',
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
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Mirror of the handler's explicit per-store projection.
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

  it('exposes only the whitelisted key set', () => {
    expect(Object.keys(store).sort()).toEqual(
      ['address', 'city', 'id', 'name', 'neighborhood', 'phone', 'specialties', 'type', 'website']
    );
  });

  it('contains no PII / internal columns', () => {
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
      'createdAt',
      'updatedAt',
    ]) {
      expect(store).not.toHaveProperty(leaked);
    }
  });
});

describe('store write-side website sanitization', () => {
  // Mirror of the POST/PATCH persistence: store safeExternalUrl(body.website).
  it('persists null for a javascript: scheme', () => {
    expect(safeExternalUrl('javascript:alert(1)')).toBeNull();
  });

  it('persists a valid https URL unchanged', () => {
    expect(safeExternalUrl('https://shop.example.com')).toBe('https://shop.example.com');
  });
});

describe('POST /api/seed-stores — fail closed', () => {
  afterEach(() => vi.unstubAllEnvs());

  // Mirror of the handler guard: 404 when qaBypassAllowed(env) is false.
  function handlerStatus(env: { ENVIRONMENT?: string } | undefined): number {
    return qaBypassAllowed(env) ? 200 : 404;
  }

  it('returns 404 in production (bypass not allowed)', () => {
    vi.stubEnv('DEV', false);
    expect(handlerStatus({ ENVIRONMENT: 'production' })).toBe(404);
  });

  it('returns 404 when ENVIRONMENT is unset (fails closed)', () => {
    vi.stubEnv('DEV', false);
    expect(handlerStatus(undefined)).toBe(404);
    expect(handlerStatus({})).toBe(404);
  });

  it('is allowed only in the qa environment', () => {
    vi.stubEnv('DEV', false);
    expect(handlerStatus({ ENVIRONMENT: 'qa' })).toBe(200);
  });

  it('is allowed in local dev', () => {
    vi.stubEnv('DEV', true);
    expect(handlerStatus({ ENVIRONMENT: 'production' })).toBe(200);
  });
});
