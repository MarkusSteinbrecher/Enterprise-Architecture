import claimsArchimate from '@/io/fixtures/claims-platform.archimate?raw'
import { importArchimate } from '@/io/archimate-native'
import { absoluteBounds, type Bounds, type Workspace } from '@/model'
import { ModelStore } from '@/store/model-store'
import { moveSelection, resizeNode } from '@/ui/views/edit'

/**
 * The claims landscape after an editing session (#127): the source of
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

  return store.snapshot()
}
