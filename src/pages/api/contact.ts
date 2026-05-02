import type { APIRoute } from 'astro';

export const prerender = false;

interface Payload {
  name?: string;
  email?: string;
  phone?: string;
  eventType?: string;
  eventDate?: string;
  venue?: string;
  message?: string;
  company?: string; // honeypot
  'cf-turnstile-response'?: string;
}

const json = (status: number, body: object) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

async function verifyTurnstile(token: string | undefined, ip: string | null): Promise<boolean> {
  const secret = import.meta.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret, response: token, ...(ip ? { remoteip: ip } : {}) });
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
    });
    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  let payload: Payload = {};
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    payload = (await request.json().catch(() => ({}))) as Payload;
  } else {
    const form = await request.formData();
    for (const [k, v] of form.entries()) (payload as Record<string, string>)[k] = String(v);
  }

  if (payload.company && payload.company.length > 0) return json(200, { ok: true });

  if (!payload.name || payload.name.length < 2) return json(400, { error: 'Please share your name.' });
  if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email))
    return json(400, { error: 'Please share a valid email address.' });
  if (!payload.message || payload.message.length < 20)
    return json(400, { error: 'Please tell us a little about the day.' });

  const ok = await verifyTurnstile(payload['cf-turnstile-response'], clientAddress ?? null);
  if (!ok) return json(400, { error: 'Spam check failed — please try again.' });

  const apiKey = import.meta.env.RESEND_API_KEY;
  const to = import.meta.env.CONTACT_TO_EMAIL ?? 'hello@atunbi.com';
  const from = import.meta.env.CONTACT_FROM_EMAIL ?? 'site@theatunbiexperience.com';

  if (!apiKey) {
    console.warn('[contact] RESEND_API_KEY not configured — payload:', payload);
    return json(202, { ok: true, note: 'Logged. Email delivery not configured.' });
  }

  const subject = `[Enquiry] ${payload.eventType ?? 'General'} — ${payload.name}`;
  const text = [
    `New enquiry via theatunbiexperience.com`,
    ``,
    `Name:    ${payload.name}`,
    `Email:   ${payload.email}`,
    `Phone:   ${payload.phone ?? '—'}`,
    `Event:   ${payload.eventType ?? '—'}`,
    `Date:    ${payload.eventDate ?? '—'}`,
    `Venue:   ${payload.venue ?? '—'}`,
    ``,
    `Message:`,
    payload.message,
  ].join('\n');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: payload.email,
      subject,
      text,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error('[contact] resend error', res.status, detail);
    return json(500, { error: 'We could not send your message right now. Please email us directly at ' + to });
  }

  return json(200, { ok: true });
};
