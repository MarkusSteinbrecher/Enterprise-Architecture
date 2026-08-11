import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Workspace } from '@/model'

/**
 * IndexedDB persistence (concept §5.2).
 *
 * Browser storage is a **cache**, not the source of truth — Safari evicts
 * script-writable storage after seven days of non-use, so the UI nudges toward
 * file export and this layer only has to survive a crash or a closed tab.
 *
 * Snapshots are kept in rolling generations per workspace: the newest write wins,
 * older ones stay around so a corrupt or half-written save is recoverable.
 */

const DB_NAME = 'archipelago'
const DB_VERSION = 1

/** How many snapshots to keep per workspace. */
export const GENERATIONS = 5

export interface WorkspaceMeta {
  id: string
  name: string
  updatedAt: number
  elementCount: number
  relationshipCount: number
}

export interface Snapshot {
  /** `${workspaceId}:${seq}` — monotonic within a workspace. */
  key: string
  workspaceId: string
  seq: number
  savedAt: number
  workspace: Workspace
}

interface ArchipelagoDB extends DBSchema {
  workspaces: {
    key: string
    value: WorkspaceMeta
  }
  snapshots: {
    key: string
    value: Snapshot
    indexes: { byWorkspace: string }
  }
}

let dbPromise: Promise<IDBPDatabase<ArchipelagoDB>> | undefined

export function openDatabase(): Promise<IDBPDatabase<ArchipelagoDB>> {
  dbPromise ??= openDB<ArchipelagoDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('workspaces')) {
        db.createObjectStore('workspaces', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('snapshots')) {
        const store = db.createObjectStore('snapshots', { keyPath: 'key' })
        store.createIndex('byWorkspace', 'workspaceId')
      }
    },
  })
  return dbPromise
}

/** Test seam: drop the cached connection so a fresh fake-indexeddb can be used. */
export function resetDatabaseConnection(): void {
  dbPromise = undefined
}

export async function listWorkspaces(): Promise<WorkspaceMeta[]> {
  const db = await openDatabase()
  const all = await db.getAll('workspaces')
  return all.toSorted((a, b) => b.updatedAt - a.updatedAt)
}

export async function getWorkspaceMeta(id: string): Promise<WorkspaceMeta | undefined> {
  const db = await openDatabase()
  return db.get('workspaces', id)
}

/**
 * Write a snapshot and prune to `GENERATIONS`.
 * Meta and snapshot go in one transaction so the list can never point at a
 * workspace that has no snapshot behind it.
 */
export async function saveSnapshot(workspace: Workspace, at = Date.now()): Promise<Snapshot> {
  const db = await openDatabase()
  const tx = db.transaction(['workspaces', 'snapshots'], 'readwrite')
  const snapshots = tx.objectStore('snapshots')

  const existing = await snapshots.index('byWorkspace').getAll(workspace.id)
  const seq = existing.reduce((max, s) => Math.max(max, s.seq), 0) + 1

  const snapshot: Snapshot = {
    key: `${workspace.id}:${seq}`,
    workspaceId: workspace.id,
    seq,
    savedAt: at,
    workspace,
  }
  await snapshots.put(snapshot)

  // Prune oldest generations beyond the rolling window.
  const keep = [...existing, snapshot].toSorted((a, b) => b.seq - a.seq).slice(0, GENERATIONS)
  const keepKeys = new Set(keep.map((s) => s.key))
  for (const stale of existing) {
    if (!keepKeys.has(stale.key)) await snapshots.delete(stale.key)
  }

  await tx.objectStore('workspaces').put({
    id: workspace.id,
    name: workspace.name,
    updatedAt: at,
    elementCount: workspace.elements.length,
    relationshipCount: workspace.relationships.length,
  })

  await tx.done
  return snapshot
}

/** Newest snapshot for a workspace, or `undefined` if it has none. */
export async function loadWorkspace(id: string): Promise<Workspace | undefined> {
  const generations = await loadGenerations(id)
  return generations[0]?.workspace
}

/** All kept generations, newest first. */
export async function loadGenerations(id: string): Promise<Snapshot[]> {
  const db = await openDatabase()
  const all = await db.getAllFromIndex('snapshots', 'byWorkspace', id)
  return all.toSorted((a, b) => b.seq - a.seq)
}

/** The workspace to open on boot — the most recently written one. */
export async function loadMostRecentWorkspace(): Promise<Workspace | undefined> {
  const [meta] = await listWorkspaces()
  return meta ? loadWorkspace(meta.id) : undefined
}

export async function deleteWorkspace(id: string): Promise<void> {
  const db = await openDatabase()
  const tx = db.transaction(['workspaces', 'snapshots'], 'readwrite')
  await tx.objectStore('workspaces').delete(id)
  const snapshots = tx.objectStore('snapshots')
  for (const snapshot of await snapshots.index('byWorkspace').getAll(id)) {
    await snapshots.delete(snapshot.key)
  }
  await tx.done
}

export async function renameStoredWorkspace(id: string, name: string): Promise<void> {
  const db = await openDatabase()
  const meta = await db.get('workspaces', id)
  if (!meta) return
  await db.put('workspaces', { ...meta, name, updatedAt: Date.now() })
}

/**
 * Ask the browser to exempt our storage from eviction. Chromium grants it
 * silently for engaged sites; Firefox prompts; Safari always says no. A refusal
 * is not an error — it is exactly why the save-state indicator exists.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false
  try {
    if (await navigator.storage.persisted?.()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}
