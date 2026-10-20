import { childrenByParent, type Bounds, type View } from '@/model'
import { absoluteIndex } from './geometry'
import { MIN_SIZE, type Handle } from './edit'

/**
 * Snapping a drag to the grid and to other shapes (#136), as Archi 5.10 does it
 * (read with `javap`). Archi's `SnapEditPartAdapter` gives every container a
 * `CompoundSnapToHelper` of GEF's `SnapToGeometry`, then `SnapToGrid`: the
 * first that snaps an axis decides it, so a guide wins over the grid, and the
 * grid takes whatever axis no guide snapped. The helper is the container the
 * shape is dragged into, so the grid's origin is that container's corner and
 * the guides come from its other children.
 *
 * Pure: the canvas previews a drag with the same call it commits.
 */

/**
 * How close an edge or centre must come to another's to snap, in screen
 * pixels: GEF's `SnapToGeometry.THRESHOLD`, 5.0001, compared with `<`. GEF
 * works on zoomed coordinates, so the canvas divides it by the zoom.
 */
export const GUIDE_THRESHOLD = 5.0001

export interface SnapSettings {
  /** The grid size to snap to, or `null` when snapping to the grid is off. */
  grid: number | null
  /** Snap to the edges and centres of other shapes. */
  guides: boolean
  /** `GUIDE_THRESHOLD` in view units: divided by the zoom. */
  threshold: number
}

/**
 * A guide drawn while a drag is snapped to it: a line at `at` on one axis
 * (`x` is a vertical line), running `from`–`to` on the other, across the
 * dragged shape and every shape that has a line there.
 */
export interface Guide {
  axis: 'x' | 'y'
  at: number
  from: number
  to: number
}

/** One shape's lines across an axis: its near edge, centre and far edge. */
interface Lines {
  near: number
  centre: number
  far: number
}

const linesOf = (b: Bounds, axis: 'x' | 'y'): Lines => {
  const start = axis === 'x' ? b.x : b.y
  const size = axis === 'x' ? b.width : b.height
  return { near: start, centre: start + size / 2, far: start + size }
}

/**
 * GEF's `getCorrectionFor`: the nearest line of the given kind within the
 * threshold, as the correction to add, or `undefined`. A centre snaps only to a
 * centre; an edge snaps to either edge of another shape.
 */
function nearest(
  value: number,
  candidates: readonly Lines[],
  kind: 'centre' | 'edge',
  threshold: number,
): number | undefined {
  let best: number | undefined
  let distance = threshold
  for (const lines of candidates) {
    for (const at of kind === 'centre' ? [lines.centre] : [lines.near, lines.far]) {
      const d = Math.abs(at - value)
      if (d < distance) {
        distance = d
        best = at - value
      }
    }
  }
  return best
}

/**
 * The IEEE remainder `SnapToGrid` snaps with: the distance to the *nearest*
 * multiple of `n`, a tie going to the even multiple, so a corner exactly
 * half-way between two lines snaps the way Archi's does.
 */
export function ieeeRemainder(x: number, n: number): number {
  const q = x / n
  let k = Math.round(q)
  if (Math.abs(q - Math.trunc(q)) === 0.5 && k % 2 !== 0) k -= 1
  return x - k * n
}

/** The container's other children, in view coordinates: what a drag inside it snaps to. */
function snapTargets(
  view: View,
  bounds: ReadonlyMap<string, Bounds>,
  container: string | undefined,
  exclude: ReadonlySet<string>,
): Bounds[] {
  const children = childrenByParent(view).get(container) ?? []
  return children.filter((n) => !exclude.has(n.id)).flatMap((n) => bounds.get(n.id) ?? [])
}

/** The guide for a snapped line: across the dragged shape and every target with a line there. */
function guideAt(
  axis: 'x' | 'y',
  at: number,
  box: Bounds,
  targets: readonly Bounds[],
  kind: 'centre' | 'edge',
): Guide {
  const other = axis === 'x' ? 'y' : 'x'
  let from = linesOf(box, other).near
  let to = linesOf(box, other).far
  for (const target of targets) {
    const lines = linesOf(target, axis)
    const on = kind === 'centre' ? [lines.centre] : [lines.near, lines.far]
    if (!on.includes(at)) continue
    from = Math.min(from, linesOf(target, other).near)
    to = Math.max(to, linesOf(target, other).far)
  }
  return { axis, at, from, to }
}

