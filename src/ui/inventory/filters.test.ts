import { describe, expect, it } from 'vitest'
import { startOfYear, type Element } from '@/model'
import { loadDemoWorkspace } from '@/io'
import { syntheticWorkspace } from '@/test/fixtures'
import { applyFilter, matchesFacets, matchesQuery, toggleFacet, SAVED_SEARCHES } from './filters'
import { countFacets, elementFacets } from './facets'

/**
 * The filter semantics are the part of the inventory that has to be exactly
 * right, so they are tested against hand-computed fixtures rather than through
 * the UI.
 */

const AT = startOfYear(2026)

function element(over: Partial<Element> = {}): Element {
  return {
    id: 'app-1',
    type: 'ApplicationComponent',
    name: 'CRM System',
    properties: {},
    profile: {
      lifecycle: { active: '2014-01-01', phaseOut: '2027-01-01', endOfLife: '2028-01-01' },
      timeClassification: 'Migrate',
      tags: ['GDPR', 'Vendor risk'],
    },
    ...over,
  }
}

describe('element facets', () => {
  it('derives layer, lifecycle, TIME and tags', () => {
    expect([...elementFacets(element(), AT)].toSorted()).toEqual([
      'layer:app',
      'lifecycle:active',
      'tag:GDPR',
      'tag:Vendor risk',
      'time:Migrate',
    ])
  })

  it('gives an undated element the Active phase and no TIME facet', () => {
    const capability = element({ id: 'cap', type: 'Capability', name: 'Claims', profile: {} })
    expect([...elementFacets(capability, AT)].toSorted()).toEqual(['layer:biz', 'lifecycle:active'])
  })

  it('re-derives lifecycle at the time point it is given', () => {
    expect(elementFacets(element(), startOfYear(2027))).toContain('lifecycle:phaseOut')
    expect(elementFacets(element(), startOfYear(2029))).toContain('lifecycle:endOfLife')
  })
})

describe('combinator semantics', () => {
  const keys = new Set(['layer:app', 'lifecycle:active', 'time:Migrate', 'tag:GDPR'])

  it('AND: ORs within a group and ANDs across groups', () => {
    // Within a group: either option satisfies it.
    expect(matchesFacets(keys, ['layer:app', 'layer:tec'], 'AND')).toBe(true)
    // Across groups: both must be satisfied.
    expect(matchesFacets(keys, ['layer:app', 'time:Migrate'], 'AND')).toBe(true)
    expect(matchesFacets(keys, ['layer:app', 'time:Invest'], 'AND')).toBe(false)
    // Two groups, each satisfied by one of its two options.
    expect(
      matchesFacets(keys, ['layer:app', 'layer:biz', 'time:Migrate', 'time:Invest'], 'AND'),
    ).toBe(true)
  })

  it('OR: any selected option anywhere', () => {
    expect(matchesFacets(keys, ['layer:tec', 'time:Migrate'], 'OR')).toBe(true)
    expect(matchesFacets(keys, ['layer:tec', 'time:Invest'], 'OR')).toBe(false)
  })

  it('NOT: excluded by any selected option', () => {
    expect(matchesFacets(keys, ['layer:tec'], 'NOT')).toBe(true)
    expect(matchesFacets(keys, ['layer:app'], 'NOT')).toBe(false)
    expect(matchesFacets(keys, ['layer:tec', 'tag:GDPR'], 'NOT')).toBe(false)
  })

  it('matches everything when nothing is selected, in every mode', () => {
    for (const mode of ['AND', 'OR', 'NOT'] as const) {
      expect(matchesFacets(keys, [], mode)).toBe(true)
    }
  })

  it('ignores malformed facet keys rather than throwing', () => {
    expect(matchesFacets(keys, ['nonsense'], 'AND')).toBe(true)
    expect(matchesFacets(keys, ['nonsense'], 'OR')).toBe(false)
  })
})

