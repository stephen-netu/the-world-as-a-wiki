# MASTER PLAN v2 (tool-agnostic, best-path)

We’ll choose the simplest, fastest architecture that delivers offline-first drafting, instant navigation, and small interactive overlays—while remaining fully static-hosting compatible and portable to alternate generators.

## Core Principles
- __Offline-first__: read and draft without network; no secrets; static hosting.
- __Small by default__: typical note page JS < 30 KB gz; each widget < 2 KB gz.
- __Runtime-neutral__: all interactivity is plain ES modules; no framework runtime required.
- __Portability__: treat the build system as replaceable. Lock in only to content schema and client contracts.

## Hard Budgets
- __Page JS__: < 30 KB gz (note view, no editor open).
- __Widgets__: each island < 2 KB gz, lazy-loaded on intersection.
- __Search__: initial palette open < 150 ms on mid device; first query < 200 ms; index < 1.5 MB gz for 5k notes.
- __SW cold nav__: <= baseline HTML + ~5–15 ms overhead with NavigationPreload enabled.

## Status Snapshot (2025-08-17)
- __Implemented__
  - `public/sw.js`: versioned caches, NavigationPreload, SWR assets, network-first HTML, crawler bypass, draft IDB scaffold, metrics marks and message contract (`sw:getVersion`, `sw:metrics:get`, `sw:skipWaiting`).
  - `scripts/build-content-index.mjs`: index generator with schema validation; writes `public/content-index.json`.
  - `src/layouts/BaseLayout.astro`: search palette (lazy MiniSearch), header trigger, localStorage perf counters (`palette.open.ms`, `search.ms`/`search.p95.ms`), SW update banner wiring.
  - `src/pages/notes/[slug].astro`: lazy widgets via IntersectionObserver; per-widget init timing to `widgets.init.ms`; minimal editor with draft save/clear via SW postMessage.
- __Verified__
  - Build succeeds (`astro build`), 110 pages generated; index includes 75 items.
- __Budgets (spot check)__
  - Client hoisted chunks remain small; widget modules are tiny. Palette/index loads only on demand.

## Immediate Next Actions
- __Update UX__: refine SW update banner styles and aria labels; add a small text button next to 🔎 if desired.
- __Budgets audit__: record gz sizes for note page (closed editor) and each widget; set thresholds in docs.
- __Search decision gate__: monitor `search.p95.ms` and `public/content-index.json` size; prep Pagefind/WASM fallback if thresholds are exceeded.
- __Docs__: capture SW message contract and perf counters in `README.md` for maintainers.

## Delightful UX (search + runtime)
- __Palette__
  - ARIA dialog semantics (`role="dialog"`, `aria-modal`, labeled title).
  - Focus trap; Esc to close; Ctrl/Cmd+K to open; Ctrl/Cmd+N/P to move selection; arrows + Enter to navigate; Shift+Enter opens in a new tab.
  - Debounced input (≈80 ms) to keep keystrokes snappy on mid devices.
  - Recent searches list (persisted in `localStorage['search.recent']`, capped to 10).
  - Tag filters via `#tag` tokens; remaining terms full-text via MiniSearch.
  - Match highlighting across title, tags, excerpt.
  - Perf counters: `palette.open.ms` (first open), `search.ms` samples, `search.p95.ms`, plus rolling `search.p95.hist` (≤60 entries).
- __SW Update banner__
  - `role="alert"`, `aria-live="assertive"`, focus management to Update button; Esc dismiss.

## Runtime Tools
- `/metrics.html` public viewer
  - Displays `search.p95.ms`, history table from `search.p95.hist`, live `content-index.json` size, SW version, and SW metrics via message API.
  - Export button downloads a runtime snapshot JSON for ad-hoc tracking.

## CI Budgets (enforced)
- `scripts/audit-budgets.mjs` checks gz sizes and fails build when exceeded:
  - Widgets each < 2 KB gz (`public/widgets/*.js`).
  - Typical note page JS total < 30 KB gz.
  - `public/content-index.json` < ~1.5 MB gz.
- GitHub Actions runs: install → build → audit → upload.
- `scripts/snapshot-metrics.mjs` emits `backups/metrics-YYYYMMDD-HHMM.json` on each build for longitudinal tracking.

## Stable Contracts (portable across stacks)
- __Content__: Markdown + YAML frontmatter in `content/notes/`.
- __Index__: `public/content-index.json` schema:
  - `[ { slug, title, type?, tags?: string[], date?, era?, eraStart?, eraEnd?, coordinates?: {x:number,y:number}, excerpt, links: string[], backlinks: string[] } ]`
