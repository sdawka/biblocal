# SEO + Editorial Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a file-based MDX editorial/blog section plus SEO infrastructure (per-page meta, canonical, Open Graph, JSON-LD, sitemap, robots) and ship 4 search-targeted articles.

**Architecture:** Articles are Astro Content Collections (MDX) rendered to static HTML at build time. All head-SEO logic lives in a pure `src/lib/seo.ts` module consumed by a thin `Seo.astro` component, which `LandingLayout.astro` renders. Blog routes are added to the middleware public allowlist so crawlers can reach them.

**Tech Stack:** Astro 6 (SSR/Cloudflare), `@astrojs/mdx`, `@astrojs/sitemap`, zod, Vitest.

## Global Constraints

- Canonical site origin: `https://biblocal.com` (no trailing slash). Used for `site` config, canonical URLs, sitemap, JSON-LD, OG `url`.
- `src/lib/` files are pure utilities — no framework imports (no `astro:*`, no Svelte).
- Meta description length: 50–160 characters.
- TypeScript strict mode (`astro/tsconfigs/strict`). No `any` without cause.
- Existing public marketing pages (`index`, `about`, `how-it-works`) must keep rendering unchanged — `LandingLayout` changes are backward compatible (title-only callers still work).
- Verification commands that must stay green: `npm run test:run`, `npx astro check`, `npm run build`.
- Commit after every task. Conventional-commit messages, concise, no attribution/ads.

## File Structure

- Create `src/lib/seo.ts` — pure SEO builders (canonical, OG, Twitter, JSON-LD objects). Unit-tested.
- Create `src/lib/blog-schema.ts` — exported zod schema + `BlogFrontmatter` type. Unit-tested; imported by content config.
- Create `src/content.config.ts` — Astro content collection wiring (glob loader → blog-schema).
- Create `src/components/Seo.astro` — thin renderer over `seo.ts`. Validated by build/check.
- Modify `src/layouts/LandingLayout.astro` — accept optional `seo` prop, render `<Seo>`.
- Modify `src/middleware.ts` — add `/blog`, `/blog/(.*)` to public routes.
- Modify `astro.config.mjs` — add `site`, `mdx()`, `sitemap()`.
- Create `src/pages/blog/index.astro` — article index.
- Create `src/pages/blog/[...slug].astro` — article page.
- Create `public/robots.txt` — crawl rules + sitemap reference.
- Create `public/og/default.png` — branded default OG image.
- Modify `src/components/Footer.astro` — add Articles link.
- Create `src/content/blog/*.mdx` — 4 articles.
- Create `tests/lib/seo.test.ts`, `tests/lib/blog-schema.test.ts`.

---

### Task 1: Pure SEO helpers (`src/lib/seo.ts`)

**Files:**
- Create: `src/lib/seo.ts`
- Test: `tests/lib/seo.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `const SITE_ORIGIN = 'https://biblocal.com'`
  - `const SITE_NAME = 'biblocal'`
  - `const DEFAULT_OG_IMAGE = '/og/default.png'`
  - `type SeoInput = { title: string; description: string; path: string; ogImage?: string; type?: 'website' | 'article'; }`
  - `type ResolvedSeo = { title: string; description: string; canonical: string; ogImage: string; type: 'website' | 'article'; }`
  - `function resolveSeo(input: SeoInput): ResolvedSeo`
  - `function organizationJsonLd(): object`
  - `function websiteJsonLd(): object`
  - `function articleJsonLd(a: { title: string; description: string; path: string; ogImage?: string; pubDate: Date; updatedDate?: Date; }): object`
  - `function breadcrumbJsonLd(items: Array<{ name: string; path: string }>): object`
  - `function absoluteUrl(path: string): string`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/lib/seo.test.ts
import { describe, it, expect } from 'vitest';
import {
  SITE_ORIGIN,
  DEFAULT_OG_IMAGE,
  absoluteUrl,
  resolveSeo,
  organizationJsonLd,
  articleJsonLd,
  breadcrumbJsonLd,
} from '../../src/lib/seo';

describe('absoluteUrl', () => {
  it('joins a root-relative path to the origin without double slashes', () => {
    expect(absoluteUrl('/blog')).toBe('https://biblocal.com/blog');
    expect(absoluteUrl('blog')).toBe('https://biblocal.com/blog');
  });
  it('passes through absolute http(s) urls unchanged', () => {
    expect(absoluteUrl('https://cdn.example.com/x.png')).toBe('https://cdn.example.com/x.png');
  });
});

describe('resolveSeo', () => {
  it('builds a canonical url and defaults og image + type', () => {
    const r = resolveSeo({ title: 'T', description: 'D', path: '/blog/x' });
    expect(r.canonical).toBe('https://biblocal.com/blog/x');
    expect(r.ogImage).toBe(`https://biblocal.com${DEFAULT_OG_IMAGE}`);
    expect(r.type).toBe('website');
  });
  it('honors an explicit ogImage and type', () => {
    const r = resolveSeo({ title: 'T', description: 'D', path: '/blog/x', ogImage: '/og/x.png', type: 'article' });
    expect(r.ogImage).toBe('https://biblocal.com/og/x.png');
    expect(r.type).toBe('article');
  });
});

