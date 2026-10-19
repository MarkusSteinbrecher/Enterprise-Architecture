import { describe, expect, it } from 'vitest'
import { act, cleanup } from '@testing-library/react'
import { toCanonicalJson } from '@/io/canonical-json'
import type { ElementNode, Relationship, View, ViewConnection } from '@/model'
import type { ModelStore } from '@/store'
import { drop, setup } from '@/test/view-editor'
import { ELEMENT_DRAG_TYPE } from './create'
import { dropConnections } from './drop'

/**
 * A drop from the model tree draws the element's relationships to shapes
 * already in the view (#145), as Archi 5.10's `ArchimateDNDEditPolicy` does,
 * and draws the shape alone with the copy key held. The expected lines are
 * written out from the claims landscape, not computed, so the test cannot
 * agree with the code by construction.
 */

const model = (store: ModelStore) => toCanonicalJson(store.snapshot())
const EMPTY_SPOT = { x: 1600, y: 100 }
const INSIDE_ENGINE = { x: 300, y: 500 }
const NEW = 'NEW'

/** Claims Engine's relationships whose other end the landscape draws, as lines from or to its new shape. */
const ENGINE_LINES = [
  'r-engine-as NEW → o-as-claims',
  'r-engine-rules NEW → o-rules',
  'r-engine-calc NEW → o-calc',
  'r-portal-engine o-portal → NEW',
  'r-engine-claim NEW → o-do-claim',
  'r-engine-req NEW → o-req',
  'r-wp-engine o-rollout → NEW',
  'r-hosting-engine o-hosting → NEW',
]

function added(before: View, after: View): ViewConnection[] {
  const old = new Set(before.connections.map((c) => c.id))
  return after.connections.filter((c) => !old.has(c.id))
}

function described(connections: readonly ViewConnection[], node: string): string[] {
  const name = (id: string) => (id === node ? NEW : id)
  return connections.map(
    (c) =>
      `${c.kind === 'relationship' ? c.relationship : 'line'} ${name(c.source)} → ${name(c.target)}`,
  )
}

const newest = (view: View) => view.nodes[view.nodes.length - 1] as ElementNode

