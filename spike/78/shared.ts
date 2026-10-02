/**
 * Spike #78 — throwaway. Shared harness for the three diagram-engine candidates:
 * load the Archi-exported claims fixture into a real ModelStore, optionally tile
 * the landscape view to reach the 300+ object requirement, and expose hooks the
 * Playwright measurement script reads.
 */
import xml from '@/io/fixtures/claims-platform.xml?raw'
import { importExchangeXml } from '@/io'
import { ModelStore } from '@/store'
import {
  absoluteBounds,
  findElementType,
  colourGroupTokens,
  type Bounds,
  type Point,
  type View,
  type ViewNode,
} from '@/model'

export const VIEW_ID = 'v-landscape'

/** Tile the landscape `copies` times so the view holds ~60 × copies objects. */
function tile(view: View, copies: number): View {
  if (copies <= 1) return view
  const width = Math.max(...view.nodes.filter((n) => !n.parent).map((n) => n.bounds.x + n.bounds.width)) + 80
  const height = Math.max(...view.nodes.filter((n) => !n.parent).map((n) => n.bounds.y + n.bounds.height)) + 80
  const cols = Math.ceil(Math.sqrt(copies))
  const nodes: ViewNode[] = []
  const connections: View['connections'] = []
  for (let c = 0; c < copies; c++) {
    const dx = (c % cols) * width
    const dy = Math.floor(c / cols) * height
    const p = (id: string) => (c === 0 ? id : `${id}~${c}`)
    for (const node of view.nodes) {
      const copy = { ...node, id: p(node.id), bounds: { ...node.bounds } }
      if (node.parent) copy.parent = p(node.parent)
      else copy.bounds = { ...node.bounds, x: node.bounds.x + dx, y: node.bounds.y + dy }
      nodes.push(copy)
    }
    for (const conn of view.connections) {
      connections.push({
        ...conn,
        id: p(conn.id),
        source: p(conn.source),
        target: p(conn.target),
        ...(conn.bendpoints ? { bendpoints: conn.bendpoints.map((b) => ({ x: b.x + dx, y: b.y + dy })) } : {}),
      })
    }
  }
  return { ...view, nodes, connections }
}

export function makeStore(copies: number): ModelStore {
  const result = importExchangeXml(xml, 'claims-platform.xml')
  if (!result.workspace) throw new Error('fixture failed to import')
  const workspace = result.workspace
  workspace.views = workspace.views.map((v) => (v.id === VIEW_ID ? tile(v, copies) : v))
  return new ModelStore(workspace)
}

export function params() {
  const q = new URLSearchParams(location.search)
  return { copies: Number(q.get('copies') ?? '1') || 1 }
}

/** What a node draws: label, colours, and whether it is a container-ish box. */
export function nodeLook(store: ModelStore, node: ViewNode) {
  switch (node.kind) {
    case 'element': {
      const element = store.element(node.element)
      const meta = element ? findElementType(element.type) : undefined
      const tokens = meta ? colourGroupTokens(meta.colourGroup) : { stroke: 'var(--bd2)', fill: 'var(--surface)' }
      return { label: element?.name ?? '?', code: meta?.code ?? '??', ...tokens }
    }
    case 'group':
      return { label: node.name, code: 'GR', stroke: 'var(--bd2)', fill: 'transparent' }
    case 'note':
      return { label: node.text, code: 'NT', stroke: 'var(--bd2)', fill: 'var(--surface)' }
    case 'view-ref':
      return { label: store.view(node.view)?.name ?? '?', code: 'VR', stroke: 'var(--bd2)', fill: 'var(--surface)' }
  }
}

/** Archi's ChopboxAnchor: where the line from the box centre toward `toward` exits the box. */
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

/** Full polyline of a connection in absolute coordinates, with Archi-style anchors. */
export function route(source: Bounds, target: Bounds, bendpoints: readonly Point[] = []): Point[] {
  const first = bendpoints[0] ?? centre(target)
  const last = bendpoints[bendpoints.length - 1] ?? centre(source)
  return [chopbox(source, first), ...bendpoints, chopbox(target, last)]
}

