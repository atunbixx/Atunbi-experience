# Architecture — classic-tatu

A written walkthrough of how this site is put together and why.

## One-paragraph summary

`classic.theatunbiexperience.com` is a static Astro site. At build time it
fetches one public JSON file (the R2 gallery manifest the main site's admin
publishes), groups images by `section` into galleries, and statically renders
a home page, a page per gallery, plus resume/motion/contact. Astro/Sharp
downloads each R2 original during the build and emits small responsive WebP
variants, so the deployed site ships only optimised images and zero
build-time secrets. The contact form is a single Cloudflare Pages Function.

## Why these choices

- **No API / no CMS.** The brief originally assumed a galleries API + a
  Cloudflare Images delivery URL. Neither exists: the real backend is an R2
  bucket whose `gallery/manifest.json` is publicly readable. So the build
  just `fetch()`es that file. The existing admin *is* the CMS.
- **Build-time image resizing instead of Cloudflare Images.** The zone is on
  Cloudflare's Free plan (no `/cdn-cgi/image/`), and Cloudflare Images is a
  paid add-on the owner declined. Astro's default Sharp image service fetches
  the remote R2 originals at build and produces 400/800/1200/1800 WebP files
  in `dist/_astro/`. Result: the spec's responsive `srcset` + ≥95 Lighthouse,
  fully static, host-agnostic, no paid services.
- **Astro, static, plain CSS.** ~Zero JS except the lightbox and the small
  drawer/share script. Matches the reference site's lean output.
- **Sections → galleries.** The manifest tags each image with a `section`
  (`weddings | portraits | events | personal-work`). Each non-empty section
  becomes a gallery and a PORTFOLIO dropdown entry. New uploads appear on the
  next build — no code change.

## Data flow

```
admin (theatunbiexperience.com) ──uploads──▶ R2: gallery/manifest.json (public)
                                                     │  fetch() at build
                                                     ▼
                          src/lib/manifest.ts  (cached once per build)
                                                     │
                 ┌───────────────┬───────────────────┼───────────────┐
                 ▼               ▼                   ▼                ▼
            index.astro     [slug].astro        Base nav         sitemap.xml
          (default gallery) (one per section)  (dropdown)
                 │               │
                 ▼               ▼
          Grid.astro  ── Astro <Image> remote ──▶ dist/_astro/*.webp (resized)
          Lightbox.astro ── PhotoSwipe v5 (#i-{index} hash, keys, swipe)
```

## Files that matter

| File | Role |
|---|---|
| `src/lib/manifest.ts` | Build-time fetch, types, section→gallery grouping, default-gallery pick |
| `src/layouts/Base.astro` | Header (centered nav, dynamic PORTFOLIO dropdown, logo), SEO/OG/canonical, © footer, mobile drawer + Share |
| `src/components/Grid.astro` | CSS-columns masonry, build-resized `<Image>`, dominant-colour-less neutral placeholder + fade-in, right-click/drag soft deterrent |
| `src/components/Lightbox.astro` | PhotoSwipe v5, white bg, 5% padding, hash routing, preload ±1 |
| `src/pages/*` | index / [slug] / resume / motion / contact / sitemap.xml |
| `functions/api/contact.ts` | CF Pages Function: validate + honeypot + KV rate-limit + Resend |

## Performance & accessibility

- Every image has explicit `width`/`height` and an aspect-ratio box → CLS ≈ 0.
- `loading="lazy"`, `decoding="async"`, responsive `srcset`/`sizes`.
- `prefers-reduced-motion` disables the fade-in.
- All nav/lightbox controls keyboard-reachable; visible focus ring.
- `alt` from the manifest; falls back to `{Gallery} — {n}`.

## Known trade-offs / notes

- **No `dominantColor`** in the manifest → placeholder is a neutral `#f3f3f3`
  (no coloured blur-up). Layout still doesn't shift (dimensions are known).
- **Resume / Motion / bio** ship with clearly-marked placeholder content.
- Build time scales with image count (each original is fetched + resized).
  Fine for a portfolio; if the bank grows to thousands, switch to a
  CDN-resize step.
- The contact `from:` uses `CONTACT_TO_EMAIL`'s domain — that domain must be
  verified in Resend for delivery.
