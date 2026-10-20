import viewObjects from '@/io/fixtures/view-objects.archimate?raw'
import { importArchimate } from '@/io/archimate-native'
import { defaultNodeSize } from '@/io/default-sizes'
import type { Element, Point, ViewNode, Workspace } from '@/model'
import { ModelStore } from '@/store/model-store'
import { newDrawingNode, newElement, placement, toolSize, type Tool } from '@/ui/views/create'

/**
 * Notes, groups, view references and legends after an editing session (#134):
 * the source of `src/io/fixtures/view-objects-edited.xml`, which Archi 5.10
 * imports and saves as `view-objects-edited.archi.archimate` and exports again
 * as `view-objects-edited.archi.xml` (the #127 oracle). It starts from Archi's
 * own save of one of each (`view-objects.archimate`), and every edit goes
 * through the store, one command each, placed by the editor's own functions.
 *
 * Ids are fixed, not generated, so the exported file is the same on every run.
 *
 *   npx vite-node scripts/fixtures/build-edited-view-objects.ts
 *   scripts/fixtures/archi-roundtrip.sh src/io/fixtures/view-objects-edited.xml …
 */
export function editedViewObjects(): Workspace {
  const imported = importArchimate(viewObjects).workspace
  if (!imported) throw new Error('view-objects.archimate did not import')
  const store = new ModelStore(imported)
  const isJunction = (elementId: string) => store.element(elementId)?.type === 'Junction'

  /** Place what a palette tool makes, top-left at `point`, with a fixed id. */
  const place = (viewId: string, id: string, tool: Tool, point: Point) => {
    const spot = placement(store.view(viewId)!, point, toolSize(tool), isJunction)
    if (tool.kind === 'element') throw new Error('elements are placed with placeElement')
    store.addNode(viewId, { ...newDrawingNode(tool, spot), id } as ViewNode)
  }
  const edit = (viewId: string, id: string, change: (node: ViewNode) => ViewNode) =>
    store.updateNode(viewId, id, change)

  // The existing note, group and legend, edited.
  edit('v-main', 'o-note', (n) => (n.kind === 'note' ? { ...n, text: 'Edited\nthree\nlines' } : n))
  edit('v-main', 'o-group', (n) =>
    n.kind === 'group'
      ? { ...n, name: 'Front of house', documentation: 'Line one.\nLine two.' }
      : n,
  )

  // New ones, each placed and then typed into, one command each.
  place('v-main', 'o-new-note', { kind: 'note' }, { x: 24, y: 320 })
  edit('v-main', 'o-new-note', (n) =>
    n.kind === 'note' ? { ...n, text: 'A note made here,\non two lines' } : n,
  )
  place('v-main', 'o-new-group', { kind: 'group' }, { x: 24, y: 440 })
  edit('v-main', 'o-new-group', (n) =>
    n.kind === 'group' ? { ...n, name: 'Back office', documentation: 'Made in Archipelago.' } : n,
  )
  // A note placed inside the new group, relative to it.
  place('v-main', 'o-new-note-in-group', { kind: 'note' }, { x: 64, y: 480 })
  edit('v-main', 'o-new-note-in-group', (n) => (n.kind === 'note' ? { ...n, text: 'Inside' } : n))
  place('v-main', 'o-new-legend', { kind: 'legend' }, { x: 720, y: 24 })

  // An element of a type the view did not draw, so the legends list it.
  const goal: Element = { ...newElement({ kind: 'element', type: 'Goal' }), id: 'e-goal' }
  store.addElementInView('v-main', goal, {
    id: 'o-goal',
    kind: 'element',
    element: goal.id,
    ...placement(
      store.view('v-main')!,
      { x: 480, y: 200 },
      defaultNodeSize('element', 'Goal'),
      isJunction,
    ),
  })

  // View references, as a drop from the model tree draws them.
  const reference = (viewId: string, id: string, target: string, point: Point) =>
    store.addNode(viewId, {
      id,
      kind: 'view-ref',
      view: target,
      ...placement(store.view(viewId)!, point, defaultNodeSize('view-ref'), isJunction),
    })
  reference('v-detail', 'o-ref-main', 'v-main', { x: 24, y: 160 })
  reference('v-main', 'o-ref-detail-in-group', 'v-detail', { x: 300, y: 480 })

  // A line from the new note to the new legend: Archi draws one from any note.
  store.addConnection('v-main', {
    id: 'c-note-legend',
    kind: 'line',
    source: 'o-new-note',
    target: 'o-new-legend',
  })
  return store.snapshot()
}
