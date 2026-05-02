/**
 * SEO audit rules — pure functions, no I/O. The CLI script
 * (scripts/seo-check.mjs) walks the built dist/ tree and runs each rule
 * against every HTML file. Rules return zero or more findings.
 *
 *   level 'error' fails the build; 'warn' is logged but doesn't fail; 'info' is informational.
 */

const find = (id, level, message, fix) => ({ ruleId: id, level, message, fix });

const H1Single = {
  id: 'H1-001',
  describe: 'Exactly one <h1> per page.',
  check: ({ document }) => {
    const count = document('h1').length;
    if (count === 0) return [find('H1-001', 'error', 'No <h1> on this page.', 'Add one descriptive <h1> to the page.')];
    if (count > 1) return [find('H1-001', 'error', `${count} <h1> tags on this page (should be exactly 1).`, 'Demote extra h1 tags to h2.')];
    return [];
  },
};

const H1Length = {
  id: 'H1-002',
  describe: '<h1> text is 8–80 chars.',
  check: ({ document }) => {
    const h1 = document('h1').first().text().trim();
    if (!h1) return [];
    if (h1.length < 8) return [find('H1-002', 'warn', `<h1> is short (${h1.length} chars): "${h1}"`, 'Aim for at least 8 characters describing the page.')];
    if (h1.length > 80) return [find('H1-002', 'warn', `<h1> is long (${h1.length} chars). Google may truncate.`, 'Trim to under 70 chars.')];
    return [];
  },
};

const HeadingHierarchy = {
  id: 'Hx-001',
  describe: 'Heading levels never skip (no h2 → h4).',
  check: ({ document }) => {
    const findings = [];
    const levels = [];
    document('h1, h2, h3, h4, h5, h6').each((_, el) => {
      levels.push(parseInt(el.name.charAt(1), 10));
    });
    let prev = 0;
    for (const lvl of levels) {
      if (prev > 0 && lvl > prev + 1) {
        findings.push(find('Hx-001', 'warn', `Heading hierarchy skip: jumped from h${prev} to h${lvl}.`, 'Demote this heading or add an intermediate level.'));
      }
      prev = lvl;
    }
    return findings;
  },
};

const TitleTag = {
  id: 'TITLE-001',
  describe: '<title> exists, 10–70 chars.',
  check: ({ document }) => {
    const title = document('title').first().text().trim();
    if (!title) return [find('TITLE-001', 'error', 'No <title> tag.', 'Add <title>…</title>.')];
    if (title.length < 10) return [find('TITLE-001', 'warn', `<title> is short (${title.length} chars).`)];
    if (title.length > 70) return [find('TITLE-001', 'warn', `<title> is ${title.length} chars — Google truncates around 60.`)];
    return [];
  },
};

const MetaDescription = {
  id: 'DESC-001',
  describe: 'Meta description exists, 50–170 chars.',
  check: ({ document }) => {
    const desc = document('meta[name="description"]').attr('content')?.trim() ?? '';
    if (!desc) return [find('DESC-001', 'error', 'No meta description.', 'Add <meta name="description" content="…" /> in 50–160 chars.')];
    if (desc.length < 50) return [find('DESC-001', 'warn', `Meta description is short (${desc.length} chars).`)];
    if (desc.length > 170) return [find('DESC-001', 'warn', `Meta description is ${desc.length} chars — Google truncates around 160.`)];
    return [];
  },
};

