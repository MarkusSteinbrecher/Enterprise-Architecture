# Archipelago

Open-source Enterprise Architecture repository that runs entirely in the browser: a static web app on GitHub Pages, all data local. ArchiMate 3.2-native core, LeanIX-class portfolio surface. This is the product repo; the research that motivated it (*EA for the Agentic Organisation*) is preserved at the `knowledge-base-final` tag.

## Stack

TypeScript (strict) · React · Vite · Vitest · React Flow (@xyflow/react) + ELKjs for generated views · idb (IndexedDB persistence) · GitHub Actions → GitHub Pages. No backend. No runtime CDN fetches — fonts and all assets are self-hosted.

## Critical conventions

- **Design tokens are law.** `src/styles/tokens.css` is copied verbatim from the design handoff and is the single source of colour. Zero border-radius on boxes, controls, and surfaces — drawn circular *glyphs* (theme toggle, search circle, phase dots) are exempt; no shadows (one exception: command palette); hairline borders. The semantic ramps (layer / lifecycle / TIME) are the report legend, not decoration.
- **Monospace marks machine-readable content** (ids, counts, property keys, type codes, relation types); Space Grotesk for human-authored content. This split is intentional identity — see the UI spec §2.1.
- **Lifecycle is derived, never stored.** Elements carry phase dates; the phase is computed at a time point (UI spec §3.1). Do not add a stored phase field.
- **Relationship properties are first-class.** Costs, support type, CRUD usage, validity dates live on edges (ADR 0001). Never demote them to element fields.
- **Canonical JSON is deterministic:** sorted keys, stable IDs, byte-identical export→import→export (ADR 0004). Anything that breaks this breaks git-friendliness. Locale-dependent ordering is banned by lint rather than by memory: `localeCompare` and `Intl.Collator` fail ESLint unless the locale is a **string literal at the call site** — `undefined`, `void 0` and a variable all reach the machine's locale, and only the literal is something a selector can see. `src/test/eslint-rules.test.ts` drives the rule and its bypasses.
- **Import/export never drops data silently.** Anything a read or write cannot carry — unknown types, malformed fields, duplicate ids, views, unrecognised keys — surfaces as an `ImportProblem`. Silent loss is a bug even when the data is "ours". (Harvested from the #17 review: 7 of 15 findings were this pattern.)
- **Never join user-authored strings with a separator and no escaping.** Names, tag labels, property keys and *ids* may contain any character, including your delimiter. This covers serialised formats (exchange-format tag lists, URL facet params, CSV) **and any string you compare for equality** — a cache key, a memo key, a dedupe set. Each needs escaping and a round-trip test using a value that *contains* the separator — **and one that looks like your escaped form**, because the decoder has to be unambiguous too. (Harvested five times: comma-joined tags in the #17 exchange writer, the identical bug reintroduced in #26's `?facets=` encoder, #27's `+ tag` prompt making the first one reachable from the UI, #28's `shapeKey` joining element ids with `,` to decide whether to re-run layout, then #37's fix for the first one — a JSON-array encoding detected by a leading `[`, so a tag literally named `["a"]` decodes to `a`.)
- **The model's type guards belong on the write path, not just the read path.** `isFitLevel`, `isTimeClassification` and friends exist because the importer needs them — a `<select>`'s empty option is the same untrusted input. `Number('')` is `0` and `'' as TimeClassification` compiles, so a "clear this field" control silently stores a value the published JSON schema rejects and the exchange writer then drops. Anything turning a form value into a model type goes through the guard and yields `undefined` when it fails. (Harvested twice: `annualCost` in `profile-properties.ts`, then #27's assessment selects.)
- **All model mutations go through the command stack** (undo/redo + dirty counter). No direct store writes from UI code.
- **When a route parameter identifies the subject, key the component on it.** `/element/:id` re-renders without remounting, so anything holding per-subject state — a memo, `defaultValue` on an uncontrolled input, an `editing` flag — silently carries the previous subject's data onto the next one. `key={id}` makes the whole class impossible; a `useEffect` that resets state is the version you have to remember to extend. (Harvested from #27, where one root cause produced a stale selector, an edit form that overwrote the element you navigated *to*, and a test that could not fail.)
- **A fallback, a timeout or an error branch needs a test that fires it.** Resilience code is the least exercised code in the repo and the most likely to be wrong: it only runs on the day something else already went wrong. If a PR adds one, a test must drive it. (Harvested from #28, which added a worker timeout, a worker-error channel, a main-thread fallback and a `?year=` guard, tested none of them, and was broken in all four — including a missing `.catch` that hangs the graph on "laying out…" forever. Vitest already exits non-zero on an unhandled rejection, so CI would have caught that one the moment a test made layout fail.)
- **A mechanical guard needs a test that fires it, and one for the nearest bypass.** A lint rule, CI check or type guard that silently fails is *worse* than no rule, because the next author trusts the line in this file that advertises it. When a review promotes a finding to a mechanical tier, the same PR proves it catches the original bug and the obvious way around it. (Harvested from #37, whose `localeCompare` rule — itself harvested from the #17 review to make ADR 0004 mechanical — errors on the bare call and passes `localeCompare(a, b, undefined)`, which collates by machine locale exactly as before, while the CLAUDE.md line it shipped with announced the guarantee.)
- **A test behind an acceptance criterion must fail when the feature is removed.** A green test is not evidence — *remove the feature and run the test*, which is cheaper than reasoning about it and is the only thing that settles it. Three recorded tells: a one-sided bound (`expect(n).toBeLessThan(150)` passes at 0); **two bounds that bracket the whole plausible range — `>0` with `<=100` asserts only that a percentage is a percentage**; and a setup that rebuilds the very thing whose caching it means to test. A criterion that is satisfiable by inspection is still a criterion: prove it in a test, or it regresses silently (#24's "no layout shift when switching themes" was *met* and unprovable until `tokens.test.ts` asserted that the dark block redefines only colours). (Harvested from #25, #26, twice from #27, then #24 — five recurrences, so it is now also a lint rule: see #49. This sat in the review skill for three PRs and kept being broken by implementers, who do not read the review skill.)
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
