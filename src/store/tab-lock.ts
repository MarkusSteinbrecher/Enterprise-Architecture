/**
 * Second-tab safety (concept §5.2).
 *
 * Two tabs autosaving the same workspace into IndexedDB would interleave writes
 * and lose edits silently. One tab holds an exclusive Web Lock and is the writer;
 * every other tab is a reader and must not autosave. A reader can ask for the
 * lock over a BroadcastChannel — the writer steps down, and the requester picks
 * the lock up.
 *
 * The UI for the losing tab (the takeover screen) is issue #11; this module only
 * detects the situation and exposes it.
 *
 * Where Web Locks are unavailable (older Safari) every tab reports itself the
 * writer. That is the pre-existing behaviour rather than a new hazard, and the
 * save-state indicator is what protects the user either way.
 */

export type TabRole = 'writer' | 'reader'

export interface TabLockOptions {
  lockName?: string
  channelName?: string
  onRoleChange?: (role: TabRole) => void
}

interface TakeoverMessage {
  type: 'request-takeover'
  from: string
}

const DEFAULT_LOCK = 'archipelago.writer'
const DEFAULT_CHANNEL = 'archipelago.tabs'

function supportsWebLocks(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.locks?.request === 'function'
}

export class TabLock {
  #lockName: string
  #channel: BroadcastChannel | undefined
  #role: TabRole = 'reader'
  #release: (() => void) | undefined
  #onRoleChange: ((role: TabRole) => void) | undefined
  #id = Math.random().toString(36).slice(2)
  #stopped = false

  constructor(options: TabLockOptions = {}) {
    this.#lockName = options.lockName ?? DEFAULT_LOCK
    this.#onRoleChange = options.onRoleChange
    if (typeof BroadcastChannel === 'function') {
      this.#channel = new BroadcastChannel(options.channelName ?? DEFAULT_CHANNEL)
      this.#channel.onmessage = (event: MessageEvent<TakeoverMessage>) => {
        if (event.data?.type === 'request-takeover' && event.data.from !== this.#id) {
          this.#stepDown()
        }
      }
    }
  }

  get role(): TabRole {
    return this.#role
  }

  get isWriter(): boolean {
    return this.#role === 'writer'
  }

  /** Try to become the writer. Resolves with the role this tab ended up with. */
  async acquire(): Promise<TabRole> {
    if (this.#stopped) return this.#role
    if (this.#role === 'writer') return 'writer'
    if (!supportsWebLocks()) {
      this.#setRole('writer')
      return this.#role
    }

    // The callback passed to `request` must keep running for as long as the lock
    // is held, so the role is resolved from inside it rather than from the
    // request promise — awaiting that would block until the lock is released.
    // `ifAvailable` answers immediately instead of queueing behind the holder,
    // so a second tab can render its takeover state rather than hanging.
    return new Promise<TabRole>((resolveRole) => {
      let settled = false
      const settle = (role: TabRole) => {
        if (settled) return
        settled = true
        this.#setRole(role)
        resolveRole(role)
      }

      navigator.locks
        .request(this.#lockName, { ifAvailable: true }, (lock) => {
          if (!lock) {
            settle('reader')
            return
          }
          settle('writer')
          return new Promise<void>((release) => {
            this.#release = release
          })
        })
        .catch(() => settle('reader'))
    })
  }

  /**
   * Ask whoever holds the lock to release it, then take it.
   * Backs the "take over here" action on the second-tab screen.
   */
  async takeOver(attempts = 20, intervalMs = 50): Promise<TabRole> {
    this.#channel?.postMessage({
      type: 'request-takeover',
      from: this.#id,
    } satisfies TakeoverMessage)
    for (let i = 0; i < attempts; i += 1) {
      const role = await this.acquire()
      if (role === 'writer') return role
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }
    return this.#role
  }

  /** Give up the lock and stop listening. Call on unload. */
  stop(): void {
    this.#stopped = true
    this.#stepDown()
    this.#channel?.close()
    this.#channel = undefined
  }

  #stepDown(): void {
    if (this.#release) {
      const release = this.#release
      this.#release = undefined
      release()
    }
    if (this.#role !== 'reader') this.#setRole('reader')
  }

  #setRole(role: TabRole): void {
    if (this.#role === role) return
    this.#role = role
    this.#onRoleChange?.(role)
  }
}
