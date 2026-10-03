import {
  FOLDER_ROOTS,
  FOLDER_ROOT_LABELS,
  destinationRoot,
  elementFolderRoot,
  isWithinFolder,
  typeLabel,
  type Element,
  type FileableKind,
  type Folder,
  type FolderDestination,
  type FolderRoot,
  type Relationship,
  type View,
} from '@/model'
import { matchesQuery } from '@/ui/inventory/filters'

/**
 * The model tree's structure (#80), as pure functions over the model so the
 * component only draws rows. Archi's tree: nine fixed groups, user folders inside
 * them, and every element, relationship and view filed in a folder or directly in
 * its group.
 *
 * Placement never drops anything. A member whose folder is missing sits directly
 * in its own group; a folder whose parent is missing, or which is inside itself,
 * sits at the top of Other. The validator reports both; the tree's job is to keep
 * the object findable while it does.
 */

export type TreeItem =
  | { kind: 'root'; id: FolderRoot; name: string }
  | { kind: 'folder'; id: string; name: string; folder: Folder }
  | { kind: 'element'; id: string; name: string; element: Element }
  | { kind: 'relationship'; id: string; name: string; relationship: Relationship }
  | { kind: 'view'; id: string; name: string; view: View }

export type TreeItemKind = TreeItem['kind']

/**
 * The identity of a row. Ids are unique per kind, not across kinds, so the kind
 * is part of the key — as a JSON array, so no id, whatever it contains, can make
 * two different rows produce the same key.
 */
export function itemKey(kind: TreeItemKind, id: string): string {
  return JSON.stringify([kind, id])
}

export interface TreeInput {
  elements: readonly Element[]
  relationships: readonly Relationship[]
  views: readonly View[]
  folders: readonly Folder[]
  /** Element name by id, for a relationship row without a name of its own. */
  elementName: (id: string) => string | undefined
}

export interface TreeIndex {
  /** The nine fixed groups, in Archi's order. */
  roots: TreeItem[]
  byKey: Map<string, TreeItem>
  /** Children by parent key, folders first, then by name. */
  children: Map<string, TreeItem[]>
  /** Parent key by child key; absent for a root. */
  parent: Map<string, string>
  foldersById: Map<string, Folder>
}

const KIND_ORDER: Record<TreeItemKind, number> = {
  root: 0,
  folder: 1,
  element: 2,
  relationship: 3,
  view: 4,
}

/**
 * Folders first, then by name; kind and id break ties so the order is total and
 * the same on every machine. Display order only — never serialised — with the
 * locale pinned so it cannot vary by browser.
 */
