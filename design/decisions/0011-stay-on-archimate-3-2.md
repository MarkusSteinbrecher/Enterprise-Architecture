---
adr: '0011'
title: Stay on ArchiMate 3.2 until Archi supports ArchiMate 4
date: 2026-10-07
status: Accepted
scope: project
tags: [modelling, archimate, versioning, archi]
---

# ADR 0011 — Stay on ArchiMate 3.2 until Archi supports ArchiMate 4

## Context

Archipelago is ArchiMate 3.2-native (ADR 0001). The Open Group published the ArchiMate 4 Specification in April 2026, the first major revision in a decade (#148). The specification's publication page lists the main changes from 3.2. Version 4:

- removes business interaction, application interaction, technology interaction, constraint, contract, gap and representation;
- merges the behaviour elements across layers into a single service, process, function and event, which also replaces implementation event;
- merges the business, application and technology collaborations into one collaboration, and replaces business role with a generic role;
- replaces the term layer with domain, and describes the generic elements in a new Common Domain chapter;
- adds multiplicity to relationships.

By our count against that list, the 60 element types of 3.2 (Junction aside, as `src/model/element-types.ts` lists them) become 42, about 30% fewer: seven are removed, the merged services, processes, functions and events lose nine, and the merged collaborations lose two. The Open Group does not publish that figure.

The Open Group's announcement describes version 4 as developed "with strong user-level compatibility, enabling practitioners to transition smoothly from previous versions". The change list above is what a 3.2→4 migration in Archipelago would have to answer to.

Almost everything in `src/model` is keyed to the 3.2 structure: the element catalogue with its layers, aspects, codes and colour groups; the relationship matrix; the viewpoints. So are the exchange reader and writer, the fixtures that Archi re-saves, the ArchiSurance demo and the layer ramp in the report legend. Moving to 4 would also need a 3.2→4 migration. Where concepts merge or disappear, that migration loses information, and every such element would have to surface as an `ImportProblem` (CLAUDE.md).

ADR 0009 made Archi the authority on which relationships are valid: the matrix is Archi's `relationships.xml`, vendored unmodified. Archi is also the oracle the import and view tests are held to.

## Decision

**Archipelago stays on ArchiMate 3.2. We revisit when one of these happens:**

1. Archi ships ArchiMate 4 support, with a version 4 relationship matrix and file format; or
2. a user brings an ArchiMate 4 model they need to work with; or
3. a published ArchiMate 4 exchange-format schema becomes the format other tools write by default.

The README and the in-app guide (#149) say which version Archipelago implements.

The four facts #148 lists (Archi's support for version 4, a version 4 exchange schema, the licence terms for the version 4 text, and the size of the migration for our fixtures and demo) were deliberately not researched for this decision (sponsor, 2026-10-07). They are the first work of the revisit.

## Alternatives considered

- **Move to 4 now.** This breaks ADR 0009. Without Archi's version 4 matrix, we would have to transcribe and maintain our own, which is the thing ADR 0009 replaced after finding 5,437 cells of disagreement in the rules we had written ourselves. It would also break the Archi round-trip that the import, export and view work is held to.
- **Read both, model in one.** This is the costliest option: two catalogues, two matrices, and mapping rules between them. It gives value only once 4 models exist in the wild, which is trigger 2.

## Consequences

- No code changes. The catalogue, the matrix, the viewpoints and the exchange format stay as they are.
- New users who learned ArchiMate 4 will meet 3.2 vocabulary. The guide states the version and explains what 3.2 means, so the difference is visible, not surprising.
- When a trigger fires, a new ADR supersedes this one. Its first work is the four facts above. Its central design question is the 3.2→4 migration and what it must report.

## References

#148; #149; ADR 0001, ADR 0004, ADR 0007, ADR 0009. The Open Group, [ArchiMate® 4 Specification publication page](https://publications.opengroup.org/standards/archimate/c260) (the list of main changes from 3.2), and [announcement](https://www.opengroup.org/The-Open-Group-Announces-ArchiMate%C2%AE-4-Specification) (27 April 2026).
