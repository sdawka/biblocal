// Mock for the astro:middleware virtual module used in vitest.
// defineMiddleware is just a typed identity wrapper at runtime.
export function defineMiddleware<T>(fn: T): T {
  return fn;
}
