import { type Bounds, type Point, type View, type ViewConnection, type ViewNode } from '@/model'

/**
 * Geometry of a hand-drawn view (#79): where things are in view coordinates,
 * where connections run, and how big the drawing is. Pure, so the canvas, the
 * mini-map and the export all agree.
 */

/**
 * Absolute bounds of every node, computed once per view revision. Each parent's
 * offset is resolved once and reused, so this is linear in the node count where
 * calling `absoluteBounds` per node would be quadratic. A parent cycle or a
 * missing parent ends the walk, as `absoluteBounds` does.
 */
export function absoluteIndex(view: View): Map<string, Bounds> {
  const byId = new Map(view.nodes.map((node) => [node.id, node]))
  const origin = new Map<string, Point>()
  const resolving = new Set<string>()
  const originOf = (node: ViewNode): Point => {
    const known = origin.get(node.id)
    if (known) return known
    let base: Point = { x: 0, y: 0 }
    const parent = node.parent === undefined ? undefined : byId.get(node.parent)
    if (parent && !resolving.has(node.id)) {
      resolving.add(node.id)
      base = originOf(parent)
      resolving.delete(node.id)
    }
    const point = { x: base.x + node.bounds.x, y: base.y + node.bounds.y }
    origin.set(node.id, point)
    return point
  }
  const out = new Map<string, Bounds>()
  for (const node of view.nodes) {
    const { x, y } = originOf(node)
    out.set(node.id, { ...node.bounds, x, y })
  }
  return out
}

/**
 * Child nodes per parent id, in drawing order; `undefined` holds the top level.
 *
 * A node whose ancestor chain is broken — a parent missing from the view, or a
 * parent cycle — is drawn at the top level at its absolute position rather than
 * vanishing: hiding part of someone's diagram would be silent loss. The view
 * validator reports the broken chain itself.
 */
export function childrenIndex(view: View): Map<string | undefined, ViewNode[]> {
  const byId = new Map(view.nodes.map((node) => [node.id, node]))
  const sound = (node: ViewNode): boolean => {
    const seen = new Set([node.id])
    let parent = node.parent
    while (parent !== undefined) {
      const next = byId.get(parent)
      if (!next || seen.has(parent)) return false
      seen.add(parent)
      parent = next.parent
    }
    return true
  }
  const out = new Map<string | undefined, ViewNode[]>()
  for (const node of view.nodes) {
    const parent = sound(node) ? node.parent : undefined
    const list = out.get(parent)
    if (list) list.push(node)
    else out.set(parent, [node])
  }
  return out
}

/**
 * Where the line from the centre of `box` toward `toward` leaves the box: Archi's
 * default (chopbox) anchor. A connection with no bend-points therefore runs
 * centre to centre, clipped at both outlines.
 */
export function chopbox(box: Bounds, toward: Point): Point {
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  const dx = toward.x - cx
  const dy = toward.y - cy
  if (dx === 0 && dy === 0) return { x: cx, y: cy }
  const sx = dx === 0 ? Infinity : box.width / 2 / Math.abs(dx)
  const sy = dy === 0 ? Infinity : box.height / 2 / Math.abs(dy)
  const s = Math.min(sx, sy)
  return { x: cx + dx * s, y: cy + dy * s }
}

const centre = (b: Bounds): Point => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 })

/**
 * The full route of a connection: source anchor, bend-points, target anchor.
 * Undefined when an end is not in the view (the validator reports that).
 */
export function connectionRoute(
  connection: ViewConnection,
  bounds: ReadonlyMap<string, Bounds>,
): Point[] | undefined {
  const source = bounds.get(connection.source)
  const target = bounds.get(connection.target)
  if (!source || !target) return undefined
  const bends = connection.bendpoints ?? []
  const first = bends[0] ?? centre(target)
  const last = bends[bends.length - 1] ?? centre(source)
  return [chopbox(source, first), ...bends, chopbox(target, last)]
}

/** The rectangle that holds every node and every bend-point; `undefined` for an empty view. */
export function drawingBounds(view: View, bounds: ReadonlyMap<string, Bounds>): Bounds | undefined {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  const add = (x: number, y: number) => {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  for (const b of bounds.values()) {
    add(b.x, b.y)
    add(b.x + b.width, b.y + b.height)
  }
  for (const connection of view.connections) {
    for (const p of connection.bendpoints ?? []) add(p.x, p.y)
  }
  if (minX === Infinity) return undefined
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

/** Pan and zoom: a view point p appears on screen at `p * zoom + offset`. */
export interface Viewport {
  x: number
  y: number
  zoom: number
}

export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 4

export const clampZoom = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))

/**
 * The viewport that shows all of `drawing` inside a `width` × `height` screen,
 * with `padding` around it. Fit never enlarges past 100%: a small diagram is
 * shown at its drawn size, centred, rather than blown up.
 */
export function fitViewport(
  drawing: Bounds | undefined,
  width: number,
  height: number,
  padding = 24,
): Viewport {
  if (!drawing || width <= 0 || height <= 0) return { x: padding, y: padding, zoom: 1 }
  const zoom = clampZoom(
    Math.min(
      1,
      (width - padding * 2) / Math.max(drawing.width, 1),
      (height - padding * 2) / Math.max(drawing.height, 1),
    ),
  )
  return {
    x: (width - drawing.width * zoom) / 2 - drawing.x * zoom,
    y: (height - drawing.height * zoom) / 2 - drawing.y * zoom,
    zoom,
  }
}

/** Zoom to `zoom`, keeping the view point under the screen point `at` where it is. */
export function zoomAround(viewport: Viewport, zoom: number, at: Point): Viewport {
  const next = clampZoom(zoom)
  const k = next / viewport.zoom
  return { x: at.x - (at.x - viewport.x) * k, y: at.y - (at.y - viewport.y) * k, zoom: next }
}

/** The viewport that puts the view point `p` at the centre of the screen, at the same zoom. */
export function centreOn(viewport: Viewport, p: Point, width: number, height: number): Viewport {
  return { ...viewport, x: width / 2 - p.x * viewport.zoom, y: height / 2 - p.y * viewport.zoom }
}
