import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  removeNodes,
  typeLabel,
  type Bounds,
  type Point,
  type RelationshipType,
  type View,
  type ViewConnection,
  type ViewNode,
} from '@/model'
import { downloadBlob, downloadText } from '@/io'
import {
  newId,
  useModelStore,
  useModelStoreContext,
  useModelVersion,
  type ModelStore,
} from '@/store'
import { TypeCodeBadge } from '@/ui/common/TypeCodeBadge'
import { ViewDrawing, type DrawingLookups } from './ViewDrawing'
import { Minimap } from './Minimap'
import {
  absoluteIndex,
  centreOn,
  childrenIndex,
  connectionRoute,
  drawingBounds,
  fitViewport,
  zoomAround,
  type Viewport,
} from './geometry'
import { buildViewSvg, rasterise, viewFileName } from './export-view'
import {
  HANDLES,
  dropTarget,
  moveSelection,
  nodesInside,
  resizeNode,
  resized,
  spanned,
  topSelected,
  withDescendants,
  type Handle,
} from './edit'
import { connectChoice, nodeAt } from './connect'
import { ConnectMenu, DeleteRelationshipDialog } from './ConnectDialogs'
import './views.css'

/**
 * A hand-drawn view (#79), and its editor (#128): the drawing exactly as it was
 * made, with zoom, pan, fit, an outline, selection with a summary panel, and
 * SVG/PNG export. In the tab that holds the model, shapes can be selected,
 * moved, nested and un-nested, resized, nudged and removed from the view, each
 * as one command (ADR 0006). Delete removes a container with its contents, as
 * Archi does; Shift+Delete keeps the contents. Dragging from a selected shape's
 * connect handle to another shape draws a connection, offering only the
 * relationships ArchiMate allows (#129). A connection can be selected, removed
 * from the view, or deleted from the model. A reader tab gets the read-only canvas.
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

/** Movement below this many pixels is a click, not a drag. */
const CLICK_SLOP = 3
const NONE: string[] = []
const ZOOM_STEP = 1.2
/** A drag this close to the canvas edge scrolls the view, faster the closer it gets. */
const EDGE = 24
const EDGE_SPEED = 12

/**
 * What a pointer press turned into. A press on a shape becomes a move, on a
 * resize handle a resize, on the connect handle a connection, on empty canvas
 * a lasso; Space, the middle button, or any press in a reader tab pans instead. The gesture lives here, in UI
 * state, and only its end reaches the store, as one command (ADR 0006).
 */
type Gesture =
  | {
      kind: 'pan'
      start: Point
      origin: Viewport
      node: string | null
      line: string | null
      moved: boolean
    }
  | { kind: 'connect'; start: Point; source: string; moved: boolean }
  | {
      kind: 'move'
      start: Point
      from: Point
      node: string
      ids: Set<string>
      additive: boolean
      moved: boolean
    }
  | { kind: 'lasso'; start: Point; from: Point; additive: boolean; base: string[]; moved: boolean }
  | { kind: 'resize'; start: Point; from: Point; node: string; handle: Handle; moved: boolean }

