import { defineCollection, z } from 'astro:content';

const notes = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.union([z.string(), z.date()]).optional(),
    tags: z.array(z.string()).default([]),
    links: z.array(z.string()).default([]), // slugs this note links to
    draft: z.boolean().default(false),
  }),
});

export const collections = { notes };
