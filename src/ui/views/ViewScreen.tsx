import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { typeLabel, type Point, type View, type ViewNode } from '@/model'
import { downloadBlob, downloadText } from '@/io'
import { useModelStore, useModelVersion, type ModelStore } from '@/store'
import { TypeCodeBadge } from '@/ui/common/TypeCodeBadge'
import { ViewDrawing, type DrawingLookups } from './ViewDrawing'
import { Minimap } from './Minimap'
import {
  absoluteIndex,
  centreOn,
  childrenIndex,
  drawingBounds,
  fitViewport,
  zoomAround,
  type Viewport,
} from './geometry'
import { buildViewSvg, rasterise, viewFileName } from './export-view'
import './views.css'

/**
 * A hand-drawn view, read-only (#79): the drawing exactly as it was made, with
 * zoom, pan, fit, an outline, selection with a summary panel, and SVG/PNG
 * export. Editing is phase M2, on the same drawing (ADR 0006).
 *
 * Keyed on the view id by the route (CLAUDE.md), so viewport and selection never
 * carry over from one view to the next.
 */
export function ViewScreen() {
  const { id = '' } = useParams()
  const store = useModelStore()
  useModelVersion()
  const view = store.view(id)
  if (!view) {
    return (
      <div className="view-screen view-screen--missing">
        <p role="alert" className="view-screen__notice">
          There is no view with the id <code>{id}</code> in this workspace.
        </p>
        <p className="view-screen__notice">Open a view from the model tree.</p>
      </div>
    )
  }
  return <ViewCanvas view={view} store={store} />
}

/** Movement below this many pixels is a click, not a pan. */
const CLICK_SLOP = 3
const ZOOM_STEP = 1.2

