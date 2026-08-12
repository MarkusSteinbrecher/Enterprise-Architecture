# Archipelago

Open-source Enterprise Architecture repository that runs entirely in the browser: a static web app on GitHub Pages, all data local. ArchiMate 3.2-native core, LeanIX-class portfolio surface. This is the product repo; the research that motivated it (*EA for the Agentic Organisation*) is preserved at the `knowledge-base-final` tag.

## Stack

TypeScript (strict) · React · Vite · Vitest · React Flow (@xyflow/react) + ELKjs for generated views · idb (IndexedDB persistence) · GitHub Actions → GitHub Pages. No backend. No runtime CDN fetches — fonts and all assets are self-hosted.

## Critical conventions

- **Design tokens are law.** `src/styles/tokens.css` is copied verbatim from the design handoff and is the single source of colour. Zero border-radius on boxes, controls, and surfaces — drawn circular *glyphs* (theme toggle, search circle, phase dots) are exempt; no shadows (one exception: command palette); hairline borders. The semantic ramps (layer / lifecycle / TIME) are the report legend, not decoration.
- **Monospace marks machine-readable content** (ids, counts, property keys, type codes, relation types); Space Grotesk for human-authored content. This split is intentional identity — see the UI spec §2.1.
- **Lifecycle is derived, never stored.** Elements carry phase dates; the phase is computed at a time point (UI spec §3.1). Do not add a stored phase field.
- **Relationship properties are first-class.** Costs, support type, CRUD usage, validity dates live on edges (ADR 0001). Never demote them to element fields.
- **Canonical JSON is deterministic:** sorted keys, stable IDs, byte-identical export→import→export (ADR 0004). Anything that breaks this breaks git-friendliness. No locale-dependent operations (`localeCompare`) on the serialisation path.
- **Import/export never drops data silently.** Anything a read or write cannot carry — unknown types, malformed fields, duplicate ids, views, unrecognised keys — surfaces as an `ImportProblem`. Silent loss is a bug even when the data is "ours". (Harvested from the #17 review: 7 of 15 findings were this pattern.)
- **Never join user-authored strings with a separator and no escaping.** Names, tag labels and property keys may contain any character, including your delimiter. Any format that concatenates them — exchange-format tag lists, URL facet params, CSV — needs escaping and a round-trip test using a value that *contains* the separator. (Harvested three times: comma-joined tags in the #17 exchange writer, the identical bug reintroduced in #26's `?facets=` encoder, then #27's `+ tag` prompt making the first one reachable from the UI.)
- **The model's type guards belong on the write path, not just the read path.** `isFitLevel`, `isTimeClassification` and friends exist because the importer needs them — a `<select>`'s empty option is the same untrusted input. `Number('')` is `0` and `'' as TimeClassification` compiles, so a "clear this field" control silently stores a value the published JSON schema rejects and the exchange writer then drops. Anything turning a form value into a model type goes through the guard and yields `undefined` when it fails. (Harvested twice: `annualCost` in `profile-properties.ts`, then #27's assessment selects.)
- **All model mutations go through the command stack** (undo/redo + dirty counter). No direct store writes from UI code.
- **When a route parameter identifies the subject, key the component on it.** `/element/:id` re-renders without remounting, so anything holding per-subject state — a memo, `defaultValue` on an uncontrolled input, an `editing` flag — silently carries the previous subject's data onto the next one. `key={id}` makes the whole class impossible; a `useEffect` that resets state is the version you have to remember to extend. (Harvested from #27, where one root cause produced a stale selector, an edit form that overwrote the element you navigated *to*, and a test that could not fail.)
- **A test behind an acceptance criterion must fail when the feature is removed.** A green test is not evidence — check what it would take to break it. Two recorded tells: a one-sided bound (`expect(n).toBeLessThan(150)` passes at 0), and a setup that rebuilds the very thing whose caching it means to test. (Harvested from #25, #26 and twice from #27 — this sat in the review skill for three PRs and kept being broken by implementers, who do not read the review skill.)
- Work is issue-driven; every issue carries acceptance criteria — verify them before claiming completion. Branches: `feat/<issue#>-<slug>`.
- PRs are reviewed with `/review-pr <n>` before merge (stacked PRs bottom-up). Reviews harvest rules: recurring findings become lint/CI checks or a sharpened line here — if this file changed since your last session, re-read it.

## Constraints

- Nothing leaves the browser except file downloads the user initiates.
- Browser storage is a cache; exported files are the source of truth. Never weaken or hide the save-state indicator, and **only mark the model clean on a write you can observe completing** — a fire-and-forget download is not one, and neither is loading a workspace that has only ever lived in IndexedDB. An indicator that overstates safety is worse than none. (Harvested from the #24 review: 4 of 15 findings were a write path claiming a success it cannot see.)
- The product name must not embed "ArchiMate" (Open Group trademark; ADR 0005). Keep the attribution line in the README.
- `design/handoff/` is a historical record — reference it, don't edit it.
- Pages serves from the `/Enterprise-Architecture/` base path; deep links must survive a hard refresh (404 redirect).

## Pointers

- **Concept / design brief / UI spec:** `design/specs/`
- **Hi-fi design handoff** (tokens, component-level specs, running prototype): `design/handoff/2026-08-inventory-factsheet-graph/`
- **ADRs:** `design/decisions/`
- **Live state:** `session-log.md` + GitHub issues
- **Wiki project page:** `~/Code/HQ/wiki/projects/enterprise-architecture/`

## Wiki

The LLM Wiki at `~/Code/HQ/wiki/` is the persistent cross-project knowledge surface. Read its `CLAUDE.md` for conventions. This project's wiki page is `wiki/projects/enterprise-architecture/README.md`; the decision of record for this repo's identity is wiki ADR 0007.
