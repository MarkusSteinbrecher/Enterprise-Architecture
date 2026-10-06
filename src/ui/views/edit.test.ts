import { describe, expect, it } from 'vitest'
import { absoluteBounds, type View, type ViewConnection, type ViewNode } from '@/model'
import {
  MIN_SIZE,
  dropTarget,
  followBendpoints,
  moveSelection,
  nodesInside,
  resizeNode,
  resized,
  topSelected,
  withDescendants,
} from './edit'

const note = (id: string, x: number, y: number, w = 40, h = 20, parent?: string): ViewNode => ({
  id,
  kind: 'note',
  text: id,
  bounds: { x, y, width: w, height: h },
  ...(parent ? { parent } : {}),
})
const group = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  parent?: string,
): ViewNode => ({
  id,
  kind: 'group',
  name: id,
  bounds: { x, y, width: w, height: h },
  ...(parent ? { parent } : {}),
})
const line = (
  id: string,
  source: string,
  target: string,
  bends: [number, number][],
): ViewConnection => ({
  id,
  kind: 'line',
  source,
  target,
  bendpoints: bends.map(([x, y]) => ({ x, y })),
})
const view = (nodes: ViewNode[], connections: ViewConnection[] = []): View => ({
  id: 'v',
  name: 'V',
  properties: {},
  nodes,
  connections,
})

// A group at (100, 100) holding a and b; c and d at the top level.
const sample = () =>
  view(
    [
      group('g', 100, 100, 300, 200),
      note('a', 10, 10, 40, 20, 'g'),
      note('b', 100, 10, 40, 20, 'g'),
      note('c', 500, 100),
      note('d', 500, 300),
    ],
    [
      line('ab', 'a', 'b', [[150, 50]]),
      line('cd', 'c', 'd', [
        [600, 200],
        [600, 250],
      ]),
    ],
  )

describe('topSelected', () => {
  it('drops a node whose ancestor is also selected', () => {
    expect([...topSelected(sample(), new Set(['g', 'a', 'c']))]).toEqual(['g', 'c'])
  })
})

describe('moveSelection', () => {
  it('moves the selection, and keeps the identity of everything it did not touch', () => {
    const before = sample()
    const after = moveSelection(before, new Set(['c']), 5, -3)
    expect(after.nodes.find((n) => n.id === 'c')!.bounds).toMatchObject({ x: 505, y: 97 })
    for (const id of ['g', 'a', 'b', 'd']) {
      expect(
        after.nodes.find((n) => n.id === id),
        id,
      ).toBe(before.nodes.find((n) => n.id === id))
    }
    expect(after.connections[0]).toBe(before.connections[0])
  })

  it('returns the same view when nothing moves', () => {
    const before = sample()
    expect(moveSelection(before, new Set(['c']), 0, 0)).toBe(before)
    expect(moveSelection(before, new Set(['a']), 0, 0, { into: 'g' })).toBe(before)
    expect(moveSelection(before, new Set(), 10, 10)).toBe(before)
  })

  it('moves a container’s children with it, without touching their relative bounds', () => {
    const after = moveSelection(sample(), new Set(['g']), 20, 30)
    expect(absoluteBounds(after, 'a')).toMatchObject({ x: 130, y: 140 })
    expect(after.nodes.find((n) => n.id === 'a')!.bounds).toMatchObject({ x: 10, y: 10 })
  })

  it('re-parents out of a container and into another, keeping the absolute position', () => {
    const out = moveSelection(sample(), new Set(['a']), 0, 0, { into: undefined })
    expect(out.nodes.find((n) => n.id === 'a')!.parent).toBeUndefined()
    expect(absoluteBounds(out, 'a')).toEqual({ x: 110, y: 110, width: 40, height: 20 })
    const into = moveSelection(sample(), new Set(['c']), -300, 0, { into: 'g' })
    expect(into.nodes.find((n) => n.id === 'c')!.parent).toBe('g')
    expect(absoluteBounds(into, 'c')).toEqual({ x: 200, y: 100, width: 40, height: 20 })
  })
})

describe('a re-parented node goes on top of its new siblings, as Archi appends it', () => {
  it('moves to the end of the array, so it is drawn last in its new parent', () => {
    const before = sample()
    const after = moveSelection(before, new Set(['c']), -300, 0, { into: 'g' })
    expect(after.nodes.map((n) => n.id)).toEqual(['g', 'a', 'b', 'd', 'c'])
    // A move that keeps the parent keeps the order.
    expect(moveSelection(before, new Set(['c']), 5, 0).nodes.map((n) => n.id)).toEqual(
      before.nodes.map((n) => n.id),
    )
  })
})

describe('bend-points follow their ends, as Archi’s relative bend-points do', () => {
  it('move by the whole distance when both ends move', () => {
    const after = moveSelection(sample(), new Set(['g']), 10, 20)
    expect(after.connections.find((c) => c.id === 'ab')!.bendpoints).toEqual([{ x: 160, y: 70 }])
  })

  it('move by the weight of each end when only one moves', () => {
    // Two points: weights 1/3 and 2/3 toward the target.
    const source = moveSelection(sample(), new Set(['c']), 30, 0)
    expect(source.connections.find((c) => c.id === 'cd')!.bendpoints).toEqual([
      { x: 620, y: 200 },
      { x: 610, y: 250 },
    ])
    const target = moveSelection(sample(), new Set(['d']), 30, 0)
    expect(target.connections.find((c) => c.id === 'cd')!.bendpoints).toEqual([
      { x: 610, y: 200 },
      { x: 620, y: 250 },
    ])
  })

  it('follow a resize, which moves the shape’s centre', () => {
    const before = sample()
    const after = resizeNode(before, 'c', { x: 500, y: 100, width: 100, height: 20 })
    // c's centre moved 30 to the right; the first point weighs 2/3 toward c.
    expect(after.connections.find((c) => c.id === 'cd')!.bendpoints).toEqual([
      { x: 620, y: 200 },
      { x: 610, y: 250 },
    ])
    expect(followBendpoints(before, before)).toBe(before)
  })
})

