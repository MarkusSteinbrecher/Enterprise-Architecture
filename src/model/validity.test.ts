import { describe, expect, it } from 'vitest'
import { ELEMENT_TYPES, type ElementType } from './element-types'
import { RELATIONSHIP_TYPES, type RelationshipType } from './relationship-types'
import {
  allowedRelationships,
  allowedTargets,
  buildValidityMatrix,
  validateRelationship,
} from './validity'

function ok(source: ElementType, rel: RelationshipType, target: ElementType) {
  const result = validateRelationship(source, rel, target)
  expect(result.valid, `${source} —${rel}→ ${target} should be valid: ${result.reason}`).toBe(true)
}

function no(source: ElementType, rel: RelationshipType, target: ElementType) {
  const result = validateRelationship(source, rel, target)
  expect(result.valid, `${source} —${rel}→ ${target} should be invalid`).toBe(false)
  expect(result.reason, `${source} —${rel}→ ${target} needs an explanation`).toBeTruthy()
}

describe('relationship validity — the cross-layer patterns that matter', () => {
  it('permits the canonical service and deployment chains', () => {
    // The three patterns issue #3 names explicitly.
    ok('ApplicationService', 'Serving', 'BusinessProcess')
    ok('Node', 'Serving', 'ApplicationComponent')
    ok('DataObject', 'Realization', 'BusinessObject')

    // The rest of the ArchiSurance-shaped landscape.
    ok('ApplicationComponent', 'Realization', 'ApplicationService')
    ok('ApplicationFunction', 'Realization', 'ApplicationService')
    ok('ApplicationComponent', 'Realization', 'Capability')
    ok('BusinessProcess', 'Realization', 'Capability')
    ok('ApplicationService', 'Serving', 'BusinessService')
    ok('TechnologyService', 'Serving', 'ApplicationComponent')
    ok('SystemSoftware', 'Serving', 'ApplicationComponent')
    ok('Artifact', 'Realization', 'ApplicationComponent')
    ok('Artifact', 'Realization', 'DataObject')
    ok('BusinessService', 'Serving', 'BusinessProcess')
    ok('BusinessProcess', 'Serving', 'BusinessProcess')
  })

  it('permits assignment from active structure to the behaviour it performs', () => {
    ok('BusinessActor', 'Assignment', 'BusinessProcess')
    ok('BusinessRole', 'Assignment', 'BusinessProcess')
    ok('ApplicationComponent', 'Assignment', 'ApplicationFunction')
    ok('ApplicationComponent', 'Assignment', 'BusinessProcess') // automation
    ok('Node', 'Assignment', 'TechnologyFunction')
    ok('Resource', 'Assignment', 'Capability')
    ok('BusinessActor', 'Assignment', 'BusinessRole') // an actor fulfils a role
    ok('Node', 'Assignment', 'Artifact') // deployment
    ok('ApplicationInterface', 'Assignment', 'ApplicationService')
    ok('WorkPackage', 'Assignment', 'Deliverable')
  })

  it('permits access from behaviour to passive structure only', () => {
    ok('BusinessProcess', 'Access', 'BusinessObject')
    ok('ApplicationFunction', 'Access', 'DataObject')
    ok('ApplicationComponent', 'Access', 'DataObject') // derived, and in the matrix
    no('BusinessObject', 'Access', 'DataObject')
    no('ApplicationFunction', 'Access', 'BusinessProcess')
  })

  it('permits containment only within a layer and aspect', () => {
    ok('Capability', 'Composition', 'Capability')
    ok('ApplicationComponent', 'Composition', 'ApplicationComponent')
    ok('Node', 'Composition', 'Device')
    ok('Node', 'Composition', 'SystemSoftware')
    ok('ApplicationComponent', 'Composition', 'ApplicationInterface')
    ok('BusinessCollaboration', 'Aggregation', 'BusinessRole')
    ok('Product', 'Aggregation', 'BusinessService') // named exception, spec §8
    ok('Plateau', 'Aggregation', 'ApplicationComponent')

    no('Capability', 'Composition', 'BusinessProcess') // cross-layer
    no('ApplicationComponent', 'Composition', 'DataObject') // cross-aspect
    no('BusinessProcess', 'Composition', 'ApplicationProcess')
  })

  it('refuses realization that runs from the abstract to the concrete', () => {
    no('BusinessProcess', 'Realization', 'ApplicationComponent')
    no('Capability', 'Realization', 'BusinessProcess')
    no('BusinessObject', 'Realization', 'DataObject')
  })

  it('refuses serving that runs down the stack', () => {
    no('BusinessProcess', 'Serving', 'ApplicationComponent')
    no('ApplicationComponent', 'Serving', 'Node')
    no('DataObject', 'Serving', 'ApplicationComponent') // passive structure serves nothing
  })

  it('points influence at motivation elements only', () => {
    ok('Driver', 'Influence', 'Goal')
    ok('Assessment', 'Influence', 'Driver')
    ok('ApplicationComponent', 'Influence', 'Requirement')
    ok('WorkPackage', 'Influence', 'Goal')
    no('ApplicationComponent', 'Influence', 'BusinessProcess')
  })

  it('permits realization of motivation from anywhere, and between motivation elements', () => {
    ok('Requirement', 'Realization', 'Goal')
    ok('Outcome', 'Realization', 'Goal')
    ok('ApplicationComponent', 'Realization', 'Requirement')
    ok('Deliverable', 'Realization', 'ApplicationComponent')
    ok('Deliverable', 'Realization', 'Plateau')
    ok('WorkPackage', 'Realization', 'Deliverable')
  })

  it('keeps triggering and flow between behaviour and active structure', () => {
    ok('BusinessProcess', 'Triggering', 'BusinessProcess')
    ok('BusinessEvent', 'Triggering', 'BusinessProcess')
    ok('ApplicationComponent', 'Flow', 'ApplicationComponent')
    ok('ApplicationService', 'Flow', 'BusinessProcess')
    ok('Plateau', 'Triggering', 'Plateau')
    no('DataObject', 'Flow', 'ApplicationComponent')
    no('BusinessObject', 'Triggering', 'BusinessProcess')
  })

  it('restricts specialization to identical types', () => {
    ok('ApplicationComponent', 'Specialization', 'ApplicationComponent')
    ok('Goal', 'Specialization', 'Goal')
    no('BusinessActor', 'Specialization', 'BusinessRole')
    no('Grouping', 'Specialization', 'ApplicationComponent')
  })

  it('lets association join anything', () => {
    for (const source of ELEMENT_TYPES) {
      for (const target of ELEMENT_TYPES) {
        expect(validateRelationship(source.type, 'Association', target.type).valid).toBe(true)
      }
    }
  })

  it('treats Grouping and Location as the modelling escape hatch', () => {
    ok('Grouping', 'Composition', 'ApplicationComponent')
    ok('Grouping', 'Aggregation', 'Goal')
    ok('Location', 'Assignment', 'BusinessActor')
    ok('ApplicationComponent', 'Aggregation', 'Grouping')
  })

  it('lets junctions join dynamic and dependency relationships but not containment', () => {
    ok('Junction', 'Flow', 'ApplicationComponent')
    ok('BusinessProcess', 'Triggering', 'Junction')
    ok('Junction', 'Serving', 'BusinessProcess')
    no('Junction', 'Composition', 'ApplicationComponent')
    no('ApplicationComponent', 'Aggregation', 'Junction')
    no('Junction', 'Specialization', 'Junction')
  })
})

