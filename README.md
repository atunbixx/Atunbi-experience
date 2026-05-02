# The Atunbi Experience

Editorial photography studio — London. Built with **Astro**, **Keystatic CMS**, deployed on **Vercel**.

This is the codebase. For an architectural overview and original design intent see [PLAN.md](./PLAN.md).

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:4321
```

Open `/` for the public site, `/keystatic` for the admin CMS, `/admin/seo` for the SEO audit dashboard (after a build).

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the Astro dev server with hot reload. |
| `npm run build` | Production build **and** run the SEO audit. Fails on SEO errors. |
| `npm run build:no-audit` | Production build without the SEO gate (use sparingly). |
| `npm run preview` | Preview the production build locally. |
| `npm run seo:check` | Re-run the SEO audit against an existing `dist/` build. |

## Project layout

```
src/
├── components/        Astro components (Masthead, Nav, Footer, PlateCard, SEO heads)
├── content/           Markdown + JSON managed by Keystatic
│   ├── blog/          Journal posts
│   ├── projects/      Portfolio case studies
│   ├── plates/        Homepage plates configuration
│   └── seo-keywords.json   Auto-link map: phrase → URL
├── layouts/           BaseLayout (head, SEO, JSON-LD), PageLayout (with chrome)
├── lib/
│   ├── site.ts             Brand, contact, social constants — single source of truth
│   ├── seo-rules.mjs       SEO audit rule library (used by CLI and build)
│   ├── keyword-linker.mjs  Remark plugin that auto-links target keywords
│   └── reading-time.ts
├── pages/             File-based routes (index, blog, portfolio, lookbook, about, contact, admin/seo, og, api/contact)
├── styles/global.css  All site styles (lifted verbatim from the original index.html, plus extensions)
└── assets/uploads/    Keystatic-managed images (created on first upload)

scripts/seo-check.mjs  CLI runner — walks dist/, runs every rule, writes dist/seo-report.json
keystatic.config.ts    CMS schema (collections, fields, validation)
astro.config.mjs       Site URL, integrations, markdown plugins
vercel.json            Cache headers + redirects
```

## SEO

Every build runs through a custom auditor with twenty rules covering:

- **Heads** — title length, meta description length, canonical URLs, Open Graph completeness, charset, viewport, html lang.
- **Headings** — exactly one `<h1>`, no skipped heading levels.
- **Images** — alt text presence, width/height for CLS.
- **Links** — every internal link resolves, page has ≥ 2 internal outbound links, external links use `rel="noopener"`.
- **Keywords** — primary keyword in title/h1/intro, density not stuffed.
- **Schema** — JSON-LD validates; `LocalBusiness`, `Article`, `BreadcrumbList`, `Person` emitted contextually.
- **Indexing** — robots noindex sanity-check, sitemap inclusion.

The auditor writes `dist/seo-report.json`, which the in-app dashboard at `/admin/seo` renders into a per-page traffic-light table.

## Keystatic CMS

Visit `/keystatic` to:

- Edit the homepage **Plates** singleton (six tiles + alt text).
- Manage **Journal** blog posts (markdown, with required SEO fields).
- Manage **Portfolio Projects** (case studies + galleries).
- Edit the **SEO keyword auto-linker map**.

Authentication is GitHub-based via the [Keystatic GitHub App](https://keystatic.com/docs/github-app). Install the app on the repo and set the env vars listed in `.env.example`.

## Deploying to Vercel

1. Connect the repo to Vercel — framework preset = Astro.
2. Set environment variables (see `.env.example`).
3. Push to `main` → automatic deploy. PRs get preview deployments.

The default build command (`npm run build`) runs the SEO audit; **errors fail the deploy**, so bad SEO never reaches production.

## Replacing the placeholder photos

The homepage plates and `/about` portrait currently use CSS gradients with the "AT" / "A" mark. To replace them with real photographs:

1. Open `/keystatic` → **Homepage Plates**.
2. For each plate, click "Image" → upload — alt text is required.
3. Save → Keystatic commits to `main` → Vercel rebuilds in ~60s.

Same flow for **Portfolio Projects** (hero + gallery) and **Journal** posts (hero image).

## Adding a blog post

Either:

- **CMS path** (recommended): `/keystatic` → Journal → New post. Form-validated.
- **Direct path**: drop a markdown file in `src/content/blog/` matching the schema in `src/content/config.ts`. Push to deploy.

Schema enforces: title 10–70 chars, description 50–170 chars, ≥ 1 keyword, valid category, required publish date. The build will fail if any required field is missing.

## What still needs real values

- **Domain**: site URL is currently `https://www.theatunbiexperience.co.uk` — update `src/lib/site.ts` and `astro.config.mjs` `SITE_URL` if different.
- **Phone**: `+44 (0) 20 0000 0000` is a placeholder — update `CONTACT.phone` and `CONTACT.phoneDisplay` in `src/lib/site.ts`.
- **Real photos**: see above.
- **Email**: `hello@atunbi.com` is the default; change in `src/lib/site.ts` if needed.

## Old single-page version

The original single-file design lives in git history (see commit before the Astro migration). Open the site repo on GitHub to view it.
