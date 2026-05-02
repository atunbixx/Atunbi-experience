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
  url: import.meta.env.SITE ?? 'https://www.theatunbiexperience.co.uk',
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
