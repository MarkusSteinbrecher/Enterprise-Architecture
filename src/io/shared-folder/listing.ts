import { conflictCopyKind, isModelFileName } from './file-names'
import type { Folder } from './folder'

/**
 * What a shared folder holds, by name only (spec §4). No file is read: with
 * OneDrive's Files On-Demand, reading a file downloads it, and opening a folder
 * must not download the whole library. A model is validated when it is opened.
 *
 * Possible conflict copies are listed apart from the models, under the model
 * they may be a copy of. The spec drops them from the list; they are kept here
 * instead, because a name cannot tell a copy from a file a person named that
 * way on purpose (`Landscape-v2.json`), and a model hidden from the list is a
 * model nobody opens.
 */
export interface FolderListing {
  /** The `.json` files that are not a possible copy of another, sorted. */
  readonly models: string[]
  /** Files that may be the sync client's copy of `of`. */
  readonly conflictCopies: { name: string; of: string }[]
}

export async function listFolder(folder: Folder): Promise<FolderListing> {
  // Locks (`.json.lock`) and logs (`.jsonl`) are not `.json`, so this leaves them out.
  const json = (await folder.list()).filter(isModelFileName).sort()
  const models: string[] = []
  const conflictCopies: { name: string; of: string }[] = []
  for (const name of json) {
    const of = json.find((other) => other !== name && conflictCopyKind(other, name) === 'model')
    if (of) conflictCopies.push({ name, of })
    else models.push(name)
  }
  return { models, conflictCopies }
}
