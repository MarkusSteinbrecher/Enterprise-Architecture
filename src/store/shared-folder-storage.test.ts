import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, type LockObservation } from '@/io/shared-folder'
import {
  clientId,
  forgetFolder,
  listFolders,
  loadSettings,
  rememberFolder,
  resetSharedFolderStorage,
  saveSettings,
  storedPerModel,
} from './shared-folder-storage'

/**
 * The shared-folder cache in IndexedDB. A real directory handle cannot be
 * cloned into fake-indexeddb, so the handles here are stand-ins and `same`
 * plays `isSameEntry`; the real handle is stored by the browser journey.
 */

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  resetSharedFolderStorage()
})

const handle = (id: string, name: string) => ({ id, name }) as unknown as FileSystemDirectoryHandle
const same = async (a: FileSystemDirectoryHandle, b: FileSystemDirectoryHandle) =>
  (a as unknown as { id: string }).id === (b as unknown as { id: string }).id
let n = 0
const newKey = () => `key-${(n += 1)}`

describe('remembered folders (spec §4)', () => {
  it('gives a new folder a key, and finds it again by entry, not by name', async () => {
    const first = await rememberFolder(handle('sp-1', 'Architecture'), { now: 1, same, newKey })
    const again = await rememberFolder(handle('sp-1', 'Architecture'), { now: 2, same, newKey })
    expect(again.key).toBe(first.key)
    // Another library with the same name is another folder.
    const other = await rememberFolder(handle('sp-2', 'Architecture'), { now: 3, same, newKey })
    expect(other.key).not.toBe(first.key)
    expect((await listFolders()).map((f) => [f.key, f.openedAt])).toEqual([
      [other.key, 3],
      [first.key, 2],
    ])
  })

  it('forgets a folder with what it remembered about its models, and only that folder', async () => {
    const one = await rememberFolder(handle('sp-1', 'A'), { same, newKey })
    const two = await rememberFolder(handle('sp-2', 'B'), { same, newKey })
    const dismissed = storedPerModel<readonly string[]>('dismissed')
    await dismissed.set([one.key, 'X.json'], ['X-PC.json'])
    await dismissed.set([two.key, 'X.json'], ['X-LAPTOP.json'])
    await forgetFolder(one.key)
    expect((await listFolders()).map((f) => f.key)).toEqual([two.key])
    expect(await dismissed.get([one.key, 'X.json'])).toBeUndefined()
    expect(await dismissed.get([two.key, 'X.json'])).toEqual(['X-LAPTOP.json'])
  })
})

describe('what is remembered per model (spec §5.3, §7, §8)', () => {
  it('keys by the folder and file name as a pair, whatever separators the names hold', async () => {
    const observations = storedPerModel<LockObservation>('observations')
    const a: LockObservation = { token: 'a', heartbeatSeq: 1, since: 10 }
    const b: LockObservation = { token: 'b', heartbeatSeq: 2, since: 20 }
    // Joined with a comma, these two keys would be the same string.
    await observations.set(['f,1', 'x.json'], a)
    await observations.set(['f', '1,x.json'], b)
    expect(await observations.get(['f,1', 'x.json'])).toEqual(a)
    expect(await observations.get(['f', '1,x.json'])).toEqual(b)
    await observations.delete(['f,1', 'x.json'])
    expect(await observations.get(['f,1', 'x.json'])).toBeUndefined()
    expect(await observations.get(['f', '1,x.json'])).toEqual(b)
  })

  it('keeps a base snapshot’s bytes', async () => {
    const bases = storedPerModel<{ bytes: Uint8Array; fingerprint: string }>('bases')
    await bases.set(['f', 'x.json'], { bytes: new Uint8Array([1, 2, 3]), fingerprint: 'abc' })
    const stored = await bases.get(['f', 'x.json'])
    expect([...(stored?.bytes ?? [])]).toEqual([1, 2, 3])
  })
})

describe('the settings and the client id', () => {
  it('reads the defaults before anything is stored', async () => {
    expect(await loadSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('stores settings that pass the guard, and refuses the rest without storing anything', async () => {
    expect((await saveSettings({ displayName: 'Markus' })).ok).toBe(true)
    expect(await loadSettings()).toMatchObject({ displayName: 'Markus' })
    expect((await saveSettings({ displayName: 'Ana', staleAfterMs: 1000 })).ok).toBe(false)
    expect(await loadSettings()).toMatchObject({ displayName: 'Markus' })
  })

  it('keeps one client id for this profile', async () => {
    const first = await clientId(() => 'c-1')
    expect(await clientId(() => 'c-2')).toBe(first)
    expect(first).toBe('c-1')
  })
})
