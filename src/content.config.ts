// src/content.config.ts -- Astro 6 content collections for Pachacuti
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const chaptersEs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/chapters/es' }),
  schema: z.object({
    title: z.string().optional(),
    chapter: z.number().optional(),
    slug: z.string().optional(),
    lang: z.string().optional(),
    status: z.string().optional(),
  }),
});

const chaptersEn = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/chapters/en' }),
  schema: z.object({
    title: z.string().optional(),
    chapter: z.number().optional(),
    slug: z.string().optional(),
    lang: z.string().optional(),
    status: z.string().optional(),
  }),
});

const characters = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/characters' }),
  schema: z.object({
    name: z.string().optional(),
    slug: z.string().optional(),
    role: z.string().optional(),
  }),
});

export const collections = { chaptersEs, chaptersEn, characters };
