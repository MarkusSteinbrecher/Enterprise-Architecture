import { fingerprint } from './fingerprint'
import { freeCopyFileName } from './file-names'
import { failure, type Folder } from './folder'
import type { LockManager } from './lock-manager'

/**
 * The checks before every write of a model in a shared folder (spec §6.1).
 *
 * 1. We hold the lock: re-read it. Not ours, or not readable: refuse.
 * 2. The file is what we last read or wrote: its fingerprint matches. Changed,
 *    gone, or not readable: refuse.
 * 3. Write, and record the fingerprint **of the bytes we wrote**. Never re-read
 *    the file to fingerprint it: a change landing in between would be recorded
 *    as ours. A write that throws (on Windows the sync client can make `close()`
 *    reject) records nothing.
 *
 * Both checks see only this machine; what has not synced yet gets past them,
 * and the session's watch catches it afterwards (spec §1.1).
 */
export type SaveRefusal =
  /** The lock is someone else's, or gone. */
  | 'lock-lost'
  /** The lock could not be read, so it cannot be shown to be ours. */
  | 'lock-unreadable'
  /** The file on disk is not the one we last read or wrote. */
  | 'file-changed'
  /** The file is gone. */
  | 'file-missing'
  /** The file could not be read, so it cannot be shown to be unchanged. */
  | 'file-unreadable'

export type GuardedSave =
  | { kind: 'saved'; fingerprint: string }
  /**
   * Nothing was written. `canOverwrite` is whether **Overwrite anyway** may be
   * offered: only when the file differs (check 2), never when the lock does
   * (check 1), and not while the file cannot even be read.
   */
  | { kind: 'refused'; reason: SaveRefusal; canOverwrite: boolean; message?: string }
  | { kind: 'failed'; message: string }

export interface GuardedSaveOptions {
  readonly folder: Folder
  readonly model: string
  readonly lock: LockManager
  /** The fingerprint of the file as we last read or wrote it. */
  readonly expected: string
  readonly bytes: Uint8Array
  /** Skip check 2 after the user confirmed twice (spec §6.2). Check 1 still runs. */
  readonly overwrite?: boolean
  /**
   * Runs once both checks have passed, just before the write; `false` stops
   * it. The session logs an overwrite here, so the log never records one that
   * a check then refused.
   */
  readonly beforeWrite?: () => Promise<boolean>
}

export async function guardedSave(options: GuardedSaveOptions): Promise<GuardedSave> {
  const { folder, model, lock, expected, bytes, overwrite = false, beforeWrite } = options

  const held = await lock.confirm()
  if (typeof held === 'object') {
    return { kind: 'refused', reason: 'lock-unreadable', canOverwrite: false, message: held.failed }
  }
  if (held === 'not-ours') return { kind: 'refused', reason: 'lock-lost', canOverwrite: false }

  if (!overwrite) {
    let current: Uint8Array | undefined
    try {
      current = await folder.read(model)
    } catch (error) {
      return {
        kind: 'refused',
        reason: 'file-unreadable',
        canOverwrite: false,
        message: failure(error),
      }
    }
    if (current === undefined) {
      return { kind: 'refused', reason: 'file-missing', canOverwrite: true }
    }
    if ((await fingerprint(current)) !== expected) {
      return { kind: 'refused', reason: 'file-changed', canOverwrite: true }
    }
  }

  if (beforeWrite && !(await beforeWrite())) {
    return { kind: 'failed', message: 'The save was stopped before writing.' }
  }
  try {
    await folder.write(model, bytes)
  } catch (error) {
    return { kind: 'failed', message: failure(error) }
  }
  return { kind: 'saved', fingerprint: await fingerprint(bytes) }
}

export type CopySave =
  { kind: 'copied'; name: string; fingerprint: string } | { kind: 'failed'; message: string }

/**
 * **Save as copy** (spec §6.2): the work goes into a new file beside the model,
 * and the model's own file is not touched. Opening the copy, and taking its
 * lock, is the caller's next step.
 */
export async function saveAsCopy(
  folder: Folder,
  model: string,
  displayName: string,
  at: Date,
  bytes: Uint8Array,
): Promise<CopySave> {
  try {
    const name = await freeCopyFileName(folder, model, displayName, at)
    await folder.write(name, bytes)
    return { kind: 'copied', name, fingerprint: await fingerprint(bytes) }
  } catch (error) {
    return { kind: 'failed', message: failure(error) }
  }
}
