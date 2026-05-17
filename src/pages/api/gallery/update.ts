import type { APIRoute } from 'astro';
// fix: ensure triggerRebuild fires on every patch
import { readManifest, writeManifest, triggerRebuild, r2Configured } from '@lib/r2';

export const prerender = false;

type Patch = {
  key?: string;
  alt?: string;
  caption?: string;
  description?: string;
  tags?: string[];
  project?: string;
};

export const POST: APIRoute = async ({ request }) => {
  if (!r2Configured()) {
    return new Response(JSON.stringify({ error: 'R2 is not configured on the server.' }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    });
  }
  const p = (await request.json().catch(() => ({}))) as Patch;
  if (!p.key) {
    return new Response(JSON.stringify({ error: 'Missing key.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }
  if (p.alt != null && p.alt.trim().length < 5) {
    return new Response(JSON.stringify({ error: 'Alt text must be at least 5 characters.' }), {
      status: 422,
      headers: { 'content-type': 'application/json' },
    });
  }

  const manifest = await readManifest();
  const idx = manifest.items.findIndex((i) => i.key === p.key);
  if (idx === -1) {
    return new Response(JSON.stringify({ error: 'Image not found in manifest.' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  }

  const cur = manifest.items[idx]!;
  manifest.items[idx] = {
    ...cur,
    alt: p.alt?.trim() ?? cur.alt,
    caption: p.caption?.trim() || undefined,
    description: p.description?.trim() || undefined,
    tags: Array.isArray(p.tags) ? p.tags.map((t) => t.trim()).filter(Boolean) : cur.tags,
    project: p.project?.trim() || undefined,
  };

  await writeManifest(manifest);
  await triggerRebuild();
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