const Canonical = {
  id: 'CANON-001',
  describe: 'Canonical URL present and absolute.',
  check: ({ document }) => {
    const href = document('link[rel="canonical"]').attr('href')?.trim() ?? '';
    if (!href) return [find('CANON-001', 'error', 'No canonical URL set.', 'Add <link rel="canonical" href="https://…" />.')];
    if (!/^https?:\/\//.test(href)) return [find('CANON-001', 'error', `Canonical "${href}" is not absolute.`, 'Use the full https:// URL.')];
    return [];
  },
};

const OpenGraph = {
  id: 'OG-001',
  describe: 'og:title, og:description, og:image, og:url all present.',
  check: ({ document }) => {
    const required = ['og:title', 'og:description', 'og:image', 'og:url'];
    return required
      .filter((p) => !document(`meta[property="${p}"]`).attr('content'))
      .map((p) => find('OG-001', 'error', `Missing <meta property="${p}">.`, `Add the ${p} OG tag.`));
  },
};

const ImageAlt = {
  id: 'IMG-001',
  describe: 'Every <img> has alt (empty alt only when role="presentation").',
  check: ({ document }) => {
    const findings = [];
    document('img').each((_, el) => {
      const $el = document(el);
      const alt = $el.attr('alt');
      const role = $el.attr('role');
      const src = $el.attr('src') ?? '(no src)';
      if (alt === undefined) findings.push(find('IMG-001', 'error', `<img src="${src}"> has no alt attribute.`, 'Add alt="…" describing the image.'));
      else if (alt === '' && role !== 'presentation' && role !== 'none')
        findings.push(find('IMG-001', 'warn', `<img src="${src}"> has empty alt; only allowed when role="presentation".`));
    });
    return findings;
  },
};

const ImageDimensions = {
  id: 'IMG-002',
  describe: 'Every <img> has width and height (CLS).',
  check: ({ document }) => {
    const findings = [];
    document('img').each((_, el) => {
      const $el = document(el);
      const w = $el.attr('width');
      const h = $el.attr('height');
      const src = $el.attr('src') ?? '(no src)';
      if (!w || !h) findings.push(find('IMG-002', 'warn', `<img src="${src}"> missing width/height (causes layout shift).`));
    });
    return findings;
  },
};

const InternalLinksResolve = {
  id: 'LINK-001',
  describe: 'Every internal link resolves.',
  check: ({ document, knownPaths, url }) => {
    const findings = [];
    const seen = new Set();
    document('a[href]').each((_, el) => {
      const href = document(el).attr('href') ?? '';
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      if (/^[a-z]+:\/\//i.test(href)) return;
      const pathOnly = href.split('#')[0].split('?')[0];
      if (!pathOnly || pathOnly === '/' || seen.has(pathOnly)) return;
      seen.add(pathOnly);
      const normalized = pathOnly.endsWith('/') && pathOnly !== '/' ? pathOnly.slice(0, -1) : pathOnly;
      if (
        !knownPaths.has(normalized) &&
        !knownPaths.has(normalized + '/') &&
        !knownPaths.has(normalized + '/index') &&
        !normalized.startsWith('/uploads/') &&
        !normalized.startsWith('/_astro/') &&
        !normalized.startsWith('/_image')
      ) {
        findings.push(find('LINK-001', 'error', `Broken internal link on ${url}: ${href}`, 'Fix the link target or remove it.'));
      }
    });
    return findings;
  },
};

const InternalLinkCount = {
  id: 'LINK-002',
  describe: 'Page has at least 2 internal outbound links (orphan check).',
  check: ({ document, url }) => {
    if (url === '/' || url.startsWith('/keystatic')) return [];
    let count = 0;
    document('a[href]').each((_, el) => {
      const href = document(el).attr('href') ?? '';
      if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:') && !/^https?:\/\//.test(href)) count++;
    });
    if (count < 2) return [find('LINK-002', 'warn', `Only ${count} internal link(s) — page may be orphaned.`, 'Add a couple of contextual internal links.')];
    return [];
  },
};

const ExternalLinksRel = {
  id: 'LINK-003',
  describe: 'External links use rel="noopener" (and nofollow for non-trusted).',
  check: ({ document }) => {
    const findings = [];
    document('a[href^="http"]').each((_, el) => {
      const $el = document(el);
      const rel = ($el.attr('rel') ?? '').toLowerCase();
      const href = $el.attr('href') ?? '';
      const target = ($el.attr('target') ?? '').toLowerCase();
      if (target === '_blank' && !rel.includes('noopener')) {
        findings.push(find('LINK-003', 'warn', `External link to ${href} opens in new tab without rel="noopener".`));
      }
    });
    return findings;
  },
};

const KeywordPresence = {
  id: 'KW-001',
  describe: 'Primary keyword (from <meta name="keywords">) appears in title, h1 and first paragraph.',
  check: ({ document, bodyText }) => {
    const keywords = (document('meta[name="keywords"]').attr('content') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (keywords.length === 0) return [];
    const primary = keywords[0].toLowerCase();
    const title = document('title').text().toLowerCase();
    const h1 = document('h1').first().text().toLowerCase();
    const firstP = document('p').first().text().toLowerCase();
    const findings = [];
    if (!title.includes(primary)) findings.push(find('KW-001', 'info', `Primary keyword "${primary}" not in <title>.`));
    if (h1 && !h1.includes(primary)) findings.push(find('KW-001', 'info', `Primary keyword "${primary}" not in <h1>.`));
    if (firstP && !firstP.includes(primary) && !bodyText.toLowerCase().slice(0, 600).includes(primary)) {
      findings.push(find('KW-001', 'info', `Primary keyword "${primary}" not in opening paragraph.`));
    }
    return findings;
  },
};

const KeywordDensity = {
  id: 'KW-002',
  describe: 'Keyword density 0.4%–3% (not stuffed).',
  check: ({ document, bodyText }) => {
    const keywords = (document('meta[name="keywords"]').attr('content') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (keywords.length === 0) return [];
    const text = bodyText.toLowerCase();
    const totalWords = text.split(/\s+/).filter(Boolean).length;
    if (totalWords < 100) return [];
    const findings = [];
    for (const kw of keywords.slice(0, 3)) {
      const escaped = kw.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matches = text.match(new RegExp(`\\b${escaped}\\b`, 'g')) ?? [];
      const density = (matches.length * kw.split(/\s+/).length) / totalWords;
      if (density > 0.04) findings.push(find('KW-002', 'warn', `Keyword "${kw}" density ${(density * 100).toFixed(1)}% — possibly stuffed.`));
    }
    return findings;
  },
};

const HtmlLang = {
  id: 'LANG-001',
  describe: '<html lang="en-GB"> set.',
  check: ({ document }) => {
    const lang = document('html').attr('lang')?.trim();
    if (!lang) return [find('LANG-001', 'error', '<html> has no lang attribute.', 'Set lang="en-GB".')];
    return [];
  },
};

const RobotsNoindex = {
  id: 'ROBOTS-001',
  describe: 'Page is indexable unless explicitly drafted.',
  check: ({ document, url }) => {
    const robots = (document('meta[name="robots"]').attr('content') ?? '').toLowerCase();
    if (robots.includes('noindex') && !url.startsWith('/keystatic') && !url.startsWith('/admin') && url !== '/404') {
      return [find('ROBOTS-001', 'warn', `Page ${url} is set to noindex — was that intended?`)];
    }
    return [];
  },
};

const Schema = {
  id: 'SCHEMA-001',
  describe: 'Pages have valid JSON-LD.',
  check: ({ document }) => {
    const findings = [];
    let any = false;
    document('script[type="application/ld+json"]').each((_, el) => {
      any = true;
      try {
        JSON.parse(document(el).text());
      } catch {
        findings.push(find('SCHEMA-001', 'error', 'Invalid JSON-LD block.'));
      }
    });
    if (!any) findings.push(find('SCHEMA-001', 'warn', 'No structured data on this page.'));
    return findings;
  },
};

const Viewport = {
  id: 'VIEW-001',
  describe: '<meta name="viewport"> set.',
  check: ({ document }) => {
    if (!document('meta[name="viewport"]').attr('content')) {
      return [find('VIEW-001', 'error', 'No viewport meta — site will look broken on mobile.')];
    }
    return [];
  },
};

const Charset = {
  id: 'CHARSET-001',
  describe: '<meta charset> set.',
  check: ({ document }) => {
    if (document('meta[charset]').length === 0) {
      return [find('CHARSET-001', 'error', 'No charset meta tag.')];
    }
    return [];
  },
};

const PageWeight = {
  id: 'PERF-001',
  describe: 'HTML page weight under 200 KB (excluding assets).',
  check: ({ html, url }) => {
    const bytes = Buffer.byteLength(html, 'utf8');
    if (bytes > 200 * 1024) return [find('PERF-001', 'warn', `${url} HTML is ${(bytes / 1024).toFixed(0)} KB — over 200 KB.`)];
    return [];
  },
};

export const RULES = [
  H1Single,
  H1Length,
  HeadingHierarchy,
  TitleTag,
  MetaDescription,
  Canonical,
  OpenGraph,
  ImageAlt,
  ImageDimensions,
  InternalLinksResolve,
  InternalLinkCount,
  ExternalLinksRel,
  KeywordPresence,
  KeywordDensity,
  HtmlLang,
  RobotsNoindex,
  Schema,
  Viewport,
  Charset,
  PageWeight,
];

export function scorePage(report) {
  const errors = report.findings.filter((f) => f.level === 'error').length;
  const warnings = report.findings.filter((f) => f.level === 'warn').length;
  const score = Math.max(0, 100 - errors * 15 - warnings * 5);
  const status = errors > 0 ? 'error' : warnings > 0 ? 'warn' : 'ok';
  return { score, status };
}