function ViewCanvas({ view, store }: { view: View; store: ModelStore }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const bounds = useMemo(() => absoluteIndex(view), [view])
  const children = useMemo(() => childrenIndex(view), [view])
  const drawing = useMemo(() => drawingBounds(view, bounds), [view, bounds])
  const lookups = useMemo<DrawingLookups>(
    () => ({
      element: (elementId) => store.element(elementId),
      relationship: (relationshipId) => {
        const relationship = store.relationship(relationshipId)
        if (!relationship) return undefined
        return {
          type: relationship.type,
          ...(relationship.name ? { name: relationship.name } : {}),
          ...(relationship.profile?.accessType
            ? { accessType: relationship.profile.accessType }
            : {}),
        }
      },
      viewName: (viewId) => store.view(viewId)?.name,
    }),
    // A new view object means the model changed; the lookups read the store live.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, view],
  )

  const canvas = useRef<HTMLDivElement>(null)
  const drawingRef = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [viewport, setViewport] = useState<Viewport | null>(null)
  const requested = params.get('element')
  const [selected, setSelected] = useState<string | null>(() =>
    requested
      ? (view.nodes.find((n) => n.kind === 'element' && n.element === requested)?.id ?? null)
      : null,
  )
  const [exportError, setExportError] = useState<string | null>(null)

  /**
   * Selection is mirrored into `?element=` so the model tree (#80), which reads
   * the URL, highlights the element selected here. `replace`: a click on a shape
   * is not a step Back should rewind.
   */
  const select = useCallback(
    (nodeId: string | null) => {
      setSelected(nodeId)
      const node = nodeId === null ? undefined : view.nodes.find((n) => n.id === nodeId)
      const element = node?.kind === 'element' ? node.element : null
      if (params.get('element') === element) return
      setParams(
        (current) => {
          const next = new URLSearchParams(current)
          if (element === null) next.delete('element')
          else next.set('element', element)
          return next
        },
        { replace: true },
      )
    },
    [view, params, setParams],
  )

  useLayoutEffect(() => {
    const el = canvas.current
    if (!el) return
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  /**
   * Until the user pans or zooms, the viewport follows the canvas size: the first
   * measurement can come before the layout settles, and a window resize should
   * keep a fitted drawing fitted. Any gesture hands control to the user; Fit
   * hands it back.
   */
  const auto = useRef(true)
  const [initialTarget] = useState(() => (requested ? selected : null))
  const steer = useCallback((next: Viewport | ((current: Viewport | null) => Viewport)) => {
    auto.current = false
    setViewport(next)
  }, [])

  const fit = useCallback(() => {
    auto.current = true
    setViewport(fitViewport(drawing, size.width, size.height))
  }, [drawing, size.width, size.height])

  // Fit the drawing, or centre on the element the link asked for.
  useEffect(() => {
    if (!auto.current || size.width === 0 || size.height === 0) return
    const fitted = fitViewport(drawing, size.width, size.height)
    const target = initialTarget ? bounds.get(initialTarget) : undefined
    if (target) {
      setViewport(
        centreOn(
          { ...fitted, zoom: Math.max(fitted.zoom, 1) },
          { x: target.x + target.width / 2, y: target.y + target.height / 2 },
          size.width,
          size.height,
        ),
      )
    } else setViewport(fitted)
  }, [size, drawing, bounds, initialTarget])

  /**
   * The other direction: the tree selects an element by rewriting `?element=`.
   * Select its first drawing, and bring it on screen if it is not — without
   * touching a zoom the user chose.
   */
  useEffect(() => {
    if (!requested) return
    const current = selected === null ? undefined : view.nodes.find((n) => n.id === selected)
    if (current?.kind === 'element' && current.element === requested) return
    const node = view.nodes.find((n) => n.kind === 'element' && n.element === requested)
    if (!node) return
    setSelected(node.id)
    const target = bounds.get(node.id)
    if (!target || !viewport || size.width === 0) return
    const left = target.x * viewport.zoom + viewport.x
    const top = target.y * viewport.zoom + viewport.y
    const onScreen =
      left >= 0 &&
      top >= 0 &&
      left + target.width * viewport.zoom <= size.width &&
      top + target.height * viewport.zoom <= size.height
    if (!onScreen) {
      steer(
        centreOn(
          viewport,
          { x: target.x + target.width / 2, y: target.y + target.height / 2 },
          size.width,
          size.height,
        ),
      )
    }
    // Only a change of the requested element moves the selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requested])

  // Ctrl/⌘ + wheel (and trackpad pinch) zooms about the pointer; a plain wheel
  // pans. The listener is native because React's wheel listener is passive and
  // cannot stop the page itself from scrolling or zooming.
  useEffect(() => {
    const el = canvas.current
    if (!el) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = el.getBoundingClientRect()
      steer((current) => {
        const vp = current ?? { x: 0, y: 0, zoom: 1 }
        if (event.ctrlKey || event.metaKey) {
          return zoomAround(vp, vp.zoom * Math.exp(-event.deltaY * 0.01), {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          })
        }
        return { ...vp, x: vp.x - event.deltaX, y: vp.y - event.deltaY }
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [steer])

  const gesture = useRef<{
    start: Point
    origin: Viewport
    node: string | null
    moved: boolean
  } | null>(null)
  const vp = viewport ?? { x: 0, y: 0, zoom: 1 }

  const nodeAt = (target: EventTarget | null) =>
    (target instanceof Element ? target.closest('[data-node]')?.getAttribute('data-node') : null) ??
    null

  const zoomBy = (factor: number) =>
    steer(zoomAround(vp, vp.zoom * factor, { x: size.width / 2, y: size.height / 2 }))

  const exportSvg = () => {
    const g = drawingRef.current?.querySelector<SVGGElement>('[data-view-drawing]')
    if (!g || !drawing) return
    downloadText(
      viewFileName(view.name, 'svg'),
      buildViewSvg(g, drawing, view.name).svg,
      'image/svg+xml',
    )
  }

  const exportPng = async () => {
    const g = drawingRef.current?.querySelector<SVGGElement>('[data-view-drawing]')
    if (!g || !drawing) return
    setExportError(null)
    try {
      downloadBlob(
        viewFileName(view.name, 'png'),
        await rasterise(buildViewSvg(g, drawing, view.name)),
      )
    } catch (error) {
      setExportError(error instanceof Error ? error.message : String(error))
    }
  }

  const selectedNode = selected ? view.nodes.find((n) => n.id === selected) : undefined
  const selectedBounds = selected ? bounds.get(selected) : undefined
  const empty = !drawing
  const stats = [
    `${view.nodes.length} nodes`,
    `${view.connections.length} connections`,
    ...(view.viewpoint ? [`viewpoint ${view.viewpoint}`] : []),
  ].join(' · ')

  return (
    <div className="view-screen">
      <header className="view-screen__bar">
        <div>
          <h1 className="view-screen__title">{view.name}</h1>
          <p className="view-screen__stats">{stats}</p>
        </div>
        <div className="view-screen__controls">
          <button type="button" className="button" onClick={fit} disabled={empty}>
            Fit
          </button>
          <button
            type="button"
            className="button"
            aria-label="Zoom out"
            onClick={() => zoomBy(1 / ZOOM_STEP)}
          >
            −
          </button>
          <span className="view-screen__zoom" aria-label="Zoom level">
            {Math.round(vp.zoom * 100)}%
          </span>
          <button
            type="button"
            className="button"
            aria-label="Zoom in"
            onClick={() => zoomBy(ZOOM_STEP)}
          >
            +
          </button>
          <span className="view-screen__divider" />
          <button
            type="button"
            className="button"
            onClick={exportSvg}
            disabled={empty}
            title={empty ? 'Nothing to export: the view is empty' : undefined}
          >
            Export SVG
          </button>
          <button
            type="button"
            className="button"
            onClick={() => void exportPng()}
            disabled={empty}
            title={empty ? 'Nothing to export: the view is empty' : undefined}
          >
            Export PNG
          </button>
        </div>
      </header>
      {exportError && (
        <p role="alert" className="view-screen__error">
          PNG export failed: {exportError}
        </p>
      )}

      <div className={`view-screen__body${selectedNode ? ' view-screen__body--panel' : ''}`}>
        <div
          ref={canvas}
          className="view-screen__canvas"
          tabIndex={0}
          aria-label={`View ${view.name}`}
          onKeyDown={(event) => {
            if (event.key === 'Escape') select(null)
          }}
          onPointerDown={(event) => {
            if (event.button !== 0) return
            gesture.current = {
              start: { x: event.clientX, y: event.clientY },
              origin: vp,
              node: nodeAt(event.target),
              moved: false,
            }
          }}
          onPointerMove={(event) => {
            const g = gesture.current
            if (!g) return
            const dx = event.clientX - g.start.x
            const dy = event.clientY - g.start.y
            if (!g.moved && Math.hypot(dx, dy) < CLICK_SLOP) return
            // Captured only once it is a drag: capturing on press would retarget
            // the click and double-click to the canvas, and lose the shape.
            if (!g.moved) event.currentTarget.setPointerCapture?.(event.pointerId)
            g.moved = true
            steer({ ...g.origin, x: g.origin.x + dx, y: g.origin.y + dy })
          }}
          onPointerUp={() => {
            const g = gesture.current
            gesture.current = null
            if (g && !g.moved) select(g.node)
          }}
          onDoubleClick={(event) => {
            const node = view.nodes.find((n) => n.id === nodeAt(event.target))
            if (node?.kind === 'view-ref' && store.view(node.view))
              navigate(`/view/${encodeURIComponent(node.view)}`)
          }}
        >
          {empty ? (
            <p className="view-screen__notice">This view is empty.</p>
          ) : (
            <svg ref={drawingRef} className="view-screen__svg" data-testid="view-canvas">
              <g transform={`translate(${vp.x} ${vp.y}) scale(${vp.zoom})`}>
                <ViewDrawing view={view} bounds={bounds} children={children} lookups={lookups} />
                {selectedBounds && (
                  <rect
                    className="view-screen__selection"
                    data-testid="selection"
                    x={selectedBounds.x - 2}
                    y={selectedBounds.y - 2}
                    width={selectedBounds.width + 4}
                    height={selectedBounds.height + 4}
                    vectorEffect="non-scaling-stroke"
                  />
                )}
              </g>
            </svg>
          )}
          {drawing && viewport && size.width > 0 && (
            <Minimap
              drawing={drawing}
              boxes={bounds.values()}
              viewport={viewport}
              screen={size}
              onCentre={(point) => steer(centreOn(vp, point, size.width, size.height))}
            />
          )}
        </div>
        {selectedNode && (
          <SelectionPanel node={selectedNode} store={store} onClose={() => select(null)} />
        )}
      </div>
    </div>
  )
}

function SelectionPanel({
  node,
  store,
  onClose,
}: {
  node: ViewNode
  store: ModelStore
  onClose: () => void
}) {
  const navigate = useNavigate()
  const close = (
    <button type="button" className="button" onClick={onClose}>
      Close
    </button>
  )

  if (node.kind === 'element') {
    const element = store.element(node.element)
    if (!element) {
      return (
        <aside className="view-panel" aria-label="Selection">
          <div className="view-panel__kind">Missing element</div>
          <p className="view-panel__text">
            This shape draws <code>{node.element}</code>, which is not in the model.
          </p>
          <div className="view-panel__actions">{close}</div>
        </aside>
      )
    }
    const relations = store.outgoing(element.id).length + store.incoming(element.id).length
    const views = store.viewsDrawing(element.id).length
    const documentation = element.documentation?.trim()
    return (
      <aside className="view-panel" aria-label={`Selected: ${element.name}`}>
        <div className="view-panel__head">
          <TypeCodeBadge type={element.type} size={22} />
          <div>
            <div className="view-panel__name">{element.name}</div>
            <div className="view-panel__type">{typeLabel(element.type)}</div>
          </div>
        </div>
        <div className="view-panel__stats">
          <div className="view-panel__stat">
            <div className="view-panel__stat-key">Relations</div>
            <div className="view-panel__stat-value">{relations}</div>
          </div>
          <div className="view-panel__stat">
            <div className="view-panel__stat-key">Views</div>
            <div className="view-panel__stat-value">{views}</div>
          </div>
        </div>
        {documentation ? (
          <p className="view-panel__text">
            {documentation.length > 280 ? `${documentation.slice(0, 280)}…` : documentation}
          </p>
        ) : (
          <p className="view-panel__text view-panel__text--empty">No documentation.</p>
        )}
        <div className="view-panel__actions">
          <button
            type="button"
            className="button button--primary"
            onClick={() => navigate(`/element/${encodeURIComponent(element.id)}`)}
          >
            Open fact sheet
          </button>
          {close}
        </div>
      </aside>
    )
  }

  if (node.kind === 'view-ref') {
    const target = store.view(node.view)
    return (
      <aside className="view-panel" aria-label="Selected view reference">
        <div className="view-panel__kind">View reference</div>
        <div className="view-panel__name">{target?.name ?? 'Missing view'}</div>
        <div className="view-panel__actions">
          {target && (
            <button
              type="button"
              className="button button--primary"
              onClick={() => navigate(`/view/${encodeURIComponent(target.id)}`)}
            >
              Open view
            </button>
          )}
          {close}
        </div>
      </aside>
    )
  }

  return (
    <aside className="view-panel" aria-label={`Selected ${node.kind}`}>
      <div className="view-panel__kind">{node.kind === 'note' ? 'Note' : 'Group'}</div>
      <p className="view-panel__text view-panel__text--pre">
        {node.kind === 'note' ? node.text : node.name}
      </p>
      <div className="view-panel__actions">{close}</div>
    </aside>
  )
}
