#!/usr/bin/env node
/**
 * SEO audit runner. Walks dist/, runs every rule against every HTML file,
 * writes a JSON report to dist/seo-report.json (and dist/admin/seo/data.json
 * for the admin dashboard) and exits non-zero if there are any errors.
 *
 *   node scripts/seo-check.mjs [--no-fail] [--json] [--quiet]
 */

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { globby } from 'globby';
import * as cheerio from 'cheerio';
import kleur from 'kleur';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Astro static output lives in dist/. Vercel adapter splits into dist/client + dist/server.
// Pick whichever exists.
const DIST_CLIENT = path.resolve(ROOT, 'dist', 'client');
const DIST_PLAIN = path.resolve(ROOT, 'dist');
const DIST = fs.existsSync(DIST_CLIENT) ? DIST_CLIENT : DIST_PLAIN;
const REPORT_PATH = path.resolve(ROOT, 'dist', 'seo-report.json');
const ADMIN_REPORT_DIR = path.join(DIST, 'admin', 'seo');
const ADMIN_REPORT_PATH = path.join(ADMIN_REPORT_DIR, 'data.json');

const NO_FAIL = process.argv.includes('--no-fail');
const JSON_ONLY = process.argv.includes('--json');
const QUIET = process.argv.includes('--quiet');

if (!fs.existsSync(DIST)) {
  console.error(kleur.red('seo-check: dist/ not found. Run `astro build` first.'));
  process.exit(NO_FAIL ? 0 : 2);
}

const { RULES, scorePage } = await import(url.pathToFileURL(path.join(ROOT, 'src/lib/seo-rules.mjs')).href);

// Audit only public, indexable pages. Admin/utility routes are noindex
// internal tools (SEO dashboard, login, uploader) and must not be held to
// marketing-SEO rules (h1, og tags, target keywords) — auditing them would
// (and did) block every deployment for no real SEO benefit.
const htmlFiles = await globby(
  ['**/*.html', '!_seo-rules-compiled.*', '!admin/**', '!keystatic/**', '!404.html'],
  { cwd: DIST }
);

const knownPaths = new Set();
for (const file of htmlFiles) {
  // Each HTML file may be /foo.html or /foo/index.html — both mean route /foo.
  let route = '/' + file;
  route = route.replace(/\/index\.html$/, '').replace(/\.html$/, '');
  if (route === '') route = '/';
  knownPaths.add(route);
  if (route !== '/' && route.endsWith('/')) knownPaths.add(route.slice(0, -1));
}
knownPaths.add('/');
knownPaths.add('/keystatic');
knownPaths.add('/api/contact');
// On-demand (prerender=false) routes never emit static HTML, so links to
// them must be registered explicitly or the link checker calls them broken.
knownPaths.add('/admin/login');
knownPaths.add('/admin/upload');
knownPaths.add('/admin/seo');

const report = {
  generatedAt: new Date().toISOString(),
  pages: [],
  totals: { ok: 0, warn: 0, error: 0, errors: 0, warnings: 0, infos: 0 },
};

let exitCode = 0;

for (const rel of htmlFiles) {
  const filepath = path.join(DIST, rel);
  const html = fs.readFileSync(filepath, 'utf8');
  const $ = cheerio.load(html);
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();

  let route = '/' + rel.replace(/\/index\.html$/, '').replace(/\.html$/, '');
  if (route === '/index') route = '/';
  if (route !== '/' && route.endsWith('/')) route = route.slice(0, -1);
  const ctx = {
    url: route,
    filepath,
    html,
    document: $,
    bodyText,
    knownPaths,
  };

  /** @type {Array<{ruleId:string,level:string,message:string,fix?:string}>} */
  const findings = [];
  for (const rule of RULES) {
    try {
      findings.push(...rule.check(ctx));
    } catch (e) {
      findings.push({ ruleId: rule.id, level: 'error', message: `Rule threw: ${e.message}` });
    }
  }

  const { score, status } = scorePage({ url: ctx.url, filepath, findings });
  report.pages.push({ url: ctx.url, filepath: rel, score, status, findings });
  report.totals[status]++;
  for (const f of findings) {
    if (f.level === 'error') report.totals.errors++;
    else if (f.level === 'warn') report.totals.warnings++;
    else report.totals.infos++;
  }
  if (status === 'error') exitCode = 1;
}

fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
fs.mkdirSync(ADMIN_REPORT_DIR, { recursive: true });
fs.writeFileSync(ADMIN_REPORT_PATH, JSON.stringify(report, null, 2));

if (JSON_ONLY) {
  console.log(JSON.stringify(report));
  process.exit(NO_FAIL ? 0 : exitCode);
}

if (!QUIET) {
  printHumanReport(report);
}

if (NO_FAIL) process.exit(0);
process.exit(exitCode);

function printHumanReport(rep) {
  console.log();
  console.log(kleur.bold().underline('SEO audit'));
  console.log(`  pages:   ${rep.pages.length}`);
  console.log(`  ok:      ${kleur.green(rep.totals.ok)}`);
  console.log(`  warn:    ${kleur.yellow(rep.totals.warn)}`);
  console.log(`  error:   ${kleur.red(rep.totals.error)}`);
  console.log(`  errors:  ${rep.totals.errors}   warnings: ${rep.totals.warnings}   info: ${rep.totals.infos}`);
  console.log();
  for (const page of rep.pages) {
    if (page.findings.length === 0) continue;
    const tag = page.status === 'error' ? kleur.red('ERR') : page.status === 'warn' ? kleur.yellow('WARN') : kleur.blue('INFO');
    console.log(`${tag} ${page.url}  ${kleur.dim(`(${page.score}/100)`)}`);
    for (const f of page.findings) {
      const icon = f.level === 'error' ? kleur.red('  ✖') : f.level === 'warn' ? kleur.yellow('  ⚠') : kleur.blue('  ·');
      console.log(`${icon} [${f.ruleId}] ${f.message}`);
      if (f.fix) console.log(`     ${kleur.dim('→ ' + f.fix)}`);
    }
    console.log();
  }
  if (rep.totals.errors === 0) console.log(kleur.green('SEO audit passed.'));
  else console.log(kleur.red(`SEO audit failed with ${rep.totals.errors} error(s).`));
}
