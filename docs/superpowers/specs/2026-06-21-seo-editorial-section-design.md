# SEO + Editorial Section — Design

**Date:** 2026-06-21
**Status:** Approved (pending spec review)

## Goal

Give biblocal an organic-search growth channel: a file-based editorial/blog section plus
the SEO infrastructure to make it (and the existing marketing pages) discoverable. Ship 3–4
substantive articles — including "alternative to Goodreads"-style comparisons — that target
real search intent without keyword-stuffing.

## Constraints & context

- **Stack:** Astro 6 SSR on Cloudflare Workers, Svelte islands, D1, Clerk auth.
- **Middleware gate:** `src/middleware.ts` redirects every non-public route to `/`. Public
  routes today: `/`, `/about`, `/how-it-works`, `/api/(.*)`. **Any blog route must be added
  to the public matcher**, or crawlers receive a 302 to `/` and the content is invisible.
- **No content infrastructure exists yet:** no `@astrojs/mdx`, no content collections, no
  `sitemap.xml`, no `robots.txt`. `astro.config.mjs` has no `site` set.
- **`LandingLayout.astro`** is the public marketing layout. It hardcodes a single meta
  description and exposes only a `title` prop — this is the SEO seam to refactor.
- Existing product feature `src/lib/goodreads-import.ts` gives the Goodreads comparison real
  substance to reference.

## Architecture

### Content model — file-based MDX (Astro Content Collections)

Articles are authored as `.mdx` files, rendered to static HTML at build time. Zero Worker
runtime cost, version-controlled, new posts ship as PRs.

```
src/content/blog/*.mdx          # articles (frontmatter + body)
src/content.config.ts           # zod-validated frontmatter schema (content layer + glob loader)
src/pages/blog/index.astro      # article index  -> /blog
src/pages/blog/[...slug].astro  # article page    -> /blog/:slug
```

**Frontmatter schema (zod):**

| field        | type                                   | required | purpose                              |
|--------------|----------------------------------------|----------|--------------------------------------|
| `title`      | string                                 | yes      | `<title>`, H1, OG title              |
| `description`| string (50–160 chars)                  | yes      | meta description, OG description     |
| `pubDate`    | date                                   | yes      | published date, JSON-LD, sitemap     |
| `updatedDate`| date                                   | no       | last-modified                        |
| `category`   | enum: `comparison` \| `guide` \| `essay` | yes    | grouping / breadcrumb                |
| `keywords`   | string[]                               | no       | meta keywords / internal tracking    |
| `ogImage`    | string (path)                          | no       | overrides default OG image           |
| `draft`      | boolean (default false)                | no       | drafts excluded from build & sitemap |

Index page lists non-draft posts sorted by `pubDate` desc, grouped/labelled by category.

### SEO infrastructure

- **`src/components/Seo.astro`** — single source of truth for head SEO tags. Props:
  `{ title, description, canonical?, ogImage?, type?, article? }`. Emits:
  - `<title>`, `<meta name="description">`, `<link rel="canonical">`
  - Open Graph (`og:title/description/image/type/url`) + Twitter card (`summary_large_image`)
  - JSON-LD: `Organization` + `WebSite` site-wide; `Article` + `BreadcrumbList` per post.
- **`LandingLayout.astro`** refactored to accept an optional `seo` prop object and render
  `<Seo>`. Back-compatible: when only `title` is passed, behavior matches today (existing
  pages — `about`, `how-it-works`, `index` — keep working unchanged).
- **Sitemap:** add `@astrojs/sitemap`. Requires `site: 'https://biblocal.com'` in
  `astro.config.mjs`. Produces `/sitemap-index.xml`.
- **robots.txt:** static `public/robots.txt` — allow crawling, disallow `/api/`, `/shelf`,
  `/matches`, `/profile` (auth-gated, no SEO value), and reference the sitemap.
- **OG images:** a single polished branded default at `public/og/default.png`, used for all
  pages; per-article `ogImage` frontmatter overrides it. Dynamic build-time OG generation
  (satori) is intentionally **deferred** — it adds native-build dependencies and CI
  fragility not justified for this PR.

### Routing & middleware

- Add `/blog` and `/blog/(.*)` to `isPublicRoute` in `src/middleware.ts`.

### Discoverability / internal linking

- Add an "Articles" (or "Reading") column/link to `Footer.astro` pointing to `/blog`.
- Articles cross-link to each other and to `/` and `/how-it-works`. Comparison articles link
  to relevant product surfaces (e.g. Goodreads import).

## Content plan

A research pass (keyword/SERP) runs first and finalizes titles/slugs and the second
comparison target. Initial set (4 articles):

1. **biblocal vs Goodreads** — comparison; targets "Goodreads alternative" intent. Fair
   feature table; honest framing (local lending + taste-matching vs catalog/tracking);
   references Goodreads import.
2. **biblocal vs StoryGraph** *(or research-selected alternative)* — comparison.
3. **How to start a neighborhood book-lending circle** — how-to guide; informational intent.
4. **Why local book-sharing beats algorithmic feeds** — essay/manifesto; brand + shareable.

Editorial rules: substantive and honest, no keyword-stuffing, comparison tables must be fair
to competitors, every article has complete SEO frontmatter and ≥1 internal link.

## Testing

- **Vitest** — content schema validation: every non-draft article parses against the zod
  schema and has `title`, `description` (length-bounded), `pubDate`, `category`.
- **Vitest** — `Seo` output: canonical, OG, and JSON-LD present and well-formed for a sample
  article and for a marketing page.
- **`npx astro check`** passes (types).
- **`npm run build`** passes — build-time rendering surfaces broken MDX, bad frontmatter, and
  broken internal links.

## Agent-team execution

- **1 research agent** → keyword/SERP findings, finalized titles/slugs, second comparison pick.
- **Up to 4 writer agents (parallel)** → one article each, given research + editorial rules.
- **Infra work** (collections config, `Seo.astro`, sitemap, robots, layout refactor,
  middleware, footer, tests) done inline / by one agent.
- Integrate → `astro check` + `build` + `test:run` green → open PR.

## Out of scope (YAGNI)

- Dynamic/generated OG images (satori) — fast-follow.
- RSS feed — not requested.
- In-app / DB-backed CMS editor — file-based is sufficient.
- Comment system, author profiles, tag taxonomy pages, pagination (only 4 posts).
