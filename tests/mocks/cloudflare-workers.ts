// Mock for cloudflare:workers module used in vitest
export const env: { DB: unknown; IMAGES?: unknown } = {
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

/** Install a test IMAGES binding (hosted-images namespace mock). */
export function setTestImages(images: unknown): void {
  env.IMAGES = images;
}

/** Remove the IMAGES binding (call in afterEach). */
export function resetTestImages(): void {
  delete env.IMAGES;
}
