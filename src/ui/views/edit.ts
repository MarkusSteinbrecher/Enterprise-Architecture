import type { Bounds, Point, View, ViewConnection, ViewNode } from '@/model'
import { absoluteIndex, childrenIndex } from './geometry'

/**
 * The editor's geometry (#128): what a finished gesture does to a view. Pure,
 * so the canvas previews a gesture with the same function it commits, and each
 * returns the view unchanged (the same object) when there is nothing to do, so
 * a gesture that ends where it began commits nothing.
 *
 * Only the nodes a gesture touches get new objects; every other node and
 * connection keeps its identity, which is what lets the drawing skip them
 * (ADR 0006, Consequences).
 */

/** Smallest box a resize may leave. Ours: Archi's minimum was not measured. */
export const MIN_SIZE = 10

/** The selected nodes whose ancestors are not selected: moving a parent moves its children. */
export function topSelected(view: View, ids: ReadonlySet<string>): Set<string> {
  const byId = new Map(view.nodes.map((node) => [node.id, node]))
  const top = new Set<string>()
  for (const id of ids) {
    let parent = byId.get(id)?.parent
    const seen = new Set([id])
    let covered = false
    while (parent !== undefined && !seen.has(parent)) {
      if (ids.has(parent)) {
        covered = true
        break
      }
      seen.add(parent)
      parent = byId.get(parent)?.parent
    }
    if (!covered && byId.has(id)) top.add(id)
  }
  return top
}

/** The given nodes and everything nested in them, at any depth. */
export function withDescendants(view: View, ids: ReadonlySet<string>): Set<string> {
  const all = new Set([...ids].filter((id) => view.nodes.some((n) => n.id === id)))
  // Parents can come after their children in `view.nodes`, so sweep until nothing is added.
  for (let grew = true; grew;) {
    grew = false
    for (const node of view.nodes) {
      if (node.parent !== undefined && all.has(node.parent) && !all.has(node.id)) {
        all.add(node.id)
        grew = true
      }
    }
  }
  return all
}

/**
 * Move the selection by (dx, dy) in view coordinates. With `drop`, re-parent it
 * into `drop.into`, where `undefined` is the top level; without, every node
 * stays in its parent. An object rather than an optional parameter, because a
 * default would also apply to an explicit `undefined` and turn "the top level"
 * into "where it was". A re-parented node keeps its absolute position.
 */
export function moveSelection(
  view: View,
  ids: ReadonlySet<string>,
  dx: number,
  dy: number,
  drop?: { into: string | undefined },
): View {
  const top = topSelected(view, ids)
  if (top.size === 0) return view
  const before = absoluteIndex(view)
  let changed = false
  const moved = view.nodes.map((node) => {
    if (!top.has(node.id)) return node
    const parent = drop ? drop.into : node.parent
    if (dx === 0 && dy === 0 && parent === node.parent) return node
    changed = true
    const abs = before.get(node.id)!
    const origin = parent === undefined ? undefined : before.get(parent)
    const moved: ViewNode = {
      ...node,
      bounds: {
        ...node.bounds,
        x: abs.x + dx - (origin?.x ?? 0),
        y: abs.y + dy - (origin?.y ?? 0),
      },
    }
    if (parent === undefined) delete moved.parent
    else moved.parent = parent
    return moved
  })
  if (!changed) return view
  // A node dropped into a new parent goes last among its new siblings, so it is
  // drawn on top of them: Archi appends it (`DiagramLayoutPolicy$AddObjectCommand`
  // adds to the end of the new container's children). Sibling order is array
  // order, so moving it to the end of the array is enough; its own children keep
  // their order among themselves.
  const reparented = new Set(
    moved.filter((node, i) => node.parent !== view.nodes[i]!.parent).map((node) => node.id),
  )
  const nodes = reparented.size
    ? [...moved.filter((n) => !reparented.has(n.id)), ...moved.filter((n) => reparented.has(n.id))]
    : moved
  return followBendpoints(view, { ...view, nodes })
}

/**
 * Give one node new bounds, relative to its parent. When the box's origin moves
 * (a resize from the top or left edge) its children are moved back by the same
 * amount, so they stay where they were drawn: Archi's default `resizeBehaviour`
 * (0) does the same in `SetConstraintObjectCommand.createChildConstraintCommands`.
 */
export function resizeNode(view: View, id: string, bounds: Bounds): View {
  const node = view.nodes.find((n) => n.id === id)
  if (!node) return view
  const next = {
    ...bounds,
    width: Math.max(MIN_SIZE, bounds.width),
    height: Math.max(MIN_SIZE, bounds.height),
  }
  const old = node.bounds
  if (
    next.x === old.x &&
    next.y === old.y &&
    next.width === old.width &&
    next.height === old.height
  ) {
    return view
  }
  const shiftX = old.x - next.x
  const shiftY = old.y - next.y
  const nodes = view.nodes.map((n) => {
    if (n.id === id) return { ...n, bounds: next }
    if (n.parent === id && (shiftX !== 0 || shiftY !== 0)) {
      return { ...n, bounds: { ...n.bounds, x: n.bounds.x + shiftX, y: n.bounds.y + shiftY } }
    }
    return n
  })
  return followBendpoints(view, { ...view, nodes })
}

