import claimsArchimate from '@/io/fixtures/claims-platform.archimate?raw'
import { importArchimate } from '@/io/archimate-native'
import { defaultNodeSize } from '@/io/default-sizes'
import {
  absoluteBounds,
  type Bounds,
  type Element,
  type Point,
  type RelationshipType,
  type View,
  type ViewNode,
  type Workspace,
} from '@/model'
import { ModelStore } from '@/store/model-store'
import { connectChoice } from '@/ui/views/connect'
import {
  newDrawingNode,
  newElement,
  newView,
  placement,
  toolSize,
  type Tool,
} from '@/ui/views/create'
import { moveSelection, resizeNode } from '@/ui/views/edit'
import { nestingEdit, nestingFor, withNewElement } from '@/ui/views/nesting'

/**
 * The claims landscape after an editing session (#127, #128, #129), and a view
 * made from scratch beside it (#130): the source of
 * `src/io/fixtures/claims-edited.xml`, which Archi 5.10 imports and saves as
 * `claims-edited.archi.archimate`. Every edit goes through the store, one
 * command each, and the geometry is the editor's own (`ui/views/edit.ts`,
 * #128), so the file holds what an edited view really looks like to the writer.
 *
 * Ids are fixed, not generated, so the exported file is the same on every run
 * and the checked-in copy can be held to it.
 *
 *   npx vite-node scripts/fixtures/build-edited-claims.ts
 *   scripts/fixtures/archi-roundtrip.sh src/io/fixtures/claims-edited.xml …
 */