function compareItems(a: TreeItem, b: TreeItem): number {
  const aFolder = a.kind === 'folder' ? 0 : 1
  const bFolder = b.kind === 'folder' ? 0 : 1
  if (aFolder !== bFolder) return aFolder - bFolder
  const byName = a.name.localeCompare(b.name, 'en')
  if (byName !== 0) return byName
  if (a.kind !== b.kind) return KIND_ORDER[a.kind] - KIND_ORDER[b.kind]
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

export function relationshipLabel(
  relationship: Relationship,
  elementName: (id: string) => string | undefined,
): string {
  if (relationship.name) return relationship.name
  const source = elementName(relationship.source) ?? relationship.source
  const target = elementName(relationship.target) ?? relationship.target
  return `${source} → ${target}`
}

export function buildTree(input: TreeInput): TreeIndex {
  const foldersById = new Map(input.folders.map((folder) => [folder.id, folder]))
  const byKey = new Map<string, TreeItem>()
  const children = new Map<string, TreeItem[]>()
  const parent = new Map<string, string>()

  const roots: TreeItem[] = FOLDER_ROOTS.map((root) => ({
    kind: 'root',
    id: root,
    name: FOLDER_ROOT_LABELS[root],
  }))
  for (const root of roots) byKey.set(itemKey('root', root.id), root)

  const place = (item: TreeItem, parentKey: string): void => {
    const key = itemKey(item.kind, item.id)
    byKey.set(key, item)
    parent.set(key, parentKey)
    const siblings = children.get(parentKey)
    if (siblings) siblings.push(item)
    else children.set(parentKey, [item])
  }

  for (const folder of input.folders) {
    place(
      { kind: 'folder', id: folder.id, name: folder.name, folder },
      folderParentKey(folder, foldersById),
    )
  }

  const memberParentKey = (folderId: string | undefined, fallback: FolderRoot): string =>
    folderId !== undefined && foldersById.has(folderId)
      ? itemKey('folder', folderId)
      : itemKey('root', fallback)

  for (const element of input.elements) {
    place(
      { kind: 'element', id: element.id, name: element.name, element },
      memberParentKey(element.folder, elementFolderRoot(element.type)),
    )
  }
  for (const relationship of input.relationships) {
    place(
      {
        kind: 'relationship',
        id: relationship.id,
        name: relationshipLabel(relationship, input.elementName),
        relationship,
      },
      memberParentKey(relationship.folder, 'relations'),
    )
  }
  for (const view of input.views) {
    place(
      { kind: 'view', id: view.id, name: view.name, view },
      memberParentKey(view.folder, 'views'),
    )
  }

  for (const list of children.values()) list.sort(compareItems)
  return { roots, byKey, children, parent, foldersById }
}

/**
 * A folder's place: its group if it names one (the validator's `folderRoot`
 * reads `root` first too), else its parent — unless the parent is missing or the
 * chain comes back round to this folder, which would leave it attached to
 * nothing. Only the folders on a cycle are lifted out; one hanging below a cycle
 * stays with its parent, which is itself now reachable.
 */
function folderParentKey(folder: Folder, foldersById: Map<string, Folder>): string {
  if (folder.root !== undefined) return itemKey('root', folder.root)
  if (folder.parent !== undefined && foldersById.has(folder.parent)) {
    if (!isWithinFolder(folder.parent, folder.id, foldersById)) {
      return itemKey('folder', folder.parent)
    }
  }
  return itemKey('root', 'other')
}

/** What the tree filter matches: the inventory's own rule for elements. */
function matchesItem(item: TreeItem, query: string): boolean {
  const needle = query.trim().toLowerCase()
  switch (item.kind) {
    case 'root':
      return false
    case 'element':
      return matchesQuery(item.element, query)
    case 'relationship':
      return `${item.name} ${item.relationship.type}`.toLowerCase().includes(needle)
    case 'view':
    case 'folder':
      return item.name.toLowerCase().includes(needle)
  }
}

export interface TreeRow {
  key: string
  item: TreeItem
  /** 1-based, as `aria-level` wants it. */
  level: number
  parentKey: string | undefined
  /** Has children to show (under the current filter). */
  expandable: boolean
  expanded: boolean
  /** 1-based position among the visible siblings, and their count. */
  posinset: number
  setsize: number
}

/**
 * The rows on screen, top to bottom.
 *
 * Without a query: the groups, and the children of every expanded row. With
 * one: every match, the folders it sits in (opened, so the match is visible),
 * and everything inside a matching folder — a folder found by name is found
 * with its contents. While a query is active, expansion follows the filter, not
 * the user's expanded set, so clearing the query brings their tree back.
 */
export function visibleRows(
  index: TreeIndex,
  expanded: ReadonlySet<string>,
  query: string,
): TreeRow[] {
  const filtering = query.trim().length > 0
  const shown = filtering ? filteredKeys(index, query) : undefined
  const rows: TreeRow[] = []

  const emit = (items: readonly TreeItem[], level: number, parentKey: string | undefined) => {
    const visible = shown ? items.filter((item) => shown.has(itemKey(item.kind, item.id))) : items
    visible.forEach((item, i) => {
      const key = itemKey(item.kind, item.id)
      const kids = index.children.get(key) ?? []
      const visibleKids = shown ? kids.filter((kid) => shown.has(itemKey(kid.kind, kid.id))) : kids
      const expandable = visibleKids.length > 0
      const open = expandable && (filtering || expanded.has(key))
      rows.push({
        key,
        item,
        level,
        parentKey,
        expandable,
        expanded: open,
        posinset: i + 1,
        setsize: visible.length,
      })
      if (open) emit(kids, level + 1, key)
    })
  }

  emit(index.roots, 1, undefined)
  return rows
}

/** Keys a filter shows: matches, their ancestors, and the contents of matching folders. */
function filteredKeys(index: TreeIndex, query: string): Set<string> {
  const shown = new Set<string>()
  const addSubtree = (key: string) => {
    shown.add(key)
    for (const kid of index.children.get(key) ?? []) addSubtree(itemKey(kid.kind, kid.id))
  }
  for (const [key, item] of index.byKey) {
    if (!matchesItem(item, query)) continue
    if (item.kind === 'folder') addSubtree(key)
    else shown.add(key)
    for (let up = index.parent.get(key); up !== undefined; up = index.parent.get(up)) {
      if (shown.has(up)) break
      shown.add(up)
    }
  }
  // A group is always shown when anything inside it is.
  for (const root of index.roots) {
    const key = itemKey('root', root.id)
    if ((index.children.get(key) ?? []).some((kid) => shown.has(itemKey(kid.kind, kid.id)))) {
      shown.add(key)
    }
  }
  return shown
}

/** Keys of the folders and group a row sits in, outermost first. */
export function ancestorKeys(index: TreeIndex, key: string): string[] {
  const keys: string[] = []
  for (let up = index.parent.get(key); up !== undefined; up = index.parent.get(up)) {
    keys.unshift(up)
  }
  return keys
}

/**
 * Where something lands when dropped on (or pasted into) a row: into a folder or
 * group, or — dropped on an element, relationship or view — beside it.
 */
export function destinationOf(index: TreeIndex, key: string): FolderDestination | undefined {
  const item = index.byKey.get(key)
  if (!item) return undefined
  if (item.kind === 'root') return { root: item.id }
  if (item.kind === 'folder') return { folder: item.id }
  const parentKey = index.parent.get(key)
  return parentKey === undefined ? undefined : destinationOf(index, parentKey)
}

export function isFileable(item: TreeItem): item is Exclude<TreeItem, { kind: 'root' }> {
  return item.kind !== 'root'
}

/**
 * Why a move is refused, or `undefined` when it is allowed — the same rules the
 * store enforces in `moveToFolder`, asked before the drop so the tree can say no
 * while the user is still dragging.
 */
export function moveRefusal(
  index: TreeIndex,
  item: TreeItem,
  destination: FolderDestination,
): string | undefined {
  if (item.kind === 'root') return 'The top-level groups are fixed.'
  const root = destinationRoot(destination, index.foldersById)
  if (root === undefined) return 'That folder is not attached to a group.'
  const belongs = belongsUnder(item, index)
  if (belongs === undefined) return 'This folder is not attached to a group.'
  if (root !== belongs) {
    return `${kindNoun(item)} belongs under ${FOLDER_ROOT_LABELS[belongs]}, not ${FOLDER_ROOT_LABELS[root]}.`
  }
  if (
    item.kind === 'folder' &&
    'folder' in destination &&
    isWithinFolder(destination.folder, item.id, index.foldersById)
  ) {
    return 'A folder cannot go inside itself.'
  }
  return undefined
}

function belongsUnder(item: TreeItem, index: TreeIndex): FolderRoot | undefined {
  switch (item.kind) {
    case 'root':
      return item.id
    case 'folder':
      return destinationRoot({ folder: item.id }, index.foldersById)
    case 'element':
      return elementFolderRoot(item.element.type)
    case 'relationship':
      return 'relations'
    case 'view':
      return 'views'
  }
}

function kindNoun(item: TreeItem): string {
  switch (item.kind) {
    case 'element':
      return `A ${typeLabel(item.element.type)}`
    case 'relationship':
      return 'A relationship'
    case 'view':
      return 'A view'
    default:
      return 'This folder'
  }
}

/** The store's name for a tree item's kind; `undefined` for a group. */
export function fileableKind(item: TreeItem): FileableKind | undefined {
  return item.kind === 'root' ? undefined : item.kind
}