/** Absolute bounds of every node, computed once per view revision. */
export function absoluteIndex(view: View): Map<string, Bounds> {
  const out = new Map<string, Bounds>()
  for (const node of view.nodes) {
    const b = absoluteBounds(view, node.id)
    if (b) out.set(node.id, b)
  }
  return out
}

/** Index of the segment of `points` nearest to `p` — where a new bend-point goes. */
export function nearestSegment(points: readonly Point[], p: Point): number {
  let best = 0
  let bestD = Infinity
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!
    const b = points[i + 1]!
    const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2
    const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2))
    const d = (p.x - a.x - t * (b.x - a.x)) ** 2 + (p.y - a.y - t * (b.y - a.y)) ** 2
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  return best
}

export const GRID = 12
export const snap = (v: number) => Math.round(v / GRID) * GRID

/** Hooks for the measurement script. */
declare global {
  interface Window {
    __spike?: {
      engine: string
      store: ModelStore
      objects: number
      /** ms since navigation start until the view is painted. */
      firstPaintMs?: number
      /** ms from handing the store to the engine until paint. */
      mountMs?: number
      /** Total undo steps — a drag must add exactly one. */
      undoDepth: () => number
    }
  }
}

export function expose(engine: string, store: ModelStore, t0: number) {
  const view = store.view(VIEW_ID)!
  window.__spike = {
    engine,
    store,
    objects: view.nodes.length + view.connections.length,
    undoDepth: () => store.history.length,
  }
  // Two rAFs: the first fires before paint, the second after it.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      window.__spike!.firstPaintMs = performance.now()
      window.__spike!.mountMs = performance.now() - t0
    }),
  )
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
      e.preventDefault()
      if (e.shiftKey) store.redo()
      else store.undo()
    }
  })
}

export function subtree(view: View, id: string): Set<string> {
  const out = new Set([id])
  let grew = true
  while (grew) {
    grew = false
    for (const n of view.nodes)
      if (n.parent && out.has(n.parent) && !out.has(n.id)) (out.add(n.id), (grew = true))
  }
  return out
}

/**
 * Commit a node drag as ONE command: snap, and re-parent to the smallest box
 * under the node's centre (drag in and out of containers). Shared so every
 * candidate is measured on the same edit semantics.
 */
export function commitDrop(store: ModelStore, id: string, dx: number, dy: number) {
  const view = store.view(VIEW_ID)!
  const abs = absoluteIndex(view)
  const inside = subtree(view, id)
  const node = view.nodes.find((n) => n.id === id)!
  const from = abs.get(id)!
  const cx = from.x + dx + from.width / 2
  const cy = from.y + dy + from.height / 2
  let parent: ViewNode | undefined
  let area = Infinity
  for (const n of view.nodes) {
    if (inside.has(n.id) || n.kind === 'note') continue
    const b = abs.get(n.id)!
    if (cx > b.x && cx < b.x + b.width && cy > b.y && cy < b.y + b.height && b.width * b.height < area) {
      parent = n
      area = b.width * b.height
    }
  }
  const origin = parent ? abs.get(parent.id)! : { x: 0, y: 0 }
  const bounds = { ...node.bounds, x: snap(from.x + dx - origin.x), y: snap(from.y + dy - origin.y) }
  store.updateNode(VIEW_ID, id, (n) => {
    const next = { ...n, bounds }
    if (parent) next.parent = parent.id
    else delete next.parent
    return next
  })
}

export function insertBendpoint(store: ModelStore, connId: string, points: readonly Point[], p: Point) {
  const at = nearestSegment(points, p) // segment i runs into bend-point i
  store.updateConnection(VIEW_ID, connId, (c) => {
    const bp = [...(c.bendpoints ?? [])]
    bp.splice(at, 0, { x: snap(p.x), y: snap(p.y) })
    return { ...c, bendpoints: bp }
  })
}

export function moveBendpoint(store: ModelStore, connId: string, index: number, at: Point) {
  store.updateConnection(VIEW_ID, connId, (c) => {
    const bp = [...(c.bendpoints ?? [])]
    bp[index] = at
    return { ...c, bendpoints: bp }
  })
}
