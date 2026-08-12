import { beforeEach, describe, expect, it } from 'vitest'
import { emptyWorkspace, type Element, type Relationship } from '@/model'
import { smallWorkspace } from '@/test/fixtures'
import { ModelStore } from './model-store'

function store() {
  return new ModelStore(smallWorkspace())
}

const NEW_APP: Element = {
  id: 'app-portal',
  type: 'ApplicationComponent',
  name: 'Customer Web Portal',
  properties: {},
}

const NEW_REL: Relationship = {
  id: 'rel-portal-proc',
  type: 'Serving',
  source: 'app-portal',
  target: 'proc-claim',
  properties: {},
}

describe('reading the model', () => {
  let s: ModelStore
  beforeEach(() => {
    s = store()
  })

  it('indexes elements and relationships by id', () => {
    expect(s.elementCount).toBe(5)
    expect(s.relationshipCount).toBe(4)
    expect(s.element('app-claims')?.name).toBe('Claim Handling Engine')
    expect(s.relationship('rel-app-obj')?.type).toBe('Access')
    expect(s.element('nope')).toBeUndefined()
  })

  it('answers adjacency queries in both directions', () => {
    expect(
      s
        .outgoing('app-claims')
        .map((r) => r.id)
        .toSorted(),
    ).toEqual(['rel-app-obj', 'rel-app-proc'])
    expect(s.incoming('app-claims').map((r) => r.id)).toEqual(['rel-k8s-app'])
    expect(s.relationCount('app-claims')).toBe(3)
    expect(
      s
        .neighbours('app-claims')
        .map((e) => e.id)
        .toSorted(),
    ).toEqual(['obj-claim', 'proc-claim', 'tec-k8s'])
  })

  it('indexes by type', () => {
    expect(
      s
        .relationshipsOfType('Serving')
        .map((r) => r.id)
        .toSorted(),
    ).toEqual(['rel-app-proc', 'rel-k8s-app'])
    expect(s.elementsOfType('ApplicationComponent').map((e) => e.id)).toEqual(['app-claims'])
    expect(s.elementsOfType('Gap')).toEqual([])
  })

  it('derives completeness and model health', () => {
    expect(s.completeness('app-claims')).toBe(100)
    expect(s.completeness('cap-claim')).toBe(100)
    // Untagged, undocumented process and data object drag the mean down.
    expect(s.health()).toBeLessThan(100)
    expect(s.health()).toBeGreaterThan(0)
  })
})

describe('mutating through commands', () => {
  let s: ModelStore
  beforeEach(() => {
    s = store()
  })

  it('adds an element and keeps the type index in step', () => {
    s.addElement(NEW_APP)
    expect(s.elementCount).toBe(6)
    expect(
      s
        .elementsOfType('ApplicationComponent')
        .map((e) => e.id)
        .toSorted(),
    ).toEqual(['app-claims', 'app-portal'])
    expect(s.dirty).toBe(1)
  })

  it('updates an element without disturbing its relationships', () => {
    s.updateElement('app-claims', (element) => ({ ...element, name: 'Claims Engine' }))
    expect(s.element('app-claims')?.name).toBe('Claims Engine')
    expect(s.relationCount('app-claims')).toBe(3)
  })

  it('cascades relationship deletion when an element goes, and restores it on undo', () => {
    s.removeElement('app-claims')
    expect(s.element('app-claims')).toBeUndefined()
    expect(s.relationshipCount).toBe(1) // only proc → cap survives
    expect(s.relationCount('obj-claim')).toBe(0)

    s.undo()
    expect(s.element('app-claims')?.name).toBe('Claim Handling Engine')
    expect(s.relationshipCount).toBe(4)
    expect(s.relationCount('app-claims')).toBe(3)
    expect(
      s
        .outgoing('app-claims')
        .map((r) => r.id)
        .toSorted(),
    ).toEqual(['rel-app-obj', 'rel-app-proc'])
  })

  it('adds and removes relationships, updating both adjacency indexes', () => {
    s.addElement(NEW_APP)
    s.addRelationship(NEW_REL)
    expect(s.outgoing('app-portal').map((r) => r.id)).toEqual(['rel-portal-proc'])
    expect(
      s
        .incoming('proc-claim')
        .map((r) => r.id)
        .toSorted(),
    ).toEqual(['rel-app-proc', 'rel-portal-proc'])

    s.removeRelationship('rel-portal-proc')
    expect(s.outgoing('app-portal')).toEqual([])
    expect(s.incoming('proc-claim').map((r) => r.id)).toEqual(['rel-app-proc'])
  })

  it('re-indexes when a relationship is repointed', () => {
    s.updateRelationship('rel-app-proc', (relationship) => ({
      ...relationship,
      target: 'cap-claim',
    }))
    expect(s.incoming('proc-claim')).toEqual([])
    expect(
      s
        .incoming('cap-claim')
        .map((r) => r.id)
        .toSorted(),
    ).toEqual(['rel-app-proc', 'rel-proc-cap'])
  })

  it('groups a transaction into one undoable step', () => {
    s.transaction((draft) => {
      draft.addElement(NEW_APP)
      draft.addRelationship(NEW_REL)
    })
    expect(s.elementCount).toBe(6)
    expect(s.relationshipCount).toBe(5)
    expect(s.dirty).toBe(1)

    s.undo()
    expect(s.elementCount).toBe(5)
    expect(s.relationshipCount).toBe(4)
  })

  it('ignores a transaction that changes nothing', () => {
    expect(s.transaction(() => {})).toBeUndefined()
    expect(s.dirty).toBe(0)
    expect(s.canUndo).toBe(false)
  })
})

