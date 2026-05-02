# Plan — Blog, SEO Tooling, Photo Management & Admin

> Goal: keep the editorial design 1:1, but turn the site from a single static HTML file into a properly indexable, content-managed site with a blog, real photo galleries, and a self-serve admin UI with SEO checking tools.

---

## 1. Strategic decisions (and why)

### 1.1 Stack: **Astro + Keystatic + Vercel**

| Need | Choice | Why |
|---|---|---|
| Static-site generator | **Astro** | Outputs pure HTML by default (best SEO + performance). File-based routing for blog posts. Built-in sitemap, RSS, image optimization, content collections. Zero JS shipped unless we ask for it. |
| Content management UI | **Keystatic** | Git-based CMS, content stored as markdown/JSON in the repo. First-class Astro integration. Auths via a GitHub App — **no OAuth proxy required**, works natively on Vercel. Modern UI, real WYSIWYG, image uploads, schema-validated forms (so SEO fields like alt text and meta description are *forced*). |
| Hosting + auth | **Vercel** (already in use) | Stay put. Vercel + Astro is a first-class combo: free SSL, automatic deploys on `git push`, image optimization, edge functions for the contact form, preview deploys per branch. Keystatic's GitHub-App auth works on any host, so no migration needed. |
| Image optimisation | **Astro's `<Image />`** + `astro:assets` (with Vercel's image service) | Automatic WebP/AVIF, lazy-loading, responsive `srcset`. Vercel's image CDN serves optimized variants on demand. Critical for both Core Web Vitals and SEO. |
| SEO audit | **Custom build-time linter + in-browser admin panel** | Runs on every build (fails Vercel build on errors), plus a live audit page inside the admin so Atunbi can see issues without reading logs. |
| Contact form | **Vercel serverless function** + Resend / Postmark | Replaces the current `mailto:`. Spam-protected with Turnstile/hCaptcha. |

### 1.2 Single page vs. multi-page

Splitting wins on SEO. Each page becomes a separate ranked entry, can target distinct keywords, and gets its own meta tags / OG image / structured data. Recommendation:

- `/` — home (current cover + plates teaser + featured blog posts + CTA)
- `/portfolio` — full plates gallery (real photos, lightbox)
- `/portfolio/[slug]` — individual project case studies (huge SEO win — long-tail keywords like "Mayfair wedding photographer")
- `/blog` — blog index (paginated)
- `/blog/[slug]` — individual posts
- `/lookbook` — pricing / packages (ranks for "London wedding photographer pricing" etc.)
- `/about` — Atunbi bio
- `/contact` — proper form, not just `mailto:`
- `/admin` — Decap CMS (gated)
- `/admin/seo` — custom SEO audit dashboard

Existing single-page nav anchors (`#plates`, `#why`…) keep working as homepage section IDs, so anyone with the old links still lands somewhere sensible.

---

## 2. Repo structure after migration

