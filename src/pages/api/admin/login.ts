import type { APIRoute } from 'astro';
import crypto from 'node:crypto';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const pw = import.meta.env.ADMIN_PASSWORD;
  if (!pw) {
    return new Response(JSON.stringify({ error: 'ADMIN_PASSWORD not set on the server.' }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    });
  }

  let body: { password?: string } = {};
  const ct = request.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) {
    body = (await request.json().catch(() => ({}))) as { password?: string };
  } else {
    const form = await request.formData();
    body = { password: String(form.get('password') ?? '') };
  }

  const supplied = body.password ?? '';
  const a = crypto.createHash('sha256').update(supplied).digest();
  const b = crypto.createHash('sha256').update(pw).digest();
  const match = a.length === b.length && crypto.timingSafeEqual(a, b);

  if (!match) {
    return new Response(JSON.stringify({ error: 'Incorrect password.' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  const token = crypto.createHash('sha256').update(pw).digest('hex');
  cookies.set('admin_session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12,
  });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
