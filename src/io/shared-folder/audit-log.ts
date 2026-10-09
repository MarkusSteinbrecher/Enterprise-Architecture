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

/** Add one line, canonical JSON, to this client's log. Throws when the log cannot be written. */
export async function appendAudit(
  folder: Folder,
  clientId: string,
  entry: AuditEntry,
): Promise<void> {
  const name = logFileName(clientId)
  const existing = await folder.read(name)
  const before = existing ? decodeText(existing) : ''
  const separator = before === '' || before.endsWith('\n') ? '' : '\n'
  await folder.write(name, encodeText(`${before}${separator}${JSON.stringify(entry, sortKeys)}\n`))
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
