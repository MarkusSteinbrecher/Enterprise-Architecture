# Archipelago — Archi-class modelling, repository, collaboration and transition states

**Status:** Draft for sponsor review (2026-09-29)
**Revises:** the positioning in #56 ("modelling second"), and extends `open-ea-repository-concept.md` §1, §3 and §7.
**Relates to:** #57 (metamodel profile), #58 (time and change model), #59 (collaboration), #60–#64 (transformation planning), #67 (history), ADR 0003 (generated views).

## 1. Direction

> **Everything an architect does in Archi, as a modern web application — plus what Archi lacks: a real repository, collaboration, and planned transition states.**

Sponsor direction, 2026-09-29:

1. **Rebuild Archi's functionality** as a web app. Archi is the de-facto free ArchiMate modeller; its feature set is the baseline an architect expects.
2. **No Archi technology one-to-one.** Archi is Java / Eclipse RCP / SWT / GEF / EMF. None of that is carried over. Archi's *functionality* is the specification; the implementation is ours (TypeScript, React, the existing `src/model` and `src/io`). Archi's repository (MIT) is used as a **reference and test oracle only** — e.g. `relationships.xml` to check our validity rules, its `.archimate` test models to check our importer — not as code to port.
3. **Extend where it makes sense.** Three extensions are named explicitly:
   - a **better repository** (typed profile, history, authorship, portfolio data — the part LeanIX does well and Archi does not do at all);
   - **collaboration** (more than one architect on one repository);
   - **multiple versions of the repository to plan transition architectures** — baseline, transition states, target, alternative scenarios.

### What changes against #56

#56 proposed "repository and transformation planning first, **modelling second**". This direction keeps the repository and transformation half of #56 but makes **modelling a first-class pillar again**: hand-drawn ArchiMate views are the thing Archi users will look for first, and without them Archipelago is not an Archi alternative. The product has three pillars of equal standing:

| Pillar | Answers | Today |
|---|---|---|
| **Model** (Archi parity) | "How do I draw and structure the architecture?" | Metamodel, validity, inventory, fact sheet; **no diagram editor** |
| **Repository** | "What do we have, who owns it, how good is it?" | Inventory, portfolio profile, completeness, saved searches |
| **Plan** (transition states) | "How do we get from here to there?" | Lifecycle dates on elements only |

Collaboration cuts across all three.

## 2. Archi feature map

Source: the Archi User Guide (`com.archimatetool.help`, current `master`) and Archi's bundle list. Status is Archipelago today. **Treatment**: *adopt* (same capability, our design), *redesign* (same need, a better answer for the web), *extend* (Archi has a partial answer; we go further), *skip*.

### 2.1 Model structure