- __Client runtime__:
  - Service Worker [public/sw.js](cci:7://file:///home/netu/stephen-netu.github.io/public/sw.js:0:0-0:0): versioned caches, NavigationPreload, network-first HTML, SWR assets, crawler bypass, draft IDB overlay via postMessage.
  - Widgets `public/widgets/*.js`: ES modules exporting `init(el, pageCtx)` (see [mini-graph.js](cci:7://file:///home/netu/stephen-netu.github.io/public/widgets/mini-graph.js:0:0-0:0)).
  - Page context: `<script type="application/json" id="page-ctx">` with `slug`, `title`, `frontmatter`, etc.
- __Perf marks__: `editor:toggle`, `palette:open`, `widget:init:<name>`, `sw:firstFetch`.

## Platform Options (decision matrix)
- __Zola (Rust)__
  - Pros: very fast builds; zero Node; simple binary; aligned with a future Tauri track.
  - Cons: fewer plugins; TOML config; write a small build script for index.
- __Eleventy (Node)__
  - Pros: flexible, simple; zero framework runtime; easy data collections.
  - Cons: Node toolchain; slower builds vs Zola at scale.
- __Pure static + Rollup/Vite__
  - Pros: ultimate minimalism; you control everything.
  - Cons: you rebuild common SSG ergonomics; more bespoke code.

Recommendation: default to __Zola__ for leanest long-term footprint and easiest future Tauri alignment, with a clearly documented escape hatch to Eleventy or pure-static. The client runtime and index are identical across choices.

## Phased Roadmap (agnostic)

- __Phase 0: Content + Index__
  - Structure `content/notes/**/*.md` with YAML frontmatter.
  - Build script (Rust, Go, or Node) to emit `public/content-index.json` exactly as per schema.
  - Acceptance: index builds < 1s/1k notes; schema validated; excerpt and links populated; backlinks computed.

- __Phase 1: SW + Offline Drafts__
  - [public/sw.js](cci:7://file:///home/netu/stephen-netu.github.io/public/sw.js:0:0-0:0) with:
    - Versioned caches, NavigationPreload enabled, network-first for navigations, SWR for assets, crawler bypass.
    - Draft overlay scaffold: IDB store `drafts` with `{ slug, markdown, updatedAt }`, postMessage API: `save-draft`, `clear-draft`.
  - Page registers SW once per session; no precache.
  - Acceptance: go offline → navigate cached note; save draft in editor → refresh → draft persists.

- __Phase 2: Reader + Minimal Editor__
  - Note template renders fast HTML.
  - Editor: textarea + live preview (marked or micromark) only when toggled.
  - Draft write path: localStorage and SW IDB postMessage (dual-path for resilience).
  - Acceptance: page JS < 30 KB gz closed; < 48 KB gz with editor open; preview latency < 16 ms for typical paragraph edits.

- __Phase 3: Widgets (Map, Timeline, Graph)__
  - Each widget is a tiny ES module:
    - Lazy via IntersectionObserver.
    - Read-only; render from `pageCtx` and maybe small slice of `content-index.json`.
  - Suggested libs: Pan/zoom via minimalist lib or CSS transforms; force layout via `ngraph.forcelayout` (tree-shakable ESM); timeline as pure CSS/SVG.
  - Acceptance: each widget < 2 KB gz; init under 50 ms; no runtime errors if disabled via feature flags.

- __Phase 4: Search Palette__
  - MiniSearch (client) with prebuilt fields: `title`, `tags`, `excerpt`, `slug`.
  - Load MiniSearch only on Ctrl+K/palette open; load index from `content-index.json`.
  - Decision Gate: if index > 1.5 MB gz or P95 query > 200 ms on mid device, pivot to Pagefind/WASM.
  - Acceptance: palette cold open < 150 ms; first search < 200 ms; keyboard-only navigation.

- __Phase 5: Publishing (optional)__
  - Export drafts as [.md](cci:7://file:///home/netu/stephen-netu.github.io/SPEC.md:0:0-0:0); manual PR or a simple GitHub App/Decap later.
  - No secrets in client; all write actions are manual by design.

## Rollback & Safety
- __Feature flags__: `?no-sw`, `?no-widgets`, `?no-search` in query string or localStorage keys.
- __SW gating__: update banner before `skipWaiting()`. Cache versioning `CACHE_vN_*`.
- __Crawler bypass__: detect bots, serve network HTML passthrough.
- __Metrics__: tiny counters in `localStorage`: `widgets.init.ms`, `palette.open.ms`, `search.p95.ms` (manual inspection).

## Minimal File Map (Zola example)
- `content/notes/...` Markdown files (YAML fm).
- `templates/` Zola templates for `note.html`, `index.html`, `tags.html`.
- `static/public/` copied as-is to site root:
  - `public/content-index.json`
  - [public/sw.js](cci:7://file:///home/netu/stephen-netu.github.io/public/sw.js:0:0-0:0)
  - [public/widgets/mini-map.js](cci:7://file:///home/netu/stephen-netu.github.io/public/widgets/mini-map.js:0:0-0:0), [mini-graph.js](cci:7://file:///home/netu/stephen-netu.github.io/public/widgets/mini-graph.js:0:0-0:0), `mini-timeline.js`
- `scripts/build-index` (Rust/Go/Node) to generate the index before `zola build`.

## Decision Gates (pivot triggers)
- __Budget breach__: sustained page JS > 30 KB gz closed state → review/removal before adding features.
- __Search gate__: index size or latency over thresholds → switch to Pagefind/WASM with prebuilt chunks.
- __Build friction__: if SSG causes significant DX friction or slow builds at scale → switch SSG; client runtime unaffected.
- __Feature ceiling__: if template system blocks required transforms → change SSG; keep contracts.
