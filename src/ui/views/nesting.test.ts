import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  ELEMENT_TYPES,
  emptyWorkspace,
  parseRelationshipMatrix,
  validateRelationshipBetween,
  type Element,
  type ElementType,
  type Relationship,
  type RelationshipType,
  type View,
} from '@/model'
import { ModelStore } from '@/store/model-store'
import {
  NESTING_TYPES,
  nestingEdit,
  nestingFor,
  nestingOptions,
  withNewElement,
  type NestingOption,
} from './nesting'

/**
 * What a nesting asks and makes (#131), held to Archi 5.10: the offered types
 * to Archi's matrix read from disk (not through `validity.ts`, which is what
 * `nestingOptions` itself asks), and the rest to the rules in the source of
 * `CreateNestedArchimateConnectionsWithDialogCommand`.
 */

const MATRIX = parseRelationshipMatrix(
  readFileSync(join(process.cwd(), 'src', 'model', 'archi', 'relationships.xml'), 'utf8'),
)
const archiAllows = (source: ElementType, type: RelationshipType, target: ElementType) =>
  MATRIX.get(`${source}>${target}`)?.has(type) ?? false

const element = (id: string, type: ElementType): Element => ({ id, type, name: id, properties: {} })
const relationship = (
  id: string,
  type: RelationshipType,
  source: string,
  target: string,
): Relationship => ({ id, type, source, target, properties: {} })

function storeWith(elements: Element[], relationships: Relationship[] = []): ModelStore {
  return new ModelStore({ ...emptyWorkspace('w', 'W'), elements, relationships })
}

const types = (options: readonly NestingOption[] | undefined) => options?.map((o) => o.type)

describe('what a nesting offers (#131)', () => {
  it("offers exactly Archi's nesting types that its matrix allows, in Archi's order, for every pair", () => {
    let asked = 0
    let silent = 0
    const kinds = ELEMENT_TYPES.map((meta) => meta.type).filter((type) => type !== 'Junction')
    for (const parentType of kinds) {
      for (const childType of kinds) {
        const parent = element('p', parentType)
        const child = element('c', childType)
        const expected = NESTING_TYPES.filter((type) => archiAllows(parentType, type, childType))
        const offered = types(nestingOptions(storeWith([parent, child]), parent, child))
        expect(offered, `${parentType} > ${childType}`).toEqual(
          expected.length ? expected : undefined,
        )
        if (expected.length) asked += 1
        else silent += 1
      }
    }
    // Both branches are reached: some pairs are asked about, and some are not.
    expect(asked).toBeGreaterThan(0)
    expect(silent).toBeGreaterThan(0)
  })

  it('makes a Specialization from the child to the parent, as Archi inverts it', () => {
    const parent = element('p', 'BusinessActor')
    const child = element('c', 'BusinessActor')
    const options = nestingOptions(storeWith([parent, child]), parent, child)!
    const specialization = options.find((o) => o.type === 'Specialization')!
    expect(specialization).toMatchObject({ source: child, target: parent })
    for (const o of options.filter((o) => o.type !== 'Specialization')) {
      expect(o, o.type).toMatchObject({ source: parent, target: child })
    }
  })

  it('never asks about a junction', () => {
    const parent = element('p', 'BusinessProcess')
    const junction = element('j', 'Junction')
    expect(nestingOptions(storeWith([parent, junction]), parent, junction)).toBeUndefined()
  })

  describe('a relationship the nesting can mean already exists', () => {
    const parent = element('p', 'ApplicationComponent')
    const child = element('c', 'ApplicationComponent')
    const ask = (...held: Relationship[]) =>
      types(nestingOptions(storeWith([parent, child], held), parent, child))

    // What Archi's matrix allows here, read from the file: the baseline the cases below hold to.
    const all = NESTING_TYPES.filter((type) =>
      archiAllows('ApplicationComponent', type, 'ApplicationComponent'),
    )

    it('asks when there is none', () => {
      expect(all.length).toBeGreaterThan(1)
      expect(ask()).toEqual(all)
    })

    it('does not ask when the parent already has one of the offered types to the child', () => {
      for (const type of NESTING_TYPES) {
        if (type === 'Specialization' || !all.includes(type)) continue
        expect(ask(relationship('r', type, 'p', 'c')), type).toBeUndefined()
      }
    })

    it('does not ask when the child is already a specialization of the parent', () => {
      expect(ask(relationship('r', 'Specialization', 'c', 'p'))).toBeUndefined()
    })

    it('still asks when what exists is not a type a nesting can mean, or runs the other way', () => {
      // Serving and Flow are not nesting types; Composition from child to parent
      // does not count, as Archi's reverse list is empty.
      expect(ask(relationship('r1', 'Serving', 'p', 'c'))).toEqual(all)
      expect(ask(relationship('r2', 'Flow', 'p', 'c'))).toEqual(all)
      expect(ask(relationship('r3', 'Composition', 'c', 'p'))).toEqual(all)
    })
  })
})

