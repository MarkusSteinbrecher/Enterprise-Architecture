import { describe, expect, it } from 'vitest'
import archiSave from '@/io/fixtures/claims-edited.archi.archimate?raw'
import { absoluteBounds, type View, type Workspace } from '@/model'
import { compareViews, explainDifference, readArchiSave, type ViewDifference } from './view-oracle'

/**
 * The oracle's comparison must fail on what a broken editor or writer would do
 * (#127). Each case changes one thing in a copy of Archi's real save and holds
 * the result to the save as it was; every difference must be found and must stay
 * unexplained.
 */

const saved = readArchiSave(archiSave)

function mutated(change: (view: View) => void): Workspace {
  const copy = structuredClone(saved)
  change(copy.views.find((v) => v.id === 'v-landscape')!)
  return copy
}

function unexplained(ours: Workspace, archi: Workspace): string[] {
  return compareViews(ours, archi)
    .filter((d) => explainDifference(d, ours, archi) === undefined)
    .map((d: ViewDifference) => `${d.drawing} ${d.field}`)
}

describe('compareViews against Archi’s save (#127)', () => {
  it('finds a node moved by one pixel', () => {
    const moved = mutated((view) => {
      const node = view.nodes.find((n) => n.id === 'o-fraud')!
      node.bounds = { ...node.bounds, x: node.bounds.x + 1 }
    })
    expect(unexplained(moved, saved)).toEqual(['o-fraud bounds'])
  })

  it('finds a node re-parented to the same absolute bounds, as a parent and nothing else', () => {
    const before = absoluteBounds(
      saved.views.find((v) => v.id === 'v-landscape')!,
      'o-scanner',
    )!
    const moved = mutated((view) => {
      const node = view.nodes.find((n) => n.id === 'o-scanner')!
      const group = absoluteBounds(view, 'o-g-platform')!
      node.parent = 'o-g-platform'
      node.bounds = { ...node.bounds, x: before.x - group.x, y: before.y - group.y }
    })
    expect(
      absoluteBounds(
        moved.views.find((v) => v.id === 'v-landscape')!,
        'o-scanner',
      ),
    ).toEqual(before)
    expect(unexplained(moved, saved)).toEqual(['o-scanner parent'])
  })

  it('finds a dropped bend-point', () => {
    const dropped = mutated((view) => {
      const connection = view.connections.find((c) => c.id === 'c-cust-as')!
      delete connection.bendpoints
    })
    expect(unexplained(dropped, saved)).toEqual(['c-cust-as bendpoints'])
  })

  it('finds a reversed connection', () => {
    const reversed = mutated((view) => {
      const connection = view.connections.find((c) => c.id === 'c-fraud-valuate')!
      ;[connection.source, connection.target] = [connection.target, connection.source]
    })
    expect(unexplained(reversed, saved)).toEqual([
      'c-fraud-valuate draws',
      'c-fraud-valuate source',
      'c-fraud-valuate target',
    ])
  })

  it('finds a drawing Archi does not have, and one it has that we do not', () => {
    const extra = mutated((view) => {
      view.nodes.push({
        id: 'o-stray',
        kind: 'note',
        text: 'stray',
        bounds: { x: 0, y: 0, width: 10, height: 10 },
      })
    })
    expect(unexplained(extra, saved)).toEqual(['o-stray missing'])
    expect(unexplained(saved, extra)).toEqual(['o-stray extra'])
  })

  it('finds a whole view missing', () => {
    const fewer = structuredClone(saved)
    fewer.views = fewer.views.filter((v) => v.id !== 'v-data')
    expect(unexplained(saved, fewer)).toEqual(['v-data missing'])
  })

  it('finds a changed appearance that no Archi behaviour accounts for', () => {
    const recoloured = mutated((view) => {
      const node = view.nodes.find((n) => n.id === 'o-goal')!
      node.appearance = { ...node.appearance, fillColor: '#ffe9a9' }
    })
    expect(unexplained(recoloured, saved)).toEqual(['o-goal appearance.fillColor'])
  })

  it('leaves a connection’s lost line width unexplained, because Archi reads that one', () => {
    const widened = mutated((view) => {
      const connection = view.connections.find((c) => c.id === 'c-fraud-valuate')!
      connection.appearance = { lineWidth: 3 }
    })
    expect(unexplained(widened, saved)).toEqual(['c-fraud-valuate appearance.lineWidth'])
  })

  it('leaves an added connection between shapes that are not nested unexplained', () => {
    const added = mutated((view) => {
      view.connections.push({
        id: 'c-added',
        kind: 'relationship',
        relationship: 'r-fraud-valuate',
        source: 'o-fraud',
        target: 'o-valuate',
      })
    })
    expect(unexplained(saved, added)).toEqual(['c-added extra'])
  })

  it('leaves a shape line width Archi has and we do not unexplained', () => {
    const widened = mutated((view) => {
      const node = view.nodes.find((n) => n.id === 'o-goal')!
      node.appearance = { ...node.appearance, lineWidth: 2 }
    })
    expect(unexplained(saved, widened)).toEqual(['o-goal appearance.lineWidth'])
  })

  it('leaves a shape line width Archi changed, rather than dropped, unexplained', () => {
    const ours = mutated((view) => {
      const node = view.nodes.find((n) => n.id === 'o-goal')!
      node.appearance = { ...node.appearance, lineWidth: 2 }
    })
    const archi = mutated((view) => {
      const node = view.nodes.find((n) => n.id === 'o-goal')!
      node.appearance = { ...node.appearance, lineWidth: 3 }
    })
    expect(unexplained(ours, archi)).toEqual(['o-goal appearance.lineWidth'])
  })

  it('leaves a font name we set and Archi replaced unexplained', () => {
    const renamed = mutated((view) => {
      const node = view.nodes.find((n) => n.id === 'o-req')!
      node.appearance = { ...node.appearance, fontName: 'Arial' }
    })
    expect(unexplained(renamed, saved)).toEqual(['o-req appearance.fontName'])
  })

  it('explains an alpha one byte off only when the colour is the same', () => {
    const fill = saved.views
      .find((v) => v.id === 'v-landscape')!
      .nodes.find((n) => n.id === 'o-crm')!.appearance!.fillColor!
    const sameColour = mutated((view) => {
      const node = view.nodes.find((n) => n.id === 'o-crm')!
      node.appearance = { ...node.appearance, fillColor: '#e0e0e0a0' }
    })
    expect(fill).toBe('#e0e0e0a1')
    expect(unexplained(sameColour, saved)).toEqual([])
    const otherColour = mutated((view) => {
      const node = view.nodes.find((n) => n.id === 'o-crm')!
      node.appearance = { ...node.appearance, fillColor: '#e0e1e0a0' }
    })
    expect(unexplained(otherColour, saved)).toEqual(['o-crm appearance.fillColor'])
    const otherAlpha = mutated((view) => {
      const node = view.nodes.find((n) => n.id === 'o-crm')!
      node.appearance = { ...node.appearance, fillColor: '#e0e0e080' }
    })
    expect(unexplained(otherAlpha, saved)).toEqual(['o-crm appearance.fillColor'])
  })

  it('leaves an added connection between nested shapes unexplained when it draws another relationship', () => {
    const added = mutated((view) => {
      view.connections.push({
        id: 'c-added',
        kind: 'relationship',
        relationship: 'r-fraud-valuate',
        source: 'o-engine',
        target: 'o-rules',
      })
    })
    expect(unexplained(saved, added)).toEqual(['c-added extra'])
  })

  it('finds nothing when both sides are the same save', () => {
    expect(compareViews(saved, saved)).toEqual([])
  })
})
