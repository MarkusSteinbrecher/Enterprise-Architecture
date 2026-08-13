import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Element, Relationship } from '@/model'

/**
 * The worker protocol, driven for real.
 *
 * jsdom defines no `Worker`, so every other test in this repo takes the
 * `unavailable` branch and lays out on the main thread. That leaves the whole
 * reason the worker exists — the handshake, its timeout, and the error channel —
 * running only in a browser, which is where issue #10's fifth acceptance
 * criterion lives and where the #28 review found all of it broken.
 *
 * So: a fake `Worker` that lets the test decide what comes back and when.
 * `vi.resetModules()` before each import is load-bearing — `layout.ts` caches
 * one worker instance in a module-level binding, so without it the second test
 * reuses the first test's fake.
 */

class FakeWorker {
  static latest: FakeWorker | undefined
  #listeners = new Map<string, Set<(event: unknown) => void>>()
  posted: { id: number }[] = []
  terminated = false

  constructor() {
    FakeWorker.latest = this
  }

  addEventListener(type: string, fn: (event: unknown) => void): void {
    const set = this.#listeners.get(type) ?? new Set()
    set.add(fn)
    this.#listeners.set(type, set)
  }

  removeEventListener(type: string, fn: (event: unknown) => void): void {
    this.#listeners.get(type)?.delete(fn)
  }

  postMessage(message: { id: number }): void {
    this.posted.push(message)
  }

  terminate(): void {
    this.terminated = true
  }

  /** Deliver a message as the real worker would. */
  reply(data: unknown): void {
    for (const fn of this.#listeners.get('message') ?? []) fn({ data })
  }

  /** Fire the worker's own error channel (script blocked, crashed). */
  fail(): void {
    for (const fn of this.#listeners.get('error') ?? []) fn(new Event('error'))
  }
}

const ELEMENTS: Element[] = [
  { id: 'a', type: 'ApplicationComponent', name: 'A', properties: {} },
  { id: 'b', type: 'ApplicationComponent', name: 'B', properties: {} },
]
const RELATIONSHIPS: Relationship[] = [
  { id: 'r1', type: 'Serving', source: 'a', target: 'b', properties: {} },
]

async function freshLayout() {
  vi.resetModules()
  return await import('./layout')
}

beforeEach(() => {
  FakeWorker.latest = undefined
  vi.stubGlobal('Worker', FakeWorker)
  // Only the ack timer is faked; ELK's own promises must still settle.
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('the layout worker protocol', () => {
  it('uses the worker’s answer when it acks and returns one', async () => {
    const { runLayout } = await freshLayout()
    const pending = runLayout(ELEMENTS, RELATIONSHIPS)

    const worker = FakeWorker.latest
    expect(worker, 'runLayout should have constructed a Worker').toBeDefined()
    const { id } = worker!.posted[0]!

    worker!.reply({ id, ack: true })
    worker!.reply({
      id,
      result: {
        nodes: [
          { id: 'a', x: 11, y: 0 },
          { id: 'b', x: 22, y: 0 },
        ],
        width: 40,
        height: 10,
      },
    })

    const result = await pending
    expect([...result.nodes.keys()].toSorted()).toEqual(['a', 'b'])
    // A worker that answered is kept for the next layout, not thrown away.
    expect(worker!.terminated).toBe(false)
  })

  it('gives up on a worker that never acks, and lays out anyway', async () => {
    const { runLayout } = await freshLayout()
    const pending = runLayout(ELEMENTS, RELATIONSHIPS)
    const worker = FakeWorker.latest!

    // The handshake budget. Nothing has acked, so the worker is presumed dead.
    await vi.advanceTimersByTimeAsync(2_100)
    expect(worker.terminated).toBe(true)

    // The fallback is real ELK, which wants a real clock.
    vi.useRealTimers()
    const result = await pending
    expect([...result.nodes.keys()].toSorted()).toEqual(['a', 'b'])
  })

  it('does not start the clock again once the worker has acked', async () => {
    const { runLayout } = await freshLayout()
    const pending = runLayout(ELEMENTS, RELATIONSHIPS)
    const worker = FakeWorker.latest!
    const { id } = worker.posted[0]!

    worker.reply({ id, ack: true })
    // Far past the handshake budget: a slow layout is not a dead one.
    await vi.advanceTimersByTimeAsync(30_000)
    expect(worker.terminated).toBe(false)

    worker.reply({
      id,
      result: {
        nodes: [
          { id: 'a', x: 0, y: 0 },
          { id: 'b', x: 5, y: 0 },
        ],
        width: 10,
        height: 10,
      },
    })
    await expect(pending).resolves.toBeDefined()
  })

  it('surfaces an ELK failure instead of silently retrying it on the main thread', async () => {
    const { runLayout } = await freshLayout()
    const pending = runLayout(ELEMENTS, RELATIONSHIPS)
    const worker = FakeWorker.latest!
    const { id } = worker.posted[0]!

    worker.reply({ id, ack: true })
    worker.reply({ id, error: 'elk exploded' })

    // Re-running the same failing call on the main thread only fails again,
    // which is what this branch existed to stop.
    await expect(pending).rejects.toThrow(/elk exploded/)
  })

  it('falls back when the worker itself errors', async () => {
    const { runLayout } = await freshLayout()
    const pending = runLayout(ELEMENTS, RELATIONSHIPS)
    const worker = FakeWorker.latest!

    worker.fail()
    expect(worker.terminated).toBe(true)

    // Same as above: the fallback runs real ELK.
    vi.useRealTimers()
    const result = await pending
    expect([...result.nodes.keys()].toSorted()).toEqual(['a', 'b'])
  })

  it('ignores a reply meant for an earlier request', async () => {
    const { runLayout } = await freshLayout()
    const pending = runLayout(ELEMENTS, RELATIONSHIPS)
    const worker = FakeWorker.latest!
    const { id } = worker.posted[0]!

    // A stale response from a superseded layout must not settle this one.
    worker.reply({ id: id + 999, result: { nodes: [], width: 0, height: 0 } })
    worker.reply({ id, ack: true })
    worker.reply({
      id,
      result: {
        nodes: [
          { id: 'a', x: 0, y: 0 },
          { id: 'b', x: 5, y: 0 },
        ],
        width: 10,
        height: 10,
      },
    })

    const result = await pending
    expect(result.nodes).toHaveLength(2)
  })
})
