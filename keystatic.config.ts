import { config, fields, collection, singleton } from '@keystatic/core';

const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

export default config({
  storage: isProd
    ? {
        kind: 'github',
        repo: { owner: 'atunbixx', name: 'Atunbi-experience' },
      }
    : { kind: 'local' },

  ui: {
    brand: { name: 'The Atunbi Experience' },
    navigation: {
      Site: ['cover', 'plates', 'pages'],
      Editorial: ['blog', 'projects'],
      SEO: ['seoKeywords'],
    },
  },

  singletons: {
    cover: singleton({
      label: 'Homepage Cover Slider',
      path: 'src/content/cover/index',
      format: { data: 'json' },
      schema: {
        items: fields.array(
          fields.object({
            image: fields.image({
              label: 'Image (landscape — best ~2400×1500)',
              directory: 'src/assets/uploads/cover',
              publicPath: '/uploads/cover/',
              validation: { isRequired: true },
            }),
            alt: fields.text({
              label: 'Alt text (REQUIRED for SEO + accessibility)',
              validation: { length: { min: 5, max: 160 } },
              description: 'Describe the image as if reading it to someone who cannot see it.',
            }),
            caption: fields.text({
              label: 'Caption (shown below the image, e.g. "Plate I · Mayfair, 2026")',
            }),
          }),
          {
            label: 'Cover slide',
            itemLabel: (props) => props.fields.alt.value || 'Slide',
          }
        ),
      },
    }),

    plates: singleton({
      label: 'Homepage Plates',
      path: 'src/content/plates/index',
      format: { data: 'json' },
      schema: {
        items: fields.array(
          fields.object({
            number: fields.text({ label: 'Plate number', defaultValue: 'Plate I' }),
            title: fields.text({
              label: 'Title',
              validation: { length: { min: 3, max: 60 } },
            }),
            category: fields.select({
              label: 'Category',
              options: [
                { label: 'Weddings', value: 'Weddings' },
                { label: 'Corporate', value: 'Corporate' },
                { label: 'Portraits', value: 'Portraits' },
                { label: 'Galas', value: 'Galas' },
                { label: 'Cultural', value: 'Cultural' },
                { label: 'Brand', value: 'Brand' },
              ],
              defaultValue: 'Weddings',
            }),
            image: fields.image({
              label: 'Image',
              directory: 'src/assets/uploads/plates',
              publicPath: '/uploads/plates/',
              validation: { isRequired: false },
            }),
            alt: fields.text({
              label: 'Alt text (REQUIRED for SEO + accessibility)',
              validation: { length: { min: 5, max: 160 } },
              description: 'Describe the image as if reading it to someone who cannot see it.',
            }),
            href: fields.text({ label: 'Link to (URL or path)', defaultValue: '/portfolio' }),
            placeholderClass: fields.select({
              label: 'Placeholder gradient (used when no image is set)',
              options: [
                { label: 'Plate 1 — burgundy', value: 'plate-1' },
                { label: 'Plate 2 — rich', value: 'plate-2' },
                { label: 'Plate 3 — ink', value: 'plate-3' },
                { label: 'Plate 4 — wine', value: 'plate-4' },
                { label: 'Plate 5 — slate', value: 'plate-5' },
                { label: 'Plate 6 — earth', value: 'plate-6' },
              ],
              defaultValue: 'plate-1',
            }),
          }),
          {
            label: 'Plate',
            itemLabel: (props) => props.fields.title.value || 'Plate',
          }
        ),
      },
    }),

    seoKeywords: singleton({
      label: 'SEO — Keyword Auto-Linking',
      path: 'src/content/',
      format: { data: 'json' },
      glob: 'seo-keywords',
      schema: {
        keywords: fields.array(
          fields.object({
            phrase: fields.text({
              label: 'Phrase to link (case-insensitive)',
              validation: { length: { min: 3 } },
            }),
            target: fields.text({
              label: 'Link target (URL or path)',
              validation: { length: { min: 1 } },
            }),
          }),
          {
            label: 'Keyword link',
            itemLabel: (props) => `${props.fields.phrase.value} → ${props.fields.target.value}`,
          }
        ),
      },
    }),
  },

  collections: {
    blog: collection({
      label: 'Journal (Blog)',
      path: 'src/content/blog/*',
      slugField: 'title',
      format: { contentField: 'body' },
      schema: {
        title: fields.slug({
          name: { label: 'Title', validation: { length: { min: 10, max: 70 } } },
          slug: { label: 'URL slug' },
        }),
        description: fields.text({
          label: 'SEO description (50–170 chars)',
          multiline: true,
          validation: { length: { min: 50, max: 170 } },
          description: 'Shows in Google results and on social-media cards.',
        }),
        pubDate: fields.date({ label: 'Publish date' }),
        updatedDate: fields.date({ label: 'Last updated', validation: { isRequired: false } }),
        category: fields.select({
          label: 'Category',
          options: [
            { label: 'Weddings', value: 'Weddings' },
            { label: 'Galas', value: 'Galas' },
            { label: 'Portraits', value: 'Portraits' },
            { label: 'Brand', value: 'Brand' },
            { label: 'Behind the Lens', value: 'Behind the Lens' },
          ],
          defaultValue: 'Behind the Lens',
        }),
        tags: fields.array(fields.text({ label: 'Tag' }), { label: 'Tags', itemLabel: (p) => p.value }),
        keywords: fields.array(fields.text({ label: 'Target keyword' }), {
          label: 'Target SEO keywords (one per line)',
          itemLabel: (p) => p.value,
          validation: { length: { min: 1 } },
        }),
        author: fields.text({ label: 'Author', defaultValue: 'Atunbi' }),
        heroImage: fields.image({
          label: 'Hero image',
          directory: 'src/assets/uploads/blog',
          publicPath: '/uploads/blog/',
          validation: { isRequired: false },
        }),
        heroAlt: fields.text({
          label: 'Hero alt text (REQUIRED if hero image is set)',
          validation: { length: { min: 0, max: 160 } },
        }),
        canonical: fields.url({ label: 'Canonical URL (optional, for republished content)' }),
        featured: fields.checkbox({ label: 'Show on homepage', defaultValue: false }),
        draft: fields.checkbox({ label: 'Draft (will not publish)', defaultValue: false }),
        body: fields.markdoc({ label: 'Article body' }),
      },
    }),

    projects: collection({
      label: 'Portfolio Projects',
      path: 'src/content/projects/*',
      slugField: 'title',
      format: { contentField: 'body' },
      schema: {
        title: fields.slug({
          name: { label: 'Title', validation: { length: { min: 5, max: 80 } } },
          slug: { label: 'URL slug' },
        }),
        description: fields.text({
          label: 'SEO description (50–170 chars)',
          multiline: true,
          validation: { length: { min: 50, max: 170 } },
        }),
        category: fields.select({
          label: 'Category',
          options: [
            { label: 'Weddings', value: 'Weddings' },
            { label: 'Corporate', value: 'Corporate' },
            { label: 'Portraits', value: 'Portraits' },
            { label: 'Galas', value: 'Galas' },
            { label: 'Cultural', value: 'Cultural' },
            { label: 'Brand', value: 'Brand' },
          ],
          defaultValue: 'Weddings',
        }),
        venue: fields.text({ label: 'Venue or location' }),
        eventDate: fields.date({ label: 'Event date', validation: { isRequired: false } }),
        keywords: fields.array(fields.text({ label: 'Target keyword' }), {
          label: 'Target SEO keywords',
          itemLabel: (p) => p.value,
          validation: { length: { min: 1 } },
        }),
        heroImage: fields.image({
          label: 'Hero image',
          directory: 'src/assets/uploads/projects',
          publicPath: '/uploads/projects/',
          validation: { isRequired: false },
        }),
        heroAlt: fields.text({
          label: 'Hero alt text',
          validation: { length: { min: 0, max: 160 } },
        }),
        gallery: fields.array(
          fields.object({
            src: fields.image({
              label: 'Image (leave empty if using Cloudflare below)',
              directory: 'src/assets/uploads/projects',
              publicPath: '/uploads/projects/',
            }),
            cloudflareId: fields.text({
              label: 'Cloudflare Image ID (optional — overrides the upload above)',
              description: 'The image ID from Cloudflare Images. Requires the two size fields below.',
            }),
            cfWidth: fields.integer({
              label: 'Cloudflare width (px)',
              validation: { isRequired: false },
            }),
            cfHeight: fields.integer({
              label: 'Cloudflare height (px)',
              validation: { isRequired: false },
            }),
            alt: fields.text({
              label: 'Alt text (REQUIRED — describes the photo for SEO + screen readers)',
              validation: { length: { min: 5, max: 160 } },
            }),
            caption: fields.text({ label: 'Caption (shown on hover)' }),
            description: fields.text({
              label: 'Description (longer — feeds image SEO / structured data)',
              multiline: true,
              validation: { length: { min: 0, max: 300 } },
            }),
            tags: fields.array(fields.text({ label: 'Tag' }), {
              label: 'Tags / keywords (image SEO + future filtering)',
              itemLabel: (p) => p.value || 'tag',
            }),
          }),
          { label: 'Gallery image', itemLabel: (p) => p.fields.alt.value || 'Gallery image' }
        ),
        featured: fields.checkbox({ label: 'Featured', defaultValue: false }),
        order: fields.integer({ label: 'Sort order (lower shows first)', defaultValue: 0 }),
        draft: fields.checkbox({ label: 'Draft', defaultValue: false }),
        layoutStyle: fields.select({
          label: 'Gallery layout',
          options: [
            { label: 'Justified rows (even rows, symmetric — recommended)', value: 'justified' },
            { label: 'Masonry (Pinterest-style staggered columns)', value: 'masonry' },
          ],
          defaultValue: 'justified',
        }),
        heroOverlay: fields.select({
          label: 'Hero scrim colour (for title legibility)',
          options: [
            { label: 'Dark scrim (light photos)', value: 'dark' },
            { label: 'Light scrim (dark photos)', value: 'light' },
          ],
          defaultValue: 'dark',
        }),
        body: fields.markdoc({ label: 'Project narrative' }),
      },
    }),

    pages: collection({
      label: 'Site pages (editable copy)',
      path: 'src/content/pages/*',
      slugField: 'key',
      format: { data: 'json' },
      schema: {
        key: fields.slug({ name: { label: 'Page key' } }),
        title: fields.text({ label: 'Editable page title' }),
        seoTitle: fields.text({
          label: 'SEO title (10–70 chars)',
          validation: { length: { min: 0, max: 70 } },
        }),
        seoDescription: fields.text({
          label: 'SEO description (50–170 chars)',
          multiline: true,
          validation: { length: { min: 0, max: 170 } },
        }),
      },
    }),
  },
});
