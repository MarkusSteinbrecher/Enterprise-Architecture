import { describe, expect, it } from 'vitest'
import { absoluteBounds, drawingOrder, type Bounds, type View, type ViewNode } from '@/model'
import {
  align,
  arrangeable,
  canMatch,
  canReorder,
  distribute,
  matchSize,
  reorder,
  type Alignment,
} from './arrange'

/**
 * Align, distribute, match size and z-order (#136), each against the rule it
 * claims: GEF's and Archi's, read from Archi 5.10's jars with `javap`
 * (`AlignmentAction`, `AlignmentRequest`, `MatchSizeAction`,
 * `ObjectPositionAction$PositionCommand`), or ours where Archi has none.
 */

const note = (id: string, bounds: Bounds, parent?: string): ViewNode => ({
  id,
  kind: 'note',
  text: id,
  bounds,
  ...(parent ? { parent } : {}),
})

function viewOf(...nodes: ViewNode[]): View {
  return { id: 'v', name: 'v', properties: {}, nodes, connections: [] }
}

const b = (x: number, y: number, width: number, height: number): Bounds => ({
  x,
  y,
  width,
  height,
})
const at = (view: View, id: string) => view.nodes.find((n) => n.id === id)!.bounds
const ids = (view: View) => view.nodes.map((n) => n.id)

// Three shapes of different sizes in one group; the group sits at (100, 100).
const sample = () =>
  viewOf(
    note('g', b(100, 100, 600, 400)),
    note('a', b(10, 20, 100, 50), 'g'),
    note('b', b(200, 80, 60, 30), 'g'),
    note('c', b(50, 300, 141, 81), 'g'),
    note('top', b(800, 0, 40, 40)),
  )

describe('align (#136): GEF’s AlignmentAction', () => {
  const cases: [Alignment, Partial<Bounds>][] = [
    ['left', { x: 50 }],
    ['right', { x: 50 + 141 - 60 }],
    ['top', { y: 300 }],
    ['bottom', { y: 300 + 81 - 30 }],
    // 50 + 70.5 - 30 = 90.5, floored as draw2d's integers are.
    ['centre', { x: 90 }],
    // 300 + 40.5 - 15 = 325.5, floored.
    ['middle', { y: 325 }],
  ]
  it.each(cases)('aligns %s to the primary selection, the last one selected', (how, expected) => {
    const view = sample()
    const after = align(view, ['b', 'c'], how)
    expect(at(after, 'b')).toEqual({ ...at(view, 'b'), ...expected })
    // The primary does not move.
    expect(at(after, 'c')).toBe(at(view, 'c'))
  })

  it('aligns to whichever shape was selected last, not the first or the leftmost', () => {
    const view = sample()
    expect(at(align(view, ['a', 'c', 'b'], 'left'), 'a').x).toBe(200)
    expect(at(align(view, ['b', 'c', 'a'], 'left'), 'b').x).toBe(10)
  })

  it('needs two shapes in one parent, as GEF’s operation set does', () => {
    const view = sample()
    // One shape: nothing to align.
    expect(arrangeable(view, ['a'], 2)).toBeUndefined()
    expect(align(view, ['a'], 'left')).toBe(view)
    // Two parents: GEF refuses the whole selection.
    expect(arrangeable(view, ['a', 'top'], 2)).toBeUndefined()
    expect(align(view, ['a', 'top'], 'left')).toBe(view)
    expect(arrangeable(view, ['a', 'b'], 2)?.map((n) => n.id)).toEqual(['a', 'b'])
  })

  it('leaves out a shape nested in another selected one, and refuses when that is the primary', () => {
    const view = viewOf(
      note('g', b(0, 0, 300, 300)),
      note('in', b(10, 10, 50, 50), 'g'),
      note('h', b(400, 0, 100, 100)),
      note('k', b(400, 200, 100, 100)),
    )
    // `in` moves with `g`; the rest align, `k` the primary.
    expect(arrangeable(view, ['g', 'in', 'h', 'k'], 2)?.map((n) => n.id)).toEqual(['g', 'h', 'k'])
    // The primary is the nested one: GEF's `contains(primary)` fails.
    expect(arrangeable(view, ['g', 'h', 'in'], 2)).toBeUndefined()
  })

  it('moves what is nested in an aligned shape with it, and changes nothing when all are aligned', () => {
    const view = viewOf(
      note('g', b(0, 0, 300, 300)),
      note('in', b(10, 10, 50, 50), 'g'),
      note('h', b(400, 0, 100, 100)),
    )
    const after = align(view, ['g', 'h'], 'left')
    expect(absoluteBounds(after, 'in')).toEqual(b(410, 10, 50, 50))
    expect(align(after, ['g', 'h'], 'left')).toBe(after)
  })

  it('carries the bend-points of a line whose ends move', () => {
    const view: View = {
      ...viewOf(note('p', b(0, 0, 100, 50)), note('q', b(300, 200, 100, 50))),
      connections: [
        { id: 'l', kind: 'line', source: 'p', target: 'q', bendpoints: [{ x: 150, y: 25 }] },
      ],
    }
    // p moves 300 right; the single bend-point, weight ½, moves half of that.
    const after = align(view, ['p', 'q'], 'left')
    expect(after.connections[0]!.bendpoints).toEqual([{ x: 300, y: 25 }])
  })
})

