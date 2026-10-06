import { describe, expect, it } from 'vitest'
import type { View, Workspace } from '@/model'
import { toCanonicalJson } from '@/io/canonical-json'
import { drawnWorkspace } from '@/test/fixtures'
import { ModelStore } from './model-store'

function store(workspace: Workspace = drawnWorkspace()): ModelStore {
  return new ModelStore(workspace)
}

/**
 * The model as canonical JSON — equality as ADR 0004 defines it. Undo re-adds
 * what it restores, so Map iteration order changes while the model does not.
 */
function model(s: ModelStore): string {
  return toCanonicalJson(s.snapshot())
}

function nodeIds(view: View | undefined): string[] {
  return view?.nodes.map((node) => node.id).sort() ?? []
}

function connectionIds(view: View | undefined): string[] {
  return view?.connections.map((connection) => connection.id).sort() ?? []
}

describe('deleting what a view draws (#75)', () => {
  it('removes an element drawn in two views from both, with its connections, in one undoable step', () => {
    const s = store()
    const before = model(s)
    expect(
      s
        .viewsDrawing('app-claims')
        .map((v) => v.id)
        .sort(),
    ).toEqual(['view-detail', 'view-landscape'])

    s.removeElement('app-claims')

    expect(s.element('app-claims')).toBeUndefined()
    expect(nodeIds(s.view('view-landscape'))).toEqual([
      'g-claims',
      'n-k8s',
      'n-note',
      'n-proc',
      'n-ref',
    ])
    expect(nodeIds(s.view('view-detail'))).toEqual(['d-obj'])
    // Every connection that touched it: two drawn relationships and the note's line.
    expect(connectionIds(s.view('view-landscape'))).toEqual([])
    expect(connectionIds(s.view('view-detail'))).toEqual([])
    expect(s.viewsDrawing('app-claims')).toEqual([])
    expect(s.history).toHaveLength(1)

    s.undo()
    expect(model(s)).toBe(before)
    expect(s.viewsDrawing('app-claims')).toHaveLength(2)
    expect(s.canUndo).toBe(false)

    s.redo()
    expect(nodeIds(s.view('view-detail'))).toEqual(['d-obj'])
  })

  it("removes a relationship's drawings with it, and undo puts them back", () => {
    const s = store()
    const before = model(s)
    s.removeRelationship('rel-app-proc')
    expect(connectionIds(s.view('view-landscape'))).toEqual(['c-k8s', 'c-note'])
    expect(nodeIds(s.view('view-landscape'))).toContain('n-app')
    expect(s.viewsDrawingRelationship('rel-app-proc')).toEqual([])
    s.undo()
    expect(model(s)).toBe(before)
  })

  it('removes the references other views hold to a deleted view', () => {
    const s = store()
    const before = model(s)
    expect(s.viewsReferencing('view-detail').map((v) => v.id)).toEqual(['view-landscape'])
    s.removeView('view-detail')
    expect(s.view('view-detail')).toBeUndefined()
    expect(nodeIds(s.view('view-landscape'))).not.toContain('n-ref')
    expect(nodeIds(s.view('view-landscape'))).toContain('n-app')
    s.undo()
    expect(model(s)).toBe(before)
  })

  it('describes a deletion in history by what it deleted, not as a batch', () => {
    const s = store()
    s.removeElement('app-claims')
    expect(s.history[0]?.label).toBe('Deleted “Claim Handling Engine” and 3 relations')
  })
})

