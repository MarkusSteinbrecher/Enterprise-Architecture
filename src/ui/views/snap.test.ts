import { describe, expect, it } from 'vitest'
import type { Bounds, View, ViewNode } from '@/model'
import { GUIDE_THRESHOLD, ieeeRemainder, snapMove, snapResize, type SnapSettings } from './snap'

/**
 * Grid and guide snapping (#136), against GEF's `SnapToGrid` and
 * `SnapToGeometry` as Archi 5.10 composes them (read with `javap`).
 */

const note = (id: string, bounds: Bounds, parent?: string): ViewNode => ({
  id,
  kind: 'note',
  text: id,
  bounds,
  ...(parent ? { parent } : {}),
})
const b = (x: number, y: number, width: number, height: number): Bounds => ({
  x,
  y,
  width,
  height,
})
const viewOf = (...nodes: ViewNode[]): View => ({
  id: 'v',
  name: 'v',
  properties: {},
  nodes,
  connections: [],
})

const GRID: SnapSettings = { grid: 12, guides: false, threshold: GUIDE_THRESHOLD }
const GUIDES: SnapSettings = { grid: null, guides: true, threshold: GUIDE_THRESHOLD }
const BOTH: SnapSettings = { grid: 12, guides: true, threshold: GUIDE_THRESHOLD }
const NONE: SnapSettings = { grid: null, guides: false, threshold: GUIDE_THRESHOLD }

const move = (
  view: View,
  id: string,
  dx: number,
  dy: number,
  settings: SnapSettings,
  into?: string,
) => snapMove(view, new Set([id]), id, into, dx, dy, settings)

describe('snapping a move to the grid (#136)', () => {
  const view = viewOf(note('m', b(5, 7, 120, 55)))

  it('puts the dragged shape’s corner on the nearest grid line', () => {
    // 5 + 30 = 35 → 36; 7 + 20 = 27 → 24.
    expect(move(view, 'm', 30, 20, GRID)).toMatchObject({ dx: 31, dy: 17 })
  })

  it('leaves the move as it was with snapping off', () => {
    expect(move(view, 'm', 30.4, 20, NONE)).toEqual({ dx: 30.4, dy: 20, guides: [] })
  })

  it('measures the grid from the corner of the container the shape goes into', () => {
    const nested = viewOf(note('g', b(103, 205, 400, 400)), note('m', b(5, 7, 120, 55)))
    // The corner lands at 35, 27; from the group's corner that is -68, -178 → -72, -180.
    expect(move(nested, 'm', 30, 20, GRID, 'g')).toMatchObject({
      dx: 103 - 72 - 5,
      dy: 205 - 180 - 7,
    })
  })

  it('breaks a tie half-way between two lines to the even one, as the IEEE remainder does', () => {
    expect(ieeeRemainder(6, 12)).toBe(6) // 6 → 0
    expect(ieeeRemainder(18, 12)).toBe(-6) // 18 → 24
    expect(ieeeRemainder(-6, 12)).toBe(-6) // -6 → 0
    expect(ieeeRemainder(-18, 12)).toBe(6) // -18 → -24
    expect(ieeeRemainder(7, 12)).toBe(-5)
    const at = viewOf(note('m', b(0, 0, 10, 10)))
    expect(move(at, 'm', 6, 18, GRID)).toMatchObject({ dx: 0, dy: 24 })
  })
})

describe('snapping a move to other shapes (#136)', () => {
  // A target at x 200–320 (centre 260), y 100–155 (centre 127.5).
  const target = note('t', b(200, 100, 120, 55))

  it('snaps an edge within the threshold of another’s, and not one pixel beyond', () => {
    const view = viewOf(target, note('m', b(0, 300, 120, 55)))
    // m's left edge to t's left edge: 5 away snaps, 6 away does not.
    expect(move(view, 'm', 195, 0, GUIDES).dx).toBe(200)
    expect(move(view, 'm', 205, 0, GUIDES).dx).toBe(200)
    expect(move(view, 'm', 194, 0, GUIDES).dx).toBe(194)
    expect(move(view, 'm', 206, 0, GUIDES).dx).toBe(206)
  })

  it('takes the threshold in screen pixels, so it narrows as the canvas zooms in', () => {
    const view = viewOf(target, note('m', b(0, 300, 120, 55)))
    const zoomed = { ...GUIDES, threshold: GUIDE_THRESHOLD / 2 }
    expect(move(view, 'm', 197.5, 0, zoomed).dx).toBe(200)
    expect(move(view, 'm', 197, 0, zoomed).dx).toBe(197)
  })

  it('snaps an edge to either edge of another shape', () => {
    const view = viewOf(target, note('m', b(0, 300, 50, 55)))
    // m's left to t's right edge (320).
    expect(move(view, 'm', 318, 0, GUIDES).dx).toBe(320)
    // m's right edge (x + 50) to t's left edge (200).
    expect(move(view, 'm', 148, 0, GUIDES).dx).toBe(150)
  })

  it('tries the centre before the edges, as SnapToGeometry does', () => {
    // m is 100 wide. At dx 208 its centre (258) is 2 from t's (260), and its
    // left edge (208) only 1 from u's right edge (209). The centre still wins.
    const view = viewOf(target, note('u', b(109, 500, 100, 40)), note('m', b(0, 300, 100, 55)))
    const snap = move(view, 'm', 208, 0, GUIDES)
    expect(snap.dx).toBe(210)
    expect(snap.guides).toEqual([{ axis: 'x', at: 260, from: 100, to: 355 }])
  })

  it('shows the guide across the dragged shape and every shape on the line', () => {
    const view = viewOf(
      target,
      note('u', b(200, 500, 40, 40)),
      // 30 wide, so its centre (213) is near no other centre and its left edge decides.
      note('m', b(0, 300, 30, 55)),
    )
    expect(move(view, 'm', 198, 0, GUIDES).guides).toEqual([
      { axis: 'x', at: 200, from: 100, to: 540 },
    ])
  })

  it('snaps only to the other children of the container it goes into', () => {
    const view = viewOf(
      note('g', b(0, 0, 1000, 1000)),
      note('inside', b(300, 300, 50, 50), 'g'),
      note('outside', b(200, 1200, 50, 50)),
      note('m', b(0, 600, 50, 50), 'g'),
    )
    // Into the group: the group's child is a target, the top-level shape is not.
    expect(move(view, 'm', 298, 0, GUIDES, 'g').dx).toBe(300)
    expect(move(view, 'm', 198, 0, GUIDES, 'g').dx).toBe(198)
    // At the top level it is the other way round.
    expect(move(view, 'm', 198, 0, GUIDES).dx).toBe(200)
    expect(move(view, 'm', 298, 0, GUIDES).dx).toBe(298)
  })

  it('never snaps to a shape that moves with it', () => {
    const view = viewOf(note('m', b(0, 0, 50, 50)), note('n', b(100, 0, 50, 50)))
    const both = snapMove(view, new Set(['m', 'n']), 'm', undefined, 98, 0, GUIDES)
    expect(both.dx).toBe(98)
  })

  it('lets a guide decide its axis and the grid the other', () => {
    const view = viewOf(target, note('m', b(0, 300, 120, 55)))
    // x: m's left to t's left at 200, off the 12 grid; y: no shape there, so the grid.
    const snap = move(view, 'm', 198, 7, BOTH)
    expect(snap.dx).toBe(200)
    expect(300 + snap.dy).toBe(312)
  })

  it('falls back to the grid on an axis whose guide is out of reach', () => {
    const view = viewOf(target, note('m', b(0, 300, 120, 55)))
    expect(move(view, 'm', 190, 0, BOTH).dx).toBe(192)
  })
})

