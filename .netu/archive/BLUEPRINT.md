<!--
This document is ARCHIVED and has been superseded by `.netu/STRATEGY.md`.
Please refer to that file for the current project plan.
-->

# Blueprint for a Live, Offline-First Astro Atlas

## Executive Summary: A Vision for the Live, Offline-First Atlas

This report details a strategic technical blueprint for transforming the existing Astro-based worldbuilding site into a dynamic, "live" editing and discovery platform. The core strategy is centered on a Service Worker-powered, offline-first architecture that achieves a responsive, app-like feel without a dedicated backend. By leveraging in-browser storage (IndexedDB) for local drafts and building a comprehensive, client-side content graph, the system can provide a seamless editing experience that remains functional even when the user is disconnected from the network.

Subsequent sections outline the implementation of minimalist, high-performance interactive visualizations, a refined in-browser editor, and a future-proof publishing pipeline. The approach strictly prioritizes a lean, dependency-minimal stack to ensure the project remains performant, portable, and fully compatible with static hosting environments like GitHub Pages.

---

## 1. The "Live" Illusion: Offline-First Architecture

### 1.1. Service Worker as a Dynamic Proxy for Local Drafts

To create the illusion of a "live" system on a static site, an intelligent Service Worker is essential. A Service Worker operates as an event-driven proxy between the browser and the network, running on its own thread with no direct access to the DOM. This unique environment allows it to intercept and respond to network requests, enabling the site to serve content from a local cache even when offline.

- The Service Worker (`/sw.js`) should be registered from the main application script with a scope of `/`, ensuring it controls all pages, including the `src/pages/notes/[slug].astro` route.
- Core: intercept requests for note URLs; if a local draft exists in IndexedDB, synthesize a response by injecting the new Markdown into the original static HTML, and add a "Viewing Draft" banner. If not, fall back to the network/static HTML.
- Avoid Astro integrations that require SSR (e.g., `astro-service-worker`) to preserve static hosting compatibility. Prefer a custom SW (or foundational Workbox utilities) for granular control.

Data channel: A Service Worker cannot directly access `localStorage`. Establish a client <-> SW communication via `postMessage`. On draft save, the client posts the updated draft to the SW, which persists it in its own IndexedDB instance. This ensures the SW can immediately serve current drafts before any network activity.

### 1.2. The Client-Side Content Graph: A Single Source of Truth

To power smart linking, backlinks, and instant search without a server, build a comprehensive, in-memory content graph available client-side.

- At build time, generate a static index (e.g., `public/content-index.json`) by iterating `src/content/notes/` to extract: slug, title, links, backlinks, tags, coordinates, dates/eras.
- On first load, fetch this JSON to initialize the in-memory graph.
- When editing, update both: (a) the IndexedDB draft store and (b) the in-memory graph entry; also broadcast to the SW via `postMessage` so it updates its IndexedDB copy. This decentralized sync keeps the app live and consistent offline.

---

## 2. A Core Transformation: The Editor & Content Model

### 2.1. Markdown Editor: Evaluating the Cost vs. Benefit

Given a strict sub-~30kB hydration budget per page, the editor choice is crucial.

- EasyMDE: ~104 kB gz; great UX but too heavy for our budget.
- CodeMirror 6: powerful and modular but commonly > 50 kB gz in realistic setups; requires careful trimming; still heavy.
- Textarea + plugins: minimal, controllable, dependency-light. Use `marked` via CDN for preview.

Recommendation: continue with the textarea + live preview, layering optional controls and shortcuts. This guarantees adherence to the budget.

Table (summary):
- EasyMDE: ~104 kB, low integration effort, violates budget.
- CodeMirror 6: > 50 kB, high customization effort, powerful but overkill.
- Textarea + marked: ~3.8 kB (marked only), very high control, aligns with goals.

### 2.2. In-Browser Frontmatter Management

Avoid heavy remark/unified pipelines. Parse frontmatter with a tiny helper and a small YAML dependency.

Example (TypeScript):

```ts
// src/utils/frontmatter-parser.ts
import yaml from 'js-yaml';

export function parseFrontmatter(markdown: string) {
  const parts = markdown.split('---');
  if (parts.length < 3) return { data: {}, content: markdown };

  const frontmatter = parts[1];
  const content = parts.slice(2).join('---').trim();

  try {
    const data = yaml.load(frontmatter) as Record<string, unknown>;
    return { data, content };
  } catch (e) {
    console.error('Frontmatter parsing error:', e);
    return { data: {}, content };
  }
}
```

### 2.3. Diegetic & Dynamic Edit Controls

Provide dynamic, diegetic UI controls that edit frontmatter without bloating the bundle.

- Coordinate picker (Atlas): clicking the map updates `%` coordinates in frontmatter.

```ts
// src/utils/coordinate-picker.ts
export function getPercentCoords(e: MouseEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  return { x: (x / rect.width) * 100, y: (y / rect.height) * 100 };
}
```

- Other helpers (date, era, tags) are lazily hydrated islands (`client:visible`/`import-on-interaction`).

---

## 3. Interactive Visualizations: Atlas, Graph, and Timeline

### 3.1. Atlas: A Multi-Layered, Interactive Map

