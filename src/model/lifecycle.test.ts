import { describe, expect, it } from 'vitest'
import {
  deriveLifecyclePhase,
  formatLifecycleDate,
  hasLifecycle,
  isPastEndOfLife,
  lifecycleYearRange,
  startOfYear,
} from './lifecycle'
import type { LifecycleDates, LifecyclePhase } from './profile'

/** The prototype/UI-spec rule, written out literally, as the reference implementation. */
function specRule(year: number, d: { in: number; act: number; out: number; eol: number }) {
  if (year < d.in) return 'plan'
  if (year < d.act) return 'phaseIn'
  if (year < d.out) return 'active'
  if (year < d.eol) return 'phaseOut'
  return 'endOfLife'
}

const HOME_AND_AWAY: LifecycleDates = {
  plan: '2006-01-01',
  phaseIn: '2007-01-01',
  active: '2008-01-01',
  phaseOut: '2027-01-01',
  endOfLife: '2029-01-01',
}

describe('lifecycle derivation', () => {
  it('matches the UI spec rule for every year in the slider range', () => {
    for (let year = 2000; year <= 2040; year += 1) {
      const expected = specRule(year, { in: 2007, act: 2008, out: 2027, eol: 2029 })
      expect(deriveLifecyclePhase(HOME_AND_AWAY, startOfYear(year)), `year ${year}`).toBe(expected)
    }
  })

  it('switches phase exactly on the boundary date, not a day before', () => {
    // 2027-01-01 is the first day of Phase Out.
    expect(deriveLifecyclePhase(HOME_AND_AWAY, Date.parse('2026-12-31T23:59:59Z'))).toBe('active')
    expect(deriveLifecyclePhase(HOME_AND_AWAY, Date.parse('2027-01-01T00:00:00Z'))).toBe('phaseOut')
    expect(deriveLifecyclePhase(HOME_AND_AWAY, Date.parse('2028-12-31T23:59:59Z'))).toBe('phaseOut')
    expect(deriveLifecyclePhase(HOME_AND_AWAY, Date.parse('2029-01-01T00:00:00Z'))).toBe(
      'endOfLife',
    )
  })

  it('treats an element with no lifecycle dates as Active', () => {
    expect(deriveLifecyclePhase(undefined, startOfYear(2026))).toBe('active')
    expect(deriveLifecyclePhase({}, startOfYear(2026))).toBe('active')
    expect(hasLifecycle(undefined)).toBe(false)
    expect(hasLifecycle({})).toBe(false)
    expect(hasLifecycle(HOME_AND_AWAY)).toBe(true)
  })

  it('handles partial lifecycles by skipping the phases that have no date', () => {
    // Only an end-of-life date: still Phase Out until it lands.
    const eolOnly: LifecycleDates = { endOfLife: '2026-01-01' }
    expect(deriveLifecyclePhase(eolOnly, startOfYear(2025))).toBe('phaseOut')
    expect(deriveLifecyclePhase(eolOnly, startOfYear(2026))).toBe('endOfLife')

    // Only a phase-in date: Plan until it starts, then Phase In forever.
    const inOnly: LifecycleDates = { phaseIn: '2027-01-01' }
    expect(deriveLifecyclePhase(inOnly, startOfYear(2026))).toBe('plan')
    expect(deriveLifecyclePhase(inOnly, startOfYear(2030))).toBe('phaseIn')

    // A plan date alone puts the element in Plan once the date has passed —
    // the literal spec rule ignores `plan` and would say End of Life instead.
    const planOnly: LifecycleDates = { plan: '2025-01-01' }
    expect(deriveLifecyclePhase(planOnly, startOfYear(2026))).toBe('plan')
    expect(deriveLifecyclePhase(planOnly, startOfYear(2024))).toBe('plan')
  })

  it('ignores unparseable dates rather than throwing', () => {
    const messy: LifecycleDates = { phaseIn: 'soon', active: '2020-01-01' }
    expect(deriveLifecyclePhase(messy, startOfYear(2026))).toBe('active')
    expect(deriveLifecyclePhase(messy, startOfYear(2010))).toBe('phaseIn')
  })

  it('reports elements past end of life for the graph', () => {
    expect(isPastEndOfLife(HOME_AND_AWAY, startOfYear(2028))).toBe(false)
    expect(isPastEndOfLife(HOME_AND_AWAY, startOfYear(2029))).toBe(true)
    expect(isPastEndOfLife(undefined, startOfYear(2029))).toBe(false)
  })

  it('is stable across every phase for a full lifecycle', () => {
    const seen = new Set<LifecyclePhase>()
    for (let year = 2000; year <= 2040; year += 1) {
      seen.add(deriveLifecyclePhase(HOME_AND_AWAY, startOfYear(year)))
    }
    expect([...seen].toSorted()).toEqual(
      ['plan', 'phaseIn', 'active', 'phaseOut', 'endOfLife'].toSorted(),
    )
  })
})

describe('lifecycle formatting and ranges', () => {
  it('prints dates the way the fact sheet does', () => {
    expect(formatLifecycleDate('2027-01-01')).toBe('01 Jan 2027')
    expect(formatLifecycleDate('2008-06-15')).toBe('15 Jun 2008')
    expect(formatLifecycleDate(undefined)).toBe('—')
    expect(formatLifecycleDate('not a date')).toBe('—')
  })

  it('derives the slider range from the dates in the model', () => {
    expect(lifecycleYearRange([HOME_AND_AWAY, { phaseIn: '2031-01-01' }])).toEqual({
      min: 2006,
      max: 2031,
    })
    expect(lifecycleYearRange([undefined, {}])).toBeUndefined()
  })
})
