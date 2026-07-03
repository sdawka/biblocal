/**
 * Integration tests for the connections API handlers.
 *
 * Uses the real handlers against an in-memory SQLite DB via D1Shim.
 * Covers BUG 1 (declined-cooldown direction) and BUG 2 (fromUser/toUser population).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET as getConnectionsHandler, POST as postConnectionHandler } from '../../src/pages/api/connections';
import { PATCH as patchConnectionHandler } from '../../src/pages/api/connections/[id]';
import { createTestDb, seedUser } from '../helpers/test-db';
import { setTestDb, resetTestDb } from '../mocks/cloudflare-workers';
import { callApiAs } from '../helpers/api';
import type { D1Shim } from '../helpers/d1-shim';

const USER_A = 'conn-user-a';
const USER_B = 'conn-user-b';
const BASE = 'http://localhost';

let db: D1Shim;

beforeEach(() => {
  db = createTestDb();
  setTestDb(db);
});

afterEach(() => {
  resetTestDb();
});

function seedUserWithContact(db: D1Shim, id: string, name: string): void {
  const now = Date.now();
  db.prepare(
    'INSERT INTO users (id, email, name, contact_value, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, `${id}@test.local`, name, 'contact@example.com', now, now).run();
}

// ─── BUG 1: Declined cooldown should only block the original requester ─────────

describe('POST /api/connections — declined-cooldown direction', () => {
  beforeEach(() => {
    seedUserWithContact(db, USER_A, 'Alice');
    seedUserWithContact(db, USER_B, 'Bob');
  });

  it('(a) the decliner (A) can send a new request to B after B→A was recently declined by A', async () => {
    // B sends request to A
    const { json: created } = await callApiAs(USER_B, postConnectionHandler, {
      method: 'POST',
      url: `${BASE}/api/connections`,
      body: { toUserId: USER_A },
    });
    const reqId = (created as { id: string }).id;

    // A declines
    await callApiAs(USER_A, patchConnectionHandler, {
      method: 'PATCH',
      url: `${BASE}/api/connections/${reqId}`,
      body: { status: 'declined' },
      params: { id: reqId },
    });

    // A initiates to B — A is the decliner, not the declined party; must NOT be blocked
    const { status } = await callApiAs(USER_A, postConnectionHandler, {
      method: 'POST',
      url: `${BASE}/api/connections`,
      body: { toUserId: USER_B },
    });
    expect(status).toBe(201);
  });

  it('(b) the original requester (A) is blocked from re-sending within 30 days of being declined', async () => {
    // A sends request to B
    const { json: created } = await callApiAs(USER_A, postConnectionHandler, {
      method: 'POST',
      url: `${BASE}/api/connections`,
      body: { toUserId: USER_B },
    });
    const reqId = (created as { id: string }).id;

    // B declines
    await callApiAs(USER_B, patchConnectionHandler, {
      method: 'PATCH',
      url: `${BASE}/api/connections/${reqId}`,
      body: { status: 'declined' },
      params: { id: reqId },
    });

    // A tries again — A was the requester; must be blocked within cooldown
    const { status } = await callApiAs(USER_A, postConnectionHandler, {
      method: 'POST',
      url: `${BASE}/api/connections`,
      body: { toUserId: USER_B },
    });
    expect(status).toBe(400);
  });

  it('(c) the original requester (A) can retry after the 30-day cooldown expires', async () => {
    // Insert an A→B declined row with respondedAt 31 days ago (as Unix seconds)
    const reqId = 'stale-declined-request';
    const thirtyOneDaysAgoSec = Math.floor((Date.now() - 31 * 24 * 60 * 60 * 1000) / 1000);
    db.prepare(
      'INSERT INTO connection_requests (id, from_user_id, to_user_id, status, created_at, responded_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(reqId, USER_A, USER_B, 'declined', thirtyOneDaysAgoSec, thirtyOneDaysAgoSec).run();

    // A retries — cooldown is expired; must succeed
    const { status } = await callApiAs(USER_A, postConnectionHandler, {
      method: 'POST',
      url: `${BASE}/api/connections`,
      body: { toUserId: USER_B },
    });
    expect(status).toBe(201);
  });
});

// ─── BUG: pending reverse request must block reactivation of old declined row ──

describe('POST /api/connections — pending-reverse blocks reactivation', () => {
  beforeEach(() => {
    seedUserWithContact(db, USER_A, 'Alice');
    seedUserWithContact(db, USER_B, 'Bob');
  });

  it('pending B→A row prevents A from reactivating stale declined A→B row', async () => {
    // Old A→B declined, cooldown expired (31 days ago)
    const declinedId = 'old-declined-a-b';
    const thirtyOneDaysAgoSec = Math.floor((Date.now() - 31 * 24 * 60 * 60 * 1000) / 1000);
    db.prepare(
      'INSERT INTO connection_requests (id, from_user_id, to_user_id, status, created_at, responded_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(declinedId, USER_A, USER_B, 'declined', thirtyOneDaysAgoSec, thirtyOneDaysAgoSec).run();

    // Newer B→A pending (inserted after, so larger created_at)
    const pendingId = 'newer-pending-b-a';
    const nowSec = Math.floor(Date.now() / 1000);
    db.prepare(
      'INSERT INTO connection_requests (id, from_user_id, to_user_id, status, created_at, responded_at) VALUES (?, ?, ?, ?, ?, null)'
    ).bind(pendingId, USER_B, USER_A, 'pending', nowSec).run();

    // A POSTs to B: must be blocked because B→A is pending, not reactivate the old declined row
    const { status } = await callApiAs(USER_A, postConnectionHandler, {
      method: 'POST',
      url: `${BASE}/api/connections`,
      body: { toUserId: USER_B },
    });

    expect(status).toBe(400);

    // The stale A→B row must NOT have been flipped to pending
    const { results } = await db.prepare('SELECT status FROM connection_requests WHERE id = ?').bind(declinedId).all();
    expect((results[0] as { status: string }).status).toBe('declined');
  });
});

// ─── FK hardening: sender auto-create + recipient existence check ─────────────

describe('POST /api/connections — FK hardening', () => {
  it('brand-new sender (no users row) has row auto-created, returns 400 for missing contact info — not 500', async () => {
    const BRAND_NEW = 'brand-new-conn-sender';
    seedUser(db, 'conn-fk-recipient');

    const { status } = await callApiAs(BRAND_NEW, postConnectionHandler, {
      method: 'POST',
      url: `${BASE}/api/connections`,
      body: { toUserId: 'conn-fk-recipient' },
    });

    // Clean business error (no contact info), not a FK-violation 500
    expect(status).toBe(400);

    // Sender row was auto-created by the handler
    const { results } = await db.prepare('SELECT id FROM users WHERE id = ?').bind(BRAND_NEW).all();
    expect(results).toHaveLength(1);
  });

  it('nonexistent recipient returns 404, not 500', async () => {
    seedUserWithContact(db, USER_A, 'Alice');

    const { status } = await callApiAs(USER_A, postConnectionHandler, {
      method: 'POST',
      url: `${BASE}/api/connections`,
      body: { toUserId: 'nonexistent-recipient-xyz' },
    });

    expect(status).toBe(404);
  });
});

// ─── BUG 2: GET /api/connections must populate fromUser / toUser ──────────────

describe('GET /api/connections — fromUser/toUser population', () => {
  beforeEach(() => {
    seedUserWithContact(db, USER_A, 'Alice');
    seedUserWithContact(db, USER_B, 'Bob');
  });

  it('fromUser.name is populated on the recipient\'s connection list', async () => {
    await callApiAs(USER_A, postConnectionHandler, {
      method: 'POST',
      url: `${BASE}/api/connections`,
      body: { toUserId: USER_B },
    });

    const { status, json } = await callApiAs(USER_B, getConnectionsHandler, {
      url: `${BASE}/api/connections`,
    });

    expect(status).toBe(200);
    type Conn = { fromUser?: { id?: string; name?: string } };
    const connections = (json as { connections: Conn[] }).connections;
    expect(connections).toHaveLength(1);
    expect(connections[0].fromUser?.name).toBe('Alice');
    expect(connections[0].fromUser?.id).toBe(USER_A);
  });

  it('toUser.name is populated on the sender\'s connection list', async () => {
    await callApiAs(USER_A, postConnectionHandler, {
      method: 'POST',
      url: `${BASE}/api/connections`,
      body: { toUserId: USER_B },
    });

    const { json } = await callApiAs(USER_A, getConnectionsHandler, {
      url: `${BASE}/api/connections`,
    });

    type Conn = { toUser?: { id?: string; name?: string } };
    const connections = (json as { connections: Conn[] }).connections;
    expect(connections[0].toUser?.name).toBe('Bob');
    expect(connections[0].toUser?.id).toBe(USER_B);
  });

  it('fromUser does not expose email, contactValue, contactMethod, or contactVisibility', async () => {
    await callApiAs(USER_A, postConnectionHandler, {
      method: 'POST',
      url: `${BASE}/api/connections`,
      body: { toUserId: USER_B },
    });

    const { json } = await callApiAs(USER_B, getConnectionsHandler, {
      url: `${BASE}/api/connections`,
    });

    type Conn = { fromUser?: Record<string, unknown> };
    const connections = (json as { connections: Conn[] }).connections;
    const fromUser = connections[0].fromUser ?? {};
    expect('email' in fromUser).toBe(false);
    expect('contactValue' in fromUser).toBe(false);
    expect('contactMethod' in fromUser).toBe(false);
    expect('contactVisibility' in fromUser).toBe(false);
  });
});
