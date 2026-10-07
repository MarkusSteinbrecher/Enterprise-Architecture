import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fromCanonicalJson, serialiseWorkspace } from '@/io'
import {
  browserFolder,
  decodeText,
  encodeText,
  SharedModelSession,
  type ConflictCopy,
  type LockRecord,
  type SaveRefusal,
  type SharedFolderSettings,
} from '@/io/shared-folder'
import type { ModelStore } from '@/store'
import {
  clientId,
  loadSettings,
  storedPerModel,
  type StoredBase,
  type StoredFolder,
} from '@/store/shared-folder-storage'

/**
 * A model opened from a shared folder (#147): the UI side of
 * `SharedModelSession`. The session decides; this applies what it decided to
 * the store, and keeps the state the banner, the dialogs and the save-state
 * indicator read.
 *
 * Two clocks drive it: the writer's heartbeat, and the reader's poll while the
 * page is visible. Coming back to the page (after sleep, say) runs one at once.
 */

/** Why this tab may not edit the model, when it may not (spec §9). */
export type ReaderReason =
  /** Someone else holds the lock; `stale` is this machine's judgement. */
  | { kind: 'held'; owner?: LockRecord; stale: boolean; quietForMs: number }
  /** This tab held it and lost it: taken over, or unlocked. Its edits are kept. */
  | { kind: 'lost'; by?: LockRecord }
  /** This tab could not renew its lock for half the stale time, and let go (spec §5.2). */
  | { kind: 'fenced' }
  /** The lock is free: offer **Edit**. */
  | { kind: 'free' }
  /** The lock could not be read or written. */
  | { kind: 'unknown'; message: string }

export interface SharedModelState {
  readonly folder: StoredFolder
  readonly model: string
  /** `acquiring` is the settle delay: shown, not yet editable. */
  readonly phase: 'acquiring' | 'writer' | 'reader'
  readonly reader?: ReaderReason | undefined
  /** The file on disk is not the one the open model was last read from or written to (spec §8.2). */
  readonly diverged: boolean
  readonly conflicts: readonly ConflictCopy[]
  /** The display name this tab writes on the lock. */
  readonly displayName: string
}

/** A save the guard refused, waiting on the user's choice (spec §6.2). */
export interface Refusal {
  readonly reason: SaveRefusal | 'reader'
  readonly canOverwrite: boolean
}

export interface SharedModel {
  readonly shared: SharedModelState | undefined
  readonly refusal: Refusal | undefined
  /** Set when the file changed under this tab's lock: the blocking notice (spec §8.2). */
  readonly divergedNotice: boolean
  open(folder: StoredFolder, model: string): Promise<boolean>
  close(): Promise<void>
  save(): Promise<void>
  overwrite(): Promise<void>
  saveAsCopy(): Promise<void>
  reload(): Promise<void>
  edit(): Promise<void>
  takeOver(): Promise<void>
  unlock(): Promise<void>
  dismissConflict(name: string): Promise<void>
  dismissRefusal(): void
  dismissDivergedNotice(): void
}

const APP_VERSION = '0.2.0'