- Use a tiny pan/zoom lib (e.g., Panzoom) or CSS transforms.
- Ensure markers remain clickable (e.g., a `panzoom-exclude` class on markers to avoid event interception).
- Mini-map "view window": render a static thumbnail; overlay a bordered div whose position/size mirrors main map transform.

### 3.2. Graph: Minimalist and Incrementally Updated

- Lazy-hydrate the mini-graph with `client:visible`.
- Use a compact force layout (e.g., `ngraph.forcelayout`) or a simple radial layout for 1-hop neighborhoods.
- Update the layout incrementally as the in-memory graph changes.

### 3.3. Timeline: Smooth Navigation and Contextual Ticks

- Prefer pure CSS/vanilla JS. Horizontal scroll container, flex/grid for events.
- Optional micro-libs for smooth scroll; or CSS `scroll-behavior` + small JS.
- Era-bound ticks using `eraStart/eraEnd` mapped to positions along the axis.

---

## 4. Discovery & Linking: A User-First Approach

### 4.1. Instant, Client-Only Search

- Build a compact JSON index at build-time; load once; query in-memory.
- Use MiniSearch for fuzzy matching and field boosting with a small footprint.

Comparison (summary):
- MiniSearch: ~8 kB, fast, feature-complete for our needs.
- FlexSearch: ~16 kB, very fast, heavier and more complex.
- Fuse.js: ~6 kB, fine for small/medium, less suited for large full-text.
- Pagefind: CLI-driven, great for static full-text; different trade-offs.

### 4.2. Smart Linking & Backlink Surfacing

- Backlinks: on note pages, query the in-memory graph for incoming links to the current slug; render a sidebar widget.
- Suggested links: compute similarity via tag overlap and keyword frequency; surface as suggestions with click-to-insert.

---

## 5. Performance and UX Optimization

### 5.1. Hydration Budget: Gating Features with Astro Islands

- `client:visible`: for heavier widgets (mini-graph, mini-timeline).
- `client:idle`: for the editor panel hydration (does not block first paint).
- `import-on-interaction`: load preview/controls only after explicit user action (Edit).

### 5.2. Aesthetically Cohesive UI: Theming & Transitions

- Use CSS variables (`:root { --primary: ... }`) and `prefers-color-scheme` for dark mode.
- Add tasteful transitions for theme changes and navigation (respect `prefers-reduced-motion`).

### 5.3. Accessibility as a Feature

- Ensure keyboard navigation with `tabindex` and arrow-key handlers for composite widgets.
- Use ARIA attributes (e.g., `aria-activedescendant`) for virtual focus patterns where needed.

---

## 6. The Publishing Pipeline: A Future-Proof Strategy

### 6.1. GitHub-Backed Publishing: Decap CMS vs. Custom GitHub App

- Decap CMS: pragmatic, battle-tested UI over Git workflows; minimal setup; heavier dependency but offloads auth/versioning.
- Custom GitHub App + serverless: ultimate control, zero client dependencies; significantly more implementation effort.

Example (Node serverless) commit flow:

```ts
// Example: create/update a file via GitHub REST API
import { Octokit } from 'octokit';

export async function createCommit(owner: string, repo: string, path: string, content: string, message: string) {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const base64Content = Buffer.from(content).toString('base64');
  let sha: string | null = null;

  try {
    const { data } = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', { owner, repo, path });
    sha = (data as any).sha;
  } catch {
    // file does not exist
  }

  await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', { 
    owner,
    repo,
    path,
    message,
    content: base64Content,
    sha: sha ?? undefined,
  });
}
```

---

## 7. Prioritized Roadmap & Risk Assessment

### 7.1. Phased Development Roadmap

- Near-Term (2–4 weeks)
  - Service Worker: offline-first asset caching; fetch handler for drafts from IndexedDB.
  - Editor Panel v1: move `marked` live preview to import-on-interaction.
  - Client-Side Index: generate `content-index.json` at build time.
  - Basic Search: implement MiniSearch against the index.

- Medium-Term (1–2 months)
  - Atlas: integrate pan/zoom and build the Coordinate Picker + Mini-map view window.
  - Graph & Timeline: implement light layout and vanilla timeline; lazy-hydrate with `client:visible`.
  - Editor UX: dynamic frontmatter controls (date/era/tag).
  - Smart Linking: backlinks + suggested links via the in-memory graph.

- Long-Term (3+ months)
  - Publishing Pipeline: integrate Decap CMS or a custom GitHub App + serverless.
  - Stretch: local plugin architecture; procedural map overlays; optional local LLM-assisted helpers.

### 7.2. Risks & Mitigation

- SEO & SW: ensure SW bypasses for crawlers; serve static network-first for known bots.
- Cache Invalidation: version caches; on `install`, delete old caches; consider Workbox expiration policies.
- Schema Drift: export schema JSON at build; validate drafts against it before saving.
- Security: HTTPS only; limit SW scope to `/`; avoid storing sensitive data in caches/IDB.
- Performance & Jank: use NavigationPreload; aggressive lazy-loading and import-on-interaction for non-critical code.

---

## Alignment with Strategy

- Astro-first, static hosting compliant.
- SW draft overlay, local drafts in IndexedDB, versioned content index.
- Lean visualizations (pan/zoom, light graph layout, CSS timeline).
- MiniSearch-based client search; optional future WASM/Tauri tracks if needed.