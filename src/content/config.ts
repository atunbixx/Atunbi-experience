import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      title: z.string().min(10).max(70),
      description: z.string().min(50).max(170),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      heroImage: image().optional(),
      heroAlt: z.string().min(5).max(160).optional(),
      category: z.enum([
        'Weddings',
        'Galas',
        'Portraits',
        'Brand',
        'Behind the Lens',
      ]),
      tags: z.array(z.string()).default([]),
      keywords: z.array(z.string()).min(1, 'At least one target keyword is required for SEO.'),
      author: z.string().default('Atunbi'),
      canonical: z.string().url().optional(),
      draft: z.boolean().default(false),
      featured: z.boolean().default(false),
    }),
});

const projects = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      title: z.string().min(5).max(80),
      slug: z.string().optional(),
      description: z.string().min(50).max(170),
      heroImage: image().optional(),
      heroAlt: z.string().min(5).max(160).optional(),
      gallery: z
        .array(
          z.object({
            src: image(),
            alt: z.string().min(5).max(160),
            caption: z.string().optional(),
          })
        )
        .default([]),
      category: z.enum([
        'Weddings',
        'Corporate',
        'Portraits',
        'Galas',
        'Cultural',
        'Brand',
      ]),
      venue: z.string().optional(),
      eventDate: z.coerce.date().optional(),
      keywords: z.array(z.string()).min(1),
      featured: z.boolean().default(false),
      order: z.number().default(0),
      draft: z.boolean().default(false),
      layoutStyle: z.enum(['masonry', 'justified']).default('masonry'),
      heroOverlay: z.enum(['dark', 'light']).default('dark'),
    }),
});

const plates = defineCollection({
  type: 'data',
  schema: ({ image }) =>
    z.object({
      items: z
        .array(
          z.object({
            number: z.string(),
            title: z.string(),
            category: z.enum([
              'Weddings',
              'Corporate',
              'Portraits',
              'Galas',
              'Cultural',
              'Brand',
            ]),
            image: image().optional(),
            alt: z.string().min(5),
            href: z.string().optional(),
            placeholderClass: z.string().optional(),
          })
        )
        .length(6, 'Homepage shows exactly six plates.'),
    }),
});

const cover = defineCollection({
  type: 'data',
  schema: ({ image }) =>
    z.object({
      items: z
        .array(
          z.object({
            image: image(),
            alt: z.string().min(5).max(160),
            caption: z.string().optional(),
          })
        )
        .min(1, 'At least one cover image is required.'),
    }),
});

const pages = defineCollection({
  type: 'data',
  schema: ({ image }) =>
    z.object({
      key: z.string(),
      title: z.string().optional(),
      seoTitle: z.string().min(10).max(70).optional(),
      seoDescription: z.string().min(50).max(170).optional(),
      heroImage: image().optional(),
      heroAlt: z.string().optional(),
      content: z.record(z.any()).optional(),
    }),
});

export const collections = { blog, projects, plates, cover, pages };