```
Atunbi-experience/
├── astro.config.mjs           # site URL, integrations (sitemap, mdx, image, keystatic)
├── keystatic.config.ts        # CMS schema — collections, fields, validation
├── package.json
├── vercel.json                # build + redirects + headers
├── public/
│   ├── robots.txt
│   └── favicon.svg
├── src/
│   ├── content/
│   │   ├── config.ts          # Astro content collections (Zod), mirrors Keystatic schema
│   │   ├── blog/              # *.md posts (managed via Keystatic)
│   │   ├── projects/          # portfolio case studies (managed via Keystatic)
│   │   └── pages/             # editable page content (hero copy, etc.)
│   ├── assets/uploads/        # Keystatic-uploaded images land here
│   ├── layouts/
│   │   ├── BaseLayout.astro   # <head>, schema.org JSON-LD, OG tags
│   │   ├── PageLayout.astro   # masthead + nav + footer
│   │   └── PostLayout.astro   # blog post template (article schema)
│   ├── components/
│   │   ├── Masthead.astro
│   │   ├── Nav.astro
│   │   ├── Footer.astro
│   │   ├── PlateCard.astro    # replaces .plate-card with real <Image/>
│   │   ├── PullQuote.astro
│   │   ├── Lookbook.astro
│   │   ├── ContactForm.astro
│   │   └── seo/
│   │       ├── SEOHead.astro  # title/desc/canonical/OG/twitter
│   │       └── JsonLd.astro   # LocalBusiness + Article schema
│   ├── pages/
│   │   ├── index.astro
│   │   ├── portfolio/index.astro
│   │   ├── portfolio/[slug].astro
│   │   ├── blog/index.astro
│   │   ├── blog/[...page].astro
│   │   ├── blog/[slug].astro
│   │   ├── lookbook.astro
│   │   ├── about.astro
│   │   ├── contact.astro
│   │   ├── rss.xml.ts         # auto RSS feed
│   │   └── admin/seo.astro    # SEO audit dashboard
│   ├── lib/
│   │   ├── seo-audit.ts       # the linter (also runs at build)
│   │   ├── keyword-linker.ts  # auto-internal-linking helper
│   │   └── reading-time.ts
│   └── styles/
│       └── global.css         # the existing CSS, lifted verbatim
└── scripts/
    └── seo-check.mjs          # CLI version of the audit (CI gate)
```

The existing `index.html` is **deleted** at the end — its contents are decomposed into `BaseLayout`, `Masthead`, `Nav`, sections, and `Footer`. **The CSS is moved 1:1 into `src/styles/global.css`** so the design is identical.

---

## 3. Blog (the SEO core)

### 3.1 Content schema (`src/content/config.ts`)

```ts
const blog = defineCollection({
  schema: ({ image }) => z.object({
    title: z.string().max(60),                  // SEO: title tag length
    description: z.string().min(50).max(160),   // SEO: meta description
    pubDate: z.date(),
    updatedDate: z.date().optional(),
    heroImage: image(),
    heroAlt: z.string().min(5),                 // forces alt text
    category: z.enum(['Weddings','Galas','Portraits','Brand','Behind the Lens']),
    tags: z.array(z.string()),
    keywords: z.array(z.string()).min(1),       // primary + secondary keywords
    canonical: z.string().url().optional(),
    draft: z.boolean().default(false),
  }),
});
```

Schema enforcement = SEO hygiene by construction. Decap CMS reads the same fields and presents form inputs.

### 3.2 Per-post SEO features (automatic)

- `<title>` ≤ 60 chars, `<meta name="description">` 50–160 chars
- Canonical URL
- Open Graph + Twitter card tags
- JSON-LD `Article` schema with author, datePublished, image
- Auto-generated `og:image` (Astro can render to PNG via `@vercel/og`-style endpoint)
- Reading time, breadcrumbs
- Related posts (by tag overlap)
- Auto-linked keywords (see §4.2)
- RSS feed at `/rss.xml`
- Sitemap entry (via `@astrojs/sitemap`)

---

## 4. SEO tools (the part the user specifically asked for)

### 4.1 Build-time auditor (`src/lib/seo-audit.ts` + `scripts/seo-check.mjs`)

Runs against every rendered HTML page. Each rule returns `{ level: 'error'|'warn'|'info', message, page, fix }`.

Rules (v1):

