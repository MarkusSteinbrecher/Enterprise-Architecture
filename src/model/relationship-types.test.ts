import { describe, expect, it } from 'vitest'
import {
  RELATIONSHIP_TYPES,
  RELATION_BLOCK_ORDER,
  findRelationshipType,
  isRelationshipType,
  relationshipTypeMeta,
} from './relationship-types'

describe('relationship catalogue', () => {
  it('has the eleven ArchiMate 3.2 relationship types', () => {
    expect(RELATIONSHIP_TYPES.map((m) => m.type)).toEqual([
      'Composition',
      'Aggregation',
      'Assignment',
      'Realization',
      'Serving',
      'Access',
      'Influence',
      'Triggering',
      'Flow',
      'Specialization',
      'Association',
    ])
  })

  it('gives every type a unique four-letter abbreviation', () => {
    const abbrs = new Set<string>()
    for (const meta of RELATIONSHIP_TYPES) {
      expect(meta.abbr, `${meta.type} abbreviation`).toMatch(/^[A-Z]{4}$/)
      expect(abbrs.has(meta.abbr), `duplicate abbreviation ${meta.abbr}`).toBe(false)
      abbrs.add(meta.abbr)
    }
  })

  it('draws the handoff-named structural relations solid and the rest dashed', () => {
    // Handoff: "Solid for structural relations (Realization, Serving, Assignment,
    // Composition), dashed for Flow / Access / Association."
    expect(relationshipTypeMeta('Realization').notation).toBe('solid')
    expect(relationshipTypeMeta('Serving').notation).toBe('solid')
    expect(relationshipTypeMeta('Assignment').notation).toBe('solid')
    expect(relationshipTypeMeta('Composition').notation).toBe('solid')
    expect(relationshipTypeMeta('Flow').notation).toBe('dashed')
    expect(relationshipTypeMeta('Access').notation).toBe('dashed')
    expect(relationshipTypeMeta('Association').notation).toBe('dashed')
  })

  it('orders the fact sheet relation blocks with the handoff eight first', () => {
    expect(RELATION_BLOCK_ORDER.slice(0, 8)).toEqual([
      'Realization',
      'Serving',
      'Flow',
      'Access',
      'Assignment',
      'Composition',
      'Association',
      'Influence',
    ])
    expect(RELATION_BLOCK_ORDER).toHaveLength(RELATIONSHIP_TYPES.length)
    expect(new Set(RELATION_BLOCK_ORDER).size).toBe(RELATIONSHIP_TYPES.length)
  })

  it('looks types up by name', () => {
    expect(isRelationshipType('Serving')).toBe(true)
    expect(isRelationshipType('Consumes')).toBe(false)
    expect(findRelationshipType('Consumes')).toBeUndefined()
    expect(() => relationshipTypeMeta('Consumes' as never)).toThrow(/Unknown ArchiMate/)
  })
})
