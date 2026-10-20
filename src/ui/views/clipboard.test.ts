import { describe, expect, it, vi } from 'vitest'
import claimsXml from '@/io/fixtures/claims-platform.xml?raw'
import { importExchangeXml } from '@/io'
import { toCanonicalJson } from '@/io/canonical-json'
import { absoluteBounds, type View, type ViewNode } from '@/model'
import { ModelStore } from '@/store'
import {
  COPY_SUFFIX,
  Clipboard,
  PASTE_STEP,
  clipboardChord,
  clipboardFor,
  copySelection,
  nextOffset,
  pasteInto,
  pasteSnapshot,
  pastesCopies,
  type MintKind,
  type Snapshot,
} from './clipboard'

/**
 * Copy and paste (#137), against Archi 5.10's rule as posted on the issue:
 * `CopySnapshot`, `PasteAction` and `PasteSpecialAction` at `release_5.10.0`.
 * The landscape's Handle Claim process holds five shapes joined by five
 * connections, and two connections run from it, or from one of its shapes, to
 * shapes outside it.
 */

const LANDSCAPE = 'v-landscape'
/** The claims model's empty view: it draws none of what the landscape draws. */
const EMPTY = 'v-empty'

function claims() {
  return new ModelStore(importExchangeXml(claimsXml, 'claims-platform.xml').workspace!)
}

/** Ids in order, by kind, so a test can say which id went where. */
function counter() {
  const counts: Record<MintKind, number> = { node: 0, conn: 0, el: 0, rel: 0 }
  return (kind: MintKind) => `${kind}-new-${++counts[kind]}`
}

const view = (store: ModelStore, id = LANDSCAPE): View => store.view(id)!
const copy = (store: ModelStore, ids: string[], from = LANDSCAPE): Snapshot =>
  copySelection(view(store, from), ids, store)!
const ids = (items: readonly { id: string }[]) => items.map((item) => item.id)

describe('copying a selection (#137, CopySnapshot)', () => {
  it('copies nothing when no shape is selected, even with a connection selected', () => {
    const store = claims()
    expect(copySelection(view(store), [], store)).toBeUndefined()
    // Archi's Copy needs a shape; a connection's id is no shape's.
    expect(copySelection(view(store), ['c-register-accept'], store)).toBeUndefined()
  })

  it('copies a selected shape with everything nested in it, selected or not', () => {
    const store = claims()
    const snapshot = copy(store, ['o-handle'])
    expect(ids(snapshot.nodes)).toEqual([
      'o-handle',
      'o-register',
      'o-accept',
      'o-split',
      'o-valuate',
      'o-pay',
    ])
  })

  it('copies a shape once when its ancestor is selected too', () => {
    const store = claims()
    const snapshot = copy(store, ['o-register', 'o-handle'])
    expect(ids(snapshot.nodes).filter((id) => id === 'o-register')).toHaveLength(1)
    expect(snapshot.nodes.find((n) => n.id === 'o-register')!.parent).toBe('o-handle')
  })

  it('lifts a top-level shape to absolute bounds and keeps nested ones relative', () => {
    const store = claims()
    const snapshot = copy(store, ['o-handle'])
    const handle = snapshot.nodes.find((n) => n.id === 'o-handle')!
    expect(handle.parent).toBeUndefined()
    expect(handle.bounds).toEqual(absoluteBounds(view(store), 'o-handle'))
    const register = snapshot.nodes.find((n) => n.id === 'o-register')!
    expect(register.bounds).toEqual(view(store).nodes.find((n) => n.id === 'o-register')!.bounds)
    expect(snapshot.origin).toEqual({ x: handle.bounds.x, y: handle.bounds.y })
  })

  it('puts the origin at the top-left of all the top-level shapes', () => {
    const store = claims()
    const goal = absoluteBounds(view(store), 'o-goal')!
    const customer = absoluteBounds(view(store), 'o-customer')!
    const snapshot = copy(store, ['o-goal', 'o-customer'])
    expect(snapshot.origin).toEqual({
      x: Math.min(goal.x, customer.x),
      y: Math.min(goal.y, customer.y),
    })
  })

  it('copies a connection when both its ends are copied, whether it was selected or not', () => {
    const store = claims()
    const snapshot = copy(store, ['o-handle'])
    expect(ids(snapshot.connections)).toEqual([
      'c-register-accept',
      'c-accept-split',
      'c-split-valuate',
      'c-split-pay',
      'c-valuate-pay',
    ])
    // c-damage-register and c-handle-reg each have one end outside the copy.
    expect(ids(snapshot.connections)).not.toContain('c-damage-register')
    expect(ids(snapshot.connections)).not.toContain('c-handle-reg')
  })

  it('holds the elements and relationships as they were at the copy', () => {
    const store = claims()
    const snapshot = copy(store, ['o-handle'])
    store.updateElement('bp-register', (e) => ({ ...e, name: 'Renamed after the copy' }))
    expect(snapshot.elements.get('bp-register')!.name).toBe('Register')
    expect([...snapshot.relationships.keys()]).toContain('r-register-accept')
    expect(snapshot.workspace).toBe(store.id)
  })
})