| ID | Rule |
|---|---|
| H1-001 | Exactly one `<h1>` per page |
| H1-002 | `<h1>` text is non-empty and ≤ 70 chars |
| Hx-001 | Heading levels never skip (no `h2 → h4`) |
| TITLE-001 | `<title>` exists, 10–60 chars |
| DESC-001 | Meta description exists, 50–160 chars |
| CANON-001 | Canonical URL present and absolute |
| OG-001 | `og:title`, `og:description`, `og:image`, `og:url` all present |
| IMG-001 | Every `<img>` has non-empty `alt` (or `alt=""` only when role="presentation") |
| IMG-002 | Hero image has explicit `width`/`height` (CLS) |
| LINK-001 | Every internal link resolves (no 404s) |
| LINK-002 | Page has ≥ 2 internal outbound links (orphan check) |
| LINK-003 | External links to non-trusted domains use `rel="nofollow noopener"` |
| KW-001 | Primary keyword appears in `<title>`, `<h1>`, first paragraph, and meta description |
| KW-002 | Keyword density 0.5%–2.5% (not stuffed) |
| LANG-001 | `<html lang="en-GB">` set |
| ROBOTS-001 | Page is not accidentally `noindex` unless drafted |
| SCHEMA-001 | JSON-LD validates (Article on posts, LocalBusiness on home/contact) |
| SITEMAP-001 | Page is in `sitemap.xml` |
| PERF-001 | Page weight under 1MB, JS under 100KB |

`npm run seo:check` runs all rules, exits non-zero on any error → fails the Netlify build → bad SEO never goes live.

### 4.2 Keyword linker (`src/lib/keyword-linker.ts`)

A markdown remark plugin. You define a JSON list:

```json
{
  "Mayfair wedding": "/portfolio/mayfair-wedding-2026",
  "editorial portrait": "/portfolio/editorial-portraits",
  "London wedding photographer": "/lookbook"
}
```

When any blog post mentions these phrases (first occurrence, case-insensitive, outside code/links), it auto-links them. This builds internal-link equity automatically — one of the highest-ROI SEO tactics.

### 4.3 Admin SEO dashboard (`/admin/seo`)

A real page (gated by Netlify Identity) showing:

1. **Site health**: green/yellow/red per page — last build's audit results
2. **Per-post checklist** — same rules, scoped to the post you're editing
3. **Keyword coverage map** — table of "target keyword → does any page rank for it"
4. **Broken links** scanner
5. **Missing alt text** scanner
6. **Canonical conflicts** detector
7. **Lighthouse-style preview** (Performance / Accessibility / SEO scores via PageSpeed Insights API)
8. **Live SERP preview** — shows how the page looks in Google (title + URL + description)

This is just a static Astro page that reads `dist/seo-report.json` produced by the build, so no backend needed.

---

## 5. Photo management (the "boxes have no photos" problem)

### 5.1 Replace gradient placeholders with real images

Each `.plate-image` div becomes:

```astro
<Image
  src={plate.image}
  alt={plate.alt}
  width={1200} height={900}
  formats={['avif','webp']}
  loading="lazy"
/>
```

`plate.image` comes from a content collection — either a portfolio case study (`src/content/projects/*.md`) or a homepage `plates.json` config that Decap CMS edits.

### 5.2 Keystatic upload UX

Single TypeScript config at `keystatic.config.ts` (type-checked, autocompletes in editor):

```ts
import { config, fields, collection, singleton } from '@keystatic/core';

export default config({
  storage: { kind: 'github', repo: { owner: 'atunbixx', name: 'Atunbi-experience' } },
  ui: { brand: { name: 'The Atunbi Experience' } },
  singletons: {
    plates: singleton({
      label: 'Homepage Plates',
      path: 'src/content/plates/',
      schema: {
        items: fields.array(
          fields.object({
            image: fields.image({ directory: 'src/assets/uploads/plates', publicPath: '/uploads/plates/' }),
            alt: fields.text({ label: 'Alt text', validation: { length: { min: 5 } } }),  // FORCED
            title: fields.text({ label: 'Title' }),
            category: fields.select({
              label: 'Category',
              options: [
                { label: 'Weddings', value: 'weddings' },
                { label: 'Corporate', value: 'corporate' },
                { label: 'Portraits', value: 'portraits' },
                { label: 'Galas', value: 'galas' },
                { label: 'Cultural', value: 'cultural' },
                { label: 'Brand', value: 'brand' },
              ], defaultValue: 'weddings',
            }),
          }),
          { itemLabel: p => p.fields.title.value || 'Plate' }
        ),
      },
    }),
  },
  collections: {
    projects: collection({
      label: 'Portfolio Projects',
      path: 'src/content/projects/*',
      slugField: 'slug',
      schema: {
        title: fields.text({ label: 'Title', validation: { length: { max: 60 } } }),
        slug: fields.slug({ name: { label: 'Slug' } }),
        heroImage: fields.image({ directory: 'src/assets/uploads/projects' }),
        heroAlt: fields.text({ label: 'Hero alt text', validation: { length: { min: 5 } } }),
        gallery: fields.array(fields.image({ directory: 'src/assets/uploads/projects' })),
        description: fields.text({ label: 'SEO description', multiline: true,
          validation: { length: { min: 50, max: 160 } } }),
        keywords: fields.array(fields.text({ label: 'Keyword' })),
        body: fields.markdoc({ label: 'Body' }),
      },
    }),
    blog: collection({
      label: 'Blog Posts',
      path: 'src/content/blog/*',
      slugField: 'slug',
      schema: { /* matches §3.1 schema, every SEO field required */ },
    }),
  },
});
```

