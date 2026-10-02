/**
 * Candidate A — React Flow, extended. RF holds a working copy of node positions
 * (it must, to drag); the store stays the source of truth: the copy is rebuilt
 * from the store on every model version and a drag commits one command on stop.
 */
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Handle,
  Position,
  applyNodeChanges,
  useInternalNode,
  useReactFlow,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeChange,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { ModelStore } from '@/store'
import type { Bounds, Point } from '@/model'
import { VIEW_ID, commitDrop, insertBendpoint, moveBendpoint, nodeLook, route, snap } from './shared'

type BoxData = { label: string; code: string; stroke: string; fill: string; group: boolean }
type ConnData = { bendpoints: Point[] }

function Box({ data, width, height, selected }: NodeProps<Node<BoxData>>) {
  // RF will not create an edge without handles, though Conn ignores their geometry.
  return (
    <>
    <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
    <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    <svg width={width} height={height} style={{ overflow: 'visible', display: 'block' }}>
      <rect
        width={width}
        height={height}
        fill={data.fill}
        stroke={selected ? 'var(--accent)' : data.stroke}
        strokeDasharray={data.group ? '4 2' : undefined}
      />
      <text x={6} y={14} className="spike-label">
        {data.label}
      </text>
      <text x={(width ?? 0) - 6} y={14} textAnchor="end" className="spike-code">
        {data.code}
      </text>
    </svg>
    </>
  )
}

let storeRef: ModelStore

function boundsOf(n: ReturnType<typeof useInternalNode>): Bounds | undefined {
  if (!n) return undefined
  const p = n.internals.positionAbsolute
  return { x: p.x, y: p.y, width: n.measured.width ?? n.width ?? 0, height: n.measured.height ?? n.height ?? 0 }
}

/** Polyline through our bend-points with Archi chopbox anchors — RF's handles are not used for geometry. */
function Conn({ id, source, target, data, selected }: EdgeProps<Edge<ConnData>>) {
  const s = boundsOf(useInternalNode(source))
  const t = boundsOf(useInternalNode(target))
  const flow = useReactFlow()
  const [drag, setDrag] = useState<{ index: number; at: Point } | null>(null)
  if (!s || !t) return null
  const bend = (data?.bendpoints ?? []).map((b, i) => (drag?.index === i ? drag.at : b))
  const points = route(s, t, bend)
  const d = points.map((p) => `${p.x},${p.y}`).join(' ')
  return (
    <g>
      <polyline points={d} fill="none" stroke="var(--ink)" markerEnd="url(#arrow)" />
      <polyline
        className="react-flow__edge-interaction"
        points={d}
        fill="none"
        stroke="transparent"
        strokeWidth={10}
        onDoubleClick={(e) => insertBendpoint(storeRef, id, points, flow.screenToFlowPosition({ x: e.clientX, y: e.clientY }))}
      />
      {selected &&
        bend.map((b, i) => (
          <rect
            key={i}
            data-bend={i}
            className="nodrag nopan"
            x={b.x - 4}
            y={b.y - 4}
            width={8}
            height={8}
            fill="var(--accent)"
            style={{ pointerEvents: 'all' }}
            onPointerDown={(e) => {
              e.stopPropagation()
              ;(e.target as Element).setPointerCapture(e.pointerId)
              setDrag({ index: i, at: b })
            }}
            onPointerMove={(e) => {
              if (!drag) return
              const p = flow.screenToFlowPosition({ x: e.clientX, y: e.clientY })
              setDrag({ index: i, at: { x: snap(p.x), y: snap(p.y) } })
            }}
            onPointerUp={() => {
              if (drag) moveBendpoint(storeRef, id, drag.index, drag.at)
              setDrag(null)
            }}
          />
        ))}
    </g>
  )
}

const nodeTypes = { box: Box }
const edgeTypes = { conn: Conn }

function Canvas({ store }: { store: ModelStore }) {
  storeRef = store
  const version = useSyncExternalStore(
    (l) => store.subscribe(l),
    () => store.version,
  )
  const view = store.view(VIEW_ID)!
  const fromStore = useMemo<Node<BoxData>[]>(
    () =>
      // RF requires parents before children; our import already writes them in that order.
      view.nodes.map((n) => {
        const look = nodeLook(store, n)
        return {
          id: n.id,
          type: 'box',
          position: { x: n.bounds.x, y: n.bounds.y },
          width: n.bounds.width,
          height: n.bounds.height,
          ...(n.parent ? { parentId: n.parent } : {}),
          data: { ...look, group: n.kind === 'group' },
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  )
  const edges = useMemo<Edge<ConnData>[]>(
    () =>
      view.connections.map((c) => ({
        id: c.id,
        source: c.source,
        target: c.target,
        type: 'conn',
        zIndex: 10000,
        data: { bendpoints: c.bendpoints ?? [] },
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  )
  const [nodes, setNodes] = useState(fromStore)
  useEffect(() => setNodes(fromStore), [fromStore])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={(changes: NodeChange<Node<BoxData>>[]) => setNodes((ns) => applyNodeChanges(changes, ns))}
      onNodeDragStop={(_, node) => {
        const original = view.nodes.find((n) => n.id === node.id)!
        commitDrop(store, node.id, node.position.x - original.bounds.x, node.position.y - original.bounds.y)
      }}
      snapToGrid={false}
      minZoom={0.2}
      defaultViewport={{ x: 20, y: 20, zoom: 1 }}
      nodesConnectable={false}
      zoomOnDoubleClick={false}
      proOptions={{ hideAttribution: false }}
      data-testid="canvas"
    >
      <svg>
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto">
            <path d="M0,0 L10,5 L0,10" fill="none" stroke="var(--ink)" />
          </marker>
        </defs>
      </svg>
    </ReactFlow>
  )
}

export function ReactFlowEditor({ store }: { store: ModelStore }) {
  return (
    <ReactFlowProvider>
      <Canvas store={store} />
    </ReactFlowProvider>
  )
}