describe('reference or copy (#137, needsNewArchimateConcepts)', () => {
  it('makes copies in the view it was copied from, where the elements are drawn', () => {
    const store = claims()
    expect(pastesCopies(copy(store, ['o-handle']), view(store), store, false)).toBe(true)
  })

  it('draws the same elements again in a view that draws none of them', () => {
    const store = claims()
    expect(pastesCopies(copy(store, ['o-handle']), view(store, EMPTY), store, false)).toBe(false)
  })

  it('makes copies when any one copied element is already drawn there', () => {
    const store = claims()
    const snapshot = copy(store, ['o-handle'])
    store.addNode(EMPTY, {
      id: 'o-pay-again',
      kind: 'element',
      element: 'bp-pay',
      bounds: { x: 0, y: 0, width: 120, height: 55 },
    })
    expect(pastesCopies(snapshot, view(store, EMPTY), store, false)).toBe(true)
  })

  it('makes copies when a copied element has left the model', () => {
    const store = claims()
    // The goal alone: no copied relationship goes with it.
    const snapshot = copy(store, ['o-goal'])
    expect(snapshot.relationships.size).toBe(0)
    expect(pastesCopies(snapshot, view(store, EMPTY), store, false)).toBe(false)
    store.removeElement('g-settle')
    expect(pastesCopies(snapshot, view(store, EMPTY), store, false)).toBe(true)
  })

  it('makes copies when a copied relationship has left the model and its elements stayed', () => {
    const store = claims()
    const snapshot = copy(store, ['o-handle'])
    store.removeRelationship('r-valuate-pay')
    expect(store.element('bp-valuate')).toBeDefined()
    expect(pastesCopies(snapshot, view(store, EMPTY), store, false)).toBe(true)
  })

  describe('Paste Special, with Archi’s default (always a reference)', () => {
    it('draws the same elements again even where they are drawn', () => {
      const store = claims()
      expect(pastesCopies(copy(store, ['o-handle']), view(store), store, true)).toBe(false)
    })

    it('makes copies when a copied element has left the model, where Archi would draw nothing', () => {
      const store = claims()
      const snapshot = copy(store, ['o-goal'])
      expect(pastesCopies(snapshot, view(store), store, true)).toBe(false)
      store.removeElement('g-settle')
      expect(pastesCopies(snapshot, view(store), store, true)).toBe(true)
    })
  })
})

describe('a paste into another workspace (#137 review)', () => {
  const OFFSET = { x: 10, y: 10 }
  /**
   * The clipboard belongs to the store, and Open file, Import and Load demo
   * keep the store and replace its workspace. So a copy can meet another model.
   */
  function reopened() {
    const store = claims()
    const snapshot = copy(store, ['o-handle'])
    // Before the switch the same paste is made, so the refusal below is the switch's.
    expect(
      pasteSnapshot(snapshot, view(store), store, {
        offset: OFFSET,
        special: false,
        mint: counter(),
      }),
    ).toBeDefined()
    store.replaceWorkspace({ ...store.snapshot(), id: 'ws-other' }, { markClean: true })
    expect(store.id).toBe('ws-other')
    return { store, snapshot }
  }

  it('is refused whole, Paste and Paste Special alike, though the same elements are there', () => {
    const { store, snapshot } = reopened()
    for (const special of [false, true]) {
      for (const target of [LANDSCAPE, EMPTY]) {
        expect(
          pasteSnapshot(snapshot, view(store, target), store, {
            offset: OFFSET,
            special,
            mint: counter(),
          }),
          `${target} special=${special}`,
        ).toBeUndefined()
      }
    }
  })

  it('dispatches nothing, so the other workspace is left as it was', () => {
    const { store, snapshot } = reopened()
    const before = toCanonicalJson(store.snapshot())
    const dispatch = vi.spyOn(store, 'dispatch')
    expect(
      pasteInto(store, EMPTY, snapshot, { offset: OFFSET, special: false, mint: counter() }),
    ).toBeUndefined()
    expect(dispatch).not.toHaveBeenCalled()
    expect(toCanonicalJson(store.snapshot())).toBe(before)
  })
})

