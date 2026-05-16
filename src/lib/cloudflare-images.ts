/*
 * Cloudflare Images adapter.
 *
 * Why Cloudflare Images (not R2 + Image Resizing): it returns width/height
 * metadata, supports named + flexible variants, signed delivery, and a simple
 * upload API the studio admin can drive. The justified gallery NEEDS intrinsic
 * dimensions to lay out symmetrically — Cloudflare Images gives us that for free.
 *
 * Delivery URL shape:
 *   https://imagedelivery.net/<ACCOUNT_HASH>/<IMAGE_ID>/<VARIANT>
 * With flexible variants enabled you can also pass resize params:
 *   .../<IMAGE_ID>/w=1600,quality=82,format=auto
 *
 * Only PUBLIC_CF_IMAGES_HASH is needed at build/runtime to render images.
 * The account API token is only needed if/when we add a build-time sync that
 * lists images + their dimensions automatically.
 */

const HASH = import.meta.env.PUBLIC_CF_IMAGES_HASH ?? '';

export type CloudflareImage = {
  cloudflareId: string;
  width: number;
  height: number;
  alt: string;
  caption?: string;
  description?: string;
  tags?: string[];
};

export function isConfigured(): boolean {
  return Boolean(HASH);
}

/** Named-variant URL (variants are defined in the Cloudflare dashboard). */
export function cfUrl(id: string, variant = 'public'): string {
  if (!HASH) return '';
  return `https://imagedelivery.net/${HASH}/${id}/${variant}`;
}

/**
 * Flexible-variant URL with on-the-fly resize (requires "flexible variants"
 * toggled on in the Cloudflare Images dashboard). Mirrors the reference site's
 * `rs:fit:1500` behaviour.
 */
export function cfResized(
  id: string,
  opts: { width?: number; quality?: number; fit?: 'scale-down' | 'contain' | 'cover' } = {}
): string {
  if (!HASH) return '';
  const { width = 1600, quality = 82, fit = 'scale-down' } = opts;
  return `https://imagedelivery.net/${HASH}/${id}/w=${width},quality=${quality},fit=${fit},format=auto`;
}

/** Responsive srcset across the widths the justified gallery asks for. */
export function cfSrcset(id: string, widths: number[] = [480, 800, 1200, 1600, 2000]): string {
  if (!HASH) return '';
  return widths.map((w) => `${cfResized(id, { width: w })} ${w}w`).join(', ');
}
