// src/lib/blog-schema.ts — pure. Shared by content.config.ts and tests.
import { z } from 'zod';

export const BLOG_CATEGORIES = ['comparison', 'guide', 'essay'] as const;

export const blogFrontmatterSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(50).max(160),
  lang: z.enum(['en', 'fr']).default('en'),
  pubDate: z.coerce.date(),
  updatedDate: z.coerce.date().optional(),
  category: z.enum(BLOG_CATEGORIES),
  keywords: z.array(z.string()).optional(),
  ogImage: z.string().optional(),
  draft: z.boolean().default(false),
});

export type BlogFrontmatter = z.infer<typeof blogFrontmatterSchema>;
