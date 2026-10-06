import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import matrixXml from './archi/relationships.xml?raw'
import { ELEMENT_TYPES, type ElementType } from './element-types'
import { RELATIONSHIP_TYPE_NAMES, type RelationshipType } from './relationship-types'
import {
  allowedRelationships,
  allowedRelationshipsBetween,
  allowedTargets,
  buildValidityMatrix,
  parseRelationshipMatrix,
  validateRelationship,
  validateRelationshipBetween,
  type ElementRef,
  type RelationshipContext,
  type RelationshipRef,
} from './validity'

/**
 * The matrix is Archi's `relationships.xml` (#129), so these tests hold the
 * file to what was vendored, the parser to what the file says, and a handful of
 * well-known patterns to the specification, so a newer Archi that changes one
 * is noticed rather than absorbed.
 */

const TYPES = ELEMENT_TYPES.map((m) => m.type)

function ok(source: ElementType, rel: RelationshipType, target: ElementType) {
  const result = validateRelationship(source, rel, target)
  expect(result.valid, `${source} —${rel}→ ${target} should be valid: ${result.reason}`).toBe(true)
}

function no(source: ElementType, rel: RelationshipType, target: ElementType) {
  const result = validateRelationship(source, rel, target)
  expect(result.valid, `${source} —${rel}→ ${target} should be invalid`).toBe(false)
  expect(result.reason, `${source} —${rel}→ ${target} needs an explanation`).toBeTruthy()
}

describe('the vendored matrix', () => {
  it('is the file copied from Archi 5.10, unedited', () => {
    // The hash in ./archi/NOTICE.md. A newer Archi's matrix updates both.
    expect(createHash('sha256').update(matrixXml, 'utf8').digest('hex')).toBe(
      '82cc8d11b174f3edf700fc8d6e3e061d4d9d8e65e5ec0f3c323d94f98a2681e7',
    )
  })

  it('lists every pair of our element types, so a renamed type cannot quietly allow nothing', () => {
    const matrix = parseRelationshipMatrix(matrixXml)
    const missing = TYPES.flatMap((s) => TYPES.map((t) => `${s}>${t}`)).filter(
      (key) => !matrix.has(key),
    )
    expect(missing).toEqual([])
    // Everything else in the file is a relationship as an end, which our model does not have.
    const extra = [...matrix.keys()].filter((key) => {
      const [s, t] = key.split('>') as [ElementType, ElementType]
      return !(TYPES.includes(s) && TYPES.includes(t))
    })
    expect(extra.length).toBeGreaterThan(0)
    expect(extra.every((key) => key.split('>').includes('Relationship'))).toBe(true)
  })

  it('reads every letter the file holds between element types', () => {
    // Counted without the parser: each source block's targets, by plain text.
    let letters = 0
    for (const block of matrixXml.split('<source concept="').slice(1)) {
      const source = block.slice(0, block.indexOf('"'))
      if (!TYPES.includes(source as ElementType)) continue
      for (const m of block.matchAll(/<target concept="(\w+)" relations="(\w*)"/g)) {
        if (TYPES.includes(m[1] as ElementType)) letters += m[2]!.length
      }
    }
    const cells = [...buildValidityMatrix().values()].reduce((n, types) => n + types.length, 0)
    expect(letters).toBeGreaterThan(10000)
    expect(cells).toBe(letters)
  })
})

describe('parseRelationshipMatrix', () => {
  const xml = (relations: string) =>
    `<relationships><source concept="A"><target concept="B" relations="${relations}" /></source></relationships>`

  it('maps each letter to its relationship type, as relationships-keys.xml does', () => {
    const allowed = parseRelationshipMatrix(xml('acfginorstv')).get('A>B')!
    expect([...allowed].sort()).toEqual([...RELATIONSHIP_TYPE_NAMES].sort())
  })

  it('allows a derived relationship, which Archi marks with an upper-case letter', () => {
    expect([...parseRelationshipMatrix(xml('oV')).get('A>B')!]).toEqual(['Association', 'Serving'])
  })

  it('refuses a letter it does not know, rather than dropping it', () => {
    expect(() => parseRelationshipMatrix(xml('oq'))).toThrow(/unknown letter "q" for A>B/)
  })

  it('refuses a target outside a source', () => {
    expect(() => parseRelationshipMatrix('<target concept="B" relations="o" />')).toThrow(
      /outside a source/,
    )
  })

  it('reads an empty relations attribute as allowing nothing', () => {
    expect(parseRelationshipMatrix(xml('')).get('A>B')!.size).toBe(0)
  })
})

