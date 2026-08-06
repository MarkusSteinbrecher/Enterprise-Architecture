# Open EA Repository — UI Spec: Inventory, Fact Sheet, Dependency Graph

**Status:** Draft for review
**Date:** 2026-08-06
**Companion to:** `open-ea-repository-design-brief.md` (screens 1, 2, 8), `open-ea-repository-concept.md` (§4 metamodel, §5 architecture, §6 report engine)
**Prototype:** `design/handoff/2026-08-inventory-factsheet-graph/` — `Archipelago.dc.html`, plus a component-level implementation spec in that folder's `README.md`
**Working title:** *Archipelago* (name not yet ratified — concept §10, ADR-005)

---

## 1. Scope

This spec covers the three surfaces the design brief ranks first, and the global chrome they share:

| # | Surface | Brief ref | Built |
|---|---|---|---|
| 1 | Inventory — faceted element list, table + card view | screens §1 | yes |
| 2 | Element fact sheet | screens §2 | yes (Overview tab) |
| 3 | Dependency graph — layered view, tracing, time point | screens §8 | yes |
| — | Top bar, left nav, command palette, save-state indicator | global UI elements | yes |
| — | Capability map, Landscape, Roadmap, Matrix, Portfolio bubble | screens §3–7 | no — inherit the report chrome established here |

Out of scope for the prototype, consistent with concept §7: import/export dialogs, first-run empty state, second-tab takeover warning, inline table editing, the Relations/Assessment/Quality tabs.

---

## 2. Design position

The app is **an instrument, not a marketing site** (brief, "Look & feel"). Three consequences that shaped every screen:

1. **Chrome recedes so report colour can mean something.** Semantic colour is reserved for layer, lifecycle, TIME, fit, and completeness. Chrome is a single neutral ramp plus one accent for action and focus. Nothing decorative is coloured.
2. **Density is earned, not maximised.** Balanced by default (38px rows) with a compact mode (31px). Every row carries seven columns of real signal — type, phase, both fits, criticality, TIME, completeness — so scanning a landscape doesn't require opening anything.
3. **No motion except one 120 ms palette entrance.** Hover states are border and background changes only. A repository should feel instant.

### 2.1 Visual identity: deliberately not the knowledge-base site

`docs/css/style.css` (Inter, `#2563eb`, 0.75rem radii, layered shadows) styles the research site. The app does **not** inherit it. The brief asks for "explicitly not a clone of LeanIX's visual identity"; the same reasoning applies to reusing a content-site theme for a data tool — the two products have different jobs and should be legible as different products.

The app identity is: **zero border radius, hairline borders, no shadows, Space Grotesk for UI, JetBrains Mono for every label / count / identifier, copper accent with a slate-teal secondary.** Monospace metadata is the signature move: it marks machine-readable content (ids, counts, property keys, relation types) as distinct from human-authored content, which is the thesis of the repository chapter made visible in the UI.

Full token table: handoff `README.md` → "Design tokens".

### 2.2 ArchiMate notation

Layer colour conventions are respected (yellow business / blue application / green technology, plus slate passive, purple motivation, magenta migration), desaturated to sit in the neutral chrome. Element type icons are replaced by **two-letter monospace codes** in a layer-coloured box (`AC`, `CP`, `BP`, `DO`, `SS`, `NO`, `TS`, `BA`, `GO`, `WP`). This is a deliberate substitute for the ArchiMate shape set: it is legible at 17px, needs no vendored SVG library (concept §2.2 risk: every ArchiMate JS library is a solo project), and works identically in list, card, graph, breadcrumb, and palette contexts. Vendored notation shapes remain the right choice for diagram export.

---

## 3. Structural decisions

### 3.1 Lifecycle is derived, never stored

Elements carry phase dates `{plan, in, act, out, eol}`. The phase at any time `y` is computed:

```
y < in  → Plan      y < act → Phase In    y < out → Active
y < eol → Phase Out                       else    → End of Life
```

Elements without dates (capabilities, actors, data objects, goals, work packages) are treated as Active and render `—` for each date.

There is no stored `lifecycle` field. This is what makes the concept's time dimension (§4.3, §6.1) free rather than a feature: the inventory evaluates at today, the graph evaluates at its slider year, and the roadmap will read the same dates. A stored phase would immediately drift from the dates and would need reconciliation logic.

### 3.2 Facet combinator is explicit and global

The brief asks for AND/OR/NOT. Rather than per-facet operators (LeanIX-style, powerful and consistently misread), the prototype exposes **one three-way combinator for the whole filter set**:

- **AND** — options OR within a group, groups AND together. The expected default.
- **OR** — match any selected option anywhere.
- **NOT** — exclude anything matching any selected option.

The name query is always ANDed on top. Saved searches carry their combinator with them, so "End-of-life applications" can ship as `layer:app + lifecycle:out + lifecycle:eol` under OR without the user reasoning about it. Active facets appear as removable chips above the list, and the result line states the mode: `12 of 29 elements · 3 filters (OR)`.

Facet counts are computed globally, not co-filtered. Co-filtered counts make numbers move under the cursor while clicking; the cost is that a count can exceed the current result set.

