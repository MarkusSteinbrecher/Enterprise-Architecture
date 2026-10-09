/**
 * The shared-folder preferences (spec §10), and the guard every value passes on
 * its way in. A form field arrives as a string, and `Number('')` is `0`: a
 * cleared "heartbeat" field must mean the default, never a heartbeat every 0 ms.
 */
export interface SharedFolderSettings {
  /** What colleagues see on the lock. Asked on first Open folder (#147). */
  readonly displayName: string
  /** How long a new lock must survive before we count as its writer. */
  readonly settleMs: number
  /** How often a writer renews its lock and checks the model file. */
  readonly heartbeatMs: number
  /** How long a lock must sit unchanged, by this machine's watch, to count as abandoned. */
  readonly staleAfterMs: number
  /** How often a reader looks at the lock and the model file. */
  readonly pollMs: number
}

/** The sponsor's defaults (#147): settle 10 s, heartbeat 60 s, stale 30 min. */
export const DEFAULT_SETTINGS: SharedFolderSettings = {
  displayName: '',
  settleMs: 10_000,
  heartbeatMs: 60_000,
  staleAfterMs: 30 * 60_000,
  pollMs: 15_000,
}

/** Long enough for a sentence like "Locked by …", short enough for a file name. */
export const MAX_DISPLAY_NAME = 60

export type SettingsResult =
  { ok: true; settings: SharedFolderSettings } | { ok: false; message: string }

/**
 * Settings from untrusted input: a stored record or a form. A timing that is
 * absent, empty, not a whole number or not positive takes its default. A stale
 * time under four heartbeats is refused rather than corrected: a writer fences
 * itself off at half the stale time (spec §5.2), and that must leave room for at
 * least one missed heartbeat.
 */
export function readSettings(input: unknown): SettingsResult {
  const raw = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {}
  const settings: SharedFolderSettings = {
    displayName: displayName(raw.displayName),
    settleMs: duration(raw.settleMs, DEFAULT_SETTINGS.settleMs),
    heartbeatMs: duration(raw.heartbeatMs, DEFAULT_SETTINGS.heartbeatMs),
    staleAfterMs: duration(raw.staleAfterMs, DEFAULT_SETTINGS.staleAfterMs),
    pollMs: duration(raw.pollMs, DEFAULT_SETTINGS.pollMs),
  }
  if (settings.staleAfterMs < 4 * settings.heartbeatMs) {
    return {
      ok: false,
      message: `The stale time must be at least four heartbeats (${4 * settings.heartbeatMs} ms), so a writer that misses one heartbeat still holds its lock.`,
    }
  }
  return { ok: true, settings }
}

function displayName(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, MAX_DISPLAY_NAME) : ''
}

function duration(value: unknown, fallback: number): number {
  const number =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^\s*\d+\s*$/.test(value)
        ? Number(value)
        : Number.NaN
  return Number.isSafeInteger(number) && number > 0 ? number : fallback
}
