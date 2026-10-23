import { CHECK_IDS, type CheckId } from '@/model'

/**
 * Which of Archi's checks a viewer has switched off (#193), as on Archi's
 * Validator preference page. A per-user preference, as Archi keeps it, not
 * model data: it lives in localStorage, and every check is on wherever storage
 * is blocked, as Archi's `PreferenceInitializer` sets them all.
 */

export const CHECKS_STORAGE_KEY = 'archipelago.validator-checks'

/**
 * The checks that are on. Each is read on its own: a check the stored object
 * does not mention (one added later, a hand edit), or mentions with anything
 * but `false`, is on.
 */
export function readEnabledChecks(): Set<CheckId> {
  let raw: unknown
  try {
    raw = JSON.parse(localStorage.getItem(CHECKS_STORAGE_KEY) ?? 'null')
  } catch {
    // Blocked storage (private mode, site-data policies) or unreadable JSON: all on.
    return new Set(CHECK_IDS)
  }
  // `null` has no keys to read; a number, string or array has none of these, so each is all on.
  const stored = (raw ?? {}) as Record<string, unknown>
  return new Set(CHECK_IDS.filter((id) => stored[id] !== false))
}

export function writeEnabledChecks(enabled: ReadonlySet<CheckId>): void {
  try {
    localStorage.setItem(
      CHECKS_STORAGE_KEY,
      JSON.stringify(Object.fromEntries(CHECK_IDS.map((id) => [id, enabled.has(id)]))),
    )
  } catch {
    // The choice still applies to this visit; it just will not be remembered.
  }
}