Atunbi visits `/keystatic`, signs in with GitHub (one-click after the GitHub App is installed), drags a photo in, fills out alt text (the form **requires** ≥ 5 chars, enforcing IMG-001), hits save — Keystatic commits straight to `main`, Vercel rebuilds, site is live in ~60s. No OAuth proxy, no Identity service, no separate admin HTML to maintain.

### 5.3 Image pipeline

- Decap uploads originals to `src/assets/uploads/`
- At build, Astro auto-generates AVIF + WebP at multiple sizes
- Lazy-load below the fold (already on by default)
- Hero images get `fetchpriority="high"`
- Lightbox on portfolio pages — small JS island only on those routes

---

## 6. Other SEO must-haves

- `robots.txt` — allow all, point to sitemap
- `sitemap.xml` — auto-generated by `@astrojs/sitemap`
- `humans.txt` — nice touch
- Structured data: `LocalBusiness` (with address, phone, hours) on home/contact, `Photographer` (`Person`) on about, `Article` on posts, `BreadcrumbList` everywhere
- Custom 404 page
- 301 redirects for any old URLs in `vercel.json`
- `lang="en-GB"` (London-based, target UK)
- Real `<address>` block in footer
- Phone in `tel:` format (already done)
- Replace placeholder phone `+44 (0) 20 0000 0000` with real number
- Google Search Console verification meta tag
- Plausible or GA4 (privacy-respecting analytics — recommend Plausible)

---

## 7. Implementation order (suggested)

1. **Bootstrap Astro project alongside existing `index.html`** — `npm create astro@latest`, pick "empty" template, TypeScript strict.
2. **Lift CSS verbatim** into `src/styles/global.css`. Build `BaseLayout`, `Masthead`, `Nav`, `Footer` from existing markup. Build homepage `index.astro`. Visually diff against the original — must be byte-identical.
3. **Add SEO primitives** — `SEOHead.astro`, `JsonLd.astro`, sitemap, RSS, robots.txt.
4. **Build content collections** — `blog`, `projects`, `plates.json`. Seed with 1 example each.
5. **Wire blog index + post template + pagination + RSS.**
6. **Build portfolio index + case study template.**
7. **Replace gradient plates with real `<Image />`** driven by `plates.json`.
8. **Add SEO audit linter** (`src/lib/seo-audit.ts` + `scripts/seo-check.mjs`) and CI gate.
9. **Add keyword auto-linker** as a remark plugin.
10. **Stand up Keystatic** — install the integration, define `keystatic.config.ts`, install the Keystatic GitHub App on the repo, mount the admin route at `/keystatic`.
11. **Configure Vercel** — point the existing project at this repo (or create a new one), set framework preset = Astro, enable preview deployments per branch, add env vars for Keystatic (GitHub App ID, secret).
12. **Build SEO admin dashboard** at `/admin/seo` (gated behind Keystatic auth).
13. **Migrate `mailto:` to a real contact form** — Vercel serverless function + Resend, with Turnstile spam protection.
14. **Add structured data, OG image generator (Vercel OG), custom 404.**
15. **Delete original `index.html`.** Final QA.