describe('editing a view through the command stack (#75)', () => {
  it('adds, moves and removes a node, each one undo step', () => {
    const s = store()
    const original = s.view('view-detail')
    s.addNode('view-detail', {
      id: 'd-k8s',
      kind: 'element',
      element: 'tec-k8s',
      bounds: { x: 0, y: 200, width: 120, height: 55 },
    })
    expect(
      s
        .viewsDrawing('tec-k8s')
        .map((v) => v.id)
        .sort(),
    ).toEqual(['view-detail', 'view-landscape'])
    expect(s.history.at(-1)?.label).toBe('Added 1 node to “Claim data”')

    s.updateNode('view-detail', 'd-k8s', (node) => ({
      ...node,
      bounds: { ...node.bounds, x: 300 },
    }))
    expect(s.view('view-detail')?.nodes.find((n) => n.id === 'd-k8s')?.bounds.x).toBe(300)

    s.removeNode('view-detail', 'd-k8s')
    expect(s.viewsDrawing('tec-k8s').map((v) => v.id)).toEqual(['view-landscape'])

    s.undo()
    s.undo()
    s.undo()
    expect(s.view('view-detail')).toEqual(original)
    expect(s.viewsDrawing('tec-k8s').map((v) => v.id)).toEqual(['view-landscape'])
  })

  it('removing a container keeps the nodes inside it, lifted to the top level', () => {
    const s = store()
    s.removeNode('view-landscape', 'g-claims')
    const view = s.view('view-landscape')
    expect(nodeIds(view)).toEqual(['n-app', 'n-k8s', 'n-note', 'n-proc', 'n-ref'])
    expect(view?.nodes.find((n) => n.id === 'n-proc')?.parent).toBeUndefined()
    // Its connections did not end on the group, so they all survive.
    expect(connectionIds(view)).toEqual(['c-k8s', 'c-note', 'c-serving'])
  })

  it('adds and removes a connection', () => {
    const s = store()
    s.removeConnection('view-landscape', 'c-serving')
    expect(s.viewsDrawingRelationship('rel-app-proc')).toEqual([])
    expect(s.history.at(-1)?.label).toBe('Removed 1 connection from “Claims landscape”')
    s.addConnection('view-landscape', {
      id: 'c-serving-2',
      kind: 'relationship',
      relationship: 'rel-app-proc',
      source: 'n-app',
      target: 'n-proc',
    })
    expect(s.viewsDrawingRelationship('rel-app-proc').map((v) => v.id)).toEqual(['view-landscape'])
  })

  it('ignores an edit to a node or connection the view does not have', () => {
    const s = store()
    s.updateNode('view-detail', 'nope', (node) => node)
    s.removeNode('view-detail', 'nope')
    s.updateConnection('view-detail', 'nope', (connection) => connection)
    s.removeConnection('view-detail', 'nope')
    expect(s.history).toEqual([])
    expect(s.dirty).toBe(0)
  })

  it('adds and removes a whole view', () => {
    const s = store()
    s.addView({ id: 'view-new', name: 'Blank', properties: {}, nodes: [], connections: [] })
    expect(s.viewCount).toBe(3)
    expect(s.history.at(-1)?.label).toBe('Created view “Blank”')
    s.undo()
    expect(s.view('view-new')).toBeUndefined()
  })
})

describe('folders (#75)', () => {
  it('deleting a folder moves its contents up a level, in one undoable step', () => {
    const s = store()
    const before = model(s)
    s.removeFolder('f-core')
    expect(s.folder('f-core')).toBeUndefined()
    expect(s.element('proc-claim')?.folder).toBe('f-business')
    expect(s.history).toHaveLength(1)
    s.undo()
    expect(model(s)).toBe(before)
  })

  it('deleting a top-level folder puts its subfolders at the top of its group, and its members in the group', () => {
    const s = store()
    s.removeFolder('f-business')
    expect(s.folder('f-core')).toEqual({
      id: 'f-core',
      name: 'Core processes',
      documentation: 'The money-makers.',
      root: 'business',
    })
    s.removeFolder('f-apps')
    expect(s.element('app-claims')?.folder).toBeUndefined()
    expect(s.element('app-claims')?.name).toBe('Claim Handling Engine')
    s.removeFolder('f-views')
    expect(s.view('view-landscape')?.folder).toBeUndefined()
    s.removeFolder('f-relations')
    expect(s.relationship('rel-app-proc')?.folder).toBeUndefined()
  })

  it('moving an element between folders is one undoable update', () => {
    const s = store()
    s.addFolder({ id: 'f-legacy', name: 'Legacy', root: 'application' })
    s.updateElement('app-claims', (element) => ({ ...element, folder: 'f-legacy' }))
    expect(s.element('app-claims')?.folder).toBe('f-legacy')
    s.undo()
    expect(s.element('app-claims')?.folder).toBe('f-apps')
  })

  it('renames and moves folders through the command stack', () => {
    const s = store()
    s.updateFolder('f-core', (folder) => ({ ...folder, name: 'Core' }))
    expect(s.history.at(-1)?.label).toBe('Renamed folder “Core processes” to “Core”')
    s.undo()
    expect(s.folder('f-core')?.name).toBe('Core processes')
  })
})

