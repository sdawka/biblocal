import { describe, it, expect } from 'vitest';
import {
  SITE_ORIGIN,
  DEFAULT_OG_IMAGE,
  absoluteUrl,
  resolveSeo,
  organizationJsonLd,
  webApplicationJsonLd,
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
  it('accepts localized descriptions for site and app structured data', () => {
    const description = 'Organiza tu estantería viva.';

    expect((organizationJsonLd(description) as any).description).toBe(description);
    expect((webApplicationJsonLd(description) as any).description).toBe(description);
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
