// Keep the real application configuration; isolate only local QA persistence.
import base from '../../astro.config.mjs';
import cloudflare from '@astrojs/cloudflare';

export default {
  ...base,
  vite: { ...base.vite, cacheDir: '/tmp/biblocal-audit-vite' },
  adapter: cloudflare({ persistState: { path: '/tmp/biblocal-audit-state' } }),
};
