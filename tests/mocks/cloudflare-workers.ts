// Mock for cloudflare:workers module used in vitest
export const env: { DB: unknown } = {
  DB: {},
};

/** Replace env.DB with a test D1Shim for integration tests. */
export function setTestDb(db: unknown): void {
  env.DB = db;
}

/** Restore env.DB to the default empty stub (call in afterEach). */
export function resetTestDb(): void {
  env.DB = {};
}