function ViewCanvas({ view, store }: { view: View; store: ModelStore }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { role } = useModelStoreContext()
  const editable = role === 'writer'

  /** The view mid-gesture, drawn instead of the stored one until the gesture ends. */
  const [preview, setPreview] = useState<View | null>(null)
  const shown = preview ?? view
  const bounds = useMemo(() => absoluteIndex(shown), [shown])
  const children = useMemo(() => childrenIndex(shown), [shown])
  const drawing = useMemo(() => drawingBounds(shown, bounds), [shown, bounds])
  const lookups = useMemo<DrawingLookups>(
    () => ({
      element: (elementId) => store.element(elementId),
      relationship: (relationshipId) => store.relationship(relationshipId),
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
  /**
   * What is selected: shapes, or one connection, never both. One state rather
   * than two, so no path can select a shape and leave a line selected beside
   * it (#142 review: the model tree's `?element=` did, and Delete then removed
   * the line).
   */
  const [picked, setPicked] = useState<{ nodes: string[] } | { line: string }>(() => {
    const node = requested
      ? view.nodes.find((n) => n.kind === 'element' && n.element === requested)
      : undefined
    return { nodes: node ? [node.id] : [] }
  })
  const selection = 'nodes' in picked ? picked.nodes : NONE
  const line = 'line' in picked ? picked.line : null
  /**
   * A press that changed the selection is in progress. The selection panel
   * waits for it to end: a press selects at once, so the shape can be dragged,
   * and a panel opening or changing then would narrow the canvas and slide
   * under the pointer, taking the rest of the drag with it (seen in a real
   * browser; jsdom lays nothing out). A press on what is already selected
   * leaves the panel alone, so clicking it does not make the canvas jump.
   */
  const [pressing, setPressing] = useState(false)
  const [lasso, setLasso] = useState<Bounds | null>(null)
  const [dropInto, setDropInto] = useState<string | null>(null)
  /** A connect gesture in progress: from the source's centre to the pointer, and the shape under it. */
  const [rubber, setRubber] = useState<{ from: Point; to: Point; over: string | null } | null>(null)
  /** A connect gesture that ended on another shape, waiting on the menu. */
  const [pending, setPending] = useState<{ source: string; target: string } | null>(null)
  /** The relationship whose deletion from the model is waiting on confirmation. */
  const [deleting, setDeleting] = useState<string | null>(null)
  /**
   * Bumped by an action that removes the control holding focus: a panel's
   * buttons go with the panel, and a dialog gives focus back to an opener that
   * is gone, so focus would fall to `<body>` and the canvas would stop taking
   * keys (#142 review). Focused in an effect, so it lands after the dialog's
   * focus trap has let go.
   */
  const [refocus, setRefocus] = useState(0)
  useEffect(() => {
    if (refocus) canvas.current?.focus()
  }, [refocus])
  const release = () => setRefocus((n) => n + 1)
  const [exportError, setExportError] = useState<string | null>(null)

  // An undo can take away a selected shape; the selection holds only what is drawn.
  const present = useMemo(() => new Set(view.nodes.map((n) => n.id)), [view])
  const selected = selection.filter((id) => present.has(id))
  const single = selected.length === 1 ? selected[0]! : null
  const selectedLine = line === null ? undefined : view.connections.find((c) => c.id === line)

  /**
   * The selection, with a single selected element mirrored into `?element=` so
   * the model tree (#80), which reads the URL, highlights it. `replace`: a click
   * on a shape is not a step Back should rewind.
   */
  const choose = useCallback(
    (ids: string[]) => {
      setPicked({ nodes: ids })
      const node = ids.length === 1 ? view.nodes.find((n) => n.id === ids[0]) : undefined
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
   * Until the user pans, zooms or edits, the viewport follows the canvas size:
   * the first measurement can come before the layout settles, and a window
   * resize should keep a fitted drawing fitted. Any gesture hands control to
   * the user, so an edit never makes the view jump; Fit hands it back.
   */
  const auto = useRef(true)
  const [initialTarget] = useState(() => (requested ? (selection[0] ?? null) : null))
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
    const current = single === null ? undefined : view.nodes.find((n) => n.id === single)
    if (current?.kind === 'element' && current.element === requested) return
    const node = view.nodes.find((n) => n.kind === 'element' && n.element === requested)
    if (!node) return
    setPicked({ nodes: [node.id] })
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

  const vp = viewport ?? { x: 0, y: 0, zoom: 1 }
  // The gesture handlers and the auto-scroll loop read the viewport between renders.
  const vpRef = useRef(vp)
  vpRef.current = vp
  const gesture = useRef<Gesture | null>(null)
  const pointer = useRef<Point>({ x: 0, y: 0 })
  const space = useRef(false)
  const scrolling = useRef<number | null>(null)

  /** A screen (client) point in view coordinates. */
  const toView = useCallback((client: Point): Point => {
    const rect = canvas.current?.getBoundingClientRect()
    const v = vpRef.current
    return {
      x: (client.x - (rect?.left ?? 0) - v.x) / v.zoom,
      y: (client.y - (rect?.top ?? 0) - v.y) / v.zoom,
    }
  }, [])

  const isJunction = useCallback(
    (elementId: string) => store.element(elementId)?.type === 'Junction',
    [store],
  )

  /** Where a move would drop the selection, with the pointer at `client`. */
  const dropFor = useCallback(
    (base: View, g: Extract<Gesture, { kind: 'move' }>, client: Point) =>
      dropTarget(base, topSelected(base, g.ids), toView(client), isJunction),
    [toView, isJunction],
  )

  /**
   * `base` as the gesture would leave it, with the pointer at `client`. The
   * commit passes the store's current view rather than the render's. They are
   * the same object in practice, since a store change re-renders the canvas
   * before a release can be handled; building on the store's is simply the
   * honest base for a command whose `before` is the store's.
   */
  const outcome = useCallback(
    (base: View, g: Extract<Gesture, { kind: 'move' | 'resize' }>, client: Point): View => {
      const at = toView(client)
      const dx = Math.round(at.x - g.from.x)
      const dy = Math.round(at.y - g.from.y)
      if (g.kind === 'move') {
        return moveSelection(base, g.ids, dx, dy, { into: dropFor(base, g, client) })
      }
      const node = base.nodes.find((n) => n.id === g.node)
      return node ? resizeNode(base, g.node, resized(node.bounds, g.handle, dx, dy)) : base
    },
    [toView, dropFor],
  )

  /** Redraw the gesture in progress for the pointer at `client`. */
  const track = useCallback(
    (client: Point) => {
      const g = gesture.current
      if (!g || g.kind === 'pan') return
      if (g.kind === 'lasso') {
        setLasso(spanned(g.from, toView(client)))
        return
      }
      if (g.kind === 'connect') {
        const b = bounds.get(g.source)
        if (!b) return
        const at = toView(client)
        const over = nodeAt(view, at)
        setRubber({
          from: { x: b.x + b.width / 2, y: b.y + b.height / 2 },
          to: at,
          over: over !== undefined && over !== g.source ? over : null,
        })
        return
      }
      setPreview(outcome(view, g, client))
      if (g.kind === 'move') {
        // Outlined only when the drop would change where the selection lives.
        const into = dropFor(view, g, client)
        const parents = new Set(
          [...topSelected(view, g.ids)].map((id) => view.nodes.find((n) => n.id === id)?.parent),
        )
        setDropInto(into !== undefined && !(parents.size === 1 && parents.has(into)) ? into : null)
      }
    },
    [view, bounds, toView, outcome, dropFor],
  )

  /** Scroll while a drag rests near the canvas edge, carrying the gesture along. */
  const autoScroll = useCallback(() => {
    if (scrolling.current !== null) return
    const tick = () => {
      const g = gesture.current
      const rect = canvas.current?.getBoundingClientRect()
      if (!g || g.kind === 'pan' || !g.moved || !rect) {
        scrolling.current = null
        return
      }
      const push = (at: number, low: number, high: number) =>
        at < low + EDGE
          ? (EDGE_SPEED * (low + EDGE - at)) / EDGE
          : at > high - EDGE
            ? (-EDGE_SPEED * (at - (high - EDGE))) / EDGE
            : 0
      const sx = push(pointer.current.x, rect.left, rect.right)
      const sy = push(pointer.current.y, rect.top, rect.bottom)
      if (sx === 0 && sy === 0) {
        scrolling.current = null
        return
      }
      const next = { ...vpRef.current, x: vpRef.current.x + sx, y: vpRef.current.y + sy }
      vpRef.current = next
      steer(next)
      track(pointer.current)
      scrolling.current = requestAnimationFrame(tick)
    }
    scrolling.current = requestAnimationFrame(tick)
  }, [steer, track])
  useEffect(
    () => () => {
      if (scrolling.current !== null) cancelAnimationFrame(scrolling.current)
    },
    [],
  )

  const target = (event: { target: EventTarget | null }) => {
    const el = event.target instanceof Element ? event.target : null
    return {
      node: el?.closest('[data-node]')?.getAttribute('data-node') ?? null,
      handle: (el?.closest('[data-handle]')?.getAttribute('data-handle') ?? null) as Handle | null,
      line: el?.closest('[data-line-hit]')?.getAttribute('data-line-hit') ?? null,
      connect: el?.closest('[data-connect]') ? true : false,
    }
  }

  /** Drop the gesture in progress without committing it: Escape, a lost pointer. */
  const cancelGesture = () => {
    gesture.current = null
    setPressing(false)
    setPreview(null)
    setLasso(null)
    setDropInto(null)
    setRubber(null)
  }

  /** Select one connection, and no shape. */
  const chooseLine = (id: string) => {
    choose([])
    setPicked({ line: id })
  }

  /**
   * A connect gesture ended on `target`. Between two element shapes the menu
   * asks which relationship; anything else gets a plain line at once, as Archi
   * draws one from a note or group.
   */
  const connect = (source: string, target: string) => {
    if (connectChoice(store, view, source, target).kind !== 'line') {
      setPending({ source, target })
      return
    }
    const id = newId('conn')
    if (store.addConnection(view.id, { id, kind: 'line', source, target })) chooseLine(id)
  }

  const create = (type: RelationshipType) => {
    if (!pending) return
    const choice = connectChoice(store, view, pending.source, pending.target)
    setPending(null)
    if (choice.kind !== 'relationship') return
    const relationship = newId('rel')
    const id = newId('conn')
    const made = store.addRelationshipInView(
      view.id,
      {
        id: relationship,
        type,
        source: choice.source.id,
        target: choice.target.id,
        properties: {},
      },
      { id, kind: 'relationship', relationship, source: pending.source, target: pending.target },
    )
    if (made) chooseLine(id)
  }

  const reuse = (relationship: string) => {
    if (!pending) return
    const { source, target } = pending
    setPending(null)
    const id = newId('conn')
    if (store.addConnection(view.id, { id, kind: 'relationship', relationship, source, target })) {
      chooseLine(id)
    }
  }

  const endGesture = (client: Point) => {
    const g = gesture.current
    gesture.current = null
    setPressing(false)
    setPreview(null)
    setLasso(null)
    setDropInto(null)
    setRubber(null)
    if (!g) return
    if (g.kind === 'pan') {
      if (!g.moved) {
        if (g.node) choose([g.node])
        else if (g.line) chooseLine(g.line)
        else choose([])
      }
      return
    }
    if (g.kind === 'connect') {
      if (!g.moved) return
      const over = nodeAt(view, toView(client))
      if (over !== undefined && over !== g.source) connect(g.source, over)
      return
    }
    if (g.kind === 'lasso') {
      if (!g.moved) {
        if (!g.additive) choose([])
        return
      }
      const inside = nodesInside(view, spanned(g.from, toView(client)))
      choose(g.additive ? [...g.base, ...inside.filter((id) => !g.base.includes(id))] : inside)
      return
    }
    if (!g.moved) {
      // A click on a shape: select it alone, unless Shift or ⌘ already toggled it.
      if (g.kind === 'move' && !g.additive) choose([g.node])
      return
    }
    // Built on the store's current view; one that changed nothing is the view
    // itself, which the store records as nothing.
    store.updateView(view.id, (current) => outcome(current, g, client))
  }

  /**
   * A run of nudges: the view before the first, the selection it moves, the
   * total so far, and the view the last one left. Each press is still its own
   * command, but each is computed from the start of the run by the running
   * total, so bend-points are rounded once, as one drag rounds them. Rounding at
   * every press would drift them: a weight-½ point would move 10 px for ten
   * 1 px presses one way and none the other (#140 review). A run ends when
   * anything else changes the view or the selection.
   */
  const nudgeRun = useRef<{
    start: View
    selection: string
    dx: number
    dy: number
    last: View
  } | null>(null)

  const nudge = (dx: number, dy: number) => {
    if (selected.length === 0) return
    auto.current = false
    const key = JSON.stringify(selected)
    const run = nudgeRun.current
    const continues = run !== null && run.last === view && run.selection === key
    const next = continues
      ? { ...run, dx: run.dx + dx, dy: run.dy + dy }
      : { start: view, selection: key, dx, dy, last: view }
    const ids = new Set(selected)
    const after = store.updateView(view.id, (current) =>
      // The run's start holds only if nothing else has changed the view since.
      current === next.last
        ? moveSelection(next.start, ids, next.dx, next.dy)
        : moveSelection(current, ids, dx, dy),
    )
    nudgeRun.current = after ? { ...next, last: after } : null
  }

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

  const selectedNode = single ? view.nodes.find((n) => n.id === single) : undefined
  const panelNode = pressing ? undefined : selectedNode
  const panelLine = pressing || panelNode ? undefined : selectedLine
  const route = (connection: ViewConnection) => connectionRoute(connection, bounds)
  const pathOf = (points: Point[]) => `M${points.map((p) => `${p.x},${p.y}`).join('L')}`
  const choice = pending ? connectChoice(store, view, pending.source, pending.target) : undefined
  const deletingRelationship = deleting === null ? undefined : store.relationship(deleting)
  const singleBounds = single ? bounds.get(single) : undefined
  // Handles hide while shapes are being dragged, and come back where they land.
  const dragging = preview !== null && gesture.current?.kind === 'move'
  const empty = !drawing
  const stats = [
    `${view.nodes.length} nodes`,
    `${view.connections.length} connections`,
    ...(view.viewpoint ? [`viewpoint ${view.viewpoint}`] : []),
  ].join(' · ')
  // Handles keep their screen size at any zoom.
  const handle = 7 / vp.zoom

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

      <div
        className={`view-screen__body${panelNode || panelLine ? ' view-screen__body--panel' : ''}`}
      >
        <div
          ref={canvas}
          className={`view-screen__canvas${editable ? ' view-screen__canvas--edit' : ''}`}
          tabIndex={0}
          aria-label={`View ${view.name}`}
          aria-description={
            editable
              ? 'Drag shapes to move them, drag empty space to select, arrow keys to nudge. Drag from a selected shape’s connect handle to another shape to connect them. Delete removes from the view with everything inside; Shift+Delete keeps what is inside. Space and drag to pan.'
              : undefined
          }
          onKeyDown={(event) => {
            if (event.key === ' ') {
              space.current = true
              event.preventDefault()
              return
            }
            if (event.key === 'Escape') {
              // As GEF does: Escape cancels a drag in progress, and only then the selection.
              if (gesture.current) cancelGesture()
              else choose([])
              return
            }
            if (!editable || gesture.current) return
            const step = event.shiftKey ? 10 : 1
            const arrows: Record<string, [number, number]> = {
              ArrowLeft: [-step, 0],
              ArrowRight: [step, 0],
              ArrowUp: [0, -step],
              ArrowDown: [0, step],
            }
            const arrow = arrows[event.key]
            if ((event.key === 'Delete' || event.key === 'Backspace') && selectedLine) {
              // From the view only, as Archi's Delete; the model keeps the relationship.
              event.preventDefault()
              store.removeConnection(view.id, selectedLine.id)
              setPicked({ nodes: [] })
              return
            }
            if (arrow && selected.length) {
              event.preventDefault()
              nudge(arrow[0], arrow[1])
            } else if ((event.key === 'Delete' || event.key === 'Backspace') && selected.length) {
              // As Archi: Delete removes a container with everything in it; Shift+Delete
              // is Archi's "Delete from View (keep children)" (DeleteContainerAction),
              // which lifts the children out where they were drawn.
              event.preventDefault()
              const ids = new Set(selected)
              store.updateView(view.id, (v) =>
                removeNodes(v, event.shiftKey ? ids : withDescendants(v, ids)),
              )
              choose([])
            }
          }}
          onKeyUp={(event) => {
            if (event.key === ' ') space.current = false
          }}
          onBlur={() => {
            // A Space released while focus was elsewhere never reaches the canvas.
            space.current = false
          }}
          onPointerDown={(event) => {
            if (event.button !== 0 && event.button !== 1) return
            const start = { x: event.clientX, y: event.clientY }
            pointer.current = start
            const { node, handle: grip, line: hit, connect: linking } = target(event)
            if (!editable || event.button === 1 || space.current) {
              gesture.current = { kind: 'pan', start, origin: vp, node, line: hit, moved: false }
              return
            }
            auto.current = false
            const from = toView(start)
            if (linking && single) {
              gesture.current = { kind: 'connect', start, source: single, moved: false }
              return
            }
            if (hit && !node) {
              // A press on a line selects it. Moving its bend-points is #133.
              chooseLine(hit)
              return
            }
            if (grip && single) {
              gesture.current = {
                kind: 'resize',
                start,
                from,
                node: single,
                handle: grip,
                moved: false,
              }
              return
            }
            const additive = event.shiftKey || event.metaKey || event.ctrlKey
            if (node) {
              let ids = selected
              if (additive) {
                ids = selected.includes(node)
                  ? selected.filter((id) => id !== node)
                  : [...selected, node]
              } else if (!selected.includes(node)) {
                ids = [node]
              }
              if (ids !== selected) {
                // A selection made by this press: the panel waits for the release.
                setPressing(true)
                choose(ids)
              }
              gesture.current = {
                kind: 'move',
                start,
                from,
                node,
                ids: new Set(ids.includes(node) ? ids : []),
                additive,
                moved: false,
              }
              return
            }
            gesture.current = { kind: 'lasso', start, from, additive, base: selected, moved: false }
          }}
          onPointerMove={(event) => {
            const g = gesture.current
            if (!g) return
            // The button came up where the canvas could not see it: before the drag
            // captured the pointer, a release outside the canvas sends no pointerup.
            if (event.buttons === 0) {
              cancelGesture()
              return
            }
            const client = { x: event.clientX, y: event.clientY }
            pointer.current = client
            if (!g.moved && Math.hypot(client.x - g.start.x, client.y - g.start.y) < CLICK_SLOP) {
              return
            }
            // Captured only once it is a drag: capturing on press would retarget
            // the click and double-click to the canvas, and lose the shape.
            if (!g.moved) event.currentTarget.setPointerCapture?.(event.pointerId)
            g.moved = true
            if (g.kind === 'pan') {
              steer({
                ...g.origin,
                x: g.origin.x + client.x - g.start.x,
                y: g.origin.y + client.y - g.start.y,
              })
              return
            }
            if (g.kind === 'move' && g.ids.size === 0) return
            track(client)
            autoScroll()
          }}
          onPointerUp={(event) => endGesture({ x: event.clientX, y: event.clientY })}
          onPointerCancel={cancelGesture}
          onDoubleClick={(event) => {
            const node = view.nodes.find((n) => n.id === target(event).node)
            if (node?.kind === 'view-ref' && store.view(node.view))
              navigate(`/view/${encodeURIComponent(node.view)}`)
          }}
        >
          {empty ? (
            <p className="view-screen__notice">This view is empty.</p>
          ) : (
            <svg ref={drawingRef} className="view-screen__svg" data-testid="view-canvas">
              <g transform={`translate(${vp.x} ${vp.y}) scale(${vp.zoom})`}>
                <ViewDrawing view={shown} bounds={bounds} children={children} lookups={lookups} />
                {/* Lines are thin; a wider, invisible stroke over each is what a press finds. */}
                <g data-testid="line-hits">
                  {shown.connections.map((connection) => {
                    const points = route(connection)
                    return points ? (
                      <path
                        key={connection.id}
                        className="view-screen__hit"
                        data-line-hit={connection.id}
                        d={pathOf(points)}
                        strokeWidth={8 / vp.zoom}
                      />
                    ) : null
                  })}
                </g>
                {selectedLine &&
                  (() => {
                    const points = route(selectedLine)
                    return points ? (
                      <path
                        className="view-screen__selection-line"
                        data-testid="selection"
                        data-selected={selectedLine.id}
                        d={pathOf(points)}
                        vectorEffect="non-scaling-stroke"
                      />
                    ) : null
                  })()}
                {dropInto && bounds.get(dropInto) && (
                  <rect
                    className="view-screen__drop"
                    data-testid="drop-target"
                    {...box(bounds.get(dropInto)!, 0)}
                    vectorEffect="non-scaling-stroke"
                  />
                )}
                {selected.map((id) => {
                  const b = bounds.get(id)
                  return b ? (
                    <rect
                      key={id}
                      className="view-screen__selection"
                      data-testid="selection"
                      data-selected={id}
                      {...box(b, 2)}
                      vectorEffect="non-scaling-stroke"
                    />
                  ) : null
                })}
                {editable && singleBounds && !dragging && (
                  <g data-testid="handles">
                    {HANDLES.map((h) => {
                      const p = handlePoint(singleBounds, h)
                      return (
                        <rect
                          key={h}
                          className={`view-screen__handle view-screen__handle--${h}`}
                          data-handle={h}
                          x={p.x - handle / 2}
                          y={p.y - handle / 2}
                          width={handle}
                          height={handle}
                          vectorEffect="non-scaling-stroke"
                        />
                      )
                    })}
                  </g>
                )}
                {editable && singleBounds && !dragging && !rubber && (
                  <g
                    className="view-screen__connect"
                    data-connect={single}
                    data-testid="connect-handle"
                    transform={`translate(${singleBounds.x + singleBounds.width + 12 / vp.zoom} ${singleBounds.y - 12 / vp.zoom}) scale(${1 / vp.zoom})`}
                  >
                    <title>Drag to another shape to connect</title>
                    <circle r={7} />
                    <path d="M-3,0L3,0M0.5,-2.5L3,0L0.5,2.5" />
                  </g>
                )}
                {rubber && (
                  <>
                    {rubber.over && bounds.get(rubber.over) && (
                      <rect
                        className="view-screen__drop"
                        data-testid="connect-target"
                        {...box(bounds.get(rubber.over)!, 0)}
                        vectorEffect="non-scaling-stroke"
                      />
                    )}
                    <line
                      className="view-screen__rubber"
                      data-testid="rubber-band"
                      x1={rubber.from.x}
                      y1={rubber.from.y}
                      x2={rubber.to.x}
                      y2={rubber.to.y}
                      vectorEffect="non-scaling-stroke"
                    />
                  </>
                )}
                {lasso && (
                  <rect
                    className="view-screen__lasso"
                    data-testid="lasso"
                    {...box(lasso, 0)}
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
        {panelNode && (
          <SelectionPanel
            node={panelNode}
            store={store}
            onClose={() => {
              choose([])
              release()
            }}
          />
        )}
        {panelLine && (
          <LinePanel
            connection={panelLine}
            view={view}
            store={store}
            editable={editable}
            onRemove={() => {
              store.removeConnection(view.id, panelLine.id)
              setPicked({ nodes: [] })
              release()
            }}
            onDelete={(relationship) => setDeleting(relationship)}
            onClose={() => {
              setPicked({ nodes: [] })
              release()
            }}
          />
        )}
      </div>
      {choice && choice.kind !== 'line' && (
        <ConnectMenu
          choice={choice}
          onCreate={create}
          onReuse={(relationship) => reuse(relationship.id)}
          onCancel={() => setPending(null)}
        />
      )}
      {deletingRelationship && (
        <DeleteRelationshipDialog
          relationship={deletingRelationship}
          elsewhere={store
            .viewsDrawingRelationship(deletingRelationship.id)
            .filter((other) => other.id !== view.id)}
          onConfirm={() => {
            store.removeRelationship(deletingRelationship.id)
            setDeleting(null)
            setPicked({ nodes: [] })
            release()
          }}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  )
}

const box = (b: Bounds, pad: number) => ({
  x: b.x - pad,
  y: b.y - pad,
  width: b.width + pad * 2,
  height: b.height + pad * 2,
})

function handlePoint(b: Bounds, h: Handle): Point {
  const x = h.includes('w') ? b.x : h.includes('e') ? b.x + b.width : b.x + b.width / 2
  const y = h.includes('n') ? b.y : h.includes('s') ? b.y + b.height : b.y + b.height / 2
  return { x, y }
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

/**
 * A selected connection: what it draws, and Archi's two ways to remove it.
 * Remove from view leaves the relationship in the model; Delete from model
 * takes it out of every view, after saying which (#129).
 */
function LinePanel({
  connection,
  view,
  store,
  editable,
  onRemove,
  onDelete,
  onClose,
}: {
  connection: ViewConnection
  view: View
  store: ModelStore
  editable: boolean
  onRemove: () => void
  onDelete: (relationship: string) => void
  onClose: () => void
}) {
  const nameOf = (nodeId: string) => {
    const node = view.nodes.find((n) => n.id === nodeId)
    if (!node) return nodeId
    if (node.kind === 'element') return store.element(node.element)?.name ?? node.element
    if (node.kind === 'note') return 'Note'
    if (node.kind === 'group') return node.name
    return store.view(node.view)?.name ?? 'View reference'
  }
  const relationship =
    connection.kind === 'relationship' ? store.relationship(connection.relationship) : undefined
  const views = relationship ? store.viewsDrawingRelationship(relationship.id).length : 0
  return (
    <aside
      className="view-panel"
      aria-label={relationship ? `Selected: ${relationship.type} relationship` : 'Selected line'}
    >
      <div className="view-panel__kind">{relationship ? 'Relationship' : 'Line'}</div>
      {relationship && (
        <div className="view-panel__name view-panel__name--mono">{relationship.type}</div>
      )}
      <p className="view-panel__text">
        {nameOf(connection.source)} → {nameOf(connection.target)}
      </p>
      {relationship && (
        <div className="view-panel__stats view-panel__stats--one">
          <div className="view-panel__stat">
            <div className="view-panel__stat-key">Views</div>
            <div className="view-panel__stat-value">{views}</div>
          </div>
        </div>
      )}
      <div className="view-panel__actions view-panel__actions--wrap">
        {editable && (
          <button type="button" className="button" onClick={onRemove}>
            Remove from view
          </button>
        )}
        {editable && relationship && (
          <button type="button" className="button" onClick={() => onDelete(relationship.id)}>
            Delete from model…
          </button>
        )}
        <button type="button" className="button" onClick={onClose}>
          Close
        </button>
      </div>
    </aside>
  )
}