export function editedClaims(): Workspace {
  const imported = importArchimate(claimsArchimate).workspace
  if (!imported) throw new Error('claims-platform.archimate did not import')
  const store = new ModelStore(imported)
  const view = 'v-landscape'

  const bounds = (id: string): Bounds => {
    const found = absoluteBounds(store.view(view)!, id)
    if (!found) throw new Error(`no node ${id}`)
    return found
  }
  // The editor's own operations (#128), each as one command, as its gestures commit them.
  const move = (ids: string[], dx: number, dy: number, drop?: { into: string | undefined }) =>
    store.updateView(view, (v) => moveSelection(v, new Set(ids), dx, dy, drop))
  const resize = (id: string, change: (b: Bounds) => Bounds) =>
    store.updateView(view, (v) => {
      const node = v.nodes.find((n) => n.id === id)!
      return resizeNode(v, id, change(node.bounds))
    })

  // Move, and resize from the far corner.
  move(['o-customer'], 30, 10)
  resize('o-claim-bo', (b) => ({ ...b, width: 170, height: 70 }))
  // Resized from the left edge: its children stay where they were drawn.
  resize('o-k8s', (b) => ({ ...b, x: b.x - 20, width: b.width + 20 }))
  // One end of a bent line moves, so its bend-points follow by their weights.
  move(['o-calc'], 0, 15)

  // Out of its group to the top level, where it was drawn; and into a container
  // the relationship it draws already connects to.
  move(['o-scanner'], 0, 0, { into: undefined })
  const engine = bounds('o-engine')
  const claim = bounds('o-do-claim')
  move(['o-do-claim'], engine.x + 230 - claim.x, engine.y + 10 - claim.y, { into: 'o-engine' })

  // Bend-points: one added, one route straightened, one corner moved.
  store.updateConnection(view, 'c-cust-as', (connection) => ({
    ...connection,
    bendpoints: [{ x: 715, y: 470 }],
  }))
  store.updateConnection(view, 'c-info-ins', (connection) => {
    const straight = { ...connection }
    delete straight.bendpoints
    return straight
  })
  store.updateConnection(view, 'c-engine-claim', (connection) => ({
    ...connection,
    bendpoints: [{ x: 700, y: 455 }],
  }))

  // Appearance: what the exchange format carries, and what it cannot.
  store.updateNode(view, 'o-goal', (node) => ({ ...node, appearance: { fillColor: '#ffe9a8' } }))
  store.updateNode(view, 'o-req', (node) => ({
    ...node,
    appearance: { fontSize: 12, fontStyle: ['bold'], fontColor: '#5a1e8c' },
  }))
  store.updateNode(view, 'o-rollout', (node) => ({
    ...node,
    appearance: { textAlignment: 'right', fontStyle: ['strikethrough'] },
  }))
  store.updateConnection(view, 'c-req-goal', (connection) => ({
    ...connection,
    appearance: { lineColor: '#8c1e5a', lineWidth: 2 },
  }))

  // Removed from the view; its line goes with it.
  store.removeNode(view, 'o-note-ref')

  // A new element drawn and connected, and a new note.
  store.addElement({
    id: 'ac-fraud',
    type: 'ApplicationComponent',
    name: 'Fraud Detection',
    properties: {},
  })
  store.addRelationship({
    id: 'r-fraud-valuate',
    type: 'Serving',
    source: 'ac-fraud',
    target: 'bp-valuate',
    properties: {},
  })
  store.addNode(view, {
    id: 'o-fraud',
    kind: 'element',
    element: 'ac-fraud',
    parent: 'o-g-apps',
    bounds: { x: 1010, y: 250, width: 150, height: 50 },
  })
  store.addConnection(view, {
    id: 'c-fraud-valuate',
    kind: 'relationship',
    relationship: 'r-fraud-valuate',
    source: 'o-fraud',
    target: 'o-valuate',
  })
  store.addNode(view, {
    id: 'o-note-edited',
    kind: 'note',
    text: 'Edited in Archipelago (#127).',
    bounds: { x: 1240, y: 380, width: 170, height: 55 },
  })

  // Connecting (#129), as the connect menu does it: only a type the menu offers,
  // and the relationship and its connection made as one command.
  const connect = (id: string, from: string, to: string, type: RelationshipType) => {
    const choice = connectChoice(store, store.view(view)!, from, to)
    if (choice.kind !== 'relationship' || !choice.types.includes(type)) {
      throw new Error(`the menu does not offer ${type} from ${from} to ${to}`)
    }
    store.addRelationshipInView(
      view,
      { id: `r-${id}`, type, source: choice.source.id, target: choice.target.id, properties: {} },
      { id: `c-${id}`, kind: 'relationship', relationship: `r-${id}`, source: from, target: to },
    )
  }
  connect('hub-payment', 'o-customer-hub', 'o-as-payment', 'Serving')
  connect('calc-customer', 'o-calc', 'o-do-customer', 'Access')
  connect('rollout-req', 'o-rollout', 'o-req', 'Realization')
  connect('crm-req', 'o-crm', 'o-req', 'Influence')

  // A new junction, and Triggerings through it: the menu holds both sides to one type.
  store.addElement({ id: 'j-intake', type: 'Junction', name: '', properties: {} })
  store.addNode(view, {
    id: 'o-intake',
    kind: 'element',
    element: 'j-intake',
    bounds: { x: 1195, y: 330, width: 15, height: 15 },
  })
  connect('damage-intake', 'o-damage', 'o-intake', 'Triggering')
  connect('intake-register', 'o-intake', 'o-register', 'Triggering')
  connect('intake-valuate', 'o-intake', 'o-valuate', 'Triggering')

  // A relationship the model holds and this view did not draw: drawn, not duplicated.
  const reused = connectChoice(store, store.view(view)!, 'o-do-claim', 'o-claim-bo')
  if (reused.kind !== 'relationship' || reused.existing[0]?.id !== 'r-claim-bo') {
    throw new Error('the menu does not offer r-claim-bo to re-use')
  }
  store.addConnection(view, {
    id: 'c-claim-bo',
    kind: 'relationship',
    relationship: 'r-claim-bo',
    source: 'o-do-claim',
    target: 'o-claim-bo',
  })
  // A note connects with a plain line.
  store.addConnection(view, {
    id: 'c-note-fraud',
    kind: 'line',
    source: 'o-note-edited',
    target: 'o-fraud',
  })

  // Nesting (#131), through the prompt's own question: a shape moved into an
  // element's shape, and a new element placed in one, each committed with the
  // relationship chosen, and its connection, as one command.
  const nestAnswering = (
    after: View,
    parent: string,
    child: string,
    type: RelationshipType,
    ids: string[],
    adding?: Element,
  ) => {
    const model = adding ? withNewElement(store, adding) : store
    const option = nestingFor(model, after, parent, [child])?.ask[0]?.options.find(
      (o) => o.type === type,
    )
    if (!option) throw new Error(`nesting ${child} in ${parent} does not offer ${type}`)
    const edit = nestingEdit(model, after, parent, [child], new Map([[child, option]]), () => {
      const next = ids.shift()
      if (!next)
        throw new Error(`nesting ${child} in ${parent} made more than it was given ids for`)
      return next
    })
    store.updateViewAdding(view, () => edit.view, {
      ...(adding ? { elements: [adding] } : {}),
      relationships: edit.relationships,
    })
  }
  // Policy Host moved into the engine, above its functions: aggregated by it.
  const host = bounds('o-host')
  nestAnswering(
    moveSelection(store.view(view)!, new Set(['o-host']), 240 - host.x, 490 - host.y, {
      into: 'o-engine',
    }),
    'o-engine',
    'o-host',
    'Aggregation',
    ['r-engine-host', 'c-engine-host'],
  )
  // A new system software placed in the cluster from the palette: composed in it.
  const batchTool = { kind: 'element', type: 'SystemSoftware' } as const
  const batch = { ...newElement(batchTool), id: 'ss-batch', name: 'Claims Batch' }
  const spot = placement(
    store.view(view)!,
    { x: 395, y: 900 },
    toolSize(batchTool),
    (id) => store.element(id)?.type === 'Junction',
  )
  if (spot.parent !== 'o-k8s') throw new Error('the batch spot is not inside the cluster')
  const landscape = store.view(view)!
  nestAnswering(
    {
      ...landscape,
      nodes: [...landscape.nodes, { id: 'o-batch', kind: 'element', element: 'ss-batch', ...spot }],
    },
    'o-k8s',
    'o-batch',
    'Composition',
    ['r-k8s-batch', 'c-k8s-batch'],
    batch,
  )

  scratchView(store)
  return store.snapshot()
}

