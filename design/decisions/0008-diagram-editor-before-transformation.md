---
adr: '0008'
title: The diagram editor comes before transition planning
date: 2026-10-06
status: Accepted
scope: project
tags: [roadmap, modelling, transformation]
---

# ADR 0008 — The diagram editor comes before transition planning

## Context

M1 of the model pillar (#74) is complete: Archipelago opens any Archi model and shows its views and folders, read-only (#75–#80, #13). The follow-up work through #123 brought the import close to how Archi itself reads a file, compatibility handlers included. The concept (`design/specs/archi-class-modelling-concept.md` §6, §7.5) left one choice to the sponsor. After M1, does the diagram editor (M2) come next, or the transition-planning core of the plan pillar (#72: initiatives and change sets, time machine, scenarios, gap and impact analysis)?

The editor makes Archipelago a replacement for Archi: without editing, a user can look at their model but not switch to it. Transition planning is what Archi lacks entirely, and so the stronger argument against Archi. Both are large. The engine was chosen by spike (ADR 0006), but the M2 issues were not yet filed. The plan pillar has issues (#60–#65), but its overlay design (#58) and its collaboration premise (#59) have no ADR yet.

## Decision

**M2, the diagram editor, comes next** (sponsor, 2026-10-06). Phases 3 and 4 of the concept (repository foundation, transition states) follow it, as §6 orders them.

The editor is built in thin slices that each round-trip to Archi, beginning with move and resize, connecting with only valid relationships offered, and saving a file Archi opens as drawn. Every edit goes through the command stack.

## Consequences

- The M2 list in #74 becomes issues, each with acceptance criteria, before implementation starts. The first slice is the one named above.
- Archi stays the test oracle: an edited view is saved, opened and re-saved by Archi 5.10, and must come back as drawn, as #100–#123 did for reading.
- Transition planning (#72, #58, #60–#65) waits. Its overlay ADR (#58) can still be written in parallel, because the editor will have to draw state-aware views later (concept §3.2).
