import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    globals: true,
    setupFiles: ['tests/setup.ts'],
  },
  resolve: {
    alias: {
      'cloudflare:workers': fileURLToPath(
        new URL('./tests/mocks/cloudflare-workers.ts', import.meta.url),
      ),
    },
  },
});
