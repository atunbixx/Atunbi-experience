import type { APIRoute } from 'astro';
import { sendCAPIEvent, uuid } from '@lib/meta-capi';
import { createLeadInNotion } from '@lib/notion';
import { sendLeadAck, notifySlack } from '@lib/notify';
import { WHATSAPP } from '@lib/site';

export const prerender = false;

interface Payload {
  name?: string;
  email?: string;
  phone?: string;
  eventType?: string;
  service?: string;
  eventDate?: string;
  venue?: string;
  message?: string;
  company?: string; // honeypot
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  fbc?: string;
  fbp?: string;
  event_id?: string;
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

function normaliseService(eventType?: string): 'wedding' | 'gala' | 'portrait' | 'brand' | 'other' {
  switch (eventType) {
    case 'wedding': return 'wedding';
    case 'gala': return 'gala';
    case 'portrait': return 'portrait';
    case 'brand': return 'brand';
    default: return 'other';
  }
}

function leadValue(service: string): number {
  // Modeled lead values to help Meta's bidder rank intent. Real revenue tracked separately.
  switch (service) {
    case 'wedding': return 50;
    case 'gala': return 35;
    case 'brand': return 35;
    case 'portrait': return 20;
    default: return 15;
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

  const service = normaliseService(payload.eventType);
  const eventId = payload.event_id ?? uuid();
  const value = leadValue(service);
  const [firstName, ...rest] = payload.name.trim().split(/\s+/);
  const lastName = rest.join(' ');
  const referer = request.headers.get('referer') ?? '';
  const userAgent = request.headers.get('user-agent') ?? '';

  const waLinkBase = WHATSAPP.number
    ? `https://wa.me/${WHATSAPP.number}?text=${encodeURIComponent(`Hi — just enquired via the site about ${service} photography. Name: ${payload.name}.`)}`
    : '';

  // Photographer notification email (preserves existing behaviour)
  const apiKey = import.meta.env.RESEND_API_KEY;
  const to = import.meta.env.CONTACT_TO_EMAIL ?? 'hello@atunbi.com';
  const from = import.meta.env.CONTACT_FROM_EMAIL ?? 'site@theatunbiexperience.com';

  let photographerEmail: Promise<unknown> = Promise.resolve({ skipped: true });
  if (apiKey) {
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
      `Source:  ${payload.utm_source ?? 'direct'} / ${payload.utm_campaign ?? '—'} / ${payload.utm_content ?? '—'}`,
      `WhatsApp reply: ${waLinkBase || 'no number configured'}`,
      ``,
      `Message:`,
      payload.message,
    ].join('\n');

    photographerEmail = fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from, to: [to], reply_to: payload.email, subject, text }),
    });
  } else {
    console.warn('[contact] RESEND_API_KEY not configured — payload:', { name: payload.name, email: payload.email, service });
  }

  // Parallel side-effects — none should block or fail the request
  const results = await Promise.allSettled([
    photographerEmail,
    sendCAPIEvent({
      event_name: 'Lead',
      event_id: eventId,
      event_source_url: referer,
      user_data: {
        email: payload.email,
        phone: payload.phone,
        first_name: firstName,
        last_name: lastName,
        country: 'gb',
        client_ip_address: clientAddress ?? undefined,
        client_user_agent: userAgent,
        fbc: payload.fbc,
        fbp: payload.fbp,
      },
      custom_data: {
        currency: 'GBP',
        value,
        content_category: service,
        lead_source: payload.utm_source ?? 'direct',
        utm_campaign: payload.utm_campaign,
        utm_content: payload.utm_content,
      },
    }),
    createLeadInNotion({
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      service,
      eventDate: payload.eventDate,
      venue: payload.venue,
      message: payload.message,
      utm_source: payload.utm_source,
      utm_campaign: payload.utm_campaign,
      utm_content: payload.utm_content,
      waLink: waLinkBase || undefined,
    }),
    sendLeadAck({ to: payload.email, firstName, service }),
    notifySlack(
      [
        `:bell: *New lead* — *${service}* — ${payload.name}`,
        `Email: ${payload.email}${payload.phone ? `  ·  Phone: ${payload.phone}` : ''}`,
        `Date: ${payload.eventDate ?? '—'}${payload.venue ? `  ·  Venue: ${payload.venue}` : ''}`,
        `Source: ${payload.utm_source ?? 'direct'} / ${payload.utm_campaign ?? '—'}`,
        waLinkBase ? `Reply on WhatsApp: ${waLinkBase}` : '',
      ].filter(Boolean).join('\n'),
    ),
  ]);

  const failures = results.filter((r) => r.status === 'rejected');
  if (failures.length) {
    console.error('[contact] partial failure', failures.map((f) => (f as PromiseRejectedResult).reason));
  }

  return json(200, { ok: true, event_id: eventId });
};