describe('undo and redo', () => {
  let s: ModelStore
  beforeEach(() => {
    s = store()
  })

  it('walks back and forward across every mutation kind', () => {
    s.addElement(NEW_APP)
    s.addRelationship(NEW_REL)
    s.updateElement('app-portal', (element) => ({ ...element, name: 'Portal' }))
    s.removeRelationship('rel-app-obj')

    expect(s.elementCount).toBe(6)
    expect(s.relationshipCount).toBe(4)
    expect(s.element('app-portal')?.name).toBe('Portal')

    s.undo() // un-remove the access relationship
    expect(s.relationship('rel-app-obj')).toBeDefined()
    s.undo() // un-rename
    expect(s.element('app-portal')?.name).toBe('Customer Web Portal')
    s.undo() // un-add relationship
    expect(s.relationship('rel-portal-proc')).toBeUndefined()
    s.undo() // un-add element
    expect(s.element('app-portal')).toBeUndefined()
    expect(s.canUndo).toBe(false)

    s.redo()
    expect(s.element('app-portal')?.name).toBe('Customer Web Portal')
    s.redo()
    expect(s.relationship('rel-portal-proc')).toBeDefined()
    s.redo()
    expect(s.element('app-portal')?.name).toBe('Portal')
    s.redo()
    expect(s.relationship('rel-app-obj')).toBeUndefined()
    expect(s.canRedo).toBe(false)
  })

  it('drops the redo stack once a new edit lands', () => {
    s.addElement(NEW_APP)
    s.undo()
    expect(s.canRedo).toBe(true)
    s.updateElement('app-claims', (element) => ({ ...element, name: 'Renamed' }))
    expect(s.canRedo).toBe(false)
  })

  it('undoes a rename of the workspace itself', () => {
    s.rename('Client engagement')
    expect(s.name).toBe('Client engagement')
    s.undo()
    expect(s.name).toBe('ArchiSurance')
  })
})

describe('save state and history', () => {
  it('counts unsaved changes and clears on save', () => {
    const s = store()
    expect(s.dirty).toBe(0)
    s.addElement(NEW_APP)
    s.updateElement('app-portal', (element) => ({ ...element, name: 'Portal' }))
    expect(s.dirty).toBe(2)
    // Undo is itself an unsaved change against the file on disk.
    s.undo()
    expect(s.dirty).toBe(3)
    s.markSaved()
    expect(s.dirty).toBe(0)
  })

  it('records a readable history entry per change', () => {
    const s = store()
    s.addElement(NEW_APP)
    s.updateElement('app-portal', (element) => ({ ...element, name: 'Portal' }))
    expect(s.history.map((record) => record.label)).toEqual([
      'Created Application Component “Customer Web Portal”',
      'Updated name of “Portal”',
    ])
    expect(s.history[0]?.author).toBe('you')
    expect(s.history[0]?.at).toBeGreaterThan(0)
  })

  it('filters history to the element the fact sheet is showing', () => {
    const s = store()
    s.addElement(NEW_APP)
    s.updateElement('app-claims', (element) => ({ ...element, name: 'Claims' }))
    expect(s.historyFor('app-claims').map((r) => r.label)).toEqual(['Updated name of “Claims”'])
    expect(s.historyFor('app-portal')).toHaveLength(1)
  })

  it('notifies subscribers with a rising version', () => {
    const s = store()
    const seen: number[] = []
    const unsubscribe = s.subscribe(() => seen.push(s.version))
    s.addElement(NEW_APP)
    s.undo()
    unsubscribe()
    s.redo()
    expect(seen).toEqual([1, 2])
  })

  it('replaces the workspace on import without leaving stale undo history', () => {
    const s = store()
    s.addElement(NEW_APP)
    s.replaceWorkspace(emptyWorkspace('ws-2', 'Fresh'), { markClean: true })
    expect(s.elementCount).toBe(0)
    expect(s.canUndo).toBe(false)
    expect(s.dirty).toBe(0)
    expect(s.name).toBe('Fresh')
  })

  it('restarts the unsaved count on replace rather than carrying it over', () => {
    const s = store()
    s.addElement(NEW_APP)
    s.updateElement('app-portal', (element) => ({ ...element, name: 'Portal' }))
    expect(s.dirty).toBe(2)
    // Those two changes belonged to a model that is no longer loaded; counting
    // them against the incoming one would attribute another workspace's unsaved
    // work to this one.
    s.replaceWorkspace(emptyWorkspace('ws-2', 'Fresh'), { markClean: false })
    expect(s.dirty).toBe(1)
  })

  it('round-trips through a snapshot', () => {
    const s = store()
    s.addElement(NEW_APP)
    const snapshot = s.snapshot()
    const restored = new ModelStore(snapshot)
    expect(restored.elementCount).toBe(6)
    expect(restored.relationCount('app-claims')).toBe(3)
    expect(restored.dirty).toBe(0)
  })
})
