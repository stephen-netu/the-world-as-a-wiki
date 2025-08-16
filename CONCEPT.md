# Concept: The Worldbuilder’s Codex

Turn the site into an immersive, explorable codex for your world. Readers can browse by place, character, era, and theme, with multiple “lenses” (map, timeline, graph) and diegetic UI flourishes that feel like stepping into the setting.

Below is a concise, opinionated layout and IA proposal plus an implementation plan that fits your current Astro stack.

# Information Architecture

- __Home (/):__ Hero “Enter the World” portal. Featured arcs. Quick portals: Map, Timeline, Graph, Random.
- __Atlas (/atlas):__ The world map with clickable markers. List/filters for locations.
- __Timeline (/timeline):__ Eras and events with a scrollable timeline and cross-links to notes.
- __Codex (/codex):__ Browse everything by category (Entities, Lore, Artifacts, Magicks, Stories).
- __Characters (/characters):__ Index with profile cards and filters (faction, era, status).
- __Factions (/factions):__ Groups with relationships and territories.
- __Tags (/tags):__ Already implemented, kept as a power-user index.
- __Graph (/graph):__ Upgraded graph: colors by type, hover tooltips, focus paths.

# Layout Overview

- __Global App Shell__ in [src/layouts/BaseLayout.astro](cci:7://file:///home/netu/stephen-netu.github.io/src/layouts/BaseLayout.astro:0:0-0:0)
  - Topbar: Brand, search (command palette), primary hubs: Atlas, Timeline, Codex, Characters, Graph.
  - Sidebar (optional on desktop): dynamic “lens” panel: mini-map, mini-timeline, related graph preview.
  - Footer: sitemap links + “Legacy” link (your `.legacy/` TiddlyWiki is already preserved at `dist/legacy/`).

- __Card-Driven UI__
  - Unified `NoteCard.astro` for lists/grids.
  - Variant cards for Characters, Locations, Artifacts with iconography and tag chips.

# Page Templates and Components

- __Note detail (`src/pages/notes/[slug].astro`)__
  - Type-aware rendering (Character, Location, Artifact, Lore).
  - Sidebar: metadata (era, affiliations, tags), quick links (Map, Timeline, Graph), “Reading order” (story trails).
  - Sections: summary, content, outbound links (titles), backlinks (done), related entities (by tags/type).
  - Components:
    - `components/MetaPanel.astro`
    - `components/RelatedList.astro`

- __Characters__
  - `src/pages/characters/index.astro` with filters and profiles.
  - `components/CharacterProfile.astro` (name, aliases, affiliations, era, firstSeen/lastSeen, abilities).

- __Atlas__
  - `src/pages/atlas/index.astro` with a pan/zoom map.
  - MVP: large image + client-side pan/zoom + positioned markers from frontmatter coords.
  - Optional: Leaflet for true geo; start with zero-deps pan/zoom.

- __Timeline__
  - `src/pages/timeline/index.astro` with eras and events grouped.
  - MVP: vertical timeline; optional: lightweight timeline lib later.

- __Codex__
  - `src/pages/codex/index.astro` showing categories: Entities (Characters, Factions, Species), Places, Artifacts, Lore, Stories.

- __Search__
  - Global command palette (Ctrl+K) using Fuse.js on a prebuilt index (title, summary, tags, type).
  - Result types have icons and keyboard nav.

# Schema Enhancements ([src/content/config.ts](cci:7://file:///home/netu/stephen-netu.github.io/src/content/config.ts:0:0-0:0))

Add structure while keeping compatibility:

- __type:__ enum: "Character" | "Location" | "Artifact" | "Faction" | "Lore" | "Story" | "Event"
- __era:__ string (e.g., “First Age”)
- __eraStart / eraEnd:__ numbers or ISO dates (for timeline placement)
- __coordinates:__ object for map markers:
  - MVP (image coords): `{ x: number, y: number }`
  - Future (geo): `{ lat: number, lng: number }`
- __coverImage:__ string (asset path)
- __summary:__ short synopsis (already using description; we can alias or migrate)
- __aliases:__ string[]
- __affiliations:__ string[] (factions)
- __related:__ string[] (slugs)

We can infer `type` from tags initially (e.g., tag “Characters” => type Character) via a one-time migration step in the importer.

# Interaction Flourishes

- __Portals on Home:__ “Take me somewhere” random note, “Begin the Saga” curated trail, “Show me the Map/Timeline.”
- __Lenses:__ Toggle map/timeline/graph mini-widgets without leaving the page (client-side panels).
- __Reading Trails:__ Next/Previous within a story arc (frontmatter `trail: [slug1, slug2, ...]`).
- __Graph Enhancements:__ Color by type, click-to-focus, highlight shortest paths, tag-based clustering.

# Implementation Plan (Phased)

Phase 1 — App Shell + Home
- __AppShell__: Update [src/layouts/BaseLayout.astro](cci:7://file:///home/netu/stephen-netu.github.io/src/layouts/BaseLayout.astro:0:0-0:0) with topbar nav and grid layout for an optional sidebar.
- __Home redesign__: Replace [src/pages/index.astro](cci:7://file:///home/netu/stephen-netu.github.io/src/pages/index.astro:0:0-0:0) content with hero + portals + featured arcs.
- __Components__: `components/NoteCard.astro`, icons, simple CSS updates in `src/styles/global.css`.

Phase 2 — Schema + Type-aware Notes
- Extend [src/content/config.ts](cci:7://file:///home/netu/stephen-netu.github.io/src/content/config.ts:0:0-0:0) with fields listed above.
- Add type-aware rendering in `src/pages/notes/[slug].astro` and components (`MetaPanel`, `RelatedList`).
- Importer: infer `type` from tags; write optional fields if present.

Phase 3 — Hubs
- Add `src/pages/atlas/index.astro` (MVP image map + markers).
- Add `src/pages/timeline/index.astro` (vertical timeline).
- Add `src/pages/codex/index.astro` with category tiles.
- Add `src/pages/characters/index.astro` with filters.

Phase 4 — Search + Graph polish
- Command palette (Fuse.js) + keyboard nav.
- Graph colorization, focus, shortest path, tag filters.

Phase 5 — Visual polish
- Theming, dark mode, subtle textures for diegetic feel, but keep performance high.

# Minimal File/Dir Additions

- `src/components/AppShell.astro`
- `src/components/NoteCard.astro`
- `src/components/MetaPanel.astro`
- `src/components/RelatedList.astro`
- `src/components/CharacterProfile.astro`
- `src/pages/atlas/index.astro`
- `src/pages/timeline/index.astro`
- `src/pages/codex/index.astro`
- `src/pages/characters/index.astro`

# Optional Dependencies (later)
- Map: Leaflet (optional, start without)
- Search: Fuse.js
- Timeline: vis-timeline or pure CSS

# What I’ll do first (once you approve)
- Implement Phase 1:
  - Update [BaseLayout.astro](cci:7://file:///home/netu/stephen-netu.github.io/src/layouts/BaseLayout.astro:0:0-0:0) to AppShell (topbar nav + slots).
  - Redesign [index.astro](cci:7://file:///home/netu/stephen-netu.github.io/src/pages/index.astro:0:0-0:0) hero and portals.
  - Create `NoteCard.astro` and apply to home listing.
