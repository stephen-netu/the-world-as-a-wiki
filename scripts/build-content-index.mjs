#!/usr/bin/env node
// Minimal content index builder (no extra deps).
// Scans markdown under src/content/notes/ recursively and emits public/content-index.json.
// Fields: slug, title, type, tags, date, era, eraStart, eraEnd, coordinates, excerpt, links
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '..');
const SRC_NOTES = path.resolve(ROOT, 'src', 'content', 'notes');
const PUBLIC_DIR = path.resolve(ROOT, 'public');
const OUT_FILE = path.join(PUBLIC_DIR, 'content-index.json');

function stripMarkdown(md = '') {
  return md
    .replace(/`{1,3}[^`]*`{1,3}/g, '') // inline code
    .replace(/```[\s\S]*?```/g, '') // code blocks
    .replace(/\!\[[^\]]*\]\([^)]*\)/g, '') // images
    .replace(/\[[^\]]*\]\([^)]*\)/g, '') // links
    .replace(/[#>*_`~\-]+/g, ' ') // md tokens
    .replace(/\s+/g, ' ') // collapse
    .trim();
}

function parseFrontmatter(raw) {
  const parts = raw.split(/\n---\n|^---\n|\n---$/gm);
  if (parts.length < 2 || !raw.startsWith('---')) return { data: {}, content: raw };
  const fm = parts[1] || '';
  const content = raw.slice(raw.indexOf(parts[1]) + fm.length + 4); // skip closing --- and newline
  const data = {};
  for (const line of fm.split('\n')) {
    const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (m) {
      const k = m[1];
      let v = m[2].trim();
      if (v === 'true') v = true; else if (v === 'false') v = false; else if (/^\d+(\.\d+)?$/.test(v)) v = Number(v);
      else if (v.startsWith('[') && v.endsWith(']')) {
        try { v = JSON.parse(v); } catch {}
      }
      data[k] = v;
    }
  }
  return { data, content };
}

function unquote(v) {
  if (v == null) return v;
  const s = String(v).trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

function normalizeTags(v) {
  if (Array.isArray(v)) return v.map((x) => unquote(x)).filter(Boolean);
  if (v == null) return [];
  const s = String(v).trim();
  // Try JSON array first
  if (s.startsWith('[') && s.endsWith(']')) {
    try {
      const arr = JSON.parse(s);
      return Array.isArray(arr) ? arr.map((x) => unquote(x)).filter(Boolean) : [];
    } catch {}
  }
  // Fallback: split by comma
  return s
    .split(',')
    .map((x) => unquote(x))
    .map((x) => x.trim())
    .filter(Boolean);
}

function normalizeDate(v) {
  if (!v) return null;
  const s = unquote(v);
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : s; // keep original string form
}

async function walk(dir) {
  let files = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) files = files.concat(await walk(p));
      else if (/\.mdx?$/.test(e.name)) files.push(p);
    }
  } catch {
    // directory may not exist yet
  }
  return files;
}

function inferSlug(filePath) {
  const rel = filePath.split(path.sep).slice(filePath.split(path.sep).indexOf('notes') + 1).join('/');
  return rel.replace(/\.mdx?$/, '');
}

function extractLinks(body) {
  const links = new Set();
  const mdLinks = body.match(/\[[^\]]+\]\(([^)]+)\)/g) || [];
  for (const l of mdLinks) {
    const m = l.match(/\(([^)]+)\)/);
    if (!m) continue;
    let href = m[1];
    if (href.startsWith('/notes/')) links.add(href.replace(/^\/notes\//, '').replace(/\/$/, ''));
  }
  const wiki = body.match(/\[\[([^\]]+)\]\]/g) || [];
  for (const w of wiki) {
    const m = w.match(/\[\[([^\]]+)\]\]/);
    if (m) links.add(m[1]);
  }
  return Array.from(links);
}

async function main() {
  const files = await walk(SRC_NOTES);
  const items = [];
  for (const f of files) {
    const raw = await fs.readFile(f, 'utf8');
    const { data, content } = parseFrontmatter(raw);
    const slug = data.slug || inferSlug(f);
    const title = unquote(data.title) || (content.match(/^#\s+(.+)$/m)?.[1] || slug);
    const excerpt = stripMarkdown(content).slice(0, 160);
    const links = extractLinks(content);
    const item = {
      slug,
      title,
      type: data.type || null,
      tags: normalizeTags(data.tags),
      date: normalizeDate(data.date),
      era: data.era || null,
      eraStart: data.eraStart || null,
      eraEnd: data.eraEnd || null,
      coordinates: data.coordinates || null,
      excerpt,
      links,
      backlinks: []
    };
    items.push(item);
  }
  // compute backlinks
  const bySlug = new Map(items.map(i => [i.slug, i]));
  for (const it of items) {
    for (const l of it.links) {
      const target = bySlug.get(l);
      if (target) target.backlinks.push(it.slug);
    }
  }

  // --- Schema validation ---
  function isStringArray(arr) {
    return Array.isArray(arr) && arr.every((x) => typeof x === 'string');
  }
  const errors = [];
  for (const it of items) {
    const where = `slug="${it.slug}"`;
    if (typeof it.title !== 'string') errors.push(`[${where}] title must be string`);
    if (!isStringArray(it.tags)) errors.push(`[${where}] tags must be string[]`);
    if (!(it.date === null || typeof it.date === 'string')) errors.push(`[${where}] date must be string|null`);
    if (!isStringArray(it.links)) errors.push(`[${where}] links must be string[]`);
    if (!isStringArray(it.backlinks)) errors.push(`[${where}] backlinks must be string[]`);
  }
  if (errors.length) {
    const msg = `Content index validation failed (items: ${items.length}).\n` + errors.join('\n');
    throw new Error(msg);
  }

  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  await fs.writeFile(OUT_FILE, JSON.stringify(items, null, 2));
  console.log(`Wrote ${items.length} items to ${path.relative(ROOT, OUT_FILE)}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
