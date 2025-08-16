#!/usr/bin/env node
/**
 * Import tiddlers from a single-file TiddlyWiki HTML into Astro Markdown notes.
 * - Reads `the-world-as-wiki.html`
 * - Parses `#storeArea > div[title]` tiddlers
 * - Skips system ($:/...) and plugin/application JSON tiddlers
 * - Extracts title, created, tags, and body text (from <pre>)
 * - Derives `links` from [[WikiLinks]] in the body
 * - Writes Markdown files to `src/content/notes/<slug>.md`
 *
 * Usage:
 *   node scripts/import-tiddlywiki.js [--dry-run]
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as process from 'node:process';
async function loadCheerio() {
  try {
    const mod = await import('cheerio');
    return mod.default || mod;
  } catch {
    return null;
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const TW_HTML = path.join(projectRoot, 'the-world-as-wiki.html');
const NOTES_DIR = path.join(projectRoot, 'src', 'content', 'notes');

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');
const CONVERT = args.has('--convert');
const OVERWRITE = args.has('--overwrite');
const REPORT = args.has('--report');

function inferTypeFromTags(tags = []) {
  const set = new Set(tags.map(t => t.toLowerCase()));
  // Map common tag buckets to our schema types
  if (set.has('characters') || set.has('character') || set.has('people')) return 'Character';
  if (set.has('locations') || set.has('location') || set.has('places') || set.has('place')) return 'Location';
  if (set.has('factions') || set.has('faction')) return 'Faction';
  if (set.has('artifacts') || set.has('artifact') || set.has('items') || set.has('relic')) return 'Artifact';
  if (set.has('stories') || set.has('story')) return 'Story';
  if (set.has('events') || set.has('event')) return 'Event';
  return 'Lore';
}

function toSlug(input) {
  return String(input)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    || 'untitled';
}

function dedupeSlug(base, existing) {
  if (!existing.has(base)) return base;
  let i = 2;
  while (existing.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

function parseTagsAttr(val) {
  if (!val) return [];
  // Split by spaces but keep [[multi word]] intact
  const tokens = [];
  let buf = '';
  let inBrackets = false;
  for (const ch of String(val)) {
    if (ch === '[') {
      inBrackets = true; buf += ch; continue;
    }
    if (ch === ']') {
      buf += ch;
      if (buf.endsWith(']]')) { tokens.push(buf); buf = ''; inBrackets = false; }
      continue;
    }
    if (!inBrackets && /\s/.test(ch)) {
      if (buf) { tokens.push(buf); buf = ''; }
      continue;
    }
    buf += ch;
  }
  if (buf) tokens.push(buf);
  return tokens
    .map(t => t.trim())
    .filter(Boolean)
    .map(t => t.startsWith('[[') && t.endsWith(']]') ? t.slice(2, -2) : t)
    .filter(t => !t.startsWith('$:/'));
}

function parseTwTimestamp(ts) {
  // Expect YYYYMMDDhhmmssmmm, fallback to undefined
  if (!ts || !/^[0-9]{8,}$/.test(ts)) return undefined;
  const y = ts.slice(0, 4);
  const m = ts.slice(4, 6);
  const d = ts.slice(6, 8);
  if (!y || !m || !d) return undefined;
  return `${y}-${m}-${d}`; // keep just date for frontmatter
}

function extractWikiLinks(text) {
  if (!text) return [];
  const links = new Set();
  const re = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g; // [[Target|caption]] or [[Target]]
  let m;
  while ((m = re.exec(text)) !== null) {
    const target = (m[1] || '').trim();
    if (target && !target.startsWith('$:/')) links.add(target);
  }
  return Array.from(links);
}

function looksBase64Blob(s) {
  if (!s || s.length < 50000) return false; // only consider very large blobs
  // Heuristic: only base64 chars and whitespace
  return /^[A-Za-z0-9+/=\s]+$/.test(s);
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

function convertTwToMd(src, resolveSlug) {
  if (!src) return '';
  let s = src;
  // Code fences: {{{...}}} -> ```
  s = s.replace(/\{\{\{\n?([\s\S]*?)\n?\}\}\}/g, (m, code) => '\n```\n' + code.trim() + '\n```\n');
  // Headings: !, !!, !!! -> #, ##, ###
  s = s.replace(/^!!!!!\s*(.*)$/gm, '##### $1');
  s = s.replace(/^!!!!\s*(.*)$/gm, '#### $1');
  s = s.replace(/^!!!\s*(.*)$/gm, '### $1');
  s = s.replace(/^!!\s*(.*)$/gm, '## $1');
  s = s.replace(/^!\s*(.*)$/gm, '# $1');
  // Bold/italic
  s = s.replace(/''([^']+)''/g, '**$1**');
  s = s.replace(/\/\/([^/]+)\/{2}/g, '*$1*');
  // Lists: * -> -, # -> 1.
  s = s.replace(/^\*\s+/gm, '- ');
  s = s.replace(/^#\s+/gm, '1. ');
  // Links [[Target|Caption]] and [[Target]]
  s = s.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (m, target, caption) => {
    const slug = resolveSlug(target.trim());
    return `[${caption}](/notes/${slug}/)`;
  });
  s = s.replace(/\[\[([^\]]+)\]\]/g, (m, target) => {
    const slug = resolveSlug(target.trim());
    return `[${target}](/notes/${slug}/)`;
  });
  // Transclusion {{Title}} -> link
  s = s.replace(/\{\{([^}]+)\}\}/g, (m, target) => {
    const slug = resolveSlug(target.trim());
    return `[${target}](/notes/${slug}/)`;
  });
  return s;
}

async function main() {
  // Verify files/dirs
  try {
    await fs.access(TW_HTML);
  } catch {
    console.error(`Missing TiddlyWiki HTML at ${TW_HTML}`);
    process.exit(1);
  }
  await ensureDir(NOTES_DIR);

  const html = await fs.readFile(TW_HTML, 'utf8');
  const cheerioLib = await loadCheerio();

  const tiddlers = [];
  if (cheerioLib) {
    const $ = cheerioLib.load(html, { decodeEntities: false });
    $('#storeArea > div[title]').each((_, el) => {
      const $el = $(el);
      const title = $el.attr('title') || '';
      if (!title || title.startsWith('$:/')) return; // skip system tiddlers

      const type = ($el.attr('type') || '').toLowerCase();
      // Skip images/binary
      if (type.startsWith('image/')) return;
      // Only import human-readable text tiddlers
      if (type && type !== 'text/vnd.tiddlywiki' && type !== 'text/plain') return;

      const text = $el.children('pre').first().text() || '';
      if (/\.(png|jpe?g|gif|svg|webp|bmp|tiff?)$/i.test(title)) return;
      if (looksBase64Blob(text)) return;
      if (!text.trim()) return;

      const created = parseTwTimestamp($el.attr('created'));
      const tags = parseTagsAttr($el.attr('tags'));
      const wikiLinks = extractWikiLinks(text);
      tiddlers.push({ title, text, created, tags, wikiLinks });
    });
  } else {
    // Minimal regex-based fallback parser
    const start = html.indexOf('<div id="storeArea"');
    if (start === -1) {
      console.error('Could not find #storeArea in TiddlyWiki HTML.');
      process.exit(1);
    }
    // Find the matching closing </div> for storeArea by simple depth count
    let depth = 0;
    let i = start;
    let end = -1;
    const openRe = /<div\b/gi;
    const closeRe = /<\/div>/gi;
    while (i < html.length) {
      const openMatch = openRe.exec(html);
      const closeMatch = closeRe.exec(html);
      const nextPos = Math.min(openMatch ? openMatch.index : Infinity, closeMatch ? closeMatch.index : Infinity);
      if (!isFinite(nextPos)) break;
      if (nextPos === openMatch?.index) {
        if (depth === 0 && openMatch.index !== start) {
          // ignore other divs before storeArea starts
        }
        depth++;
        i = openRe.lastIndex;
      } else {
        depth--;
        i = closeRe.lastIndex;
        if (depth === 0) { end = i; break; }
      }
    }
    const storeSlice = end > start ? html.slice(start, end) : html.slice(start);

    // Helper: decode minimal HTML entities
    const decodeHtml = (s) => s
      .replaceAll('&lt;', '<')
      .replaceAll('&gt;', '>')
      .replaceAll('&amp;', '&')
      .replaceAll('&quot;', '"')
      .replaceAll('&#39;', "'");

    // Extract direct children tiddler divs with title attr
    const divRe = /<div\b([^>]*)>([\s\S]*?)<\/div>/gi;
    let m;
    while ((m = divRe.exec(storeSlice)) !== null) {
      const attrs = m[1] || '';
      const inner = m[2] || '';
      const getAttr = (name) => {
        const r = new RegExp(name + '="([^"]*)"', 'i');
        const mm = attrs.match(r);
        return mm ? mm[1] : '';
      };
      const title = getAttr('title');
      if (!title || title.startsWith('$:/')) continue;
      const type = (getAttr('type') || '').toLowerCase();
      if (type.startsWith('image/')) continue;
      if (type && type !== 'text/vnd.tiddlywiki' && type !== 'text/plain') continue;
      const createdAttr = getAttr('created');
      const tagsAttr = getAttr('tags');
      const preMatch = inner.match(/<pre>([\s\S]*?)<\/pre>/i);
      const text = preMatch ? decodeHtml(preMatch[1]) : '';
      if (/\.(png|jpe?g|gif|svg|webp|bmp|tiff?)$/i.test(title)) continue;
      if (looksBase64Blob(text)) continue;
      if (!text.trim()) continue;
      const created = parseTwTimestamp(createdAttr);
      const tags = parseTagsAttr(tagsAttr);
      const wikiLinks = extractWikiLinks(text);
      tiddlers.push({ title, text, created, tags, wikiLinks });
    }
  }

  // Prepare slug map and track existing files
  const existingFiles = new Set(
    (await fs.readdir(NOTES_DIR)).map(n => n.replace(/\.md$/, ''))
  );

  const titleToSlug = new Map();
  for (const t of tiddlers) {
    const base = toSlug(t.title);
    let chosen = base;
    if (!OVERWRITE) {
      chosen = existingFiles.has(base) ? dedupeSlug(base, existingFiles) : base;
    }
    titleToSlug.set(t.title, chosen);
    existingFiles.add(chosen);
  }

  // Convert wikiLinks titles to slugs
  for (const t of tiddlers) {
    const slugs = new Set();
    for (const linkTitle of t.wikiLinks) {
      const s = titleToSlug.get(linkTitle) || toSlug(linkTitle);
      if (s) slugs.add(s);
    }
    t.links = Array.from(slugs);
  }

  const createdFiles = [];
  const overwrittenFiles = [];
  const reportItems = [];
  for (const t of tiddlers) {
    const slug = titleToSlug.get(t.title) || toSlug(t.title);
    const filePath = path.join(NOTES_DIR, `${slug}.md`);

    // Skip if file already exists on disk unless OVERWRITE
    let exists = false;
    try { await fs.access(filePath); exists = true; } catch {}
    if (exists && !OVERWRITE) continue;

    const inferredType = inferTypeFromTags(t.tags || []);

    const frontmatter = {
      title: t.title,
      description: '',
      date: t.created || undefined,
      tags: t.tags || [],
      links: t.links || [],
      draft: false,
      // only include type if we inferred something other than Lore to minimize churn
      ...(inferredType && inferredType !== 'Lore' ? { type: inferredType } : {}),
    };

    const yaml = Object.entries(frontmatter)
      .filter(([, v]) => !(v === undefined || (Array.isArray(v) && v.length === 0)))
      .map(([k, v]) => {
        if (Array.isArray(v)) return `${k}: [${v.map(x => JSON.stringify(x)).join(', ')}]`;
        if (typeof v === 'string') return `${k}: ${JSON.stringify(v)}`;
        return `${k}: ${String(v)}`;
      })
      .join('\n');

    let body = '';
    if (CONVERT) {
      const mdBody = convertTwToMd(
        t.text,
        (title) => titleToSlug.get(title) || toSlug(title)
      );
      body = [
        '---',
        yaml,
        '---',
        '',
        mdBody.trim(),
        '',
      ].join('\n');
    } else {
      body = [
        '---',
        yaml,
        '---',
        '',
        '> Imported from TiddlyWiki. Original content preserved below as TiddlyWiki markup.',
        '',
        '```tiddlywiki',
        t.text.trim(),
        '```',
        '',
      ].join('\n');
    }

    if (REPORT) {
      reportItems.push({ title: t.title, slug, inferredType, tags: t.tags || [], links: (t.links||[]).length });
    }

    if (!DRY_RUN) {
      await fs.writeFile(filePath, body, 'utf8');
    }
    if (exists) overwrittenFiles.push(path.relative(projectRoot, filePath));
    else createdFiles.push(path.relative(projectRoot, filePath));
  }

  console.log(`Identified ${tiddlers.length} candidate tiddlers.`);
  console.log(`Created ${createdFiles.length} new notes${DRY_RUN ? ' (dry-run)' : ''}.`);
  if (OVERWRITE) console.log(`Overwrote ${overwrittenFiles.length} notes${DRY_RUN ? ' (dry-run)' : ''}.`);
  if (REPORT) {
    const counts = reportItems.reduce((acc, r) => { acc[r.inferredType||'Unknown'] = (acc[r.inferredType||'Unknown']||0)+1; return acc; }, {});
    const payload = { total: reportItems.length, counts, sample: reportItems.slice(0, 20) };
    console.log(JSON.stringify(payload, null, 2));
  }
  if (createdFiles.length) {
    for (const f of createdFiles.slice(0, 20)) console.log(`- ${f}`);
    if (createdFiles.length > 20) console.log(`... and ${createdFiles.length - 20} more`);
  }
  if (OVERWRITE && overwrittenFiles.length) {
    for (const f of overwrittenFiles.slice(0, 20)) console.log(`~ ${f}`);
    if (overwrittenFiles.length > 20) console.log(`... and ${overwrittenFiles.length - 20} more overwritten`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
