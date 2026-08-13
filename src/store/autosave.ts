import type { ModelStore } from './model-store'
import { saveSnapshot } from './persistence'

/**
 * Debounced autosave from a live store into IndexedDB.
 *
 * Two things keep this off the critical path: the debounce collapses a burst of
 * edits into one write, and the snapshot is taken in an idle callback so a large
 * workspace does not serialise in the middle of a keystroke. A save already in
 * flight is never interrupted — the next change just schedules another one.
 *
 * A tab that does not hold the writer lock must not autosave; `enabled` is how
 * `TabLock` switches it off.
 */

export interface AutosaveOptions {
  /** Quiet period before a write, in ms. */
  debounceMs?: number
  onSaved?: (at: number) => void
  onError?: (error: unknown) => void
}

const DEFAULT_DEBOUNCE_MS = 800

type IdleHandle = number | ReturnType<typeof setTimeout>

function scheduleIdle(work: () => void): IdleHandle {
  if (typeof requestIdleCallback === 'function') {
    return requestIdleCallback(work, { timeout: 2_000 })
  }
  return setTimeout(work, 0)
}

function cancelIdle(handle: IdleHandle | undefined): void {
  if (handle === undefined) return
  if (typeof cancelIdleCallback === 'function' && typeof handle === 'number') {
    cancelIdleCallback(handle)
    return
  }
  clearTimeout(handle as ReturnType<typeof setTimeout>)
}

export class Autosaver {
  #store: ModelStore
  #options: Required<Pick<AutosaveOptions, 'debounceMs'>> & AutosaveOptions
  #unsubscribe: (() => void) | undefined
  #timer: ReturnType<typeof setTimeout> | undefined
  #idle: IdleHandle | undefined
  #inFlight: Promise<void> | undefined
  #pending = false
  #enabled = true
  #suspended = false

  constructor(store: ModelStore, options: AutosaveOptions = {}) {
    this.#store = store
    this.#options = { debounceMs: DEFAULT_DEBOUNCE_MS, ...options }
  }

  start(): void {
    this.#unsubscribe ??= this.#store.subscribe(() => this.schedule())
  }

  stop(): void {
    this.#unsubscribe?.()
    this.#unsubscribe = undefined
    clearTimeout(this.#timer)
    this.#timer = undefined
    cancelIdle(this.#idle)
    this.#idle = undefined
  }

  /** A reader tab keeps its store in sync but must never write. */
  setEnabled(enabled: boolean): void {
    this.#enabled = enabled
    if (!enabled) {
      clearTimeout(this.#timer)
      this.#timer = undefined
    }
  }

  get enabled(): boolean {
    return this.#enabled
  }

  get suspended(): boolean {
    return this.#suspended
  }

  /**
   * Stop writing, and settle what is already in the air.
   *
   * A caller that is about to make the current workspace invalid — deleting it,
   * or swapping the store's model for another one — has to close a window it
   * cannot otherwise see: the debounce is armed against a workspace that is
   * about to stop existing, and `window.confirm` alone blocks the main thread for
   * longer than the 800ms quiet period, so by the time the user clicks OK the
   * timer is already due. It then fires into the first `await` of the delete and
   * writes the record straight back.
   *
   * So: drop pending work rather than deferring it, and await any write already
   * in flight, so the caller resumes with nothing left that could resurrect the
   * workspace it just removed.
   */
  async suspend(): Promise<void> {
    this.#suspended = true
    clearTimeout(this.#timer)
    this.#timer = undefined
    cancelIdle(this.#idle)
    this.#idle = undefined
    this.#pending = false
    await this.#inFlight
  }

  /** Resume writing. The next change schedules a save as usual. */
  resume(): void {
    this.#suspended = false
  }

  schedule(): void {
    if (!this.#enabled || this.#suspended) return
    clearTimeout(this.#timer)
    this.#timer = setTimeout(() => {
      this.#idle = scheduleIdle(() => void this.flush())
    }, this.#options.debounceMs)
  }

  /** Write now, skipping the debounce. Used before unload and on demand. */
  async flush(): Promise<void> {
    if (!this.#enabled || this.#suspended) return
    if (this.#inFlight) {
      this.#pending = true
      return
    }
    const write = this.#write()
    this.#inFlight = write
    try {
      await write
    } finally {
      this.#inFlight = undefined
      if (this.#pending) {
        this.#pending = false
        this.schedule()
      }
    }
  }

  async #write(): Promise<void> {
    try {
      const at = Date.now()
      await saveSnapshot(this.#store.snapshot(), at)
      this.#options.onSaved?.(at)
    } catch (error) {
      this.#options.onError?.(error)
    }
  }
}