describe('which children are asked about (#131)', () => {
  const engine = element('engine', 'ApplicationComponent')
  const api = element('api', 'ApplicationInterface')
  const junction = element('j', 'Junction')
  const view: View = {
    id: 'v',
    name: 'V',
    properties: {},
    nodes: [
      {
        id: 'n-engine',
        kind: 'element',
        element: 'engine',
        bounds: { x: 0, y: 0, width: 400, height: 200 },
      },
      {
        id: 'n-group',
        kind: 'group',
        name: 'G',
        bounds: { x: 500, y: 0, width: 400, height: 200 },
      },
      {
        id: 'n-api',
        kind: 'element',
        element: 'api',
        parent: 'n-engine',
        bounds: { x: 10, y: 10, width: 120, height: 55 },
      },
      {
        id: 'n-j',
        kind: 'element',
        element: 'j',
        parent: 'n-engine',
        bounds: { x: 200, y: 10, width: 15, height: 15 },
      },
      {
        id: 'n-note',
        kind: 'note',
        text: '',
        parent: 'n-engine',
        bounds: { x: 300, y: 10, width: 50, height: 50 },
      },
    ],
    connections: [],
  }
  const store = storeWith([engine, api, junction])

  it('asks about element shapes in an element shape, and about nothing else', () => {
    const nesting = nestingFor(store, view, 'n-engine', ['n-api', 'n-j', 'n-note'])!
    expect(nesting.element).toBe(engine)
    expect(nesting.ask.map((child) => child.node)).toEqual(['n-api'])
  })

  it('asks nothing when the parent is a group', () => {
    expect(nestingFor(store, view, 'n-group', ['n-api'])).toBeUndefined()
  })

  it('asks about a new element the model does not hold yet, when told about it', () => {
    const fresh = element('fresh', 'ApplicationInterface')
    const withFresh: View = {
      ...view,
      nodes: [
        ...view.nodes,
        {
          id: 'n-fresh',
          kind: 'element',
          element: 'fresh',
          parent: 'n-engine',
          bounds: { x: 0, y: 100, width: 120, height: 55 },
        },
      ],
    }
    expect(nestingFor(store, withFresh, 'n-engine', ['n-fresh'])).toBeUndefined()
    expect(
      nestingFor(withNewElement(store, fresh), withFresh, 'n-engine', ['n-fresh'])?.ask,
    ).toHaveLength(1)
  })
})

describe('what a nesting makes (#131)', () => {
  const engine = element('engine', 'ApplicationComponent')
  const hub = element('hub', 'ApplicationComponent')
  const nested: View = {
    id: 'v',
    name: 'V',
    properties: {},
    nodes: [
      {
        id: 'n-engine',
        kind: 'element',
        element: 'engine',
        bounds: { x: 0, y: 0, width: 400, height: 200 },
      },
      {
        id: 'n-hub',
        kind: 'element',
        element: 'hub',
        parent: 'n-engine',
        bounds: { x: 10, y: 10, width: 120, height: 55 },
      },
    ],
    connections: [],
  }
  let n = 0
  const ids = (kind: 'rel' | 'conn') => `${kind}-${++n}`

  it('makes the chosen relationship and a connection drawing it, parent to child', () => {
    n = 0
    const store = storeWith([engine, hub])
    const option = nestingOptions(store, engine, hub)!.find((o) => o.type === 'Composition')!
    const edit = nestingEdit(
      store,
      nested,
      'n-engine',
      ['n-hub'],
      new Map([['n-hub', option]]),
      ids,
    )
    expect(edit.relationships).toEqual([relationship('rel-1', 'Composition', 'engine', 'hub')])
    expect(edit.view.connections).toEqual([
      {
        id: 'conn-2',
        kind: 'relationship',
        relationship: 'rel-1',
        source: 'n-engine',
        target: 'n-hub',
      },
    ])
  })

  it('draws a chosen Specialization from the child to the parent', () => {
    n = 0
    const store = storeWith([engine, hub])
    const option = nestingOptions(store, engine, hub)!.find((o) => o.type === 'Specialization')!
    const edit = nestingEdit(
      store,
      nested,
      'n-engine',
      ['n-hub'],
      new Map([['n-hub', option]]),
      ids,
    )
    expect(edit.relationships[0]).toMatchObject({ source: 'hub', target: 'engine' })
    expect(edit.view.connections[0]).toMatchObject({ source: 'n-hub', target: 'n-engine' })
  })

  it('makes nothing for none', () => {
    const store = storeWith([engine, hub])
    const edit = nestingEdit(store, nested, 'n-engine', ['n-hub'], new Map([['n-hub', null]]), ids)
    expect(edit).toEqual({ view: nested, relationships: [] })
  })

  it('draws the relationships the model holds between them, in each direction none is drawn', () => {
    n = 0
    const held = [
      relationship('r-serves', 'Serving', 'engine', 'hub'),
      relationship('r-flows', 'Flow', 'engine', 'hub'),
      relationship('r-back', 'Triggering', 'hub', 'engine'),
    ]
    const store = storeWith([engine, hub], held)
    const edit = nestingEdit(store, nested, 'n-engine', ['n-hub'], new Map(), ids)
    expect(edit.relationships).toEqual([])
    expect(
      edit.view.connections.map((c) => [
        c.kind === 'relationship' && c.relationship,
        c.source,
        c.target,
      ]),
    ).toEqual([
      ['r-serves', 'n-engine', 'n-hub'],
      ['r-flows', 'n-engine', 'n-hub'],
      ['r-back', 'n-hub', 'n-engine'],
    ])
  })

  it('draws none in a direction where one of them is drawn already, as Archi checks', () => {
    const held = [
      relationship('r-serves', 'Serving', 'engine', 'hub'),
      relationship('r-flows', 'Flow', 'engine', 'hub'),
    ]
    const store = storeWith([engine, hub], held)
    const drawn: View = {
      ...nested,
      connections: [
        {
          id: 'c',
          kind: 'relationship',
          relationship: 'r-serves',
          source: 'n-engine',
          target: 'n-hub',
        },
      ],
    }
    const edit = nestingEdit(store, drawn, 'n-engine', ['n-hub'], new Map(), ids)
    expect(edit.view).toBe(drawn)
  })

  it('agrees with validity.ts about what is valid, so the editor offers nothing it would refuse', () => {
    const store = storeWith([engine, hub])
    for (const option of nestingOptions(store, engine, hub)!) {
      expect(
        validateRelationshipBetween(store, option.source, option.type, option.target).valid,
      ).toBe(true)
    }
  })
})
