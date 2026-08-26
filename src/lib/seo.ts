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

const DEFAULT_ORGANIZATION_DESCRIPTION =
  'biblocal is a local book-lending and reader-matching app. Build a living bookshelf, find neighbours who share your taste, and borrow, lend, discuss, or gift books nearby.';

const DEFAULT_WEB_APPLICATION_DESCRIPTION =
  'Organize your bookshelf, match with local readers by taste, and lend, borrow, discuss, or gift books with people nearby.';

export function organizationJsonLd(description = DEFAULT_ORGANIZATION_DESCRIPTION): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_ORIGIN,
    logo: absoluteUrl('/favicon.svg'),
    slogan: 'You are what you read.',
    description,
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

// Homepage-only: marks biblocal as an interactive web app (not a blog) for
// Google. Truthful and Rich-Results-eligible; the app is free to use.
export function webApplicationJsonLd(description = DEFAULT_WEB_APPLICATION_DESCRIPTION): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE_NAME,
    url: SITE_ORIGIN,
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Web',
    description,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
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
