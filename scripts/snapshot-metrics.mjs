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

function fmtDate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}${m}${day}-${hh}${mm}`;
}

const widgetsDir = path.resolve('public/widgets');
const widgetFiles = listFiles(widgetsDir, '.js');
const widgets = {};
for (const f of widgetFiles) {
  const buf = readFileOrNull(f); if (!buf) continue;
  widgets[path.basename(f)] = { gz: gzipSizeSync(buf) };
}

const idxPath = path.resolve('public/content-index.json');
const idxBuf = readFileOrNull(idxPath);
const index = idxBuf ? { gz: gzipSizeSync(idxBuf), bytes: idxBuf.length } : null;

// gather one typical note page scripts
const noteDirs = listFiles(path.resolve('dist/notes')).filter((p) => fs.existsSync(p) && fs.statSync(p).isDirectory());
let noteScripts = [];
if (noteDirs.length) {
  const html = readFileOrNull(path.join(noteDirs[0], 'index.html'))?.toString('utf8') || '';
  const matches = [...html.matchAll(/\bsrc=\"(\/_astro\/[^\"\s]+\.js)\"/g)].map((m) => m[1]);
  const uniq = Array.from(new Set(matches));
  for (const s of uniq) {
    const p = path.resolve('dist' + s);
    const buf = readFileOrNull(p); if (!buf) continue;
    noteScripts.push({ file: s.replace(/^\/+/, ''), gz: gzipSizeSync(buf) });
  }
}

const totalNoteJsGz = noteScripts.reduce((a,b)=>a+b.gz,0);

const snapshot = {
  ts: new Date().toISOString(),
  widgets,
  index,
  noteScripts,
  totals: { noteJsGz: totalNoteJsGz }
};

const outDir = path.resolve('backups');
try { fs.mkdirSync(outDir, { recursive: true }); } catch {}
const outPath = path.join(outDir, `metrics-${fmtDate()}.json`);
fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2));
console.log(`Wrote metrics snapshot: ${path.relative(process.cwd(), outPath)}`);
