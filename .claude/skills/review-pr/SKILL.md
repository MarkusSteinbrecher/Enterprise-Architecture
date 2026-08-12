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
