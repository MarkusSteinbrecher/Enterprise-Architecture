# Session Log

## 2026-08-12 (Opus, implementation) — the whole reviewed stack fixed: #24–#28, 41 blocking findings

Took the five reviewed PRs bottom-up, fixing each against its own review and cascading the result into the branch above before starting it. All five now green: **#24** (6 blocking), **#25** (6), **#26** (8), **#27** (9), **#28** (10). 349 tests, up from 313.

**The discipline that mattered most: every fix was verified by removing it and watching a test fail.** That found five of my own tests which could not fail, four of them *after* I had written them believing otherwise:

1. An `Autosaver.suspend()` test that asserted the snapshot was on disk afterwards — the assertion's own `await` gave the write all the time it needed, so it passed either way. Now asserts ordering.
2. A palette break that moved the key handler still passed all 28 tests, because the Tab trap and the mousedown guard were doing the work; the test was measuring something else.
3. `tabIndex={-1}` on palette rows changes no observable behaviour behind the focus trap — kept for the combobox contract, but with a structural assertion rather than a behavioural one it has not earned.
4. `useFocusTrap` first filtered candidates on `offsetParent !== null`. **jsdom reports null for every element**, so the trap was empty in exactly the environment its test runs in.
5. An assertion for #27's type-guard fix that checked a rendering symptom (`0` renders as "Not assessed" too) rather than the defect.

**Two findings turned out worse than the review said, and only instrumentation showed it.**

- **#27's `deps` test was vacuous twice.** The review found that rerendering with a fresh workspace builds a new store, busting the memo on `store` alone. Holding the workspace still was not enough: `toHaveTextContent` is a *substring* match and the stale value `Claim Handling Engine` contains the expected `Claim Handling`. Found by rendering a probe that logged what each pass computed.
- **#28's cost test could not fail even after the panel was fixed.** The demo carried `annual.cost` on eleven elements with the literal value `1.2M EUR / yr` — the exact string the assertion looked for. The demo data moved onto the edges (ADR 0001) and the element property and its `propertyDefinition` are gone; still validates against the Open Group XSD, as checked in and round-tripped.

**Design decisions worth carrying forward:**

1. **`SAVE FILE` no longer marks the model clean at all, on any path.** The rule is absolute and the only observable write is the File System Access handle, which is #11's — already built on `feat/11-file-workflow`. Building a second copy in #24 would have duplicated a file #29 owns and given #24 a failure path with no surface to report it on. So #24 does the honest half: the file is offered, the count stands, and the indicator's tooltip says why. **A cold boot now shows `LOCAL · 1 UNSAVED`**, because a snapshot that has only ever lived in IndexedDB matches no file — visible, and the sponsor may want to weigh it.
2. **`replaceWorkspace({ markClean })` has no default.** Exactly one call site broke on compile, which is the evidence the mechanical harvest was right.
3. **Where a rule's durable fix belongs to another PR, close the path rather than inventing a second encoding.** #27's `+ tag` prompt refuses a comma instead of escaping it, because #37 is rewriting that writer and a second encoding would have to be reconciled at merge.
4. **Gate the editors, not the display.** #27's findings 5/6 asked for assessment and lifecycle to respect `carriesProfile`; removing the sections would have contradicted UI spec §4, which makes "a capability shows Not assessed" a case the screens must hold up for.
5. **Fix at the source when the same list has other readers.** #27's duplicate self-relation was fixed in `relationshipsOf`, not in the fact sheet's `entries` builder — `removeElement` builds its delete cascade from the same list, so the duplicate was also a double entry in a command that undo replays.
6. **A timeout on a job cannot tell a dead worker from a busy one.** #28's worker now acks on receipt; the 2s timer covers the handshake only, and the computation takes as long as it takes.

**Two things a reviewer of the upper stack needs to know**, both consequences of accepted #24 decisions rather than new defects:

- **#29's `FileWorkspaceProvider.save()` calls `store.markSaved()` on `kind: 'downloaded'`** — the same finding as #24's blocking 1, one branch up, with a docblock stating the invariant it breaks.
- **#34's `file-round-trip` journey breaks twice**: it asserts `dirtyCount === 0` after a save while the harness deliberately puts Chromium on the download path, and it asserts `id: 'ws-archisurance-demo'`, which the fresh demo id changes.

Deliberately **not** done: cascading into #29 and #34. They are unreviewed, and propagating would mean fixing their tests — decisions that belong to their review.

**State:** #24–#28 fixed, green, mergeable, each with a fix summary posted. #29, #34, #37, #47 untouched. Next: `/review-pr 29`, then #34 — and re-review of #24–#28.

