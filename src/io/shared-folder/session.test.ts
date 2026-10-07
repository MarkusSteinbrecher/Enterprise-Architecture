import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SyncWorld } from '@/test/sync-world'
import { readAudit } from './audit-log'
import { decodeText, encodeText } from './folder'
import { memoryStore, type LockObservation } from './memory'
import { SharedModelSession, type AcquireResult, type ReaderTick, type WriterTick } from './session'
import { DEFAULT_SETTINGS } from './settings'

/**
 * Shared-folder sessions over a synced folder (spec §11, §12). Two or three
 * machines share a sync world; each scenario ends with a client told, never
 * with two clients both believing they saved.
 */

const MODEL = 'Landscape.json'
const SETTLE = DEFAULT_SETTINGS.settleMs
const HEARTBEAT = DEFAULT_SETTINGS.heartbeatMs
const STALE = DEFAULT_SETTINGS.staleAfterMs

beforeEach(() => vi.useFakeTimers({ now: new Date('2026-10-07T08:00:00Z') }))
afterEach(() => vi.useRealTimers())

const text = (bytes: Uint8Array | undefined) => bytes && decodeText(bytes)

function session(world: SyncWorld, client: string) {
  let n = 0
  return new SharedModelSession({
    folder: world.client(client),
    folderKey: 'library',
    model: MODEL,
    clientId: `client-${client}`,
    appVersion: '0.2.0',
    settings: { ...DEFAULT_SETTINGS, displayName: client },
    observations: memoryStore<LockObservation>(),
    dismissed: memoryStore<readonly string[]>(),
    newToken: () => `${client}-${(n += 1)}`,
  })
}

/** A world whose cloud already holds the model, synced to every client named. */
async function worldWith(delayMs: number, ...clients: string[]) {
  const world = new SyncWorld({ delayMs })
  for (const client of clients) world.client(client)
  await world.client(clients[0]!).write(MODEL, encodeText('v0'))
  await vi.advanceTimersByTimeAsync(delayMs + 1)
  return world
}

/** Load and take the lock, running the settle delay. */
async function open(s: SharedModelSession, takeOver = false) {
  expect((await s.load()).kind).toBe('loaded')
  const pending = s.acquire({ takeOver })
  await vi.advanceTimersByTimeAsync(SETTLE)
  return pending
}

/** As `open`, for a case where the step is not refused for want of a log line. */
async function opened(s: SharedModelSession, takeOver = false): Promise<AcquireResult> {
  const result = await open(s, takeOver)
  if (!('outcome' in result)) throw new Error(result.message)
  return result
}

/** Was this client told something is wrong? */
function told(tick: WriterTick | ReaderTick, s: SharedModelSession): boolean {
  const lostLock = 'kind' in tick.lock && (tick.lock.kind === 'lost' || tick.lock.kind === 'fenced')
  return lostLock || s.diverged || tick.conflicts.length > 0
}

describe('opening a model (criteria 2, 3)', () => {
  it('makes a free model editable after the settle delay, and gives the lock back on close', async () => {
    const world = await worldWith(0, 'Markus')
    const s = session(world, 'Markus')
    expect(await open(s)).toEqual({ outcome: { kind: 'writer' } })
    expect(s.role).toBe('writer')
    expect(await s.close()).toBe('released')
    expect(await world.client('Markus').has(`${MODEL}.lock`)).toBe(false)
  })

  it('opens a model someone else holds read-only, naming them', async () => {
    const world = await worldWith(0, 'Ana', 'Markus')
    await open(session(world, 'Ana'))
    const s = session(world, 'Markus')
    expect(await open(s)).toMatchObject({
      outcome: { kind: 'reader', why: 'held', view: { owner: { displayName: 'Ana' } } },
    })
    expect(s.role).toBe('reader')
  })

  it('reloads before allowing edits when the model changed while it took the lock', async () => {
    const world = await worldWith(0, 'Ana', 'Markus')
    const s = session(world, 'Markus')
    await s.load()
    const pending = s.acquire()
    await vi.advanceTimersByTimeAsync(SETTLE / 2)
    await world.client('Ana').write(MODEL, encodeText('v1 from Ana'))
    await vi.advanceTimersByTimeAsync(SETTLE)
    const result = await pending
    expect('outcome' in result && text(result.reload)).toBe('v1 from Ana')
    expect(text(s.base?.bytes)).toBe('v1 from Ana')
  })
})

