import { afterEach, describe, expect, it, vi } from 'vitest'
import { emptyWorkspace, nestedElements, checkModel, type Workspace } from '@/model'
import type * as Nesting from '@/model/nesting'
import { ModelStore } from '@/store/model-store'
import { nestingOptions } from './nesting'

/**
 * The canvas's nesting prompt (#131) and the validator's nesting check (#193)
 * ask one function what a nesting means, so they cannot disagree. Changing
 * that function here changes what both say; a copy of the rule in either
 * would leave that one as it was.
 */

const rule = vi.hoisted(() => ({ widened: false }))

vi.mock('@/model/nesting', async (importOriginal) => {
  const real = await importOriginal<typeof Nesting>()
  return {
    ...real,
    // Widened: any relationship at all means the nesting.
    meansNesting: (...args: Parameters<typeof real.meansNesting>) =>
      rule.widened || real.meansNesting(...args),
  }
})

afterEach(() => {
  rule.widened = false
})

/** A clerk whose shape holds a role's, joined by an Association, which no nesting can mean. */
function associated(): Workspace {
  return {
    ...emptyWorkspace('w', 'W'),
    elements: [
      { id: 'actor', type: 'BusinessActor', name: 'Clerk', properties: {} },
      { id: 'role', type: 'BusinessRole', name: 'Handler', properties: {} },
    ],
    relationships: [
      { id: 'r', type: 'Association', source: 'actor', target: 'role', properties: {} },
    ],
    views: [
      {
        id: 'v',
        name: 'V',
        properties: {},
        nodes: [
          {
            id: 'n-actor',
            kind: 'element',
            element: 'actor',
            bounds: { x: 0, y: 0, width: 200, height: 100 },
          },
          {
            id: 'n-role',
            kind: 'element',
            element: 'role',
            parent: 'n-actor',
            bounds: { x: 10, y: 30, width: 120, height: 55 },
          },
        ],
        connections: [],
      },
    ],
  }
}

function prompt(workspace: Workspace) {
  const store = new ModelStore(workspace)
  return nestingOptions(store, store.element('actor')!, store.element('role')!)
}

describe('one rule for what a nesting means (#131, #193)', () => {
  it('as the rule stands, the prompt asks and the validator reports', () => {
    expect(prompt(associated())?.map((o) => o.type)).toContain('Assignment')
    expect(nestedElements(checkModel(associated())).map((f) => f.subjectId)).toEqual(['n-role'])
  })

  it('widening the rule silences both', () => {
    rule.widened = true
    // Present first: the fixture still nests the role in the clerk.
    expect(associated().views[0]!.nodes[1]!.parent).toBe('n-actor')
    expect(prompt(associated())).toBeUndefined()
    expect(nestedElements(checkModel(associated()))).toEqual([])
  })
})
