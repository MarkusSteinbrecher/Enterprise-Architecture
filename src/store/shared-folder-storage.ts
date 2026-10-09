import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import {
  DEFAULT_SETTINGS,
  readSettings,
  type KeyedStore,
  type LockObservation,
  type ModelKey,
  type SettingsResult,
  type SharedFolderSettings,
} from '@/io/shared-folder'

/**
 * What the shared-folder mode keeps in this browser (spec §4, §5.3, §7, §8):
 * the folders the user granted, how long each lock has been watched, the
 * conflict copies they dismissed, each model's base snapshot, the settings, and
 * this profile's client id.
 *
 * Its own database, so adding it changes nothing in the workspace cache's.
 * Like that one it is a cache: losing it loses a stale-lock watch and a
 * dismissed notice, never a model.
 */

const DB_NAME = 'archipelago-shared-folders'
const DB_VERSION = 1

export interface StoredFolder {
  /** Assigned when the folder is first opened; two libraries may share a name (spec §4). */
  readonly key: string
  readonly name: string
  readonly handle: FileSystemDirectoryHandle
  readonly openedAt: number
}

/** A model's file as last read or written: the save guard's fingerprint, a later merge's base (spec §7). */
export interface StoredBase {
  readonly bytes: Uint8Array
  readonly fingerprint: string
}

interface Entry<T> {
  folderKey: string
  fileName: string
  value: T
}

interface SharedFolderDB extends DBSchema {
  folders: { key: string; value: StoredFolder }
  observations: { key: [string, string]; value: Entry<LockObservation> }
  dismissed: { key: [string, string]; value: Entry<readonly string[]> }
  bases: { key: [string, string]; value: Entry<StoredBase> }
  prefs: { key: string; value: unknown }
}

type PerModel = 'observations' | 'dismissed' | 'bases'

let dbPromise: Promise<IDBPDatabase<SharedFolderDB>> | undefined

function database(): Promise<IDBPDatabase<SharedFolderDB>> {
  dbPromise ??= openDB<SharedFolderDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore('folders', { keyPath: 'key' })
      // An array key, never a joined string: a file name may hold any separator.
      for (const name of ['observations', 'dismissed', 'bases'] as const) {
        db.createObjectStore(name, { keyPath: ['folderKey', 'fileName'] })
      }
      db.createObjectStore('prefs')
    },
  })
  return dbPromise
}

/** Test seam: drop the cached connection so a fresh fake-indexeddb can be used. */
export function resetSharedFolderStorage(): void {
  dbPromise = undefined
}

/**
 * Remember a folder the user picked, and give it its key. A folder opened
 * before keeps its key: it is found by `same` (the handle's `isSameEntry`),
 * not by name.
 */
export async function rememberFolder(
  handle: FileSystemDirectoryHandle,
  {
    now = Date.now(),
    same = (a: FileSystemDirectoryHandle, b: FileSystemDirectoryHandle) => a.isSameEntry(b),
    newKey = (): string => crypto.randomUUID(),
  } = {},
): Promise<StoredFolder> {
  const db = await database()
  for (const stored of await db.getAll('folders')) {
    if (await same(stored.handle, handle)) {
      const updated = { ...stored, name: handle.name, handle, openedAt: now }
      await db.put('folders', updated)
      return updated
    }
  }
  const folder: StoredFolder = { key: newKey(), name: handle.name, handle, openedAt: now }
  await db.put('folders', folder)
  return folder
}

/** The folders opened before, most recent first. */
export async function listFolders(): Promise<StoredFolder[]> {
  const db = await database()
  return (await db.getAll('folders')).sort((a, b) => b.openedAt - a.openedAt)
}

/** Forget a folder and everything remembered about its models. */
export async function forgetFolder(key: string): Promise<void> {
  const db = await database()
  const tx = db.transaction(['folders', 'observations', 'dismissed', 'bases'], 'readwrite')
  await tx.objectStore('folders').delete(key)
  for (const name of ['observations', 'dismissed', 'bases'] as const) {
    const store = tx.objectStore(name)
    for (const entry of await store.getAll()) {
      if (entry.folderKey === key) await store.delete([entry.folderKey, entry.fileName])
    }
  }
  await tx.done
}

/** A per-model store, keyed by the `[folderKey, fileName]` pair. */
export function storedPerModel<T>(name: PerModel): KeyedStore<T> {
  type Store = KeyedStore<T>
  const key = ([folderKey, fileName]: ModelKey): [string, string] => [folderKey, fileName]
  return {
    get: (async (k: ModelKey) => {
      const entry = await (await database()).get(name, key(k))
      return entry?.value as T | undefined
    }) as Store['get'],
    set: (async (k: ModelKey, value: T) => {
      const [folderKey, fileName] = key(k)
      await (await database()).put(name, { folderKey, fileName, value } as never)
    }) as Store['set'],
    delete: (async (k: ModelKey) => {
      await (await database()).delete(name, key(k))
    }) as Store['delete'],
  }
}

/** The settings, through the guard; anything stored that fails it reads as the defaults. */
export async function loadSettings(): Promise<SharedFolderSettings> {
  const raw = await (await database()).get('prefs', 'settings')
  const result = readSettings(raw)
  return result.ok ? result.settings : DEFAULT_SETTINGS
}

/** Store settings that pass the guard; refuse the rest and store nothing. */
export async function saveSettings(input: unknown): Promise<SettingsResult> {
  const result = readSettings(input)
  if (result.ok) await (await database()).put('prefs', result.settings, 'settings')
  return result
}

/** This browser profile's id, made once. It names the profile's audit log (spec §5.5). */
export async function clientId(newId = (): string => crypto.randomUUID()): Promise<string> {
  const db = await database()
  const stored = await db.get('prefs', 'clientId')
  if (typeof stored === 'string' && stored !== '') return stored
  const id = newId()
  await db.put('prefs', id, 'clientId')
  return id
}
