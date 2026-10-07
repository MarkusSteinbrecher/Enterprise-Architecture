import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SyncWorld, type SyncedClient } from '@/test/sync-world'
import { encodeText } from './folder'
import { parseLock, serialiseLock, LOCK_SCHEMA_VERSION, type LockRecord } from './lock-file'
import { LockManager, systemClock, type Clock } from './lock-manager'
import { memoryStore, type KeyedStore, type LockObservation } from './memory'

/**
 * The lock (spec §5), one guard at a time. Time is Vitest's fake clock; the
 * folder is the sync world with no delay unless a case needs one.
 */

const SETTLE = 10_000
const STALE = 30 * 60_000
const LOCK = 'Landscape.json.lock'

beforeEach(() => vi.useFakeTimers({ now: new Date('2026-10-07T08:00:00Z') }))
afterEach(() => vi.useRealTimers())

function manager(
  folder: SyncedClient,
  {
    name = folder.name,
    observations = memoryStore<LockObservation>(),
    folderKey = 'folder-1',
    clock = systemClock,
  }: {
    name?: string
    observations?: KeyedStore<LockObservation>
    folderKey?: string
    clock?: Clock
  } = {},
) {
  let n = 0
  return new LockManager({
    folder,
    folderKey,
    model: 'Landscape.json',
    displayName: name,
    appVersion: '0.2.0',
    settings: { settleMs: SETTLE, staleAfterMs: STALE },
    observations,
    clock,
    newToken: () => `${name}-${(n += 1)}`,
  })
}

async function lockIn(folder: SyncedClient): Promise<LockRecord | undefined> {
  const bytes = await folder.read(LOCK)
  return bytes && parseLock(bytes)
}

function foreign(overrides: Partial<LockRecord> = {}): Uint8Array {
  return serialiseLock({
    appVersion: '0.2.0',
    displayName: 'Ana',
    heartbeatAt: '2026-10-07T07:59:00.000Z',
    heartbeatSeq: 3,
    schemaVersion: LOCK_SCHEMA_VERSION,
    since: '2026-10-07T07:00:00.000Z',
    token: 'ana-1',
    ...overrides,
  })
}

/** Take the lock on `folder`, running the settle delay. */
async function take(lock: LockManager, takeOver = false) {
  const pending = lock.acquire({ takeOver })
  await vi.advanceTimersByTimeAsync(SETTLE)
  return pending
}

describe('taking a free lock (spec §5.1)', () => {
  it('becomes the writer only after the settle delay, with a lock naming the user', async () => {
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    const lock = manager(folder)
    const pending = lock.acquire()
    await vi.advanceTimersByTimeAsync(SETTLE - 1)
    expect(lock.holding).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(await pending).toEqual({ kind: 'writer' })
    expect(lock.holding).toBe(true)
    expect(await lockIn(folder)).toMatchObject({
      displayName: 'Markus',
      token: 'Markus-1',
      heartbeatSeq: 0,
    })
  })

  it('writes a fresh token each time it is taken', async () => {
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    const lock = manager(folder)
    await take(lock)
    await lock.release()
    await take(lock)
    expect((await lockIn(folder))?.token).toBe('Markus-2')
  })

  it('loses when the lock is replaced during the settle delay, and says who won', async () => {
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    const lock = manager(folder)
    const pending = lock.acquire()
    await vi.advanceTimersByTimeAsync(1000)
    await folder.write(LOCK, foreign())
    await vi.advanceTimersByTimeAsync(SETTLE)
    expect(await pending).toMatchObject({
      kind: 'reader',
      why: 'lost',
      winner: { displayName: 'Ana' },
    })
    expect(lock.holding).toBe(false)
  })

  it('loses when the lock vanishes during the settle delay', async () => {
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    const lock = manager(folder)
    const pending = lock.acquire()
    await vi.advanceTimersByTimeAsync(1000)
    await folder.remove(LOCK)
    await vi.advanceTimersByTimeAsync(SETTLE)
    expect(await pending).toEqual({ kind: 'reader', why: 'lost' })
  })

  it('loses when the lock cannot be read after the settle delay', async () => {
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    const lock = manager(folder)
    const pending = lock.acquire()
    await vi.advanceTimersByTimeAsync(1000)
    folder.fail('read', { name: LOCK })
    await vi.advanceTimersByTimeAsync(SETTLE)
    expect(await pending).toEqual({ kind: 'reader', why: 'lost' })
    expect(lock.holding).toBe(false)
  })

  it('stays a reader when its lock cannot be written, or the lock cannot be read first', async () => {
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    const lock = manager(folder)
    folder.fail('write', { name: LOCK, message: 'denied' })
    expect(await take(lock)).toEqual({ kind: 'reader', why: 'write-failed', message: 'denied' })
    folder.fail('read', { name: LOCK, message: 'busy' })
    expect(await take(lock)).toEqual({ kind: 'reader', why: 'read-failed', message: 'busy' })
    expect(lock.holding).toBe(false)
  })
})

