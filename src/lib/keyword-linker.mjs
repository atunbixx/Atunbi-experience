/**
 * Remark plugin: auto-link the first occurrence of configured keywords inside
 * blog/portfolio markdown bodies. Only one link per phrase per page, only
 * inside paragraph text (skips headings, links, code).
 *
 * Configure keywords in src/content/seo-keywords.json — `{ "phrase": "/url" }`.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { visit } from 'unist-util-visit';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const CONFIG_PATH = path.resolve(__dirname, '../content/seo-keywords.json');

let cache = null;
function loadKeywords() {
  if (cache !== null) return cache;
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    cache = Object.entries(parsed)
      .filter(([k, v]) => typeof k === 'string' && typeof v === 'string' && k.length > 1)
      .sort((a, b) => b[0].length - a[0].length);
  } catch {
    cache = [];
  }
  return cache;
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function keywordLinker() {
  // Keystone unified plugin shape: factory(options) → transformer(tree, file).
  return function plugin() {
    return function transformer(tree) {
      try {
        const keywords = loadKeywords();
        if (keywords.length === 0) return;
        const linked = new Set();

        visit(tree, 'paragraph', (paragraph) => {
          if (!Array.isArray(paragraph.children)) return;
          for (let i = 0; i < paragraph.children.length; i++) {
            const node = paragraph.children[i];
            if (!node || node.type !== 'text' || typeof node.value !== 'string') continue;

            for (const [phrase, target] of keywords) {
              if (linked.has(phrase)) continue;
              const regex = new RegExp(`\\b(${escapeRegex(phrase)})\\b`, 'i');
              const match = regex.exec(node.value);
              if (!match) continue;

              const before = node.value.slice(0, match.index);
              const matched = match[0];
              const after = node.value.slice(match.index + matched.length);

              const newNodes = [];
              if (before) newNodes.push({ type: 'text', value: before });
              newNodes.push({
                type: 'link',
                url: target,
                title: null,
                children: [{ type: 'text', value: matched }],
                data: { hProperties: { 'data-keyword-link': 'true' } },
              });
              if (after) newNodes.push({ type: 'text', value: after });

              paragraph.children.splice(i, 1, ...newNodes);
              i += newNodes.length - 1;
              linked.add(phrase);
              break;
            }
          }
        });
      } catch (err) {
        console.warn('[keyword-linker] skipped due to error:', err?.message ?? err);
      }
    };
  };
}
