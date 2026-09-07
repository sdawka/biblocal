// Keep the real application configuration; isolate only local QA persistence.
import base from '../../astro.config.mjs';
import cloudflare from '@astrojs/cloudflare';

export default {
  ...base,
  adapter: cloudflare({ persistState: { path: '/tmp/biblocal-audit-state' } }),
};