describe('a lock someone else holds (spec §5, §5.3)', () => {
  it('opens as a reader that names the owner', async () => {
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    await folder.write(LOCK, foreign())
    const lock = manager(folder)
    expect(await take(lock)).toMatchObject({
      kind: 'reader',
      why: 'held',
      view: { owner: { displayName: 'Ana' }, stale: false },
    })
    expect((await lockIn(folder))?.token).toBe('ana-1')
  })

  it('counts a lock it cannot read as held by someone unknown, not as free', async () => {
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    for (const garbage of ['{"half": ', '[]', JSON.stringify({ schemaVersion: 2, token: 'x' })]) {
      await folder.write(LOCK, encodeText(garbage))
      const result = await take(manager(folder))
      expect(result, garbage).toEqual({
        kind: 'reader',
        why: 'held',
        view: { kind: 'held', stale: false, quietForMs: 0 },
      })
    }
  })

  it('judges a lock stale by how long this machine has seen its counter unchanged', async () => {
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    await folder.write(LOCK, foreign({ heartbeatSeq: 1 }))
    const lock = manager(folder)
    expect(await lock.look()).toMatchObject({ stale: false, quietForMs: 0 })
    await vi.advanceTimersByTimeAsync(STALE - 1)
    expect(await lock.look()).toMatchObject({ stale: false, quietForMs: STALE - 1 })
    await vi.advanceTimersByTimeAsync(1)
    expect(await lock.look()).toMatchObject({ stale: true, quietForMs: STALE })
  })

  it('restarts the watch whenever the counter moves, whatever the remote clock says', async () => {
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    const lock = manager(folder)
    // Ana's clock is a year behind, then a year ahead: shown, never compared.
    const heartbeats = ['2025-10-07T08:00:00.000Z', '2027-10-07T08:00:00.000Z']
    for (let seq = 1; seq <= 40; seq += 1) {
      await folder.write(LOCK, foreign({ heartbeatSeq: seq, heartbeatAt: heartbeats[seq % 2]! }))
      expect(await lock.look()).toMatchObject({ stale: false })
      await vi.advanceTimersByTimeAsync(60_000)
    }
    expect(await lock.look()).toMatchObject({ stale: false, quietForMs: 60_000 })
  })

  it('restarts the watch when a new token takes the lock at the same counter', async () => {
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    const lock = manager(folder)
    await folder.write(LOCK, foreign({ token: 'ana-1', heartbeatSeq: 0 }))
    await lock.look()
    await vi.advanceTimersByTimeAsync(STALE)
    await folder.write(LOCK, foreign({ token: 'ana-2', heartbeatSeq: 0 }))
    expect(await lock.look()).toMatchObject({ stale: false, quietForMs: 0 })
  })

  it('continues the watch across a reload on the same machine', async () => {
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    const observations = memoryStore<LockObservation>()
    await folder.write(LOCK, foreign())
    await manager(folder, { observations }).look()
    await vi.advanceTimersByTimeAsync(STALE)
    // A new page load: a new manager over the same remembered observations.
    expect(await manager(folder, { observations }).look()).toMatchObject({ stale: true })
    // Without them, a lock first seen now cannot be stale yet.
    expect(await manager(folder).look()).toMatchObject({ stale: false })
  })

  it('keeps the watch of two folders with the same file name apart', async () => {
    const world = new SyncWorld({ delayMs: 0 })
    const one = world.client('Markus')
    const observations = memoryStore<LockObservation>()
    await one.write(LOCK, foreign())
    await manager(one, { observations, folderKey: 'library-1' }).look()
    await vi.advanceTimersByTimeAsync(STALE)
    expect(await manager(one, { observations, folderKey: 'library-1' }).look()).toMatchObject({
      stale: true,
    })
    expect(await manager(one, { observations, folderKey: 'library-2' }).look()).toMatchObject({
      stale: false,
    })
  })

  it('leaves a stale lock alone unless the user takes it over', async () => {
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    await folder.write(LOCK, foreign())
    const lock = manager(folder)
    await lock.look()
    await vi.advanceTimersByTimeAsync(STALE)
    expect(await take(lock)).toMatchObject({ kind: 'reader', why: 'held', view: { stale: true } })
    expect((await lockIn(folder))?.token).toBe('ana-1')
    expect(await take(lock, true)).toEqual({ kind: 'writer' })
    expect((await lockIn(folder))?.token).toBe('Markus-1')
  })
})

