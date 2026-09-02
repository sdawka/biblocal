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
const LOCALE_PREFIXES = ['', '/fr', '/es'];
const PRIVATE_ROUTE_PREFIXES = LOCALE_PREFIXES.flatMap((locale) =>
  PRIVATE_PREFIXES.map((path) => `${locale}${path}`),
);

// https://astro.build/config
export default defineConfig({
  site: 'https://biblocal.com',
  redirects: {
    '/shelf': '/biblio',
    '/matches': '/local',
    '/fr/shelf': '/fr/biblio',
    '/fr/matches': '/fr/local',
    '/es/shelf': '/es/biblio',
    '/es/matches': '/es/local',
  },
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'fr', 'es'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    svelte(),
    clerk({ afterSignOutUrl: '/signed-out' }),
    mdx(),
    sitemap({
      filter: (page) => {
        const { pathname } = new URL(page);
        return pathname !== '/signed-out/' && !PRIVATE_ROUTE_PREFIXES.some(
          (p) => pathname === p || pathname === `${p}/` || pathname.startsWith(`${p}/`),
        );
      },
    }),
  ],
  adapter: cloudflare(),
  output: 'server',
});
