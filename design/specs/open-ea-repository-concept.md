# Open EA Repository — Concept & Plan

**Status:** Draft concept for review
**Date:** 2026-08-06
**Working title:** *Archipelago* (open for debate — see §10; product name must not embed "ArchiMate", an Open Group trademark)

---

## 1. Vision

An **open-source, local-first Enterprise Architecture repository** that runs entirely in the browser as a static site. ArchiMate 3.2-native at the core, LeanIX-class portfolio management at the surface, zero infrastructure to operate: open the URL, import a model (or start from the demo), everything stays in your browser.

One sentence: **"LeanIX-class EA portfolio management as a static web app — ArchiMate-native, local-first, git-friendly, agent-ready."**

### Why this, why now

- **The niche is unoccupied.** Research (2026-08) found no active open-source LeanIX equivalent. FINOS Waltz is the only mature portfolio-shaped OSS tool — but it is a Java/PostgreSQL server product, not ArchiMate-based, with a dated AngularJS frontend. Everything ArchiMate-native and browser-based is small, new, or dead (details §2).
- **It operationalises the thesis of this project.** The Enterprise-Architecture knowledge base argues EA content must become machine-readable and agent-consumable. A repository whose entire model is a canonical JSON document with a published schema — readable by humans, diffable by git, consumable by agents — is that thesis made concrete.
- **Local-first removes the adoption barrier.** Every commercial EA tool starts with procurement, tenants, and user management. A static page with browser storage starts with a click. For architects who want to *try* structured portfolio management, that is the difference between "someday" and "now".

### Non-goals (prototype phase)

- No backend, no accounts, no multi-user editing (CRDT sync is a designed-for later option, §5.4).
- No full free-form ArchiMate diagram editor in the MVP (phase 3 option, §6.3).
- No workflow/survey/automation machinery (LeanIX phase-3 long tail).

---

## 2. Prior art — what exists, what we leverage

Surveyed 2026-08-06 (four parallel research passes: OSS EA tools, browser ArchiMate libraries, LeanIX feature scope, browser persistence).

### 2.1 Landscape

| Tool | What it is | License / stack | Status | Verdict for us |
|---|---|---|---|---|
| **Archi + coArchi** | De-facto standard free ArchiMate 3.2 modeller (desktop, Eclipse/Java) | MIT | Very active (5.9.0, Apr 2026) | **Interop target #1.** Parse its `.archimate` XML and the Open Group exchange format; its GRAFICO git format and static HTML report export are design precedents |
| **FINOS Waltz** | Deutsche Bank's EA portfolio tool ("structured wiki for your architecture") | Apache-2.0, Java 17 + PostgreSQL + AngularJS | Active (1.84, Jul 2026) | **Best OSS reference for portfolio semantics**: measurable taxonomies, assessment/rating schemes, logical-vs-physical flows, surveys. Code not reusable for a static app |
| **Essential Project** | Ontology-based EA tool (Protégé + XSLT viewer) | GPL/AGPL | Active | Meta-model documentation is a useful checklist; code and license unusable for us |
| **Iteraplan** | First OSS EAM tool (2008) | AGPL | **Dead** (sites down) | Historical interest only |
| **ea-toolkit/architecture-catalog** | Git-native architecture catalog, Markdown + Astro static site | MIT, TS | Small, active (May 2026) | **Closest existing project in spirit.** Differences: markdown registry (not ArchiMate), build-time generation (not in-browser editing + local DB) |
| **archie-ea** | Self-declared "open-source LeanIX alternative" | AGPL, Flask + PostgreSQL | Weeks old, one person | Feature checklist only |
| **LikeC4** | Architecture-as-code: model → predicate-based views → auto-layout → static React site | MIT | Very active | **Architecture blueprint.** Proves the model→views→layout→static-SPA pipeline; renders with React Flow; layouts with Graphviz-WASM |
| **archimate-js** | ArchiMate editor on bpmn.io's diagram-js | MIT | Dormant (0.0.4, last commit Nov 2024) | Reference/fork base for a phase-3 editor, not a dependency |

### 2.2 What we leverage directly

