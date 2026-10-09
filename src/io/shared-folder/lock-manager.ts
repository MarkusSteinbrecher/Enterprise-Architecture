import { lockFileName } from './file-names'
import { failure, type Folder } from './folder'
import { readLock, serialiseLock, LOCK_SCHEMA_VERSION, type LockRecord } from './lock-file'
import type { KeyedStore, LockObservation, ModelKey } from './memory'
import type { SharedFolderSettings } from './settings'

/**
 * One model's lock, from this browser's side (spec §5): taking it, keeping it,
 * watching someone else's, and giving it back.
 *
 * Every check reads the folder as this machine sees it. A synced folder is
 * eventually consistent, so the lock makes a clash rare and cannot make it
 * impossible (spec §1.1); `session.ts` adds the detection that catches the rest.
 */

/** Time as the protocol uses it. Tests drive it with fake timers. */
export interface Clock {
  /** This machine's clock, in ms. Only ever compared with itself. */
  now(): number
  /** The same clock as text, for the lock's human-readable fields. */
  iso(): string
  sleep(ms: number): Promise<void>
}

export const systemClock: Clock = {
  now: () => Date.now(),
  iso: () => new Date().toISOString(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}

export interface LockManagerOptions {
  readonly folder: Folder
  /** The folder's key (spec §4), which with the model's file name keys what is remembered. */
  readonly folderKey: string
  /** The model's file name, e.g. `Landscape.json`. */
  readonly model: string
  readonly displayName: string
  readonly appVersion: string
  readonly settings: Pick<SharedFolderSettings, 'settleMs' | 'staleAfterMs'>
  readonly observations: KeyedStore<LockObservation>
  readonly clock?: Clock
  readonly newToken?: () => string
}

/**
 * The lock as a reader sees it.
 *
 * `ours` is a lock carrying the last token this manager wrote: the one it holds,
 * or one it stopped trusting (fenced, or the settle re-read failed) that is
 * still in the folder. Acquire replaces it without asking, and release deletes
 * it (spec §5.1, §5.4).
 *
 * `held` with no `owner` is a lock file this version cannot read, which counts
 * as held (spec §5). `quietForMs` is how long this machine has seen its
 * heartbeat unchanged; `stale` is that against the stale time. A lock first seen
 * just now is quiet for 0 ms, so it cannot be stale until it has been watched
 * for the whole stale time, here or before a reload (spec §5.3).
 */
export type LockView =
  | { kind: 'free' }
  | { kind: 'ours' }
  | { kind: 'held'; owner?: LockRecord; stale: boolean; quietForMs: number }
  | { kind: 'read-failed'; message: string }

export type AcquireOutcome =
  | { kind: 'writer' }
  | { kind: 'reader'; why: 'held'; view: Extract<LockView, { kind: 'held' }> }
  /** Our lock did not survive the settle delay; `winner` is whose did, when it can be read. */
  | { kind: 'reader'; why: 'lost'; winner?: LockRecord }
  | { kind: 'reader'; why: 'read-failed' | 'write-failed'; message: string }

export type HeartbeatOutcome =
  | { kind: 'held' }
  /** The lock is someone else's now, or gone: we are a reader from here. */
  | { kind: 'lost'; by?: LockRecord }
  /** No heartbeat completed for half the stale time: we stopped trusting the lock (spec §5.2). */
  | { kind: 'fenced'; message: string }
  /** This heartbeat failed; the lock is still ours until fencing says otherwise. */
  | { kind: 'retry'; message: string }
  | { kind: 'not-holding' }

export class LockManager {
  readonly #options: LockManagerOptions
  readonly #clock: Clock
  readonly #newToken: () => string
  readonly #lockName: string
  readonly #key: ModelKey
  /** Our token, while we trust that we hold the lock. */
  #token: string | undefined
  /**
   * The last token we wrote. It outlives trust: fencing and a lost settle stop
   * trusting the lock without knowing whether the file still carries our
   * token, and while it does, the lock is still ours to delete or replace.
   * Forgetting it orphaned our own lock, so colleagues waited out the stale
   * time, and so did we (#161 review).
   */
  #written: string | undefined
  #seq = 0
  #since = ''
  /** This machine's time when the last heartbeat (or the acquire) completed. */
  #lastBeat = 0

  constructor(options: LockManagerOptions) {
    this.#options = options
    this.#clock = options.clock ?? systemClock
    this.#newToken = options.newToken ?? (() => crypto.randomUUID())
    this.#lockName = lockFileName(options.model)
    this.#key = [options.folderKey, options.model]
  }

  /** Do we believe we hold the lock? Only `acquire` makes this true. */
  get holding(): boolean {
    return this.#token !== undefined
  }

  /** Look at the lock as a reader does, and remember how long its heartbeat has been quiet. */
  async look(): Promise<LockView> {
    const read = await readLock(this.#options.folder, this.#lockName)
    if (read.kind === 'read-failed') return read
    if (read.kind === 'free') {
      await this.#options.observations.delete(this.#key)
      return { kind: 'free' }
    }
    if (read.kind === 'unreadable') return { kind: 'held', stale: false, quietForMs: 0 }
    const { lock } = read
    if (lock.token === this.#written) return { kind: 'ours' }
    const now = this.#clock.now()
    const seen = await this.#options.observations.get(this.#key)
    let since = now
    if (seen && seen.token === lock.token && seen.heartbeatSeq === lock.heartbeatSeq) {
      since = seen.since
    } else {
      await this.#options.observations.set(this.#key, {
        token: lock.token,
        heartbeatSeq: lock.heartbeatSeq,
        since: now,
      })
    }
    const quietForMs = Math.max(0, now - since)
    return {
      kind: 'held',
      owner: lock,
      stale: quietForMs >= this.#options.settings.staleAfterMs,
      quietForMs,
    }
  }

  /**
   * Take the lock (spec §5.1): write ours, wait out the settle delay, and keep
   * it only if ours is still there. A lock someone else holds, stale or not, is
   * left alone unless `takeOver` says the user confirmed taking it.
   */
  async acquire({ takeOver = false } = {}): Promise<AcquireOutcome> {
    if (!takeOver) {
      const view = await this.look()
      if (view.kind === 'read-failed')
        return { kind: 'reader', why: 'read-failed', message: view.message }
      if (view.kind === 'held') return { kind: 'reader', why: 'held', view }
    }
    const token = this.#newToken()
    const at = this.#clock.iso()
    // Before the write: one that throws may still have landed.
    this.#written = token
    try {
      await this.#write(token, 0, at)
    } catch (error) {
      return { kind: 'reader', why: 'write-failed', message: failure(error) }
    }
    await this.#clock.sleep(this.#options.settings.settleMs)
    const after = await readLock(this.#options.folder, this.#lockName)
    if (after.kind === 'lock' && after.lock.token === token) {
      this.#token = token
      this.#seq = 0
      this.#since = at
      this.#lastBeat = this.#clock.now()
      return { kind: 'writer' }
    }
    // Anything else lost: another token, no file, a file we cannot read, a
    // failed read. Only a lock still carrying our token makes us the writer.
    this.#token = undefined
    return { kind: 'reader', why: 'lost', ...(after.kind === 'lock' ? { winner: after.lock } : {}) }
  }

  /**
   * Renew the lock (spec §5.2, step 1), or find out it is no longer ours.
   *
   * The fencing deadline is checked first, not only when an attempt fails. A
   * laptop that slept made no attempt at all: it would wake, read its own lock
   * before a colleague's takeover had synced, rewrite it, and save over the
   * model as a second writer.
   */
  async heartbeat(): Promise<HeartbeatOutcome> {
    const token = this.#token
    if (token === undefined) return { kind: 'not-holding' }
    const overdue = this.#overdue()
    if (overdue) {
      // Stop trusting the lock. The file may still carry our token, so `#written` stays.
      this.#token = undefined
      return { kind: 'fenced', message: overdue }
    }
    const read = await readLock(this.#options.folder, this.#lockName)
    // A failed attempt is retried; the deadline above is what fences.
    if (read.kind === 'read-failed') return { kind: 'retry', message: read.message }
    if (read.kind !== 'lock' || read.lock.token !== token) {
      this.#token = undefined
      return { kind: 'lost', ...(read.kind === 'lock' ? { by: read.lock } : {}) }
    }
    try {
      await this.#write(token, this.#seq + 1, this.#since)
    } catch (error) {
      return { kind: 'retry', message: failure(error) }
    }
    this.#seq += 1
    this.#lastBeat = this.#clock.now()
    return { kind: 'held' }
  }

  /**
   * Is the lock in the folder still ours? The save guard's first check (spec
   * §6.1). A lock found to be someone else's is dropped here too.
   */
  async confirm(): Promise<'ours' | 'not-ours' | { failed: string }> {
    const token = this.#token
    if (token === undefined) return 'not-ours'
    // Past the fencing deadline, a save must not trust the lock either.
    if (this.#overdue()) {
      this.#token = undefined
      return 'not-ours'
    }
    const read = await readLock(this.#options.folder, this.#lockName)
    if (read.kind === 'read-failed') return { failed: read.message }
    if (read.kind === 'lock' && read.lock.token === token) return 'ours'
    this.#token = undefined
    return 'not-ours'
  }

  /**
   * Give the lock back (spec §5.4): delete the file only if it still carries
   * our token. There is no compare-and-delete, so a takeover landing between the
   * read and the delete is not caught; it would show up as a lost lock there.
   *
   * "Our token" is the last one written, trusted or not, so a fenced writer can
   * still clean up after itself. A release that fails keeps it, so a retry can.
   */
  async release(): Promise<'released' | 'not-ours' | 'failed'> {
    this.#token = undefined
    const token = this.#written
    if (token === undefined) return 'not-ours'
    const read = await readLock(this.#options.folder, this.#lockName)
    if (read.kind === 'read-failed') return 'failed'
    if (read.kind !== 'lock' || read.lock.token !== token) {
      this.#written = undefined
      return 'not-ours'
    }
    try {
      await this.#options.folder.remove(this.#lockName)
    } catch {
      return 'failed'
    }
    this.#written = undefined
    return 'released'
  }

  /**
   * Delete whatever lock is there, at the user's explicit request (spec §5.3,
   * **Unlock**). Returns the lock it removed, for the audit log.
   */
  async unlock(): Promise<{ removed?: LockRecord } | { failed: string }> {
    const read = await readLock(this.#options.folder, this.#lockName)
    if (read.kind === 'read-failed') return { failed: read.message }
    try {
      await this.#options.folder.remove(this.#lockName)
    } catch (error) {
      return { failed: failure(error) }
    }
    await this.#options.observations.delete(this.#key)
    return read.kind === 'lock' ? { removed: read.lock } : {}
  }

  /**
   * Why we may no longer trust the lock, when no heartbeat has completed for
   * half the stale time (spec §5.2): others start judging it stale at the full
   * time, so we stop believing it first.
   */
  #overdue(): string | undefined {
    const quiet = this.#clock.now() - this.#lastBeat
    if (quiet < this.#options.settings.staleAfterMs / 2) return undefined
    return `No heartbeat completed for ${Math.floor(quiet / 60_000)} min.`
  }

  #write(token: string, heartbeatSeq: number, since: string): Promise<void> {
    return this.#options.folder.write(
      this.#lockName,
      serialiseLock({
        appVersion: this.#options.appVersion,
        displayName: this.#options.displayName,
        heartbeatAt: this.#clock.iso(),
        heartbeatSeq,
        schemaVersion: LOCK_SCHEMA_VERSION,
        since,
        token,
      }),
    )
  }
}
