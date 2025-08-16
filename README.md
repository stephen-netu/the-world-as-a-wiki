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
