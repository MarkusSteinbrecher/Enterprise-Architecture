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

      // A restore must not look like an edit, so the dirty counter stays at zero.
      const restored = initialWorkspace ?? (await loadMostRecentWorkspace())
      if (cancelled) return
      if (restored) store.replaceWorkspace(restored)
      else if (acquired === 'writer') await saveSnapshot(store.snapshot())

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

  const openWorkspace = useCallback(
    async (id: string) => {
      if (id === store.id) return
      await autosaverRef.current?.flush()
      const workspace = await loadWorkspace(id)
      if (workspace) store.replaceWorkspace(workspace)
      await refreshWorkspaces()
    },
    [store, refreshWorkspaces],
  )

  const createWorkspace = useCallback(
    async (name: string) => {
      await autosaverRef.current?.flush()
      const workspace = emptyWorkspace(newId('ws'), name)
      store.replaceWorkspace(workspace)
      await saveSnapshot(workspace)
      await refreshWorkspaces()
    },
    [store, refreshWorkspaces],
  )

  const removeWorkspace = useCallback(
    async (id: string) => {
      await deleteWorkspace(id)
      if (id === store.id) {
        const next = await loadMostRecentWorkspace()
        store.replaceWorkspace(next ?? emptyWorkspace(newId('ws'), 'Untitled workspace'))
      }
      await refreshWorkspaces()
    },
    [store, refreshWorkspaces],
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
