import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Background,
  Controls,
  ReactFlow,
  MarkerType,
  ReactFlowProvider,
  ViewportPortal,
  useReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  isPastEndOfLife,
  lifecycleYearRange,
  relationshipTypeMeta,
  startOfYear,
  type Element,
  type Relationship,
} from '@/model'
import { useModelSelector } from '@/store'
import { BANDS, BAND_LABELS, BAND_TINTS, type Band } from './bands'
import { COLOUR_VIEWS, COLOUR_VIEW_LABELS, colourOf, legendFor, subLabelOf } from './colouring'
import { GraphNode, type GraphNodeData } from './GraphNode'
import { NODE_HEIGHT, NODE_WIDTH, runLayout, type LayoutResult } from './layout'
import { shapeKeyOf } from './shape-key'
import { ReportChrome } from './ReportChrome'
import { TracePanel } from './TracePanel'
import {
  DIMMED_EDGE_OPACITY,
  DIMMED_NODE_OPACITY,
  PAST_EOL_OPACITY,
  traceFrom,
  tracedDependencies,
} from './trace'
import { downloadGraphSvg, type ExportEdge, type ExportNode } from './export-svg'
import { useGraphState } from './use-graph-state'
import './graph.css'

/**
 * The dependency graph (handoff "Screen 3").
 *
 * See how the landscape hangs together, and trace what one element touches.
 * Layout is ELK `layered` with the three bands as partitions, computed in a
 * worker; colour, time point and focus are URL state so a traced view is a link.
 */

const nodeTypes = { archimate: GraphNode }

export function GraphScreen() {
  return (
    <ReactFlowProvider>
      <GraphCanvas />
    </ReactFlowProvider>
  )
}