describe('the offset of a paste (#137, calculateXYOffset)', () => {
  const snapshot = { origin: { x: 200, y: 150 } } as Snapshot

  it('puts the copied shapes’ top-left where the canvas was pressed', () => {
    expect(nextOffset(snapshot, { x: 30, y: 30 }, { x: 500, y: 410 })).toEqual({ x: 300, y: 260 })
  })

  it('moves on by 10, 10 from the last paste when it was not', () => {
    expect(PASTE_STEP).toBe(10)
    expect(nextOffset(snapshot, { x: 0, y: 0 }, null)).toEqual({ x: 10, y: 10 })
    expect(nextOffset(snapshot, { x: 300, y: 260 }, null)).toEqual({ x: 310, y: 270 })
  })
})

describe('pasting (#137, CopySnapshot.getPasteCommand)', () => {
  const OFFSET = { x: 10, y: 10 }

  it('pastes copies into the same view: new ids, nesting kept, on top, at the offset', () => {
    const store = claims()
    const before = view(store)
    const pasted = pasteSnapshot(copy(store, ['o-handle']), before, store, {
      offset: OFFSET,
      special: false,
      mint: counter(),
    })!
    const added = pasted.view.nodes.slice(before.nodes.length)
    expect(ids(added)).toEqual([
      'node-new-1',
      'node-new-2',
      'node-new-3',
      'node-new-4',
      'node-new-5',
      'node-new-6',
    ])
    // Everything the view held is still there, in its order, and under the paste.
    expect(pasted.view.nodes.slice(0, before.nodes.length)).toEqual(before.nodes)
    expect(pasted.pasted).toEqual(['node-new-1'])

    const handle = absoluteBounds(before, 'o-handle')!
    expect(added[0]!.parent).toBeUndefined()
    expect(added[0]!.bounds).toEqual({ ...handle, x: handle.x + 10, y: handle.y + 10 })
    // The nested shapes stay in the pasted process, where they were within it.
    for (const node of added.slice(1)) expect(node.parent).toBe('node-new-1')
    const register = before.nodes.find((n) => n.id === 'o-register')!
    expect(added[1]!.bounds).toEqual(register.bounds)
  })

  it('gives each pasted shape and connection an id unique within the view, paste after paste', () => {
    const store = claims()
    const snapshot = copy(store, ['o-handle', 'o-goal', 'o-note-biz'])
    let current = view(store)
    for (let i = 0; i < 3; i++) {
      current = pasteSnapshot(snapshot, current, store, {
        offset: { x: 10 * i, y: 10 * i },
        special: false,
        mint: (kind) => `${kind}-${crypto.randomUUID()}`,
      })!.view
    }
    const nodeIds = ids(current.nodes)
    const connectionIds = ids(current.connections)
    expect(nodeIds.length).toBe(view(store).nodes.length + 3 * 8)
    expect(new Set(nodeIds).size).toBe(nodeIds.length)
    expect(new Set(connectionIds).size).toBe(connectionIds.length)
  })

  it('makes each copy its own element, named as Archi names it, filed by type', () => {
    const store = claims()
    store.updateElement('bp-register', (e) => ({
      ...e,
      folder: 'somewhere',
      documentation: 'How a claim is registered.',
      properties: { owner: 'Claims' },
    }))
    const pasted = pasteSnapshot(copy(store, ['o-handle']), view(store), store, {
      offset: OFFSET,
      special: false,
      mint: counter(),
    })!
    expect(pasted.elements.map((e) => e.name)).toEqual(
      ['bp-handle', 'bp-register', 'bp-accept', 'j-split', 'bp-valuate', 'bp-pay'].map(
        (id) => `${store.element(id)!.name}${COPY_SUFFIX}`,
      ),
    )
    expect(COPY_SUFFIX).toBe(' (copy)')
    const register = pasted.elements[1]!
    expect(register).toEqual({
      id: 'el-new-2',
      type: 'BusinessProcess',
      name: 'Register (copy)',
      documentation: 'How a claim is registered.',
      properties: { owner: 'Claims' },
    })
    expect(register.properties).not.toBe(store.element('bp-register')!.properties)
    expect(pasted.elements[3]!.junctionKind).toBe(store.element('j-split')!.junctionKind)
    const drawn = pasted.view.nodes.find((n) => n.id === 'node-new-2')!
    expect(drawn).toMatchObject({ kind: 'element', element: 'el-new-2' })
  })

  it('makes each connection’s own relationship, between the copies at its ends, filed by type', () => {
    const store = claims()
    store.updateRelationship('r-register-accept', (r) => ({ ...r, folder: 'somewhere' }))
    const pasted = pasteSnapshot(copy(store, ['o-handle']), view(store), store, {
      offset: OFFSET,
      special: false,
      mint: counter(),
    })!
    expect(pasted.relationships).toHaveLength(5)
    const accept = pasted.relationships.find(
      (r) => r.type === 'Triggering' && r.id === 'rel-new-1',
    )!
    const { folder, ...original } = store.relationship('r-register-accept')!
    expect(folder).toBe('somewhere')
    expect(accept).toEqual({ ...original, id: 'rel-new-1', source: 'el-new-2', target: 'el-new-3' })
    // A deep copy, as the element's: its properties are its own.
    expect(accept.properties).not.toBe(original.properties)
    const connection = pasted.view.connections.find((c) => c.id === 'conn-new-1')!
    expect(connection).toMatchObject({
      kind: 'relationship',
      relationship: 'rel-new-1',
      source: 'node-new-2',
      target: 'node-new-3',
    })
  })

  it('moves a pasted connection’s bend-points with its shapes', () => {
    const store = claims()
    const original = view(store).connections.find((c) => c.id === 'c-split-pay')!
    expect(original.bendpoints?.length).toBeGreaterThan(0)
    const pasted = pasteSnapshot(copy(store, ['o-handle']), view(store), store, {
      offset: { x: 40, y: -25 },
      special: false,
      mint: counter(),
    })!
    const copied = pasted.view.connections.find((c) => c.id === 'conn-new-4')!
    expect(copied.bendpoints).toEqual(
      original.bendpoints!.map((p) => ({ x: p.x + 40, y: p.y - 25 })),
    )
  })

  it('makes two copies of an element its copy draws twice', () => {
    const store = claims()
    store.addNode(LANDSCAPE, {
      id: 'o-goal-again',
      kind: 'element',
      element: 'g-settle',
      bounds: { x: 1240, y: 260, width: 170, height: 60 },
    })
    const pasted = pasteSnapshot(copy(store, ['o-goal', 'o-goal-again']), view(store), store, {
      offset: OFFSET,
      special: false,
      mint: counter(),
    })!
    expect(ids(pasted.elements)).toEqual(['el-new-1', 'el-new-2'])
  })

  it('draws the same elements and relationships again where none is drawn', () => {
    const store = claims()
    const pasted = pasteSnapshot(copy(store, ['o-handle']), view(store, EMPTY), store, {
      offset: OFFSET,
      special: false,
      mint: counter(),
    })!
    expect(pasted.elements).toEqual([])
    expect(pasted.relationships).toEqual([])
    expect(pasted.view.nodes.find((n) => n.id === 'node-new-2')).toMatchObject({
      element: 'bp-register',
    })
    expect(pasted.view.connections.find((c) => c.id === 'conn-new-1')).toMatchObject({
      relationship: 'r-register-accept',
      source: 'node-new-2',
      target: 'node-new-3',
    })
  })

  it('copies notes, groups and plain lines as drawings, with nothing for the model', () => {
    const store = claims()
    const pasted = pasteSnapshot(copy(store, ['o-note-biz', 'o-split']), view(store), store, {
      offset: OFFSET,
      special: false,
      mint: counter(),
    })!
    const original = view(store).nodes.find((n) => n.id === 'o-note-biz')!
    expect(original.kind).toBe('note')
    const { id: _id, bounds: _bounds, parent: _parent, ...drawing } = original
    // The view's order: Junction, then the note.
    expect(pasted.view.nodes.find((n) => n.id === 'node-new-2')).toMatchObject(drawing)
    expect(pasted.view.connections.slice(-1)[0]).toMatchObject({
      kind: 'line',
      source: 'node-new-2',
      target: 'node-new-1',
    })
    expect(ids(pasted.elements)).toEqual(['el-new-1'])
  })

  it('pastes a view reference only while its view exists, and a line to it with it', () => {
    const store = claims()
    const snapshot = copy(store, ['o-ref-data', 'o-note-ref'])
    const kept = pasteSnapshot(snapshot, view(store), store, {
      offset: OFFSET,
      special: false,
      mint: counter(),
    })!
    expect(kept.view.nodes.slice(-2).map((n) => n.kind)).toEqual(['view-ref', 'note'])
    expect(kept.view.connections.slice(-1)[0]).toMatchObject({ kind: 'line' })

    store.removeView('v-data')
    const dropped = pasteSnapshot(snapshot, view(store), store, {
      offset: OFFSET,
      special: false,
      mint: counter(),
    })!
    expect(dropped.view.nodes.slice(-1).map((n) => n.kind)).toEqual(['note'])
    expect(dropped.view.connections).toEqual(view(store).connections)
  })

  it('takes what is nested in a shape that does not paste with it', () => {
    const store = claims()
    const snapshot: Snapshot = {
      ...copy(store, ['o-ref-data']),
      nodes: [
        ...copy(store, ['o-ref-data']).nodes,
        {
          id: 'o-in-ref',
          kind: 'note',
          text: 'inside',
          parent: 'o-ref-data',
          bounds: { x: 5, y: 5, width: 50, height: 20 },
        },
      ],
    }
    store.removeView('v-data')
    expect(
      pasteSnapshot(snapshot, view(store), store, {
        offset: OFFSET,
        special: false,
        mint: counter(),
      }),
    ).toBeUndefined()
  })

  it('pastes nothing from a snapshot whose shapes all fail, and from one with a parent cycle', () => {
    const store = claims()
    const note = (id: string, parent: string): ViewNode => ({
      id,
      kind: 'note',
      text: id,
      parent,
      bounds: { x: 0, y: 0, width: 10, height: 10 },
    })
    const cycle: Snapshot = {
      ...copy(store, ['o-goal']),
      nodes: [note('a', 'b'), note('b', 'a')],
    }
    expect(
      pasteSnapshot(cycle, view(store), store, { offset: OFFSET, special: false, mint: counter() }),
    ).toBeUndefined()
  })

  it('leaves out a copy it holds no element for, and a line it holds no relationship for', () => {
    const store = claims()
    const full = copy(store, ['o-handle'])
    const elements = new Map(full.elements)
    elements.delete('bp-accept')
    const relationships = new Map(full.relationships)
    relationships.delete('r-valuate-pay')
    const pasted = pasteSnapshot({ ...full, elements, relationships }, view(store), store, {
      offset: OFFSET,
      special: false,
      mint: counter(),
    })!
    // Accept is not pasted, so neither are its two connections; Valuate → Pay has no relationship.
    expect(pasted.view.nodes.length - view(store).nodes.length).toBe(5)
    expect(pasted.relationships.map((r) => r.type)).toHaveLength(2)
    expect(pasted.view.connections.length - view(store).connections.length).toBe(2)
  })

  it('leaves out a relationship line whose end draws no element', () => {
    const store = claims()
    const full = copy(store, ['o-note-biz', 'o-split'])
    const line = full.connections.find((c) => c.kind === 'line')!
    // A relationship drawn to a note: the store never holds one, so it is made here.
    const odd: Snapshot = {
      ...full,
      connections: [{ ...line, kind: 'relationship', relationship: 'r-accept-split' } as never],
      relationships: new Map([['r-accept-split', store.relationship('r-accept-split')!]]),
    }
    const pasted = pasteSnapshot(odd, view(store), store, {
      offset: OFFSET,
      special: false,
      mint: counter(),
    })!
    expect(pasted.view.connections).toEqual(view(store).connections)
    expect(pasted.relationships).toEqual([])
  })
})

