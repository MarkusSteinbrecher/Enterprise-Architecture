---
adr: '0004'
title: Canonical JSON as native format; exchange XML as interop boundary
date: 2026-08-06
status: Accepted
scope: project
tags: [formats, json, archimate-exchange, git, interop]
---

# ADR 0004 — Canonical JSON as native format; exchange XML as interop boundary

## Context

The model needs a persistent format that is git-diffable (local-first, file-as-source-of-truth workflow) and an interop format that real EA tools understand. The Open Group states its ArchiMate Model Exchange File Format is a conveyance format, "not intended as a persistent file format."

## Decision

The **native format is canonical JSON**: sorted keys, stable IDs, deterministic ordering, `schemaVersion`, byte-identical export→import→export. A published JSON Schema documents it (agent-consumable). The **Open Group exchange format XML is the interop boundary** — import and export, validated against the official XSDs — giving round-trips with Archi and every certified tool. Native `.archimate` files are import-only (phase 2, issue #13).

## Alternatives considered

- **Exchange XML as the native store** — contradicts the Open Group's own guidance; XML diffs poorly; properties-on-relationships and view configs would strain the schema.
- **GRAFICO-style element-per-file** (coArchi's git format) — great diff granularity, but a browser app saving hundreds of files needs directory handles everywhere; single-file canonical JSON with sorted keys gets most of the diff value at none of the cost. Revisit if git-merge collaboration becomes a real workflow.

## Consequences

- Determinism is a hard invariant — a serializer regression is a data-format bug, not a cosmetic one (round-trip tests in issue #5).
- Views/saved-report configs live in the JSON workspace, so shared views travel with the model file.
- Implemented in issue #5 (+ #13 for `.archimate`).

## References

Concept §5.3; Open Group exchange-format guide; coArchi GRAFICO precedent.
