// Resend transactional email + Slack notification helpers.

import { SITE, CONTACT } from './site';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM_EMAIL ?? `${SITE.name} <${CONTACT.email}>`;
const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL;

type AckInput = { to: string; firstName: string; service: string };

export async function sendLeadAck({ to, firstName, service }: AckInput): Promise<{ ok: boolean; skipped?: boolean }> {
  if (!RESEND_API_KEY) {
    console.warn('[Resend] missing API key — ack skipped');
    return { ok: true, skipped: true };
  }

  const html = `
    <div style="font-family: Georgia, 'Cormorant Garamond', serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; color: #1a1714; background: #faf8f5;">
      <div style="font-size: 13px; letter-spacing: 0.2em; text-transform: uppercase; color: #6b6157;">${SITE.name}</div>
      <hr style="border: none; border-top: 1px solid #d8cfc1; margin: 24px 0;" />
      <p style="font-size: 17px; line-height: 1.65;">Dear ${escapeHtml(firstName)},</p>
      <p style="font-size: 17px; line-height: 1.65;">
        Thank you for your enquiry about ${describeService(service)}. We've received it, and we'll be back to you personally within twenty-four hours.
      </p>
      <p style="font-size: 17px; line-height: 1.65;">
        In the meantime, our journal and recent plates live at <a href="${SITE.url}/portfolio" style="color: #7B2C3D;">theatunbiexperience.com</a>.
      </p>
      <p style="font-size: 17px; line-height: 1.65; margin-top: 32px;">— Atunbi</p>
      <hr style="border: none; border-top: 1px solid #d8cfc1; margin: 32px 0 16px;" />
      <p style="font-size: 12px; color: #6b6157;">${SITE.issueLabel} · ${SITE.issueDate}</p>
    </div>
  `;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [to],
        subject: `Thank you — we'll be in touch shortly`,
        html,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error('[Resend] error', res.status, body);
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error('[Resend] fetch failed', err);
    return { ok: false };
  }
}

export async function notifySlack(text: string): Promise<void> {
  if (!SLACK_WEBHOOK) return;
  try {
    await fetch(SLACK_WEBHOOK, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
    });
  } catch (err) {
    console.error('[Slack] fetch failed', err);
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function describeService(s: string): string {
  switch (s) {
    case 'wedding': return 'your wedding';
    case 'gala': return 'your event';
    case 'portrait': return 'a portrait sitting';
    case 'brand': return 'a brand commission';
    default: return 'your enquiry';
  }
}
