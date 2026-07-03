/**
 * Creates an in-memory SQLite database with all drizzle migrations applied.
 * Returns a D1Shim that Drizzle's d1 adapter can use directly.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import Database from 'better-sqlite3';
import { D1Shim } from './d1-shim';

// process.cwd() is the project root when running vitest
const MIGRATIONS_DIR = resolve(process.cwd(), 'drizzle');

export function createTestDb(): D1Shim {
  const sqlite = new Database(':memory:');
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d+.*\.sql$/.test(f) && !f.startsWith('seed'))
    .sort();

  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8');
    const statements = sql.split('--> statement-breakpoint');
    for (const stmt of statements) {
      const trimmed = stmt.trim();
      if (trimmed) {
        sqlite.exec(trimmed);
      }
    }
  }

  return new D1Shim(sqlite);
}

/** Insert a minimal users row so FK constraints on books are satisfied. */
export function seedUser(db: D1Shim, id: string, email = `${id}@test.local`): void {
  const now = Date.now();
  db.prepare(
    'INSERT INTO users (id, email, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
  )
    .bind(id, email, id, now, now)
    .run();
}
