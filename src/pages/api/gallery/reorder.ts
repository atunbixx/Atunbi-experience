import type { APIRoute } from 'astro';
import { readManifest, writeManifest, triggerRebuild, r2Configured } from '@lib/r2';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!r2Configured()) {
    return new Response(JSON.stringify({ error: 'R2 is not configured on the server.' }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    });
  }
  const body = (await request.json().catch(() => ({}))) as { keys?: string[] };
  const keys = Array.isArray(body.keys) ? body.keys : [];
  if (keys.length === 0) {
    return new Response(JSON.stringify({ error: 'No order provided.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const manifest = await readManifest();
  const byKey = new Map(manifest.items.map((i) => [i.key, i]));
  const rank = new Map(keys.map((k, idx) => [k, idx + 1]));

  const next = {
    ...manifest,
    items: manifest.items
      .map((it) => ({ ...it, order: rank.get(it.key) ?? it.order }))
      .sort((a, b) => a.order - b.order),
  };
  // ignore keys that no longer exist
  void byKey;

  await writeManifest(next);
  await triggerRebuild();
  return new Response(JSON.stringify({ ok: true, count: next.items.length }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
