/**
 * Build-time gallery data. No API, no auth: we read the public R2 manifest
 * that theatunbiexperience.com's admin already publishes. Fetched once and
 * cached for the whole build.
 */

const MANIFEST_URL =
  import.meta.env.GALLERY_MANIFEST_URL ??
  'https://assets.theatunbiexperience.com/gallery/manifest.json';

export const ASSETS_BASE =
  import.meta.env.ASSETS_BASE ?? 'https://assets.theatunbiexperience.com';

export type Section = 'weddings' | 'portraits' | 'events' | 'personal-work';

const SECTION_LABEL: Record<Section, string> = {
  weddings: 'Weddings',
  portraits: 'Portraits',
  events: 'Events',
  'personal-work': 'Personal Work',
};

const SECTION_ORDER: Section[] = ['weddings', 'portraits', 'events', 'personal-work'];
const DEFAULT_SECTION: Section = 'personal-work';

export interface ManifestItem {
  key: string;
  section?: string;
  alt?: string;
  caption?: string;
  description?: string;
  tags?: string[];
  width: number;
  height: number;
  order: number;
}

export interface Photo {
  /** absolute R2 origin URL (Astro resizes this at build) */
  url: string;
  alt: string;
  width: number;
  height: number;
}

export interface Gallery {
  slug: Section;
  title: string;
  photos: Photo[];
}

function isSection(v: unknown): v is Section {
  return v === 'weddings' || v === 'portraits' || v === 'events' || v === 'personal-work';
}

let _cache: Gallery[] | null = null;

export async function getGalleries(): Promise<Gallery[]> {
  if (_cache) return _cache;

  let items: ManifestItem[] = [];
  try {
    const res = await fetch(`${MANIFEST_URL}?t=${Date.now()}`, {
      headers: { 'cache-control': 'no-cache' },
    });
    if (res.ok) {
      const data = (await res.json()) as { items?: ManifestItem[] };
      items = Array.isArray(data.items) ? data.items : [];
    } else {
      console.warn(`[manifest] ${res.status} from ${MANIFEST_URL} — building empty`);
    }
  } catch (err) {
    console.warn('[manifest] fetch failed — building empty', err);
  }

  const bySection = new Map<Section, Photo[]>();
  for (const it of [...items].sort((a, b) => a.order - b.order)) {
    const sec: Section = isSection(it.section) ? it.section : DEFAULT_SECTION;
    if (!it.width || !it.height) continue; // need dims for zero-CLS
    const arr = bySection.get(sec) ?? [];
    arr.push({
      url: `${ASSETS_BASE}/${it.key.replace(/^\//, '')}`,
      alt: (it.alt && it.alt.trim()) || `${SECTION_LABEL[sec]} — ${arr.length + 1}`,
      width: it.width,
      height: it.height,
    });
    bySection.set(sec, arr);
  }

  _cache = SECTION_ORDER.filter((s) => (bySection.get(s)?.length ?? 0) > 0).map((s) => ({
    slug: s,
    title: SECTION_LABEL[s],
    photos: bySection.get(s)!,
  }));
  return _cache;
}

export async function getDefaultGallery(): Promise<Gallery | null> {
  const gs = await getGalleries();
  if (gs.length === 0) return null;
  return gs.find((g) => g.slug === DEFAULT_SECTION) ?? gs[0]!;
}