export function useSharedModel(store: ModelStore, notify: (message: string) => void): SharedModel {
  const [shared, setShared] = useState<SharedModelState | undefined>(undefined)
  const [refusal, setRefusal] = useState<Refusal | undefined>(undefined)
  const [divergedNotice, setDivergedNotice] = useState(false)
  const session = useRef<SharedModelSession | undefined>(undefined)
  const settings = useRef<SharedFolderSettings | undefined>(undefined)
  const busy = useRef(false)
  // The ticks read the state through this, so the timers are not restarted by
  // every change they make.
  const current = useRef<SharedModelState | undefined>(undefined)
  useEffect(() => {
    current.current = shared
  }, [shared])

  const update = useCallback(
    (change: Partial<SharedModelState>) =>
      setShared((current) => (current ? { ...current, ...change } : current)),
    [],
  )

  /** Load bytes read from the folder into the store, as a file that holds them. */
  const apply = useCallback(
    (bytes: Uint8Array, model: string): boolean => {
      const result = fromCanonicalJson(decodeText(bytes), model)
      if (!result.workspace) {
        notify(`“${model}” is not an Archipelago model this version can read.`)
        return false
      }
      store.replaceWorkspace(result.workspace, { markClean: true })
      return true
    },
    [store, notify],
  )

  const rememberBase = useCallback(async (s: SharedModelSession, folder: StoredFolder) => {
    if (!s.base) return
    await storedPerModel<StoredBase>('bases')
      .set([folder.key, s.model], s.base)
      .catch(() => {})
  }, [])

  /** Take the lock, and say what came of it. */
  const acquire = useCallback(
    async (s: SharedModelSession, folder: StoredFolder, takeOver = false) => {
      update({ phase: 'acquiring' })
      const result = await s.acquire({ takeOver, hasUnsavedChanges: store.dirty > 0 })
      if (session.current !== s) return
      if (!('outcome' in result)) {
        notify(result.message)
        update({ phase: 'reader' })
        return
      }
      const { outcome, reload } = result
      if (reload) apply(reload, s.model)
      await rememberBase(s, folder)
      if (outcome.kind === 'writer') {
        update({ phase: 'writer', reader: undefined, diverged: s.diverged })
        if (s.diverged) setDivergedNotice(true)
        return
      }
      const reader: ReaderReason =
        outcome.why === 'held'
          ? outcome.view
          : outcome.why === 'lost'
            ? { kind: 'lost', ...(outcome.winner ? { by: outcome.winner } : {}) }
            : { kind: 'unknown', message: outcome.message }
      update({ phase: 'reader', reader })
      if (outcome.why === 'lost') {
        notify(
          `${outcome.winner?.displayName ?? 'Someone else'} took “${s.model}” for editing first. It is open read-only.`,
        )
      }
    },
    [apply, notify, rememberBase, store, update],
  )

  const close = useCallback(async () => {
    const s = session.current
    session.current = undefined
    setShared(undefined)
    setRefusal(undefined)
    setDivergedNotice(false)
    if (s) await s.close()
  }, [])

  const open = useCallback(
    async (folder: StoredFolder, model: string): Promise<boolean> => {
      await close()
      const loaded = await loadSettings()
      settings.current = loaded
      const s = new SharedModelSession({
        folder: browserFolder(folder.handle),
        folderKey: folder.key,
        model,
        clientId: await clientId(),
        appVersion: APP_VERSION,
        settings: loaded,
        observations: storedPerModel('observations'),
        dismissed: storedPerModel('dismissed'),
      })
      const read = await s.load()
      if (read.kind !== 'loaded') {
        notify(
          read.kind === 'missing'
            ? `“${model}” is no longer in the folder.`
            : `“${model}” could not be read: ${read.message}`,
        )
        return false
      }
      if (!apply(read.bytes, model)) return false
      session.current = s
      setShared({
        folder,
        model,
        phase: 'acquiring',
        diverged: false,
        conflicts: await s.scan(),
        displayName: loaded.displayName,
      })
      void acquire(s, folder)
      return true
    },
    [acquire, apply, close, notify],
  )

  /** The writer's heartbeat, or the reader's poll. */
  const tick = useCallback(async () => {
    const s = session.current
    if (!s || busy.current) return
    busy.current = true
    try {
      const before = current.current
      if (s.role === 'writer') {
        const result = await s.writerTick()
        if (session.current !== s) return
        if (result.lock.kind === 'lost' || result.lock.kind === 'fenced') {
          const by = result.lock.kind === 'lost' ? result.lock.by : undefined
          update({
            phase: 'reader',
            reader:
              result.lock.kind === 'lost'
                ? { kind: 'lost', ...(by ? { by } : {}) }
                : { kind: 'fenced' },
          })
          notify(
            result.lock.kind === 'lost'
              ? `${by?.displayName ?? 'Someone'} now holds “${s.model}”. Your edits are kept here: save them as a copy.`
              : `“${s.model}” could not be kept for editing: its lock could not be renewed. Your edits are kept here: save them as a copy.`,
          )
        }
        if (s.diverged && !before?.diverged) setDivergedNotice(true)
        update({ diverged: s.diverged, conflicts: result.conflicts })
        return
      }
      const result = await s.readerTick(store.dirty > 0)
      if (session.current !== s) return
      if (result.reload && apply(result.reload, s.model)) {
        notify(`“${s.model}” changed in the folder and was reloaded.`)
      }
      // A writer that lost the lock keeps saying so until the lock is free.
      const demoted = before?.reader?.kind === 'lost' || before?.reader?.kind === 'fenced'
      const reader: ReaderReason | undefined =
        result.lock.kind === 'free'
          ? { kind: 'free' }
          : result.lock.kind === 'held' && !demoted
            ? result.lock
            : undefined
      update({ diverged: s.diverged, conflicts: result.conflicts, ...(reader ? { reader } : {}) })
    } finally {
      busy.current = false
    }
  }, [apply, notify, store, update])

  const phase = shared?.phase
  useEffect(() => {
    if (!phase || phase === 'acquiring' || !settings.current) return
    const every = phase === 'writer' ? settings.current.heartbeatMs : settings.current.pollMs
    const timer = setInterval(() => {
      if (phase === 'reader' && document.visibilityState === 'hidden') return
      void tick()
    }, every)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void tick()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [phase, tick])

  const save = useCallback(async () => {
    const s = session.current
    if (!s || !shared) return
    if (shared.phase === 'acquiring') {
      notify(`Still taking “${s.model}” for editing. Try again in a moment.`)
      return
    }
    if (shared.phase === 'reader') {
      setRefusal({ reason: 'reader', canOverwrite: false })
      return
    }
    const written = store.dirty
    const result = await s.save(encodeText(serialiseWorkspace(store.snapshot(), 'json')))
    if (result.kind === 'saved') {
      store.markSavedThrough(written)
      await rememberBase(s, shared.folder)
      update({ diverged: false })
      notify(`Saved to ${s.model} in ${shared.folder.name}`)
    } else if (result.kind === 'refused') {
      if (result.reason === 'lock-lost') update({ phase: 'reader', reader: { kind: 'lost' } })
      setRefusal({ reason: result.reason, canOverwrite: result.canOverwrite })
    } else {
      notify(`Could not save ${s.model}: ${result.message}`)
    }
  }, [notify, rememberBase, shared, store, update])

  const overwrite = useCallback(async () => {
    const s = session.current
    if (!s || !shared) return
    setRefusal(undefined)
    const written = store.dirty
    const result = await s.save(encodeText(serialiseWorkspace(store.snapshot(), 'json')), {
      overwrite: true,
    })
    if (result.kind === 'saved') {
      store.markSavedThrough(written)
      await rememberBase(s, shared.folder)
      update({ diverged: false })
      notify(`Overwrote ${s.model} in ${shared.folder.name}`)
    } else if (result.kind === 'refused') {
      setRefusal({ reason: result.reason, canOverwrite: false })
    } else {
      notify(`Could not overwrite ${s.model}: ${result.message}`)
    }
  }, [notify, rememberBase, shared, store, update])

  const saveAsCopy = useCallback(async () => {
    const s = session.current
    if (!s || !shared) return
    setRefusal(undefined)
    setDivergedNotice(false)
    const copy = await s.saveAsCopy(encodeText(serialiseWorkspace(store.snapshot(), 'json')))
    if (copy.kind === 'failed') {
      notify(`Could not save a copy: ${copy.message}`)
      return
    }
    // The copy was written and seen to close: open it, and its lock, in place
    // of the model. The model's own file was not written.
    if (await open(shared.folder, copy.name)) {
      notify(`Your changes are in ${copy.name}. ${s.model} was not changed.`)
    }
  }, [notify, open, shared, store])

  const reload = useCallback(async () => {
    const s = session.current
    if (!s) return
    setRefusal(undefined)
    setDivergedNotice(false)
    const read = await s.load()
    if (read.kind === 'loaded') {
      apply(read.bytes, s.model)
      update({ diverged: false })
    } else {
      notify(`“${s.model}” could not be read again.`)
    }
  }, [apply, notify, update])

  const edit = useCallback(async () => {
    const s = session.current
    if (!s || !shared) return
    await acquire(s, shared.folder)
  }, [acquire, shared])

  const takeOver = useCallback(async () => {
    const s = session.current
    if (!s || !shared) return
    await acquire(s, shared.folder, true)
  }, [acquire, shared])

  const unlock = useCallback(async () => {
    const s = session.current
    if (!s) return
    const result = await s.unlock()
    if (result.kind === 'unlocked') {
      update({ reader: { kind: 'free' } })
      notify(`Unlocked “${s.model}”. It can be taken for editing now.`)
    } else {
      notify(result.message)
    }
  }, [notify, update])

  const dismissConflict = useCallback(
    async (name: string) => {
      const s = session.current
      if (!s) return
      await s.dismiss(name)
      update({ conflicts: await s.scan() })
    },
    [update],
  )

  // A page that is closing releases its lock if it can; staleness covers the rest.
  useEffect(() => {
    const onUnload = () => void session.current?.close()
    window.addEventListener('pagehide', onUnload)
    return () => window.removeEventListener('pagehide', onUnload)
  }, [])

  return useMemo(
    () => ({
      shared,
      refusal,
      divergedNotice,
      open,
      close,
      save,
      overwrite,
      saveAsCopy,
      reload,
      edit,
      takeOver,
      unlock,
      dismissConflict,
      dismissRefusal: () => setRefusal(undefined),
      dismissDivergedNotice: () => setDivergedNotice(false),
    }),
    [
      shared,
      refusal,
      divergedNotice,
      open,
      close,
      save,
      overwrite,
      saveAsCopy,
      reload,
      edit,
      takeOver,
      unlock,
      dismissConflict,
    ],
  )
}