/**
 * A view made from scratch (#130), as the editor makes one: in a new folder
 * of Views, with a viewpoint, and shapes placed where the palette's
 * `placement` puts them, so a shape placed inside a group is nested in it.
 * New elements and elements the model already holds, drawn and connected.
 */
function scratchView(store: ModelStore) {
  const id = 'v-scratch'
  const isJunction = (elementId: string) => store.element(elementId)?.type === 'Junction'
  const at = (point: Point, tool: Tool) =>
    placement(store.view(id)!, point, toolSize(tool), isJunction)
  const place = (
    nodeId: string,
    tool: Extract<Tool, { kind: 'element' }>,
    element: Partial<Element>,
    point: Point,
  ) => {
    const made = { ...newElement(tool), ...element } as Element
    store.addElementInView(id, made, {
      id: nodeId,
      kind: 'element',
      element: made.id,
      ...at(point, tool),
    })
  }
  const drawExisting = (nodeId: string, elementId: string, point: Point) => {
    const type = store.element(elementId)!.type
    store.addNode(id, {
      id: nodeId,
      kind: 'element',
      element: elementId,
      ...placement(store.view(id)!, point, defaultNodeSize('element', type), isJunction),
    })
  }

  store.addFolder({ id: 'folder-views-drafts', name: 'Drafts', root: 'views' })
  store.addView({ ...newView('folder-views-drafts'), id, name: 'Claim intake (draft)' })
  store.updateView(id, (v) => ({ ...v, viewpoint: 'Business Process Cooperation' }))

  // A group, then a new element placed inside it: nested, relative to the group.
  const group: Tool = { kind: 'group' }
  store.addNode(id, {
    ...newDrawingNode(group, at({ x: 40, y: 40 }, group)),
    id: 'o-s-group',
  } as ViewNode)
  store.updateNode(id, 'o-s-group', (n) => (n.kind === 'group' ? { ...n, name: 'Intake' } : n))
  place(
    'o-s-intake',
    { kind: 'element', type: 'ApplicationService' },
    { id: 'as-intake', name: 'Claim Intake' },
    { x: 80, y: 90 },
  )
  place(
    'o-s-event',
    { kind: 'element', type: 'BusinessEvent' },
    { id: 'be-claim-in', name: 'Claim received' },
    { x: 520, y: 60 },
  )

  // Elements the model holds, drawn again: one of them twice, as Archi allows.
  drawExisting('o-s-engine', 'ac-engine', { x: 80, y: 260 })
  drawExisting('o-s-valuate', 'bp-valuate', { x: 520, y: 220 })
  drawExisting('o-s-engine-2', 'ac-engine', { x: 300, y: 260 })

  // Connected through the menu's own question, one command each.
  const connect = (cid: string, from: string, to: string, type: RelationshipType) => {
    const choice = connectChoice(store, store.view(id)!, from, to)
    if (choice.kind !== 'relationship' || !choice.types.includes(type)) {
      throw new Error(`the menu does not offer ${type} from ${from} to ${to}`)
    }
    store.addRelationshipInView(
      id,
      { id: `r-${cid}`, type, source: choice.source.id, target: choice.target.id, properties: {} },
      { id: `c-${cid}`, kind: 'relationship', relationship: `r-${cid}`, source: from, target: to },
    )
  }
  connect('s-engine-intake', 'o-s-engine', 'o-s-intake', 'Realization')
  connect('s-intake-valuate', 'o-s-intake', 'o-s-valuate', 'Serving')
  connect('s-event-valuate', 'o-s-event', 'o-s-valuate', 'Triggering')
}
