import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useSyncExternalStore,
  type DependencyList,
} from 'react'
import type { ModelStore } from './model-store'
import type { WorkspaceMeta } from './persistence'
import type { TabRole } from './tab-lock'

/**
 * React binding for the store — deliberately thin.
 *
 * The store is mutable by design (Maps and adjacency indexes, not immutable
 * snapshots), so components subscribe to a **version number** rather than to
 * object identity, and derive what they need on change. That keeps a 5,000-element
 * workspace out of React's reconciliation path entirely: one integer changes, the
 * selectors that read the model recompute, and nothing else re-renders.
 */

export interface ModelStoreContextValue {
  store: ModelStore
  /** Whether this tab holds the writer lock. Readers must not autosave. */
  role: TabRole
  /** False until the workspace has been restored from IndexedDB. */
  ready: boolean
  /** Epoch ms of the last successful autosave, if any. */
  lastSavedAt: number | undefined
  /** Take the writer lock from whichever tab holds it. */
  takeOver: () => Promise<void>
  /** Force an immediate autosave (used before unload and after a file save). */
  flush: () => Promise<void>
  /** Every workspace in this browser, newest first — the switcher's list. */
  workspaces: WorkspaceMeta[]
  /** Load another workspace, flushing the current one first. */
  openWorkspace: (id: string) => Promise<void>
  /** Create an empty workspace and switch to it. */
  createWorkspace: (name: string) => Promise<void>
  /** Delete a stored workspace. Deleting the open one leaves an empty workspace. */
  removeWorkspace: (id: string) => Promise<void>
}

export const ModelStoreContext = createContext<ModelStoreContextValue | null>(null)

export function useModelStoreContext(): ModelStoreContextValue {
  const value = useContext(ModelStoreContext)
  if (!value) throw new Error('useModelStoreContext must be used inside <ModelStoreProvider>')
  return value
}

export function useModelStore(): ModelStore {
  return useModelStoreContext().store
}

/** Re-renders the calling component on every model change. */
export function useModelVersion(): number {
  const store = useModelStore()
  return useSyncExternalStore(
    (listener) => store.subscribe(listener),
    () => store.version,
    () => store.version,
  )
}

/**
 * Derive a value from the model, recomputed when the model changes.
 *
 * The selector may return a fresh array or object — identity is not used for
 * change detection, the model version is. **Anything else the selector reads
 * must be listed in `deps`**: a selector that closes over a route parameter or a
 * prop will otherwise keep returning the value it computed for the old one, and
 * the model version will not have changed to tell it otherwise.
 *
 *     const element = useModelSelector((store) => store.element(id), [id])
 */
export function useModelSelector<T>(
  select: (store: ModelStore) => T,
  deps: DependencyList = [],
): T {
  const store = useModelStore()
  const version = useModelVersion()
  const selectRef = useRef(select)
  selectRef.current = select
  return useMemo(
    () => selectRef.current(store),
    // The model version and the caller's own inputs are the cache key together.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, version, ...deps],
  )
}