describe('relationship validity — patterns the specification is known for', () => {
  it('permits the canonical service and deployment chains', () => {
    ok('ApplicationService', 'Serving', 'BusinessProcess')
    ok('Node', 'Serving', 'ApplicationComponent')
    ok('DataObject', 'Realization', 'BusinessObject')
    ok('ApplicationComponent', 'Realization', 'ApplicationService')
    ok('ApplicationFunction', 'Realization', 'ApplicationService')
    ok('BusinessProcess', 'Realization', 'Capability')
    ok('TechnologyService', 'Serving', 'ApplicationComponent')
    ok('Artifact', 'Realization', 'ApplicationComponent')
    ok('Artifact', 'Realization', 'DataObject')
    ok('Node', 'Assignment', 'Artifact')
  })

  it('follows ArchiMate 3.2 where the old structural rules did not (#129)', () => {
    // Cross-layer assignment ("automation") is not in 3.2's table; realization is.
    no('ApplicationComponent', 'Assignment', 'BusinessProcess')
    ok('ApplicationComponent', 'Realization', 'BusinessProcess')
    // A work package realizes a deliverable; 3.2 has no assignment between them.
    no('WorkPackage', 'Assignment', 'Deliverable')
    ok('WorkPackage', 'Realization', 'Deliverable')
    // An application component does not realize a data object; it accesses one.
    no('ApplicationComponent', 'Realization', 'DataObject')
    ok('ApplicationComponent', 'Access', 'DataObject')
    // An actor can serve an application component.
    ok('BusinessActor', 'Serving', 'ApplicationComponent')
  })

  it('refuses realization from the abstract to the concrete', () => {
    no('BusinessProcess', 'Realization', 'ApplicationComponent')
    no('Capability', 'Realization', 'BusinessProcess')
    no('BusinessObject', 'Realization', 'DataObject')
  })

  it('points influence at motivation elements only', () => {
    ok('Driver', 'Influence', 'Goal')
    ok('ApplicationComponent', 'Influence', 'Requirement')
    no('ApplicationComponent', 'Influence', 'BusinessProcess')
  })

  it('restricts specialization to identical types, outside Grouping and Junction', () => {
    const open = (type: ElementType) => type === 'Grouping' || type === 'Junction'
    ok('ApplicationComponent', 'Specialization', 'ApplicationComponent')
    no('BusinessActor', 'Specialization', 'BusinessRole')
    const across = TYPES.flatMap((source) =>
      TYPES.filter(
        (target) =>
          source !== target &&
          !open(source) &&
          !open(target) &&
          validateRelationship(source, 'Specialization', target).valid,
      ).map((target) => `${source}>${target}`),
    )
    // The pairs the specification makes specialisations of each other: a
    // contract is a business object, a constraint a requirement.
    expect(across).toEqual([
      'BusinessObject>Contract',
      'Contract>BusinessObject',
      'Requirement>Constraint',
      'Constraint>Requirement',
    ])
  })

  it('lets association join anything', () => {
    for (const source of TYPES) {
      for (const target of TYPES) {
        expect(validateRelationship(source, 'Association', target).valid).toBe(true)
      }
    }
  })

  it('lets anything reach a junction by any type, leaving the rest to the junction rules', () => {
    // What a junction may really join is decided in the model, by what is on
    // its far side (validateRelationshipBetween).
    for (const other of TYPES) {
      expect(allowedRelationships(other, 'Junction'), other).toEqual(RELATIONSHIP_TYPE_NAMES)
    }
    // Leaving one, the matrix is narrower: Archi's row for Junction.
    no('Junction', 'Composition', 'Resource')
    ok('Junction', 'Serving', 'Resource')
  })
})

describe('the reason a pair is refused', () => {
  it('names what is allowed instead, and the other direction when that one is allowed', () => {
    const result = validateRelationship('BusinessProcess', 'Serving', 'ApplicationService')
    expect(result.valid).toBe(true)
    const refused = validateRelationship(
      'ApplicationService',
      'Realization',
      'ApplicationComponent',
    )
    expect(refused.reason).toBe(
      'ArchiMate does not allow Realization from Application Service to Application Component. ' +
        `From Application Service to Application Component it allows ${listOf(allowedRelationships('ApplicationService', 'ApplicationComponent'))}. ` +
        'Realization is allowed the other way, from Application Component to Application Service.',
    )
  })

  it('leaves the other direction out when it is not allowed either', () => {
    const refused = validateRelationship('ApplicationComponent', 'Influence', 'BusinessProcess')
    expect(refused.reason).not.toMatch(/other way/)
  })
})

function listOf(types: readonly string[]): string {
  return types.length <= 1 ? types.join('') : `${types.slice(0, -1).join(', ')} and ${types.at(-1)}`
}

describe('validity matrix coverage', () => {
  it('gives every relationship type at least one legal and, but for Association, one illegal pair', () => {
    for (const rel of RELATIONSHIP_TYPE_NAMES) {
      let legal = 0
      let illegal = 0
      for (const source of TYPES) {
        for (const target of TYPES) {
          if (validateRelationship(source, rel, target).valid) legal += 1
          else illegal += 1
        }
      }
      expect(legal, `${rel} permits nothing`).toBeGreaterThan(0)
      if (rel === 'Association') expect(illegal).toBe(0)
      else expect(illegal, `${rel} permits everything`).toBeGreaterThan(0)
    }
  })

  it('agrees with itself however it is queried', () => {
    const matrix = buildValidityMatrix()
    expect(matrix.size).toBe(TYPES.length * TYPES.length)
    for (const source of TYPES) {
      for (const rel of RELATIONSHIP_TYPE_NAMES) {
        const targets = allowedTargets(source, rel)
        for (const target of TYPES) {
          const valid = validateRelationship(source, rel, target).valid
          expect(matrix.get(`${source}>${target}`)!.includes(rel)).toBe(valid)
          expect(targets.includes(target)).toBe(valid)
        }
      }
    }
  })
})

