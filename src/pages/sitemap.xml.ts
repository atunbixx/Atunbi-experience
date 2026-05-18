import type { APIRoute } from 'astro';
import { getGalleries } from '@lib/manifest';

export const GET: APIRoute = async ({ site }) => {
  const base = (site?.toString() ?? 'https://classic.theatunbiexperience.com').replace(/\/$/, '');
  const galleries = await getGalleries();
  const paths = ['/', '/resume', '/motion', '/contact', ...galleries.map((g) => `/${g.slug}`)];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `  <url><loc>${base}${p}</loc></url>`).join('\n')}
</urlset>`;
  return new Response(body, { headers: { 'content-type': 'application/xml' } });
};