/**
 * Snap a move: `dragged` is the shape under the pointer, moved by (dx, dy)
 * with the rest of the selection, `moving`, and `into` the container it is
 * dropped in (`undefined` is the view). GEF's drag tracker snaps the dragged
 * shape's box, so the others keep their distance to it. Returns the snapped
 * move and the guides it snapped to.
 *
 * Per axis, as `SnapToGeometry` tries them: the centre to a centre, else the
 * near edge to an edge, else the far edge to an edge; failing all three, the
 * near edge to the grid. Edges are the box's own: Archi's draw2d counts a
 * 120-pixel box as ending on pixel 119 and snaps that, which on its screen and
 * on ours puts the line on the same pixel.
 */
export function snapMove(
  view: View,
  moving: ReadonlySet<string>,
  dragged: string,
  into: string | undefined,
  dx: number,
  dy: number,
  settings: SnapSettings,
): { dx: number; dy: number; guides: Guide[] } {
  const bounds = absoluteIndex(view)
  const start = bounds.get(dragged)
  if (!start) return { dx, dy, guides: [] }
  const box = { ...start, x: start.x + dx, y: start.y + dy }
  const targets = settings.guides ? snapTargets(view, bounds, into, moving) : []
  const origin = into === undefined ? undefined : bounds.get(into)
  const guides: Guide[] = []
  const correction = (axis: 'x' | 'y'): number => {
    const lines = linesOf(box, axis)
    const across = targets.map((t) => linesOf(t, axis))
    const tries: ['centre' | 'edge', number][] = [
      ['centre', lines.centre],
      ['edge', lines.near],
      ['edge', lines.far],
    ]
    for (const [kind, value] of tries) {
      const found = nearest(value, across, kind, settings.threshold)
      if (found === undefined) continue
      guides.push(guideAt(axis, value + found, shifted(box, axis, found), targets, kind))
      return found
    }
    if (settings.grid === null) return 0
    const base = origin ? (axis === 'x' ? origin.x : origin.y) : 0
    return -ieeeRemainder(lines.near - base, settings.grid)
  }
  const cx = correction('x')
  const cy = correction('y')
  return { dx: dx + cx, dy: dy + cy, guides }
}

/**
 * Snap a resize: `proposed` is the node's new box relative to its parent, as
 * `resized` gives it for `handle`. Only the edges the handle moves snap, each
 * to another child's edge of the same parent, else to the grid; an edge that
 * would leave the box below the minimum size stays where the pointer put it.
 */
export function snapResize(
  view: View,
  node: string,
  handle: Handle,
  proposed: Bounds,
  settings: SnapSettings,
): { bounds: Bounds; guides: Guide[] } {
  const all = absoluteIndex(view)
  const own = view.nodes.find((n) => n.id === node)
  if (!own) return { bounds: proposed, guides: [] }
  const parent = own.parent === undefined ? undefined : all.get(own.parent)
  const ox = parent?.x ?? 0
  const oy = parent?.y ?? 0
  const targets = settings.guides ? snapTargets(view, all, own.parent, new Set([node])) : []
  const guides: Guide[] = []
  // In view coordinates: left, top, right, bottom.
  let left = proposed.x + ox
  let top = proposed.y + oy
  let right = left + proposed.width
  let bottom = top + proposed.height
  const snapEdge = (axis: 'x' | 'y', value: number): number => {
    const found = nearest(
      value,
      targets.map((t) => linesOf(t, axis)),
      'edge',
      settings.threshold,
    )
    if (found !== undefined) return value + found
    if (settings.grid === null) return value
    return value - ieeeRemainder(value - (axis === 'x' ? ox : oy), settings.grid)
  }
  if (handle.includes('w')) {
    const at = snapEdge('x', left)
    if (right - at >= MIN_SIZE) left = at
  }
  if (handle.includes('e')) {
    const at = snapEdge('x', right)
    if (at - left >= MIN_SIZE) right = at
  }
  if (handle.includes('n')) {
    const at = snapEdge('y', top)
    if (bottom - at >= MIN_SIZE) top = at
  }
  if (handle.includes('s')) {
    const at = snapEdge('y', bottom)
    if (at - top >= MIN_SIZE) bottom = at
  }
  const box = { x: left, y: top, width: right - left, height: bottom - top }
  // A guide for each edge that landed on another child's edge.
  for (const [axis, value, moved] of [
    ['x', left, handle.includes('w')],
    ['x', right, handle.includes('e')],
    ['y', top, handle.includes('n')],
    ['y', bottom, handle.includes('s')],
  ] as const) {
    if (!moved) continue
    if (targets.some((t) => [linesOf(t, axis).near, linesOf(t, axis).far].includes(value))) {
      guides.push(guideAt(axis, value, box, targets, 'edge'))
    }
  }
  return { bounds: { ...box, x: left - ox, y: top - oy }, guides }
}

const shifted = (b: Bounds, axis: 'x' | 'y', by: number): Bounds =>
  axis === 'x' ? { ...b, x: b.x + by } : { ...b, y: b.y + by }