describe('distribute (#136): ours, as Archi has none', () => {
  it('spaces shapes with equal gaps, keeping the first and last by centre where they are', () => {
    const view = viewOf(
      note('p', b(0, 0, 100, 50)),
      note('q', b(130, 10, 40, 50)),
      note('r', b(150, 20, 60, 50)),
      note('s', b(500, 0, 100, 50)),
    )
    // Room between p's right (100) and s's left (500) is 400; q and r take 100, so each of three gaps is 100.
    const after = distribute(view, ['s', 'r', 'q', 'p'], 'horizontal')
    expect(at(after, 'p')).toBe(at(view, 'p'))
    expect(at(after, 's')).toBe(at(view, 's'))
    expect(at(after, 'q')).toEqual(b(200, 10, 40, 50))
    expect(at(after, 'r')).toEqual(b(340, 20, 60, 50))
  })

  it('distributes vertically, rounding each place to the pixel', () => {
    const view = viewOf(
      note('p', b(0, 0, 50, 10)),
      note('q', b(0, 50, 50, 10)),
      note('r', b(0, 61, 50, 10)),
      note('s', b(0, 100, 50, 10)),
    )
    // Room 90, less 20 for q and r, is 70 over three gaps: 23⅓ each.
    const after = distribute(view, ['p', 'q', 'r', 's'], 'vertical')
    expect(at(after, 'q').y).toBe(33) // 10 + 23.33
    expect(at(after, 'r').y).toBe(67) // 10 + 46.67 + 10
  })

  it('needs three shapes in one parent', () => {
    const view = sample()
    expect(distribute(view, ['a', 'b'], 'horizontal')).toBe(view)
    expect(distribute(view, ['a', 'b', 'top'], 'horizontal')).toBe(view)
    expect(arrangeable(view, ['a', 'b', 'c'], 3)).toHaveLength(3)
  })

  it('takes centres that tie in selection order', () => {
    const view = viewOf(
      note('p', b(0, 0, 10, 10)),
      note('q', b(40, 0, 10, 10)),
      note('r', b(40, 30, 10, 10)),
      note('s', b(100, 0, 10, 10)),
    )
    // q and r share a centre: the one selected first comes first, at 10 + 23⅓.
    const rFirst = distribute(view, ['p', 'r', 'q', 's'], 'horizontal')
    expect([at(rFirst, 'r').x, at(rFirst, 'q').x]).toEqual([33, 67])
    const qFirst = distribute(view, ['p', 'q', 'r', 's'], 'horizontal')
    expect([at(qFirst, 'q').x, at(qFirst, 'r').x]).toEqual([33, 67])
  })
})

describe('match width and height (#136): GEF’s MatchSizeAction', () => {
  it('gives the others the primary’s width, keeping their top-left corners', () => {
    const view = sample()
    const after = matchSize(view, ['a', 'top', 'c'], 'width')
    expect(at(after, 'a')).toEqual(b(10, 20, 141, 50))
    // No common parent needed.
    expect(at(after, 'top')).toEqual(b(800, 0, 141, 40))
    expect(at(after, 'c')).toBe(at(view, 'c'))
  })

  it('matches height, and keeps what is nested in a resized shape where it was drawn', () => {
    const view = viewOf(
      note('g', b(0, 0, 300, 300)),
      note('in', b(10, 10, 50, 50), 'g'),
      note('h', b(400, 0, 100, 100)),
    )
    const after = matchSize(view, ['g', 'h'], 'height')
    expect(at(after, 'g')).toEqual(b(0, 0, 300, 100))
    expect(at(after, 'in')).toBe(at(view, 'in'))
  })

  it('needs two shapes, and changes nothing when they already match', () => {
    const view = sample()
    expect(canMatch(view, ['a'])).toBe(false)
    expect(matchSize(view, ['a'], 'width')).toBe(view)
    expect(matchSize(view, [], 'width')).toBe(view)
    // A primary the view does not draw: nothing to match to.
    expect(canMatch(view, ['a', 'gone'])).toBe(false)
    expect(matchSize(view, ['a', 'gone'], 'width')).toBe(view)
    // An id it does not draw among the others is passed over.
    expect(at(matchSize(view, ['gone', 'a', 'c'], 'width'), 'a').width).toBe(141)
    expect(canMatch(view, ['a', 'b'])).toBe(true)
    const once = matchSize(view, ['a', 'b'], 'width')
    expect(matchSize(once, ['a', 'b'], 'width')).toBe(once)
  })
})