describe('taking a model back with unsaved changes', () => {
  it('never reloads over them: it keeps its base, diverges, and the next save is refused', async () => {
    const world = await worldWith(0, 'Ana', 'Markus')
    const markus = session(world, 'Markus')
    await opened(markus)
    const ana = session(world, 'Ana')
    await opened(ana, true)
    expect((await ana.save(encodeText('Ana’s work'))).kind).toBe('saved')
    await ana.close()
    await vi.advanceTimersByTimeAsync(1)

    // Markus lost the lock with edits in hand, and takes the free lock back.
    const pending = markus.acquire({ hasUnsavedChanges: true })
    await vi.advanceTimersByTimeAsync(SETTLE)
    const result = await pending
    expect(result).toEqual({ outcome: { kind: 'writer' } })
    expect(markus.diverged).toBe(true)
    expect(text(markus.base?.bytes)).toBe('v0')
    expect(await markus.save(encodeText('Markus’s work'))).toMatchObject({
      kind: 'refused',
      reason: 'file-changed',
    })
    expect(text(world.cloudRead(MODEL))).toBe('Ana’s work')
  })
})

describe('two people opening the same free model at once (criterion 4)', () => {
  it('ends with exactly one writer when sync is faster than the settle delay', async () => {
    const world = await worldWith(2000, 'Ana', 'Markus')
    const ana = session(world, 'Ana')
    const markus = session(world, 'Markus')
    await Promise.all([ana.load(), markus.load()])
    const both = Promise.all([ana.acquire(), markus.acquire()])
    await vi.advanceTimersByTimeAsync(SETTLE)
    const results = await both
    expect(results.filter((r) => 'outcome' in r && r.outcome.kind === 'writer')).toHaveLength(1)
    expect([ana.role, markus.role].sort()).toEqual(['reader', 'writer'])
  })

  it('tells each of them, and loses neither version, when sync is slower than the settle delay', async () => {
    const world = await worldWith(30_000, 'Ana', 'Markus')
    const ana = session(world, 'Ana')
    const markus = session(world, 'Markus')
    await Promise.all([ana.load(), markus.load()])
    const both = Promise.all([ana.acquire(), markus.acquire()])
    await vi.advanceTimersByTimeAsync(SETTLE)
    await both
    // The documented limit (spec §1.1, case 1): both believe they hold it.
    expect([ana.role, markus.role]).toEqual(['writer', 'writer'])
    expect((await ana.save(encodeText('Ana’s work'))).kind).toBe('saved')
    expect((await markus.save(encodeText('Markus’s work'))).kind).toBe('saved')

    await vi.advanceTimersByTimeAsync(HEARTBEAT)
    const anaTick = await ana.writerTick()
    const markusTick = await markus.writerTick()
    expect(told(anaTick, ana)).toBe(true)
    expect(told(markusTick, markus)).toBe(true)
    const kept = world.cloudNames().map((name) => text(world.cloudRead(name)))
    expect(kept).toEqual(expect.arrayContaining(['Ana’s work', 'Markus’s work']))
  })
})

describe('a writer whose lock is taken (criterion 5)', () => {
  it('becomes a reader within one heartbeat, keeps its edits, and can only save them as a copy', async () => {
    const world = await worldWith(0, 'Ana', 'Markus')
    const markus = session(world, 'Markus')
    await open(markus)
    await open(session(world, 'Ana'), true)

    await vi.advanceTimersByTimeAsync(HEARTBEAT)
    expect((await markus.writerTick()).lock).toMatchObject({
      kind: 'lost',
      by: { displayName: 'Ana' },
    })
    expect(markus.role).toBe('reader')
    // Its edits are the caller's to keep; the session never reloads over them.
    expect((await markus.readerTick(true)).reload).toBeUndefined()
    expect(await markus.save(encodeText('mine'))).toMatchObject({
      kind: 'refused',
      reason: 'lock-lost',
    })
    expect(await markus.saveAsCopy(encodeText('mine'))).toMatchObject({ kind: 'copied' })
    expect(text(await world.client('Markus').read(MODEL))).toBe('v0')
  })
})

