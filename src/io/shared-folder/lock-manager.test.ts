import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SyncWorld, type SyncedClient } from '@/test/sync-world'
import { encodeText } from './folder'
import { parseLock, serialiseLock, LOCK_SCHEMA_VERSION, type LockRecord } from './lock-file'
import { LockManager, systemClock, UNWATCHED_AFTER_POLLS, type Clock } from './lock-manager'
import { memoryStore, type KeyedStore, type LockObservation } from './memory'

/**
 * The lock (spec §5), one guard at a time. Time is Vitest's fake clock; the
 * folder is the sync world with no delay unless a case needs one.
 */

const SETTLE = 10_000
const STALE = 30 * 60_000
const POLL = 15_000
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
    settings: { settleMs: SETTLE, staleAfterMs: STALE, pollMs: POLL },
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

/** Look at the lock every poll for `ms`, as a visible reader does. Returns the last look. */
async function watch(lock: LockManager, ms: number) {
  let view = await lock.look()
  for (let waited = 0; waited < ms;) {
    const step = Math.min(POLL, ms - waited)
    await vi.advanceTimersByTimeAsync(step)
    waited += step
    view = await lock.look()
  }
  return view
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

  it('makes its tokens random UUIDs and keeps the system clock when given neither', async () => {
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    const lock = new LockManager({
      folder,
      folderKey: 'folder-1',
      model: 'Landscape.json',
      displayName: 'Markus',
      appVersion: '0.2.0',
      settings: { settleMs: SETTLE, staleAfterMs: STALE, pollMs: POLL },
      observations: memoryStore<LockObservation>(),
    })
    expect(await take(lock)).toEqual({ kind: 'writer' })
    expect((await lockIn(folder))?.token).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
    expect((await lockIn(folder))?.since).toBe('2026-10-07T08:00:00.000Z')
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
    expect(await watch(lock, STALE - 1)).toMatchObject({ stale: false, quietForMs: STALE - 1 })
    await vi.advanceTimersByTimeAsync(1)
    expect(await lock.look()).toMatchObject({ stale: true, quietForMs: STALE })
  })

  it('does not count time nobody here watched, as a laptop asleep (#165)', async () => {
    // The review's probe: seen just before a two-hour sleep, the lock was stale
    // on the first look after waking, before sync had delivered the newer heartbeats.
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    await folder.write(LOCK, foreign())
    const lock = manager(folder)
    await watch(lock, STALE - POLL)
    await vi.advanceTimersByTimeAsync(2 * 60 * 60_000)
    expect(await lock.look()).toMatchObject({ stale: false, quietForMs: 0 })
    // The watch starts again from the first look after the gap.
    expect(await watch(lock, STALE)).toMatchObject({ stale: true, quietForMs: STALE })
  })

  it('counts a gap of up to four polls as watched, and a longer one as not', async () => {
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    await folder.write(LOCK, foreign())
    const lock = manager(folder)
    const gap = UNWATCHED_AFTER_POLLS * POLL
    expect(gap).toBe(60_000)
    await lock.look()
    await vi.advanceTimersByTimeAsync(gap)
    expect(await lock.look()).toMatchObject({ quietForMs: gap })
    await vi.advanceTimersByTimeAsync(gap + 1)
    expect(await lock.look()).toMatchObject({ quietForMs: 0 })
  })

  it('counts an observation remembered without a last look as watched by no one', async () => {
    // What a version before #165 stored in IndexedDB: the lock and since when.
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    await folder.write(LOCK, foreign())
    const observations = memoryStore<LockObservation>()
    await observations.set(['folder-1', 'Landscape.json'], {
      token: 'ana-1',
      heartbeatSeq: 3,
      since: Date.now() - STALE,
    })
    expect(await manager(folder, { observations }).look()).toMatchObject({
      stale: false,
      quietForMs: 0,
    })
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
    await watch(lock, STALE)
    await folder.write(LOCK, foreign({ token: 'ana-2', heartbeatSeq: 0 }))
    expect(await lock.look()).toMatchObject({ stale: false, quietForMs: 0 })
  })

  it('continues the watch across a reload on the same machine', async () => {
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    const observations = memoryStore<LockObservation>()
    await folder.write(LOCK, foreign())
    await watch(manager(folder, { observations }), STALE - 1)
    // A new page load, seconds long: a new manager over the same remembered observations.
    await vi.advanceTimersByTimeAsync(5000)
    expect(await manager(folder, { observations }).look()).toMatchObject({
      stale: true,
      quietForMs: STALE - 1 + 5000,
    })
    // Without them, a lock first seen now cannot be stale yet.
    expect(await manager(folder).look()).toMatchObject({ stale: false })
  })

  it('keeps the watch of two folders with the same file name apart', async () => {
    const world = new SyncWorld({ delayMs: 0 })
    const one = world.client('Markus')
    const observations = memoryStore<LockObservation>()
    await one.write(LOCK, foreign())
    await watch(manager(one, { observations, folderKey: 'library-1' }), STALE)
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
    await watch(lock, STALE)
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
    expect(await lock.heartbeat()).toEqual({
      kind: 'fenced',
      message: 'No heartbeat completed for 15 min.',
    })
    expect(lock.holding).toBe(false)
  })

  it('counts a heartbeat whose write fails as missed', async () => {
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    const lock = manager(folder)
    await take(lock)
    folder.fail('write', { name: LOCK, times: Infinity, message: 'close() rejected' })
    expect(await lock.heartbeat()).toEqual({ kind: 'retry', message: 'close() rejected' })
    await vi.advanceTimersByTimeAsync(STALE / 2 - 1)
    expect(await lock.heartbeat()).toEqual({ kind: 'retry', message: 'close() rejected' })
    await vi.advanceTimersByTimeAsync(1)
    expect((await lock.heartbeat()).kind).toBe('fenced')
  })

  it('fences after half the stale time with no heartbeat attempted at all, as after a sleep', async () => {
    // Criterion 5. A laptop that slept made no attempt to fail: on waking, its
    // first heartbeat must not read its own lock, find it, and carry on.
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    const lock = manager(folder)
    await take(lock)
    await vi.advanceTimersByTimeAsync(STALE / 2 - 1)
    expect(await lock.confirm()).toBe('ours')
    await vi.advanceTimersByTimeAsync(1)
    expect(await lock.heartbeat()).toEqual({
      kind: 'fenced',
      message: 'No heartbeat completed for 15 min.',
    })
    expect(lock.holding).toBe(false)
    // Not rewritten on the way out: a takeover still in flight wins.
    expect(await lockIn(folder)).toMatchObject({ token: 'Markus-1', heartbeatSeq: 0 })
  })

  it('refuses to confirm the lock for a save once half the stale time has passed', async () => {
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    const lock = manager(folder)
    await take(lock)
    await vi.advanceTimersByTimeAsync(STALE / 2)
    expect(await lock.confirm()).toBe('not-ours')
    expect(lock.holding).toBe(false)
    expect(await lockIn(folder)).toMatchObject({ token: 'Markus-1' })
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

  it('deletes nothing when the lock cannot be read, and deletes it on a retry', async () => {
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    const lock = manager(folder)
    await take(lock)
    folder.fail('read', { name: LOCK })
    expect(await lock.release()).toBe('failed')
    expect(await folder.has(LOCK)).toBe(true)
    expect(lock.holding).toBe(false)
    expect(await lock.release()).toBe('released')
    expect(await folder.has(LOCK)).toBe(false)
  })

  it('deletes its own lock after fencing, and its own lock is no obstacle to taking it again', async () => {
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    const lock = manager(folder)
    await take(lock)
    folder.fail('write', { name: LOCK, times: Infinity })
    await vi.advanceTimersByTimeAsync(STALE / 2)
    expect((await lock.heartbeat()).kind).toBe('fenced')
    folder.clearFaults()
    // Our token is still in the folder: ours to replace without asking…
    expect(await lock.look()).toEqual({ kind: 'ours' })
    expect(await take(lock)).toEqual({ kind: 'writer' })
    expect(await lockIn(folder)).toMatchObject({ token: 'Markus-2' })
    // …and ours to delete.
    await vi.advanceTimersByTimeAsync(STALE / 2)
    expect((await lock.heartbeat()).kind).toBe('fenced')
    expect(await lock.release()).toBe('released')
    expect(await folder.has(LOCK)).toBe(false)
  })

  it('deletes its own lock after an acquire that could not read it back', async () => {
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    const lock = manager(folder)
    const pending = lock.acquire()
    await vi.advanceTimersByTimeAsync(1000)
    folder.fail('read', { name: LOCK })
    await vi.advanceTimersByTimeAsync(SETTLE)
    expect(await pending).toEqual({ kind: 'reader', why: 'lost' })
    expect(await lock.look()).toEqual({ kind: 'ours' })
    expect(await lock.release()).toBe('released')
    expect(await folder.has(LOCK)).toBe(false)
  })

  it('removes anyone’s lock on an explicit unlock, and says whose it was', async () => {
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    await folder.write(LOCK, foreign())
    expect(await manager(folder).unlock()).toMatchObject({ removed: { displayName: 'Ana' } })
    expect(await folder.has(LOCK)).toBe(false)
  })

  it('has nothing to name on an unlock when there was no lock', async () => {
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    expect(await manager(folder).unlock()).toEqual({})
  })

  it('removes nothing on an unlock when the lock cannot be read, or the delete throws', async () => {
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    await folder.write(LOCK, foreign())
    folder.fail('read', { name: LOCK, message: 'busy' })
    expect(await manager(folder).unlock()).toEqual({ failed: 'busy' })
    folder.fail('remove', { name: LOCK, message: 'denied' })
    expect(await manager(folder).unlock()).toEqual({ failed: 'denied' })
    expect((await lockIn(folder))?.token).toBe('ana-1')
  })
})