### 3.3 Tracing is the graph's primary verb

Reference points were Obsidian and Neo4j Bloom rather than a diagramming tool. Clicking a node **focuses** it: the node takes an accent stroke, direct neighbours stay lit, everything else drops to 0.16 opacity, incident edges turn accent, non-incident edges drop to 0.1. A side panel opens with the element's portfolio stats and its traced dependencies, each row re-focusing the graph.

Consequences worth keeping when this moves to React Flow + ELKjs:

- Edges render behind opaque node bodies, so centre-to-centre geometry is legal and needs no port anchoring. Same-band edges take a ±34px perpendicular curve to avoid passing through intermediate nodes.
- Layer bands are the cluster affordance (business / application / technology as labelled dashed regions), which is the "cluster" primitive of concept §4.3 in its simplest form.
- Solid strokes for structural relations (Realization, Serving, Assignment, Composition); dashed for Flow, Access, Association. This is the only edge-type encoding — edge labels are omitted at landscape scale and shown in the side panel instead.

### 3.4 One report chrome, established here

The graph screen carries the chrome all six generated reports share (brief, "Shared report chrome"): title with a live node/relation/time-point count, a colour-view segmented control, the time-point slider with a `TODAY` reset, a legend that regenerates from the active colour view, an export button, and the element side panel. Colour view maps directly onto the engine's `colorView` parameter; the slider onto `timePoint`. **Screens 3–7 should reuse this bar verbatim** and vary only the canvas.

### 3.5 The save-state indicator is chrome, not a dialog

Concept §8 lists browser-storage eviction as a live risk and the brief calls the trust cue a core differentiator. Implementation: a permanent header element — accent square, `LOCAL · 3 UNSAVED`, and an inline `SAVE FILE` action, with a tooltip explaining that the model lives in this browser. Calm, always visible, never modal, and it degrades to `LOCAL · SAVED`. No toast, no interstitial, no nag.

### 3.6 Keyboard entry point

`⌘K` / `Ctrl+K` opens a command palette over the whole element index (name + type substring match) with `↵` to open, `Esc` to close, and bare `g` / `i` to jump to graph / inventory. The header search field is a *button* that opens the palette rather than an input, so there is one search surface, not two.

Known gap: the prototype's single-letter shortcuts only check whether the palette is open. The implementation must also ignore them while any text input holds focus.

---

## 4. Element-type coverage

The prototype model is ArchiSurance-flavoured: 29 elements, 47 relationships across all six layer groups — 5 Capabilities, 1 Business Process, 2 Business Actors, 11 Application Components, 4 Data Objects, 4 technology elements (System Software, Node ×2, Technology Service), 1 Goal, 1 Work Package. Relationship types exercised: Realization, Serving, Flow, Access, Assignment, Composition, Association, Influence.

This is enough to prove the screens hold up for elements that carry no portfolio profile (capabilities show "Not assessed", `—` for TIME, `—` for every phase date) — the case that breaks fact-sheet layouts built only against applications. Replace with the real ArchiSurance exchange-format import; the graph coordinates in the prototype are hand-placed stand-ins for ELKjs output.

---

## 5. Decisions to ratify (ADR candidates)

| # | Decision | Alternative considered |
|---|---|---|
| UI-1 | App gets its own visual identity; the knowledge-base stylesheet is not reused | Extend `docs/css/style.css` with app tokens — rejected: different product, different job |
| UI-2 | Two-letter monospace type codes instead of vendored ArchiMate shape icons in list/graph/palette contexts | Vendor the MIT SVG shape sets everywhere — deferred to diagram export, where notation fidelity actually matters |
| UI-3 | Lifecycle phase derived from phase dates at a time point; no stored phase field | Store the phase and reconcile against dates |
| UI-4 | One global AND/OR/NOT combinator; saved searches carry their own | Per-facet operators |
| UI-5 | Global (non-co-filtered) facet counts | Co-filtered counts |
| UI-6 | Graph interaction is focus-and-trace with opacity falloff; no free positioning in this view | Editable auto-layout from the start (concept §6.3, still the right phase-3 route) |
| UI-7 | Single search surface: header field opens the command palette | Separate header search input plus a palette |
| UI-8 | Light and dark theme from day one, both hand-tuned (semantic colours lightened for dark, not filtered) | Ship light first, derive dark later |

---

## 6. Open questions

1. **Cards view** — does it earn its place next to the table, or is a table-only inventory with a denser compact mode enough?
2. **Fact-sheet tabs** — Overview / Relations / Assessment / Quality is drawn but not built. If relations and assessment already live on Overview, the tabs may only be needed once the quality seal (concept §7, phase 3) exists.
3. **Time point placement** — the slider currently lives on the graph. It belongs to the report engine, so it should probably sit in the shared report chrome for all six reports, and possibly in the inventory too.
4. **Completeness scoring** — the prototype shows a percentage per element and a mean as "model health". The scoring rule itself (which fields count, and weightings per element type) is not specified anywhere yet.
5. **Element counts at scale** — the brief cites 500–5,000 elements; the prototype renders 29. Table virtualisation and graph node budgeting (when to aggregate rather than draw) both need a decision before the ArchiSurance import lands.
