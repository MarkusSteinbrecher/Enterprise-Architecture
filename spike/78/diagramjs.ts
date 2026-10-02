/**
 * Candidate C — diagram-js (MIT, the editor toolkit under bpmn-js).
 *
 * diagram-js owns an element registry and a command stack of its own. The
 * adapter keeps OURS authoritative: after every diagram-js command it reads the
 * canvas back into a View, dispatches one `update-view`, and clears diagram-js's
 * stack so its undo never runs. Our undo re-imports the view.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Diagram from 'diagram-js'
import ModelingModule from 'diagram-js/lib/features/modeling'
import MoveModule from 'diagram-js/lib/features/move'
import BendpointsModule from 'diagram-js/lib/features/bendpoints'
import SelectionModule from 'diagram-js/lib/features/selection'
import RulesModule from 'diagram-js/lib/features/rules'
import GridSnappingModule from 'diagram-js/lib/features/grid-snapping'
import MoveCanvasModule from 'diagram-js/lib/navigation/movecanvas'
import ZoomScrollModule from 'diagram-js/lib/navigation/zoomscroll'
import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer'
import RuleProvider from 'diagram-js/lib/features/rules/RuleProvider'
import BaseLayouter from 'diagram-js/lib/layout/BaseLayouter'
import { append as svgAppend, attr as svgAttr, create as svgCreate } from 'tiny-svg'
import 'diagram-js/assets/diagram-js.css'
import type { ModelStore } from '@/store'
import type { View, ViewConnection, ViewNode } from '@/model'
import { VIEW_ID, absoluteIndex, chopbox, nodeLook } from './shared'

let storeRef: ModelStore

class ArchiRenderer extends BaseRenderer {
  static $inject = ['eventBus']
  constructor(eventBus: any) {
    super(eventBus, 1500)
  }
  canRender() {
    return true
  }
  drawShape(parent: SVGElement, element: any) {
    const node: ViewNode = element.businessObject
    const look = nodeLook(storeRef, node)
    const rect = svgCreate('rect')
    svgAttr(rect, {
      width: element.width,
      height: element.height,
      fill: look.fill,
      stroke: look.stroke,
      ...(node.kind === 'group' ? { 'stroke-dasharray': '4 2' } : {}),
    })
    svgAppend(parent, rect)
    const label = svgCreate('text')
    svgAttr(label, { x: 6, y: 14, class: 'spike-label' })
    label.textContent = look.label
    svgAppend(parent, label)
    const code = svgCreate('text')
    svgAttr(code, { x: element.width - 6, y: 14, 'text-anchor': 'end', class: 'spike-code' })
    code.textContent = look.code
    svgAppend(parent, code)
    return rect
  }
  drawConnection(parent: SVGElement, element: any) {
    const line = svgCreate('polyline')
    svgAttr(line, {
      points: element.waypoints.map((p: any) => `${p.x},${p.y}`).join(' '),
      fill: 'none',
      stroke: 'var(--ink)',
      'marker-end': 'url(#arrow)',
    })
    svgAppend(parent, line)
    return line
  }
  getShapePath(shape: any) {
    const { x, y, width: w, height: h } = shape
    return `M${x},${y}h${w}v${h}h${-w}z`
  }
}

/** Everything a viewer of the spike needs is allowed; creation and resize are out of scope. */
class Rules extends RuleProvider {
  static $inject = ['eventBus']
  init() {
    this.addRule('elements.move', () => true)
    this.addRule('connection.updateWaypoints', () => true)
    this.addRule('shape.resize', () => false)
  }
}

/** Archi semantics: bend-points stay put; only the docking ends follow the shapes. */
class ArchiLayouter extends BaseLayouter {
  layoutConnection(connection: any, hints: any = {}) {
    const source = hints.source ?? connection.source
    const target = hints.target ?? connection.target
    const inner = (connection.waypoints ?? []).slice(1, -1)
    const mid = (s: any) => ({ x: s.x + s.width / 2, y: s.y + s.height / 2 })
    return [
      chopbox(source, inner[0] ?? mid(target)),
      ...inner,
      chopbox(target, inner[inner.length - 1] ?? mid(source)),
    ]
  }
}