describe('z-order (#136): Archi’s ObjectPositionAction', () => {
  // A group holding p, q, r, s in drawing order, between two top-level shapes.
  const stack = () =>
    viewOf(
      note('t1', b(0, 0, 10, 10)),
      note('g', b(0, 0, 500, 500)),
      note('p', b(0, 0, 10, 10), 'g'),
      note('t2', b(0, 0, 10, 10)),
      note('q', b(0, 0, 10, 10), 'g'),
      note('r', b(0, 0, 10, 10), 'g'),
      note('s', b(0, 0, 10, 10), 'g'),
    )
  const inGroup = (view: View) => drawingOrder(view).filter((n) => n.parent === 'g')
  const order = (view: View) => inGroup(view).map((n) => n.id)

  it('brings to front, sends to back, forward and backward, within the parent', () => {
    const view = stack()
    expect(order(reorder(view, ['p'], 'front'))).toEqual(['q', 'r', 's', 'p'])
    expect(order(reorder(view, ['s'], 'back'))).toEqual(['s', 'p', 'q', 'r'])
    expect(order(reorder(view, ['p'], 'forward'))).toEqual(['q', 'p', 'r', 's'])
    expect(order(reorder(view, ['r'], 'backward'))).toEqual(['p', 'r', 'q', 's'])
  })

  it('moves only the siblings: every other node keeps its place in view.nodes', () => {
    const after = reorder(stack(), ['p'], 'front')
    expect(ids(after)).toEqual(['t1', 'g', 'q', 't2', 'r', 's', 'p'])
    // The top level is untouched: t1, g, t2 in their order.
    expect(after.nodes.filter((n) => n.parent === undefined).map((n) => n.id)).toEqual([
      't1',
      'g',
      't2',
    ])
  })

  it('runs one command per selected shape, in selection order', () => {
    const view = stack()
    // Each to the front in turn: the last selected ends on top.
    expect(order(reorder(view, ['q', 'p'], 'front'))).toEqual(['r', 's', 'q', 'p'])
    expect(order(reorder(view, ['p', 'q'], 'front'))).toEqual(['r', 's', 'p', 'q'])
    // Each to the back in turn: the last selected ends at the back.
    expect(order(reorder(view, ['r', 's'], 'back'))).toEqual(['s', 'r', 'p', 'q'])
  })

  it('keeps Archi’s surprise: two neighbours brought forward back one first end where they began', () => {
    const view = stack()
    // p steps over q, then q steps back over p.
    expect(reorder(view, ['p', 'q'], 'forward')).toBe(view)
    // The front one first: q steps over r, then p over r, and both have moved one place.
    expect(order(reorder(view, ['q', 'p'], 'forward'))).toEqual(['r', 'p', 'q', 's'])
  })

  it('makes no command for a shape already at that end, judged before any runs', () => {
    const view = stack()
    expect(reorder(view, ['s'], 'front')).toBe(view)
    expect(reorder(view, ['s'], 'forward')).toBe(view)
    expect(reorder(view, ['p'], 'back')).toBe(view)
    expect(reorder(view, ['p'], 'backward')).toBe(view)
    expect(canReorder(view, ['s'], 'front')).toBe(false)
    expect(canReorder(view, ['p', 's'], 'front')).toBe(true)
    // s is at the front already and makes no command; r still goes forward, over s.
    expect(order(reorder(view, ['s', 'r'], 'forward'))).toEqual(['p', 'q', 's', 'r'])
  })

  it('orders each shape within its own parent when the selection spans two', () => {
    const after = reorder(stack(), ['t1', 'p'], 'front')
    expect(order(after)).toEqual(['q', 'r', 's', 'p'])
    expect(after.nodes.filter((n) => n.parent === undefined).map((n) => n.id)).toEqual([
      'g',
      't2',
      't1',
    ])
  })

  it('ignores an id the view does not draw', () => {
    const view = stack()
    expect(reorder(view, ['gone'], 'front')).toBe(view)
  })
})