1. **Formats:** Open Group **ArchiMate Model Exchange Format** XML (free XSDs at opengroup.org/xsd/archimate/) as the interop boundary, plus direct parsing of native **`.archimate`** files → instant Archi round-trip. Note the Open Group's own caveat: the exchange format is a conveyance format, not a persistence format — our native store is canonical JSON (§5.2).
2. **Demo data:** **ArchiSurance** and **ArchiMetal** case-study models (free exchange-format XML from the Open Group) as the built-in demo workspace.
3. **Portfolio semantics:** LeanIX meta model v4 (full feature research summarised in §4 and §7) and Waltz's assessment/taxonomy patterns.
4. **Parsers/notation (MIT, vendor-don't-depend):** `tsarchi` (.archimate parser, Jul 2026), `@arktect-co/archimate-model-importer` (.archimate + exchange + GRAFICO), code-drawn ArchiMate 3.2 SVG shape sets from `@haikal-fikri/archimate` / `archimate-renderer`. Every ArchiMate-specific JS library is a low-bus-factor solo project — **the ArchiMate layer must be owned in-repo** (vendored, tested against the XSDs).
5. **Sponsor prior art:** the existing **EA Repository CLI** (SQLite + ArchiMate 3.2, on the other machine) — its metamodel tables, relationship-validity rules, validation command, and ID conventions port almost 1:1 to TypeScript.
6. **Ecosystem signal:** a 2025–26 wave of ArchiMate MCP servers (archi-mcp-server, archimate-mcp, archiscribe-mcp) confirms "agent-ready EA repository" is where the energy is. Our published JSON schema + later MCP server is a differentiator LeanIX itself only started addressing in 2026.

---

## 3. Product concept

### 3.1 Personas

- **Solo/consulting architect** (primary): needs a working repository for a client engagement in minutes, without procurement. Imports an Archi model or an Excel application list; produces landscape, capability, and roadmap views.
- **EA team evaluating tooling**: wants to see what structured portfolio management gives them before committing to LeanIX/Ardoq money.
- **AI agents** (secondary but strategic): consume/maintain the model through the documented JSON schema, file round-trips, and (later) an MCP server.

### 3.2 The core loop (what makes it "LeanIX-like")

1. **Model** — maintain an inventory of typed elements (applications, capabilities, tech components…) and typed relationships, each carrying properties.
2. **Assess** — score elements on lifecycle, functional/technical fit, criticality, TIME; costs and support-type live **on the relationships**.
3. **Visualise** — auto-generated reports: capability map, application landscape, matrix, roadmap, portfolio bubble, interface/data-flow graph.
4. **Share** — export views as SVG/PNG, the model as JSON / exchange XML / Excel; commit the JSON to git.

### 3.3 Key differentiators vs LeanIX

- **ArchiMate 3.2-native** — LeanIX has no ArchiMate export at all; we round-trip with Archi and every certified tool.
- **Local-first, zero infrastructure** — no tenant, no login, no data leaves the browser.
- **Git-friendly** — canonical, deterministically-ordered JSON export designed for diff/merge; save directly into a working copy via the File System Access API (Chromium).
- **Agent-ready** — published model schema, stable IDs, exchange formats; MCP server on the roadmap.

---

## 4. Metamodel

### 4.1 Approach: ArchiMate core + portfolio profile overlay

The base metamodel is **ArchiMate 3.2** (all layers, 11 relationship types, the relationship-validity matrix) — same scope as the sponsor's EA Repository CLI. On top, a **portfolio profile** system adds LeanIX-style typed property sets to selected element types. This keeps the model exchangeable (profiles serialise as ArchiMate properties) while giving fact-sheet ergonomics in the UI.

Research on LeanIX meta model v4 produced a full LeanIX↔ArchiMate mapping; the load-bearing rows:

| LeanIX fact sheet | ArchiMate 3.2 element |
|---|---|
| Application | Application Component |
| Business Capability | Capability |
| Business Context: Process / Value Stream / Product | Business Process / Value Stream / Product |
| Data Object | Business Object (conceptual) / Data Object |
| Interface | Application Interface + **Flow** between components |
| IT Component (Software / Hardware / SaaS-PaaS-IaaS) | System Software / Node / Technology Service |
| Tech Category, Platform | Grouping |
| Provider, Organization | Business Actor (+ Location for regions) |
| Objective | Goal |
| Initiative | Work Package (milestones ≈ Plateau) |
| Parent/Child | Composition |
| App→Capability (support type) | Realization + property on relationship |
| App→IT Component (cost, risk, validity) | Serving + properties on relationship |

### 4.2 The portfolio profile (MVP set)

Applied to Application Component by default; configurable per type later:

- **Lifecycle**: Plan → Phase In → Active → Phase Out → End of Life, each phase a date. Drives roadmap bars, time-machine filtering, and obsolescence logic.
- **Business criticality** (4 levels), **functional fit** (4), **technical fit** (4), **TIME classification** (Tolerate/Invest/Migrate/Eliminate — derivable from the two fits).
- **Costs** as properties on the App→IT-Component relationship (total annual cost) plus license/maintenance on the element.
- **Tags**: tag groups (single/multi-select, colored), the universal escape hatch.

### 4.3 One structural rule from the research

> LeanIX's entire report system reduces to five orthogonal primitives over a typed property graph: **base type → filter → cluster → drill-down → view (color + aggregation)**, plus a **time dimension** from lifecycle dates and relation-validity dates. **Fields on relationships must be first-class from day one** — support type, costs, CRUD usage, risk overrides, and validity dates all live on edges.

This dictates the data model (§5.1) and means one report engine yields Landscape, Matrix, Roadmap, and Portfolio nearly for free (§6).

---

## 5. Architecture

### 5.1 Shape

Static SPA — **TypeScript + React + Vite**, deployed to GitHub Pages by CI. No backend, ever, in the prototype.

```
┌───────────────────────────── Browser ─────────────────────────────┐
│  React UI: Inventory · Element pages · Report engine · Diagrams   │
│        │                                                          │
│  Model layer (in-memory): typed graph, adjacency indexes,         │
│  ArchiMate validity rules, command stack (undo/redo), search      │
│        │                          │                               │
│  Persistence: debounced           Import/Export:                  │
│  IndexedDB snapshots,             canonical JSON ·                │
│  N rolling generations,           Open Exchange XML ·             │
│  multi-workspace                  .archimate · Excel/CSV · SVG    │
└───────────────────────────────────────────────────────────────────┘
```

Core entities:

```ts
Element      { id, type: ArchiMateType, name, documentation?,
               properties: Record<string, Value>, profile?: PortfolioProfile }
Relationship { id, type: RelationshipType, source, target, name?,
               properties: Record<string, Value> }   // first-class edge properties
View         { id, kind: 'landscape'|'matrix'|'roadmap'|'portfolio'|..., 
               baseType, filter, cluster, drilldown?, colorView, timePoint? }
Workspace    { id, name, elements, relationships, views, tagGroups, schemaVersion }
```

### 5.2 Storage decision: in-memory model + IndexedDB snapshots

Research verdict (Aug 2026): at 500–5,000 elements (single-digit MB), **every referential/graph query is faster and simpler as in-memory Map/adjacency traversal than through any storage engine**. The storage engine's only job is crash-safe persistence.

- **Primary:** whole model in memory; debounced autosave snapshots to **IndexedDB** (via `idb` or Dexie 4); rolling generations; `navigator.storage.persist()` prompt; Web Locks + BroadcastChannel for second-tab safety.
- **Files are the real source of truth:** Safari can evict script-writable storage after 7 days of non-use — the UI treats browser storage as a cache and nudges toward file export. Chromium gets `showSaveFilePicker` with a persistent handle (re-save into a git working copy); everywhere else falls back to `<input type="file">` / download (`browser-fs-access` wraps both).
- **Rejected:** SQLite WASM (`opfs-sahpool` works header-free on GH Pages, but SQL is the wrong shape for graph traversal and adds worker/wasm plumbing for zero query benefit at this scale); RxDB (premium storage paywall); LokiJS (dead); coi-serviceworker header hack (fragile, conflicts with a PWA service worker — unnecessary anyway).
- **Considered alternative:** TinyBase 9 (MIT, active) has built-in relationships/indexes/reactive queries and a CRDT `MergeableStore` — a legitimate second option if we prefer machinery over owning a thin model layer. Decide in ADR-002 (§10).

### 5.3 Import/export surface (ranked by phase)

1. **Canonical JSON** (native format): sorted keys, stable IDs, deterministic ordering → clean git diffs. Published JSON Schema.
2. **Open Group Exchange Format XML**: import + export, validated against the official XSDs. Entry ticket to the whole ArchiMate tool ecosystem.
3. **`.archimate` (Archi native)**: import at minimum (vendored tsarchi-style parser); export later.
4. **Excel/CSV round-trip** (phase 2): LeanIX conventions — row 1 = technical key, blank cell = delete, no-ID row = create; one element type per sheet.
5. **SVG/PNG export** of any report view.

### 5.4 Designed-for-later (not built now)

- **Sync/collaboration:** keep all mutations behind a thin repository interface over JSON-shaped state so a CRDT (Automerge 3 for history/audit, or Yjs) can replace the mutation path without rearchitecting. TinyBase's MergeableStore is the shortcut if TinyBase is chosen.
- **Agent access:** an MCP server that operates on the exported JSON/exchange files (the 2025-26 ArchiMate MCP wave shows the pattern); URL-parameterised views for deep-linking agents and humans alike.
- **PWA/offline:** service worker + manifest under the `/repo-name/` base path (GH Pages quirks are known and manageable; SPA routing via the 404-redirect trick).

---

## 6. Views & report engine

### 6.1 The engine (build once)

`render(baseType, filter, cluster, drilldown?, colorView, timePoint?)` over the in-memory graph. Facet filtering, hierarchy-aware clustering (levels 1–3 via Composition), color legends with aggregation (min/max/sum/avg for rolled-up values), and a time slider from lifecycle dates.

### 6.2 MVP reports

| Report | Rendering | Layout |
|---|---|---|
| **Capability map** (boxes-in-boxes, heat-colored) | React Flow custom nodes | ELKjs `rectpacking`/`box` |
| **Application landscape** (apps clustered by capability/org, colored by lifecycle/fit/TIME) | React Flow | ELKjs `layered` / rectpacking |
| **Matrix** (apps × capability × org) | plain CSS grid | none needed |
| **Roadmap** (lifecycle Gantt, zoom week–year) | plain CSS/SVG timeline | none needed |
| **Portfolio bubble** (fit × fit, size = cost/count) | SVG scatter | none needed |
| **Dependency/interface graph** (data flows between apps) | React Flow (or Cytoscape.js if analytics outgrow it) | ELKjs `layered` |

Stack rationale: **React Flow (MIT, very active) + ELKjs (EPL-2.0, actively maintained by Kiel University) in a web worker** is exactly the pipeline LikeC4 proves in production on static hosting. Matrix and roadmap deliberately use no graph layout — CSS is the right tool. ArchiMate notation shapes vendored from MIT sources.

### 6.3 Diagrams (phase 3, optional)

Two routes, decided later by demand:
- **Editable auto-layouts** (pragmatic): drag/pin nodes on generated React Flow views, persist positions into the view — 80% of the value at 20% of the cost, one rendering stack.
- **Free-form ArchiMate editor** (ambitious): diagram-js (MIT, the bpmn.io engine) + moddle with a custom ArchiMate schema; mine the dormant archimate-js (MIT) for its moddle schema, renderer, and rules provider rather than depending on it.

---

## 7. Functional scope vs LeanIX (parity map)

**MVP (phase 1–2)** — the recognisable LeanIX core loop:
inventory (list + table view, faceted filters with AND/OR/NOT, full-text search, saved searches), element pages (sections, relations with inline add/remove, completeness score — cheap to build, high perceived value), tags, the six reports above, lifecycle + assessment fields, JSON/exchange/`.archimate` import, JSON/exchange/Excel export, ArchiSurance demo workspace, dark/light theme.

**Phase 3 (selected)** — quality seal (approve/break-on-edit), obsolescence risk via **endoflife.date** as the open-source stand-in for LeanIX's vendor-lifecycle catalog, interface circle map, cost roll-up reports, comments, URL-parameterised report state, MCP server, CRDT sync spike.

**Explicitly out (LeanIX long tail)** — surveys, automations/JS calculations, SBOM ingestion, dashboards/KPIs/metrics store, portals/presentations, SSO/SCIM/permissions, reference catalog sync, SAP/ServiceNow integrations.

---

## 8. Risks & mitigations

| Risk | Mitigation |
|---|---|
| **ArchiMate-specific JS libs are all solo projects** (dormant or weeks old) | Vendor parsers/shapes in-repo; test against official XSDs + ArchiSurance/ArchiMetal corpus |
| **Open Group trademark/licensing** — forum claims commercial implementations of the notation may need a license; free/open tools (Archi) are established precedent | Keep the product name ArchiMate-free; "ArchiMate® is a registered trademark of The Open Group" attribution; review Open Group terms before any 1.0 |
| **Browser storage eviction** (Safari 7-day rule) | Files as source of truth; persistent-storage prompt; loud "unsaved to file" indicator |
| **Scope creep toward LeanIX's long tail** | The parity map (§7) is the contract; anything not listed needs a new decision |
| **Single-tab conflicts** | Web Locks exclusive writer + BroadcastChannel warning banner (same limitation the SQLite alternative has anyway) |
| **GH Pages SPA quirks** | Known playbook: Vite `base`, 404-redirect routing, cache-busted assets |

---

## 9. Delivery plan

New repo (per ADR-003 precedent: PoCs/products separate from the knowledge base), MIT license, GitHub Actions → GH Pages. Solo + agent development; phases are scope gates, not calendar promises.

**Phase 0 — Skeleton (days)**
Repo, Vite + React + TS scaffold, CI deploy to Pages, empty-workspace shell with IndexedDB persistence proof.

**Phase 1 — Model & inventory (2–3 weeks)**
ArchiMate 3.2 metamodel in TS (types, validity matrix, validation — ported from the EA Repository CLI design); in-memory store + command stack + autosave; exchange-format XML import; ArchiSurance demo; inventory list/table + faceted filters + search; element pages with relations editing; canonical JSON export/import.
*Exit criterion: import ArchiSurance, browse and edit it, survive a browser restart, round-trip JSON through git.*

**Phase 2 — Portfolio & reports (3–4 weeks)**
Portfolio profile (lifecycle, fits, criticality, TIME, tags, costs-on-relationships); the report engine; capability map, landscape, matrix, roadmap, portfolio bubble, dependency graph; SVG/PNG export; Excel round-trip; `.archimate` import; completeness scoring.
*Exit criterion: the LeanIX demo-workspace "wow" moments — colored landscape, capability heat map, lifecycle roadmap — reproduced on ArchiSurance data.*

**Phase 3 — Differentiators (ongoing)**
Exchange-format export validation suite; quality seal; obsolescence via endoflife.date; URL-state deep links; editable layouts or diagram-js editor spike; MCP server on exported files; CRDT sync spike; write-up back into the knowledge base (the repository chapter gains a living exhibit).

**First public milestone:** end of phase 2 = demo-able at a URL with ArchiSurance preloaded — that is the moment to announce (r/enterprisearchitecture, Archi forum, LinkedIn) and recruit early users.

---

## 10. Decisions to ratify (ADR candidates for the new repo)

1. **ADR-001: ArchiMate 3.2 as base metamodel with portfolio-profile overlay** (vs LeanIX-style fact-sheet-first with ArchiMate export bolted on).
2. **ADR-002: In-memory model + IndexedDB snapshots + file source-of-truth** (vs TinyBase vs SQLite WASM opfs-sahpool). Default: in-memory + `idb`; revisit if reactive-query needs grow.
3. **ADR-003: React Flow + ELKjs for generated views** (vs Cytoscape.js vs Graphviz-WASM). Prototype both layouts on ArchiSurance in phase 2 week 1.
4. **ADR-004: Canonical JSON as native format; exchange XML as boundary** (Open Group's own guidance: exchange format is conveyance, not persistence).
5. **ADR-005: Product name** — must not contain "ArchiMate". Working candidates: *Archipelago*, *Atlas EA*, *Stratum*.

---

## Appendix: research provenance

Four research passes on 2026-08-06 (OSS EA tools · browser ArchiMate/diagramming libraries · LeanIX meta model v4 + reports deep-dive from official SAP docs · browser persistence on GH Pages). Key verifications: `opfs-sahpool` needs no COOP/COEP headers (works on GH Pages, single-tab); GH Pages still cannot set custom headers; File System Access API remains Chromium-only through Safari TP / Firefox 156; LeanIX meta model v4 field/relation inventory taken from ~60 official documentation topics. Unverified items flagged inline in the research outputs (e.g. Safari 7-day eviction policy status in 2026, coArchi 2 storage format).
