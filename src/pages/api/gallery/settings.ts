import type { APIRoute } from 'astro';
import {
  readManifest,
  writeManifest,
  triggerRebuild,
  r2Configured,
  DEFAULT_SETTINGS,
  type GalleryLayout,
} from '@lib/r2';

export const prerender = false;

const ALLOWED: GalleryLayout[] = ['justified', 'masonry'];

export const POST: APIRoute = async ({ request }) => {
  if (!r2Configured()) {
    return new Response(JSON.stringify({ error: 'R2 is not configured on the server.' }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    });
  }
  const body = (await request.json().catch(() => ({}))) as { layout?: string };
  if (!body.layout || !ALLOWED.includes(body.layout as GalleryLayout)) {
    return new Response(JSON.stringify({ error: `layout must be one of: ${ALLOWED.join(', ')}` }), {
      status: 422,
      headers: { 'content-type': 'application/json' },
    });
  }

  const manifest = await readManifest();
  const next = {
    ...manifest,
    settings: { ...(manifest.settings ?? DEFAULT_SETTINGS), layout: body.layout as GalleryLayout },
  };
  await writeManifest(next);
  await triggerRebuild();
  return new Response(JSON.stringify({ ok: true, settings: next.settings }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