describe('moveToFolder (#80)', () => {
  it('moves an element in one undoable command, and canonical JSON says so deterministically', () => {
    const s = store()
    s.addFolder({ id: 'f-legacy', name: 'Legacy', root: 'application' })
    const before = model(s)
    const history = s.history.length

    expect(s.moveToFolder('element', 'app-claims', { folder: 'f-legacy' })).toBe(true)
    expect(s.history).toHaveLength(history + 1)
    expect(s.history.at(-1)?.label).toBe('Moved “Claim Handling Engine”')
    const after = model(s)
    expect(after).not.toBe(before)
    const element = JSON.parse(after).elements.find((e: { id: string }) => e.id === 'app-claims')
    expect(element.folder).toBe('f-legacy')

    // Undo is byte-identical to before, redo to after.
    s.undo()
    expect(model(s)).toBe(before)
    s.redo()
    expect(model(s)).toBe(after)

    // And the same move from the same start always serialises the same.
    const again = store()
    again.addFolder({ id: 'f-legacy', name: 'Legacy', root: 'application' })
    again.moveToFolder('element', 'app-claims', { folder: 'f-legacy' })
    expect(model(again)).toBe(after)
  })

  it('moves to a group by dropping the folder field, not by storing the group', () => {
    const s = store()
    expect(s.moveToFolder('element', 'app-claims', { root: 'application' })).toBe(true)
    expect(s.element('app-claims')).not.toHaveProperty('folder')
    expect(s.moveToFolder('relationship', 'rel-app-proc', { root: 'relations' })).toBe(true)
    expect(s.relationship('rel-app-proc')).not.toHaveProperty('folder')
    expect(s.moveToFolder('view', 'view-landscape', { root: 'views' })).toBe(true)
    expect(s.view('view-landscape')).not.toHaveProperty('folder')
    expect(s.history.at(-1)?.label).toBe('Moved view “Claims landscape”')
  })

  it('moves a folder between parent and group, with exactly one of the two set', () => {
    const s = store()
    expect(s.moveToFolder('folder', 'f-core', { root: 'business' })).toBe(true)
    expect(s.folder('f-core')).toMatchObject({ root: 'business' })
    expect(s.folder('f-core')).not.toHaveProperty('parent')
    expect(s.moveToFolder('folder', 'f-core', { folder: 'f-business' })).toBe(true)
    expect(s.folder('f-core')).toMatchObject({ parent: 'f-business' })
    expect(s.folder('f-core')).not.toHaveProperty('root')
    expect(s.history.at(-1)?.label).toBe('Moved folder “Core processes”')
  })

  it('refuses a move it cannot make, and dispatches nothing', () => {
    const s = store()
    const before = model(s)
    // Another group.
    expect(s.moveToFolder('element', 'app-claims', { folder: 'f-core' })).toBe(false)
    expect(s.moveToFolder('element', 'app-claims', { root: 'business' })).toBe(false)
    expect(s.moveToFolder('relationship', 'rel-app-proc', { root: 'views' })).toBe(false)
    expect(s.moveToFolder('view', 'view-landscape', { folder: 'f-relations' })).toBe(false)
    expect(s.moveToFolder('folder', 'f-core', { root: 'application' })).toBe(false)
    // Into itself, or into its own subfolder.
    expect(s.moveToFolder('folder', 'f-business', { folder: 'f-business' })).toBe(false)
    expect(s.moveToFolder('folder', 'f-business', { folder: 'f-core' })).toBe(false)
    // Unknown destination or subject.
    expect(s.moveToFolder('element', 'app-claims', { folder: 'f-gone' })).toBe(false)
    expect(s.moveToFolder('element', 'no-such-element', { root: 'application' })).toBe(false)
    expect(s.history).toHaveLength(0)
    expect(model(s)).toBe(before)
  })

  it('puts nothing on the undo stack for a move to where the object already is', () => {
    const s = store()
    expect(s.moveToFolder('element', 'app-claims', { folder: 'f-apps' })).toBe(true)
    expect(s.moveToFolder('folder', 'f-core', { folder: 'f-business' })).toBe(true)
    expect(s.moveToFolder('folder', 'f-business', { root: 'business' })).toBe(true)
    expect(s.history).toHaveLength(0)
  })
})

describe('a view the validator would flag (#75)', () => {
  it('still loses the drawing of a relationship deleted with its element', () => {
    const workspace = drawnWorkspace()
    // view-detail draws rel-k8s-app between the wrong nodes, and never draws tec-k8s.
    const detail = workspace.views.find((v) => v.id === 'view-detail')
    detail?.connections.push({
      id: 'd-wrong',
      kind: 'relationship',
      relationship: 'rel-k8s-app',
      source: 'd-app',
      target: 'd-obj',
    })
    const s = store(workspace)
    const before = model(s)
    s.removeElement('tec-k8s')
    expect(connectionIds(s.view('view-detail'))).toEqual(['d-access'])
    s.undo()
    expect(model(s)).toBe(before)
  })
})

describe('updateView keeps what an edit does not touch (#128)', () => {
  it('keeps the identity of every node and connection an edit does not touch', () => {
    const s = store()
    const before = s.view('view-detail')!
    s.updateNode('view-detail', 'd-app', (node) => ({
      ...node,
      bounds: { ...node.bounds, x: node.bounds.x + 5 },
    }))
    const after = s.view('view-detail')!
    expect(after).not.toBe(before)
    expect(after.nodes.length).toBeGreaterThan(1)
    for (const node of after.nodes) {
      const old = before.nodes.find((n) => n.id === node.id)
      if (node.id === 'd-app') expect(node).not.toBe(old)
      else expect(node, node.id).toBe(old)
    }
    expect(after.connections).toBe(before.connections)
  })

  it('records nothing when a change returns the view it was given', () => {
    const s = store()
    const version = s.version
    expect(s.updateView('view-detail', (view) => view)).toBe(s.view('view-detail'))
    expect(s.version).toBe(version)
    expect(s.canUndo).toBe(false)
  })

  it('refuses, in tests, a change that mutates the view instead of returning a new one', () => {
    const s = store()
    const before = structuredClone(s.view('view-detail')!)
    expect(() =>
      s.updateView('view-detail', (view) => {
        view.nodes[0]!.bounds.x += 1
        return { ...view }
      }),
    ).toThrow(TypeError)
    expect(s.view('view-detail')).toEqual(before)
    expect(s.canUndo).toBe(false)
  })
})
