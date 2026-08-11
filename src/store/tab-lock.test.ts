import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { TabLock } from './tab-lock'

/**
 * jsdom implements neither Web Locks nor BroadcastChannel, so both are faked
 * in-process here. The fakes are deliberately minimal but honour the two
 * behaviours the store depends on: `ifAvailable` answers immediately, and a lock
 * is held until the callback's promise settles.
 */

class FakeLockManager {
  held = new Set<string>()

  async request(
    name: string,
    options: { ifAvailable?: boolean },
    callback: (lock: { name: string } | null) => unknown,
  ): Promise<unknown> {
    if (options.ifAvailable && this.held.has(name)) {
      return callback(null)
    }
    if (this.held.has(name)) throw new Error('fake lock manager only supports ifAvailable')
    this.held.add(name)
    const result = callback({ name })
    void Promise.resolve(result).finally(() => this.held.delete(name))
    return result
  }
}

const channels = new Map<string, Set<FakeBroadcastChannel>>()

class FakeBroadcastChannel {
  onmessage: ((event: { data: unknown }) => void) | null = null
  #name: string

  constructor(name: string) {
    this.#name = name
    const peers = channels.get(name) ?? new Set()
    peers.add(this)
    channels.set(name, peers)
  }

  postMessage(data: unknown): void {
    for (const peer of channels.get(this.#name) ?? []) {
      if (peer !== this) peer.onmessage?.({ data })
    }
  }

  close(): void {
    channels.get(this.#name)?.delete(this)
  }
}

let locks: FakeLockManager

beforeEach(() => {
  locks = new FakeLockManager()
  Object.defineProperty(navigator, 'locks', { configurable: true, value: locks })
  channels.clear()
  Object.defineProperty(globalThis, 'BroadcastChannel', {
    configurable: true,
    writable: true,
    value: FakeBroadcastChannel,
  })
})

afterEach(() => {
  Reflect.deleteProperty(navigator, 'locks')
})

describe('tab lock', () => {
  it('makes the first tab the writer', async () => {
    const first = new TabLock()
    expect(await first.acquire()).toBe('writer')
    expect(first.isWriter).toBe(true)
    first.stop()
  })

  it('makes a second tab a reader without blocking it', async () => {
    const first = new TabLock()
    await first.acquire()

    const second = new TabLock()
    expect(await second.acquire()).toBe('reader')
    expect(second.isWriter).toBe(false)

    first.stop()
    second.stop()
  })

  it('hands the lock over when the second tab asks for it', async () => {
    const roles: string[] = []
    const first = new TabLock({ onRoleChange: (role) => roles.push(`first:${role}`) })
    await first.acquire()

    const second = new TabLock({ onRoleChange: (role) => roles.push(`second:${role}`) })
    await second.acquire()
    expect(second.isWriter).toBe(false)

    expect(await second.takeOver()).toBe('writer')
    expect(first.isWriter).toBe(false)
    expect(second.isWriter).toBe(true)
    expect(roles).toContain('first:reader')
    expect(roles).toContain('second:writer')

    first.stop()
    second.stop()
  })

  it('releases the lock on stop so the next tab can claim it', async () => {
    const first = new TabLock()
    await first.acquire()
    first.stop()
    // Releasing a Web Lock is asynchronous in the browser too, which is why
    // takeOver() retries rather than assuming the lock is free immediately.
    await new Promise((resolve) => setTimeout(resolve, 0))

    const second = new TabLock()
    expect(await second.acquire()).toBe('writer')
    second.stop()
  })

  it('is idempotent for a tab that already holds the lock', async () => {
    const only = new TabLock()
    expect(await only.acquire()).toBe('writer')
    expect(await only.acquire()).toBe('writer')
    expect(locks.held.size).toBe(1)
    only.stop()
  })

  it('treats a browser without Web Locks as a single writer', async () => {
    Reflect.deleteProperty(navigator, 'locks')
    const tab = new TabLock()
    expect(await tab.acquire()).toBe('writer')
    tab.stop()
  })
})
