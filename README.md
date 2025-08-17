# The World (as Wiki) — Astro Edition

Modern, contribution-friendly site powered by Astro with Markdown notes, backlinks, and an interactive graph.

- Live site: https://stephen-netu.github.io/
- Notes live in `src/content/notes/` as Markdown files with frontmatter
- Interactive graph at `/graph`
- Legacy TiddlyWiki available at `/legacy/`

## Develop locally

Prereqs: Node 18+ (Node 20 used in CI).

```bash
npm install
npm run dev
# open http://localhost:4321
```

## Build & deploy

- CI deploys on pushes to `main` via `.github/workflows/deploy.yml`.
- Manual build:

```bash
npm run build
npm run preview
```

Postbuild copies the legacy `the-world-as-wiki.html` into `dist/legacy/index.html` along with `assets/`.

## Content model (content collections)

Each note is a Markdown file in `src/content/notes/` with frontmatter:

```yaml
---
title: Note Title
description: Optional short summary
date: 2025-08-16
tags: [people, places, concepts]
links: [slug-of-other-note, another-slug]
draft: false
---

Body text in Markdown.
```

- `links` specifies outbound links by slug; backlinks are computed automatically.
- New notes auto-appear on the home page and in the graph.

## Add a new note

1) Create `src/content/notes/my-note.md` with frontmatter.
2) Link to others by adding their slugs in `links`.
3) Optionally tag with `tags`.

## Project structure

- `src/pages/` — routes (`/`, `/notes/[slug]`, `/graph`, `404`)
- `src/layouts/` — shared layout (`BaseLayout.astro`)
- `src/styles/global.css` — base styles
- `src/content/` — content collections config and notes
- `public/` — static files copied as-is (favicon, robots)

## Runtime contracts (client)

- __Service Worker__ (`public/sw.js`)
  - Caching: versioned caches, NavigationPreload, network-first HTML, SWR assets
  - Messages: `{ type: 'sw:getVersion' | 'sw:metrics:get' | 'sw:skipWaiting' }`
  - Events to page: `postMessage({ type: 'sw:activated' })` on activation
- __Update banner__ (wired in `src/layouts/BaseLayout.astro`)
  - Shows when `reg.waiting` exists after install; “Update” sends `sw:skipWaiting`; reload on `controllerchange`
- __Perf counters__ (localStorage; lightweight)
  - `palette.open.ms`: samples of cold-open time for search palette
  - `search.ms`: rolling samples of query time; `search.p95.ms`: computed p95 in ms
  - `widgets.init.ms`: samples of per-widget init times (lazy via IntersectionObserver)
- __Feature flags__ (query string or localStorage key=value '1')
  - `no-sw`, `no-widgets`, `no-search`
- __Search gating thresholds__
  - Palette cold-open < 150 ms; first query < 200 ms on mid device
  - `public/content-index.json` < ~1.5 MB gz for ~5k notes; if exceeded or p95 > 200 ms → pivot to Pagefind/WASM

## Legacy TiddlyWiki

- Original single-file wiki is kept at repo root as `the-world-as-wiki.html`.
- Deployed at: https://stephen-netu.github.io/legacy/
- Images in `assets/` are copied to `/legacy/assets/` during build.

## Contributing (future-friendly)

- The site is designed to accept PRs (Markdown notes) in the future.
- We can add CI checks for schema validation, link integrity, and image optimization.

## Roadmap ideas

- Optional: MDX support for richer embeds
- Optional: Algolia/Lunr search
- Optional: Theming toggle and typography polish
- Optional: Content license + contribution guidelines

---
TiddlyWiki remains © its authors under the BSD 3-Clause license. This Astro site is your content; choose and document your preferred license.
