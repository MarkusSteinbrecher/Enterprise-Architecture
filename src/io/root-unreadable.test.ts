import { describe, expect, it, vi } from 'vitest'
import claimsNative from './fixtures/claims-platform.archimate?raw'
import claimsExchange from './fixtures/claims-platform.xml?raw'
import type * as XmlRoot from './xml-root'

// The scan and the parser are two readings of one file. Where they disagree —
// the parser reads it, the scan finds no root — the guards used to be skipped
// and the file came in empty, ok and silent (#103). No input is known to reach
// this after #103's doctype fix, so the scan is stubbed to fail: what is tested
// is that each reader fails closed when it does.
vi.mock('./xml-root', async (actual) => ({
  ...(await actual<typeof XmlRoot>()),
  xmlRoot: () => undefined,
}))

const { importArchimate } = await import('./archimate-native')
const { importExchangeXml } = await import('./exchange-format')

describe('a root the scan cannot find (#103)', () => {
  it('is refused by both readers, not read as an empty model', () => {
    for (const [result, code] of [
      [importArchimate(claimsNative), 'archimate.root-unreadable'],
      [importExchangeXml(claimsExchange), 'exchange.root-unreadable'],
    ] as const) {
      expect(result.ok).toBe(false)
      expect(result.workspace).toBeUndefined()
      expect(result.problems.map((p) => p.code)).toEqual([code])
    }
  })
})