describe('resizeNode', () => {
  it('keeps a container’s children where they were drawn when its top-left edge moves', () => {
    const before = sample()
    const after = resizeNode(before, 'g', { x: 80, y: 90, width: 320, height: 210 })
    expect(absoluteBounds(after, 'a')).toEqual(absoluteBounds(before, 'a'))
    expect(absoluteBounds(after, 'b')).toEqual(absoluteBounds(before, 'b'))
    expect(after.nodes.find((n) => n.id === 'a')!.bounds).toMatchObject({ x: 30, y: 20 })
  })

  it('leaves the children alone when only the far edges move', () => {
    const before = sample()
    const after = resizeNode(before, 'g', { x: 100, y: 100, width: 350, height: 250 })
    expect(after.nodes.find((n) => n.id === 'a')).toBe(before.nodes.find((n) => n.id === 'a'))
  })

  it('stops at the minimum size, and returns the same view when nothing changes', () => {
    const before = sample()
    const after = resizeNode(before, 'c', { x: 500, y: 100, width: 2, height: 0 })
    expect(after.nodes.find((n) => n.id === 'c')!.bounds).toMatchObject({
      width: MIN_SIZE,
      height: MIN_SIZE,
    })
    expect(resizeNode(before, 'c', { x: 500, y: 100, width: 40, height: 20 })).toBe(before)
  })
})

describe('resized', () => {
  const b = { x: 10, y: 10, width: 100, height: 50 }
  it('drags each edge and corner', () => {
    expect(resized(b, 'se', 20, 10)).toEqual({ x: 10, y: 10, width: 120, height: 60 })
    expect(resized(b, 'nw', 20, 10)).toEqual({ x: 30, y: 20, width: 80, height: 40 })
    expect(resized(b, 'n', 5, -10)).toEqual({ x: 10, y: 0, width: 100, height: 60 })
    expect(resized(b, 'e', -5, 99)).toEqual({ x: 10, y: 10, width: 95, height: 50 })
  })

  it('pins the far edge when the minimum stops a drag from the near one', () => {
    expect(resized(b, 'w', 500, 0)).toEqual({ x: 100, y: 10, width: MIN_SIZE, height: 50 })
  })
})

describe('dropTarget', () => {
  const never = () => false
  it('finds the innermost container under the point', () => {
    const v = view([group('outer', 0, 0, 400, 400), group('inner', 50, 50, 100, 100, 'outer')])
    expect(dropTarget(v, new Set(), { x: 100, y: 100 }, never)).toBe('inner')
    expect(dropTarget(v, new Set(), { x: 300, y: 300 }, never)).toBe('outer')
    expect(dropTarget(v, new Set(), { x: 500, y: 500 }, never)).toBeUndefined()
  })

  it('walks in drawing order, not array order: a child listed before its parent still wins', () => {
    // inner is nested in outer but listed first, as a re-parent used to leave it.
    const v = view([group('inner', 50, 50, 100, 100, 'outer'), group('outer', 0, 0, 400, 400)])
    expect(dropTarget(v, new Set(), { x: 100, y: 100 }, () => false)).toBe('inner')
  })

  it('never drops into a moving node or anything inside it', () => {
    const v = view([group('outer', 0, 0, 400, 400), group('inner', 50, 50, 100, 100, 'outer')])
    expect(dropTarget(v, new Set(['outer']), { x: 100, y: 100 }, never)).toBeUndefined()
  })

  it('never drops into a note, a view reference or a junction', () => {
    const junction: ViewNode = {
      id: 'j',
      kind: 'element',
      element: 'el-j',
      bounds: { x: 0, y: 0, width: 100, height: 100 },
    }
    const v = view([note('n', 200, 0, 100, 100), junction])
    expect(dropTarget(v, new Set(), { x: 250, y: 50 }, never)).toBeUndefined()
    expect(dropTarget(v, new Set(), { x: 50, y: 50 }, (id) => id === 'el-j')).toBeUndefined()
    expect(dropTarget(v, new Set(), { x: 50, y: 50 }, never)).toBe('j')
  })
})

describe('nodesInside', () => {
  it('takes only nodes wholly inside the rectangle', () => {
    const v = sample()
    expect(nodesInside(v, { x: 90, y: 90, width: 400, height: 300 })).toEqual(['g', 'a', 'b'])
    expect(nodesInside(v, { x: 105, y: 105, width: 50, height: 30 })).toEqual(['a'])
  })
})

describe('withDescendants', () => {
  it('adds everything nested, at any depth, whatever order the nodes are listed in', () => {
    const v = view([
      note('deep', 0, 0, 10, 10, 'inner'),
      group('inner', 0, 0, 50, 50, 'outer'),
      group('outer', 0, 0, 100, 100),
      note('apart', 200, 0),
    ])
    expect([...withDescendants(v, new Set(['outer']))].sort()).toEqual(['deep', 'inner', 'outer'])
    expect([...withDescendants(v, new Set(['inner']))].sort()).toEqual(['deep', 'inner'])
    expect([...withDescendants(v, new Set(['missing']))]).toEqual([])
  })
})