describe('dropping a tree element draws its relationships (#145)', () => {
  it('draws a line for each relationship whose other end is drawn, with the shape, as one command', () => {
    const { store, dispatch, surface, view, canvas } = setup()
    const before = view()
    const json = model(store)
    const drawn = canvas.querySelectorAll('[data-connection]').length

    expect(drop(surface, { [ELEMENT_DRAG_TYPE]: 'ac-engine' }, EMPTY_SPOT)).toBe(true)

    expect(dispatch).toHaveBeenCalledTimes(1)
    const node = newest(view())
    expect(node).toMatchObject({ kind: 'element', element: 'ac-engine' })
    const lines = added(before, view())
    expect(described(lines, node.id).sort()).toEqual([...ENGINE_LINES].sort())
    // Every new line is a drawing of the relationship it names, in its direction.
    for (const line of lines) {
      if (line.kind !== 'relationship') throw new Error('a plain line')
      const relationship = store.relationship(line.relationship)!
      const ends = [line.source, line.target].map(
        (id) => (view().nodes.find((n) => n.id === id) as ElementNode).element,
      )
      expect(ends).toEqual([relationship.source, relationship.target])
    }
    // Drawn: none of them is nested, so the canvas shows every one.
    expect(canvas.querySelectorAll('[data-connection]')).toHaveLength(drawn + ENGINE_LINES.length)

    // One undo takes the shape and its lines.
    act(() => void store.undo())
    expect(model(store)).toBe(json)
  })

  it('draws the shape alone with the copy key held: Alt, as on a Mac, or Ctrl, as elsewhere', () => {
    for (const keys of [{ altKey: true }, { ctrlKey: true }]) {
      const { store, dispatch, surface, view } = setup()
      const before = view()
      expect(drop(surface, { [ELEMENT_DRAG_TYPE]: 'ac-engine' }, EMPTY_SPOT, keys)).toBe(true)
      expect(dispatch).toHaveBeenCalledTimes(1)
      expect(view().nodes).toHaveLength(before.nodes.length + 1)
      expect(newest(view()).element).toBe('ac-engine')
      expect(view().connections).toEqual(before.connections)
      expect(store.view('v-landscape')).toBe(view())
      cleanup()
    }
  })

  it('draws no line to an end the view does not draw, and one to each drawing of an end drawn twice', () => {
    const { surface, view } = setup('writer', {
      prepare: (s) => {
        // Requirement no longer drawn; Rules Evaluation drawn a second time, at the top level.
        s.removeNode('v-landscape', 'o-req')
        s.addNode('v-landscape', {
          id: 'o-rules-2',
          kind: 'element',
          element: 'af-rules',
          bounds: { x: 1600, y: 600, width: 120, height: 55 },
        })
      },
    })
    const before = view()
    drop(surface, { [ELEMENT_DRAG_TYPE]: 'ac-engine' }, EMPTY_SPOT)
    const node = newest(view())
    expect(described(added(before, view()), node.id).sort()).toEqual(
      [
        ...ENGINE_LINES.filter((line) => !line.startsWith('r-engine-req ')),
        'r-engine-rules NEW → o-rules-2',
      ].sort(),
    )
  })

  it('gives a pair the nesting would connect one line, which the nesting then hides (#131, #96)', () => {
    const { store, dispatch, surface, view, canvas } = setup()
    const before = view()
    const drawn = canvas.querySelectorAll('[data-connection]').length
    // Payment Calculation: the engine is assigned to it, and it realizes the Payment Service.
    expect(
      store
        .relationshipsOf('af-calc')
        .map((r: Relationship) => r.id)
        .sort(),
    ).toEqual(['r-calc-pay', 'r-engine-calc'])

    expect(drop(surface, { [ELEMENT_DRAG_TYPE]: 'af-calc' }, INSIDE_ENGINE)).toBe(true)

    // The model holds an Assignment from the engine already, so nothing is asked.
    expect(dispatch).toHaveBeenCalledTimes(1)
    const node = newest(view())
    expect(node.parent).toBe('o-engine')
    expect(described(added(before, view()), node.id).sort()).toEqual([
      'r-calc-pay NEW → o-as-payment',
      'r-engine-calc o-engine → NEW',
    ])
    // The one in the engine is kept and not drawn: the nesting shows it.
    expect(canvas.querySelectorAll('[data-connection]')).toHaveLength(drawn + 1)
  })

  it('with the copy key, a nesting still connects the pair, once, as #131 does', () => {
    const { surface, view } = setup()
    const before = view()
    drop(surface, { [ELEMENT_DRAG_TYPE]: 'af-calc' }, INSIDE_ENGINE, { altKey: true })
    const node = newest(view())
    expect(described(added(before, view()), node.id)).toEqual(['r-engine-calc o-engine → NEW'])
  })
})

describe('dropConnections (#145)', () => {
  const view: View = {
    id: 'v',
    name: 'V',
    properties: {},
    nodes: [
      { id: 'a1', kind: 'element', element: 'a', bounds: { x: 0, y: 0, width: 10, height: 10 } },
      { id: 'b1', kind: 'element', element: 'b', bounds: { x: 0, y: 0, width: 10, height: 10 } },
      { id: 'new', kind: 'element', element: 'a', bounds: { x: 0, y: 0, width: 10, height: 10 } },
    ],
    connections: [],
  }
  const node = view.nodes[2] as ElementNode
  const rel = (id: string, source: string, target: string): Relationship => ({
    id,
    type: 'Association',
    source,
    target,
    properties: {},
  })
  const ids = () => {
    let n = 0
    return () => `c${++n}`
  }

  it('connects a relationship from the element to itself to its other drawings, both ways, and never to the new shape', () => {
    expect(described(dropConnections([rel('r', 'a', 'a')], view, node, ids()), 'new')).toEqual([
      'r a1 → NEW',
      'r NEW → a1',
    ])
  })

  it('takes a relationship listed twice once', () => {
    const twice = rel('r', 'a', 'b')
    expect(described(dropConnections([twice, twice], view, node, ids()), 'new')).toEqual([
      'r NEW → b1',
    ])
  })
})
