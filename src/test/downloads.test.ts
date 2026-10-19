import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadText } from '@/io'
import { stubDownloads } from './downloads'

const jsdomURL = globalThis.URL
const jsdomClick = HTMLAnchorElement.prototype.click

describe('stubDownloads', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('stands in for the Blob URL and the anchor click a download makes', () => {
    const { createObjectURL, click } = stubDownloads()
    downloadText('a.txt', 'x', 'text/plain')
    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(click).toHaveBeenCalledOnce()
    // Still a constructor: code under test may build URLs while it is stubbed.
    expect(new URL('https://example.test/a').pathname).toBe('/a')
  })

  it('leaves no revoke timer behind to fire into a later test (#182)', () => {
    vi.useFakeTimers()
    const downloads = stubDownloads()
    downloadText('a.txt', 'x', 'text/plain')
    expect(vi.getTimerCount()).toBe(1)

    downloads.restore()
    // jsdom's URL is back, and it has nothing for the timer to call.
    expect(globalThis.URL).toBe(jsdomURL)
    expect('revokeObjectURL' in URL).toBe(false)
    expect(() => vi.advanceTimersByTime(10_000)).not.toThrow()
  })

  it('takes itself down when the test that called it finishes', () => {
    stubDownloads()
    downloadText('a.txt', 'x', 'text/plain')
    expect(globalThis.URL).not.toBe(jsdomURL)
  })

  it('… so the next test sees jsdom again (runs after the one above)', () => {
    expect(globalThis.URL).toBe(jsdomURL)
    expect(HTMLAnchorElement.prototype.click).toBe(jsdomClick)
  })
})

/**
 * A hand-rolled stub is how #182 happened: six files each stubbed `URL` and put
 * it back with a download's revoke timer still pending. Every test that needs
 * one goes through `stubDownloads`.
 */
const HAND_STUB =
  /stubGlobal\(\s*['"`]URL['"`]|\bURL\.(create|revoke)ObjectURL\s*=|spyOn\(\s*(globalThis\.)?URL\b|globalThis\.URL\s*=/

describe('no test stubs URL by hand', () => {
  it('recognises the spellings a hand-rolled stub takes', () => {
    for (const source of [
      `vi.stubGlobal('URL', { ...URL, createObjectURL })`,
      `vi.stubGlobal("URL", fake)`,
      `URL.createObjectURL = vi.fn()`,
      `URL.revokeObjectURL = () => {}`,
      `vi.spyOn(URL, 'createObjectURL')`,
      `vi.spyOn(globalThis.URL, 'revokeObjectURL')`,
      `globalThis.URL = Fake`,
    ]) {
      expect(source).toMatch(HAND_STUB)
    }
    for (const source of [`expect(createObjectURL).toHaveBeenCalled()`, `new URL('a', base)`]) {
      expect(source).not.toMatch(HAND_STUB)
    }
  })

  it('finds none outside the helper', () => {
    const tests = execFileSync('git', ['ls-files', 'src/*.test.ts', 'src/*.test.tsx'], {
      encoding: 'utf8',
    })
      .split('\n')
      .filter(Boolean)
    expect(tests.length).toBeGreaterThan(50)
    const offenders = tests
      .filter((path) => path !== 'src/test/downloads.test.ts')
      .filter((path) => HAND_STUB.test(readFileSync(path, 'utf8')))
    expect(offenders).toEqual([])
  })
})
