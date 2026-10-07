import type { Folder } from './folder'

/**
 * The names the shared-folder protocol reads and writes (spec §5, §5.5, §6.2,
 * §8.1). Every name built here from a user-authored string is cleaned for the
 * file systems a synced folder lands on; every name matched here is matched as
 * a string, never as a pattern built from a file name, since a name may hold any
 * character a pattern treats as special.
 */

const MODEL_EXTENSION = '.json'
const LOCK_EXTENSION = '.lock'
const LOG_PREFIX = '.archipelago-log-'
const LOG_EXTENSION = '.jsonl'

export function isModelFileName(name: string): boolean {
  return name.toLowerCase().endsWith(MODEL_EXTENSION) && name.length > MODEL_EXTENSION.length
}

/** `Landscape.json` → `Landscape`. */
export function stemOf(model: string): string {
  return isModelFileName(model) ? model.slice(0, -MODEL_EXTENSION.length) : model
}

/** `Landscape.json` → `Landscape.json.lock`. Not `~$…`: OneDrive does not sync those. */
export function lockFileName(model: string): string {
  return `${model}${LOCK_EXTENSION}`
}

export function isLockFileName(name: string): boolean {
  return name.toLowerCase().endsWith(`${MODEL_EXTENSION}${LOCK_EXTENSION}`)
}

/** One audit log per browser profile (spec §5.5): a shared one would itself make conflict copies. */
export function logFileName(clientId: string): string {
  return `${LOG_PREFIX}${clientId}${LOG_EXTENSION}`
}

export function isLogFileName(name: string): boolean {
  return name.startsWith(LOG_PREFIX) && name.endsWith(LOG_EXTENSION)
}

/** Characters Windows or SharePoint reject in a file name, and the control characters. */
// eslint-disable-next-line no-control-regex
const FORBIDDEN = /["*:<>?/\\|\u0000-\u001f\u007f]/g

/**
 * A display name made safe to put in a file name: each forbidden character
 * becomes `_`, leading and trailing spaces and dots go (Windows drops them, and
 * a name that ends in a dot cannot be created), and so does a leading `~$`,
 * which OneDrive does not sync. Nothing left is `user`.
 */
export function fileSafeName(displayName: string): string {
  let name = displayName.replace(FORBIDDEN, '_')
  for (;;) {
    const trimmed = name.replace(/^[\s.]+|[\s.]+$/g, '')
    const unprefixed = trimmed.startsWith('~$') ? trimmed.slice(2) : trimmed
    if (unprefixed === name) break
    name = unprefixed
  }
  return name === '' ? 'user' : name
}

/** `yyyy-MM-dd HHmm` in local time. */
function stamp(date: Date): string {
  const two = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())} ${two(date.getHours())}${two(date.getMinutes())}`
}

/** `Landscape (copy Markus 2026-10-07 0827).json`, or with ` 2`, ` 3`… before the `)`. */
export function copyFileName(model: string, displayName: string, at: Date, attempt = 1): string {
  const suffix = attempt > 1 ? ` ${attempt}` : ''
  return `${stemOf(model)} (copy ${fileSafeName(displayName)} ${stamp(at)}${suffix})${MODEL_EXTENSION}`
}

/**
 * A copy name nothing in the folder has yet. Checked without reading any file.
 * The API has no exclusive create, so a name that appears between this check and
 * the write is not caught (spec §6.2, accepted).
 */
export async function freeCopyFileName(
  folder: Folder,
  model: string,
  displayName: string,
  at: Date,
): Promise<string> {
  for (let attempt = 1; ; attempt += 1) {
    const name = copyFileName(model, displayName, at, attempt)
    if (!(await folder.has(name))) return name
  }
}

/** Is `name` a copy this app wrote? Those are never reported as conflict copies. */
export function isAppCopyFileName(name: string): boolean {
  return / \(copy .+ \d{4}-\d{2}-\d{2} \d{4}(?: \d+)?\)\.json$/i.test(name)
}

/**
 * Is `candidate` possibly the sync client's conflict copy of `model`, or of its
 * lock? OneDrive keeps one version under the name and renames the other with a
 * hyphen and the machine's name: `Landscape-DESKTOP7.json`, and for the lock
 * `Landscape.json-DESKTOP7.lock`. A name cannot tell that from a file someone
 * called `Landscape-v2.json` on purpose, so callers say *possible* (spec §8.1).
 */
export function conflictCopyKind(model: string, candidate: string): 'model' | 'lock' | undefined {
  if (candidate === model || isAppCopyFileName(candidate)) return undefined
  const stem = stemOf(model)
  const lower = candidate.toLowerCase()
  if (
    candidate.startsWith(`${stem}-`) &&
    lower.endsWith(MODEL_EXTENSION) &&
    candidate.length > stem.length + 1 + MODEL_EXTENSION.length
  ) {
    return 'model'
  }
  if (
    candidate.startsWith(`${model}-`) &&
    lower.endsWith(LOCK_EXTENSION) &&
    candidate.length > model.length + 1 + LOCK_EXTENSION.length
  ) {
    return 'lock'
  }
  return undefined
}
