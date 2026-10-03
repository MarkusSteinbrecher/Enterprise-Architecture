import { findElementType } from './element-types'
import { folderRoot } from './validate-views'
import { defaultFolderRoot, type Folder, type FolderRoot } from './workspace'

/**
 * Where things may be filed (#80). Archi keeps each kind of object in its own
 * top-level group, and so does the model tree: an element goes under its layer's
 * group, a relationship under Relations, a view under Views, and a folder stays in
 * the group it was made in. The validator warns about a file that breaks this
 * (`folder.wrong-group`); these rules keep the store from producing one.
 */

/** Something the tree can file: one of the model's objects, or a folder. */
export type FileableKind = 'element' | 'relationship' | 'view' | 'folder'

/** A place to file something: inside a folder, or directly in a top-level group. */
export type FolderDestination = { folder: string } | { root: FolderRoot }

/** The group an element of this type belongs under; `other` for an unknown type. */
export function elementFolderRoot(type: string): FolderRoot {
  const meta = findElementType(type)
  return meta ? defaultFolderRoot(meta.layer) : 'other'
}

/** The group a destination sits in, or `undefined` when its folder chain is broken. */
export function destinationRoot(
  destination: FolderDestination,
  foldersById: Map<string, Folder>,
): FolderRoot | undefined {
  return 'root' in destination ? destination.root : folderRoot(destination.folder, foldersById)
}

/**
 * Is `folderId` the folder `ancestorId` or somewhere inside it? A folder moved
 * into its own subtree would leave the whole branch attached to nothing.
 */
export function isWithinFolder(
  folderId: string,
  ancestorId: string,
  foldersById: Map<string, Folder>,
): boolean {
  const seen = new Set<string>()
  let current: string | undefined = folderId
  while (current !== undefined && !seen.has(current)) {
    if (current === ancestorId) return true
    seen.add(current)
    current = foldersById.get(current)?.parent
  }
  return false
}
