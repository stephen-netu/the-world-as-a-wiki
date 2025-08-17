<!--
This document is ARCHIVED and has been superseded by `.netu/STRATEGY.md`.
Please refer to that file for the current project plan.
-->

# SPEC: Dynamic, Fast, Enjoyable World‑Building Tool

This spec defines scope, order of operations, and acceptance criteria to implement a TiddlyWiki/Obsidian‑like experience on an Astro site while keeping static builds and Git simplicity.

## Non‑Goals
- No always‑on backend. All features must work on GitHub Pages (static hosting).
- No secrets in client. Optional publishing flows occur via PRs or Decap CMS later.

## Definitions
- Note: Markdown file with frontmatter under `src/content/notes/`.
- Draft: Client‑side edited content stored locally (localStorage/IDB), not published.

---

## Phase 1 — Service Worker Draft Overlay + Content Index

### Goals
- Make drafts visible across navigation ("feels live"), offline‑friendly.
- Provide a lightweight search/graph data source.

### Deliverables
- `public/sw.js` — Service Worker
  - Intercept GET for `/notes/:slug/`; if a local draft exists, serve a rendered HTML response with a small banner "Viewing draft".
  - Cache CSS/JS with stale-while-revalidate; pages network-first with cache fallback.
  - Versioned caches and SW update flow:
    - Use explicit names like `CACHE_V1_assets`, `CACHE_V1_pages`.
    - On `install`: delete old caches by prefix mismatch; optionally use `workbox-expiration` for maxEntries/maxAge.
    - On `activate`: `self.clients.claim()`; gate `skipWaiting()` behind a user prompt or quiet update banner.
    - NavigationPreload enabled to reduce startup latency.
    - Bot/crawler bypass: detect common crawler UAs and serve network-first canonical HTML.
- Build index: `public/content-index.json`
  - Generated at build time: `[ { slug, title, type, tags, date, era, coordinates, links } ]`.
  - Client helper to update in-memory and IDB copy on draft save.

### Integration Points
- `src/pages/notes/[slug].astro` registers SW (guard idempotent).
- Editor save writes a full markdown snapshot to local storage and optionally an extracted summary for index update.

### Acceptance Criteria
- Toggling to another note with a saved draft shows the draft without a page rebuild; a banner indicates draft view.
- Offline navigation to recent notes still loads from cache; a custom offline page shows when no cache.
- `content-index.json` exists and is consumable client-side; updates reflected immediately for search/graph widgets.
- Search query p95 latency < 100 ms on typical dataset; SW first-intercept < 300 ms from activation on warm loads.

---

## Phase 2 — Editor Frontmatter Helpers + Atlas Coordinate Picker

### Goals
- Improve authoring flow while preserving raw Markdown editing.

### Deliverables
- Frontmatter helpers in `src/pages/notes/[slug].astro` (client script):
  - Date picker updates `date`.
  - Era selector updates `era` (optional `eraStart/eraEnd`).
  - Tag chips add/remove tags.
- Atlas coordinate picker:
  - In Edit mode, mini‑map accepts click to set `%` `x/y` on `coordinates` and previews marker.

### Acceptance Criteria
- Editing helpers mutate the exported `.md` frontmatter correctly.
- Clicking mini‑map places the marker consistently independent of image dimensions.

---

## Phase 3 — Client Search + Command Palette

### Goals
- Instant local search and quick navigation.

### Deliverables
- `public/content-index.json` consumed client‑side.
- MiniSearch client (lazy‑loaded) with fields: `title`, `tags`, `bodyPreview`.
- Command palette (Ctrl/Cmd+K) lists notes, filters by type/tags, accepts fuzzy queries.

### Acceptance Criteria
- Search results appear < 100ms for typical query sets.
- Palette navigates to selected note; respects draft SW overlay.

---

## Phase 4 — Graph and Timeline Enhancements

### Goals
- Visual discovery without heavy deps.

### Deliverables
- Graph neighborhood widget upgrade:
  - 1‑hop layout (radial or light force) with hover tooltips and lazy hydration.
- Timeline era‑bound ticks and optional zoom.

### Acceptance Criteria
- Widget JS per page remains modest; no regressions to LCP.
- Era‑bound ticks render correctly for notes with `eraStart/eraEnd`.

---

## Phase 5 (Optional) — Git‑Backed Publishing

### Goals
- Publish from the browser via PR/commit.

### Options
- Decap CMS at `/admin` with GitHub backend and tiny OAuth proxy (Vercel/CF Worker).
- Custom GitHub App + serverless function (commit/PR).

### Acceptance Criteria
- Auth flow succeeds; edits in UI become commits/PRs to `src/content/notes/` and trigger site rebuild.

---

## Technical Notes

### SW Draft Rendering
- Keep a tiny client renderer (CDN `marked` or equivalent). When serving drafts, embed a minimal HTML shell using the same site CSS via cached links.
- Add a visual banner and a link to "Revert draft" (clears local storage for that slug).

### Index Build Task
- Add a small build script (Astro integration or node script) to traverse notes, parse frontmatter, compute outbound links, and emit `public/content-index.json`.

### Performance
- Use IntersectionObserver and dynamic imports for widgets and editor features.
- Keep per-page JS small; import heavier features only behind explicit user intent (e.g., open palette, enter edit mode).

#### Performance Budgets
- JavaScript per typical page: < 30 kB gz; heavier islands lazy-hydrated (`client:visible`/`import-on-interaction`).
- LCP: < 2.0s on low-end mobile; CLS < 0.1; low TBT.
- Interaction latency (palette open, editor toggle): < 50 ms.
- Search p95: < 100 ms; Graph incremental layout < 200 ms per update.

### Accessibility
- Keyboard: Ctrl/Cmd+E toggle editor, Ctrl/Cmd+S save draft, Ctrl/Cmd+K palette.
- Focus management when toggling editor and palette; maintain ARIA roles for dialogs.

---

## Order of Operations (Checklist)

1. SW + Index
   - [ ] Create `public/sw.js` with draft overlay and caches
   - [ ] Register SW in `[slug].astro`
   - [ ] Build script emits `public/content-index.json`
   - [ ] Client helper updates index on draft save

2. Editor Helpers + Atlas Picker
   - [ ] Add date/era/tag controls in editor panel
   - [ ] Implement mini‑map click‑to‑set `%` `x/y`
   - [ ] Ensure export merges updated frontmatter

3. Search + Palette
   - [ ] Add MiniSearch and index loading
   - [ ] Implement command palette (Ctrl/Cmd+K)
   - [ ] Wire navigation and filters

4. Graph + Timeline
   - [ ] Upgrade neighborhood graph layout & UI
   - [ ] Era‑bound ticks and zoom on timeline

5. Optional Publish
   - [ ] Add `/admin` with Decap CMS config
   - [ ] Deploy tiny OAuth proxy; connect GitHub backend

---

## Rollback & Safety
- Feature flags (localStorage or query params) to disable SW overlay, editor helpers, or search in case of issues.
- Revert by removing SW registration, deleting `sw.js`, and clearing caches.

## QA & Testing
- Manual flows: draft save/revert/export/import; offline nav; search; coordinate picker; palette keyboard.
- Lighthouse checks (Performance/Accessibility/Best Practices/SEO).
- Mobile viewport testing (editor usability, map taps).