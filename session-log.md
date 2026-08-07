# Session Log

## 2026-08-07 — Phase 0 and phase 1 implemented; issues #2–#11 in review as a stacked PR chain

Built the whole of phase 0 and phase 1 against the design handoff. Ten stacked PRs, one per issue, each based on the previous so every diff is reviewable on its own: #14 bootstrap (#2), #15 metamodel (#3), #16 store (#4), #17 import/export (#5), #24 app shell (#6), #25 command palette (#7), #26 inventory (#8), #27 fact sheet (#9), #28 dependency graph (#10), #29 file workflow (#11). CI green on all; 303 tests. Sponsor asked for PRs so Fable can quality-check, so nothing was merged to main.

Decisions worth carrying forward:

- **Relationship validity as rules, not a transcribed table.** The spec's Appendix B is a generated matrix that already includes derived relationships; `src/model/validity.ts` expresses the structural rules it is generated from over `(layer, aspect)` plus named exceptions, and `validity.test.ts` is the specification of record.
- **Completeness scoring** (UI spec open question 4) resolved: weighted fraction of the fields *expected* of an element, where profile fields are expected only of profiled types, so a capability is not penalised for having no technical fit. Weights in one config; rule documented in `src/model/README.md`.
- **The demo model is ours, not The Open Group's.** Their ArchiSurance is copyrighted and the mirrored copy is GPL-3.0; neither belongs in an MIT repo. The bundled demo is the design prototype's 29 elements / 47 relationships serialised to exchange format. Both it and a round-tripped export validate against the official XSD (`npm run validate:xsd`).
- **"End-of-life applications" saved search ships as AND, not the OR the UI spec suggests** — under that section's own definition of OR it would return every application plus everything phasing out anywhere.
- **ELK partitioning constrains layer order, not layer count**, so the three bands are re-stacked after layout; ELK still does crossing minimisation and node placement.
- Three bugs found only by driving the real app: `TabLock` deadlocking itself out of the writer role under React's double-invoked effects; `useModelSelector` going stale on navigation because it memoised on the model version alone; a layout worker that never answers hanging the canvas forever.

Open: sponsor to switch Pages source from the legacy `/docs` branch to GitHub Actions before the deploy workflow can publish (issue #2 scope, needs repo admin). Phase 2 (#12 report engine + five reports, #13 Excel/`.archimate`) untouched.

## 2026-08-06 — Repo repurposed to Archipelago; implementation issues filed

Sponsor decision: the product is built **in this repo** (supersedes the old ADR-003 separate-repo pattern), knowledge-base content cleaned out. Pre-cleanup state preserved at the `knowledge-base-final` tag. New product README + MIT license; Claude Design handoff relocated to `design/handoff/2026-08-inventory-factsheet-graph/`, UI spec to `design/specs/open-ea-repository-ui-spec.md`. Filed GitHub issues #2–#13 (labels phase-0/1/2) covering bootstrap → metamodel → store → import/export → chrome → palette → inventory → fact sheet → graph → file workflow → report engine → Excel/.archimate, each written agent-ready with acceptance criteria and dependency links. Note: removal of docs/ takes the old knowledge-base site offline; issue #2 switches Pages to Actions-based deploys. Follow-up: update the HQ wiki project page for the repurposing (fresh ADR per project-lifecycle convention).

## 2026-08-06 — Open EA Repository concept & plan

Researched and authored the concept for an open-source, browser-based EA repository (ArchiMate 3.2-native, LeanIX-class portfolio features, GitHub Pages + local browser storage). Four parallel research passes: OSS EA tool landscape (no active open-source LeanIX equivalent exists; FINOS Waltz closest in spirit; Archi/exchange-format the interop anchors), browser ArchiMate/diagram libraries (React Flow + ELKjs recommended, LikeC4 as architecture blueprint, all ArchiMate-specific JS libs must be vendored), LeanIX meta model v4 deep-dive (report system reduces to five primitives; edge properties must be first-class), and browser persistence (in-memory model + IndexedDB snapshots beats SQLite WASM at this scale; files as source of truth).

Deliverable: `design/specs/open-ea-repository-concept.md` — vision, prior-art survey, metamodel (ArchiMate core + portfolio-profile overlay), architecture, report engine, LeanIX parity map, risks, 3-phase delivery plan, 5 ADR candidates. Next step: sponsor review of the concept, then bootstrap the new repo (phase 0) per ADR-003 separate-repo precedent.
