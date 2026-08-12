import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { emptyWorkspace, type Workspace } from '@/model'
import { ModelStore } from './model-store'
import { Autosaver } from './autosave'
import { TabLock, type TabRole } from './tab-lock'
import {
  deleteWorkspace,
  listWorkspaces,
  loadMostRecentWorkspace,
  loadWorkspace,
  requestPersistentStorage,
  saveSnapshot,
  type WorkspaceMeta,
} from './persistence'
import { ModelStoreContext, type ModelStoreContextValue } from './context'
import { newId } from './ids'

/**
 * Boots the model layer for the app: restores the most recent workspace from
 * IndexedDB, claims the writer lock if it is free, and wires debounced autosave.
 *
 * A tab that loses the lock still loads and renders the model — it just never
 * writes. The takeover UI for that state is issue #11.
 */

export interface ModelStoreProviderProps {
  children: ReactNode
  /** Skip the IndexedDB restore and start from this workspace (tests, demo). */
  initialWorkspace?: Workspace
  /** Disable persistence and locking entirely (tests). */
  ephemeral?: boolean
}

export function ModelStoreProvider({
  children,
  initialWorkspace,
  ephemeral = false,
}: ModelStoreProviderProps) {
  const store = useMemo(
    () => new ModelStore(initialWorkspace ?? emptyWorkspace(newId('ws'), 'Untitled workspace')),
    [initialWorkspace],
  )
  const [role, setRole] = useState<TabRole>(ephemeral ? 'writer' : 'reader')
  const [ready, setReady] = useState(ephemeral || Boolean(initialWorkspace))
  const [lastSavedAt, setLastSavedAt] = useState<number | undefined>(undefined)
  const [workspaces, setWorkspaces] = useState<WorkspaceMeta[]>([])
  const lockRef = useRef<TabLock | undefined>(undefined)
  const autosaverRef = useRef<Autosaver | undefined>(undefined)

  const refreshWorkspaces = useCallback(async () => {
    if (ephemeral) return
    setWorkspaces(await listWorkspaces())
  }, [ephemeral])

  useEffect(() => {
    if (ephemeral) return
    let cancelled = false

    const autosaver = new Autosaver(store, {
      onSaved: (at) => {
        setLastSavedAt(at)
        void refreshWorkspaces()
      },
    })
    autosaverRef.current = autosaver

    const lock = new TabLock({
      onRoleChange: (next) => {
        if (cancelled) return
        setRole(next)
        autosaver.setEnabled(next === 'writer')
      },
    })
    lockRef.current = lock

    void (async () => {
      const acquired = await lock.acquire()
      if (cancelled) return
      setRole(acquired)
      autosaver.setEnabled(acquired === 'writer')

      // The store already holds `initialWorkspace`; only an IndexedDB restore is
      // new. A restored snapshot is not a file — browser storage is a cache, so
      // a workspace that has only ever lived there matches nothing on disk and
      // must not present as SAVED, however many sessions it has survived.
      if (!initialWorkspace) {
        const restored = await loadMostRecentWorkspace()
        if (cancelled) return
        if (restored) store.replaceWorkspace(restored, { markClean: false })
        else if (acquired === 'writer') await saveSnapshot(store.snapshot())
      }

      autosaver.start()
      await refreshWorkspaces()
      if (cancelled) return
      setReady(true)
      if (acquired === 'writer') void requestPersistentStorage()
    })()

    return () => {
      cancelled = true
      autosaver.stop()
      lock.stop()
    }
  }, [store, initialWorkspace, ephemeral, refreshWorkspaces])

  // `ephemeral` promises no persistence and `reader` promises no writes; both are
  // enforced here rather than at the call sites, because the switcher is not the
  // only thing that will ever want these.
  const canPersist = !ephemeral
  const canWrite = canPersist && role === 'writer'

  const openWorkspace = useCallback(
    async (id: string) => {
      if (!canPersist || id === store.id) return
      await autosaverRef.current?.flush()
      const workspace = await loadWorkspace(id)
      // Snapshot, not file: the counter has to keep saying so. Switching used to
      // take `markClean`'s old default and zero it, so building 40 changes in A,
      // switching to B and back reported SAVED for a model in no file anywhere.
      if (workspace) store.replaceWorkspace(workspace, { markClean: false })
      await refreshWorkspaces()
    },
    [store, refreshWorkspaces, canPersist],
  )

  const createWorkspace = useCallback(
    async (name: string) => {
      if (!canWrite) return
      await autosaverRef.current?.flush()
      const workspace = emptyWorkspace(newId('ws'), name)
      // The one case where "matches no file" and "has nothing to lose" are the
      // same state: we just made it, so it is provably empty. Marking it clean
      // overstates nothing, and it keeps "New workspace…" consistent with a
      // first boot, which shows the same empty workspace as SAVED.
      store.replaceWorkspace(workspace, { markClean: true })
      await saveSnapshot(workspace)
      await refreshWorkspaces()
    },
    [store, refreshWorkspaces, canWrite],
  )

  const removeWorkspace = useCallback(
    async (id: string) => {
      if (!canWrite) return
      const autosaver = autosaverRef.current
      // Before the first await, not after: a debounce armed by the rename that
      // usually precedes a delete is already due by the time `window.confirm`
      // returns, and would fire into the gap between the delete and the replace.
      await autosaver?.suspend()
      try {
        await deleteWorkspace(id)
        if (id === store.id) {
          const next = await loadMostRecentWorkspace()
          if (next) store.replaceWorkspace(next, { markClean: false })
          else {
            const fresh = emptyWorkspace(newId('ws'), 'Untitled workspace')
            store.replaceWorkspace(fresh, { markClean: true })
            await saveSnapshot(fresh)
          }
        }
      } finally {
        autosaver?.resume()
      }
      await refreshWorkspaces()
    },
    [store, refreshWorkspaces, canWrite],
  )

  const value = useMemo<ModelStoreContextValue>(
    () => ({
      store,
      role,
      ready,
      lastSavedAt,
      workspaces,
      openWorkspace,
      createWorkspace,
      removeWorkspace,
      takeOver: async () => {
        const next = await lockRef.current?.takeOver()
        if (next) setRole(next)
      },
      flush: async () => {
        await autosaverRef.current?.flush()
      },
    }),
    [store, role, ready, lastSavedAt, workspaces, openWorkspace, createWorkspace, removeWorkspace],
  )

  return <ModelStoreContext.Provider value={value}>{children}</ModelStoreContext.Provider>
}
