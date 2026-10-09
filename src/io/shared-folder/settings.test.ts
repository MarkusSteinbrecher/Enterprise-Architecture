import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, MAX_DISPLAY_NAME, readSettings } from './settings'

describe('the shared-folder settings (spec §10)', () => {
  it('defaults to the sponsor’s timings: settle 10 s, heartbeat 60 s, stale 30 min', () => {
    expect(readSettings(undefined)).toEqual({ ok: true, settings: DEFAULT_SETTINGS })
    expect(DEFAULT_SETTINGS).toMatchObject({
      settleMs: 10_000,
      heartbeatMs: 60_000,
      staleAfterMs: 1_800_000,
      pollMs: 15_000,
    })
  })

  it('gives a cleared, zero, negative, fractional or non-numeric timing its default, never 0', () => {
    for (const value of ['', '  ', '0', 0, -5, 1.5, 'abc', '12abc', Number.NaN, null, {}]) {
      const result = readSettings({ heartbeatMs: value })
      expect(result, String(value)).toEqual({ ok: true, settings: DEFAULT_SETTINGS })
    }
  })

  it('takes a whole number of milliseconds, as a number or as a form’s text', () => {
    expect(readSettings({ pollMs: '20000' })).toMatchObject({ settings: { pollMs: 20_000 } })
    expect(readSettings({ settleMs: 5000 })).toMatchObject({ settings: { settleMs: 5000 } })
  })

  it('refuses a stale time under four heartbeats, so fencing leaves room for one missed beat', () => {
    expect(readSettings({ heartbeatMs: 60_000, staleAfterMs: 239_999 }).ok).toBe(false)
    expect(readSettings({ heartbeatMs: 60_000, staleAfterMs: 240_000 }).ok).toBe(true)
  })

  it('trims the display name and keeps it short', () => {
    expect(readSettings({ displayName: '  Markus ' })).toMatchObject({
      settings: { displayName: 'Markus' },
    })
    const long = readSettings({ displayName: 'x'.repeat(200) })
    expect(long.ok && long.settings.displayName).toHaveLength(MAX_DISPLAY_NAME)
    expect(readSettings({ displayName: 7 })).toMatchObject({ settings: { displayName: '' } })
  })
})
