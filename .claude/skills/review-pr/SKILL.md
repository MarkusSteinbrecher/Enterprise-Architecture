---
name: review-pr
description: Archipelago PR review — spec conformance + code review + rule harvesting. Use when asked to review a PR (e.g. /review-pr 14, optionally with an effort level). Checks the linked issue's acceptance criteria and CLAUDE.md invariants, verifies design-handoff fidelity for UI changes, runs the built-in code review, posts findings on the PR, and promotes recurring findings into durable rules so the next session can't repeat the mistake.
---

# Archipelago PR review

Review the PR given in `$ARGUMENTS` (PR number; optional effort level, default `high`).

## 1. Establish context

- `gh pr view <n> --json title,body,baseRefName,headRefName` — read the description and note the base branch. **Stacked PRs: review only this PR's increment** (diff against its own base), never the whole stack at once.
- `gh issue view <linked-issue>` — extract the acceptance-criteria checklist. The PR body names the issue; if not, infer from the branch name (`feat/<issue#>-…`).
- UI-touching PRs: read the relevant sections of `design/handoff/2026-08-inventory-factsheet-graph/README.md` (tokens, the screen being built) and compare against the reference screens in `screens/`. Fidelity is **high** — spacing, colors, and interaction states are normative.

## 2. Spec conformance (the project layer — this is what generic review can't do)

For every acceptance criterion: **met / not met / not verifiable from the diff** (say why, e.g. "needs a running browser — covered by e2e journey 3").

Where the diff touches them, verify the CLAUDE.md invariants:

- Canonical JSON determinism: sorted keys, stable IDs, byte-identical export→import→export (test must exist, not just code).
- Lifecycle **derived, never stored** — reject any stored phase field.
- Relationship properties first-class — reject demotion of edge data to element fields.
- All model mutations via the command stack — no direct store writes from UI code.
- Tokens are law: no color literals outside `src/styles/tokens.css`, zero border-radius, no shadows (exception: command palette), no runtime CDN/font fetches.
- Nothing leaves the browser except user-initiated downloads.
- **A declared ARIA widget role is a contract — check the behaviour, not the attribute.** Any component with `role="dialog"`/`aria-modal`, `role="menu"`, `role="listbox"` or `role="combobox"`: does focus *enter* the widget, is it *trapped* while open, is it *restored* to the trigger on close, and is the active item announced (`aria-activedescendant` with real option `id`s when focus stays in an input)? Lint (#40) catches the static half — a role on the wrong element, a missing required prop — and none of this half. Found in #24 (`role="menu"`, no keyboard) and #25 (`aria-modal` with no trap, `listbox` never announced).
- **A second call site of a data-safety path is a finding in itself.** When a PR reaches for `markSaved`, `replaceWorkspace`, `saveSnapshot` or a download, check whether an existing call site already does it — and whether this one kept its guards. #25 copied `Header.saveFile` and silently dropped its reader-role check. Prefer "collapse the two into one helper" over "fix the copy".

- **The test behind an acceptance criterion must fail when the feature is removed** (now also a CLAUDE.md convention — it kept being broken by implementers, who do not read this file). A green test is not evidence. **Do not reason about it — break it:** delete the feature, or invert the condition, and run that one test. If it still passes, it is not covering the criterion. Recorded tells: one-sided bounds (`expect(n).toBeLessThan(150)` passes at 0); a setup that rebuilds the very thing whose caching it means to test (#27's `deps` test rerenders with a fresh workspace, so a whole new store busts the memo and `...deps` is never exercised); a test named for a case its setup skips, where **the giveaway is often a comment admitting it** (#27: "ArchiSurance Netherlands composes Back Office, so it does have one"); and assertions on the *opposite* branch (that same test asserts `getByRole('img')`, which only renders when the empty state does **not**). Found in #25, #26, and twice in #27.

  **Asserting that a pure function returns a token is not asserting the token is rendered.** For any visual encoding behind a criterion — colour views, dimming, dashing, focus rings — check that a test reads it off the DOM. #28 asserted `colourOf`/`legendFor` as pure functions and legend *text*, so replacing `GraphNode`'s entire style object with `{width, height}` left all 33 graph tests green: the colour views and click-to-trace could ship with no visible effect at all.

  **A fixture that hard-codes the expected answer is not a test.** #28's trace panel reads cost from the wrong place entirely (an element property, against ADR 0001), and its assertion passes only because the bundled demo XML happens to carry that exact string. When an assertion's expected value also appears in the fixture, check which one is the source of truth.

- **Uncontrolled inputs plus a route parameter is a data-loss bug.** Any `defaultValue`/`defaultChecked` on a screen routed by `/:id` — and any sibling state such as an `editing` flag — check what happens when the id changes without a remount. #27 carried one element's name and documentation onto the next and committed them on blur. The fix under review should be `key={id}`, not a reset effect.

For architectural changes, check conformance with `design/decisions/` ADRs; a deliberate deviation needs a new/amended ADR in the same PR, not a silent drift.

## 3. Code review (the generic layer)

Run the built-in `code-review` skill on the PR at the requested effort level. Verify findings against the actual code before reporting — no speculative findings.

## 4. Report on the PR

Post one review via `gh pr review <n>` (`--approve` / `--request-changes`, body in markdown) containing:

1. **Acceptance criteria table** (criterion → verdict).
2. **Findings**, most severe first, each with `file:line` and a concrete failure scenario.
3. **Verdict** and, for request-changes, the minimal set of blocking items (nice-to-haves marked as such).

Use inline comments (`gh api` review comments) only where a finding is precisely located and the inline placement helps.

## 5. Harvest rules (the improvement loop — never skip)

For each confirmed finding ask: **would a rule have prevented this?** Escalate to the strongest enforceable tier:

1. **Mechanical** (best): ESLint rule / tsconfig flag / CI check / required test. Add it in the same session — as a commit on the PR branch if trivial, otherwise as a labeled `harness` issue.
2. **Textual**: one added or *sharpened* line in CLAUDE.md "Critical conventions". Keep CLAUDE.md under ~150 lines — replace weaker lines rather than appending forever.
3. **Review-only**: a new bullet in §2 of this skill.

End the PR review body with a `**Harvested:**` line listing what was promoted (or `nothing — findings were one-offs`), so the loop stays visible and auditable.
