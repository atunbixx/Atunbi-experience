import type { APIRoute } from 'astro';
import { sendCAPIEvent, uuid } from '@lib/meta-capi';

export const prerender = false;

const ALLOWED_EVENTS = new Set([
  'WhatsAppClick',
  'ContactCall',
  'ViewContent',
  'Lead',
  'Schedule',
  'Purchase',
] as const);

type AllowedEvent = typeof ALLOWED_EVENTS extends Set<infer T> ? T : never;

interface Payload {
  event_name?: string;
  event_id?: string;
  value?: number;
  currency?: string;
  service?: string;
  custom_data?: Record<string, unknown>;
  user_data?: { email?: string; phone?: string };
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  let body: Payload = {};
  try {
    body = (await request.json()) as Payload;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  if (!body.event_name || !ALLOWED_EVENTS.has(body.event_name as AllowedEvent)) {
    return new Response(JSON.stringify({ error: 'Invalid event_name' }), { status: 400 });
  }

  const event_id = body.event_id ?? uuid();
  const referer = request.headers.get('referer') ?? '';
  const ua = request.headers.get('user-agent') ?? '';

  await sendCAPIEvent({
    event_name: body.event_name as AllowedEvent,
    event_id,
    event_source_url: referer,
    user_data: {
      email: body.user_data?.email,
      phone: body.user_data?.phone,
      country: 'gb',
      client_ip_address: clientAddress ?? undefined,
      client_user_agent: ua,
    },
    custom_data: {
      currency: body.currency ?? 'GBP',
      value: body.value,
      content_category: body.service,
      ...body.custom_data,
    },
  });

  return new Response(JSON.stringify({ ok: true, event_id }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
