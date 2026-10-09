import { appendAudit, type AuditEntry } from './audit-log'
import { scanConflictCopies, type ConflictCopy } from './conflict-copies'
import { fingerprint } from './fingerprint'
import { failure, type Folder } from './folder'
import {
  LockManager,
  systemClock,
  type AcquireOutcome,
  type Clock,
  type HeartbeatOutcome,
  type LockView,
} from './lock-manager'
import type { KeyedStore, LockObservation, ModelKey } from './memory'
import { guardedSave, saveAsCopy, type CopySave, type GuardedSave } from './save-guard'
import type { SharedFolderSettings } from './settings'

/**
 * One model opened from a shared folder: the lock, the save guard, the watch on
 * the model file and the conflict scan, as one object the UI drives (spec §5–§9).
 * Every decision is made here and returned as data; the UI only applies it
 * (load these bytes, mark saved, show this notice). Nothing here knows React.
 *
 * The UI calls `writerTick` every heartbeat while `role` is writer, and
 * `readerTick` every poll while it is reader. `diverged` is the state the
 * save-state indicator reads beside the dirty counter: the file on disk is not
 * the one this model was last read from or written to, so "saved" would be
 * false (spec §8.2).
 */
export interface SessionOptions {
  readonly folder: Folder
  readonly folderKey: string
  readonly model: string
  /** This browser profile's id, which names its audit log (spec §5.5). */
  readonly clientId: string
  readonly appVersion: string
  readonly settings: SharedFolderSettings
  readonly observations: KeyedStore<LockObservation>
  /** The possible conflict copies the user dismissed, per model (spec §8.1). */
  readonly dismissed: KeyedStore<readonly string[]>
  readonly clock?: Clock
  readonly newToken?: () => string
}

/** The model file compared with the one we last read or wrote. */
export type ModelCheck = 'same' | 'changed' | 'missing' | { failed: string }

export interface Snapshot {
  readonly bytes: Uint8Array
  readonly fingerprint: string
}

export type LoadOutcome =
  { kind: 'loaded'; bytes: Uint8Array } | { kind: 'missing' } | { kind: 'failed'; message: string }

export interface AcquireResult {
  readonly outcome: AcquireOutcome
  /** The model changed while we took the lock: load these bytes before allowing edits (spec §5.1, step 5). */
  readonly reload?: Uint8Array
}

export interface WriterTick {
  readonly lock: HeartbeatOutcome
  readonly model: ModelCheck
  readonly conflicts: ConflictCopy[]
}

export interface ReaderTick {
  readonly lock: LockView
  readonly model: ModelCheck
  /** The model changed and this reader holds no unsaved changes: load these bytes (spec §9). */
  readonly reload?: Uint8Array
  readonly conflicts: ConflictCopy[]
}

/** An action the audit log must record could not be recorded, so it was not done. */
export interface NotLogged {
  readonly kind: 'not-logged'
  readonly message: string
}

export class SharedModelSession {
  readonly #options: SessionOptions
  readonly #clock: Clock
  readonly #lock: LockManager
  readonly #key: ModelKey
  #base: Snapshot | undefined
  #diverged = false