describe('holding the lock (spec §5.2)', () => {
  it('raises the counter on every heartbeat', async () => {
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    const lock = manager(folder)
    await take(lock)
    expect(await lock.heartbeat()).toEqual({ kind: 'held' })
    expect(await lock.heartbeat()).toEqual({ kind: 'held' })
    expect(await lockIn(folder)).toMatchObject({ token: 'Markus-1', heartbeatSeq: 2 })
  })

  it('becomes a reader at once when its token is gone from the lock, or the lock is gone', async () => {
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    const lock = manager(folder)
    await take(lock)
    await folder.write(LOCK, foreign())
    expect(await lock.heartbeat()).toMatchObject({ kind: 'lost', by: { displayName: 'Ana' } })
    expect(lock.holding).toBe(false)

    await take(lock, true)
    await folder.remove(LOCK)
    expect(await lock.heartbeat()).toEqual({ kind: 'lost' })
    expect(lock.holding).toBe(false)
    // And never writes the lock again.
    expect(await folder.has(LOCK)).toBe(false)
  })

  it('treats a lock that turned unreadable as lost', async () => {
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    const lock = manager(folder)
    await take(lock)
    await folder.write(LOCK, encodeText('{"half": '))
    expect(await lock.heartbeat()).toEqual({ kind: 'lost' })
    expect(lock.holding).toBe(false)
  })

  it('does not step down on a failed read or write, until half the stale time has gone by', async () => {
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    const lock = manager(folder)
    await take(lock)
    folder.fail('read', { name: LOCK, times: Infinity, message: 'busy' })
    await vi.advanceTimersByTimeAsync(STALE / 2 - 1)
    expect(await lock.heartbeat()).toEqual({ kind: 'retry', message: 'busy' })
    expect(lock.holding).toBe(true)
    await vi.advanceTimersByTimeAsync(1)
    expect(await lock.heartbeat()).toEqual({ kind: 'fenced', message: 'busy' })
    expect(lock.holding).toBe(false)
  })

  it('counts a heartbeat whose write fails as missed', async () => {
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    const lock = manager(folder)
    await take(lock)
    folder.fail('write', { name: LOCK, times: Infinity, message: 'close() rejected' })
    expect(await lock.heartbeat()).toEqual({ kind: 'retry', message: 'close() rejected' })
    await vi.advanceTimersByTimeAsync(STALE / 2)
    expect(await lock.heartbeat()).toEqual({ kind: 'fenced', message: 'close() rejected' })
  })

  it('measures fencing from the last heartbeat that completed', async () => {
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    const lock = manager(folder)
    await take(lock)
    await vi.advanceTimersByTimeAsync(STALE / 2 - 1000)
    expect(await lock.heartbeat()).toEqual({ kind: 'held' })
    folder.fail('read', { name: LOCK, times: Infinity })
    await vi.advanceTimersByTimeAsync(STALE / 2 - 1)
    expect((await lock.heartbeat()).kind).toBe('retry')
  })

  it('has nothing to renew when it does not hold the lock', async () => {
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    expect(await manager(folder).heartbeat()).toEqual({ kind: 'not-holding' })
  })
})

describe('giving the lock back (spec §5.4)', () => {
  it('deletes the lock when it still carries our token', async () => {
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    const lock = manager(folder)
    await take(lock)
    expect(await lock.release()).toBe('released')
    expect(await folder.has(LOCK)).toBe(false)
  })

  it('never deletes a lock carrying another token', async () => {
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    const lock = manager(folder)
    await take(lock)
    await folder.write(LOCK, foreign())
    expect(await lock.release()).toBe('not-ours')
    expect((await lockIn(folder))?.token).toBe('ana-1')
    // Nor one it never held.
    expect(await manager(folder).release()).toBe('not-ours')
    expect((await lockIn(folder))?.token).toBe('ana-1')
  })

  it('deletes nothing when the lock cannot be read', async () => {
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    const lock = manager(folder)
    await take(lock)
    folder.fail('read', { name: LOCK })
    expect(await lock.release()).toBe('failed')
    expect(await folder.has(LOCK)).toBe(true)
  })

  it('removes anyone’s lock on an explicit unlock, and says whose it was', async () => {
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    await folder.write(LOCK, foreign())
    expect(await manager(folder).unlock()).toMatchObject({ removed: { displayName: 'Ana' } })
    expect(await folder.has(LOCK)).toBe(false)
  })
})