describe('snapping a resize (#136)', () => {
  const view = viewOf(
    note('g', b(100, 100, 600, 600)),
    note('t', b(200, 50, 100, 100), 'g'),
    note('r', b(10, 300, 120, 55), 'g'),
  )

  it('snaps the edge being dragged to the grid, from the parent’s corner', () => {
    // r's right edge dragged to 10 + 125 = 135 → 132 in the group's grid.
    const snap = snapResize(view, 'r', 'e', b(10, 300, 125, 55), GRID)
    expect(snap.bounds).toEqual(b(10, 300, 122, 55))
  })

  it('snaps a resized edge to the grid alone with guides off, though a sibling’s edge is near', () => {
    // r's right edge dragged to 197, 3 from t's left edge (200): the grid takes it to 192.
    expect(snapResize(view, 'r', 'e', b(10, 300, 187, 55), GRID).bounds).toEqual(
      b(10, 300, 182, 55),
    )
  })

  it('snaps a resized edge to no grid with only guides on, when no edge is near', () => {
    expect(snapResize(view, 'r', 'e', b(10, 300, 127, 55), GUIDES)).toEqual({
      bounds: b(10, 300, 127, 55),
      guides: [],
    })
  })

  it('snaps a left edge and keeps the right edge where it was', () => {
    const snap = snapResize(view, 'r', 'w', b(7, 300, 123, 55), GRID)
    expect(snap.bounds).toEqual(b(12, 300, 118, 55))
  })

  it('snaps a moved edge to another child’s edge within the threshold, and not beyond', () => {
    // t's left edge is at 200 in the group; r's right edge dragged to 195 snaps, to 194 does not.
    expect(snapResize(view, 'r', 'se', b(10, 300, 185, 60), GUIDES).bounds).toEqual(
      b(10, 300, 190, 60),
    )
    expect(snapResize(view, 'r', 'se', b(10, 300, 184, 60), GUIDES).bounds).toEqual(
      b(10, 300, 184, 60),
    )
    const snapped = snapResize(view, 'r', 'se', b(10, 300, 185, 60), GUIDES)
    expect(snapped.guides).toEqual([{ axis: 'x', at: 300, from: 150, to: 460 }])
  })

  it('snaps the top and bottom edges on the other axis', () => {
    expect(snapResize(view, 'r', 'n', b(10, 297, 120, 58), GRID).bounds).toEqual(
      b(10, 300, 120, 55),
    )
    expect(snapResize(view, 'r', 's', b(10, 300, 120, 62), GRID).bounds).toEqual(
      b(10, 300, 120, 60),
    )
  })

  it('leaves an edge where the pointer put it when snapping would make the box too small', () => {
    // A 12 grid would take a right edge at 15 back to 12: 2 wide, under the minimum.
    const small = viewOf(note('s', b(10, 10, 20, 20)))
    expect(snapResize(small, 's', 'e', b(10, 10, 5, 20), GRID).bounds).toEqual(b(10, 10, 5, 20))
    expect(snapResize(small, 's', 'w', b(25, 10, 5, 20), GRID).bounds).toEqual(b(25, 10, 5, 20))
    expect(snapResize(small, 's', 'n', b(10, 25, 20, 5), GRID).bounds).toEqual(b(10, 25, 20, 5))
    expect(snapResize(small, 's', 's', b(10, 10, 20, 5), GRID).bounds).toEqual(b(10, 10, 20, 5))
  })

  it('leaves the box as it is with snapping off', () => {
    expect(snapResize(view, 'r', 'se', b(10, 300, 127, 59), NONE)).toEqual({
      bounds: b(10, 300, 127, 59),
      guides: [],
    })
  })
})
