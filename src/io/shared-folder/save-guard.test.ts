import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SyncWorld, type SyncedClient } from '@/test/sync-world'
import { fingerprint } from './fingerprint'
import { decodeText, encodeText } from './folder'
import { LOCK_SCHEMA_VERSION, serialiseLock } from './lock-file'
import { LockManager } from './lock-manager'
import { memoryStore, type LockObservation } from './memory'
import { guardedSave, saveAsCopy } from './save-guard'

/** The save guard (spec §6), each check and each way a write can fail. */

const MODEL = 'Landscape.json'
const LOCK = 'Landscape.json.lock'
const AT = new Date(2026, 9, 7, 8, 27)

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

async function writer(folder: SyncedClient): Promise<LockManager> {
  const lock = new LockManager({
    folder,
    folderKey: 'f',
    model: MODEL,
    displayName: 'Markus',
    appVersion: '0.2.0',
    settings: { settleMs: 10, staleAfterMs: 1_000_000 },
    observations: memoryStore<LockObservation>(),
    newToken: () => 'markus-1',
  })
  const pending = lock.acquire()
  await vi.advanceTimersByTimeAsync(10)
  expect(await pending).toEqual({ kind: 'writer' })
  return lock
}

async function setup() {
  const folder = new SyncWorld({ delayMs: 0 }).client('A')
  const original = encodeText('{"v":1}')
  await folder.write(MODEL, original)
  const lock = await writer(folder)
  const expectedPrint = await fingerprint(original)
  const save = (bytes: Uint8Array, overwrite = false) =>
    guardedSave({
      folder,
      model: MODEL,
      lock,
      expected: expectedPrint,
      bytes,
      overwrite,
    })
  const text = async (name = MODEL) => {
    const bytes = await folder.read(name)
    return bytes && decodeText(bytes)
  }
  return { folder, lock, save, text }
}

const theirs = () =>
  serialiseLock({
    appVersion: '0.2.0',
    displayName: 'Ana',
    heartbeatAt: 'x',
    heartbeatSeq: 0,
    schemaVersion: LOCK_SCHEMA_VERSION,
    since: 'x',
    token: 'ana-1',
  })