describe('validity matrix coverage', () => {
  it('gives every relationship type at least one legal and one illegal pair', () => {
    const types = ELEMENT_TYPES.map((m) => m.type)
    for (const rel of RELATIONSHIP_TYPES) {
      let legal = 0
      let illegal = 0
      for (const source of types) {
        for (const target of types) {
          if (validateRelationship(source, rel.type, target).valid) legal += 1
          else illegal += 1
        }
      }
      expect(legal, `${rel.type} permits nothing`).toBeGreaterThan(0)
      if (rel.type === 'Association') {
        expect(illegal, 'Association is universally permitted').toBe(0)
      } else {
        expect(illegal, `${rel.type} permits everything`).toBeGreaterThan(0)
      }
    }
  })

  it('gives every element type at least one legal relationship in each direction', () => {
    const types = ELEMENT_TYPES.map((m) => m.type)
    for (const type of types) {
      const outgoing = types.some((target) => allowedRelationships(type, target).length > 0)
      const incoming = types.some((source) => allowedRelationships(source, type).length > 0)
      expect(outgoing, `${type} can be the source of nothing`).toBe(true)
      expect(incoming, `${type} can be the target of nothing`).toBe(true)
    }
  })

  it('agrees with itself however it is queried', () => {
    const matrix = buildValidityMatrix()
    expect(matrix.size).toBe(ELEMENT_TYPES.length * ELEMENT_TYPES.length)
    expect(matrix.get('ApplicationService>BusinessProcess')).toContain('Serving')
    expect(matrix.get('BusinessProcess>ApplicationService')).not.toContain('Serving')

    const targets = allowedTargets('ApplicationComponent', 'Realization')
    expect(targets).toContain('ApplicationService')
    expect(targets).toContain('Capability')
    expect(targets).not.toContain('Artifact')
  })
})
