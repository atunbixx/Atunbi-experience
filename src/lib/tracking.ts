// Client-side tracking helpers. UTM capture, fbc/fbp cookie reading, Pixel event firing.

export type FbqCommand = 'init' | 'track' | 'trackCustom';

declare global {
  interface Window {
    fbq?: (cmd: FbqCommand, ...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

export function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match?.[2];
}

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'] as const;
type UtmKey = (typeof UTM_KEYS)[number];

export function captureUtms(): Partial<Record<UtmKey, string>> {
  if (typeof window === 'undefined') return {};
  const out: Partial<Record<UtmKey, string>> = {};

  const stored = window.sessionStorage.getItem('lp_utms');
  if (stored) {
    try {
      Object.assign(out, JSON.parse(stored));
    } catch {}
  }

  const params = new URLSearchParams(window.location.search);
  let fresh = false;
  for (const k of UTM_KEYS) {
    const v = params.get(k);
    if (v) {
      out[k] = v;
      fresh = true;
    }
  }
  if (fresh) {
    window.sessionStorage.setItem('lp_utms', JSON.stringify(out));
  }
  return out;
}

export function trackPixel(eventName: string, params?: Record<string, unknown>, eventId?: string) {
  if (typeof window === 'undefined' || !window.fbq) return;
  if (eventId) {
    window.fbq('track', eventName, params ?? {}, { eventID: eventId });
  } else {
    window.fbq('track', eventName, params ?? {});
  }
}

export function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export async function trackServer(payload: {
  event_name: string;
  event_id: string;
  value?: number;
  currency?: string;
  service?: string;
  custom_data?: Record<string, unknown>;
}) {
  try {
    await fetch('/api/track', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      keepalive: true,
      body: JSON.stringify(payload),
    });
  } catch {
    // fire-and-forget
  }
}

export function waLink(prefill: string, source: string): string {
  const num = (typeof window !== 'undefined' ? window : globalThis as unknown as typeof window).__WA_NUMBER ?? '';
  if (!num) return '#';
  const enc = encodeURIComponent(prefill);
  return `https://wa.me/${num}?text=${enc}&utm_source=${source}`;
}

declare global {
  interface Window { __WA_NUMBER?: string }
}
