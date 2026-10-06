import { describe, expect, it } from 'vitest'
import archiSave from '@/io/fixtures/claims-edited.archi.archimate?raw'
import {
  absoluteBounds,
  type TextAlignment,
  type TextPosition,
  type View,
  type Workspace,
} from '@/model'
import { compareViews, explainDifference, readArchiSave, type ViewDifference } from './view-oracle'

/**
 * The oracle's comparison must fail on what a broken editor or writer would do
 * (#127). Each case changes one thing in a copy of Archi's real save and holds
 * the result to the save as it was; every difference must be found and must stay
 * unexplained.
 */

const saved = readArchiSave(archiSave).workspace

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

  it('leaves a lost bold unexplained: only strikethrough is carried', () => {
    const bold = mutated((view) => {
      const node = view.nodes.find((n) => n.id === 'o-goal')!
      node.appearance = { ...node.appearance, fontStyle: ['bold'] }
    })
    expect(unexplained(bold, saved)).toEqual(['o-goal appearance.fontStyle'])
  })

  it('explains a text alignment only when Archi shows its own default for that kind', () => {
    const align = (id: string, value: TextAlignment | undefined) =>
      mutated((view) => {
        const node = view.nodes.find((n) => n.id === id)!
        const appearance = { ...node.appearance }
        if (value === undefined) delete appearance.textAlignment
        else appearance.textAlignment = value
        node.appearance = appearance
      })
    // A group: Archi's default is left; anything else Archi produced is a difference.
    expect(unexplained(align('o-g-apps', 'center'), align('o-g-apps', 'left'))).toEqual([])
    expect(unexplained(align('o-g-apps', 'center'), align('o-g-apps', 'right'))).toEqual([
      'o-g-apps appearance.textAlignment',
    ])
    // An element shape: Archi's default is centre, which our reader leaves unset.
    expect(unexplained(align('o-handle', 'left'), align('o-handle', undefined))).toEqual([])
    expect(unexplained(align('o-handle', 'left'), align('o-handle', 'right'))).toEqual([
      'o-handle appearance.textAlignment',
    ])
    // A view reference: never measured, so never explained.
    expect(unexplained(align('o-ref-data', 'right'), align('o-ref-data', undefined))).toEqual([
      'o-ref-data appearance.textAlignment',
    ])
  })

  it('explains a text position only when Archi shows its default', () => {
    const position = (value: TextPosition | undefined) =>
      mutated((view) => {
        const node = view.nodes.find((n) => n.id === 'o-goal')!
        const appearance = { ...node.appearance }
        if (value === undefined) delete appearance.textPosition
        else appearance.textPosition = value
        node.appearance = appearance
      })
    expect(unexplained(position('bottom'), position(undefined))).toEqual([])
    expect(unexplained(position('bottom'), position('middle'))).toEqual([
      'o-goal appearance.textPosition',
    ])
  })

  it('explains a font name only on a drawing we wrote a font for', () => {
    const named = mutated((view) => {
      const node = view.nodes.find((n) => n.id === 'o-goal')!
      node.appearance = { ...node.appearance, fontName: 'Lucida Grande' }
    })
    expect(unexplained(saved, named)).toEqual(['o-goal appearance.fontName'])
    const sized = (fontName?: string) =>
      mutated((view) => {
        const node = view.nodes.find((n) => n.id === 'o-goal')!
        node.appearance = { ...node.appearance, fontSize: 12, ...(fontName ? { fontName } : {}) }
      })
    expect(unexplained(sized(), sized('Lucida Grande'))).toEqual([])
  })

  it('finds children drawn in another order under the same parent', () => {
    const reordered = mutated((view) => {
      const a = view.nodes.findIndex((n) => n.id === 'o-register')
      const b = view.nodes.findIndex((n) => n.id === 'o-accept')
      ;[view.nodes[a], view.nodes[b]] = [view.nodes[b]!, view.nodes[a]!]
    })
    expect(unexplained(reordered, saved)).toEqual(['o-handle order'])
  })

  it('finds a view’s own name, documentation, viewpoint, properties and folder', () => {
    const other = structuredClone(saved)
    const view = other.views.find((v) => v.id === 'v-landscape')!
    view.name = 'Renamed'
    view.documentation = 'Now documented.'
    view.viewpoint = 'Application Cooperation'
    view.properties = { ...view.properties, owner: 'Claims' }
    const folder = other.folders.find((f) => f.id === view.folder)!
    folder.name = 'Moved'
    // v-empty is filed in the same folder, so renaming the folder moves it too.
    expect(unexplained(saved, other)).toEqual([
      'v-empty folder',
      'v-landscape name',
      'v-landscape documentation',
      'v-landscape viewpoint',
      'v-landscape properties',
      'v-landscape folder',
    ])
  })

  it('finds a drawn element or relationship that came out different', () => {
    const other = structuredClone(saved)
    other.elements.find((e) => e.id === 'ac-fraud')!.type = 'ApplicationService'
    const relationship = other.relationships.find((r) => r.id === 'r-fraud-valuate')!
    relationship.type = 'Association'
    ;[relationship.source, relationship.target] = [relationship.target, relationship.source]
    expect(unexplained(saved, other)).toEqual([
      'ac-fraud element.type',
      'r-fraud-valuate relationship.type',
      'r-fraud-valuate relationship.source',
      'r-fraud-valuate relationship.target',
    ])
  })

  it('finds a drawn element filed in another folder, and one taken out of its folder (#130)', () => {
    const other = structuredClone(saved)
    const engine = other.elements.find((e) => e.id === 'ac-engine')!
    expect(engine.folder).toBeDefined()
    delete engine.folder
    // Same name, another place: compared by path, so a rename elsewhere does not hide it.
    other.folders.push({ id: 'f-elsewhere', name: 'Elsewhere', root: 'business' })
    other.elements.find((e) => e.id === 'as-intake')!.folder = 'f-elsewhere'
    expect(unexplained(saved, other).sort()).toEqual([
      'ac-engine element.folder',
      'as-intake element.folder',
    ])
  })

  it('tells connections apart whose ids contain the old separators', () => {
    const tricky = (source: string, target: string) => {
      const copy = structuredClone(saved)
      const view = copy.views.find((v) => v.id === 'v-landscape')!
      view.connections = [{ id: 'c', kind: 'relationship', relationship: 'r', source, target }]
      return copy
    }
    const differences = compareViews(tricky('a → b', 'c'), tricky('a', 'b → c')).map(
      (d) => `${d.drawing} ${d.field}`,
    )
    expect(differences).toContain('c draws')
  })

  it('reports what the reader could not take from Archi’s save', () => {
    const unread = archiSave.replace('id="o-fraud"', 'id="o-fraud" unknownSetting="1"')
    expect(unread).not.toBe(archiSave)
    expect(readArchiSave(unread).problems.map((p) => p.code)).toContain('import.content-unread')
  })

  it('refuses a save whose carried style it could not remove', () => {
    // Two spaces: the same property, spelled as the removal does not expect.
    const respelled = archiSave.replace(
      '<property key="archipelago.style" value=',
      '<property key="archipelago.style"  value=',
    )
    expect(respelled).not.toBe(archiSave)
    expect(() => readArchiSave(respelled)).toThrow(/archipelago\.style is still/)
  })

  it('finds nothing when both sides are the same save', () => {
    expect(compareViews(saved, saved)).toEqual([])
  })
})
