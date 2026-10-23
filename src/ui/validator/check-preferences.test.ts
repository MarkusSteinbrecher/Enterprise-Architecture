import { afterEach, describe, expect, it, vi } from 'vitest'
import { CHECK_IDS } from '@/model'
import { CHECKS_STORAGE_KEY, readEnabledChecks, writeEnabledChecks } from './check-preferences'

/** Which checks are on (#193): every one, unless this browser says otherwise. */

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

const store = (value: string) => localStorage.setItem(CHECKS_STORAGE_KEY, value)

describe('the checks a viewer has switched off (#193)', () => {
  it('are none when nothing is stored, as Archi turns all eight on', () => {
    expect([...readEnabledChecks()]).toEqual(CHECK_IDS)
  })

  it('round-trip through storage', () => {
    writeEnabledChecks(new Set(['nesting', 'junctions']))
    expect([...readEnabledChecks()]).toEqual(['nesting', 'junctions'])
  })

  it('are only those stored as false: a check the object leaves out, or gives anything else, is on', () => {
    store(JSON.stringify({ nesting: false, junctions: 'false', viewpoint: 0, 'empty-views': null }))
    const enabled = readEnabledChecks()
    expect(enabled.has('nesting')).toBe(false)
    expect(enabled.size).toBe(CHECK_IDS.length - 1)
  })

  it.each([['not json'], ['null'], ['[false]'], ['7'], ['"nesting"']])(
    'are none when storage holds %s',
    (raw) => {
      store(raw)
      expect(localStorage.getItem(CHECKS_STORAGE_KEY)).toBe(raw)
      expect([...readEnabledChecks()]).toEqual(CHECK_IDS)
    },
  )

  it('are none, and writing does not throw, when storage is blocked', () => {
    const blocked = () => {
      throw new Error('blocked')
    }
    vi.stubGlobal('localStorage', { getItem: blocked, setItem: blocked })
    expect(() => localStorage.getItem(CHECKS_STORAGE_KEY)).toThrow('blocked')
    expect([...readEnabledChecks()]).toEqual(CHECK_IDS)
    expect(() => writeEnabledChecks(new Set())).not.toThrow()
  })
})
