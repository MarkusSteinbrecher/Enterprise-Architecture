import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LEGEND_OPTIONS,
  ELEMENT_TYPES,
  legendEntries,
  legendRows,
  legendWidthOffset,
  type ElementType,
  type LegendOptions,
  type RelationshipType,
  type View,
  type ViewNode,
} from '@/model'

/**
 * What a legend lists (#134), held to Archi 5.10's `LegendGraphics.update`.
 */

const box = { x: 0, y: 0, width: 120, height: 55 }

const ELEMENTS: Record<string, ElementType> = {
  'e-actor': 'BusinessActor',
  'e-actor-2': 'BusinessActor',
  'e-app': 'ApplicationComponent',
  'e-goal': 'Goal',
  'e-capability': 'Capability',
  'e-location': 'Location',
  'e-junction': 'Junction',
  'e-node': 'Node',
}
const RELATIONSHIPS: Record<string, RelationshipType> = {
  'r-serving': 'Serving',
  'r-flow': 'Flow',
  'r-serving-2': 'Serving',
}
const lookups = {
  elementType: (id: string) => ELEMENTS[id],
  relationshipType: (id: string) => RELATIONSHIPS[id],
}

function view(elements: string[], relationships: string[] = [], extra: ViewNode[] = []): View {
  return {
    id: 'v',
    name: 'V',
    properties: {},
    nodes: [
      ...elements.map((element, i): ViewNode => ({
        id: `n-${i}`,
        kind: 'element',
        element,
        bounds: box,
      })),
      ...extra,
    ],
    connections: relationships.map((relationship, i) => ({
      id: `c-${i}`,
      kind: 'relationship',
      relationship,
      source: 'n-0',
      target: 'n-1',
    })),
  }
}

const labels = (v: View, options: LegendOptions = DEFAULT_LEGEND_OPTIONS) =>
  legendEntries(v, options, lookups).map((entry) => entry.label)

describe('a legend’s entries (#134)', () => {
  it('lists each element and relationship type the view draws once, relationships last', () => {
    const v = view(['e-actor', 'e-app', 'e-actor-2'], ['r-serving', 'r-serving-2', 'r-flow'])
    expect(labels(v)).toEqual([
      'Business Actor',
      'Application Component',
      'Flow relation',
      'Serving relation',
    ])
  })

  it('orders elements by Archi’s categories, then by label; the rest come after the layers', () => {
    const v = view(['e-junction', 'e-goal', 'e-node', 'e-location', 'e-capability', 'e-app'])
    expect(labels(v)).toEqual([
      'Capability',
      'Application Component',
      'Node',
      'Goal',
      'Junction',
      'Location',
    ])
  })

  it('orders all 61 element types as Archi does, by its class hierarchy: Material with technology (#187 review)', () => {
    // Archi's order, worked out apart from the code under test: each type's rank
    // from `archimate.ecore` at release_5.10.0 by `LegendGraphics.update`'s
    // `isSuperTypeOf` tests, then by label.
    // prettier-ignore
    const archi = [
      'Capability', 'CourseOfAction', 'Resource', 'ValueStream',
      'BusinessActor', 'BusinessCollaboration', 'BusinessEvent', 'BusinessFunction',
      'BusinessInteraction', 'BusinessInterface', 'BusinessObject', 'BusinessProcess',
      'BusinessRole', 'BusinessService', 'Contract', 'Product', 'Representation',
      'ApplicationCollaboration', 'ApplicationComponent', 'ApplicationEvent',
      'ApplicationFunction', 'ApplicationInteraction', 'ApplicationInterface',
      'ApplicationProcess', 'ApplicationService', 'DataObject',
      'Artifact', 'CommunicationNetwork', 'Device', 'Material', 'Node', 'Path',
      'SystemSoftware', 'TechnologyCollaboration', 'TechnologyEvent', 'TechnologyFunction',
      'TechnologyInteraction', 'TechnologyInterface', 'TechnologyProcess', 'TechnologyService',
      'DistributionNetwork', 'Equipment', 'Facility',
      'Assessment', 'Constraint', 'Driver', 'Goal', 'Meaning', 'Outcome', 'Principle',
      'Requirement', 'Stakeholder', 'Value',
      'Deliverable', 'Gap', 'ImplementationEvent', 'Plateau', 'WorkPackage',
      'Grouping', 'Junction', 'Location',
    ]
    expect(archi).toHaveLength(ELEMENT_TYPES.length)
    const all: View = {
      id: 'v',
      name: 'V',
      properties: {},
      // Drawn in reverse, so the order is the legend's own.
      nodes: [...ELEMENT_TYPES].reverse().map((meta) => ({
        id: `n-${meta.type}`,
        kind: 'element',
        element: meta.type,
        bounds: box,
      })),
      connections: [],
    }
    const types = legendEntries(all, DEFAULT_LEGEND_OPTIONS, {
      elementType: (id) => id as ElementType,
      relationshipType: () => undefined,
    }).map((entry) => entry.type)
    expect(types).toEqual(archi)
    // The one type our catalogue files elsewhere: physical, but Archi's technology.
    expect(types.slice(types.indexOf('Device'), types.indexOf('Equipment') + 1)).toContain(
      'Material',
    )
  })

  it('orders elements by label alone when sorted by name, relationships still last', () => {
    const v = view(['e-node', 'e-capability', 'e-app'], ['r-flow'])
    expect(labels(v, { ...DEFAULT_LEGEND_OPTIONS, sort: 'name' })).toEqual([
      'Application Component',
      'Capability',
      'Node',
      'Flow relation',
    ])
  })

  it('lists only elements, or only relationships, as the options say', () => {
    const v = view(['e-actor', 'e-app'], ['r-serving'])
    expect(labels(v, { ...DEFAULT_LEGEND_OPTIONS, relations: false })).toEqual([
      'Business Actor',
      'Application Component',
    ])
    expect(labels(v, { ...DEFAULT_LEGEND_OPTIONS, elements: false })).toEqual(['Serving relation'])
  })

  it('gains an entry when the view draws an element of a new type, and none for another of a type it has', () => {
    const before = view(['e-actor'])
    expect(labels(before)).toEqual(['Business Actor'])
    expect(labels(view(['e-actor', 'e-actor-2']))).toEqual(['Business Actor'])
    expect(labels(view(['e-actor', 'e-goal']))).toEqual(['Business Actor', 'Goal'])
  })

  it('lists nothing for notes, groups, view references, lines, legends or missing concepts', () => {
    const v = view(
      ['e-missing'],
      ['r-missing'],
      [
        { id: 'note', kind: 'note', text: 'Business Actor', bounds: box },
        { id: 'group', kind: 'group', name: 'Goal', bounds: box },
        { id: 'ref', kind: 'view-ref', view: 'v', bounds: box },
        { id: 'legend', kind: 'legend', options: { ...DEFAULT_LEGEND_OPTIONS }, bounds: box },
      ],
    )
    v.connections.push({ id: 'line', kind: 'line', source: 'note', target: 'group' })
    expect(labels(v)).toEqual([])
  })
})

describe('legend option bounds, as Archi clamps them (#134)', () => {
  it('clamps rows per column to 1–100 and the column offset to ±200, and takes only whole numbers', () => {
    expect([legendRows(0), legendRows(15), legendRows(101)]).toEqual([1, 15, 100])
    expect([legendWidthOffset(-500), legendWidthOffset(20), legendWidthOffset(201)]).toEqual([
      -200, 20, 200,
    ])
    expect(legendRows(1.5)).toBeUndefined()
    expect(legendWidthOffset(Number.NaN)).toBeUndefined()
  })
})
