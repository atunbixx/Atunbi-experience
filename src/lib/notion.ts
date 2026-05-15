// Minimal Notion CRM client. Uses the Notion REST API directly to avoid adding
// a heavyweight SDK to the bundle. Database schema lives in /00-strategy notes.

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_DB_ID = process.env.NOTION_LEADS_DB_ID;

export type LeadRow = {
  name: string;
  email: string;
  phone?: string;
  service: 'wedding' | 'gala' | 'portrait' | 'brand' | 'other';
  eventDate?: string;
  venue?: string;
  message?: string;
  utm_source?: string;
  utm_campaign?: string;
  utm_content?: string;
  waLink?: string;
};

export async function createLeadInNotion(lead: LeadRow): Promise<{ ok: boolean; id?: string; skipped?: boolean }> {
  if (!NOTION_API_KEY || !NOTION_DB_ID) {
    console.warn('[Notion] missing config — lead not saved');
    return { ok: true, skipped: true };
  }

  const properties: Record<string, unknown> = {
    Name: { title: [{ text: { content: lead.name } }] },
    Email: { email: lead.email },
    Service: { select: { name: lead.service } },
    Status: { status: { name: 'New' } },
    Source: { select: { name: lead.utm_source ?? 'direct' } },
    'Date enquired': { date: { start: new Date().toISOString() } },
  };

  if (lead.phone) properties.Phone = { phone_number: lead.phone };
  if (lead.utm_campaign) properties.Campaign = { rich_text: [{ text: { content: lead.utm_campaign } }] };
  if (lead.utm_content) properties.Creative = { rich_text: [{ text: { content: lead.utm_content } }] };
  if (lead.eventDate) properties['Event date'] = { rich_text: [{ text: { content: lead.eventDate } }] };
  if (lead.venue) properties['Venue / location'] = { rich_text: [{ text: { content: lead.venue } }] };
  if (lead.waLink) properties['WhatsApp link'] = { url: lead.waLink };
  if (lead.message) properties.Notes = { rich_text: [{ text: { content: lead.message.slice(0, 1900) } }] };

  try {
    const res = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ parent: { database_id: NOTION_DB_ID }, properties }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error('[Notion] error', res.status, body);
      return { ok: false };
    }
    const data = (await res.json()) as { id: string };
    return { ok: true, id: data.id };
  } catch (err) {
    console.error('[Notion] fetch failed', err);
    return { ok: false };
  }
}
