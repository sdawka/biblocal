// Mock for cloudflare:workers module used in vitest
export const env: { DB: unknown; IMAGES?: unknown; COVERS?: unknown } = {
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

/** Install a test IMAGES binding (transform mock). */
export function setTestImages(images: unknown): void {
  env.IMAGES = images;
}

/** Remove the IMAGES binding (call in afterEach). */
export function resetTestImages(): void {
  delete env.IMAGES;
}

/** Install a test COVERS R2 bucket. */
export function setTestCovers(covers: unknown): void {
  env.COVERS = covers;
}

/** Remove the COVERS binding (call in afterEach). */
export function resetTestCovers(): void {
  delete env.COVERS;
}
