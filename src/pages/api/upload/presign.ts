import type { APIRoute } from 'astro';
import { presignUpload, publicUrl, r2Configured } from '@lib/r2';

export const prerender = false;

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

function slugify(name: string): string {
  const dot = name.lastIndexOf('.');
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : 'jpg';
  return `${base || 'image'}.${ext}`;
}

export const POST: APIRoute = async ({ request }) => {
  if (!r2Configured()) {
    return new Response(JSON.stringify({ error: 'R2 is not configured on the server.' }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    });
  }

  const body = (await request.json().catch(() => ({}))) as {
    filename?: string;
    contentType?: string;
    folder?: string;
  };

  const contentType = body.contentType ?? '';
  if (!ALLOWED.has(contentType)) {
    return new Response(JSON.stringify({ error: 'Only JPEG, PNG, WebP or AVIF images are allowed.' }), {
      status: 422,
      headers: { 'content-type': 'application/json' },
    });
  }

  const folder = (body.folder ?? 'gallery').replace(/[^a-z0-9/-]/gi, '').replace(/(^\/|\/$)/g, '');
  const stamp = Date.now().toString(36);
  const key = `${folder}/${stamp}-${slugify(body.filename ?? 'image.jpg')}`;

  const uploadUrl = await presignUpload(key, contentType);

  return new Response(
    JSON.stringify({ ok: true, key, uploadUrl, publicUrl: publicUrl(key) }),
    { status: 200, headers: { 'content-type': 'application/json' } }
  );
};
