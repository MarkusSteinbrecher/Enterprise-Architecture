import { sortKeys } from '../canonical-json'
import { decodeText, encodeText, failure, type Folder } from './folder'

/**
 * The lock file next to a model (spec §5): who holds `X.json` for editing.
 *
 * Ownership is the token alone. The same person may hold a lock from two
 * machines or two browser profiles, so a display name proves nothing. Staleness
 * is the heartbeat counter as this machine watches it (`lock-manager.ts`), never
 * `heartbeatAt`, which is another machine's clock and only shown to people.
 */
export interface LockRecord {
  readonly appVersion: string
  readonly displayName: string
  /** The writer's clock at its last heartbeat. Shown, never compared. */
  readonly heartbeatAt: string
  /** Raised by one on every heartbeat; what a watcher compares. */
  readonly heartbeatSeq: number
  readonly schemaVersion: typeof LOCK_SCHEMA_VERSION
  /** The writer's clock when it took the lock. Shown, never compared. */
  readonly since: string
  readonly token: string
}

export const LOCK_SCHEMA_VERSION = 1

/**
 * What reading a lock found.
 *
 * - `free`: no lock file.
 * - `lock`: a lock this version understands.
 * - `unreadable`: a file that is not such a lock: corrupt, half-synced, or from a
 *   newer version. It counts as **held by someone unknown**, never as free
 *   (spec §5): a guard fails closed on what it cannot read.
 * - `read-failed`: the read itself threw. That is no observation at all, and
 *   each step of the protocol says what it does with one.
 */
export type LockRead =
  | { kind: 'free' }
  | { kind: 'lock'; lock: LockRecord }
  | { kind: 'unreadable' }
  | { kind: 'read-failed'; message: string }

export async function readLock(folder: Folder, name: string): Promise<LockRead> {
  let bytes: Uint8Array | undefined
  try {
    bytes = await folder.read(name)
  } catch (error) {
    return { kind: 'read-failed', message: failure(error) }
  }
  if (bytes === undefined) return { kind: 'free' }
  const lock = parseLock(bytes)
  return lock ? { kind: 'lock', lock } : { kind: 'unreadable' }
}

/** The lock in `bytes`, or `undefined` when they are not a lock this version can trust. */
export function parseLock(bytes: Uint8Array): LockRecord | undefined {
  let value: unknown
  try {
    value = JSON.parse(decodeText(bytes))
  } catch {
    return undefined
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const raw = value as Record<string, unknown>
  if (raw.schemaVersion !== LOCK_SCHEMA_VERSION) return undefined
  const { appVersion, displayName, heartbeatAt, heartbeatSeq, since, token } = raw
  if (typeof token !== 'string' || token === '') return undefined
  if (typeof heartbeatSeq !== 'number' || !Number.isSafeInteger(heartbeatSeq) || heartbeatSeq < 0) {
    return undefined
  }
  if (
    typeof appVersion !== 'string' ||
    typeof displayName !== 'string' ||
    typeof heartbeatAt !== 'string' ||
    typeof since !== 'string'
  ) {
    return undefined
  }
  return {
    appVersion,
    displayName,
    heartbeatAt,
    heartbeatSeq,
    schemaVersion: LOCK_SCHEMA_VERSION,
    since,
    token,
  }
}

/** Canonical JSON (ADR 0004): sorted keys, two-space indent, one trailing newline. */
export function serialiseLock(lock: LockRecord): Uint8Array {
  return encodeText(`${JSON.stringify(lock, sortKeys, 2)}\n`)
}
