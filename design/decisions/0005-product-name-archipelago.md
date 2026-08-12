---
adr: '0005'
title: 'Product name: Archipelago'
date: 2026-08-07
status: Accepted
scope: project
tags: [naming, trademark, branding]
---

# ADR 0005 — Product name: Archipelago

## Context

The concept (§10) required a name that does not embed "ArchiMate" — a registered trademark of The Open Group — and floated *Archipelago*, *Atlas EA*, and *Stratum* as candidates. Since then, *Archipelago* has been used throughout the design handoff, the UI prototype (brand mark, wordmark), the README, and the wiki. De-facto adoption has outrun the formal decision.

## Decision

The product is named **Archipelago**. Rationale: evokes "islands of architecture" connected into one map; contains the *Archi-* echo without using the trademark; unclaimed among EA tools (2026-08 search); works as a wordmark in the established visual identity. The README keeps the attribution: "ArchiMate® is a registered trademark of The Open Group; this project is not affiliated with or endorsed by The Open Group."

## Alternatives considered

- **Atlas EA** — generic, heavily overloaded (MongoDB Atlas, ArcGIS Atlas, various EA "Atlas" modules).
- **Stratum** — clean layers metaphor, but multiple existing dev tools carry the name.
- Renaming away from the *Archi-* echo entirely — discarded; the echo is an asset for discoverability in the ArchiMate ecosystem and carries no legal weight by itself.

## Consequences

- The GitHub repo keeps its `Enterprise-Architecture` name **for now** (renames redirect, but the Pages base path `/Enterprise-Architecture/` is baked into the deploy; renaming to `archipelago` is a separate, deliberate step — do it before the first public announcement or not at all, and update `BASE_PATH`, README links, and wiki pointers in the same change).
- Package/binary identifiers use `archipelago` (lowercase).
- Watch item: "Archipelago" is used by unrelated software projects in other domains; no EA-tool collision found 2026-08, re-check before 1.0.

## References

Concept §10 (ADR-005 candidate); UI spec (brand usage); wiki ADR 0007 (repo identity).
