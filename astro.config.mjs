// @ts-check
import { defineConfig } from 'astro/config';

const SITE = process.env.SITE_URL ?? 'https://classic.theatunbiexperience.com';

// Static site. Cloudflare Pages serves dist/ + the /functions directory
// (the contact endpoint) automatically — no SSR adapter needed.
export default defineConfig({
  site: SITE,
  output: 'static',
  image: {
    // R2 originals are fetched + resized at build time (Sharp). No Cloudflare
    // Images / cdn-cgi needed; output is fully static and host-agnostic.
    domains: ['assets.theatunbiexperience.com'],
  },
  devToolbar: { enabled: false },
});