describe('one paste is one command (#137)', () => {
  it('leaves the workspace byte-identical after paste and undo', () => {
    for (const [target, special] of [
      [LANDSCAPE, false],
      [LANDSCAPE, true],
      [EMPTY, false],
    ] as const) {
      const store = claims()
      const before = toCanonicalJson(store.snapshot())
      const dispatch = vi.spyOn(store, 'dispatch')
      const pasted = pasteInto(store, target, copy(store, ['o-handle', 'o-goal']), {
        offset: { x: 10, y: 10 },
        special,
        mint: counter(),
      })!
      expect(dispatch).toHaveBeenCalledTimes(1)
      // Everything the paste made is in the store: the drawings, the copies and their relationships.
      expect(store.view(target)).toBe(pasted.view)
      for (const e of pasted.elements) expect(store.element(e.id)).toBe(e)
      for (const r of pasted.relationships) expect(store.relationship(r.id)).toBe(r)
      expect(toCanonicalJson(store.snapshot())).not.toBe(before)
      store.undo()
      expect(toCanonicalJson(store.snapshot())).toBe(before)
    }
  })
})

describe('pasting into the store (#137)', () => {
  it('adds the copies’ relationships with them, as one command', () => {
    const store = claims()
    const relationships = store.relationshipList().length
    const pasted = pasteInto(store, LANDSCAPE, copy(store, ['o-handle']), {
      offset: { x: 10, y: 10 },
      special: false,
      mint: counter(),
    })!
    expect(pasted.relationships).toHaveLength(5)
    expect(store.relationshipList()).toHaveLength(relationships + 5)
    // Every connection draws a relationship the model holds.
    for (const c of view(store).connections) {
      if (c.kind === 'relationship') expect(store.relationship(c.relationship), c.id).toBeDefined()
    }
  })

  it('dispatches nothing for a view that is not there', () => {
    const store = claims()
    const dispatch = vi.spyOn(store, 'dispatch')
    expect(
      pasteInto(store, 'v-gone', copy(store, ['o-handle']), {
        offset: { x: 10, y: 10 },
        special: false,
        mint: counter(),
      }),
    ).toBeUndefined()
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('dispatches nothing when nothing pastes', () => {
    const store = claims()
    const snapshot = copy(store, ['o-ref-data'])
    store.removeView('v-data')
    const dispatch = vi.spyOn(store, 'dispatch')
    expect(
      pasteInto(store, LANDSCAPE, snapshot, {
        offset: { x: 10, y: 10 },
        special: false,
        mint: counter(),
      }),
    ).toBeUndefined()
    expect(dispatch).not.toHaveBeenCalled()
  })
})

describe('the chords (#137)', () => {
  const press = (
    key: string,
    mods: Partial<Record<'meta' | 'ctrl' | 'shift' | 'alt', true>> = {},
  ) =>
    clipboardChord({
      key,
      metaKey: !!mods.meta,
      ctrlKey: !!mods.ctrl,
      shiftKey: !!mods.shift,
      altKey: !!mods.alt,
    })

  it('reads ⌘ and Ctrl alike', () => {
    expect(press('c', { meta: true })).toBe('copy')
    expect(press('c', { ctrl: true })).toBe('copy')
    expect(press('v', { meta: true })).toBe('paste')
    expect(press('v', { ctrl: true })).toBe('paste')
    expect(press('V', { meta: true, shift: true })).toBe('paste-special')
    expect(press('v', { ctrl: true, shift: true })).toBe('paste-special')
    expect(press('d', { meta: true })).toBe('duplicate')
    expect(press('D', { ctrl: true })).toBe('duplicate')
  })

  it('answers no bare letter, no Alt chord, and no other Shift chord', () => {
    expect(press('c')).toBeUndefined()
    expect(press('v', { shift: true })).toBeUndefined()
    expect(press('c', { meta: true, alt: true })).toBeUndefined()
    expect(press('v', { meta: true, alt: true })).toBeUndefined()
    expect(press('c', { meta: true, shift: true })).toBeUndefined()
    expect(press('d', { meta: true, shift: true })).toBeUndefined()
    expect(press('x', { meta: true })).toBeUndefined()
  })
})

describe('the clipboard (#137)', () => {
  it('belongs to its store, and a copy starts its offset again', () => {
    const store = claims()
    const clipboard = clipboardFor(store)
    expect(clipboardFor(store)).toBe(clipboard)
    expect(clipboardFor(claims())).not.toBe(clipboard)
    expect(clipboard).toBeInstanceOf(Clipboard)
    expect(clipboard.snapshot).toBeUndefined()

    const snapshot = copy(store, ['o-goal'])
    clipboard.copy(snapshot)
    clipboard.pastedAt({ x: 20, y: 20 })
    expect(clipboard.offset).toEqual({ x: 20, y: 20 })
    clipboard.copy(snapshot)
    expect(clipboard.snapshot).toBe(snapshot)
    expect(clipboard.offset).toEqual({ x: 0, y: 0 })
  })
})
