import { conflictCopyKind } from './file-names'
import type { Folder } from './folder'

/**
 * Possible conflict copies of one model (spec §8.1): what the sync client
 * makes when two versions of a file meet. They appear minutes after the fact,
 * when sync catches up, so this runs on every heartbeat and every reader poll,
 * not only when the model is opened. No modification time is consulted: sync
 * clients rewrite them, and a copy of our own save carries our save's time.
 */
export interface ConflictCopy {
  readonly name: string
  /** A copy of the model itself, or of its lock. */
  readonly kind: 'model' | 'lock'
}

export async function scanConflictCopies(
  folder: Folder,
  model: string,
  dismissed: ReadonlySet<string> = new Set(),
): Promise<ConflictCopy[]> {
  const names = await folder.list()
  return names
    .filter((name) => !dismissed.has(name))
    .flatMap((name): ConflictCopy[] => {
      const kind = conflictCopyKind(model, name)
      return kind ? [{ name, kind }] : []
    })
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
}
