import claimsArchimate from '@/io/fixtures/claims-platform.archimate?raw'
import { importArchimate } from '@/io/archimate-native'
import { absoluteBounds, type Bounds, type RelationshipType, type Workspace } from '@/model'
import { ModelStore } from '@/store/model-store'
import { connectChoice } from '@/ui/views/connect'
import { moveSelection, resizeNode } from '@/ui/views/edit'

/**
 * The claims landscape after an editing session (#127, #128, #129): the source of
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

  return store.snapshot()
}
