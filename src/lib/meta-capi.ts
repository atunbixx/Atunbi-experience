import crypto from 'node:crypto';

const PIXEL_ID = process.env.PUBLIC_META_PIXEL_ID;
const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN;
const TEST_EVENT_CODE = process.env.META_TEST_EVENT_CODE;

export type ServerEvent = {
  event_name: 'Lead' | 'Schedule' | 'Purchase' | 'WhatsAppClick' | 'ViewContent' | 'Contact';
  event_id: string;
  event_source_url: string;
  user_data: {
    email?: string;
    phone?: string;
    first_name?: string;
    last_name?: string;
    country?: string;
    client_ip_address?: string;
    client_user_agent?: string;
    fbc?: string;
    fbp?: string;
  };
  custom_data?: Record<string, unknown>;
};

function sha256(v: string) {
  return crypto.createHash('sha256').update(v).digest('hex');
}

const hashEmail = (e?: string) => (e ? sha256(e.trim().toLowerCase()) : undefined);
const hashPhone = (p?: string) => (p ? sha256(p.replace(/\D/g, '')) : undefined);
const hashLower = (s?: string) => (s ? sha256(s.trim().toLowerCase()) : undefined);

export async function sendCAPIEvent(event: ServerEvent): Promise<{ ok: boolean; status?: number; skipped?: boolean }> {
  if (!PIXEL_ID || !ACCESS_TOKEN) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[CAPI] missing PIXEL_ID or ACCESS_TOKEN — skipping');
    }
    return { ok: true, skipped: true };
  }

  const userData: Record<string, string | string[] | undefined> = {};
  const em = hashEmail(event.user_data.email);
  const ph = hashPhone(event.user_data.phone);
  const fn = hashLower(event.user_data.first_name);
  const ln = hashLower(event.user_data.last_name);
  const country = hashLower(event.user_data.country);
  if (em) userData.em = [em];
  if (ph) userData.ph = [ph];
  if (fn) userData.fn = [fn];
  if (ln) userData.ln = [ln];
  if (country) userData.country = [country];
  if (event.user_data.client_ip_address) userData.client_ip_address = event.user_data.client_ip_address;
  if (event.user_data.client_user_agent) userData.client_user_agent = event.user_data.client_user_agent;
  if (event.user_data.fbc) userData.fbc = event.user_data.fbc;
  if (event.user_data.fbp) userData.fbp = event.user_data.fbp;

  const payload = {
    data: [
      {
        event_name: event.event_name,
        event_time: Math.floor(Date.now() / 1000),
        event_id: event.event_id,
        event_source_url: event.event_source_url,
        action_source: 'website',
        user_data: userData,
        custom_data: event.custom_data,
      },
    ],
    access_token: ACCESS_TOKEN,
    ...(TEST_EVENT_CODE ? { test_event_code: TEST_EVENT_CODE } : {}),
  };

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${PIXEL_ID}/events`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error('[CAPI] error', res.status, body);
      return { ok: false, status: res.status };
    }
    return { ok: true };
  } catch (err) {
    console.error('[CAPI] fetch failed', err);
    return { ok: false };
  }
}

export function uuid() {
  return crypto.randomUUID();
}