## 2026-08-12 (later) — #28 and #37 reviewed; #30 merged and the rules propagated through the stack

**#30 merged, and the reason matters more than the merge.** Every harvested rule had been living only on `chore/session-log`, so the feature branches whose code produced them still carried the stale 39-line CLAUDE.md — I hit this directly when checking out `feat/10-graph` to review #28 and found none of the separator, type-guard or route-key rules present. The harvest loop was writing rules the fix sessions would never read. Merged #30, re-cascaded `main` through all seven stack branches (177/197/236/257/290/313/313 green), and verified the 44-line file with every rule now lands on each one.

**#28 dependency graph — request changes, 10 blocking.** One theme: the PR adds a worker timeout, a worker-error channel, a main-thread fallback and a `?year=` guard, tests none of them, and **all four are broken.** `runLayout(...).then()` has no `.catch`, so any layout failure hangs the canvas on "laying out…" forever — reachable in production because the fallback is a dynamic import of the 1.4MB ELK chunk, which 404s for a tab loaded before a Pages redeploy. The 10s worker timeout cannot tell a dead worker from a slow one, so it kills a working one and re-runs the layout *on the UI thread*, permanently, for exactly the models that need the worker. `?year=999999999` makes `startOfYear` NaN and renders every element as Plan — a confident, entirely wrong landscape. `?focus=<unknown>` dims all 29 nodes with no panel and no CLEAR. Also: **no arrowheads anywhere** (the handoff specifies them twice; in a dependency graph direction is the information), the trace panel reads cost from an element property against ADR 0001, and the whole node visual encoding can be deleted with all 33 tests green.

**#37 io hardening — request changes, 8 blocking.** Good work that fixes eight real interop defects, but the new readers and writers breach the very invariant the PR exists to enforce. Six paths drop, rename or rewrite data and report `problems: []`, every one verified by running the code: a `propid-N` element id collides with a minted propertyDefinition id and emits a **duplicate `xs:ID`** no certified tool will open; `xsi:type="toString"` imports as a phantom Junction because a plain-object lookup hits `Object.prototype`; a tag literally named `["a"]` decodes to `a`; a known profile key with an unreadable value is deleted; `type="number"` values are rewritten lexically (`0912345678` → `912345678`); and declared `currency`/`date` definitions downgrade to `string`.

**The most valuable finding of the day audits the harvest loop itself.** #37's `localeCompare` ESLint rule — harvested from the #17 review specifically to make ADR 0004 mechanical — keys on `arguments.length<2`, so `localeCompare(a, b, undefined)` passes lint and still collates by machine locale. The PR also rewrote the CLAUDE.md line to announce that the rule is now enforced by lint rather than by memory. Merging it would have put a **false guarantee** on `main`. Verified all four call forms by linting them.

**Rules harvested (three, plus two deliberate non-harvests):**

