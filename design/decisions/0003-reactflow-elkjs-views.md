---
adr: '0003'
title: React Flow + ELKjs for generated views
date: 2026-08-06
status: Accepted
scope: project
tags: [visualization, react-flow, elkjs, layout, reports]
---

# ADR 0003 — React Flow + ELKjs for generated views

## Context

The report engine renders auto-generated views: dependency graph, capability map (boxes-in-boxes), landscape, plus CSS-based matrix/roadmap/portfolio. Library research (2026-08-06) covered React Flow, Cytoscape.js, JointJS, maxGraph, diagram-js, and Graphviz-WASM.

## Decision

**React Flow (@xyflow/react, MIT)** renders graph-shaped views with custom ArchiMate-notation node components; **ELKjs (EPL-2.0) runs in a web worker** — `layered` for dependency/landscape views, `rectpacking`/`box` for capability maps. Matrix, roadmap, and portfolio bubble use plain CSS grid/SVG — no graph layout engine. This is the pipeline LikeC4 proves in production on static hosting.

## Alternatives considered

- **Cytoscape.js** — strong compound nodes and graph analytics, but canvas-rendered nodes make pixel-faithful ArchiMate notation awkward. Kept as an option if analytic interactivity outgrows React Flow.
- **Graphviz-WASM** (LikeC4's layouter) — proven; second candidate if ELK's capability-map packing disappoints. Prototype both on real data before locking layouts (issue #10 / #12).
- **diagram-js** — the right base for a free-form *editor* (phase 3), wrong tool for generated views.
- **JointJS** (MPL + paid tier), **maxGraph** (pre-1.0 churn) — rejected.

## Consequences

- One rendering stack serves all graph views; "editable auto-layouts" (drag/pin, persist positions) stays open as the pragmatic phase-3 path.
- ArchiMate-specific code (shapes, badges) is owned in-repo — every ArchiMate JS library found is a low-bus-factor solo project.
- Implemented from issue #10 onward.

## References

Concept §6; browser-library research 2026-08-06; UI spec §3.3–3.4 (trace interaction, shared report chrome).
