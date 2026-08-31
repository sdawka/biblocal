import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';

export default defineConfig({
  plugins: [svelte({ hot: false }), svelteTesting()],
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
      'astro:middleware': fileURLToPath(
        new URL('./tests/mocks/astro-middleware.ts', import.meta.url),
      ),
    },
    conditions: ['node'],
  },
  ssr: {
    resolve: {
      conditions: ['node'],
    },
  },
});
