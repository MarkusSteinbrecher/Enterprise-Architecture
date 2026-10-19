import { onTestFinished, vi } from 'vitest'

/**
 * Stand-in Blob URL plumbing for a test that triggers a download.
 *
 * jsdom implements neither `URL.createObjectURL` nor `URL.revokeObjectURL`, and
 * clicking the download anchor would ask it to navigate. Call this inside a
 * test or a `beforeEach`: the stub is taken down when the test finishes.
 *
 * `downloadBlob` revokes the URL on a 10 s timer that looks `URL` up when it
 * fires. Restoring jsdom's `URL` while that timer is pending lets it fire into
 * whichever test is running 10 s later, where it throws, and Vitest fails the
 * run on an error no test owns — only on a run slow enough for a file to pass
 * 10 s, as a CI coverage run can (#182). So every timer scheduled while the stub
 * is in place is cleared before `URL` is put back: nothing a test started
 * outlives it.
 */
export function stubDownloads() {
  const createObjectURL = vi.fn((_blob: Blob | MediaSource) => 'blob:test')
  const revokeObjectURL = vi.fn((_url: string) => {})
  // A subclass, so `new URL(…)` still works while the stub is in place.
  class StubURL extends URL {
    static override createObjectURL = createObjectURL
    static override revokeObjectURL = revokeObjectURL
  }

  // jsdom's `URL` is an accessor here, which is put back exactly as it was.
  const original = Object.getOwnPropertyDescriptor(globalThis, 'URL')!
  Object.defineProperty(globalThis, 'URL', { configurable: true, writable: true, value: StubURL })
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  const timers = vi.spyOn(globalThis, 'setTimeout')

  let restored = false
  const restore = () => {
    if (restored) return
    restored = true
    for (const result of timers.mock.results) {
      if (result.type === 'return') clearTimeout(result.value)
    }
    timers.mockRestore()
    click.mockRestore()
    Object.defineProperty(globalThis, 'URL', original)
  }
  onTestFinished(restore)

  return { createObjectURL, revokeObjectURL, click, restore }
}
