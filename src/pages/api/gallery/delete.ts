import type { APIRoute } from 'astro';
import { readManifest, writeManifest, deleteObject, triggerRebuild, r2Configured } from '@lib/r2';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!r2Configured()) {
    return new Response(JSON.stringify({ error: 'R2 is not configured on the server.' }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    });
  }
  const body = (await request.json().catch(() => ({}))) as { key?: string };
  if (!body.key) {
    return new Response(JSON.stringify({ error: 'Missing key.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const manifest = await readManifest();
  const exists = manifest.items.some((i) => i.key === body.key);

  // Remove the object from the bucket (best-effort) then drop it from the manifest.
  try {
    await deleteObject(body.key);
  } catch (err) {
    console.error('[gallery/delete] R2 delete failed', err);
  }

  const next = {
    ...manifest,
    items: manifest.items.filter((i) => i.key !== body.key),
  };
  await writeManifest(next);
  await triggerRebuild();

  return new Response(JSON.stringify({ ok: true, removed: exists, total: next.items.length }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
