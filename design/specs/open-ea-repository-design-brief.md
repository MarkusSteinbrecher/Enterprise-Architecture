# Open EA Repository — Design Brief (for UI mockups)

**Companion to:** `open-ea-repository-concept.md` (full concept)
**Working title:** *Archipelago*
**Date:** 2026-08-06

## What we're building

An **open-source Enterprise Architecture repository that runs entirely in the browser** — a static web app (GitHub Pages), all data stored locally in the browser, no backend, no login. Think **LeanIX-class portfolio management, but local-first and ArchiMate-native**: users inventory their applications, business capabilities, and technology; assess them (lifecycle, fit, criticality); and get auto-generated visual reports.

One sentence: *"LeanIX-class EA portfolio management as a static web app — ArchiMate-native, local-first, git-friendly, agent-ready."*

## Who uses it

- **Solo/consulting enterprise architect** (primary): imports a model or spreadsheet, produces landscape/capability/roadmap views for a client engagement within minutes. Desktop browser, data-dense work.
- **EA teams evaluating tooling**: want to experience structured portfolio management before buying LeanIX/Ardoq.

## Core mental model

- A **workspace** holds **elements** (typed: Application, Business Capability, Business Process, Data Object, Interface, IT Component, Organization, Goal, Initiative…) and **relationships** between them (also typed, and carrying their own properties like cost or support type).
- Elements carry a **portfolio profile**: lifecycle (Plan → Phase In → Active → Phase Out → End of Life, each with a date), functional fit, technical fit, business criticality, TIME classification (Tolerate/Invest/Migrate/Eliminate), plus **tags** (colored, grouped).
- Everything the user sees is derived from this graph. Reports are configurations, not drawings: *base type + filter + cluster + color view*.

## Key screens to mock (priority order)

1. **Inventory** — the workhorse. Element list with a **faceted filter sidebar** (type, layer, lifecycle phase, tags, relations, AND/OR/NOT), full-text search bar, saved searches. Two modes: card/list view and a **spreadsheet-like table view** with inline editing. Type-colored badges per element type.
2. **Element page ("fact sheet")** — header with name, type badge, **completeness score** (small ring/percentage), tags; body in sections: description, portfolio assessment (lifecycle bar + fit/criticality selectors), relations grouped by kind (with inline add/remove), properties. Right rail: related views, metadata.
3. **Capability map** — boxes-in-boxes hierarchy (capability → sub-capabilities → applications inside), **heat-colored** by a selectable view (lifecycle, fit, TIME). Color legend always visible; clicking anything opens a side panel, not a page jump.
4. **Application landscape** — applications clustered into group boxes (by capability or organization), colored by the active view. Same legend/side-panel pattern as the capability map.
5. **Roadmap** — Gantt-style lifecycle timeline: one row per element, colored phase bars (Plan/Phase In/Active/Phase Out/EOL), zoom from weeks to years, "today" marker.
6. **Portfolio bubble chart** — 2D scatter (e.g. functional fit × technical fit), bubble size = cost or count, quadrant hints for TIME decisions.
7. **Matrix** — grid of applications at the intersection of two dimensions (e.g. capability rows × organization columns), cells colored by view.
8. **Dependency/data-flow graph** — applications as nodes, interfaces/flows as edges, auto-laid-out left-to-right.

Shared report chrome across screens 3–8: report title, filter bar, cluster/view pickers, color legend, export button (SVG/PNG), and the element side panel.

## Global UI elements

- **Top bar:** workspace switcher, global search, import/export menu, **save-state indicator** (see below), theme toggle.
- **Left nav:** Inventory, Reports (the six above), Views (saved configurations), Settings.
- **Import/export is a first-class flow, not buried settings:** open/save model file (JSON), import ArchiMate/Excel, "load demo workspace (ArchiSurance)". First-run empty state should offer exactly three actions: *Start empty · Import a file · Explore the demo*.
- **Save-state indicator:** data lives in the browser; the UI must gently communicate "saved locally / unsaved to file" and encourage exporting to a file. This trust cue is a core differentiator — make it visible but calm.

## Look & feel

- **Data-dense, calm, professional** — an instrument, not a marketing site. Desktop-first (≥1280px), light + dark theme from day one.
- Color does semantic work (lifecycle phases, fit ratings, TIME, element types) — the palette must keep categorical/status colors distinguishable and accessible in both themes; chrome stays neutral so report colors dominate.
- ArchiMate has an established notation (element type icons, layer color conventions: yellow business / blue application / green technology) — respect it in diagrams/badges, but don't let it dictate the app chrome.
- Inspiration: LeanIX's report ergonomics (legend + side-panel editing), Linear's density and keyboard-friendliness, Notion's calm chrome. Explicitly **not** a clone of LeanIX's visual identity.

## Constraints

- Static SPA, everything client-side; no user accounts, no avatars, no sharing UI.
- Single-user, single tab (a second tab shows a polite takeover warning).
- Typical dataset: 500–5,000 elements — lists and maps must handle hundreds of visible items gracefully.