// ── Junctions in a model ─────────────────────────────────────────────────────

/** A model small enough to read: elements by id, relationships as `id type source target`. */
function model(elements: Record<string, ElementType>, ...relationships: string[]) {
  const rels: RelationshipRef[] = relationships.map((line) => {
    const [id, type, source, target] = line.split(' ') as [string, RelationshipType, string, string]
    return { id, type, source, target }
  })
  const context: RelationshipContext = {
    element: (id) => (elements[id] ? { id, type: elements[id] } : undefined),
    relationshipsOf: (id) => rels.filter((r) => r.source === id || r.target === id),
  }
  const el = (id: string): ElementRef => context.element(id)!
  return { context, el }
}

describe('validateRelationshipBetween — Archi’s junction rules (#129)', () => {
  it('is the matrix when no junction is involved', () => {
    const { context, el } = model({ ac: 'ApplicationComponent', as: 'ApplicationService' })
    for (const rel of RELATIONSHIP_TYPE_NAMES) {
      expect(validateRelationshipBetween(context, el('ac'), rel, el('as'))).toEqual(
        validateRelationship('ApplicationComponent', rel, 'ApplicationService'),
      )
    }
  })

  it('lets a bare junction take whatever the matrix allows it', () => {
    const { context, el } = model({ j: 'Junction', bp: 'BusinessProcess' })
    expect(allowedRelationshipsBetween(context, el('j'), el('bp'))).toEqual(
      allowedRelationships('Junction', 'BusinessProcess'),
    )
  })

  it('keeps every relationship on a junction to one type', () => {
    const { context, el } = model(
      { a: 'BusinessProcess', j: 'Junction', b: 'BusinessProcess' },
      'r1 Triggering a j',
    )
    expect(allowedRelationshipsBetween(context, el('j'), el('b'))).toEqual(['Triggering'])
    const refused = validateRelationshipBetween(context, el('j'), 'Flow', el('b'))
    expect(refused.reason).toMatch(/already joins Triggering relationships/)
    // The same holds arriving at the junction.
    expect(allowedRelationshipsBetween(context, el('b'), el('j'))).toEqual(['Triggering'])
  })

  it('checks what flows into a junction against the element it leads to', () => {
    // A business object can be accessed, but it cannot trigger anything.
    const { context, el } = model(
      { p: 'BusinessProcess', j: 'Junction', bo: 'BusinessObject', q: 'BusinessProcess' },
      'r1 Triggering p j',
    )
    expect(validateRelationshipBetween(context, el('j'), 'Triggering', el('q')).valid).toBe(true)
    const refused = validateRelationshipBetween(context, el('j'), 'Triggering', el('bo'))
    expect(refused.valid).toBe(false)
    expect(refused.reason).toBe(
      'Through this junction, Triggering would join Business Process to Business Object, which ArchiMate does not allow.',
    )
  })

  it('checks the element flowing in against everything the junction leads to', () => {
    const { context, el } = model(
      { j: 'Junction', p: 'BusinessProcess', bo: 'BusinessObject', q: 'BusinessProcess' },
      'r1 Triggering j p',
    )
    expect(validateRelationshipBetween(context, el('q'), 'Triggering', el('j')).valid).toBe(true)
    expect(validateRelationshipBetween(context, el('bo'), 'Triggering', el('j')).reason).toBe(
      'Through this junction, Triggering would join Business Object to Business Process, which ArchiMate does not allow.',
    )
  })

  it('does not count a Grouping or Location containing the junction', () => {
    const { context, el } = model(
      { g: 'Grouping', loc: 'Location', j: 'Junction', a: 'BusinessProcess', b: 'BusinessProcess' },
      'r1 Aggregation g j',
      'r2 Composition loc j',
      'r3 Flow a j',
    )
    expect(allowedRelationshipsBetween(context, el('j'), el('b'))).toEqual(['Flow'])
    // A Grouping may still aggregate it, though the junction joins Flows.
    expect(validateRelationshipBetween(context, el('g'), 'Composition', el('j')).valid).toBe(true)
    // A Grouping's other relationships to a junction do count.
    expect(validateRelationshipBetween(context, el('g'), 'Serving', el('j')).valid).toBe(false)
  })

  it('holds a relationship already in the model valid when it is', () => {
    const { context, el } = model(
      { a: 'BusinessProcess', j: 'Junction', b: 'BusinessProcess', c: 'BusinessEvent' },
      'r1 Triggering a j',
      'r2 Triggering j b',
      'r3 Triggering c j',
    )
    expect(validateRelationshipBetween(context, el('a'), 'Triggering', el('j')).valid).toBe(true)
    expect(validateRelationshipBetween(context, el('j'), 'Triggering', el('b')).valid).toBe(true)
  })
})
