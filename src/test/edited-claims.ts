import claimsArchimate from '@/io/fixtures/claims-platform.archimate?raw'
import { importArchimate } from '@/io/archimate-native'
import { defaultNodeSize } from '@/io/default-sizes'
import {
  absoluteBounds,
  type Bounds,
  type Element,
  type ElementNode,
  type ElementType,
  type Point,
  type RelationshipType,
  type View,
  type ViewConnection,
  type ViewNode,
  type Workspace,
} from '@/model'
import { ModelStore } from '@/store/model-store'
import {
  insertBendpoint,
  moveBendpoint,
  removeBendpoint,
  straightened,
} from '@/ui/views/bendpoints'
import { connectChoice } from '@/ui/views/connect'
import {
  newDrawingNode,
  newElement,
  newView,
  placement,
  toolSize,
  type Tool,
} from '@/ui/views/create'
import { withDrop } from '@/ui/views/drop'
import { copySelection, nextOffset, pasteInto, type MintKind } from '@/ui/views/clipboard'
import { magicEdit, magicMenu } from '@/ui/views/magic'
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

  // A relationship documented (#95): Archi has to read it back from our file.
  store.updateRelationship('r-handle-register', (relationship) => ({
    ...relationship,
    documentation: 'Every claim is registered before it is assessed.',
  }))

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

  // Bend-points (#133), through the canvas's own edits, one command each: two
  // added to a straight line, the second on the segment the first one made;
  // one route straightened; one corner moved; one of two removed.
  const bend = (id: string, change: (c: ViewConnection) => ViewConnection) =>
    store.updateConnection(view, id, change)
  bend('c-cust-as', (c) => insertBendpoint(c, 0, { x: 715, y: 470 }))
  bend('c-cust-as', (c) => insertBendpoint(c, 1, { x: 760.4, y: 470.6 }))
  bend('c-info-ins', straightened)
  bend('c-engine-claim', (c) => moveBendpoint(c, 0, { x: 700, y: 455 }))
  bend('c-split-pay', (c) => removeBendpoint(c, 0))
  // Where a line's label sits (#133), which the exchange format has no place for.
  bend('c-crm-cust', (c) => ({ ...c, appearance: { labelPosition: 'source' } }))

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
  pastes(store)
  return store.snapshot()
}

/**
 * Copy and paste (#137), as the canvas does them: a copy of the selection, and
 * a paste where the canvas was pressed, one command each. Archi's rule decides
 * what each paste draws. In the landscape, which draws the process, Paste makes
 * copies, and Paste Special draws the goal and its requirement again. In the
 * scratch view, which draws none of the cluster, Paste draws it again. Ids are
 * minted in order under a name for each paste, so every run makes the same ones.
 */
function pastes(store: ModelStore) {
  const paste = (
    name: string,
    from: string,
    selected: string[],
    into: string,
    pressed: Point,
    special: boolean,
  ) => {
    const snapshot = copySelection(store.view(from)!, selected, store)
    if (!snapshot) throw new Error(`copying ${selected} copied nothing`)
    const counts: Record<MintKind, number> = { node: 0, conn: 0, el: 0, rel: 0 }
    // The canvas's own paste (`ViewScreen`'s `pasteHere`), so the oracle holds its wiring.
    const made = pasteInto(store, into, snapshot, {
      offset: nextOffset(snapshot, { x: 0, y: 0 }, pressed),
      special,
      mint: (kind) => `${name}-${kind}-${++counts[kind]}`,
    })
    if (!made) throw new Error(`pasting ${selected} into ${into} pasted nothing`)
  }
  // Handle Claim, its five shapes and the five lines among them: copies.
  paste('copy', 'v-landscape', ['o-handle'], 'v-landscape', { x: 20, y: 1060 }, false)
  // The goal and its requirement, and the line between them: drawn again.
  paste('special', 'v-landscape', ['o-goal', 'o-req'], 'v-landscape', { x: 1240, y: 1060 }, true)
  // The cluster, what is nested in it, and the line the nesting hides: drawn again.
  paste('again', 'v-landscape', ['o-k8s'], 'v-scratch', { x: 40, y: 560 }, false)
}

/**
 * A view made from scratch (#130), as the editor makes one: in a new folder
 * of Views, with a viewpoint, and shapes placed where the palette's
 * `placement` puts them, so a shape placed inside a group is nested in it.
 * New elements and elements the model already holds, drawn and connected, and
 * one dropped from the tree with its relationships drawn, as the canvas's drop
 * draws them (#145).
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

  // Dropped from the model tree (#145): Rules Evaluation, drawn with a line
  // from each of the two drawings of the engine that is assigned to it.
  const rules: ElementNode = {
    id: 'o-s-rules',
    kind: 'element',
    element: 'af-rules',
    ...placement(
      store.view(id)!,
      { x: 190, y: 420 },
      defaultNodeSize('element', 'ApplicationFunction'),
      isJunction,
    ),
  }
  const lineIds = ['c-s-engine-rules', 'c-s-engine-2-rules']
  store.updateView(id, (v) =>
    withDrop(v, rules, store.relationshipsOf('af-rules'), () => {
      const next = lineIds.shift()
      if (!next) throw new Error('the drop drew more lines than it was given ids for')
      return next
    }),
  )
  if (lineIds.length) throw new Error(`the drop drew fewer lines than expected: ${lineIds}`)

  // The magic connector (#132): a gesture from a shape released on empty
  // canvas, the menu's own choice under the view's viewpoint, and the new
  // element, its relationship and both drawings as one command.
  const magic = (
    from: string,
    type: RelationshipType,
    target: ElementType,
    point: Point,
    ids: Record<'node' | 'rel' | 'conn', string>,
    element: Partial<Element>,
  ) => {
    const v = store.view(id)!
    const node = v.nodes.find((n) => n.id === from)
    const source = node?.kind === 'element' ? store.element(node.element) : undefined
    if (!source) throw new Error(`${from} draws no element`)
    const entry = magicMenu(store, source, v.viewpoint).find((e) => e.type === type)
    if (!entry?.groups.some((g) => g.types.includes(target))) {
      throw new Error(`the magic connector does not offer ${type} to a new ${target} from ${from}`)
    }
    const edit = magicEdit(
      v,
      from,
      type,
      target,
      point,
      isJunction,
      (prefix) => ids[prefix],
      element,
    )
    if (!edit) throw new Error(`the magic connector made nothing from ${from}`)
    store.updateViewAdding(id, () => edit.view, {
      elements: [edit.element],
      relationships: [edit.relationship],
    })
  }
  magic(
    'o-s-event',
    'Triggering',
    'BusinessProcess',
    { x: 760, y: 60 },
    { node: 'o-s-check', rel: 'r-s-event-check', conn: 'c-s-event-check' },
    { id: 'bp-check-cover', name: 'Check cover' },
  )
  magic(
    'o-s-intake',
    'Serving',
    'Junction',
    { x: 760, y: 300 },
    { node: 'o-s-serve', rel: 'r-s-intake-serve', conn: 'c-s-intake-serve' },
    { id: 'j-serve' },
  )
}