| Archi | Archipelago today | Treatment |
|---|---|---|
| Model tree with typed top-level folders and user sub-folders | Faceted inventory (list/table), no folders | **Adopt** a model tree alongside the inventory. Folders are organisation, not semantics; the exchange format's `<organizations>` round-trips them (not read today — surfaced as an `ImportProblem`). |
| Tree search and filter (name, documentation, property, type) | Full-text search, faceted AND/OR/NOT filters, saved searches | **Have — ahead of Archi.** |
| Model properties, element/relationship properties, user properties | Fact sheet with sections, profile fields, properties | **Have.** Missing: *properties manager* (rename/delete a key model-wide). |
| Specializations manager (specialised types with own icon) | Portfolio profile for a fixed set of types | **Extend** via the repository profile (#57 option C): specialisations become profile types with display name, icon, custom fields. |
| Navigator (relationship tree in/out) | Relations section on the fact sheet, trace panel | **Have.** |
| Visualiser (radial graph of a concept's neighbourhood) | Neighbourhood graph on the fact sheet, dependency graph | **Have.** |
| Hints window (notation help) | — | **Redesign** as inline help in the palette and type chips. |

### 2.2 Views (diagrams) — the largest gap

Archipelago has **generated** views only (ADR 0003: React Flow + ELKjs). Archi's core is **hand-drawn** views. All of the following are missing:

| Archi capability | Treatment |
|---|---|
| Create/open views; views stored in the model and in folders | **Adopt.** A view is a model object (see §5.1). |
| Palette with every element and relationship type, grouped by layer | **Adopt**, filtered by the view's viewpoint; plus keyboard-first creation through the command palette (**extend**). |
| Add new elements; add existing elements from tree/inventory (drag) | **Adopt.** Re-using an element in several views is the heart of ArchiMate modelling. |
| Relationships drawn between shapes, only valid types offered | **Adopt**, driven by `src/model/validity.ts`. |
| **Magic connector** (pick target type and relationship in one gesture) | **Adopt** — it is the most-loved Archi interaction. |
| Nesting (visual containment) with optional relationship creation | **Adopt**, including Archi's "which relationship does this nesting mean" prompt. |
| Junctions, groups, notes, legends, view references (link to another view) | **Adopt.** |
| Connections: bend-points, manual/orthogonal router, label position | **Adopt.** Router choice is part of the diagram-engine ADR (§5.2). |
| Appearance: fill, line, font, text alignment/position, figure alternative, icons/images | **Adopt**, bounded by our design tokens: a default ArchiMate palette in tokens, per-object overrides stored on the view object. |
| Format painter, align/distribute, grid and guides, z-order, copy/paste, select-in-model | **Adopt.** |
| Full-screen, zoom, outline (mini-map) | **Adopt.** |
| Export view as image (PNG, SVG, PDF) | **Adopt** — SVG export already exists for the dependency graph. |
| **Generate view for element(s)** with a chosen viewpoint | **Extend**: our generated views (ADR 0003) gain a "materialise as editable view" action — the generated layout becomes a starting diagram. |
| Viewpoints (ArchiMate 3.2 set) restricting palette and flagging foreign elements | **Adopt.** Archi's `viewpoints.xml` is the cross-check for our table. |
| Sketch view, Canvas toolkit (Business Model Canvas) | **Later.** Useful, not load-bearing. |

### 2.3 Quality, tools, interop

| Archi | Archipelago today | Treatment |
|---|---|---|
| Validator: invalid relations, empty views, unused elements/relations, invalid nesting, viewpoint violations, duplicates | `validate.ts` (model rules), completeness score | **Extend** with the view-based checks once views exist; results as a navigable problems list. |
| Open Group exchange format import/export (model + views + organisations + metadata) | Model import/export; **views and organisations not read** | **Adopt** full fidelity: views and folders must round-trip, or the Archi migration story fails. |
| `.archimate` native import | Planned (#13) | **Adopt**; Archi's test models (`compatibility_test*.archimate`) as fixtures. |
| Import another model into this one (merge by id) | — | **Redesign** as a repository merge with a preview of what changes (shares code with collaboration, §4). |
| CSV export/import (elements, relations, properties) | Excel planned (#13) | **Adopt** CSV next to Excel. |
| HTML report (static, browsable model + views) | The app itself is a web page | **Redesign** as **publish read-only**: a static, shareable snapshot of a workspace (and of a transition state). |
| Jasper reports (Word/PDF documents) | — | **Redesign** as print-ready document export from the report engine. Jasper itself is skipped. |
| Model templates | Demo workspace | **Adopt** as workspace templates / starter kits. |
| jArchi scripting (plugin) | — | **Redesign**: a typed scripting API over the command stack, and the same API exposed to agents (MCP) — the "agent-ready" thesis. |
| coArchi (git collaboration plugin, GRAFICO split format) | — | **Redesign** — see §4. |
| Command-line (headless export/import/report) | — | **Adopt** later: the model/io packages already run without the DOM, so a Node CLI is cheap. |
| Preferences, themes, printing | Light/dark themes | **Have** / print via export. |
| Eclipse plug-in architecture | — | **Skip.** Extension points come later through the scripting API. |

## 3. Transition architectures: multiple versions of the repository

The sponsor requirement: **maintain several versions of the repository to plan transition architectures** — the baseline, one or more transition states, the target, and alternatives.

"Version" means three different things in an EA tool. Keeping them apart is the design:

| Kind of version | Question it answers | Mechanism |
|---|---|---|
| **Planning state** — baseline, transition, target, scenario | "What will the architecture look like in 2027 under plan B?" | Effective dating + change sets + scenario overlays (#58) |
| **History** | "Who changed this, when, and what was it before?" | Change log with author per command (#67) |
| **Collaboration draft** | "My proposed edits, not yet accepted by the team" | Branch / change proposal (§4) |

### 3.1 Recommendation: states are overlays, not copies

Follows #58 option 2, with the sponsor's framing added:

- **Baseline** = the repository as it is (today).
- **Initiatives** own **change sets**: introduce, retire, replace A→B, re-point a relationship, set a planned value — each with an effective date (#60).
- A **transition state (plateau)** is a named `(date, scenario)` — e.g. *"T1 — after ERP consolidation, 2027-06"*. It is **computed** as `modelAt(date, scenario)`, never stored as a copy.
- A **scenario** is the plan of record ± named change sets — alternative routes to the target, compared side by side (#62).
- The **target** is simply the last plateau of the chosen scenario.

Why not copies of the repository (#58 option 1): a copy per state drifts. Correcting a name, an owner or a relationship in the baseline must show up in every future state; with copies it must be made N times, and "what changes between T1 and T2" becomes a diff of two unrelated documents. With overlays the gap between any two states (#64) is exact by construction, and plateaus export as ArchiMate `Plateau`/`Gap`/`Work Package` for tool interop.

What the sponsor still gets from "versions": every state can be **named, selected globally** (a state switcher next to the time point, #61/#62), **viewed, reported, exported and published** as if it were its own repository.

### 3.2 States and views — the part neither Archi nor LeanIX does

Archi users model transition states by duplicating views ("Application landscape — baseline", "— target") and keeping them in sync by hand. Here **one view renders at any state**:

- a view shows the architecture as of the selected state: elements not yet introduced are hidden or shown as *planned* (dashed); retired ones as *retired* (struck/greyed); replaced ones with their successor;
- a **diff overlay** colours a view by the gap between two states (introduced / retired / changed);
- layout is shared, so a retiring element leaves its slot empty rather than reshuffling the diagram.

Edits made while a non-baseline state is selected are **captured as change entries in an initiative**, not as edits to reality — the switcher makes the difference visible (#62).

### 3.3 Open design points

- Does a *view* itself change over time (a shape added in T2 only), or only the model underneath? Proposal: v1 derives view content from the model state; per-state layout overrides are a later extension.
- Attribute changes over time: v1 limits planned values to an allow-list (lifecycle, fit, TIME, hosting), per #58.

## 4. Collaboration

The current product is single-user, single-tab, local-first ("no backend", "nothing leaves the browser"). Collaboration changes that constraint and must be decided explicitly (#59).

| Option | Server? | Collaboration style | Fit |
|---|---|---|---|
| **A. Git as the collaboration layer** (split, merge-friendly file format, like coArchi's GRAFICO) | None | Asynchronous: branches, PRs, reviews | Architects who know git; agents; keeps the static deployment |
| **B. Local-first + sync service** (CRDT, e.g. Automerge, behind the command stack) | Small, self-hostable relay/storage | Real-time and offline; presence, comments | Mixed teams incl. non-technical reviewers |
| **C. Classic server + database** | Full backend | SaaS | Gives up the differentiator |

**Recommendation:** keep #59's order — **A first, B designed-for** — but restate the principle from *"no backend"* to **"local-first; a server is optional, never required"**. A single architect still uses a static page; a team adds git (A) or a self-hosted sync service (B).

Prerequisites regardless of option, to build now:

- **Identity:** every command carries an author (#67).
- **Stable, merge-friendly ids** (already true) and a **split canonical format** (one file per object) — this also makes Archi/coArchi migration natural.
- **Change proposals:** a reviewable bundle of changes with a diff preview. The same mechanism serves model merge (§2.3), collaboration drafts and the architecture review board (#71).

## 5. Architecture implications

### 5.1 Views in the model

A new first-class object, `View` (the name collides with today's saved *report* views — those become `ReportDefinition`):

- `id`, `name`, `documentation`, `viewpoint?`, `folder?`, `properties`
- `nodes`: diagram objects — element references, notes, groups, view references — with bounds, nesting (parent node), appearance overrides
- `connections`: relationship references (or note/group connections) with source/target node, bend-points, appearance

It is serialised deterministically in canonical JSON (ADR 0004) and maps 1:1 to the exchange format's `<views><diagrams>`. The workspace JSON schema version bumps.

### 5.2 Diagram engine (new ADR)

ADR 0003 chose React Flow + ELKjs for **generated** views. A free-form ArchiMate editor needs: nested containers, orthogonal routing with bend-points, exact ArchiMate notation (61 element shapes + relationship line/arrow styles), snapping and guides, large-view performance. Candidates: React Flow extended (already in the stack), a custom SVG editor over our own model, or a dedicated diagramming library. **Decide by spike**: draw a 60-shape Archi view (imported from a `.archimate` fixture) with nesting and orthogonal connections in the top two candidates, then write the ADR.

### 5.3 Notation

ArchiMate 3.2 shapes and icons drawn as our own SVG components (typed per element type), using design tokens for colours. Archi's figures are visual reference only.

## 6. Proposed order of work

Each phase ends with something an Archi user can see.

1. **Views, read-only.** `View` in the model; exchange format and `.archimate` import of views and folders; render imported views faithfully; model tree with folders. *Exit: open any Archi model and see its diagrams and folder structure.*
2. **Diagram editor core.** Spike + ADR (§5.2); palette, create/move/resize, connect with validity, magic connector, nesting, bend-points, notes/groups, undo/redo through the command stack, image export. *Exit: create and edit views in Archipelago that round-trip to Archi.*
3. **Repository foundation.** Repository profile (#57), specialisations, properties manager, history + authorship (#67), validator with view checks, CSV.
4. **Transition states.** Time and change model (#58), initiatives and change sets (#60), time machine (#61), scenarios (#62), gap analysis (#64), state-aware views (§3.2). *Exit: baseline → T1 → target of the demo workspace, shown in one view with a diff overlay.*
5. **Collaboration.** Split format + git workflow (#59 option A), change proposals, publish read-only.
6. **Breadth.** Viewpoints enforcement, templates, sketch/canvas, scripting API + MCP, CLI, document export.

Phases 3 and 4 may swap with 2 if transition planning is the more urgent sales argument; phase 1 comes first either way — it is cheap and it is the migration path from Archi.

## 7. Decisions for the sponsor

1. **Positioning:** replace #56's "modelling second" with the three pillars (§1). → ADR 0006 as drafted in #56, rewritten.
2. **Transition states as overlays** (§3.1), not repository copies. → #58 / ADR 0008.
3. **Collaboration principle:** "server optional, never required"; git first, sync designed-for. → #59 / ADR 0009, and the CLAUDE.md "no backend" constraint amended.
4. **Diagram engine** chosen by spike. → new ADR.
5. **Order of work** (§6), in particular whether the diagram editor (phase 2) or transition states (phase 4) comes first after phase 1.
