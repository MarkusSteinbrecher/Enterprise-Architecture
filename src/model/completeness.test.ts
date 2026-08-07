import { describe, expect, it } from 'vitest'
import {
  COMPLETENESS_CONFIG,
  completenessDetail,
  completenessScore,
  completenessToken,
  modelHealth,
} from './completeness'
import type { Element } from './workspace'

function element(over: Partial<Element> = {}): Element {
  return {
    id: 'app-crm',
    type: 'ApplicationComponent',
    name: 'CRM System',
    properties: {},
    ...over,
  }
}

describe('completeness scoring', () => {
  it('scores a fully documented application at 100', () => {
    const complete = element({
      documentation: 'Customer master and interaction history.',
      properties: { owner: 'Retail BU' },
      profile: {
        lifecycle: {
          plan: '2012-01-01',
          phaseIn: '2013-01-01',
          active: '2014-01-01',
          phaseOut: '2027-01-01',
          endOfLife: '2028-01-01',
        },
        functionalFit: 2,
        technicalFit: 2,
        businessCriticality: 3,
        timeClassification: 'Migrate',
        tags: ['GDPR'],
      },
    })
    expect(completenessScore(complete, { relationCount: 4 })).toBe(100)
  })

  it('scores an empty application at 0', () => {
    expect(completenessScore(element(), { relationCount: 0 })).toBe(0)
  })

  it('does not penalise element types that carry no portfolio profile', () => {
    // A capability needs documentation, an owner, a relation and a tag — and nothing else.
    const capability = element({
      id: 'cap-claim',
      type: 'Capability',
      name: 'Claim Handling',
      documentation: 'Intake, assessment, settlement and recovery of claims.',
      properties: { owner: 'Claims' },
      profile: { tags: ['Core'] },
    })
    const detail = completenessDetail(capability, { relationCount: 3 })
    expect(detail.score).toBe(100)
    expect(detail.criteria.map((c) => c.key)).toEqual([
      'documentation',
      'owner',
      'relations',
      'tags',
    ])
  })

  it('gives partial credit for a partially dated lifecycle', () => {
    const partial = element({
      profile: { lifecycle: { plan: '2020-01-01', phaseIn: '2021-01-01' } },
    })
    const detail = completenessDetail(partial, { relationCount: 0 })
    const lifecycle = detail.criteria.find((c) => c.key === 'lifecycle')
    expect(lifecycle?.filled).toBeCloseTo(0.4)
    // 3 weight × 0.4 out of a 13-weight total.
    expect(detail.score).toBe(Math.round((1.2 / 13) * 100))
  })

  it('lists what is missing so the fact sheet can prompt for it', () => {
    const detail = completenessDetail(element({ documentation: 'Some notes.' }), {
      relationCount: 1,
    })
    expect(detail.missing.map((c) => c.key)).toEqual([
      'owner',
      'tags',
      'lifecycle',
      'functionalFit',
      'technicalFit',
      'businessCriticality',
      'timeClassification',
    ])
  })

  it('treats whitespace-only documentation as absent', () => {
    const blank = completenessDetail(element({ documentation: '   ' }), { relationCount: 0 })
    expect(blank.criteria.find((c) => c.key === 'documentation')?.filled).toBe(0)
  })

  it('keeps every weight in one exported config', () => {
    const custom = {
      ...COMPLETENESS_CONFIG,
      weights: { ...COMPLETENESS_CONFIG.weights, documentation: 100 },
    }
    const withDocs = element({ documentation: 'x' })
    expect(completenessScore(withDocs, { relationCount: 0, config: custom })).toBeGreaterThan(
      completenessScore(withDocs, { relationCount: 0 }),
    )
  })

  it('colours the ramp at 75 and 50', () => {
    expect(completenessToken(88)).toBe('var(--lc-act)')
    expect(completenessToken(75)).toBe('var(--lc-act)')
    expect(completenessToken(74)).toBe('var(--lc-out)')
    expect(completenessToken(50)).toBe('var(--lc-out)')
    expect(completenessToken(49)).toBe('var(--lc-eol)')
  })
})

describe('model health', () => {
  it('is the rounded mean of element completeness', () => {
    expect(modelHealth([100, 50, 51])).toBe(67)
    expect(modelHealth([])).toBe(0)
  })
})
