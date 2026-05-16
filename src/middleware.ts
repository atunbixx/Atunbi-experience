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
  // If no password is configured, fail closed for write APIs, open for pages
  // (so a misconfigured deploy can't silently expose the uploader).
  if (!token) {
    if (pathname.startsWith('/api/upload')) {
      return new Response(JSON.stringify({ error: 'Uploader not configured (ADMIN_PASSWORD unset).' }), {
        status: 503,
        headers: { 'content-type': 'application/json' },
      });
    }
    return next();
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
