import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GET as getUsersJsonHandler } from '../../src/pages/api/users.json';
import { calculateDiscovery } from '../../src/lib/matching';
import { pivotToBooks } from '../../src/lib/discoveryBooks';
import { hasLocation, isWithinBounds, splitDiscovery } from '../../src/lib/localHub';
import type { Book, UserProfile } from '../../src/lib/types';
import { callApiAs } from '../helpers/api';
import { createTestDb } from '../helpers/test-db';
import type { D1Shim } from '../helpers/d1-shim';
import { resetTestDb, setTestDb } from '../mocks/cloudflare-workers';

const VIEWER = 'viewer';
const MONTREAL_BOUNDS = { north: 45.6, south: 45.4, east: -73.5, west: -73.8 };

let db: D1Shim;

function insertUser(id: string, fields: Record<string, unknown> = {}): void {
  const now = Date.now();
  const row: Record<string, unknown> = {
    id,
    email: `${id}@private.test`,
    name: fields.name ?? id,
    city: fields.city ?? 'Montreal',
    radius_km: fields.radiusKm ?? 10,
    topics_curated: fields.topicsCurated ?? '[]',
    topics_freeform: fields.topicsFreeform ?? '[]',
    latitude: fields.latitude ?? null,
    longitude: fields.longitude ?? null,
    location_precision: fields.locationPrecision ?? 'city',
    phone: fields.phone ?? null,
    added_by: fields.addedBy ?? null,
    contact_method: fields.contactMethod ?? null,
    contact_value: fields.contactValue ?? null,
    contact_visibility: fields.contactVisibility ?? 'hidden',
    created_at: now,
    updated_at: now,
  };
  const columns = Object.keys(row);
  db.prepare(`INSERT INTO users (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`)
    .bind(...columns.map((column) => row[column]))
    .run();
}

function insertBook(id: string, userId: string, fields: Record<string, unknown>): void {
  const now = Date.now();
  db.prepare(
    `INSERT INTO books (id, user_id, title, author, isbn, status, visibility, ownership, intents, subjects, added_via, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'visible', ?, ?, ?, ?, 'manual', ?, ?)`
  )
    .bind(
      id,
      userId,
      fields.title,
      fields.author ?? 'Author',
      fields.isbn ?? null,
      fields.visibility ?? 'visible',
      fields.ownership ?? 'have',
      fields.intents ?? '[]',
      fields.subjects ?? null,
      now,
      now,
    )
    .run();
}

const viewerBooks: Book[] = [{
  id: 'viewer-seeking', title: 'Dune', author: 'Frank Herbert', isbn: '9780441172719',
  visibility: 'visible', ownership: 'seeking', intents: [], addedVia: 'manual', addedAt: 0,
}];

beforeEach(() => {
  db = createTestDb();
  setTestDb(db);
  insertUser(VIEWER, { name: 'Viewer', latitude: 45.5017, longitude: -73.5673 });
  insertUser('montreal-sharer', {
    name: 'Montreal Sharer', latitude: 45.52, longitude: -73.58,
    phone: '555-private', addedBy: 'internal-import', contactMethod: 'email',
    contactValue: 'montreal@example.test', contactVisibility: 'public',
  });
  insertUser('toronto-sharer', { name: 'Toronto Sharer', latitude: 43.6532, longitude: -79.3832 });
  insertUser('unlocated-sharer', { name: 'Unlocated Sharer' });
  insertBook('montreal-dune', 'montreal-sharer', {
    title: 'Dune', isbn: '9780441172719', intents: '["borrowable"]', subjects: '["science fiction"]',
  });
  insertBook('toronto-book', 'toronto-sharer', { title: 'Toronto Offer', intents: '["giftable"]' });
  insertBook('unlocated-book', 'unlocated-sharer', { title: 'Unlocated Offer', intents: '["discussable"]' });
  insertBook('private-book', 'montreal-sharer', { title: 'Private Diary', visibility: 'private', intents: '["borrowable"]' });
});

afterEach(() => resetTestDb());

describe('live locality discovery simulation', () => {
  it('projects live D1 discovery candidates through matching, books, and viewport locality', async () => {
    const { status, json } = await callApiAs(VIEWER, getUsersJsonHandler, {
      url: 'http://localhost/api/users.json',
    });
    expect(status).toBe(200);
    const users = json as UserProfile[];
    const discovery = calculateDiscovery(viewerBooks, [], users);
    const rows = pivotToBooks(discovery);

    expect(discovery.map((match) => match.user.id)).toContain('montreal-sharer');
    expect(rows.map((row) => row.book.title)).toContain('Dune');
    expect(users.map((user) => user.id)).not.toContain(VIEWER);

    const toronto = discovery.find((match) => match.user.id === 'toronto-sharer')!;
    expect(isWithinBounds(toronto.user.latitude!, toronto.user.longitude!, MONTREAL_BOUNDS)).toBe(false);
    const unlocated = discovery.find((match) => match.user.id === 'unlocated-sharer')!;
    expect(hasLocation(unlocated)).toBe(false);
    const { people } = splitDiscovery(discovery);
    const peopleUnlocated = people.filter((match) => !hasLocation(match));
    expect(peopleUnlocated.map((match) => match.user.id)).toEqual(['unlocated-sharer']);

    expect(JSON.stringify(users)).not.toContain('Private Diary');
    const montreal = users.find((user) => user.id === 'montreal-sharer') as Record<string, unknown>;
    expect(montreal.email).toBeUndefined();
    expect(montreal.phone).toBeUndefined();
    expect(montreal.addedBy).toBeUndefined();
    expect(montreal.contactValue).toBe('montreal@example.test');
  });
});
