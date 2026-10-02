/**
 * Candidate B — a custom SVG editor over our own model. The store is the only
 * state; a gesture keeps a transient offset in React state and commits one
 * `update-view` command on pointer-up.
 */
import { memo, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { ModelStore } from '@/store'
import type { Bounds, Point, View, ViewNode } from '@/model'
import { VIEW_ID, absoluteIndex, commitDrop, subtree, nearestSegment, nodeLook, route, snap } from './shared'

type Gesture =
  | { kind: 'node'; id: string; start: Point; dx: number; dy: number; subtree: Set<string> }
  | { kind: 'bend'; conn: string; index: number; start: Point; at: Point }
  | { kind: 'pan'; start: Point; origin: Point }

export function CustomEditor({ store }: { store: ModelStore }) {
  useSyncExternalStore(
    (l) => store.subscribe(l),
    () => store.version,
  )
  const view = store.view(VIEW_ID)!
  const abs = useMemo(() => absoluteIndex(view), [view])
  const children = useMemo(() => {
    const map = new Map<string | undefined, ViewNode[]>()
    for (const n of view.nodes) map.set(n.parent, [...(map.get(n.parent) ?? []), n])
    return map
  }, [view])
  const [gesture, setGesture] = useState<Gesture | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [pan, setPan] = useState<Point>({ x: 20, y: 20 })
  const [zoom, setZoom] = useState(1)
  const svg = useRef<SVGSVGElement>(null)

  const toModel = (e: { clientX: number; clientY: number }): Point => {
    const r = svg.current!.getBoundingClientRect()
    return { x: (e.clientX - r.left - pan.x) / zoom, y: (e.clientY - r.top - pan.y) / zoom }
  }

  const subtreeOf = (id: string) => subtree(view, id)

  const onNodeDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation()
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    setSelected(id)
    setGesture({ kind: 'node', id, start: toModel(e), dx: 0, dy: 0, subtree: subtreeOf(id) })
  }

  const onMove = (e: React.PointerEvent) => {
    if (!gesture) return
    if (gesture.kind === 'pan') {
      setPan({ x: gesture.origin.x + e.clientX - gesture.start.x, y: gesture.origin.y + e.clientY - gesture.start.y })
      return
    }
    const p = toModel(e)
    if (gesture.kind === 'node') setGesture({ ...gesture, dx: p.x - gesture.start.x, dy: p.y - gesture.start.y })
    else setGesture({ ...gesture, at: { x: snap(p.x), y: snap(p.y) } })
  }

  const onUp = () => {
    if (!gesture) return
    setGesture(null)
    if (gesture.kind === 'node' && (gesture.dx !== 0 || gesture.dy !== 0)) commitMove(gesture)
    if (gesture.kind === 'bend') {
      store.updateConnection(VIEW_ID, gesture.conn, (c) => {
        const bendpoints = [...(c.bendpoints ?? [])]
        bendpoints[gesture.index] = gesture.at
        return { ...c, bendpoints }
      })
    }
  }

  const commitMove = (g: Extract<Gesture, { kind: 'node' }>) => commitDrop(store, g.id, g.dx, g.dy)

  const offsetOf = (id: string): Point | undefined =>
    gesture?.kind === 'node' && gesture.subtree.has(id) ? { x: gesture.dx, y: gesture.dy } : undefined

  const boxAt = (id: string): Bounds => {
    const b = abs.get(id)!
    const o = offsetOf(id)
    return o ? { ...b, x: b.x + o.x, y: b.y + o.y } : b
  }

  return (
    <svg
      ref={svg}
      className="spike-canvas"
      data-testid="canvas"
      onPointerDown={(e) => {
        setSelected(null)
        setGesture({ kind: 'pan', start: { x: e.clientX, y: e.clientY }, origin: pan })
      }}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onWheel={(e) => setZoom((z) => Math.min(3, Math.max(0.2, z * (e.deltaY < 0 ? 1.1 : 0.9))))}
    >
      <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
        {(children.get(undefined) ?? []).map((n) => (
          <NodeTree
            key={n.id}
            node={n}
            store={store}
            children={children}
            selected={selected}
            dragging={
              gesture?.kind === 'node' && (gesture.id === n.id || containsDeep(children, n.id, gesture.id))
                ? gesture
                : null
            }
            onDown={onNodeDown}
          />
        ))}
        {view.connections.map((c) => {
          const bend = c.bendpoints ?? []
          const live =
            gesture?.kind === 'bend' && gesture.conn === c.id
              ? bend.map((b, i) => (i === gesture.index ? gesture.at : b))
              : bend
          const points = route(boxAt(c.source), boxAt(c.target), live)
          const d = points.map((p) => `${p.x},${p.y}`).join(' ')
          const isSel = selected === c.id
          return (
            <g key={c.id} data-conn={c.id}>
              <polyline points={d} fill="none" stroke="var(--ink)" strokeWidth={1} markerEnd="url(#arrow)" />
              <polyline
                points={d}
                fill="none"
                stroke="transparent"
                strokeWidth={10}
                onPointerDown={(e) => {
                  e.stopPropagation()
                  setSelected(c.id)
                }}
                onDoubleClick={(e) => {
                  const p = toModel(e)
                  const at = nearestSegment(points, p) // segment i sits before bend-point i
                  store.updateConnection(VIEW_ID, c.id, (cc) => {
                    const bp = [...(cc.bendpoints ?? [])]
                    bp.splice(at, 0, { x: snap(p.x), y: snap(p.y) })
                    return { ...cc, bendpoints: bp }
                  })
                  setSelected(c.id)
                }}
              />
              {isSel &&
                live.map((b, i) => (
                  <rect
                    key={i}
                    data-bend={i}
                    x={b.x - 4}
                    y={b.y - 4}
                    width={8}
                    height={8}
                    fill="var(--accent)"
                    onPointerDown={(e) => {
                      e.stopPropagation()
                      setGesture({ kind: 'bend', conn: c.id, index: i, start: toModel(e), at: b })
                    }}
                  />
                ))}
            </g>
          )
        })}
      </g>
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto">
          <path d="M0,0 L10,5 L0,10" fill="none" stroke="var(--ink)" />
        </marker>
      </defs>
    </svg>
  )
}