describe('the three ways past the lock (spec §1.1)', () => {
  it('the offline writer: its local saves pass, and on reconnecting it is told', async () => {
    const world = await worldWith(2000, 'Ana', 'Markus')
    const markus = session(world, 'Markus')
    const ana = session(world, 'Ana')
    await open(markus)
    await vi.advanceTimersByTimeAsync(2000)
    expect((await opened(ana)).outcome).toMatchObject({ kind: 'reader', why: 'held' })

    world.client('Markus').offline = true
    // Ana watches the lock sit still for the whole stale time, and takes over.
    await ana.readerTick(false)
    await vi.advanceTimersByTimeAsync(STALE)
    expect((await ana.readerTick(false)).lock).toMatchObject({ kind: 'held', stale: true })
    expect((await opened(ana, true)).outcome).toEqual({ kind: 'writer' })
    expect((await ana.save(encodeText('Ana’s work'))).kind).toBe('saved')

    // Offline, Markus sees only his own folder: his heartbeat and save succeed.
    expect((await markus.writerTick()).lock).toEqual({ kind: 'held' })
    expect((await markus.save(encodeText('Markus’s offline work'))).kind).toBe('saved')

    world.client('Markus').offline = false
    await vi.advanceTimersByTimeAsync(10_000)
    const markusTick = await markus.writerTick()
    expect(markusTick.lock).toMatchObject({ kind: 'lost' })
    expect(markus.diverged).toBe(true)
    expect(markusTick.conflicts.map((c) => c.name)).toContain('Landscape-Markus.json')
    expect((await ana.writerTick()).conflicts.map((c) => c.name)).toContain('Landscape-Markus.json')
    expect(text(world.cloudRead('Landscape-Markus.json'))).toBe('Markus’s offline work')
    expect(text(world.cloudRead(MODEL))).toBe('Ana’s work')
  })

  it('the change in flight: a save that passed the guard is caught by the next scan', async () => {
    const world = await worldWith(2000, 'Ana', 'Markus')
    const ana = session(world, 'Ana')
    const markus = session(world, 'Markus')
    await open(ana)
    await vi.advanceTimersByTimeAsync(2000)
    await markus.load()

    // Ana's save is large and slow; her release is not.
    world.client('Ana').lag(MODEL, 60_000)
    expect((await ana.save(encodeText('Ana’s work'))).kind).toBe('saved')
    expect(await ana.close()).toBe('released')
    await vi.advanceTimersByTimeAsync(2000)

    expect((await opened(markus)).outcome).toEqual({ kind: 'writer' })
    // Ana's save has not arrived, so the guard sees the file Markus loaded.
    expect((await markus.save(encodeText('Markus’s work'))).kind).toBe('saved')

    await vi.advanceTimersByTimeAsync(HEARTBEAT)
    const tick = await markus.writerTick()
    expect(told(tick, markus)).toBe(true)
    expect(tick.conflicts.map((c) => c.name)).toContain('Landscape-Ana.json')
    expect(text(world.cloudRead('Landscape-Ana.json'))).toBe('Ana’s work')
  })
})

