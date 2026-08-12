---
adr: '0001'
title: ArchiMate 3.2 as base metamodel with a portfolio-profile overlay
date: 2026-08-06
status: Accepted
scope: project
tags: [metamodel, archimate, leanix, portfolio]
---

# ADR 0001 — ArchiMate 3.2 as base metamodel with a portfolio-profile overlay

## Context

The product needs both standards-grade modeling (tool interop, notation credibility) and LeanIX-style portfolio ergonomics (lifecycle, fit assessments, TIME, costs). LeanIX's meta model and ArchiMate map cleanly onto each other (concept §4.1 mapping table), but one of them has to be the foundation.

## Decision

The base metamodel is **ArchiMate 3.2 in full** — all layers, the 11 relationship types, and the relationship-validity matrix, enforced at edit time. On top, a **portfolio profile** adds typed property sets to selected element types: lifecycle phase dates, functional/technical fit, business criticality, TIME classification, tags. Profiles serialise as ordinary ArchiMate properties, so exchange-format round-trips lose nothing. **Properties on relationships are first-class** (support type, costs, validity dates) — the one structural feature LeanIX-style reporting cannot live without.

## Alternatives considered

- **Fact-sheet-first** (LeanIX clone with ArchiMate export bolted on): friendlier vocabulary, but the export becomes a lossy afterthought and the validity matrix can't be enforced.
- **Reduced ArchiMate subset**: fewer types to render, but breaks import of real models and undercuts the "ArchiMate-native" differentiator.

## Consequences

- Every element type needs a badge/rendering treatment (~60 types); mitigated by two-letter type codes (UI spec, ADR UI-2).
- Elements without a portfolio profile (capabilities, actors, goals) must render gracefully everywhere ("Not assessed").
- Implemented in issue #3 (`src/model/`).

## References

Concept §4; UI spec §4; the LeanIX↔ArchiMate mapping research in concept appendix.