const AdapterModule = {
  __init__: ['archiRenderer', 'archiRules'],
  archiRenderer: ['type', ArchiRenderer],
  archiRules: ['type', Rules],
  layouter: ['type', ArchiLayouter],
}

export function mountDiagramJs(container: HTMLElement, store: ModelStore) {
  storeRef = store
  const diagram = new Diagram({
    canvas: { container },
    modules: [
      SelectionModule,
      ModelingModule,
      MoveModule,
      BendpointsModule,
      RulesModule,
      GridSnappingModule,
      MoveCanvasModule,
      ZoomScrollModule,
      AdapterModule,
    ],
  } as any) as any
  const canvas = diagram.get('canvas')
  const factory = diagram.get('elementFactory')
  const commandStack = diagram.get('commandStack')
  const eventBus = diagram.get('eventBus')
  const registry = diagram.get('elementRegistry')

  let written: View | undefined

  const importView = (view: View) => {
    diagram.clear()
    const root = canvas.getRootElement()
    const abs = absoluteIndex(view)
    for (const node of view.nodes) {
      const b = abs.get(node.id)!
      const shape = factory.createShape({ id: node.id, ...b, businessObject: node })
      canvas.addShape(shape, node.parent ? registry.get(node.parent) : root)
    }
    for (const c of view.connections) {
      const source = registry.get(c.source)
      const target = registry.get(c.target)
      const inner = c.bendpoints ?? []
      const conn = factory.createConnection({
        id: c.id,
        source,
        target,
        businessObject: c,
        waypoints: [
          chopbox(source, inner[0] ?? { x: target.x + target.width / 2, y: target.y + target.height / 2 }),
          ...inner,
          chopbox(target, inner[inner.length - 1] ?? { x: source.x + source.width / 2, y: source.y + source.height / 2 }),
        ],
      })
      canvas.addConnection(conn, root)
    }
  }

  /** diagram-js canvas → our View (relative bounds, absolute bend-points). */
  const readBack = (before: View): View => {
    const root = canvas.getRootElement()
    const nodes: ViewNode[] = before.nodes.map((n) => {
      const s = registry.get(n.id)
      const parent = s.parent && s.parent !== root ? s.parent : undefined
      const next: ViewNode = {
        ...n,
        bounds: {
          x: Math.round(s.x - (parent?.x ?? 0)),
          y: Math.round(s.y - (parent?.y ?? 0)),
          width: s.width,
          height: s.height,
        },
      }
      if (parent) next.parent = parent.id
      else delete next.parent
      return next
    })
    const connections: ViewConnection[] = before.connections.map((c) => {
      const inner = registry.get(c.id).waypoints.slice(1, -1).map((p: any) => ({ x: Math.round(p.x), y: Math.round(p.y) }))
      const next = { ...c }
      if (inner.length) next.bendpoints = inner
      else delete next.bendpoints
      return next
    })
    return { ...before, nodes, connections }
  }

  // Every diagram-js command becomes exactly one command on OUR stack.
  eventBus.on('commandStack.changed', () => {
    if (!commandStack.canUndo()) return // our own clear() / re-import
    const before = store.view(VIEW_ID)!
    written = readBack(before)
    store.updateView(VIEW_ID, () => written!)
    written = store.view(VIEW_ID)
    queueMicrotask(() => commandStack.clear())
  })

  // Our undo/redo (or any other model change) re-imports; our own write does not.
  store.subscribe(() => {
    const view = store.view(VIEW_ID)!
    if (view === written) return
    importView(view)
  })

  // Arrowhead marker for the renderer.
  const defs = svgCreate('defs')
  defs.innerHTML =
    '<marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0,0 L10,5 L0,10" fill="none" stroke="var(--ink)"/></marker>'
  svgAppend(canvas._svg, defs)

  importView(store.view(VIEW_ID)!)
  canvas.viewbox({ x: -20, y: -20, width: container.clientWidth, height: container.clientHeight })
  return diagram
}
