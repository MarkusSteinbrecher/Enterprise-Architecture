import { describe, expect, it } from 'vitest'
import {
  absoluteBounds,
  drawsRelationshipEnds,
  removeNodes,
  type View,
  type ViewNode,
} from '@/model'

/** outer (100,100) ⊃ middle (+10,+10) ⊃ inner (+5,+5); a line from inner to loose. */
function nested(): View {
  return {
    id: 'v',
    name: 'Nested',
    properties: {},
    nodes: [
      {
        id: 'outer',
        kind: 'group',
        name: 'Outer',
        bounds: { x: 100, y: 100, width: 400, height: 400 },
      },
      {
        id: 'middle',
        kind: 'group',
        name: 'Middle',
        parent: 'outer',
        bounds: { x: 10, y: 10, width: 200, height: 200 },
      },
      {
        id: 'inner',
        kind: 'note',
        text: 'Inner',
        parent: 'middle',
        bounds: { x: 5, y: 5, width: 50, height: 20 },
      },
      { id: 'loose', kind: 'note', text: 'Loose', bounds: { x: 0, y: 0, width: 50, height: 20 } },
    ],
    connections: [
      { id: 'l-inner', kind: 'line', source: 'inner', target: 'loose' },
      { id: 'l-middle', kind: 'line', source: 'loose', target: 'middle' },
    ],
  }
}

describe('view operations (#75)', () => {
  it('resolves a nested node to view coordinates through its whole parent chain', () => {
    expect(absoluteBounds(nested(), 'inner')).toEqual({ x: 115, y: 115, width: 50, height: 20 })
    expect(absoluteBounds(nested(), 'nope')).toBeUndefined()
  })

  it('stops at a nesting cycle instead of looping', () => {
    const view = nested()
    const outer = view.nodes[0]
    if (outer) outer.parent = 'inner'
    expect(absoluteBounds(view, 'inner')).toEqual({ x: 115, y: 115, width: 50, height: 20 })
  })

  it('lifts the children of a removed node to where they were drawn', () => {
    const view = nested()
    const after = removeNodes(view, new Set(['middle']))
    const inner = after.nodes.find((n) => n.id === 'inner')
    expect(inner?.parent).toBe('outer')
    expect(inner?.bounds).toEqual({ x: 15, y: 15, width: 50, height: 20 })
    expect(absoluteBounds(after, 'inner')).toEqual(absoluteBounds(view, 'inner'))
    // The connection to the removed node goes; the one between survivors stays.
    expect(after.connections.map((c) => c.id)).toEqual(['l-inner'])
  })

  it('lifts through several removed ancestors at once, to the top level', () => {
    const view = nested()
    const after = removeNodes(view, new Set(['outer', 'middle']))
    const inner = after.nodes.find((n) => n.id === 'inner')
    expect(inner?.parent).toBeUndefined()
    expect(inner?.bounds).toEqual({ x: 115, y: 115, width: 50, height: 20 })
  })

  it('never edits the view it was given — undo depends on the before state', () => {
    const view = nested()
    const frozen = structuredClone(view)
    removeNodes(view, new Set(['middle']))
    expect(view).toEqual(frozen)
  })
})

describe('drawsRelationshipEnds (#100, #106 review)', () => {
  const bounds = { x: 0, y: 0, width: 120, height: 55 }
  const shape = (element: string): ViewNode => ({
    id: `s-${element}`,
    kind: 'element',
    element,
    bounds,
  })
  const relationship = { source: 'a', target: 'b' }

  it('holds only when each end draws its own element, in the relationship’s direction', () => {
    expect(drawsRelationshipEnds(relationship, shape('a'), shape('b'))).toBe(true)
    // Each half on its own: one right end does not make a connection right.
    expect(drawsRelationshipEnds(relationship, shape('a'), shape('c'))).toBe(false)
    expect(drawsRelationshipEnds(relationship, shape('c'), shape('b'))).toBe(false)
    expect(drawsRelationshipEnds(relationship, shape('b'), shape('a'))).toBe(false)
  })

  it('does not hold for an end that is not an element’s shape, or no shape at all', () => {
    const note: ViewNode = { id: 'n', kind: 'note', text: 'a', bounds }
    expect(drawsRelationshipEnds(relationship, note, shape('b'))).toBe(false)
    expect(drawsRelationshipEnds(relationship, shape('a'), undefined)).toBe(false)
  })
})
