import { defineMiddleware } from 'astro:middleware';
import crypto from 'node:crypto';

/*
 * Gates /admin/* and /api/upload/* — previously fully public.
 * Auth model: a single ADMIN_PASSWORD. On login we set an httpOnly cookie
 * whose value is sha256(password); middleware compares it to sha256(env).
 * Protected routes must be on-demand (prerender = false) for this to run
 * at request time on Vercel.
 */

const PROTECTED = [/^\/admin(?!\/login)(\/|$)/, /^\/api\/upload(\/|$)/];

function expectedToken(): string | null {
  const pw = import.meta.env.ADMIN_PASSWORD;
  if (!pw) return null;
  return crypto.createHash('sha256').update(pw).digest('hex');
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const needsAuth = PROTECTED.some((re) => re.test(pathname));
  if (!needsAuth) return next();

  const token = expectedToken();
  // No password configured → fail CLOSED for everything. The admin area must
  // never be world-readable just because an env var is missing. APIs get a
  // clear 503; pages bounce to /admin/login (which explains it needs setup).
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'Admin not configured (ADMIN_PASSWORD unset on the server).' }), {
        status: 503,
        headers: { 'content-type': 'application/json' },
      });
    }
    return context.redirect('/admin/login?reason=unconfigured', 302);
  }

  const cookie = context.cookies.get('admin_session')?.value;
  const ok =
    cookie != null &&
    cookie.length === token.length &&
    crypto.timingSafeEqual(Buffer.from(cookie), Buffer.from(token));

  if (ok) return next();

  if (pathname.startsWith('/api/')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }
  return context.redirect(`/admin/login?next=${encodeURIComponent(pathname)}`, 302);
});