describe('json-ld builders', () => {
  it('organization has required schema.org fields', () => {
    const o = organizationJsonLd() as any;
    expect(o['@context']).toBe('https://schema.org');
    expect(o['@type']).toBe('Organization');
    expect(o.url).toBe(SITE_ORIGIN);
  });
  it('article carries dates as ISO strings and an absolute url', () => {
    const a = articleJsonLd({
      title: 'T', description: 'D', path: '/blog/x',
      pubDate: new Date('2026-01-02T00:00:00Z'),
    }) as any;
    expect(a['@type']).toBe('Article');
    expect(a.headline).toBe('T');
    expect(a.url).toBe('https://biblocal.com/blog/x');
    expect(a.datePublished).toBe('2026-01-02T00:00:00.000Z');
  });
  it('breadcrumb lists positions starting at 1 with absolute urls', () => {
    const b = breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Articles', path: '/blog' }]) as any;
    expect(b['@type']).toBe('BreadcrumbList');
    expect(b.itemListElement[0].position).toBe(1);
    expect(b.itemListElement[1].item).toBe('https://biblocal.com/blog');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:run -- tests/lib/seo.test.ts`
Expected: FAIL — cannot find module `../../src/lib/seo`.

- [ ] **Step 3: Implement `src/lib/seo.ts`**

```ts
// src/lib/seo.ts — pure SEO helpers. No framework imports.

export const SITE_ORIGIN = 'https://biblocal.com';
export const SITE_NAME = 'biblocal';
export const DEFAULT_OG_IMAGE = '/og/default.png';

export type SeoInput = {
  title: string;
  description: string;
  path: string;
  ogImage?: string;
  type?: 'website' | 'article';
};

export type ResolvedSeo = {
  title: string;
  description: string;
  canonical: string;
  ogImage: string;
  type: 'website' | 'article';
};

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_ORIGIN}${clean}`;
}

export function resolveSeo(input: SeoInput): ResolvedSeo {
  return {
    title: input.title,
    description: input.description,
    canonical: absoluteUrl(input.path),
    ogImage: absoluteUrl(input.ogImage ?? DEFAULT_OG_IMAGE),
    type: input.type ?? 'website',
  };
}

export function organizationJsonLd(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_ORIGIN,
    logo: absoluteUrl('/favicon.svg'),
  };
}

export function websiteJsonLd(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_ORIGIN,
  };
}

export function articleJsonLd(a: {
  title: string;
  description: string;
  path: string;
  ogImage?: string;
  pubDate: Date;
  updatedDate?: Date;
}): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.title,
    description: a.description,
    url: absoluteUrl(a.path),
    image: absoluteUrl(a.ogImage ?? DEFAULT_OG_IMAGE),
    datePublished: a.pubDate.toISOString(),
    dateModified: (a.updatedDate ?? a.pubDate).toISOString(),
    publisher: organizationJsonLd(),
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- tests/lib/seo.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/seo.ts tests/lib/seo.test.ts
git commit -m "feat(seo): pure canonical/OG/JSON-LD helpers"
```

---

### Task 2: Blog frontmatter schema + content config + integrations

**Files:**
- Create: `src/lib/blog-schema.ts`
- Create: `src/content.config.ts`
- Modify: `astro.config.mjs`
- Test: `tests/lib/blog-schema.test.ts`

**Interfaces:**
- Consumes: nothing (zod is already transitively available via Astro; if `import { z } from 'zod'` fails to resolve, add `zod` to dependencies — see Step 3a).
- Produces:
  - `const blogFrontmatterSchema` (a `z.ZodObject`)
  - `type BlogFrontmatter = z.infer<typeof blogFrontmatterSchema>`
  - `const BLOG_CATEGORIES = ['comparison', 'guide', 'essay'] as const`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/lib/blog-schema.test.ts
import { describe, it, expect } from 'vitest';
import { blogFrontmatterSchema } from '../../src/lib/blog-schema';

const valid = {
  title: 'biblocal vs Goodreads',
  description: 'An honest comparison of biblocal and Goodreads for readers who want to lend and discuss books locally.',
  pubDate: new Date('2026-06-22'),
  category: 'comparison',
};

describe('blogFrontmatterSchema', () => {
  it('accepts a valid article', () => {
    expect(blogFrontmatterSchema.safeParse(valid).success).toBe(true);
  });
  it('defaults draft to false', () => {
    const parsed = blogFrontmatterSchema.parse(valid);
    expect(parsed.draft).toBe(false);
  });
  it('rejects a missing title', () => {
    const { title, ...rest } = valid;
    expect(blogFrontmatterSchema.safeParse(rest).success).toBe(false);
  });
  it('rejects a description shorter than 50 chars', () => {
    expect(blogFrontmatterSchema.safeParse({ ...valid, description: 'too short' }).success).toBe(false);
  });
  it('rejects a description longer than 160 chars', () => {
    expect(blogFrontmatterSchema.safeParse({ ...valid, description: 'x'.repeat(161) }).success).toBe(false);
  });
  it('rejects an unknown category', () => {
    expect(blogFrontmatterSchema.safeParse({ ...valid, category: 'news' }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:run -- tests/lib/blog-schema.test.ts`
Expected: FAIL — cannot find module `../../src/lib/blog-schema`.

- [ ] **Step 3a: Ensure `zod` resolves**

Run: `node -e "require.resolve('zod')"`
- If it prints a path: do nothing.
- If it throws: `npm install zod` (zod is a stable dep; pin whatever npm resolves).

- [ ] **Step 3b: Implement `src/lib/blog-schema.ts`**

```ts
// src/lib/blog-schema.ts — pure. Shared by content.config.ts and tests.
import { z } from 'zod';

export const BLOG_CATEGORIES = ['comparison', 'guide', 'essay'] as const;

export const blogFrontmatterSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(50).max(160),
  pubDate: z.coerce.date(),
  updatedDate: z.coerce.date().optional(),
  category: z.enum(BLOG_CATEGORIES),
  keywords: z.array(z.string()).optional(),
  ogImage: z.string().optional(),
  draft: z.boolean().default(false),
});

export type BlogFrontmatter = z.infer<typeof blogFrontmatterSchema>;
```

- [ ] **Step 3c: Implement `src/content.config.ts`**

```ts
// src/content.config.ts — Astro content collection wiring.
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { blogFrontmatterSchema } from './lib/blog-schema';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: blogFrontmatterSchema,
});

export const collections = { blog };
```

- [ ] **Step 3d: Update `astro.config.mjs`**

Replace the file contents with:

```js
// @ts-check
import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import cloudflare from '@astrojs/cloudflare';
import clerk from '@clerk/astro';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://biblocal.com',
  integrations: [svelte(), clerk(), mdx(), sitemap()],
  adapter: cloudflare(),
  output: 'server',
});
```

- [ ] **Step 3e: Install the new integrations**

Run: `npx astro add mdx sitemap --yes`
(If `astro add` reports they are already configured, skip. If it rewrites `astro.config.mjs`, re-apply Step 3d's `site` line and ordering.)
Expected: `@astrojs/mdx` and `@astrojs/sitemap` present in `package.json` dependencies.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- tests/lib/blog-schema.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/blog-schema.ts src/content.config.ts astro.config.mjs package.json package-lock.json tests/lib/blog-schema.test.ts
git commit -m "feat(blog): content collection schema + mdx/sitemap integrations"
```

---

### Task 3: `Seo.astro` component + `LandingLayout` refactor

**Files:**
- Create: `src/components/Seo.astro`
- Modify: `src/layouts/LandingLayout.astro`

**Interfaces:**
- Consumes: `resolveSeo`, `organizationJsonLd`, `websiteJsonLd`, `articleJsonLd`, `breadcrumbJsonLd`, `SITE_NAME` from `src/lib/seo.ts`.
- Produces:
  - `Seo.astro` Props: `{ title: string; description: string; path: string; ogImage?: string; type?: 'website' | 'article'; jsonLd?: object[]; }`
  - `LandingLayout.astro` Props (new, optional): `seo?: { description?: string; ogImage?: string; type?: 'website' | 'article'; jsonLd?: object[]; }`. Existing `title: string` prop unchanged. When `seo` omitted, falls back to a sensible default description (current hardcoded copy) so existing pages are unaffected.

- [ ] **Step 1: Create `src/components/Seo.astro`**

```astro
---
import {
  resolveSeo,
  organizationJsonLd,
  websiteJsonLd,
  SITE_NAME,
} from '../lib/seo';

interface Props {
  title: string;
  description: string;
  path: string;
  ogImage?: string;
  type?: 'website' | 'article';
  jsonLd?: object[];
}

const { title, description, path, ogImage, type, jsonLd = [] } = Astro.props;
const seo = resolveSeo({ title, description, path, ogImage, type });

// Site-wide structured data always present; page-specific appended.
const graphs = [organizationJsonLd(), websiteJsonLd(), ...jsonLd];
---

<title>{seo.title}</title>
<meta name="description" content={seo.description} />
<link rel="canonical" href={seo.canonical} />

<meta property="og:type" content={seo.type} />
<meta property="og:site_name" content={SITE_NAME} />
<meta property="og:title" content={seo.title} />
<meta property="og:description" content={seo.description} />
<meta property="og:url" content={seo.canonical} />
<meta property="og:image" content={seo.ogImage} />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content={seo.title} />
<meta name="twitter:description" content={seo.description} />
<meta name="twitter:image" content={seo.ogImage} />

{graphs.map((g) => (
  <script type="application/ld+json" set:html={JSON.stringify(g)} />
))}
```

- [ ] **Step 2: Refactor `src/layouts/LandingLayout.astro`**

Replace the frontmatter and `<head>` description/title region. New frontmatter:

```astro
---
import '../styles/theme.css';
import Seo from '../components/Seo.astro';

interface Props {
  title: string;
  seo?: {
    description?: string;
    ogImage?: string;
    type?: 'website' | 'article';
    jsonLd?: object[];
  };
}

const { title, seo } = Astro.props;
const description =
  seo?.description ??
  'Build your living bookshelf. Find people nearby with similar taste. Borrow, discuss, and discover locally.';
const path = Astro.url.pathname;
---
```

In `<head>`, remove the existing `<title>{title}</title>` and the hardcoded `<meta name="description" ...>` and replace with a single line (keep the `<link rel="icon">`, preconnect, font `<link>`, and the inline theme script exactly as they are):

```astro
    <Seo
      title={title}
      description={description}
      path={path}
      ogImage={seo?.ogImage}
      type={seo?.type}
      jsonLd={seo?.jsonLd}
    />
```

- [ ] **Step 3: Type-check**

Run: `npx astro check`
Expected: 0 errors (warnings about pre-existing files are acceptable; no new errors).

- [ ] **Step 4: Build to confirm marketing pages still render**

Run: `npm run build`
Expected: build succeeds; `dist/` contains `index.html`/about/how-it-works output with a single `<title>`, a canonical link, and `application/ld+json` blocks.

- [ ] **Step 5: Commit**

```bash
git add src/components/Seo.astro src/layouts/LandingLayout.astro
git commit -m "feat(seo): Seo component + backward-compatible LandingLayout SEO props"
```

---

### Task 4: Blog routes + middleware allowlist

**Files:**
- Create: `src/pages/blog/index.astro`
- Create: `src/pages/blog/[...slug].astro`
- Create: `src/content/blog/_placeholder.mdx` (temporary, deleted in Task 6 once real articles exist — collections need ≥1 entry for the build to exercise these pages)
- Modify: `src/middleware.ts`

**Interfaces:**
- Consumes: `getCollection`, `render` from `astro:content`; `articleJsonLd`, `breadcrumbJsonLd` from `src/lib/seo.ts`; `BlogFrontmatter` from `src/lib/blog-schema.ts`.
- Produces: routes `/blog` and `/blog/:slug`.

- [ ] **Step 1: Add blog to the public route matcher in `src/middleware.ts`**

Change the `createRouteMatcher` array to include the blog paths:

```ts
const isPublicRoute = createRouteMatcher([
  '/',
  '/about',
  '/how-it-works',
  '/blog',
  '/blog/(.*)',
  '/api/(.*)',
]);
```

- [ ] **Step 2: Create a temporary placeholder article so the collection is non-empty**

```mdx
---
title: "Placeholder"
description: "Temporary placeholder article so the blog collection is non-empty during build verification."
pubDate: 2026-06-22
category: "essay"
draft: true
---

Placeholder body. Removed once real articles land.
```

(Note: `draft: true` — Task 6 deletes this file.)

- [ ] **Step 3: Create `src/pages/blog/index.astro`**

```astro
---
// Prerender at build time: the app is output:'server' (SSR), but blog pages
// must be static HTML so crawlers get instant content AND @astrojs/sitemap
// (which only includes prerendered routes) lists them.
export const prerender = true;

import { getCollection } from 'astro:content';
import LandingLayout from '../../layouts/LandingLayout.astro';
import Footer from '../../components/Footer.astro';

const posts = (await getCollection('blog', ({ data }) => data.draft !== true))
  .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());

const CATEGORY_LABEL: Record<string, string> = {
  comparison: 'Comparisons',
  guide: 'Guides',
  essay: 'Essays',
};
---

<LandingLayout
  title="Articles — biblocal"
  seo={{ description: 'Guides, comparisons, and essays on local book-sharing, lending circles, and finding readers near you.' }}
>
  <main>
    <section class="hero-mini">
      <a href="/" class="back-link">← Back to home</a>
      <span class="eyebrow">The biblocal Journal</span>
      <h1 class="serif">Articles</h1>
      <p class="subtitle muted">On local book-sharing, taste, and the readers around you.</p>
    </section>

    <section class="list">
      {posts.length === 0 && <p class="muted empty">No articles yet — check back soon.</p>}
      <ul class="posts">
        {posts.map((post) => (
          <li class="post-row card">
            <a href={`/blog/${post.id}`} class="post-link">
              <span class="eyebrow">{CATEGORY_LABEL[post.data.category] ?? post.data.category}</span>
              <h2 class="serif">{post.data.title}</h2>
              <p class="muted">{post.data.description}</p>
              <time datetime={post.data.pubDate.toISOString()} class="post-date muted">
                {post.data.pubDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </time>
            </a>
          </li>
        ))}
      </ul>
    </section>

    <Footer />
  </main>
</LandingLayout>

<style>
  main { max-width: none; margin: 0; padding: 0; }
  .hero-mini { padding: var(--s-10) var(--s-6) var(--s-6); text-align: center; }
  .back-link { display: inline-block; font-family: var(--font-ui); font-size: 0.9rem; color: var(--accent); text-decoration: none; margin-bottom: var(--s-5); }
  .hero-mini .eyebrow { display: block; margin-bottom: var(--s-3); }
  .hero-mini h1 { font-size: clamp(2rem, 5vw, 3rem); font-weight: 500; margin: 0 auto var(--s-4); }
  .subtitle { font-family: var(--font-ui); font-size: 1.15rem; margin: 0; }
  .list { max-width: 760px; margin: 0 auto; padding: var(--s-6); }
  .empty { text-align: center; padding: var(--s-8) 0; }
  .posts { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--s-5); }
  .post-row { padding: 0; overflow: hidden; }
  .post-link { display: block; padding: var(--s-6); text-decoration: none; color: inherit; transition: transform var(--dur-1) var(--ease-soft), box-shadow var(--dur-1) var(--ease-soft); }
  .post-row:hover { transform: translateY(-3px); box-shadow: var(--shadow-2); border-color: var(--hairline-strong); }
  .post-link h2 { font-size: 1.4rem; font-weight: 500; margin: var(--s-2) 0 var(--s-2); }
  .post-link p { font-family: var(--font-ui); margin: 0 0 var(--s-3); line-height: 1.6; }
  .post-date { font-family: var(--font-ui); font-size: 0.85rem; }
  @media (max-width: 600px) { .list { padding: var(--s-4); } }
</style>
```

- [ ] **Step 4: Create `src/pages/blog/[...slug].astro`**

```astro
---
// Prerendered (see /blog index for rationale). getStaticPaths requires this
// in server output to emit one static page per article at build time.
export const prerender = true;

import { getCollection, render } from 'astro:content';
import LandingLayout from '../../layouts/LandingLayout.astro';
import Footer from '../../components/Footer.astro';
import { articleJsonLd, breadcrumbJsonLd } from '../../lib/seo';

export async function getStaticPaths() {
  const posts = await getCollection('blog', ({ data }) => data.draft !== true);
  return posts.map((post) => ({ params: { slug: post.id }, props: { post } }));
}

const { post } = Astro.props;
const { Content } = await render(post);
const path = `/blog/${post.id}`;

const jsonLd = [
  articleJsonLd({
    title: post.data.title,
    description: post.data.description,
    path,
    ogImage: post.data.ogImage,
    pubDate: post.data.pubDate,
    updatedDate: post.data.updatedDate,
  }),
  breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Articles', path: '/blog' },
    { name: post.data.title, path },
  ]),
];
---

<LandingLayout
  title={`${post.data.title} — biblocal`}
  seo={{ description: post.data.description, ogImage: post.data.ogImage, type: 'article', jsonLd }}
>
  <main>
    <article class="article">
      <a href="/blog" class="back-link">← All articles</a>
      <header class="article-head">
        <h1 class="serif">{post.data.title}</h1>
        <time datetime={post.data.pubDate.toISOString()} class="muted">
          {post.data.pubDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </time>
      </header>
      <div class="prose">
        <Content />
      </div>
    </article>
    <Footer />
  </main>
</LandingLayout>

<style>
  main { max-width: none; margin: 0; padding: 0; }
  .article { max-width: 680px; margin: 0 auto; padding: var(--s-10) var(--s-6) var(--s-8); }
  .back-link { display: inline-block; font-family: var(--font-ui); font-size: 0.9rem; color: var(--accent); text-decoration: none; margin-bottom: var(--s-6); }
  .article-head { margin-bottom: var(--s-8); }
  .article-head h1 { font-size: clamp(2rem, 5vw, 2.8rem); font-weight: 500; line-height: 1.15; margin: 0 0 var(--s-3); }
  .prose :global(p) { font-family: var(--font-ui); font-size: 1.1rem; color: var(--ink-muted); line-height: 1.8; margin: 0 0 var(--s-5); }
  .prose :global(h2) { font-family: var(--font-display); font-size: 1.6rem; font-weight: 500; margin: var(--s-8) 0 var(--s-3); }
  .prose :global(h3) { font-family: var(--font-display); font-size: 1.25rem; font-weight: 500; margin: var(--s-6) 0 var(--s-2); }
  .prose :global(a) { color: var(--accent); text-decoration: underline; }
  .prose :global(ul), .prose :global(ol) { font-family: var(--font-ui); font-size: 1.05rem; color: var(--ink-muted); line-height: 1.8; padding-left: var(--s-6); margin: 0 0 var(--s-5); }
  .prose :global(table) { width: 100%; border-collapse: collapse; font-family: var(--font-ui); font-size: 0.95rem; margin: 0 0 var(--s-6); }
  .prose :global(th), .prose :global(td) { text-align: left; padding: var(--s-3); border-bottom: 1px solid var(--hairline); vertical-align: top; }
  .prose :global(th) { font-weight: 600; color: var(--ink); }
  .prose :global(blockquote) { border-left: 3px solid var(--accent); padding-left: var(--s-4); margin: 0 0 var(--s-5); font-family: var(--font-display); font-style: italic; color: var(--ink-faint); }
  @media (max-width: 600px) { .article { padding: var(--s-8) var(--s-4); } }
</style>
```

- [ ] **Step 5: Build to verify routes generate**

Run: `npm run build`
Expected: build succeeds. Because the only article is `draft: true`, `/blog` renders the empty state and no `/blog/:slug` pages are generated — this confirms the draft filter works and the routes compile.

- [ ] **Step 6: Confirm middleware still type-checks**

Run: `npx astro check`
Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add src/pages/blog src/middleware.ts src/content/blog/_placeholder.mdx
git commit -m "feat(blog): index + article routes, public-route allowlist"
```

---

### Task 5: robots.txt, default OG image, footer link

**Files:**
- Create: `public/robots.txt`
- Create: `public/og/default.png`
- Modify: `src/components/Footer.astro`

**Interfaces:**
- Consumes: nothing.
- Produces: static `/robots.txt`, `/og/default.png`; footer link to `/blog`.

- [ ] **Step 1: Create `public/robots.txt`**

```text
User-agent: *
Allow: /
Disallow: /api/
Disallow: /shelf
Disallow: /matches
Disallow: /profile

Sitemap: https://biblocal.com/sitemap-index.xml
```

- [ ] **Step 2: Create a branded default OG image at `public/og/default.png`**

Generate a 1200×630 PNG. Use the project palette and wordmark. Run this Node script (uses `sharp` if available; otherwise the writer/infra agent produces the PNG via the design tooling of choice — the only hard requirements are exact dimensions 1200×630 and a `.png` at `public/og/default.png`):

```bash
node -e "
const fs = require('fs');
try { require.resolve('sharp'); } catch { console.error('sharp not installed; create public/og/default.png (1200x630) by other means'); process.exit(1); }
const sharp = require('sharp');
const svg = Buffer.from(\`<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='630'>
  <rect width='1200' height='630' fill='#1a1714'/>
  <text x='80' y='300' font-family='Georgia, serif' font-size='96' fill='#f5f1ea'>biblocal</text>
  <text x='80' y='380' font-family='Helvetica, sans-serif' font-size='40' fill='#c9bfae'>A living bookshelf, shared locally.</text>
</svg>\`);
sharp(svg).png().toFile('public/og/default.png').then(() => console.log('wrote public/og/default.png'));
"
```

Then verify: `node -e "const s=require('fs').statSync('public/og/default.png'); console.log('bytes', s.size)"` — expect a non-zero size.
(If `sharp` is unavailable and cannot be added, the infra agent must still deliver a 1200×630 PNG at this path — do not skip; OG images were an approved requirement.)

- [ ] **Step 3: Add an Articles link to `src/components/Footer.astro`**

In the "Explore" column, add a `/blog` link after the existing ones:

```astro
      <div class="col">
        <h2 class="col-head">Explore</h2>
        <a href="/about">About</a>
        <a href="/how-it-works">How it works</a>
        <a href="/blog">Articles</a>
      </div>
```

- [ ] **Step 4: Build to confirm assets ship and footer renders**

Run: `npm run build`
Expected: build succeeds; `dist/robots.txt` and `dist/og/default.png` exist; `dist/sitemap-index.xml` exists.

- [ ] **Step 5: Commit**

```bash
git add public/robots.txt public/og/default.png src/components/Footer.astro
git commit -m "feat(seo): robots.txt, default OG image, footer articles link"
```

---

### Task 6: Keyword research + 4 articles

This task has a research sub-step, then parallel article authoring. Each article is an `.mdx` file validated against the schema by `npm run build`.

**Files:**
- Create: `src/content/blog/biblocal-vs-goodreads.mdx`
- Create: `src/content/blog/<second-comparison-slug>.mdx` (slug finalized by research; default `biblocal-vs-storygraph.mdx`)
- Create: `src/content/blog/start-a-neighborhood-book-lending-circle.mdx`
- Create: `src/content/blog/local-book-sharing-vs-algorithmic-feeds.mdx`
- Delete: `src/content/blog/_placeholder.mdx`

**Interfaces:**
- Consumes: `blogFrontmatterSchema` (enforced at build). Frontmatter fields exactly: `title`, `description` (50–160 chars), `pubDate` (`2026-06-22`), optional `updatedDate`, `category` (one of `comparison`/`guide`/`essay`), optional `keywords` (string[]), optional `ogImage`, `draft` (omit → false).
- Produces: 4 live articles + populated `/blog` index + sitemap entries.

- [ ] **Step 1: Keyword/SERP research**

Dispatch one research agent. Deliverable (return as structured notes, not committed): for each of the 4 article slots — primary target query, 2–4 secondary/long-tail queries, recommended `title` (≤60 chars, contains primary query naturally), recommended `description` (50–160 chars), recommended `keywords[]`, and 2–3 talking points that match search intent. The agent also confirms or replaces the second comparison target (StoryGraph vs. another high-intent "Goodreads alternative" competitor) based on search demand. Use WebSearch.

- [ ] **Step 2: Author the 4 articles (parallel writer agents)**

Each writer creates one `.mdx` file. Editorial constraints (apply to all):
- Honest, substantive, specific. No keyword-stuffing; the primary query appears naturally in title, first paragraph, and one `<h2>`.
- 700–1200 words. Use `##`/`###` headings.
- ≥1 internal link to another biblocal page (`/`, `/how-it-works`, `/blog`, or a sibling article) using root-relative `/path` links.
- Comparison articles include one Markdown feature table that is **fair to the competitor** (no straw-manning) and reference biblocal's real differentiators: local lending, taste-matching by facets, Goodreads import (`src/lib/goodreads-import.ts` is the real feature).
- Frontmatter must satisfy the schema. Description 50–160 chars.

Frontmatter template (fill from research):

```mdx
---
title: "..."
description: "..."            # 50–160 chars
pubDate: 2026-06-22
category: "comparison"        # or "guide" / "essay"
keywords: ["...", "..."]
---

First paragraph that states the topic and includes the primary query naturally...

## ...
```

Category assignment:
- `biblocal-vs-goodreads.mdx` → `comparison`
- second comparison → `comparison`
- `start-a-neighborhood-book-lending-circle.mdx` → `guide`
- `local-book-sharing-vs-algorithmic-feeds.mdx` → `essay`

- [ ] **Step 3: Delete the placeholder**

```bash
git rm src/content/blog/_placeholder.mdx
```

- [ ] **Step 4: Build to validate all articles against the schema**

Run: `npm run build`
Expected: build succeeds. `/blog` lists all 4 posts; 4 `/blog/:slug` pages generated; each appears in `dist/sitemap-0.xml`. A schema violation (e.g. description >160 chars) FAILS the build — fix the offending frontmatter and rebuild.

- [ ] **Step 5: Spot-check rendered output**

Run: `node -e "const fs=require('fs'); const f=fs.readdirSync('dist/blog'); console.log(f)"`
Expected: directory entries for each article slug. Open one `dist/blog/<slug>/index.html` and confirm one `<title>`, a canonical link, `og:type=article`, and an `Article` JSON-LD block are present.

- [ ] **Step 6: Commit**

```bash
git add src/content/blog
git commit -m "content(blog): launch articles — Goodreads/alternative comparisons, lending-circle guide, local-sharing essay"
```

---

### Task 7: Full verification + PR

**Files:** none (verification + integration).

- [ ] **Step 1: Run the full test suite**

Run: `npm run test:run`
Expected: all tests pass (existing + new `seo` and `blog-schema` suites).

- [ ] **Step 2: Type check**

Run: `npx astro check`
Expected: 0 errors.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: success; `dist/sitemap-index.xml`, `dist/robots.txt`, `dist/og/default.png`, and all 4 `dist/blog/<slug>/index.html` present.

- [ ] **Step 4: Push branch and open PR**

```bash
git push -u origin HEAD
gh pr create --title "feat: SEO + editorial section (blog, structured data, sitemap)" --body "$(cat <<'EOF'
## Summary
- File-based MDX blog at `/blog` (Astro Content Collections, build-time rendered)
- SEO infra: pure `src/lib/seo.ts` helpers, `Seo.astro`, canonical/OG/Twitter/JSON-LD, `@astrojs/sitemap`, `robots.txt`, default OG image
- `LandingLayout` refactored to accept SEO props (backward compatible)
- Blog routes added to middleware public allowlist
- 4 launch articles (Goodreads + alternative comparisons, lending-circle guide, local-sharing essay)

## Testing
- `npm run test:run` — green (incl. new seo + blog-schema suites)
- `npx astro check` — 0 errors
- `npm run build` — green; sitemap, robots, OG, and article pages emitted

Spec: `docs/superpowers/specs/2026-06-21-seo-editorial-section-design.md`
EOF
)"
```

Expected: PR created on a feature branch (not `main`).

---

## Self-Review

**Spec coverage:**
- File-based MDX collections → Task 2, 4, 6. ✓
- `Seo.astro` + JSON-LD (Organization/WebSite/Article/Breadcrumb) → Task 1 (logic), Task 3 (render), Task 4 (per-article). ✓
- `LandingLayout` backward-compatible refactor → Task 3. ✓
- Sitemap + `site` config → Task 2, verified Task 5/7. ✓
- robots.txt → Task 5. ✓
- Static default OG + per-article override → Task 1 (`resolveSeo` default), Task 5 (image), Task 6 (`ogImage` frontmatter). ✓
- Middleware public routes → Task 4. ✓
- Footer link / internal linking → Task 5 (footer), Task 6 (in-article links). ✓
- 4 articles + keyword research → Task 6. ✓
- Tests (schema contract, seo logic) + check + build → Tasks 1, 2, 7. ✓
- Agent-team execution → Task 6 research + parallel writers. ✓

**Placeholder scan:** No TBD/TODO. The only intentional placeholder file (`_placeholder.mdx`) is created in Task 4 and deleted in Task 6 with explicit rationale. Article *body* copy is produced by writer agents under explicit editorial constraints (creative output, not pre-writable), with build-time schema validation as the gate.

**Type consistency:** `resolveSeo`/`articleJsonLd`/`breadcrumbJsonLd` signatures in Task 1 match their consumption in Tasks 3–4. `blogFrontmatterSchema` field names (Task 2) match frontmatter usage in Tasks 4 and 6 and the `[...slug].astro` props. `post.id` used consistently as the slug (Astro 6 glob-loader entry id).
