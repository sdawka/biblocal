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
