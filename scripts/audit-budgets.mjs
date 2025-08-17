#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function gzipSizeSync(buf) {
  return zlib.gzipSync(buf).length;
}

function readFileOrNull(p) {
  try { return fs.readFileSync(p); } catch { return null; }
}

function listFiles(dir, ext = null) {
  try {
    return fs.readdirSync(dir)
      .filter((f) => !ext || f.endsWith(ext))
      .map((f) => path.join(dir, f));
  } catch { return []; }
}

function fail(msg) {
  console.error(`ERROR: ${msg}`);
  process.exitCode = 1;
}

function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(2)} KB`;
  return `${(kb/1024).toFixed(2)} MB`;
}

// Budgets (gzipped)
const BUDGETS = {
  widgetMax: 2 * 1024,                  // 2 KB gz
  pageJsMax: 30 * 1024,                 // 30 KB gz
  contentIndexMax: Math.round(1.5 * 1024 * 1024), // ~1.5 MB gz
};

console.log('--- Budget Audit (gzipped sizes) ---');

// 1) Widgets (served from public/)
const widgetsDir = path.resolve('public/widgets');
const widgetFiles = listFiles(widgetsDir, '.js');
if (widgetFiles.length === 0) {
  console.warn('No widget files found in public/widgets');
} else {
  console.log('\nWidgets:');
  for (const f of widgetFiles) {
    const buf = readFileOrNull(f);
    if (!buf) { console.warn(`  skip (missing): ${f}`); continue; }
    const gz = gzipSizeSync(buf);
    const ok = gz <= BUDGETS.widgetMax;
    console.log(`${ok ? '  ✓' : '  ✗'} ${fmtBytes(gz).padStart(8)}  ${path.relative(process.cwd(), f)}`);
    if (!ok) fail(`Widget over budget: ${path.basename(f)} (${fmtBytes(gz)} > ${fmtBytes(BUDGETS.widgetMax)})`);
  }
}

// 2) Content index size (public/content-index.json)
const idxPath = path.resolve('public/content-index.json');
const idxBuf = readFileOrNull(idxPath);
if (!idxBuf) {
  console.warn('\nNo public/content-index.json found (have you built it?)');
} else {
  const gz = gzipSizeSync(idxBuf);
  const ok = gz <= BUDGETS.contentIndexMax;
  console.log(`\nContent index: ${ok ? '✓' : '✗'} ${fmtBytes(gz)}  public/content-index.json`);
  if (!ok) fail(`content-index.json over budget (${fmtBytes(gz)} > ${fmtBytes(BUDGETS.contentIndexMax)})`);
}

// 3) Typical note page JS (dist/)
const distAstro = path.resolve('dist/_astro');
const noteGlobDir = path.resolve('dist/notes');
const noteDirs = listFiles(noteGlobDir).filter((p) => fs.existsSync(p) && fs.statSync(p).isDirectory());
let pageScripts = [];
if (noteDirs.length > 0) {
  const firstNote = path.join(noteDirs[0], 'index.html');
  const html = readFileOrNull(firstNote)?.toString('utf8') || '';
  const matches = [...html.matchAll(/\bsrc=\"(\/_astro\/[^\"\s]+\.js)\"/g)].map((m) => m[1]);
  const uniq = Array.from(new Set(matches));
  pageScripts = uniq.map((s) => path.resolve('dist' + s));
}

if (pageScripts.length === 0) {
  console.warn('\nNo page scripts found (did you run `npm run build`?)');
} else {
  let total = 0;
  console.log('\nTypical note page JS:');
  for (const p of pageScripts) {
    const buf = readFileOrNull(p);
    if (!buf) { console.warn(`  skip (missing): ${p}`); continue; }
    const gz = gzipSizeSync(buf);
    total += gz;
    console.log(`  - ${fmtBytes(gz).padStart(8)}  ${path.relative(process.cwd(), p)}`);
  }
  const ok = total <= BUDGETS.pageJsMax;
  console.log(`  Total: ${ok ? '✓' : '✗'} ${fmtBytes(total)} (budget ${fmtBytes(BUDGETS.pageJsMax)})`);
  if (!ok) fail(`Typical note page JS over budget (${fmtBytes(total)} > ${fmtBytes(BUDGETS.pageJsMax)})`);
}

process.exit(process.exitCode || 0);
