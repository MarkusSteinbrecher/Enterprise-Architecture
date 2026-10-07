/**
 * What the shared-folder protocol remembers between visits on one machine
 * (spec §5.3, §7, §8): how long it has watched each lock, which possible
 * conflict copies the user dismissed. The browser keeps it in IndexedDB; tests
 * and a first visit use `memoryStore`.
 *
 * Keyed by folder and file name together. Two libraries may both be called
 * `Architecture`, so the folder is a key assigned when it was first opened, not
 * its name, and the pair is kept as a pair: a file name may contain any
 * separator a joined key would use (CLAUDE.md).
 */
export type ModelKey = readonly [folderKey: string, fileName: string]

export interface KeyedStore<T> {
  get(key: ModelKey): Promise<T | undefined>
  set(key: ModelKey, value: T): Promise<void>
  delete(key: ModelKey): Promise<void>
}

/** A lock as this machine has watched it: since when its heartbeat has sat at this value. */
export interface LockObservation {
  readonly token: string
  readonly heartbeatSeq: number
  /** This machine's clock when it first saw the lock at this token and counter. */
  readonly since: number
}

export function memoryStore<T>(): KeyedStore<T> {
  // JSON of the pair is unambiguous whatever the names hold.
  const entries = new Map<string, T>()
  const id = (key: ModelKey) => JSON.stringify(key)
  return {
    get: async (key) => entries.get(id(key)),
    set: async (key, value) => void entries.set(id(key), value),
    delete: async (key) => void entries.delete(id(key)),
  }
}