describe('the save guard (spec §6.1)', () => {
  it('writes when we hold the lock and the file is as we left it, and fingerprints what it wrote', async () => {
    const { save, text } = await setup()
    const bytes = encodeText('{"v":2}')
    expect(await save(bytes)).toEqual({ kind: 'saved', fingerprint: await fingerprint(bytes) })
    expect(await text()).toBe('{"v":2}')
  })

  it('fingerprints the bytes it wrote, never the file read back after', async () => {
    const { folder, save } = await setup()
    const read = vi.spyOn(folder, 'read')
    const write = vi.spyOn(folder, 'write')
    await save(encodeText('{"v":2}'))
    const lastWrite = write.mock.invocationCallOrder.at(-1)!
    expect(read.mock.invocationCallOrder.every((order) => order < lastWrite)).toBe(true)
  })

  it('refuses when the lock is someone else’s, and writes nothing', async () => {
    const { folder, lock, save, text } = await setup()
    await folder.write(LOCK, theirs())
    expect(await save(encodeText('{"v":2}'))).toEqual({
      kind: 'refused',
      reason: 'lock-lost',
      canOverwrite: false,
    })
    expect(await text()).toBe('{"v":1}')
    expect(lock.holding).toBe(false)
  })

  it('refuses when the lock is gone', async () => {
    const { folder, save, text } = await setup()
    await folder.remove(LOCK)
    expect(await save(encodeText('{"v":2}'))).toMatchObject({ reason: 'lock-lost' })
    expect(await text()).toBe('{"v":1}')
  })

  it('refuses when the lock cannot be read, without calling it lost', async () => {
    const { folder, lock, save, text } = await setup()
    folder.fail('read', { name: LOCK, message: 'busy' })
    expect(await save(encodeText('{"v":2}'))).toEqual({
      kind: 'refused',
      reason: 'lock-unreadable',
      canOverwrite: false,
      message: 'busy',
    })
    expect(await text()).toBe('{"v":1}')
    expect(lock.holding).toBe(true)
  })

  it('refuses when the file changed on disk, and offers to overwrite', async () => {
    const { folder, save, text } = await setup()
    await folder.write(MODEL, encodeText('{"v":"theirs"}'))
    expect(await save(encodeText('{"v":2}'))).toEqual({
      kind: 'refused',
      reason: 'file-changed',
      canOverwrite: true,
    })
    expect(await text()).toBe('{"v":"theirs"}')
  })

  it('refuses when the file is gone, or cannot be read', async () => {
    const { folder, save } = await setup()
    folder.fail('read', { name: MODEL, message: 'busy' })
    expect(await save(encodeText('{"v":2}'))).toEqual({
      kind: 'refused',
      reason: 'file-unreadable',
      canOverwrite: false,
      message: 'busy',
    })
    await folder.remove(MODEL)
    expect(await save(encodeText('{"v":2}'))).toEqual({
      kind: 'refused',
      reason: 'file-missing',
      canOverwrite: true,
    })
    expect(await folder.has(MODEL)).toBe(false)
  })

  it('overwrites a changed file when told to, but never without the lock', async () => {
    const { folder, save, text } = await setup()
    await folder.write(MODEL, encodeText('{"v":"theirs"}'))
    expect((await save(encodeText('{"v":2}'), true)).kind).toBe('saved')
    expect(await text()).toBe('{"v":2}')

    await folder.write(LOCK, theirs())
    expect(await save(encodeText('{"v":3}'), true)).toMatchObject({ reason: 'lock-lost' })
    expect(await text()).toBe('{"v":2}')
  })

  it('reports a write that throws, such as a close() that rejects, as failed', async () => {
    const { folder, save, text } = await setup()
    folder.fail('write', { name: MODEL, message: 'close() rejected' })
    expect(await save(encodeText('{"v":2}'))).toEqual({
      kind: 'failed',
      message: 'close() rejected',
    })
    expect(await text()).toBe('{"v":1}')
  })

  it('writes nothing when the step before the write says no', async () => {
    const { folder, lock, text } = await setup()
    const result = await guardedSave({
      folder,
      model: MODEL,
      lock,
      expected: await fingerprint(encodeText('{"v":1}')),
      bytes: encodeText('{"v":2}'),
      beforeWrite: async () => false,
    })
    expect(result.kind).toBe('failed')
    expect(await text()).toBe('{"v":1}')
  })
})

describe('save as copy (spec §6.2)', () => {
  it('writes a new file beside the model and leaves the model alone', async () => {
    const { folder, text } = await setup()
    const write = vi.spyOn(folder, 'write')
    const result = await saveAsCopy(folder, MODEL, 'Markus', AT, encodeText('{"v":"mine"}'))
    expect(result).toEqual({
      kind: 'copied',
      name: 'Landscape (copy Markus 2026-10-07 0827).json',
      fingerprint: await fingerprint(encodeText('{"v":"mine"}')),
    })
    expect(await text('Landscape (copy Markus 2026-10-07 0827).json')).toBe('{"v":"mine"}')
    expect(await text()).toBe('{"v":1}')
    expect(write.mock.calls.map(([name]) => name)).not.toContain(MODEL)
  })

  it('makes a second copy in the same minute beside the first', async () => {
    const { folder, text } = await setup()
    await saveAsCopy(folder, MODEL, 'Markus', AT, encodeText('first'))
    const second = await saveAsCopy(folder, MODEL, 'Markus', AT, encodeText('second'))
    expect(second).toMatchObject({ name: 'Landscape (copy Markus 2026-10-07 0827 2).json' })
    expect(await text('Landscape (copy Markus 2026-10-07 0827).json')).toBe('first')
  })

  it('reports a copy it could not write', async () => {
    const { folder } = await setup()
    folder.fail('write', { message: 'disk full' })
    expect(await saveAsCopy(folder, MODEL, 'Markus', AT, encodeText('x'))).toEqual({
      kind: 'failed',
      message: 'disk full',
    })
  })
})
