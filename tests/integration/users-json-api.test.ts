import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GET as getUsersJsonHandler } from '../../src/pages/api/users.json';
import { callApi, callApiAs } from '../helpers/api';
import { createTestDb } from '../helpers/test-db';
import type { D1Shim } from '../helpers/d1-shim';
import { resetTestDb, setTestDb } from '../mocks/cloudflare-workers';

let db: D1Shim;

function insertUser(id: string, fields: Record<string, unknown> = {}): void {
  const now = Date.now();
  const row: Record<string, unknown> = {
    id,
    email: fields.email ?? `${id}@private.test`,
    name: fields.name !== undefined ? fields.name : id,
    city: fields.city ?? 'Montreal',
    radius_km: fields.radiusKm ?? 8,
    topics_curated: fields.topicsCurated ?? '[]',
    topics_freeform: fields.topicsFreeform ?? '[]',
    current_obsessions: fields.currentObsessions ?? null,
    latitude: fields.latitude ?? null,
    longitude: fields.longitude ?? null,
    location_precision: fields.locationPrecision ?? 'city',
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
    created_at: now,
    updated_at: now,
  };
  const columns = Object.keys(row);
  db.prepare(`INSERT INTO users (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`)
    .bind(...columns.map((column) => row[column]))
    .run();
}

function insertBook(id: string, userId: string, fields: Record<string, unknown> = {}): void {
  const now = fields.createdAt ?? Date.now();
  db.prepare(
    `INSERT INTO books (id, user_id, title, author, isbn, cover_url, status, visibility, ownership, intents, subjects, added_via, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'visible', ?, ?, ?, ?, 'manual', ?, ?, ?)`
  )
    .bind(
      id, userId, fields.title ?? id, fields.author ?? 'Author', fields.isbn ?? null, fields.coverUrl ?? null,
      fields.visibility ?? 'visible', fields.ownership ?? 'have', fields.intents ?? '[]', fields.subjects ?? null,
      fields.notes ?? null, now, now,
    )
    .run();
}

async function fetchUsers() {
  const result = await callApi(getUsersJsonHandler, { url: 'http://localhost/api/users.json' });
  expect(result.status).toBe(200);
  expect(Array.isArray(result.json)).toBe(true);
  return result.json as Record<string, unknown>[];
}

beforeEach(() => {
  db = createTestDb();
  setTestDb(db);
});

afterEach(() => resetTestDb());

