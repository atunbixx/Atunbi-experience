# classic-tatu

Minimalist, editorial portfolio for **classic.theatunbiexperience.com** — a
Format-style site (reference: susanzey.com) built on Astro, served fully
static, consuming the **public R2 gallery manifest** that the main
theatunbiexperience.com admin already publishes. No API, no CMS, no secrets.

## Local dev

```sh
pnpm install
pnpm dev          # http://localhost:4321
pnpm build        # static output → dist/
pnpm preview      # serve the build locally
```

The build fetches `https://assets.theatunbiexperience.com/gallery/manifest.json`
once and statically generates every page. Images are the R2 originals,
**resized at build time by Astro/Sharp** into 400/800/1200/1800 WebP — no
Cloudflare Images needed.

## Environment variables

Copy `.env.example`. None are required for the gallery (the manifest is
public). For the contact form, set these **in the Cloudflare Pages dashboard**
(never commit):

| Var | Where | Purpose |
|---|---|---|
| `SITE_URL` | Build | Canonical/OG base. Default `https://classic.theatunbiexperience.com` |
| `GALLERY_MANIFEST_URL` | Build | Override only if the manifest URL moves |
| `RESEND_API_KEY` | Function (secret) | Sends the contact email |
| `CONTACT_TO_EMAIL` | Function | Destination inbox (e.g. `hello@atunbi.com`) |
| `MOTION_EMBED_URL` | Build | Reel iframe src (Vimeo/YouTube embed) |
| `PLAUSIBLE_DOMAIN` | Build | If set, injects the Plausible script. Otherwise no analytics |

Bind a KV namespace named **`CONTACT_RL`** to the Pages project (contact
rate-limit, 3/hour/IP).

## Adding a gallery — it's automatic

You do **not** touch this repo to add photos. Upload via the existing
theatunbiexperience.com admin (`/admin/gallery`), choosing the section
(Weddings / Portraits / Events / Personal Work). Each section with photos
becomes a gallery here and appears in the PORTFOLIO dropdown automatically on
the next build. Trigger a rebuild with a **Cloudflare Pages Deploy Hook**:

1. Cloudflare Pages → project `classic-tatu` → Settings → Builds & deployments
   → **Deploy hook** → create one, copy the URL.
2. Add that URL to the main site's publish flow (the gallery commit handler
   already pings `VERCEL_DEPLOY_HOOK_URL`; add the Pages hook alongside it, or
   trigger manually) so a new upload rebuilds this site too.

## Replace the placeholder logo

`public/logo.svg` is a text placeholder. Drop the real wordmark there (keep
the filename, ~200px wide) — no code change needed.

## Deploy (Cloudflare Pages)

See `docs/ARCHITECTURE.md` for the full walkthrough. Summary:

1. Push this repo to GitHub.
2. Cloudflare Pages → Create project → connect the repo. Build command
   `pnpm build`, output dir `dist`.
3. Set the env vars above; bind the `CONTACT_RL` KV namespace.
4. Add custom domain `classic.theatunbiexperience.com`; create the proxied
   CNAME in the theatunbiexperience.com Cloudflare DNS zone.
5. Verify HTTPS, run Lighthouse, click through galleries + lightbox + form.
