import type { APIRoute } from 'astro';
import { readManifest, publicUrl, r2Configured, DEFAULT_SETTINGS } from '@lib/r2';

export const prerender = false;

export const GET: APIRoute = async () => {
  if (!r2Configured()) {
    return new Response(JSON.stringify({ error: 'R2 is not configured on the server.' }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    });
  }
  const manifest = await readManifest();
  const items = [...manifest.items]
    .sort((a, b) => a.order - b.order)
    .map((it) => ({ ...it, url: publicUrl(it.key) }));
  return new Response(
    JSON.stringify({ items, settings: manifest.settings ?? DEFAULT_SETTINGS }),
    { status: 200, headers: { 'content-type': 'application/json' } }
  );
};
