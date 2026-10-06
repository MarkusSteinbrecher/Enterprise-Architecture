---
adr: '0009'
title: Relationship validity is Archi's matrix, with Archi's junction rules
date: 2026-10-06
status: Accepted
scope: project
tags: [modelling, validity, archi]
---

# ADR 0009 — Relationship validity is Archi's matrix, with Archi's junction rules

## Context

#129 makes the view editor offer only the relationship types ArchiMate allows between two shapes, and holds what it creates to Archi 5.10 (ADR 0008): "Archi reports no invalid relationship". Until then `src/model/validity.ts` derived validity from structural rules over each element type's layer and aspect, plus named exceptions. That choice was made in #3 so that nobody would have to review a transcribed table of about 4,000 cells. The modelling concept (§2) uses Archi's `relationships.xml` only to check our rules.

Checking them against it showed that the rules and Archi disagree on 5,437 cells. We allowed 4,540 that Archi rejects, such as Realization from Application Component to Data Object and Assignment from Application Component to Business Process. Archi's validator flags each of those, so an editor offering them would put flagged relationships into models it saves. We also rejected 897 that Archi allows, such as Serving from Business Actor to Application Component, so `validate()` reported errors in clean Archi models. Archi also checks junctions against the model as well as the matrix (`ArchimateModelUtils.isValidRelationship`, read with `javap`). Every relationship on a junction must be of one type, and the elements on its far side must be legal ends. Our rules had nothing of the kind.

## Decision

**The validity matrix is Archi's own `relationships.xml`, vendored unmodified, and the junction rules are Archi's** (sponsor, 2026-10-06, on #129).

- `src/model/archi/relationships.xml` is copied byte for byte from Archi 5.10.0, under its MIT licence (`NOTICE.md`). A test pins its SHA-256, so a hand edit fails. Taking a newer Archi's matrix means copying the file again and updating the hash.
- `validity.ts` parses it at load. `validateRelationship` is the type-level matrix. `validateRelationshipBetween` adds the junction rules over a model, and is what the connect menu, the fact sheet's relation picker and `validate()` use, as Archi's connection tool and validator both call its concept-level check.
- A refusal's reason now names what the matrix allows instead, and the other direction when that one is allowed. The rule-based explanations went with the rules.

This takes Archi's data, not its code. The concept's line against porting Archi's code stands. The matrix is the specification's Appendix B in the form Archi enforces, and data is not an implementation.

## Consequences

- The editor, the fact sheet and the validator agree with each other and with Archi. Every model test fixture, the demo among them, still validates clean.
- The specification of record is now the file, not `validity.test.ts`. The tests pin the file, the parser, and a few patterns, so a newer matrix that changes one of them is noticed.
- The main bundle grows by about 233 kB raw, about 6 kB gzipped, for the XML string.
- Archi's command line cannot run its validator, so the oracle for #129 runs this port of Archi's check over Archi's own save of the edited model. If the junction rules ever need to be confirmed against Archi itself, that takes a running Archi (jArchi or the GUI validator).
