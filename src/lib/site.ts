/**
 * Site-wide constants. Single source of truth for branding, contact details,
 * and SEO defaults. Keep in sync with structured data in JsonLd.astro and
 * with the contact info in src/components/Footer.astro.
 */

export const SITE = {
  name: 'The Atunbi Experience',
  shortName: 'Atunbi',
  tagline: 'Editorial Photography for London',
  description:
    'Editorial photography for London\'s most considered weddings, galas and portrait sittings — captured quietly, finished by hand.',
  defaultLocale: 'en-GB',
  url: import.meta.env.SITE ?? 'https://www.theatunbiexperience.com',
  twitter: '@atunbi',
  established: 2016,
  issueLabel: 'Issue N° 01',
  issueDate: 'Spring · 2026 · London',
  vol: 'Vol. I',
  category: 'Photography Quarterly',
} as const;

export const CONTACT = {
  email: 'hello@atunbi.com',
  phone: '+44 20 0000 0000',
  phoneDisplay: '+44 (0) 20 0000 0000',
  city: 'London',
  region: 'England',
  country: 'GB',
  postalCode: '',
  street: '',
} as const;

export const SOCIAL = {
  instagram: 'https://instagram.com/atunbi',
  linkedin: 'https://www.linkedin.com/in/atunbi',
  behance: 'https://www.behance.net/atunbi',
} as const;

export const NAV: Array<{ label: string; href: string }> = [
  { label: 'Plates', href: '/portfolio' },
  { label: 'Gallery', href: '/gallery' },
  { label: 'Lookbook', href: '/lookbook' },
  { label: 'Journal', href: '/blog' },
  { label: 'Atunbi', href: '/about' },
];

export const NAV_CTA = { label: 'Enquire', href: '/contact' };

// --- Lead generation layer ---
export const WHATSAPP = {
  number: import.meta.env.PUBLIC_WHATSAPP_NUMBER ?? '', // E.164, no leading + (e.g. "447900000000")
  label: 'WhatsApp',
} as const;

export const META = {
  pixelId: import.meta.env.PUBLIC_META_PIXEL_ID ?? '',
} as const;

export const PRICING = {
  weddingFromSix: 1200, // GBP — six-hour micro-package
  weddingFromFull: 1800,
  portraitFrom: 450,
  eventFrom: 1200,
  brandFrom: 1200,
} as const;

export const SERVICES = [
  {
    slug: 'weddings',
    label: 'Weddings',
    plate: 'Plate II',
    eyebrow: 'Section · Plate II · Weddings',
    headline: 'A Wedding, <em>Quietly Made.</em>',
    deck: 'Editorial wedding photography for London. Discreet on the day. Hand-finished after. From £1,200 for six hours — full-day coverage from £1,800.',
    href: '/weddings',
    eventType: 'wedding',
    waPrefill: 'Hi — I\'d love to chat about wedding photography. My date is [date] and venue is [venue].',
  },
  {
    slug: 'events',
    label: 'Events',
    plate: 'Plate III',
    eyebrow: 'Section · Plate III · Events',
    headline: 'Galas, <em>Considered.</em>',
    deck: 'Editorial documentary coverage for London galas, milestones and brand stories. From £1,200 — bespoke options for full-day or multi-room work.',
    href: '/events',
    eventType: 'gala',
    waPrefill: 'Hi — looking for event photography for [event type] on [date] in [location].',
  },
  {
    slug: 'portrait-sittings',
    label: 'Portrait Sittings',
    plate: 'Plate IV',
    eyebrow: 'Section · Plate IV · Portraits',
    headline: 'Sittings, in <em>Light.</em>',
    deck: 'Studio or location. Two styled looks. Twenty hand-finished frames. From £450.',
    href: '/portrait-sittings',
    eventType: 'portrait',
    waPrefill: 'Hi — interested in a portrait sitting. Looking at [timeframe].',
  },
] as const;

export type ServiceSlug = (typeof SERVICES)[number]['slug'];

