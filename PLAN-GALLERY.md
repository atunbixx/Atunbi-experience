# Plan — Gallery & Imagery, Format/Squarespace-grade

> Goal: bring the imagery and gallery experience to the level of top Format and Squarespace photographer templates (Forte, Brine, Wexley, Five, Format's editorial/portfolio templates). Keep the editorial design language we already have.

## Current state — quick honest audit

The site I just built has a working gallery, but it's the bare-minimum CSS-grid version:

| Feature | Today | Top template benchmark |
|---|---|---|
| Lightbox | None — clicking opens raw image in a new tab | Full-screen lightbox with prev/next, keyboard nav, swipe, image counter, captions |
| Gallery layout | `repeat(auto-fit, minmax(280px,1fr))` with forced `4:3` crop on every photo | Justified rows or masonry — **preserves each image's natural aspect ratio** |
| Project hero | Modest 16:10 with side margins | Full-bleed cinematic hero, often 100vh on landing |
| Scroll behaviour | Static — everything pops in | Subtle fade-up / blur-up on scroll, IntersectionObserver-driven |
| Inter-project navigation | None — dead-end at each case study | "Next project →" with cover image preview at bottom of every project |
| Loading state | Lazy-loaded images "pop" in | Blur-up placeholders or fade-in for a polished feel |
| Site-wide gallery | None | Optional `/gallery` page collating every image, lightboxable |
| Caption / EXIF | Caption field exists but not displayed | Caption shown in lightbox + (optional) date/venue meta |
| Mobile gestures | None | Pinch-zoom and swipe in lightbox |

Everything else (typography, palette, masthead, image optimisation pipeline, alt-text enforcement) is already at template grade.

## Decisions (and why)

### 1. Lightbox: **PhotoSwipe v5** (vanilla)

The gold standard for photographer sites. Used by Format, 500px, Behance galleries, countless Squarespace customisations. ~22 KB gzipped, framework-agnostic, has zoom + pinch + keyboard + swipe + image counter + caption out of the box. We initialise it as an Astro client island so **public pages ship zero JS unless a gallery is actually present**.

Alternatives considered: `yet-another-react-lightbox` (would force React on portfolio pages — currently React only loads on `/keystatic`); `glightbox` (smaller but visibly less polished). PhotoSwipe wins on quality and zero-React.

### 2. Gallery layout: **Masonry via CSS columns** (default) + **justified rows option**

CSS columns gives Pinterest-style staggered masonry with **zero JS** and preserves aspect ratios naturally:

```css
.gallery--masonry {
  column-count: 3; column-gap: 1rem;
}
.gallery--masonry > a { break-inside: avoid; margin-bottom: 1rem; }
@media (max-width: 900px) { .gallery--masonry { column-count: 2; } }
@media (max-width: 600px) { .gallery--masonry { column-count: 1; } }
```

Atunbi can choose `masonry` (default) or `justified` per project from Keystatic. Justified rows use `flexbox` with each image's `flex-grow` proportional to its aspect ratio — the standard Format approach. Both are pure CSS.

### 3. Hero: **full-bleed cinematic** with title overlay

Project hero becomes 80vh, full viewport width, image-as-background with the title and meta floated over a subtle gradient scrim at the bottom. Opt-in via project field — case studies without a hero image fall back to the current centred header.

### 4. Scroll reveals: **IntersectionObserver, no library**

Twenty lines of vanilla JS. Adds `data-reveal="visible"` when an element enters the viewport. CSS handles the actual animation (opacity + translateY). Respects `prefers-reduced-motion`.

### 5. Project-to-project navigation

A `<ProjectNav>` component at the bottom of every case study showing the previous and next project as side-by-side cover-image cards. Loops circularly so there's never a dead-end.

### 6. Site-wide `/gallery` page (small but high-impact)

A single page with every image from every project, masonry-laid-out, all sharing one lightbox instance. Top Format templates always have this — it's where prospective clients browse the body of work without the case-study narrative. **Auto-built** from project gallery contents — no extra CMS work needed.

### 7. Loading polish: **blur-up via dominant colour**

Each project gallery image gets a CSS `background-color` matching its dominant colour. Set automatically at build via `astro:assets` LQIP or `plaiceholder`. While the actual image streams in, the placeholder colour holds the layout — no white flash, no jank. If we don't want the build dependency, fall back to a low-opacity burgundy fade-in (still good).

I recommend `plaiceholder` for true LQIP. It runs at build, adds ~3s to build time, output is gorgeous. If that's too much, the fade-in alternative is a one-line CSS change.

## Files to create / change

```
src/
├── components/
│   ├── Lightbox.astro          NEW — PhotoSwipe init script (client island)
│   ├── ProjectNav.astro        NEW — prev/next project cards
│   ├── Reveal.astro            NEW — fade-up on scroll wrapper
│   ├── HeroImage.astro         NEW — full-bleed cinematic hero
│   └── Gallery.astro           NEW — handles masonry + justified + alt + lightbox attrs
├── pages/
│   ├── portfolio/[slug].astro  REWORKED — uses HeroImage + Gallery + ProjectNav
│   ├── portfolio/index.astro   REWORKED — masonry of project covers, hover effect
│   └── gallery.astro           NEW — site-wide masonry of every image
├── styles/global.css           EXTENDED — masonry, justified, hero, reveal animations
├── lib/lightbox.ts             NEW — small wrapper that lazy-imports PhotoSwipe + binds galleries
keystatic.config.ts             EXTENDED — add `layoutStyle` (masonry|justified) + `dominantColor` per gallery image
package.json                    +photoswipe (~22KB gzip), +plaiceholder (build-time only)
```

## Implementation details

### Gallery component API

```astro
---
// Props
interface Props {
  images: Array<{ src: ImageMetadata; alt: string; caption?: string; dominantColor?: string }>;
  layout?: 'masonry' | 'justified';
  groupId: string;   // shared id so all images on a page share one lightbox
}
---
<div class={`gallery gallery--${layout}`} data-pswp-gallery={groupId}>
  {images.map((img) => (
    <a
      href={img.src.src}
      data-pswp-width={img.src.width}
      data-pswp-height={img.src.height}
      data-caption={img.caption}
      style={img.dominantColor ? `background:${img.dominantColor}` : ''}
    >
      <Image src={img.src} alt={img.alt} ... />
    </a>
  ))}
</div>
```

### PhotoSwipe init (client island, deferred)

Loaded only when a `[data-pswp-gallery]` exists on the page:

```ts
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import 'photoswipe/style.css';

document.querySelectorAll('[data-pswp-gallery]').forEach((el) => {
  const lb = new PhotoSwipeLightbox({
    gallery: el as HTMLElement,
    children: 'a',
    pswpModule: () => import('photoswipe'),
    bgOpacity: 0.96,
    showHideAnimationType: 'fade',
  });
  lb.on('uiRegister', () => {
    lb.pswp?.ui?.registerElement({
      name: 'caption', order: 9, isButton: false, appendTo: 'root',
      html: '', onInit: (el, pswp) => {
        pswp.on('change', () => {
          const cur = pswp.currSlide?.data.element as HTMLElement;
          el.innerHTML = cur?.dataset.caption ?? '';
        });
      },
    });
  });
  lb.init();
});
```

### Hero (full-bleed)

```astro
<HeroImage src={heroImage} alt={heroAlt} title={title} kicker={`${category} · ${venue}`} height="80vh" />
```

CSS: 100vw width, fixed height, image as `<picture>` with object-fit cover, gradient scrim from transparent to ink at the bottom 40%, title and meta absolutely positioned in the bottom 10% with our existing Fraunces typography.

### Project pages — full new flow

```
[Full-bleed hero]
  → Breadcrumbs (subtle, on paper)
  → Article body (existing)
  → Gallery (masonry by default)
  → "Next Project →" (ProjectNav)
  → Final CTA strip
```

### Reveal animation

```css
[data-reveal] { opacity: 0; transform: translateY(20px); transition: opacity .8s ease, transform .8s ease; }
[data-reveal="visible"] { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) { [data-reveal] { opacity: 1; transform: none; transition: none; } }
```

### Keystatic additions

Per project:
- `layoutStyle: select('masonry'|'justified', default 'masonry')`
- `heroOverlay: select('light'|'dark', default 'dark')` — controls the scrim colour for legibility

Per gallery image:
- `caption: text({optional})` — shown in lightbox
- `dominantColor: text({optional, hidden})` — auto-filled at build by plaiceholder, but stored so future builds skip recomputation

### `/gallery` page

```astro
---
const projects = await getCollection('projects', ({data}) => !data.draft);
const allImages = projects.flatMap(p => p.data.gallery.map(g => ({...g, project: p.data.title, slug: p.slug})));
---
<Gallery images={allImages} layout="masonry" groupId="site-gallery" />
```

Caption auto-includes the project title, linkable in the lightbox.

## Implementation order

1. Install `photoswipe` and `plaiceholder` (or skip plaiceholder, decide before install).
2. Add CSS — masonry, justified, hero full-bleed, reveal.
3. Build `Gallery.astro` and `Lightbox.astro` (init script).
4. Build `HeroImage.astro` and `ProjectNav.astro`.
5. Rewire `portfolio/[slug].astro` end-to-end.
6. Rewire `portfolio/index.astro` to masonry of cover images.
7. Add `gallery.astro` site-wide page.
8. Extend Keystatic schema for `layoutStyle`, `caption`, `dominantColor`.
9. Wire plaiceholder at build (or fade-in fallback).
10. Re-run SEO audit, fix any new finding (image dimensions, alt text).
11. Verify in browser — open a project, click a thumbnail, swipe, keyboard-nav, close.

## What I'm explicitly NOT doing in v1 (and why)

- **Pinch-zoom UI customisation** — PhotoSwipe defaults are excellent.
- **Slideshow auto-advance mode** — niche, easy to add later.
- **Filterable portfolio by category** — can add as a v2 if Atunbi wants tag-based filtering.
- **EXIF data display** — most photog sites don't show this; clutter.
- **Print/order prints** — separate Stripe project.
- **Custom cursor** — fashionable but ages badly. Skipping.

## Verification

After build:
1. `npm run dev` → open any project page. Click a gallery image → lightbox opens with the right photo.
2. Press `→` and `←` → navigates. `Esc` closes. Swipe on mobile works.
3. Caption appears under the image in the lightbox.
4. Bottom of project shows next/previous project cards. Click → smooth navigation.
5. `/gallery` shows everything in masonry. Click any image → opens in shared lightbox.
6. Lighthouse mobile: SEO ≥ 100, Accessibility ≥ 95, Performance ≥ 90 (image optimisation already strong).
7. Without JS (devtools → disable JS) → gallery still renders, links go to raw images. Progressive enhancement intact.
8. `prefers-reduced-motion: reduce` → no fade animations. Verified via devtools rendering tab.
9. `npm run seo:check` → still passes.

## Effort estimate

- Lightbox + masonry: ~1 hour
- Hero full-bleed + ProjectNav + reveals: ~1 hour
- Site-wide /gallery page: ~30 min
- Keystatic schema + plaiceholder: ~30 min
- Polish + verify: ~30 min

Total ≈ 3.5 hours of focused work. End result: indistinguishable in quality from the best Format / Squarespace photographer templates, but with the editorial typography we already nailed.

## Risks / things to flag

- **plaiceholder build cost** — adds ~3s per gallery image. With 50+ images, build time grows noticeably. Cache the dominantColor in Keystatic so subsequent builds skip it.
- **PhotoSwipe CSS** — overrides our design language slightly (background opacity, button colours). I'll customise to match the burgundy/paper palette so the lightbox feels native, not bolted-on.
- **Real photos still required** — until Atunbi uploads actual images, the masonry layout shows our 6 placeholder gradient tiles which all have the same aspect ratio. The "wow factor" of the new gallery only kicks in once real photographs of varied aspect ratios are in the system.
