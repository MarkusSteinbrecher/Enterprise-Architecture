# The model layer

The typed ArchiMate 3.2 core. Pure TypeScript — no React, no storage, no I/O.
Everything above it (store, import/export, screens, reports) imports model
semantics from here and nowhere else.

Concept reference: `design/specs/open-ea-repository-concept.md` §4.
UI reference: `design/specs/open-ea-repository-ui-spec.md` §3.1, §2.2.

| File | What it owns |
|---|---|
| `layers.ts` | layers, aspects, the six colour groups |
| `element-types.ts` | the 61-element catalogue, two-letter codes |
| `relationship-types.ts` | the 11 relationship types, notation, abbreviations |
| `validity.ts` | the relationship validity matrix |
| `profile.ts` | portfolio profile types, scales, TIME, tags |
| `lifecycle.ts` | phase derivation from dates |
| `completeness.ts` | completeness scoring and model health |
| `workspace.ts` | `Element`, `Relationship`, `ViewDefinition`, `Workspace` |
| `validate.ts` | whole-model validation |

## Element types

All 61 element types of ArchiMate 3.2: Strategy (4), Business (13), Application
(9), Technology (13), Physical (4), Motivation (10), Implementation & Migration
(5), plus Location, Grouping and Junction. Each carries a layer, an aspect, a
colour group, and a unique two-letter monospace code — the code replaces the
notation shape set in list, card, graph, breadcrumb and palette contexts (ADR
UI-2). Junction is a relationship connector rather than an element, but the
exchange format serialises it in the element list, so it is carried here.

Colour groups are not layers: Strategy renders with Business, Physical with
Technology, and every passive-structure element renders in the slate ramp
regardless of which layer it belongs to.

## Relationship validity

The specification publishes its matrix as a generated table (Appendix B) that
already includes derived relationships. Rather than transcribe ~4,000 cells that
no reviewer can check, `validity.ts` expresses the structural rules the matrix is
generated from, over the `(layer, aspect)` metadata, plus a short list of named
exceptions from the spec text (Product aggregating services and contracts,
Plateau aggregating core elements, Work Package assigned to Deliverable,
Stakeholder assigned to Driver).

Realization and Serving use an abstraction rank — Technology/Physical 1,
Application 2, Business 3, Strategy 4 — and run from the concrete to the
abstract. Grouping and Location relate to anything; a Junction takes part in
everything except Composition, Aggregation and Specialization.

`validity.test.ts` is the specification of record: it pins down the cross-layer
patterns that matter (Application Service —Serving→ Business Process, Node
—Serving→ Application Component, Data Object —Realization→ Business Object, and
the rest of an ArchiSurance-shaped landscape) along with the rejections that
prove the rules are not vacuous.

## Lifecycle derivation

There is no stored lifecycle phase (ADR UI-3). Each date is the date its phase
*starts*, and the phase at a time point is the last phase whose start has been
reached:

```
t < phaseIn   → Plan          t < active   → Phase In      t < phaseOut → Active
t < endOfLife → Phase Out                                  otherwise    → End of Life
```

Phases without a date are skipped, so partial lifecycles behave sensibly; a time
point before every known start resolves to the phase preceding the earliest one.
Elements with no dates at all are Active and render `—` for every date. With all
four boundary dates present this is exactly the UI spec's rule — `lifecycle.test.ts`
checks the two agree on every year in the slider range.

Deriving rather than storing is what makes the time dimension free: the inventory
evaluates at today, the graph at its slider year, the roadmap will read the same
dates, and nothing can drift.

## Completeness scoring

*(UI spec open question 4 — resolved here.)*

Completeness is the **weighted fraction of the fields expected of an element**,
as a percentage. Which fields are expected depends on the element type.

| Criterion | Weight | Applies to |
|---|---|---|
| Documentation | 2 | every element |
| Owner (`owner` property) | 1 | every element |
| At least one relation | 2 | every element |
| Tags | 1 | every element |
| Lifecycle dates | 3 | profiled types — scored as the fraction of the five dates set |
| Functional fit | 1 | profiled types |
| Technical fit | 1 | profiled types |
| Business criticality | 1 | profiled types |
| TIME classification | 1 | profiled types |

"Profiled types" are the element types that carry a portfolio profile —
`PROFILED_TYPES` in `profile.ts`, Application Component and the IT-component-like
technology types by default (concept §4.2: applied to Application Component by
default, configurable per type later).

Two decisions worth stating:

- **Non-profiled types are not scored on profile fields.** A Capability with no
  technical fit is not an incomplete capability. Scoring it against fields it
  cannot have would make every non-application element look neglected and make
  model health meaningless.
- **Lifecycle scores partially.** Three of five phase dates earns three fifths of
  the weight, because half-filled lifecycles are the normal state of a real
  inventory rather than an error.

So a Capability is complete at 6 points (documentation, owner, a relation, a
tag); an Application Component at 13.

Weights live in `COMPLETENESS_CONFIG` and nowhere else. The colour ramp is ≥75
green, ≥50 amber, else red (handoff, "Derived values"); model health is the
rounded mean of element completeness.