describe('the model file changing under the writer (criterion 13)', () => {
  it('leaves "saved", refuses the next save, and lets an overwrite through only when logged', async () => {
    const world = await worldWith(0, 'Ana', 'Markus')
    const markus = session(world, 'Markus')
    await open(markus)
    expect(markus.diverged).toBe(false)
    await world.client('Ana').write(MODEL, encodeText('written anyway'))
    await vi.advanceTimersByTimeAsync(1)

    expect((await markus.writerTick()).model).toBe('changed')
    expect(markus.diverged).toBe(true)
    expect(await markus.save(encodeText('mine'))).toMatchObject({
      kind: 'refused',
      reason: 'file-changed',
      canOverwrite: true,
    })

    expect((await markus.save(encodeText('mine'), { overwrite: true })).kind).toBe('saved')
    expect(markus.diverged).toBe(false)
    const { entries } = await readAudit(world.client('Markus'))
    expect(entries).toEqual([
      expect.objectContaining({ action: 'overwrite', displayName: 'Markus', model: MODEL }),
    ])
  })

  it('leaves "saved" when the file is gone', async () => {
    const world = await worldWith(0, 'Ana', 'Markus')
    const markus = session(world, 'Markus')
    await open(markus)
    await world.client('Ana').remove(MODEL)
    await vi.advanceTimersByTimeAsync(1)
    expect((await markus.writerTick()).model).toBe('missing')
    expect(markus.diverged).toBe(true)
  })

  it('does not overwrite when the overwrite cannot be logged', async () => {
    const world = await worldWith(0, 'Ana', 'Markus')
    const markus = session(world, 'Markus')
    await open(markus)
    await world.client('Ana').write(MODEL, encodeText('theirs'))
    await vi.advanceTimersByTimeAsync(1)
    world.client('Markus').fail('write', { name: '.archipelago-log-client-Markus.jsonl' })
    expect(await markus.save(encodeText('mine'), { overwrite: true })).toMatchObject({
      kind: 'not-logged',
    })
    expect(text(await world.client('Markus').read(MODEL))).toBe('theirs')
  })

  it('logs nothing for an overwrite the lock check refused', async () => {
    const world = await worldWith(0, 'Ana', 'Markus')
    const markus = session(world, 'Markus')
    await open(markus)
    await open(session(world, 'Ana'), true)
    expect(await markus.save(encodeText('mine'), { overwrite: true })).toMatchObject({
      reason: 'lock-lost',
    })
    const { entries } = await readAudit(world.client('Markus'))
    expect(entries.filter((e) => e.action === 'overwrite')).toEqual([])
  })

  it('keeps its base when a save fails, so the next save still compares with the file', async () => {
    const world = await worldWith(0, 'Markus')
    const markus = session(world, 'Markus')
    await open(markus)
    const base = markus.base
    world.client('Markus').fail('write', { name: MODEL, message: 'close() rejected' })
    expect(await markus.save(encodeText('mine'))).toEqual({
      kind: 'failed',
      message: 'close() rejected',
    })
    expect(markus.base).toBe(base)
    expect((await markus.save(encodeText('mine'))).kind).toBe('saved')
  })
})

describe('a reader when the model changes (criterion 14)', () => {
  it('reloads automatically when it holds no unsaved changes', async () => {
    const world = await worldWith(0, 'Ana', 'Markus')
    const ana = session(world, 'Ana')
    await open(ana)
    const markus = session(world, 'Markus')
    await open(markus)
    expect((await ana.save(encodeText('v1'))).kind).toBe('saved')
    await vi.advanceTimersByTimeAsync(1)

    const tick = await markus.readerTick(false)
    expect(tick.model).toBe('changed')
    expect(text(tick.reload)).toBe('v1')
    expect(markus.diverged).toBe(false)
    expect((await markus.readerTick(false)).reload).toBeUndefined()
  })

  it('never reloads over unsaved changes, and says the file moved on', async () => {
    const world = await worldWith(0, 'Ana', 'Markus')
    const ana = session(world, 'Ana')
    await open(ana)
    const markus = session(world, 'Markus')
    await open(markus)
    await ana.save(encodeText('v1'))
    await vi.advanceTimersByTimeAsync(1)

    const tick = await markus.readerTick(true)
    expect(tick.model).toBe('changed')
    expect(tick.reload).toBeUndefined()
    expect(markus.diverged).toBe(true)
  })

  it('sees the lock released, so it can offer Edit', async () => {
    const world = await worldWith(0, 'Ana', 'Markus')
    const ana = session(world, 'Ana')
    await open(ana)
    const markus = session(world, 'Markus')
    await open(markus)
    await ana.close()
    await vi.advanceTimersByTimeAsync(1)
    expect((await markus.readerTick(false)).lock).toEqual({ kind: 'free' })
  })
})

