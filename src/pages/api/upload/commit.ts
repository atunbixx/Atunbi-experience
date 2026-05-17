import type { APIRoute } from 'astro';
import {
  readManifest,
  writeManifest,
  triggerRebuild,
  r2Configured,
  isSection,
  DEFAULT_SECTION,
  type GalleryEntry,
  type GallerySection,
} from '@lib/r2';

export const prerender = false;

type Incoming = {
  key?: string;
  section?: string;
  alt?: string;
  caption?: string;
  description?: string;
  tags?: string[];
  project?: string;
  width?: number;
  height?: number;
};

export const POST: APIRoute = async ({ request }) => {
  if (!r2Configured()) {
    return new Response(JSON.stringify({ error: 'R2 is not configured on the server.' }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    });
  }

  const body = (await request.json().catch(() => ({}))) as { items?: Incoming[] };
  const items = Array.isArray(body.items) ? body.items : [];

  if (items.length === 0) {
    return new Response(JSON.stringify({ error: 'No items to commit.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  for (const it of items) {
    if (!it.key || !it.alt || it.alt.trim().length < 5) {
      return new Response(
        JSON.stringify({ error: `Each image needs a key and alt text (min 5 chars). Offending key: ${it.key ?? '—'}` }),
        { status: 422, headers: { 'content-type': 'application/json' } }
      );
    }
  }

  const manifest = await readManifest();
  const existing = new Map(manifest.items.map((i) => [i.key, i]));
  let order = manifest.items.reduce((m, i) => Math.max(m, i.order), 0);

  for (const it of items) {
    const prev = existing.get(it.key!);
    const section: GallerySection = isSection(it.section)
      ? it.section
      : prev?.section ?? DEFAULT_SECTION;
    const entry: GalleryEntry = {
      key: it.key!,
      section,
      alt: it.alt!.trim(),
      caption: it.caption?.trim() || undefined,
      description: it.description?.trim() || undefined,
      tags: (it.tags ?? []).map((t) => t.trim()).filter(Boolean),
      project: it.project?.trim() || undefined,
      width: it.width,
      height: it.height,
      order: prev?.order ?? ++order,
      uploadedAt: prev?.uploadedAt ?? new Date().toISOString(),
    };
    existing.set(it.key!, entry);
  }

  // Preserve manifest.settings (was previously dropped on every commit).
  const next = {
    ...manifest,
    items: [...existing.values()].sort((a, b) => a.order - b.order),
  };
  await writeManifest(next);
  await triggerRebuild();

  return new Response(JSON.stringify({ ok: true, count: items.length, total: next.items.length }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
