import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { decodeText, encodeText } from '@/io/shared-folder/folder'
import { SyncWorld } from './sync-world'

/**
 * The sync fake the shared-folder tests stand on (spec §12). If it does not
 * delay, or does not make conflict copies, every scenario built on it proves
 * nothing, so its own behaviour is pinned here.
 */

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

const text = async (
  folder: { read(name: string): Promise<Uint8Array | undefined> },
  name: string,
) => {
  const bytes = await folder.read(name)
  return bytes && decodeText(bytes)
}

describe('the sync world', () => {
  it('shows a write at once to its writer, and to others only after the delay', async () => {
    const world = new SyncWorld({ delayMs: 4000 })
    const a = world.client('A')
    const b = world.client('B')
    await a.write('X.json', encodeText('one'))
    expect(await text(a, 'X.json')).toBe('one')
    await vi.advanceTimersByTimeAsync(3999)
    expect(await text(b, 'X.json')).toBeUndefined()
    await vi.advanceTimersByTimeAsync(1)
    expect(await text(b, 'X.json')).toBe('one')
  })

  it('keeps one version under the name and the other as a conflict copy, on both machines', async () => {
    const world = new SyncWorld({ delayMs: 4000 })
    const a = world.client('A')
    const b = world.client('B')
    await a.write('X.json', encodeText('from A'))
    await vi.advanceTimersByTimeAsync(1000)
    await b.write('X.json', encodeText('from B'))
    await vi.advanceTimersByTimeAsync(10_000)

    expect(world.cloudNames()).toEqual(['X-B.json', 'X.json'])
    for (const client of [a, b]) {
      expect(await text(client, 'X.json')).toBe('from A')
      expect(await text(client, 'X-B.json')).toBe('from B')
    }
  })

  it('names a lock’s conflict copy after the lock, as OneDrive does', async () => {
    const world = new SyncWorld({ delayMs: 4000 })
    const a = world.client('A')
    const b = world.client('B')
    await a.write('X.json.lock', encodeText('a'))
    await b.write('X.json.lock', encodeText('b'))
    await vi.advanceTimersByTimeAsync(10_000)
    expect(world.cloudNames()).toEqual(['X.json-B.lock', 'X.json.lock'])
  })

  it('makes no conflict of one machine’s own writes in quick succession', async () => {
    const world = new SyncWorld({ delayMs: 4000 })
    const a = world.client('A')
    const b = world.client('B')
    await a.write('X.json', encodeText('1'))
    await vi.advanceTimersByTimeAsync(500)
    await a.write('X.json', encodeText('2'))
    await vi.advanceTimersByTimeAsync(10_000)
    expect(world.cloudNames()).toEqual(['X.json'])
    expect(await text(b, 'X.json')).toBe('2')
    expect(await text(a, 'X.json')).toBe('2')
  })

  it('lets a change win over a delete it was not seen by', async () => {
    const world = new SyncWorld({ delayMs: 4000 })
    const a = world.client('A')
    const b = world.client('B')
    await a.write('X.json.lock', encodeText('a'))
    await vi.advanceTimersByTimeAsync(10_000)
    await b.write('X.json.lock', encodeText('b'))
    await a.remove('X.json.lock')
    await vi.advanceTimersByTimeAsync(10_000)
    expect(world.cloudNames()).toEqual(['X.json.lock'])
    expect(await text(a, 'X.json.lock')).toBe('b')
  })

  it('holds an offline machine’s writes until it is back, and then they meet what changed', async () => {
    const world = new SyncWorld({ delayMs: 4000 })
    const a = world.client('A')
    const b = world.client('B')
    await a.write('X.json', encodeText('base'))
    await vi.advanceTimersByTimeAsync(10_000)
    a.offline = true
    await a.write('X.json', encodeText('A offline'))
    await b.write('X.json', encodeText('B online'))
    await vi.advanceTimersByTimeAsync(60_000)
    expect(await text(b, 'X.json')).toBe('B online')
    expect(await text(a, 'X.json')).toBe('A offline')

    a.offline = false
    await vi.advanceTimersByTimeAsync(10_000)
    expect(world.cloudNames()).toEqual(['X-A.json', 'X.json'])
    expect(await text(a, 'X.json')).toBe('B online')
    expect(await text(a, 'X-A.json')).toBe('A offline')
  })

  it('delays one file’s upload when told to, as a large save is slower', async () => {
    const world = new SyncWorld({ delayMs: 4000 })
    const a = world.client('A')
    const b = world.client('B')
    a.lag('X.json', 30_000)
    await a.write('X.json', encodeText('slow'))
    await a.write('X.json.lock', encodeText('fast'))
    await vi.advanceTimersByTimeAsync(4000)
    expect(await text(b, 'X.json.lock')).toBe('fast')
    expect(await text(b, 'X.json')).toBeUndefined()
    await vi.advanceTimersByTimeAsync(30_000)
    expect(await text(b, 'X.json')).toBe('slow')
  })

  it('throws from a faulted operation as many times as told, and a failed write changes nothing', async () => {
    const a = new SyncWorld({ delayMs: 0 }).client('A')
    await a.write('X.json', encodeText('kept'))
    a.fail('write', { name: 'X.json', message: 'close() rejected' })
    await expect(a.write('X.json', encodeText('lost'))).rejects.toThrow('close() rejected')
    expect(await text(a, 'X.json')).toBe('kept')
    await a.write('X.json', encodeText('second'))
    expect(await text(a, 'X.json')).toBe('second')
  })
})