describe('conflict copies while a model is open (criterion 12)', () => {
  it('lists one that appears within a tick, never this app’s own, and not again once dismissed', async () => {
    const world = await worldWith(0, 'Ana', 'Markus')
    const markus = session(world, 'Markus')
    await open(markus)
    expect(await markus.scan()).toEqual([])

    await world.client('Ana').write('Landscape-DESKTOP7.json', encodeText('lost work'))
    await vi.advanceTimersByTimeAsync(1)
    expect((await markus.saveAsCopy(encodeText('mine'))).kind).toBe('copied')
    expect((await markus.writerTick()).conflicts).toEqual([
      { name: 'Landscape-DESKTOP7.json', kind: 'model' },
    ])

    await markus.dismiss('Landscape-DESKTOP7.json')
    expect((await markus.writerTick()).conflicts).toEqual([])
    await world.client('Ana').write('Landscape-LAPTOP2.json', encodeText('more'))
    await vi.advanceTimersByTimeAsync(1)
    expect((await markus.writerTick()).conflicts).toEqual([
      { name: 'Landscape-LAPTOP2.json', kind: 'model' },
    ])
  })

  it('treats a listing that fails as no news', async () => {
    const world = await worldWith(0, 'Markus')
    const markus = session(world, 'Markus')
    await open(markus)
    world.client('Markus').fail('list')
    expect(await markus.scan()).toEqual([])
  })
})

describe('takeover and unlock are logged (spec §5.5)', () => {
  it('logs a takeover with whose lock it was', async () => {
    const world = await worldWith(0, 'Ana', 'Markus')
    await open(session(world, 'Ana'))
    const markus = session(world, 'Markus')
    expect((await open(markus, true)) as unknown).toEqual({ outcome: { kind: 'writer' } })
    const { entries } = await readAudit(world.client('Markus'))
    expect(entries).toEqual([
      expect.objectContaining({ action: 'takeover', displayName: 'Markus', previousOwner: 'Ana' }),
    ])
  })

  it('logs an unlock, and does neither when the log cannot be written', async () => {
    const world = await worldWith(0, 'Ana', 'Markus')
    await open(session(world, 'Ana'))
    const markus = session(world, 'Markus')
    await markus.load()
    world.client('Markus').fail('write', { name: '.archipelago-log-client-Markus.jsonl', times: 2 })
    expect(await markus.unlock()).toMatchObject({ kind: 'not-logged' })
    expect(await open(markus, true)).toMatchObject({ kind: 'not-logged' })
    expect(await world.client('Markus').has(`${MODEL}.lock`)).toBe(true)
    expect(markus.role).toBe('reader')

    expect(await markus.unlock()).toEqual({ kind: 'unlocked' })
    expect(await world.client('Markus').has(`${MODEL}.lock`)).toBe(false)
    const { entries } = await readAudit(world.client('Markus'))
    expect(entries).toEqual([expect.objectContaining({ action: 'unlock', previousOwner: 'Ana' })])
  })

  it('reads every client’s log, oldest first, and survives a torn line', async () => {
    const world = await worldWith(0, 'Ana', 'Markus')
    const folder = world.client('Markus')
    await folder.write(
      '.archipelago-log-b.jsonl',
      encodeText(
        '{"action":"unlock","at":"2026-10-07T09:00:00.000Z","displayName":"B","model":"X.json"}\n{"action":',
      ),
    )
    await folder.write(
      '.archipelago-log-a.jsonl',
      encodeText(
        '{"action":"takeover","at":"2026-10-07T08:00:00.000Z","displayName":"A","model":"X.json"}\n',
      ),
    )
    const { entries } = await readAudit(folder)
    expect(entries.map((e) => e.displayName)).toEqual(['A', 'B'])
  })
})
