import { describe, expect, it } from 'vitest'
import { runValidator, type View, type Workspace } from '@/model'
import { syntheticWorkspace } from '@/test/fixtures'
import { ModelStore } from './model-store'

/**
 * The 5,000-element bar from issue #4 and the design brief.
 *
 * The time budgets are deliberately loose — an order of magnitude above what the
 * operations cost on a developer machine — because a CI runner under load is not
 * a benchmark rig. They are here to catch an algorithmic regression (an index
 * rebuild per mutation, a linear scan per adjacency query), not to measure speed.
 */

const SIZE = 5_000

function ms(work: () => void): number {
  const start = performance.now()
  work()
  return performance.now() - start
}

describe('5,000-element workspace', () => {
  const workspace = syntheticWorkspace(SIZE)

  it('builds the model and its indexes in one pass', () => {
    let store: ModelStore | undefined
    const elapsed = ms(() => {
      store = new ModelStore(workspace)
    })
    expect(store?.elementCount).toBe(SIZE)
    expect(store?.relationshipCount).toBe(workspace.relationships.length)
    expect(elapsed).toBeLessThan(2_000)
  })

  it('answers adjacency queries without scanning the model', () => {
    const store = new ModelStore(workspace)
    let neighbours = 0
    const elapsed = ms(() => {
      for (let i = 0; i < 2_000; i += 1) {
        neighbours += store.neighbours(`app-${i}`).length
      }
    })
    expect(neighbours).toBeGreaterThan(0)
    expect(elapsed).toBeLessThan(1_000)
  })

  it('keeps mutations interactive', () => {
    const store = new ModelStore(workspace)
    const elapsed = ms(() => {
      for (let i = 0; i < 500; i += 1) {
        store.updateElement(`app-${i}`, (element) => ({ ...element, name: `Renamed ${i}` }))
      }
    })
    expect(store.element('app-0')?.name).toBe('Renamed 0')
    expect(store.dirty).toBe(500)
    expect(elapsed).toBeLessThan(2_000)
  })

  it('undoes a deep stack without rebuilding the model', () => {
    const store = new ModelStore(workspace)
    for (let i = 0; i < 200; i += 1) {
      store.updateElement(`app-${i}`, (element) => ({ ...element, name: `Renamed ${i}` }))
    }
    const elapsed = ms(() => {
      while (store.canUndo) store.undo()
    })
    expect(store.element('app-0')?.name).toBe('Application 0')
    expect(elapsed).toBeLessThan(1_000)
  })

  it('cascades a delete through the adjacency index', () => {
    const store = new ModelStore(workspace)
    const before = store.relationshipCount
    const touched = store.relationCount('app-10')
    store.removeElement('app-10')
    expect(store.relationshipCount).toBe(before - touched)
    store.undo()
    expect(store.relationshipCount).toBe(before)
    expect(store.relationCount('app-10')).toBe(touched)
  })

  it('scores model health across the whole workspace', () => {
    const store = new ModelStore(workspace)
    let health = 0
    const elapsed = ms(() => {
      health = store.health()
    })
    expect(health).toBeGreaterThan(0)
    expect(health).toBeLessThanOrEqual(100)
    expect(elapsed).toBeLessThan(2_000)
  })

  it('validates the whole workspace, every check on (#193)', () => {
    let findings = 0
    const elapsed = ms(() => {
      findings = runValidator(workspace).length
    })
    // No view draws anything, so every element and relationship is unused.
    expect(findings).toBe(workspace.elements.length + workspace.relationships.length)
    expect(elapsed).toBeLessThan(2_000)
  })

  it('validates it drawn in views, with half the shapes nested, every check on (#193)', () => {
    const drawn = inViews(workspace)
    let findings = 0
    const elapsed = ms(() => {
      findings = runValidator(drawn).length
    })
    expect(drawn.views.length).toBe(SIZE / 50)
    expect(findings).toBeGreaterThan(0)
    expect(elapsed).toBeLessThan(2_000)
  })
})

/**
 * The synthetic workspace drawn 50 elements to a view, each relationship drawn
 * where both ends are, and every other shape nested in the view's first: the
 * view-based checks walk every shape and line.
 */
function inViews(workspace: Workspace): Workspace {
  const views: View[] = []
  const viewOf = new Map<string, number>()
  workspace.elements.forEach((element, index) => {
    const at = Math.floor(index / 50)
    viewOf.set(element.id, at)
    const view = (views[at] ??= {
      id: `v-${at}`,
      name: `View ${at}`,
      viewpoint: 'Application Cooperation',
      properties: {},
      nodes: [],
      connections: [],
    })
    const first = view.nodes[0]?.id
    view.nodes.push({
      id: `n-${element.id}`,
      kind: 'element',
      element: element.id,
      bounds: { x: index * 10, y: 0, width: 120, height: 55 },
      ...(first && index % 2 === 0 ? { parent: first } : {}),
    })
  })
  for (const relationship of workspace.relationships) {
    const at = viewOf.get(relationship.source)
    if (at === undefined || at !== viewOf.get(relationship.target)) continue
    views[at]!.connections.push({
      id: `c-${relationship.id}`,
      kind: 'relationship',
      relationship: relationship.id,
      source: `n-${relationship.source}`,
      target: `n-${relationship.target}`,
    })
  }
  return { ...workspace, views }
}