describe('GET /api/users.json', () => {
  it('returns complete named live D1 profiles and their visible books', async () => {
    insertUser('reader', { name: 'Live Reader', topicsCurated: '["Fiction"]' });
    insertUser('unnamed', { name: null });
    insertBook('visible-book', 'reader', { title: 'Live Book', intents: '["borrowable"]' });

    const users = await fetchUsers();

    expect(users.map((user) => user.id)).toEqual(['reader']);
    expect(users[0].name).toBe('Live Reader');
    expect(users[0].topics).toEqual({ curated: ['Fiction'], freeform: [], inferred: [] });
    expect((users[0].shelf as Record<string, unknown>[]).map((book) => book.title)).toEqual(['Live Book']);
  });

  it('excludes whitespace-only names', async () => {
    insertUser('blank', { name: '   ' });

    expect(await fetchUsers()).toEqual([]);
  });

  it('excludes the authenticated viewer at the query boundary', async () => {
    insertUser('viewer');
    insertUser('other');

    const { status, json } = await callApiAs('viewer', getUsersJsonHandler, {
      url: 'http://localhost/api/users.json',
    });

    expect(status).toBe(200);
    expect((json as Record<string, unknown>[]).map((user) => user.id)).toEqual(['other']);
  });

  it('keeps anonymous discovery privacy-safe while including candidates', async () => {
    insertUser('reader', {
      contactVisibility: 'public', contactMethod: 'email', contactValue: 'reader@example.test',
      latitude: 45.523456, longitude: -73.581234, locationPrecision: 'exact',
    });

    const users = await fetchUsers();

    expect(users.map((user) => user.id)).toEqual(['reader']);
    expect(users[0].contactValue).toBe('reader@example.test');
    expect(users[0].latitude).toBe(45.5017);
    expect(users[0].longitude).toBe(-73.5673);
    expect(users[0].locationPrecision).toBe('city');
  });

  it('keeps recognized-city people without stored coordinates unlocated', async () => {
    insertUser('reader', { city: 'Montreal' });

    const users = await fetchUsers();

    expect(users[0].latitude).toBeUndefined();
    expect(users[0].longitude).toBeUndefined();
    expect(users[0].locationPrecision).toBeUndefined();
  });

  it('projects only map-safe fields and public contact details', async () => {
    insertUser('reader', {
      email: 'raw@example.test', phone: '555-private', addedBy: 'import-batch',
      contactVisibility: 'on-request', contactMethod: 'email', contactValue: 'private@example.test',
    });
    insertUser('public-reader', {
      contactVisibility: 'public', contactMethod: 'social', contactValue: '@public-reader',
    });

    const users = await fetchUsers();
    const reader = users.find((user) => user.id === 'reader')!;
    const publicReader = users.find((user) => user.id === 'public-reader')!;

    expect(reader.email).toBeUndefined();
    expect(reader.phone).toBeUndefined();
    expect(reader.addedBy).toBeUndefined();
    expect(reader.contactMethod).toBeUndefined();
    expect(reader.contactValue).toBeUndefined();
    expect(publicReader.contactMethod).toBe('social');
    expect(publicReader.contactValue).toBe('@public-reader');
  });

  it('filters private books in D1 and strips book notes', async () => {
    insertUser('reader');
    insertBook('visible-book', 'reader', { title: 'Visible Book', notes: '[{"text":"private note"}]' });
    insertBook('private-book', 'reader', { title: 'Private Book', visibility: 'private' });

    const users = await fetchUsers();
    const shelf = users[0].shelf as Record<string, unknown>[];

    expect(shelf.map((book) => book.title)).toEqual(['Visible Book']);
    expect(shelf[0].notes).toBeUndefined();
  });

  it('reads only safe book columns for eligible discovery profiles', async () => {
    insertUser('viewer');
    insertUser('eligible');
    insertUser('nameless', { name: null });
    insertBook('eligible-book', 'eligible', { title: 'Eligible Book' });
    insertBook('viewer-book', 'viewer', { title: 'Viewer Legacy Book', notes: '[{"text":"legacy"}]' });
    insertBook('nameless-book', 'nameless', { title: 'Nameless Legacy Book', notes: '[{"text":"legacy"}]' });
    setTestDb({
      prepare(sql: string) {
        if (sql.includes('from "books"') && sql.includes('"notes"')) {
          throw new Error('discovery query selected legacy notes');
        }
        return db.prepare(sql);
      },
      batch: db.batch.bind(db),
      exec: db.exec.bind(db),
    });

    const { status, json } = await callApiAs('viewer', getUsersJsonHandler, {
      url: 'http://localhost/api/users.json',
    });

    expect(status).toBe(200);
    const users = json as Record<string, unknown>[];
    expect(users.map((user) => user.id)).toEqual(['eligible']);
    expect((users[0].shelf as Record<string, unknown>[]).map((book) => book.title)).toEqual(['Eligible Book']);
  });

  it('loads more than 100 candidates without a per-candidate D1 parameter list', async () => {
    for (let index = 0; index < 101; index++) {
      insertUser(`reader-${index}`);
    }
    setTestDb({
      prepare(sql: string) {
        const statement = db.prepare(sql);
        return {
          bind(...params: unknown[]) {
            if (params.length > 100) throw new Error('D1 parameter limit exceeded');
            return statement.bind(...params);
          },
        };
      },
      batch: db.batch.bind(db),
      exec: db.exec.bind(db),
    });

    const users = await fetchUsers();

    expect(users).toHaveLength(101);
  });

  it('orders and bounds eligible profiles and their SQL-restricted visible books', async () => {
    insertUser('beta', { name: 'Beta' });
    insertUser('alpha', { name: 'Alpha' });
    insertBook('beta-z', 'beta', { title: 'Z' });
    insertBook('beta-a', 'beta', { title: 'A' });
    const statements: string[] = [];
    const boundParameters: unknown[][] = [];
    setTestDb({
      prepare(sql: string) {
        statements.push(sql);
        const statement = db.prepare(sql);
        return {
          bind(...params: unknown[]) {
            boundParameters.push(params);
            return statement.bind(...params);
          },
        };
      },
      batch: db.batch.bind(db),
      exec: db.exec.bind(db),
    });

    const users = await fetchUsers();

    expect(users.map((user) => user.id)).toEqual(['alpha', 'beta']);
    expect(((users[1].shelf as Record<string, unknown>[]).map((book) => book.id))).toEqual(['beta-z', 'beta-a']);
    const booksQuery = statements.find((sql) => sql.includes('from "books"'))!;
    expect(booksQuery).toContain('inner join (select "id" from "users"');
    expect(booksQuery).toContain('row_number() over (partition by "books"."user_id" order by "books"."created_at" desc, "books"."id" desc)');
    expect(boundParameters.every((parameters) => parameters.length <= 3)).toBe(true);
    expect(boundParameters.flat()).toEqual(expect.arrayContaining([500, 100]));
  });

  it('reads bounded candidates and ranked books through one D1 batch snapshot', async () => {
    insertUser('reader');
    insertBook('reader-book', 'reader');
    let batchCalls = 0;
    setTestDb({
      prepare: db.prepare.bind(db),
      batch(statements) {
        batchCalls++;
        return db.batch(statements);
      },
      exec: db.exec.bind(db),
    });

    const users = await fetchUsers();

    expect(users.map((user) => user.id)).toEqual(['reader']);
    expect(batchCalls).toBe(1);
  });

  it('keeps later owners books when an earlier owner exceeds the per-owner cap', async () => {
    insertUser('early', { name: 'Alpha' });
    insertUser('later', { name: 'Zulu' });
    for (let index = 0; index < 5001; index++) {
      insertBook(`early-${String(index).padStart(4, '0')}`, 'early', { createdAt: index });
    }
    insertBook('later-book', 'later', { createdAt: 6000 });

    const users = await fetchUsers();
    const earlyShelf = users.find((user) => user.id === 'early')!.shelf as Record<string, unknown>[];
    const laterShelf = users.find((user) => user.id === 'later')!.shelf as Record<string, unknown>[];

    expect(earlyShelf).toHaveLength(100);
    expect(earlyShelf[0].id).toBe('early-5000');
    expect(earlyShelf.at(-1)?.id).toBe('early-4901');
    expect(laterShelf.map((book) => book.id)).toEqual(['later-book']);
  });

  it('applies discovery indexes through the migrated test database', async () => {
    const userIndexes = (await db.prepare("SELECT name FROM pragma_index_list('users')").bind().all()).results as { name: string }[];
    const bookIndexes = (await db.prepare("SELECT name FROM pragma_index_list('books')").bind().all()).results as { name: string }[];

    expect(userIndexes.map((index) => index.name)).toContain('users_discovery_named_name_id_idx');
    expect(bookIndexes.map((index) => index.name)).toContain('books_discovery_visible_owner_created_id_idx');

    const bookIndex = (await db.prepare(
      "SELECT sql FROM sqlite_master WHERE type = 'index' AND name = ?"
    ).bind('books_discovery_visible_owner_created_id_idx').all()).results[0] as { sql: string };
    expect(bookIndex.sql.replace(/\s+/g, ' ').trim()).toBe(
      "CREATE INDEX books_discovery_visible_owner_created_id_idx ON books (user_id, created_at DESC, id DESC) WHERE visibility = 'visible'"
    );
  });

  it('uses the owner-led visible-books index for the shipped ranked-book query', async () => {
    insertUser('reader');
    insertBook('reader-book', 'reader');
    const statements: Array<{ sql: string; params: unknown[] }> = [];
    setTestDb({
      prepare(sql: string) {
        const statement = db.prepare(sql);
        return {
          bind(...params: unknown[]) {
            statements.push({ sql, params });
            return statement.bind(...params);
          },
        };
      },
      batch: db.batch.bind(db),
      exec: db.exec.bind(db),
    });

    await fetchUsers();

    const rankedBooksQuery = statements.find(({ sql }) => sql.includes('row_number() over'))!;
    const plan = (await db.prepare(`EXPLAIN QUERY PLAN ${rankedBooksQuery.sql}`)
      .bind(...rankedBooksQuery.params).all()).results as { detail: string }[];
    expect(plan.map(({ detail }) => detail).join('\n')).toContain(
      'USING INDEX books_discovery_visible_owner_created_id_idx'
    );
  });

  it('returns an empty list when no complete named profiles exist', async () => {
    insertUser('unnamed', { name: null });

    expect(await fetchUsers()).toEqual([]);
  });

  it('returns a generic error when D1 fails', async () => {
    setTestDb({ prepare: () => { throw new Error('database connection detail'); } });

    const { status, json } = await callApi(getUsersJsonHandler, {
      url: 'http://localhost/api/users.json',
    });

    expect(status).toBe(500);
    expect(json).toEqual({ error: 'Server error' });
  });
});
