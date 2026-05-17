/*
 * Cloudflare R2 client + gallery manifest.
 *
 * R2 is S3-compatible, so we use the AWS S3 SDK pointed at the R2 endpoint.
 * Originals are stored in R2; Vercel optimises them on delivery (see Gallery).
 *
 * The gallery's source of truth is a single JSON object in the bucket:
 *   gallery/manifest.json  →  { items: GalleryEntry[] }
 * No database, no git writes — one system, survives every deploy.
 *
 * Secrets (NEVER client-side, set in Vercel env):
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
 * Public:
 *   PUBLIC_R2_BASE  e.g. https://assets.theatunbiexperience.com
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const ACCOUNT_ID = import.meta.env.R2_ACCOUNT_ID ?? '';
const ACCESS_KEY_ID = import.meta.env.R2_ACCESS_KEY_ID ?? '';
const SECRET_ACCESS_KEY = import.meta.env.R2_SECRET_ACCESS_KEY ?? '';
const BUCKET = import.meta.env.R2_BUCKET ?? 'theatunbiexperience-assets';

export const R2_PUBLIC_BASE =
  import.meta.env.PUBLIC_R2_BASE ?? 'https://assets.theatunbiexperience.com';

const MANIFEST_KEY = 'gallery/manifest.json';

export type GallerySection = 'weddings' | 'portraits' | 'events' | 'personal-work';

export const SECTIONS: { value: GallerySection; label: string }[] = [
  { value: 'weddings', label: 'Weddings' },
  { value: 'portraits', label: 'Portraits' },
  { value: 'events', label: 'Events' },
  { value: 'personal-work', label: 'Personal Work' },
];

// Entries uploaded before sections existed have no `section`; treat them as
// Personal Work so nothing the owner already uploaded disappears.
export const DEFAULT_SECTION: GallerySection = 'personal-work';

export function isSection(v: unknown): v is GallerySection {
  return v === 'weddings' || v === 'portraits' || v === 'events' || v === 'personal-work';
}

export type GalleryEntry = {
  key: string; // object path in the bucket, e.g. gallery/weddings/mayfair-01.jpg
  section: GallerySection;
  alt: string;
  caption?: string;
  description?: string;
  tags: string[];
  project?: string;
  width?: number;
  height?: number;
  order: number;
  uploadedAt: string;
};

export function itemsForSection(items: GalleryEntry[], section: GallerySection): GalleryEntry[] {
  return items
    .filter((it) => (isSection(it.section) ? it.section : DEFAULT_SECTION) === section)
    .sort((a, b) => a.order - b.order);
}

export type GalleryLayout = 'justified' | 'masonry';

export type GallerySettings = { layout: GalleryLayout };

export type Manifest = { items: GalleryEntry[]; settings?: GallerySettings };

export const DEFAULT_SETTINGS: GallerySettings = { layout: 'justified' };

export function r2Configured(): boolean {
  return Boolean(ACCOUNT_ID && ACCESS_KEY_ID && SECRET_ACCESS_KEY && BUCKET);
}

let _client: S3Client | null = null;
function client(): S3Client {
  if (_client) return _client;
  _client = new S3Client({
    region: 'auto',
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY },
    // AWS SDK v3 (>=3.729) injects x-amz-checksum-crc32 +
    // x-amz-sdk-checksum-algorithm into presigned PUT URLs. A plain browser
    // fetch PUT can't supply a matching checksum header, so R2 rejects it and
    // the upload fails. R2 doesn't require these — only compute a checksum
    // when the caller explicitly asks, keeping presigned PUTs clean.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
  return _client;
}

export function publicUrl(key: string): string {
  return `${R2_PUBLIC_BASE.replace(/\/$/, '')}/${key.replace(/^\//, '')}`;
}

/** Short-lived URL the browser PUTs the file straight to (bypasses the function body limit). */
export async function presignUpload(key: string, contentType: string, expiresIn = 600): Promise<string> {
  const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
  return getSignedUrl(client(), cmd, { expiresIn });
}

export async function deleteObject(key: string): Promise<void> {
  await client().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

/** Read the manifest. Tries the public URL first (fast, cached), falls back to S3 GET. */
export async function readManifest(): Promise<Manifest> {
  try {
    const res = await fetch(`${publicUrl(MANIFEST_KEY)}?t=${Date.now()}`, {
      headers: { 'cache-control': 'no-cache' },
    });
    if (res.ok) return (await res.json()) as Manifest;
  } catch {
    /* fall through */
  }
  if (!r2Configured()) return { items: [] };
  try {
    const out = await client().send(new GetObjectCommand({ Bucket: BUCKET, Key: MANIFEST_KEY }));
    const text = await out.Body?.transformToString();
    return text ? (JSON.parse(text) as Manifest) : { items: [] };
  } catch {
    return { items: [] };
  }
}

export async function writeManifest(manifest: Manifest): Promise<void> {
  await client().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: MANIFEST_KEY,
      Body: JSON.stringify(manifest, null, 2),
      ContentType: 'application/json',
      CacheControl: 'public, max-age=30',
    })
  );
}

/** Optional: ping a Vercel deploy hook so a new upload goes live without a manual redeploy. */
export async function triggerRebuild(): Promise<void> {
  const hook = import.meta.env.VERCEL_DEPLOY_HOOK_URL;
  if (!hook) return;
  try {
    await fetch(hook, { method: 'POST' });
  } catch {
    /* non-fatal */
  }
}
