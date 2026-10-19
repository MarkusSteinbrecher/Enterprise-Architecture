import { sortKeys } from '../canonical-json'
import { isLogFileName, logFileName } from './file-names'
import { decodeText, encodeText, type Folder } from './folder'

/**
 * Takeovers, unlocks and overwrites leave a line in the folder (spec §5.5).
 *
 * Each browser profile writes its own file, `.archipelago-log-<clientId>.jsonl`.
 * Appending through the File System Access API rewrites the whole file, so one
 * log written from several machines would itself turn into conflict copies; a
 * file per client has one writer. Reading the history means reading them all.
 *
 * One writer per file is a profile, not a tab: two tabs of one profile share a
 * client id, so they share a log, and two appends that each read the file
 * before either wrote it would keep one line (#165). Every change to a log is
 * therefore made under one Web Lock, `AUDIT_LOCK`, which every tab and worker
 * of this origin in this profile shares, and no other profile sees. Profiles
 * have their own client ids, so their logs never meet.
 */
export interface AuditEntry {
  readonly action: 'takeover' | 'unlock' | 'overwrite'
  /** This machine's clock, ISO 8601. */
  readonly at: string
  readonly displayName: string
  readonly model: string
  /** Whose lock it was, when known: the display name it carried. */
  readonly previousOwner?: string
}

/** The Web Lock under which this profile reads and rewrites its logs. */
export const AUDIT_LOCK = 'archipelago.audit-log'

/** Add one line, canonical JSON, to this client's log. Throws when the log cannot be written. */
export function appendAudit(folder: Folder, clientId: string, entry: AuditEntry): Promise<void> {
  return exclusively(async () => {
    const name = logFileName(clientId)
    const existing = await folder.read(name)
    const before = existing ? decodeText(existing) : ''
    const separator = before === '' || before.endsWith('\n') ? '' : '\n'
    await folder.write(name, encodeText(`${before}${separator}${line(entry)}\n`))
  })
}

/**
 * Take back the line `appendAudit` wrote for `entry`, for an action logged
 * before it was attempted that then did not happen. Only the last line that is
 * exactly this entry goes; a log that no longer holds it is left as it is.
 * Throws when the log cannot be read or rewritten.
 */
export function retractAudit(folder: Folder, clientId: string, entry: AuditEntry): Promise<void> {
  return exclusively(async () => {
    const name = logFileName(clientId)
    const existing = await folder.read(name)
    const lines = existing ? decodeText(existing).split('\n') : []
    const at = lines.lastIndexOf(line(entry))
    // No log, or not this line: nothing says more than happened.
    if (at === -1) return
    lines.splice(at, 1)
    await folder.write(name, encodeText(lines.join('\n')))
  })
}

function line(entry: AuditEntry): string {
  return JSON.stringify(entry, sortKeys)
}

/** The fallback's queue: this tab's changes to a log, one after another. */
let queue: Promise<unknown> = Promise.resolve()

/**
 * Run `work` while no other change to a log runs in this profile.
 *
 * Every browser that hands out folders (Chromium) has Web Locks. Without them
 * (a test runner, a browser without the API) the changes made in this tab
 * still run one at a time, and two tabs are not kept apart: the line lost then
 * is the one #165 found, no worse than before.
 */
function exclusively<T>(work: () => Promise<T>): Promise<T> {
  // Typed as always there; jsdom, and a browser without the API, leave it out.
  const locks: Navigator['locks'] | undefined = navigator.locks
  if (locks) return locks.request(AUDIT_LOCK, work)
  const run = queue.then(work)
  queue = run.catch(() => undefined)
  return run
}

/**
 * Every client's lines, oldest first, and the logs that could not be read. A
 * line that is not an entry is skipped, not fatal.
 */
export async function readAudit(
  folder: Folder,
): Promise<{ entries: AuditEntry[]; unreadable: string[] }> {
  const entries: AuditEntry[] = []
  const unreadable: string[] = []
  for (const name of (await folder.list()).filter(isLogFileName)) {
    let bytes: Uint8Array | undefined
    try {
      bytes = await folder.read(name)
    } catch {
      unreadable.push(name)
      continue
    }
    if (!bytes) continue
    for (const line of decodeText(bytes).split('\n')) {
      if (line.trim() === '') continue
      try {
        const value: unknown = JSON.parse(line)
        if (isAuditEntry(value)) entries.push(value)
      } catch {
        // A torn line from an interrupted sync; the rest still reads.
      }
    }
  }
  entries.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0))
  return { entries, unreadable }
}

function isAuditEntry(value: unknown): value is AuditEntry {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    (v.action === 'takeover' || v.action === 'unlock' || v.action === 'overwrite') &&
    typeof v.at === 'string' &&
    typeof v.displayName === 'string' &&
    typeof v.model === 'string' &&
    (v.previousOwner === undefined || typeof v.previousOwner === 'string')
  )
}
