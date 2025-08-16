import { defineCollection, z } from 'astro:content';

const notes = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    summary: z.string().optional(),
    date: z.union([z.string(), z.date()]).optional(),
    tags: z.array(z.string()).default([]),
    links: z.array(z.string()).default([]), // slugs this note links to
    draft: z.boolean().default(false),
    type: z.enum(["Character","Location","Artifact","Faction","Lore","Story","Event"]).optional(),
    era: z.string().optional(),
    eraStart: z.union([z.number(), z.string(), z.date()]).optional(),
    eraEnd: z.union([z.number(), z.string(), z.date()]).optional(),
    coordinates: z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('image'), imageId: z.string(), x: z.number(), y: z.number() }),
      z.object({ kind: z.literal('geo'), lat: z.number(), lng: z.number(), zoom: z.number().optional() }),
    ]).optional(),
    coverImage: z.string().optional(),
    aliases: z.array(z.string()).optional().default([]),
    affiliations: z.array(z.string()).optional().default([]),
    related: z.array(z.string()).optional().default([]),
  }),
});

export const collections = { notes };
