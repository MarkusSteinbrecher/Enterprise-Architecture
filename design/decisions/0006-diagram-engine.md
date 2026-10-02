---
adr: '0006'
title: A custom SVG editor over our own model for hand-drawn views
date: 2026-10-02
status: Proposed
scope: project
tags: [modelling, views, diagram-engine, react, svg]
---

# ADR 0006 — A custom SVG editor over our own model for hand-drawn views

## Context

Phase M1 renders the views imported from Archi (#79), and M2 makes them editable. ADR 0003 chose React Flow + ELKjs for **generated** views and left the hand-drawn editor open. Issue #78 sets the requirements:

- nested containers, with drag in and out
- orthogonal and manual routing with bend-points
- exact custom shapes (the #77 React components)
- snapping, guides and alignment
- 300+ objects without lag
- fits the command stack: the engine must not own the model state
- an MIT- or Apache-compatible licence

**Library survey.** It shortlisted one dedicated library to measure:

| Library | Licence | Verdict |
|---|---|---|
| **diagram-js** 15 | MIT | **Measured.** The editor toolkit under bpmn-js, in production for years. It ships move, nesting, bend-points, an orthogonal (Manhattan) router, grid snapping, snapping to other shapes, align, distribute, lasso, resize and copy-paste. |
| maxGraph 0.24 | Apache-2.0 | Still pre-1.0. It owns its model and undo manager, like diagram-js, and has no advantage over diagram-js for us. |
| JointJS core 4 | MPL-2.0 | The editor features (selection, snaplines, stencil, halo) are in the paid JointJS+. |
| AntV X6 3 | MIT | Owns its graph model and history, like diagram-js. Most documentation is Chinese-first, and it is less proven for this use. |
| tldraw, GoJS | proprietary | Excluded by the licence requirement. |

**Spike.** The spike branch is `spike/78-diagram-engine` (throwaway; see `spike/78/`). Each candidate drew the Claims landscape view, which is our own model exported by real Archi 5.10 (#76). It has 45 nodes and 40 connections (85 objects), nesting three levels deep, and orthogonal bend-points.

Each candidate ran the same scripted test in real Chromium (`spike/78/measure.ts`). That test checks that each gesture lands on **our** command stack as exactly one command:

1. Move a nested shape: one command, and undo restores the model and the DOM.
2. Drag the shape out of its container into another one: one command, and the shape is re-parented.
3. Add a bend-point, then undo.
4. Drag the largest container, which moves its subtree and every attached line.
5. Pan the canvas.

All three candidates commit through the same `commitDrop` and bend-point helpers, so they are measured on the same edit semantics.

## Measurements

**Correctness.** All three candidates passed every check at 85, 510 and 1,360 objects (the view tiled 1×, 6× and 16×), with no console errors. Notes:

- diagram-js adds bend-points by dragging a segment. That inserts two points to keep the line orthogonal, which is how Archi users bend lines too.
- React Flow would not draw an edge until the node defined connection handles, even though our edge computes its own geometry.
- React Flow draws edges **under** nodes by default; Archi draws them on top. An edge `zIndex` fixes it.

**Frame times.** Each cell is the median / 95th-percentile / maximum frame time in ms. Headless Chromium on an Apple-silicon Mac renders at 120 Hz, so the floor is 8.3 ms. "4×" means the same run under 4× CPU throttling, as a proxy for a mid-range laptop. "Commit" and "undo" are the median times from pointer-up or key press to the next painted frame.

| Engine | Objects | CPU | Drag nested shape | Drag largest container | Pan | Commit | Undo |
|---|---:|---|---|---|---|---:|---:|
| Custom SVG | 510 | 1× | 8.3 / 8.7 / 16.6 | 8.3 / 9.1 / 10.2 | 8.3 / 8.4 / 9.5 | 12 | 13 |
| React Flow | 510 | 1× | 8.3 / 10.1 / 25.0 | 8.3 / 10.0 / 24.9 | 8.3 / 10.4 / 33.3 | 22 | 17 |
| diagram-js | 510 | 1× | 8.3 / 8.4 / 10.0 | 8.3 / 8.4 / 9.3 | 8.3 / 10.0 / 10.2 | 16 | 29 |
| Custom SVG | 510 | 4× | 8.3 / 10.2 / 26.0 | 8.3 / 10.2 / 23.4 | 8.3 / 10.2 / 24.6 | 35 | 24 |
| React Flow | 510 | 4× | 8.3 / 10.4 / 34.8 | 8.3 / 10.1 / 33.4 | 8.3 / 10.3 / 24.7 | 38 | 27 |
| diagram-js | 510 | 4× | 8.2 / 15.2 / 18.6 | 8.3 / 10.3 / 41.3 | 8.4 / 10.1 / 16.9 | 21 | 67 |
| Custom SVG | 1,360 | 4× | 8.5 / 35.0 / 124 | 8.5 / 33.4 / 125 | 8.4 / 33.4 / 115 | 133 | 84 |
| React Flow | 1,360 | 4× | 8.3 / 17.1 / 117 | 9.1 / 18.4 / 108 | 8.6 / 23.4 / 109 | 230 | 70 |
| diagram-js | 1,360 | 4× | 8.3 / 16.4 / 41.5 | 8.4 / 34.1 / 91.2 | 8.4 / 33.6 / 34.9 | 44 | 200 |

The full matrix, including 85 objects and 1,360 objects at 1×, is in `spike/78/out/results-t1.json` and `results-t4.json`.

**Performance does not decide.** Every candidate holds frame rate at the required 300+ objects, even throttled. At 1,360 objects throttled, each has one cost that a real implementation would fix:

- The custom editor and React Flow re-render every node on commit, because `updateView` clones the whole view and every node becomes a new object.
- diagram-js re-imports its whole canvas on our undo.

**Other costs:**

| | Custom SVG | React Flow | diagram-js |
|---|---|---|---|
| Added bundle (gzip) | ~2 KB | 0 (already shipped for the graph) | ~39 KB |
| Spike adapter | 226 lines | 194 lines | 216 lines |
| Model state | ours only | ours, plus RF's working copy of positions during a drag | **two models**: diagram-js's element registry and command stack, read back and cleared after every command |
| #77 React shape components | rendered directly | rendered directly, inside HTML node wrappers | **not usable as-is**: the renderer is imperative (`tiny-svg`), so shapes need a non-React port or `renderToStaticMarkup` per shape |
| Connections | ours | forced through RF's handle and edge system, then drawn by us anyway | native, with docking and Manhattan routing |
| Nesting with relative bounds | ours (~25 lines) | native (`parentId`, relative positions, the same as our model) | native, but with absolute coordinates, converted both ways |
| Snapping, guides, align, resize, lasso | **to build** | grid snap and a resizer; guides **to build** | **all included** |
| SVG export, read-only canvas (#79) | the canvas *is* the export | mixed HTML and SVG DOM; needs a separate export path (as `export-svg.ts` does today) | the canvas is SVG |

## Decision

Build hand-drawn views as a **custom SVG editor over our own model**: React components rendering the `View` directly, gestures held in transient UI state, and every finished gesture committed as one store command.

Pure, framework-free algorithms are borrowed where they exist. The candidate today is diagram-js's `ManhattanLayout` for orthogonal routing, which can be imported on its own for about 3 KB gzipped.

Reasons:

1. **It is the only candidate where "the engine must not own the model state" holds by construction**, not by an adapter. The diagram-js adapter works in the spike, but its read-back is a translation boundary. Every diagram-js feature we enable adds commands whose effects that boundary has to carry faithfully. This repo's own history (CLAUDE.md, "never drops data silently") shows that such boundaries are where data goes missing.
2. **One set of #77 shape components serves the editor, the read-only canvas (#79) and image export**, with no port and no second DOM.
3. **The gap is bounded UI code, not architecture.** What diagram-js would have given for free is snapping, guides, align and distribute, resize, lasso and auto-scroll. These are well-understood interactions, which M2 lists as issues anyway. React Flow's head start (pan, zoom, selection, minimap) is small next to its mismatches for ArchiMate: handles, edge layering and the HTML node wrappers. Its node-graph interaction model also does not fit the magic connector.

## Consequences

- M2 (#74) builds selection, lasso, resize handles, snapping and guides, align and distribute, keyboard move, auto-scroll and connection creation in-repo. File the M2 issues with that scope.
- `updateView` must stop invalidating unchanged nodes. Either keep node identity for untouched nodes, or memoise on content. This is the single largest cost the spike measured (133 ms commit at 1,360 objects throttled).
- #79 (read-only canvas) is the first slice of this editor: the same components with gestures switched off.
- #77 components stay plain React SVG, with no engine-specific wrapper.
- ADR 0003 is unchanged: generated views stay on React Flow + ELK. "Materialise as editable view" (concept §2.2) converts a React Flow layout into a `View`; it does not share the renderer.
- If M2 turns out to need most of diagram-js's interaction set anyway, revisit this ADR with a diagram-js adapter whose read-back is property-tested against the model. That is the runner-up, not React Flow.

## References

Issue #78; concept `design/specs/archi-class-modelling-concept.md` §2.2 and §5.2; ADR 0003; spike branch `spike/78-diagram-engine`.