type TreeProps = {
  node: ViewNode
  store: ModelStore
  children: Map<string | undefined, ViewNode[]>
  selected: string | null
  dragging: { id: string; dx: number; dy: number } | null
  onDown: (e: React.PointerEvent, id: string) => void
}

/** A node and its nested children, positioned relative to the parent — so a drag moves one transform. */
const NodeTree = memo(function NodeTree({ node, store, children, selected, dragging, onDown }: TreeProps) {
  const look = nodeLook(store, node)
  const { x, y, width, height } = node.bounds
  const offset = dragging?.id === node.id ? dragging : { dx: 0, dy: 0 }
  // Only the dragged node needs its subtree re-rendered; others get a stable null.
  const childFor = (c: ViewNode) =>
    dragging && (dragging.id === c.id || containsDeep(children, c.id, dragging.id)) ? dragging : null
  return (
    <g transform={`translate(${x + offset.dx} ${y + offset.dy})`} data-node={node.id}>
      <rect
        width={width}
        height={height}
        fill={look.fill}
        stroke={selected === node.id ? 'var(--accent)' : look.stroke}
        strokeDasharray={node.kind === 'group' ? '4 2' : undefined}
        onPointerDown={(e) => onDown(e, node.id)}
      />
      <text x={6} y={14} className="spike-label" pointerEvents="none">
        {look.label}
      </text>
      <text x={width - 6} y={14} textAnchor="end" className="spike-code" pointerEvents="none">
        {look.code}
      </text>
      {(children.get(node.id) ?? []).map((c) => (
        <NodeTree
          key={c.id}
          node={c}
          store={store}
          children={children}
          selected={selected}
          dragging={childFor(c)}
          onDown={onDown}
        />
      ))}
    </g>
  )
})

function containsDeep(children: Map<string | undefined, ViewNode[]>, root: string, id: string): boolean {
  for (const c of children.get(root) ?? []) if (c.id === id || containsDeep(children, c.id, id)) return true
  return false
}

export type { View }