function GraphCanvas() {
  const navigate = useNavigate()
  const flow = useReactFlow()
  const model = useModelSelector((store) => ({
    elements: store.elementList(),
    relationships: store.relationshipList(),
    completeness: (id: string) => store.completeness(id),
    element: (id: string) => store.element(id),
  }))

  const thisYear = new Date().getFullYear()
  const range = useMemo(
    () => lifecycleYearRange(model.elements.map((element) => element.profile?.lifecycle)),
    [model.elements],
  )
  const min = Math.min(range?.min ?? thisYear - 10, thisYear - 10)
  const max = Math.max(range?.max ?? thisYear + 10, thisYear + 10)
  // The slider's range is also the only range a time point may take: a `?year=`
  // outside it is not a view of anything.
  const bounds = useMemo(() => ({ min, max }), [min, max])

  const state = useGraphState(thisYear, bounds)
  const [layout, setLayout] = useState<LayoutResult | undefined>(undefined)
  const [laying, setLaying] = useState(false)
  const [layoutError, setLayoutError] = useState<string | undefined>(undefined)
  const [retry, setRetry] = useState(0)
  const requestId = useRef(0)

  // Re-lay out only when the graph's *shape* changes — not when a colour view or
  // the time slider does. Layout is the expensive half; recolouring is free.
  const shapeKey = useMemo(
    () => shapeKeyOf(model.elements, model.relationships),
    [model.elements, model.relationships],
  )

  useEffect(() => {
    const id = ++requestId.current
    let cancelled = false
    setLaying(true)
    setLayoutError(undefined)
    void runLayout(model.elements, model.relationships)
      .then((result) => {
        // Layout is slower than a navigation: without both guards a result can
        // land after the screen has gone, and React Flow then reaches for a
        // window that no longer exists.
        if (cancelled || requestId.current !== id) return
        setLayout(result)
        setLaying(false)
      })
      .catch((error: unknown) => {
        // Without this the screen sat on "laying out…" forever with no nodes and
        // no empty state, and the rejection went nowhere. It is reachable: the
        // main-thread fallback is a dynamic import of the ~1.4MB ELK chunk, and a
        // tab loaded before a Pages redeploy asks for a hashed chunk that 404s.
        if (cancelled || requestId.current !== id) return
        setLaying(false)
        setLayoutError(error instanceof Error ? error.message : String(error))
      })
    return () => {
      cancelled = true
    }
    // shapeKey stands in for the element and relationship lists.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shapeKey, retry])

  const at = startOfYear(state.year)

  // One reading of "is anything focused", shared by the trace, the panel, the
  // CLEAR button and the fit. `traceFrom` used to take the raw `?focus=` while
  // the panel was gated on the element existing, so an id this workspace does not
  // contain — a stale bookmark, a re-import with regenerated ids — dimmed all 29
  // nodes to 0.16 with no panel, no CLEAR, and a hint denying anything was
  // traced. `fitView` then matched no nodes and divided by a zero-width box.
  const focused = state.focus ? model.element(state.focus) : undefined
  const focus = focused?.id

  const trace = useMemo(
    () => (focus ? traceFrom(focus, model.relationships) : undefined),
    [focus, model.relationships],
  )

  const { nodes, edges, exportNodes, exportEdges } = useMemo(
    () => buildView(model.elements, model.relationships, layout, state, at, trace),
    [model.elements, model.relationships, layout, state, at, trace],
  )

  // Bring the trace into view: focusing a node that has scrolled off screen, or
  // that the side panel has just covered, is the difference between tracing and
  // hunting for what you traced.
  useEffect(() => {
    if (!layout || !trace) return
    void flow.fitView({
      nodes: [...trace.lit].map((id) => ({ id })),
      padding: 0.35,
      duration: 0,
      maxZoom: 1.2,
    })
    // Re-running on `trace` alone would refit whenever the model changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, layout])

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => state.toggleFocus(node.id),
    [state],
  )

  const stats = `${model.elements.length} nodes · ${model.relationships.length} relations · time point ${state.year}`

  return (
    <div className="graph">
      <ReportChrome
        title="Dependency graph"
        stats={laying ? `${stats} · laying out…` : stats}
        colourViews={COLOUR_VIEWS.map((key) => ({ key, label: COLOUR_VIEW_LABELS[key] }))}
        activeColourView={state.colourView}
        onColourViewChange={(key) => state.setColourView(key as (typeof COLOUR_VIEWS)[number])}
        timePoint={{ value: state.year, min, max, today: thisYear }}
        onTimePointChange={state.setYear}
        legend={legendFor(state.colourView)}
        // `buildView` returns empty arrays until the layout lands, and nothing
        // stopped the click: on a model big enough for ELK to take a few seconds
        // you got `dependency-graph.svg`, downloaded successfully, headed "29
        // nodes · 47 relations", containing none of them.
        exportDisabledReason={
          layoutError
            ? 'Nothing to export — the layout failed'
            : laying || !layout
              ? 'Wait for the layout to finish'
              : undefined
        }
        onExport={() =>
          downloadGraphSvg({
            title: 'Dependency graph',
            stats,
            nodes: exportNodes,
            edges: exportEdges,
            bands: exportBands(layout),
            width: layout?.width ?? 0,
            height: layout?.height ?? 0,
          })
        }
      />

      <div className={`graph__body${focused ? ' graph__body--focused' : ''}`}>
        <div className="graph__canvas">
          {model.elements.length === 0 ? (
            // #29 adds the first-run screen, so an empty workspace never gets
            // this far by accident and needs no "load a model" hint here.
            <p className="graph__empty">This workspace has no elements to draw.</p>
          ) : layoutError ? (
            <p className="graph__empty" role="alert">
              The layout could not be computed, so there is nothing to draw.
              <br />
              <span className="graph__empty-detail">{layoutError}</span>
              <br />
              <button type="button" className="button" onClick={() => setRetry((n) => n + 1)}>
                Try again
              </button>
            </p>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodeClick={onNodeClick}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={false}
              proOptions={{ hideAttribution: true }}
              fitView
              minZoom={0.2}
              maxZoom={2}
            >
              <Background gap={0} color="transparent" />
              <Controls showInteractive={false} />
              {layout && <BandRects layout={layout} />}
            </ReactFlow>
          )}

          <div className="graph__hint">
            {focused ? (
              <>
                Tracing {focused.name}
                <button
                  type="button"
                  className="graph__hint-clear"
                  onClick={() => state.setFocus(undefined)}
                >
                  CLEAR
                </button>
              </>
            ) : (
              'Click a node to trace its dependencies'
            )}
          </div>
        </div>

        {focused && (
          <TracePanel
            element={focused}
            completeness={model.completeness(focused.id)}
            year={state.year}
            dependencies={tracedDependencies(focused.id, model.relationships)}
            elementById={model.element}
            onRefocus={(id) => state.setFocus(id)}
            onOpenFactSheet={(id) => navigate(`/element/${id}`)}
            onClose={() => state.setFocus(undefined)}
          />
        )}
      </div>
    </div>
  )
}

/**
 * The dashed band rectangles.
 *
 * They go through `ViewportPortal` so they live *inside* React Flow's pan and
 * zoom transform — a band drawn in screen coordinates would slide out of
 * alignment with its own nodes the moment anyone scrolled.
 */
function BandRects({ layout }: { layout: LayoutResult }) {
  return (
    <ViewportPortal>
      {BANDS.map((band) => {
        const rect = layout.bands[band]
        if (!rect) return null
        return (
          <div
            key={band}
            className="graph__band"
            style={{
              top: rect.y,
              height: rect.height,
              width: layout.width + 32,
              left: -16,
              background: `color-mix(in oklab, ${BAND_TINTS[band]} 4%, transparent)`,
            }}
          >
            <span className="graph__band-label">{BAND_LABELS[band]}</span>
          </div>
        )
      })}
    </ViewportPortal>
  )
}

/** Drop the undefined entries so the export type stays exactOptionalProperty-clean. */
function exportBands(
  layout: LayoutResult | undefined,
): Partial<Record<Band, { y: number; height: number }>> {
  const out: Partial<Record<Band, { y: number; height: number }>> = {}
  for (const band of BANDS) {
    const rect = layout?.bands[band]
    if (rect) out[band] = rect
  }
  return out
}

interface BuiltView {
  nodes: Node[]
  edges: Edge[]
  exportNodes: ExportNode[]
  exportEdges: ExportEdge[]
}

function buildView(
  elements: readonly Element[],
  relationships: readonly Relationship[],
  layout: LayoutResult | undefined,
  state: { colourView: 'layer' | 'lifecycle' | 'time'; focus: string | undefined },
  at: number,
  trace: { lit: Set<string>; incident: Set<string> } | undefined,
): BuiltView {
  if (!layout) return { nodes: [], edges: [], exportNodes: [], exportEdges: [] }

  const nodes: Node[] = []
  const exportNodes: ExportNode[] = []
  const centres = new Map<string, { x: number; y: number }>()

  for (const element of elements) {
    const placed = layout.nodes.get(element.id)
    if (!placed) continue
    const { stroke, fill } = colourOf(element, state.colourView, at)
    const pastEol = isPastEndOfLife(element.profile?.lifecycle, at)
    const dimmed = Boolean(trace) && !trace!.lit.has(element.id)
    const opacity = dimmed ? DIMMED_NODE_OPACITY : pastEol ? PAST_EOL_OPACITY : 1

    const data: GraphNodeData = {
      name: element.name,
      subLabel: subLabelOf(element, at),
      stroke,
      fill,
      focused: state.focus === element.id,
      dimmed,
      pastEol,
      opacity,
    }

    nodes.push({
      id: element.id,
      type: 'archimate',
      position: { x: placed.x, y: placed.y },
      data,
      draggable: false,
    })
    centres.set(element.id, { x: placed.x + NODE_WIDTH / 2, y: placed.y + NODE_HEIGHT / 2 })
    exportNodes.push({
      id: element.id,
      x: placed.x,
      y: placed.y,
      name: element.name,
      subLabel: data.subLabel,
      stroke,
      fill,
      opacity,
      pastEol,
    })
  }

  const edges: Edge[] = []
  const exportEdges: ExportEdge[] = []

  for (const relationship of relationships) {
    if (!centres.has(relationship.source) || !centres.has(relationship.target)) continue
    const meta = relationshipTypeMeta(relationship.type)
    const incident = trace?.incident.has(relationship.id) ?? false
    const opacity = trace ? (incident ? 1 : DIMMED_EDGE_OPACITY) : 0.62
    const stroke = incident ? 'var(--accent)' : 'var(--bd2)'
    const width = incident ? 1.6 : 1
    // Same-band edges curve, cross-band edges run straight — the handoff's rule,
    // and the reason is legibility: two nodes side by side in one band are joined
    // by a line that would otherwise lie along the row, through whatever sits
    // between them.
    const sameBand =
      layout.nodes.get(relationship.source)?.band === layout.nodes.get(relationship.target)?.band

    edges.push({
      id: relationship.id,
      source: relationship.source,
      target: relationship.target,
      type: sameBand ? 'default' : 'straight',
      // In a *dependency* graph the direction is the information: without a head
      // you cannot tell whether A serves B or B serves A. The handoff specifies
      // it twice, for the base and the accent state.
      markerEnd: { type: MarkerType.ArrowClosed, color: stroke, width: 14, height: 14 },
      style: {
        stroke,
        strokeWidth: width,
        opacity,
        ...(meta.notation === 'dashed' ? { strokeDasharray: '4 3' } : {}),
      },
    })

    exportEdges.push({
      id: relationship.id,
      from: centres.get(relationship.source)!,
      to: centres.get(relationship.target)!,
      stroke,
      width,
      opacity,
      dashed: meta.notation === 'dashed',
      curved: sameBand,
    })
  }

  return { nodes, edges, exportNodes, exportEdges }
}