  constructor(options: SessionOptions) {
    this.#options = options
    this.#clock = options.clock ?? systemClock
    this.#key = [options.folderKey, options.model]
    this.#lock = new LockManager({
      folder: options.folder,
      folderKey: options.folderKey,
      model: options.model,
      displayName: options.settings.displayName,
      appVersion: options.appVersion,
      settings: options.settings,
      observations: options.observations,
      clock: this.#clock,
      ...(options.newToken ? { newToken: options.newToken } : {}),
    })
  }

  get model(): string {
    return this.#options.model
  }

  get role(): 'writer' | 'reader' {
    return this.#lock.holding ? 'writer' : 'reader'
  }

  /** The file as last read or written: what the save guard compares with, and a later merge's base (spec §7). */
  get base(): Snapshot | undefined {
    return this.#base
  }

  /** The file on disk is not the one the open model was last read from or written to. */
  get diverged(): boolean {
    return this.#diverged
  }

  /** Read the model file. The UI shows it read-only until `acquire` says otherwise. */
  async load(): Promise<LoadOutcome> {
    let bytes: Uint8Array | undefined
    try {
      bytes = await this.#options.folder.read(this.#options.model)
    } catch (error) {
      return { kind: 'failed', message: failure(error) }
    }
    if (bytes === undefined) return { kind: 'missing' }
    this.#base = { bytes, fingerprint: await fingerprint(bytes) }
    this.#diverged = false
    return { kind: 'loaded', bytes }
  }

  /**
   * Take the lock for editing (spec §5.1). With `takeOver`, the user confirmed
   * taking someone else's: that is logged first, and not done if the log
   * cannot be written.
   *
   * A model that changed since it was read is reloaded before editing starts,
   * unless the caller holds unsaved changes (a writer that lost the lock and is
   * taking it back). Those are never replaced: the base stays the file they were
   * made on, the session is `diverged`, and the next save is refused for the
   * user to choose (spec §6.2).
   */
  async acquire({ takeOver = false, hasUnsavedChanges = false } = {}): Promise<
    AcquireResult | NotLogged
  > {
    if (takeOver) {
      const view = await this.#lock.look()
      const logged = await this.#audit('takeover', view)
      if (logged) return logged
    }
    const outcome = await this.#lock.acquire({ takeOver })
    if (outcome.kind !== 'writer') return { outcome }
    const check = await this.#checkModel()
    if (check.status === 'changed' && check.bytes && !hasUnsavedChanges) {
      this.#base = { bytes: check.bytes, fingerprint: check.fingerprint }
      this.#diverged = false
      return { outcome, reload: check.bytes }
    }
    if (check.status === 'changed' || check.status === 'missing') this.#diverged = true
    return { outcome }
  }

  /** The writer's heartbeat (spec §5.2): renew the lock, watch the model file, scan for copies. */
  async writerTick(): Promise<WriterTick> {
    const lock = await this.#lock.heartbeat()
    const check = await this.#checkModel()
    if (check.status !== 'same' && typeof check.status === 'string') this.#diverged = true
    return { lock, model: check.status, conflicts: await this.scan() }
  }

  /**
   * A reader's poll (spec §9): watch the lock and the model file, scan for
   * copies. A changed model is reloaded only when `hasUnsavedChanges` is false;
   * a writer demoted with edits in hand keeps them and is told instead.
   */
  async readerTick(hasUnsavedChanges: boolean): Promise<ReaderTick> {
    const lock = await this.#lock.look()
    const check = await this.#checkModel()
    let reload: Uint8Array | undefined
    if (check.status === 'changed' && check.bytes && !hasUnsavedChanges) {
      this.#base = { bytes: check.bytes, fingerprint: check.fingerprint }
      this.#diverged = false
      reload = check.bytes
    } else if (check.status === 'changed' || check.status === 'missing') {
      this.#diverged = true
    }
    return {
      lock,
      model: check.status,
      ...(reload ? { reload } : {}),
      conflicts: await this.scan(),
    }
  }

  /**
   * Save through the guard (spec §6). `overwrite` skips the "file unchanged"
   * check after the user confirmed twice; it is logged before the write, and
   * not written if the log cannot be.
   */
  async save(bytes: Uint8Array, { overwrite = false } = {}): Promise<GuardedSave | NotLogged> {
    const base = this.#base
    if (!base) return { kind: 'failed', message: 'The model has not been read from the folder.' }
    let notLogged: NotLogged | undefined
    const result = await guardedSave({
      folder: this.#options.folder,
      model: this.#options.model,
      lock: this.#lock,
      expected: base.fingerprint,
      bytes,
      overwrite,
      ...(overwrite
        ? {
            beforeWrite: async () => {
              notLogged = await this.#audit('overwrite')
              return notLogged === undefined
            },
          }
        : {}),
    })
    if (notLogged) return notLogged
    if (result.kind === 'saved') {
      this.#base = { bytes, fingerprint: result.fingerprint }
      this.#diverged = false
    }
    return result
  }

  /** Save the work beside the model instead (spec §6.2). The model's file is not written. */
  saveAsCopy(bytes: Uint8Array): Promise<CopySave> {
    return saveAsCopy(
      this.#options.folder,
      this.#options.model,
      this.#options.settings.displayName,
      new Date(this.#clock.now()),
      bytes,
    )
  }

  /** **Unlock** (spec §5.3): remove whoever's lock is there, logged first. */
  async unlock(): Promise<{ kind: 'unlocked' } | { kind: 'failed'; message: string } | NotLogged> {
    const view = await this.#lock.look()
    const notLogged = await this.#audit('unlock', view)
    if (notLogged) return notLogged
    const result = await this.#lock.unlock()
    return 'failed' in result ? { kind: 'failed', message: result.failed } : { kind: 'unlocked' }
  }

  /** Give the lock back, if it is still ours (spec §5.4). */
  close(): Promise<'released' | 'not-ours' | 'failed'> {
    return this.#lock.release()
  }

  /**
   * The possible conflict copies, less those the user dismissed. Never throws:
   * a tick calls it after the heartbeat, and a rejection there would lose the
   * heartbeat's result, which may be the news that we lost the lock.
   */
  async scan(): Promise<ConflictCopy[]> {
    try {
      const dismissed = (await this.#options.dismissed.get(this.#key)) ?? []
      return await scanConflictCopies(this.#options.folder, this.#options.model, new Set(dismissed))
    } catch {
      // A listing or a memory that fails is no news; the next tick scans again.
      return []
    }
  }

  /** Stop reporting this name for this model (spec §8.1). A new name is still reported. */
  async dismiss(name: string): Promise<void> {
    const dismissed = (await this.#options.dismissed.get(this.#key)) ?? []
    if (!dismissed.includes(name)) {
      await this.#options.dismissed.set(this.#key, [...dismissed, name])
    }
  }

  async #checkModel(): Promise<{
    status: ModelCheck
    bytes?: Uint8Array
    fingerprint: string
  }> {
    let bytes: Uint8Array | undefined
    try {
      bytes = await this.#options.folder.read(this.#options.model)
    } catch (error) {
      return { status: { failed: failure(error) }, fingerprint: '' }
    }
    if (bytes === undefined) return { status: 'missing', fingerprint: '' }
    const print = await fingerprint(bytes)
    return {
      status: print === this.#base?.fingerprint ? 'same' : 'changed',
      bytes,
      fingerprint: print,
    }
  }

  /** Write the audit line; the reason it could not be written, or nothing. */
  async #audit(action: AuditEntry['action'], view?: LockView): Promise<NotLogged | undefined> {
    const owner = view?.kind === 'held' ? view.owner?.displayName : undefined
    try {
      await appendAudit(this.#options.folder, this.#options.clientId, {
        action,
        at: this.#clock.iso(),
        displayName: this.#options.settings.displayName,
        model: this.#options.model,
        ...(owner !== undefined ? { previousOwner: owner } : {}),
      })
      return undefined
    } catch (error) {
      return {
        kind: 'not-logged',
        message: `The ${action} was not done, because it could not be written to the folder's log: ${failure(error)}`,
      }
    }
  }
}