1. **A fallback, a timeout or an error branch needs a test that fires it** (from #28). Useful discovery while writing it: Vitest already exits non-zero on an unhandled rejection (verified, exit code 1), so CI would have caught #28's hang the moment any test drove layout to fail. The guard existed; only the test was missing.
2. **A mechanical guard needs a test that fires it, and one for the nearest bypass** (from #37). A rule that silently fails is worse than no rule, because the next author trusts the line advertising it.
3. **The separator rule takes its fifth instance and its first on the *read* side** — a decoder has to be unambiguous too, so the round-trip test needs a value that looks like the escaped form, not just one containing the separator.

Not harvested, deliberately: #28's ADR 0001 violation (the rule already says exactly the right thing and was simply not followed) and #37's untested fallbacks (the #28 rule covers them, one PR early).

**On review cost and trust.** #27's first run was **gutted and lied about it** — `"No findings survived verification"`, `candidates: 0`, after 4 of 5 agents died to machine sleep and stalls. That text is indistinguishable from a genuine clean result; only `agents_error: 4` in the usage block gives it away. **Read the usage counters before believing any zero-finding review.** The re-run went 36/36 and found the worst bug in #27 — an edit form that overwrites the element you navigate *to* — which the manual pass had missed entirely, because finding it needed the running app rather than the diff. Three clean runs at `high` cost 1.7M / 2.0M / 1.9M subagent tokens and each earned it.

**State:** `main` has #14–#17 and #30. Open: #24–#29 + #34 (stack, all in sync with their bases, all green; #24–#28 reviewed and awaiting fixes), #37 (reviewed, awaiting fixes). New issues: #43, #44, #45, #46. Next: `/review-pr 29`, then #34 — or hand #24–#28 to an Opus session for fixes, which is now unblocked since every branch carries the current rules.

## 2026-08-12 — #27 reviewed; `main` merged through the whole stack; three rules harvested

**PR #27 (element fact sheet) gets request-changes** — nine blocking findings, seven more below the line. The handoff transcription is the most exact in the stack (`factsheet.css` has no `[data-theme]` block at all — every colour is a token, so dark structurally cannot drift), and all four acceptance criteria are met. What blocks is one root cause and two repeat rules.

**The root cause is worth carrying forward.** `/element/:id` re-renders `ElementScreen` without remounting it. That single fact produced three separate defects: the `useModelSelector` staleness the PR itself found and fixed; an `editing` flag plus uncontrolled `defaultValue` inputs that carry one element's name and documentation onto the next and **commit them on blur** (open an application, click Edit, click through to a capability, tab out of the name field — the capability is renamed to the application's name, and its documentation is overwritten); and a test for the fix that passes with the fix removed. The PR treated the symptom in the store. `key={id}` on the route kills all three.

**Two findings are model-integrity bugs with reproductions.** Choosing "Not assessed" stores `functionalFit: 0` / `timeClassification: ""` — Ajv rejects the export against the app's *own* published schema, `profileToProperties` then drops both silently through falsy guards, and completeness *rises* because `filled(0)` is 1. And a self-relation is listed twice (`relationshipsOf` is `outgoing ++ incoming`), giving a duplicate React key and a relation count one too high — `NeighbourhoodGraph` guards this; the `entries` builder one hop away does not.

**On the review machinery: the first run was gutted and lied about it.** It reported `"No findings survived verification"` with `candidates: 0` after 4 of 5 agents died (two on machine sleep, two stalled) — 1.2M tokens for nothing. That is the known failure mode, and the summary text is *indistinguishable from a clean empty result*; only `agents_error: 4` in the usage block gives it away. **Always read the usage counters before believing a zero-finding review.** The re-run went 36/36 clean at 1.7M and was worth every token: it found the navigation data-loss bug, which the manual pass missed entirely, by driving the real app rather than reading the diff.

**`main` merged through the entire stack.** The stack had exactly one break — `feat/7-command-palette` was 14 commits behind its own base — and everything above it inherited the gap. Merging the base down and cascading fixed the chain: #25 197 ✓, #26 236 ✓, #27 257 ✓, #28 290 ✓, #29 313 ✓, #34 313 ✓ + E2E ✓. Every branch is now 0 behind its base and all six PRs are green. Two things this surfaced:

- **The stack had been reviewed against a stale `src/io` all along.** `main` carried the #17 review's fixes (`canonical-json.ts` +194, `exchange-format.ts`, `profile-properties.ts`); the branches predated them.
- **The mid-stack branches had no `CLAUDE.md`** — cut before it was written — so review agents working them read a repo with no invariants in it. Now fixed everywhere.

Done in a scratch worktree so the primary checkout never moved and the in-flight review's agents saw no file change; `src/ui/factsheet/` came through byte-identical, so no finding shifted.

**Three rules harvested, each earned by a repeat:**

1. **Type guards belong on the write path** (CLAUDE.md). `main` had already fixed `Number('') === 0` for `annualCost` *with a comment naming it*; #27 reintroduced the identical coercion in the UI, different author, different file. The guards (`isFitLevel`, `isTimeClassification`) existed and only `src/io` used them.
2. **Key a component on the route parameter that identifies its subject** (CLAUDE.md). The root cause above.
3. **The acceptance-criterion test rule moves from the review skill into CLAUDE.md.** It sat in the skill for three PRs and was broken twice more in #27 — by implementers, who never read the review skill. The skill keeps the reviewer half, sharpened: *do not reason about the test, break it* — delete the feature and run that one test.

The separator rule also takes its third instance: #27's `+ tag` prompt is the first UI that makes the #17 comma-join reachable by a user (`Core, regulated` round-trips into two tags with `problems: []`).

**Two mechanical harvests filed rather than landed, both for the #35 reason.** #44 — fail the unit suite on `console.error`/`console.warn`; both duplicate-key findings are console errors the unit suite ignores today, and the e2e harness's equivalent guard is this repo's own "highest-value fixture". Measured green on all eight branches (163/177/187/197/236/257/290/313), but `src/test/setup.ts` is modified by six open PRs, so it lands after the stack merges. #45 — ESLint ban on casting a form value to a model union, following #37's `localeCompare` rule; lands after #37, which owns that rules array.

**State:** #24–#29 + #34 all green and in sync; #24/#25/#26/#27 reviewed, awaiting fixes. #30 and #37 mergeable. New issues: #43 (fact-sheet follow-ups), #44, #45. Next: `/review-pr 28`, then #29, #34.

## 2026-08-11 (later) — Review session: #30 unblocked, #24/#25/#26 reviewed, four rules harvested

Cleared the session-log conflict and reviewed the bottom three of the phase-1 stack. All three get **request changes**; none for structural reasons, all for a concentrated problem area each.

**PR #30 unblocked.** It had conflicted since 4 August and therefore got no CI at all (a conflicting PR has no merge ref to build). `main` and the branch each held entries the other lacked; resolved as a union, newest first, with the three 7 August entries in chronological order. Green and mergeable.

**#24 app shell** — the handoff transcription is the most faithful in the repo (every dimension sampled matches, `tokens.css` untouched, dark block is colours-only so the no-layout-shift criterion holds structurally). Six blocking findings, four of them the same shape: *a write path claiming a success it cannot observe*. `SAVE FILE` marks the model clean after an anchor click it cannot see the outcome of; switching workspaces zeroes the unsaved-to-file counter; deleting a workspace loses to a pending autosave (`window.confirm` blocks past the 800ms debounce, so the timer fires into the gap between `deleteWorkspace` and `replaceWorkspace`); the demo button adopts a fixed id from a click handler. Filed #39.

**#25 command palette** — genuinely good work, and the prototype-gap fix (`isTypingTarget` as its own tested module) is the right instinct. But the keyboard flow it is named for breaks under three ordinary interactions: all key handling sits on the input's `onKeyDown` while the 54 rows are focusable buttons, so one Tab kills it; a resting mouse pointer overrides the arrow selection; and `aria-modal` is declared with no trap, no restore, no `aria-activedescendant`. Filed #40 (lint) and #41.

**#26 inventory** — `filters.ts` is the best-tested code in the stack and exactly right against the handoff's "implement exactly" block. Two acceptance criteria fail on *evidence*: the 5,000-element test asserts `rows < 150`, which passes at 0, and 0 is what that branch renders; back/forward was never implemented (`setParams(..., {replace:true})` everywhere) while the module docblock claims otherwise. Filed #42.

**Four rules harvested — each earned by a repeat, not a hunch:**

1. **The save-state indicator must not overstate** (CLAUDE.md). The old line said "never weaken or hide it", which neither #24 failure technically breaks — both leave it fully visible and lying.
2. **Never join user-authored strings without escaping** (CLAUDE.md). #17/#37 fixed comma-joined tags in the exchange writer; #26 reintroduced the identical bug in the URL facet encoder, independently. Different author, different file, same mechanism.
3. **A declared ARIA widget role is a contract** (skill §2) — check focus entry, trap, restore and announcement, not the attribute. Three instances in three PRs. The static half became #40 (`eslint-plugin-jsx-a11y`); focus traps are not lintable, hence the review bullet.
4. **A test behind an acceptance criterion must fail when the feature is removed** (skill §2). Second instance: #26's virtualisation test passes at zero rows, #25's "clears the query on reopen" closes the palette first so it never covers ⌘K-while-open.

**The #24 harvest failed within one PR, which is the useful lesson.** The CLAUDE.md line about marking clean was reproduced by copy-paste in #25's palette action, which also dropped the reader-role guard the header applies. Prose does not survive copy-paste. The replacement is mechanical: one `saveWorkspaceToFile()` owning the guard, the download and the clean-marking, so there is one place to get it wrong — and a new review check that treats *a second call site of a data-safety path* as a finding in itself.

**On review cost and trust.** The #24/#25 runs at `xhigh` cost ~2.8M subagent tokens between them and #25 hit the session limit mid-run: 8 agents died including *synthesize*, so findings came back verified but unmerged — 15 entries that were really 9 repeated. That degradation is subtler than the known "gutted run reports zero findings" mode and needs the same suspicion; merge and rank by hand from `journal.jsonl` rather than re-running. Sponsor's call: **`high` for the rest**. #26 at `high` cost 1.7M, ran clean, and lost nothing worth having.

**Also blocking now, not tidying:** #35's `--on-accent` token gates the `#fff` fixes in #24 *and* #26, and the handoff paints on-accent text in four places mapping to #24/#26/#27/#28 — so it is a dependency of the fixes, not a follow-up. The #35 CI check itself should still land only after the stack merges, or five open PRs go red at once.

**State:** open PRs #24–#29 (#24/#25/#26 reviewed, awaiting fixes), #34, #37, #30 (green, mergeable). New issues: #39, #40, #41, #42. Next: `/review-pr 27`, then #28, #29, #34.

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
