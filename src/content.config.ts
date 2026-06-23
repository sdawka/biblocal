// src/content.config.ts — Astro content collection wiring.
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { blogFrontmatterSchema } from './lib/blog-schema';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: blogFrontmatterSchema,
});

export const collections = { blog };
