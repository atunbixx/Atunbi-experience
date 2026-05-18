/**
 * Cloudflare Pages Function — POST /api/contact
 * Validates, honeypot, per-IP rate limit (KV: CONTACT_RL, 3/hour), sends via
 * Resend. No secrets in code — all from the Pages env. Returns { ok: true }.
 */

interface Env {
  RESEND_API_KEY: string;
  CONTACT_TO_EMAIL: string;
  CONTACT_RL: KVNamespace;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: Record<string, string> = {};
  try {
    body = (await request.json()) as Record<string, string>;
  } catch {
    return json(400, { ok: false, error: 'Invalid request.' });
  }

  // Honeypot — silently accept so bots don't learn.
  if (body.company && body.company.trim() !== '') return json(200, { ok: true });

  const name = (body.name ?? '').trim();
  const email = (body.email ?? '').trim();
  const message = (body.message ?? '').trim();

  if (name.length < 2) return json(422, { ok: false, error: 'Please enter your name.' });
  if (!EMAIL_RE.test(email)) return json(422, { ok: false, error: 'Please enter a valid email.' });
  if (message.length < 10) return json(422, { ok: false, error: 'Please enter a message.' });

  // Rate limit: 3 / hour / IP.
  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
  if (env.CONTACT_RL) {
    const k = `rl:${ip}`;
    const n = Number((await env.CONTACT_RL.get(k)) ?? '0');
    if (n >= 3) return json(429, { ok: false, error: 'Too many messages — try again later.' });
    await env.CONTACT_RL.put(k, String(n + 1), { expirationTtl: 3600 });
  }

  if (!env.RESEND_API_KEY || !env.CONTACT_TO_EMAIL) {
    return json(503, { ok: false, error: 'Contact is not configured yet.' });
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: `Atunbi Site <${env.CONTACT_TO_EMAIL}>`,
      to: [env.CONTACT_TO_EMAIL],
      reply_to: email,
      subject: `Contact form — ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
    }),
  });

  if (!res.ok) {
    return json(502, { ok: false, error: 'Could not send right now. Please email hello@atunbi.com.' });
  }
  return json(200, { ok: true });
};
