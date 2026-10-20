import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  GRID_DEFAULTS,
  GRID_STORAGE_KEY,
  isGridSize,
  readGridPreferences,
  writeGridPreferences,
} from './grid-preferences'

/** The grid preference (#136): a per-user setting in localStorage, read through guards. */

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.removeItem(GRID_STORAGE_KEY)
})

describe('grid preferences (#136)', () => {
  it('are Archi 5.10’s defaults when nothing is stored', () => {
    localStorage.removeItem(GRID_STORAGE_KEY)
    expect(readGridPreferences()).toEqual({ size: 12, visible: false, snap: true, guides: true })
  })

  it('read back what was written', () => {
    writeGridPreferences({ size: 20, visible: true, snap: false, guides: false })
    expect(readGridPreferences()).toEqual({ size: 20, visible: true, snap: false, guides: false })
  })

  it('fall back field by field, so one bad value does not take the others with it', () => {
    localStorage.setItem(
      GRID_STORAGE_KEY,
      JSON.stringify({ size: 4, visible: 'yes', snap: false, guides: null }),
    )
    expect(readGridPreferences()).toEqual({ ...GRID_DEFAULTS, snap: false })
    localStorage.setItem(GRID_STORAGE_KEY, JSON.stringify({ size: 12.5, visible: true }))
    expect(readGridPreferences()).toEqual({ ...GRID_DEFAULTS, visible: true })
  })

  it('are the defaults for a value that is not an object, or not JSON at all', () => {
    for (const stored of ['[', '"12"', '7', 'null', '[true]']) {
      localStorage.setItem(GRID_STORAGE_KEY, stored)
      expect(readGridPreferences(), stored).toEqual(GRID_DEFAULTS)
    }
  })

  it('are the defaults, and writing does not throw, when storage is blocked', () => {
    const blocked = () => {
      throw new Error('blocked')
    }
    vi.stubGlobal('localStorage', { getItem: blocked, setItem: blocked })
    expect(() => localStorage.getItem(GRID_STORAGE_KEY)).toThrow('blocked')
    expect(readGridPreferences()).toEqual(GRID_DEFAULTS)
    expect(() => writeGridPreferences({ ...GRID_DEFAULTS, visible: true })).not.toThrow()
  })

  it('take a size only in Archi’s range: whole numbers 5 to 100', () => {
    expect([5, 12, 100].map(isGridSize)).toEqual([true, true, true])
    expect([4, 101, 0, -12, 12.5, NaN, Infinity, '12', null].map(isGridSize)).toEqual(
      Array(9).fill(false),
    )
  })
})
