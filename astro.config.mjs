// @ts-check
import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import cloudflare from '@astrojs/cloudflare';
import clerk from '@clerk/astro';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// Auth-gated app routes have no SEO value and are Disallow-ed in robots.txt;
// keep them out of the sitemap so it only advertises public, indexable pages.
const PRIVATE_PREFIXES = ['/biblio', '/local', '/profile', '/stores', '/store'];

// https://astro.build/config
export default defineConfig({
  site: 'https://biblocal.com',
  redirects: {
    '/shelf': '/biblio',
    '/matches': '/local',
    '/fr/shelf': '/fr/biblio',
    '/fr/matches': '/fr/local',
  },
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'fr'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    svelte(),
    clerk(),
    mdx(),
    sitemap({
      filter: (page) => {
        const { pathname } = new URL(page);
        return !PRIVATE_PREFIXES.some(
          (p) => pathname === p || pathname === `${p}/` || pathname.startsWith(`${p}/`),
        );
      },
    }),
  ],
  adapter: cloudflare(),
  output: 'server',
});