---

## 8. Critical files to create / change

- `astro.config.mjs` — site URL, integrations (`sitemap`, `mdx`, `image`, `keystatic`, `react` for the Keystatic UI)
- `vercel.json` — redirects, headers, function config (only if defaults aren't enough — usually not)
- `keystatic.config.ts` — CMS schema (collections, fields, validation)
- `src/content/config.ts` — Astro content collections (Zod schemas, mirror Keystatic schema)
- `src/layouts/BaseLayout.astro` — `<head>`, OG, JSON-LD
- `src/components/seo/SEOHead.astro` — per-page meta
- `src/styles/global.css` — current CSS, lifted
- `src/pages/index.astro` — homepage, currently `index.html`
- `src/pages/blog/[...slug].astro` — blog template
- `src/pages/portfolio/[slug].astro` — case studies
- `src/pages/admin/seo.astro` — audit dashboard
- `src/lib/seo-audit.ts` + `scripts/seo-check.mjs` — the linter
- `src/lib/keyword-linker.ts` — auto-link remark plugin
- **DELETE** `index.html` at the end

---

## 9. Verification

End-to-end test plan once everything is in place:

1. `npm run dev` → site looks **byte-identical** to original at `/` (visual diff in browser).
2. Visit `/blog`, see seeded post; click through to post; check `view-source:` for `<title>`, `<meta name="description">`, JSON-LD, canonical.
3. `curl http://localhost:4321/sitemap-index.xml` returns valid XML containing all pages.
4. `curl http://localhost:4321/rss.xml` returns valid RSS 2.0.
5. `npm run seo:check` runs all rules, exits 0 on a clean build.
6. Intentionally break a rule (delete an `<h1>`) → `seo:check` exits non-zero with the page name + rule ID + suggested fix.
7. Visit `/admin`, log in via Netlify Identity, create a draft blog post, upload a photo — see it on the site after deploy.
8. Visit `/admin/seo`, see audit table with per-page green/yellow/red and broken-link list.
9. Run Lighthouse on each page: SEO ≥ 100, Accessibility ≥ 95, Performance ≥ 90 on mobile.
10. Validate structured data with Google Rich Results Test on home + a blog post + a portfolio page.
11. Submit `sitemap.xml` to Google Search Console; confirm pages indexed within ~48h.

---

## 10. Out of scope for v1 (note for later)

- Multilingual (en-GB only for now)
- E-commerce (booking deposits via Stripe) — could come later
- Customer login / private galleries — separate project
- Newsletter signup — easy add (Buttondown / ConvertKit form), can fold into v1 if wanted
- Video content / vlog — Decap supports it but adds weight; defer

---

## 11. Risks / things to flag

- **No hosting change needed**: staying on Vercel. Keystatic auths via GitHub App, so no Vercel-specific lock-in.
- **Domain**: site needs a real domain (`atunbi.com` or `theatunbiexperience.co.uk`) for SEO, OG images, JSON-LD `LocalBusiness`. The current `*.vercel.app` subdomain is fine for dev only.
- **Real photos required** before §5 is meaningful — I can wire up the structure with placeholders, but Atunbi needs to upload actual images for the portfolio to look real.
- **Phone number / address** are currently placeholders (`+44 (0) 20 0000 0000`) — needs real values for `LocalBusiness` schema to be valid.
- **Build time**: with image optimisation, builds will go from ~0s (current) to ~30–60s. Still well under Vercel's limits.
- **Keystatic auth setup**: requires installing the Keystatic GitHub App on the repo (one-time, takes ~2 minutes). The app only gets access to this repo. Source: [keystatic.com/docs/installation-astro](https://keystatic.com/docs/installation-astro).
- **Vendor lock-in**: minimal. Astro + markdown content + GitHub-stored images means everything is portable — could move to Netlify, Cloudflare Pages, or even GitHub Pages later with no code changes.
