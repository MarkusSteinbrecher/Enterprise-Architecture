# Session Log

## 2026-08-11 — #36 io hardening shipped (PR #37); the only issue the stack wasn't blocking

Reviewed what was pickable while the seven-PR phase-1 stack (#24 → #29, #34) waits on review, and #36 was the only one genuinely unblocked: it works against merged `main` (`src/io`), and the whole stack touches only `src/io/index.ts` in that area. #33 (store hardening) names `FileWorkspaceProvider`, `takeOver()` and `tab-lock.ts` — all rewritten by the stack — and #35 needs CSS from #24/#26, so both really do wait.

**Shipped in PR #37** (open against `main`, CI green, 189 tests): junctions map between our one `Junction` + `junctionKind` and the schema's `AndJunction`/`OrJunction`; `xs:ID` sanitisation applied to identifiers _and_ refs with every rewrite reported; views and tag groups carried through XML instead of being destroyed; typed property definitions; allowlist (not prefix) stripping of `archipelago.*`; comma-safe tags; empty-string values preserved; bare `localeCompare` now fails lint.

**Design decisions worth carrying forward:**

1. **One `Junction` with a kind, not two element types.** The catalogue follows the specification; the _format_ is where the two concrete types live. Keeping the catalogue spec-shaped meant `validity.ts` and every facet needed no change at all.
2. **Carry, don't report, when carrying is possible.** Views and tag groups go into namespaced model properties holding canonical JSON. "Report the loss" was the cheaper option the issue allowed, but it would have fired a warning on _every_ XML export (tag groups always exist), which trains people to ignore warnings.
3. **`exportExchange` returns `{ xml, problems }`; `exportExchangeXml` keeps its old signature.** The unmerged stack calls the latter from `file-download.ts`, so changing the signature would have broken seven PRs. Wiring the save path to show the problems is #38, blocked on #29.
4. **Sanitising ids claims every already-valid id first**, so a rewrite can never steal a name another concept needs — the bug you only find when two ids collide after cleaning.
5. **`npm run validate:xsd` is the acceptance test**, not the unit suite: it now validates five files (each fixture as checked in _and_ round-tripped, plus a workspace with deliberately illegal ids) against The Open Group's real XSD.

**State:** `main` has #14–#17 merged. Open: #24–#29 (phase-1 UI stack, bottom-up), #34 (E2E, sits on #29), #37 (this, on `main` — mergeable independently), #30 (session log). New: #38 (surface export problems in the save path). Still open from the E2E session: #31 (undo/redo has no UI), #32 (cold-boot takeover flash).

## 2026-08-10 — E2E harness (#19) built on top of the stack; two defects found by driving the real app

Picked up #19 and stacked PR #34 on `feat/11-file-workflow` — the tip of the review stack, because journeys 3–5 need the inventory, fact sheet and file workflow that are still unmerged below it. Playwright against the **built** bundle served by `vite preview` on the Pages base path, not the dev server: the two things that break in production and nowhere else are the base path and the production build. Five journeys, 15 tests, ~13s locally, stable over `--repeat-each=3`; a second CI job uploads trace, screenshot and video on failure. `tests/manual/` carries the paired UAT scripts and a `uat-cycle` issue form, per the HQ testing convention.

Choices worth carrying forward:

- **The console-error guard is the highest-value fixture.** Every test fails if the app writes a `console.error` or throws — a React app can render the right pixels while dying in an effect, and the journey would otherwise pass.
- **The File System Access API is hidden in tests.** Its picker is a native dialog no automation can drive, so Chromium is put on the download / `<input type=file>` path Firefox and Safari use anyway. The fallback path is now the one under test, which is the right way round.
- **Filter semantics are asserted as identities, not numbers**: `OR = A + B − AND`, `NOT = total − OR`. True whatever the demo contains, and they break the moment the combinator semantics drift — where memorised counts would just need updating.
- **Seeding goes through the app's own importer** ("Explore the demo"), never by injecting into the store. Isolation is free: Playwright's per-test context starts IndexedDB and localStorage empty.
- Reads after a facet click race the DOM — react-router updates the URL synchronously and the count a render later. Counts are read through a helper that waits for the result line's own summary text first.

Two defects the journeys turned up, filed rather than fixed in a test PR: **#32** — every cold boot flashes the read-only "This model is open in another tab" screen, then the empty shell (which rewrites the URL to `/inventory`), and only then first run, because `ModelStoreProvider` initialises `role` to `'reader'`, rendering the _unknown_ state as the known bad one; recorded as a `test.fixme` so it goes green when fixed. **#31** — undo/redo has existed in the store since #4 and is reachable from nowhere in the UI, which is why journey 4 stops at the dirty counter instead of the edit → undo → redo #19 asks for; wiring it has a real question in it (do not steal native undo from text fields), so it is its own issue.

CI verified failing on a deliberately broken smoke test (run 31420006413: e2e red, lint/test/build green, 2.0MB of artifacts uploaded), then put back — the last acceptance criterion on #19.

Open: the stack #16 → #29 is still unmerged and unreviewed, and #34 sits on top of it. Merge bottom-up with merge commits, retargeting each child before deleting a merged base branch.

## 2026-08-07 — First merges: #14 + #15 shipped, app live; review process operational

Reviewed and merged PRs #14 (bootstrap) and #15 (metamodel) — two-layer review per the new `/review-pr` skill (acceptance criteria + invariants inline, multi-agent code review). **The shell is live at https://markussteinbrecher.github.io/Enterprise-Architecture/** (Pages switched to workflow-based deploys). Session also produced: project CLAUDE.md, product ADRs 0001–0005 (name ratified: Archipelago), issues #18–#23 (tags, E2E harness, release checklist, report-engine split of #12), repo description/topics, demo-data licensing research (moot — Opus authored an original model; naming nit open), first harvested rule (glyph radius exemption in CLAUDE.md).

**Open for next session:** (1) review #16/#17 with `/review-pr` — this session's multi-agent runs were gutted by subagent usage limits (reset 8:30 Zurich); do NOT trust their empty findings; (2) merge bottom-up with **merge commits, never squash** (stacked PRs), and **retarget the child PR to main before deleting a merged base branch** — GitHub closed #15 when feat/2-bootstrap was deleted (fix: restore ref, reopen, retarget); #17 still based on feat/4-model-store, retarget after #16 merges; (3) Opus branches for #6/#7 queue behind review; (4) optional ArchiSurance-name decision for the demo workspace.

## 2026-08-07 — Wiki ADR 0007 filed; HQ divergence reconciled

Filed HQ wiki ADR 0007 (repo repurposed to Archipelago, knowledge base at `knowledge-base-final` tag) and updated the wiki: enterprise-architecture project page rewritten (Project Card per portfolio convention), ea-repository cross-linked, portfolio shaping note filled, index/decisions/log updated. Along the way reconciled a two-machine wiki divergence: remote had evolved ~20 commits (schema v0.5, wikilinks + portfolio conventions, Quartz); merged with remote winning, recovered the AndrAI page and the tokens ADR (renumbered 0004 → 0006), dropped a superseded rrradio commit. Meanwhile Opus sessions landed issues #2–#4 (scaffold + CI/Pages, metamodel, model store) in this repo.

## 2026-08-07 — Phase 0 and phase 1 implemented; issues #2–#11 in review as a stacked PR chain

Built the whole of phase 0 and phase 1 against the design handoff. Ten stacked PRs, one per issue, each based on the previous so every diff is reviewable on its own: #14 bootstrap (#2), #15 metamodel (#3), #16 store (#4), #17 import/export (#5), #24 app shell (#6), #25 command palette (#7), #26 inventory (#8), #27 fact sheet (#9), #28 dependency graph (#10), #29 file workflow (#11). CI green on all; 303 tests. Sponsor asked for PRs so Fable can quality-check, so nothing was merged to main.

Decisions worth carrying forward:

- **Relationship validity as rules, not a transcribed table.** The spec's Appendix B is a generated matrix that already includes derived relationships; `src/model/validity.ts` expresses the structural rules it is generated from over `(layer, aspect)` plus named exceptions, and `validity.test.ts` is the specification of record.
- **Completeness scoring** (UI spec open question 4) resolved: weighted fraction of the fields _expected_ of an element, where profile fields are expected only of profiled types, so a capability is not penalised for having no technical fit. Weights in one config; rule documented in `src/model/README.md`.
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
