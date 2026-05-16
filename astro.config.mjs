// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import keystatic from '@keystatic/astro';
import { keywordLinker } from './src/lib/keyword-linker.mjs';

const SITE_URL = process.env.SITE_URL ?? 'https://www.theatunbiexperience.com';

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  output: 'static',
  adapter: vercel({
    imageService: true,
    webAnalytics: { enabled: true },
  }),
  image: {
    // R2 custom domain — lets Astro/Vercel optimise the remote originals
    // (resize + AVIF/WebP + edge cache) without Cloudflare transformations.
    domains: ['assets.theatunbiexperience.com'],
  },
  integrations: [
    react(),
    keystatic(),
    mdx(),
    sitemap({
      filter: (page) =>
        !page.includes('/keystatic') &&
        !page.includes('/admin') &&
        !page.includes('/api/'),
      changefreq: 'weekly',
      priority: 0.7,
    }),
  ],
  markdown: {
    remarkPlugins: [keywordLinker()],
    shikiConfig: {
      theme: 'github-light',
      wrap: true,
    },
  },
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
  vite: {
    ssr: { noExternal: ['@keystatic/*'] },
  },
});