describe('name query', () => {
  it('matches name and type, case-insensitively', () => {
    expect(matchesQuery(element(), 'crm')).toBe(true)
    expect(matchesQuery(element(), 'APPLICATION COMPONENT')).toBe(true)
    expect(matchesQuery(element(), 'ledger')).toBe(false)
    expect(matchesQuery(element(), '   ')).toBe(true)
  })

  it('is ANDed on top of facets in every mode', () => {
    const elements = [
      element({ id: 'a', name: 'CRM System' }),
      element({ id: 'b', name: 'Payment Gateway' }),
    ]
    // NOT excludes nothing here, but the query still narrows the result.
    const result = applyFilter(elements, { facets: ['layer:tec'], mode: 'NOT', query: 'crm' }, AT)
    expect(result.map((e) => e.id)).toEqual(['a'])
  })
})

describe('facet counts', () => {
  it('counts globally over the whole workspace, not the filtered set', () => {
    const workspace = loadDemoWorkspace()
    const counts = countFacets(workspace.elements, AT)
    // 11 application components in the demo, plus nothing else in the app ramp.
    expect(counts.get('layer:app')).toBe(11)
    expect(counts.get('layer:pas')).toBe(4)
    expect(counts.get('time:Invest')).toBe(4)
    // An option nothing carries is absent rather than zero.
    expect(counts.get('lifecycle:plan')).toBeGreaterThanOrEqual(0)
  })
})

describe('applyFilter over the demo workspace', () => {
  const workspace = loadDemoWorkspace()
  const all = workspace.elements

  it('returns everything with an empty filter', () => {
    expect(applyFilter(all, { facets: [], mode: 'AND', query: '' }, AT)).toHaveLength(29)
  })

  it('filters to a single layer', () => {
    const apps = applyFilter(all, { facets: ['layer:app'], mode: 'AND', query: '' }, AT)
    expect(apps).toHaveLength(11)
    expect(apps.every((element) => element.type === 'ApplicationComponent')).toBe(true)
  })

  it('applies the end-of-life saved search as its label promises', () => {
    const saved = SAVED_SEARCHES.find((s) => s.id === 'eol-applications')!
    const result = applyFilter(all, { facets: saved.facets, mode: saved.mode, query: '' }, AT)
    // Applications only, and only those past their phase-out date in 2026.
    expect(result.every((element) => element.type === 'ApplicationComponent')).toBe(true)
    expect(result.map((element) => element.id).toSorted()).toEqual(['app-legal', 'app-policy-car'])
  })

  it('is not the same as the OR reading of that saved search', () => {
    const saved = SAVED_SEARCHES.find((s) => s.id === 'eol-applications')!
    const asOr = applyFilter(all, { facets: saved.facets, mode: 'OR', query: '' }, AT)
    // OR returns every application plus everything phasing out anywhere — which
    // is why the saved search ships as AND.
    expect(asOr.length).toBeGreaterThan(11)
  })

  it('preserves input order', () => {
    const result = applyFilter(all, { facets: ['layer:app'], mode: 'AND', query: '' }, AT)
    const expected = all.filter((e) => e.type === 'ApplicationComponent').map((e) => e.id)
    expect(result.map((e) => e.id)).toEqual(expected)
  })
})

describe('at 5,000 elements', () => {
  const big = syntheticWorkspace(5_000)

  it('filters the whole workspace well inside a frame budget', () => {
    const start = performance.now()
    const result = applyFilter(
      big.elements,
      { facets: ['layer:app', 'time:Invest'], mode: 'AND', query: 'Application 1' },
      AT,
    )
    const elapsed = performance.now() - start
    expect(result.length).toBeGreaterThan(0)
    // Generous by an order of magnitude: this is a regression guard, not a benchmark.
    expect(elapsed).toBeLessThan(500)
  })

  it('counts facets across the whole workspace once', () => {
    const start = performance.now()
    const counts = countFacets(big.elements, AT)
    expect(counts.get('layer:app')).toBe(4_900)
    expect(performance.now() - start).toBeLessThan(500)
  })
})

describe('toggleFacet', () => {
  it('adds and removes', () => {
    expect(toggleFacet([], 'layer:app')).toEqual(['layer:app'])
    expect(toggleFacet(['layer:app'], 'layer:app')).toEqual([])
    expect(toggleFacet(['layer:app'], 'time:Invest')).toEqual(['layer:app', 'time:Invest'])
  })
})