/**
 * Bend-points follow the shapes they run between, as Archi keeps them. Archi
 * stores bend-point i of n relative to both ends' centres and draws it at their
 * weighted mean, weight w = (i + 1) / (n + 1) toward the target (GEF's
 * `RelativeBendpoint`, see `io/README.md`). So when the source's centre moves by
 * s and the target's by t, the point moves by (1 − w)·s + w·t: by the whole
 * move when both ends move together, part of it when only one does.
 */
export function followBendpoints(before: View, after: View): View {
  const was = absoluteIndex(before)
  const now = absoluteIndex(after)
  const shift = (id: string): Point => {
    const a = was.get(id)
    const b = now.get(id)
    if (!a || !b) return { x: 0, y: 0 }
    return {
      x: b.x + b.width / 2 - (a.x + a.width / 2),
      y: b.y + b.height / 2 - (a.y + a.height / 2),
    }
  }
  let changed = false
  const connections = after.connections.map((connection): ViewConnection => {
    const bends = connection.bendpoints
    if (!bends?.length) return connection
    const s = shift(connection.source)
    const t = shift(connection.target)
    if (s.x === 0 && s.y === 0 && t.x === 0 && t.y === 0) return connection
    const n = bends.length
    const moved = bends.map((point, i) => {
      const w = (i + 1) / (n + 1)
      return {
        x: Math.round(point.x + (1 - w) * s.x + w * t.x),
        y: Math.round(point.y + (1 - w) * s.y + w * t.y),
      }
    })
    if (moved.every((p, i) => p.x === bends[i]!.x && p.y === bends[i]!.y)) return connection
    changed = true
    return { ...connection, bendpoints: moved }
  })
  return changed ? { ...after, connections } : after
}

/** Kinds a shape can be dropped into. Notes and view references hold nothing, nor does a junction. */
function canContain(node: ViewNode, isJunction: (elementId: string) => boolean): boolean {
  if (node.kind === 'group') return true
  return node.kind === 'element' && !isJunction(node.element)
}

/**
 * The innermost container under `point` (view coordinates) that the moving
 * nodes may be dropped into: never one of them, nor anything inside them.
 * `undefined` is the view itself.
 */
export function dropTarget(
  view: View,
  moving: ReadonlySet<string>,
  point: Point,
  isJunction: (elementId: string) => boolean,
): string | undefined {
  const bounds = absoluteIndex(view)
  const byId = new Map(view.nodes.map((node) => [node.id, node]))
  const insideMoving = (node: ViewNode): boolean => {
    const seen = new Set<string>()
    for (let at: ViewNode | undefined = node; at && !seen.has(at.id);) {
      if (moving.has(at.id)) return true
      seen.add(at.id)
      at = at.parent === undefined ? undefined : byId.get(at.parent)
    }
    return false
  }
  // Walked in drawing order (`ViewDrawing`'s: a parent, then its children, then
  // the next sibling), so the last container that holds the point is the one
  // drawn on top of the others there. Array order is not drawing order: a
  // re-parented node can sit before its new parent in `view.nodes`.
  let target: string | undefined
  const children = childrenIndex(view)
  const visit = (parent: string | undefined) => {
    for (const node of children.get(parent) ?? []) {
      const b = bounds.get(node.id)
      if (
        b &&
        canContain(node, isJunction) &&
        !insideMoving(node) &&
        point.x >= b.x &&
        point.x <= b.x + b.width &&
        point.y >= b.y &&
        point.y <= b.y + b.height
      ) {
        target = node.id
      }
      visit(node.id)
    }
  }
  visit(undefined)
  return target
}

/** Nodes whose absolute box lies wholly inside `rect`: GEF's marquee default, "nodes contained". */
export function nodesInside(view: View, rect: Bounds): string[] {
  const bounds = absoluteIndex(view)
  const ids: string[] = []
  for (const node of view.nodes) {
    const b = bounds.get(node.id)
    if (
      b &&
      b.x >= rect.x &&
      b.y >= rect.y &&
      b.x + b.width <= rect.x + rect.width &&
      b.y + b.height <= rect.y + rect.height
    ) {
      ids.push(node.id)
    }
  }
  return ids
}

/** The rectangle spanned by two points. */
export function spanned(a: Point, b: Point): Bounds {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  }
}

export type Handle = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw'
export const HANDLES: readonly Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

/** A node's relative bounds after dragging `handle` by (dx, dy), clamped at the minimum size. */
export function resized(bounds: Bounds, handle: Handle, dx: number, dy: number): Bounds {
  let { x, y, width, height } = bounds
  if (handle.includes('e')) width = Math.max(MIN_SIZE, width + dx)
  if (handle.includes('s')) height = Math.max(MIN_SIZE, height + dy)
  if (handle.includes('w')) {
    const w = Math.max(MIN_SIZE, width - dx)
    x += width - w
    width = w
  }
  if (handle.includes('n')) {
    const h = Math.max(MIN_SIZE, height - dy)
    y += height - h
    height = h
  }
  return { x, y, width, height }
}
