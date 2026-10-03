import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
} from 'react'
import { matchPath, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useVirtualizer } from '@tanstack/react-virtual'
import { findRelationshipType, type Folder, type FolderDestination } from '@/model'
import { newId, useModelSelector, useModelStore } from '@/store'
import { TypeCodeBadge } from '@/ui/common/TypeCodeBadge'
import { LIST_WINDOW } from '@/ui/inventory/list-window'
import {
  ancestorKeys,
  buildTree,
  destinationOf,
  fileableKind,
  itemKey,
  moveRefusal,
  visibleRows,
  type TreeIndex,
  type TreeItem,
  type TreeRow,
} from './tree-model'
import './tree.css'

/**
 * Archi's model tree beside the inventory (#80): the nine groups, the user's
 * folders and everything filed in them.
 *
 * One WAI-ARIA tree with `aria-activedescendant`, not roving tabindex, because
 * the rows are windowed: at 5,000 elements the focused row may be one the
 * virtualiser has not mounted, and DOM focus cannot rest on an element that
 * does not exist. The tree container keeps focus and points at the active row.
 *
 * Two kinds of "current". The **active** row is the keyboard cursor. The
 * **selected** row (`aria-selected`) is what the screen beside it shows — the
 * fact sheet's element, the open view, or the element selected on its canvas —
 * read from the URL, so the tree follows the app rather than keeping a second
 * copy of the selection that could disagree with it.
 *
 * Activating a row (click, Enter) opens it: a view opens, an element opens its
 * fact sheet — or, on a view that draws it, is selected on the canvas. A folder
 * opens or closes. A relationship has no screen of its own yet, so it does
 * nothing beyond becoming active.
 */

const ROW_HEIGHT = 26
export const TREE_VIRTUALISE_ABOVE = LIST_WINDOW

interface RouteSubject {
  /** The row the screen beside the tree is showing. */
  selectedKey: string | undefined
  /** The view open on the canvas, if one is. */
  viewId: string | undefined
}

function useRouteSubject(): RouteSubject {
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const element = matchPath('/element/:id', pathname)?.params.id
  if (element !== undefined) return { selectedKey: itemKey('element', element), viewId: undefined }
  const view = matchPath('/view/:id', pathname)?.params.id
  if (view !== undefined) {
    const onCanvas = params.get('element')
    return {
      selectedKey: onCanvas ? itemKey('element', onCanvas) : itemKey('view', view),
      viewId: view,
    }
  }
  return { selectedKey: undefined, viewId: undefined }
}

export function ModelTree({ id }: { id?: string }) {
  const store = useModelStore()
  const navigate = useNavigate()
  const treeId = useId()
  const index = useModelSelector((s) =>
    buildTree({
      elements: s.elementList(),
      relationships: s.relationshipList(),
      views: s.viewList(),
      folders: s.folderList(),
      elementName: (elementId) => s.element(elementId)?.name,
    }),
  )
  const { selectedKey, viewId } = useRouteSubject()

  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set())
  const [query, setQuery] = useState('')
  const [active, setActive] = useState<string | undefined>(undefined)
  const [renaming, setRenaming] = useState<string | undefined>(undefined)
  const [cut, setCut] = useState<string | undefined>(undefined)
  const [dropKey, setDropKey] = useState<string | undefined>(undefined)
  const [status, setStatus] = useState('')
  const dragKey = useRef<string | undefined>(undefined)
  const treeRef = useRef<HTMLDivElement>(null)
  const typeahead = useRef({ text: '', at: 0 })

  const rows = useMemo(() => visibleRows(index, expanded, query), [index, expanded, query])
  const activeIndex = active === undefined ? -1 : rows.findIndex((row) => row.key === active)
  const filtering = query.trim().length > 0

  // Reveal what the screen beside the tree is showing: open its folders and put
  // the cursor on it. Once per subject — the user may collapse it again — but
  // retried until the subject is in the model, so a just-created one still lands.
  const revealed = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (selectedKey === undefined || revealed.current === selectedKey) return
    if (!index.byKey.has(selectedKey)) return
    revealed.current = selectedKey
    const ancestors = ancestorKeys(index, selectedKey)
    setExpanded((current) =>
      ancestors.every((key) => current.has(key)) ? current : new Set([...current, ...ancestors]),
    )
    setActive(selectedKey)
  }, [selectedKey, index])

  const virtualise = rows.length > TREE_VIRTUALISE_ABOVE
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => treeRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
    enabled: virtualise,
  })

  // Keep the active row on screen — and, when windowed, mounted, so the id
  // `aria-activedescendant` names exists.
  useEffect(() => {
    if (activeIndex < 0) return
    if (virtualise) virtualizer.scrollToIndex(activeIndex, { align: 'auto' })
    else
      document.getElementById(rowDomId(treeId, activeIndex))?.scrollIntoView?.({ block: 'nearest' })
    // Only when the cursor moves, not on every model change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, virtualise])

  const setOpen = useCallback(
    (row: TreeRow, open: boolean) => {
      if (filtering || !row.expandable || row.expanded === open) return
      setExpanded((current) => {
        const next = new Set(current)
        if (open) next.add(row.key)
        else next.delete(row.key)
        return next
      })
      // Closing a folder the cursor is inside would leave it on a row that is gone.
      if (!open && active !== undefined && ancestorKeys(index, active).includes(row.key)) {
        setActive(row.key)
      }
    },
    [filtering, active, index],
  )

  const activate = useCallback(
    (row: TreeRow) => {
      const item = row.item
      switch (item.kind) {
        case 'root':
        case 'folder':
          setOpen(row, !row.expanded)
          return
        case 'view':
          navigate(`/view/${encodeURIComponent(item.id)}`)
          return
        case 'element': {
          const drawsIt =
            viewId !== undefined &&
            store
              .view(viewId)
              ?.nodes.some((node) => node.kind === 'element' && node.element === item.id)
          if (drawsIt) {
            navigate(`/view/${encodeURIComponent(viewId)}?element=${encodeURIComponent(item.id)}`, {
              replace: true,
            })
          } else navigate(`/element/${encodeURIComponent(item.id)}`)
          return
        }
        case 'relationship':
          return
      }
    },
    [navigate, setOpen, store, viewId],
  )

  /** File `key` at `target`'s destination, through the store's one command. */
  const move = useCallback(
    (key: string, target: string): boolean => {
      const item = index.byKey.get(key)
      const destination = destinationOf(index, target)
      const kind = item && fileableKind(item)
      if (!item || !destination || !kind) return false
      const refusal = moveRefusal(index, item, destination)
      if (refusal) {
        setStatus(`Cannot move “${displayName(item)}”: ${refusal}`)
        return false
      }
      if (!store.moveToFolder(kind, item.id, destination)) return false
      const into = destinationLabel(index, destination)
      setStatus(`Moved “${displayName(item)}” to ${into}.`)
      // Open the destination so the moved row stays in sight.
      const destinationKey =
        'folder' in destination
          ? itemKey('folder', destination.folder)
          : itemKey('root', destination.root)
      setExpanded(
        (current) => new Set([...current, ...ancestorKeys(index, destinationKey), destinationKey]),
      )
      setActive(key)
      return true
    },
    [index, store],
  )

  const createFolder = useCallback(() => {
    const destination = active === undefined ? undefined : destinationOf(index, active)
    if (!destination) return
    const folder: Folder = {
      id: newId('folder'),
      name: 'New folder',
      ...('folder' in destination ? { parent: destination.folder } : { root: destination.root }),
    }
    store.addFolder(folder)
    const parentKey =
      'folder' in destination
        ? itemKey('folder', destination.folder)
        : itemKey('root', destination.root)
    setQuery('')
    setExpanded((current) => new Set([...current, ...ancestorKeys(index, parentKey), parentKey]))
    const key = itemKey('folder', folder.id)
    setActive(key)
    setRenaming(key)
  }, [active, index, store])

  const removeFolder = useCallback(
    (row: TreeRow) => {
      if (row.item.kind !== 'folder') return
      const name = row.item.name
      store.removeFolder(row.item.id)
      setActive(row.parentKey)
      setStatus(`Deleted folder “${name}”; its contents moved up a level.`)
      treeRef.current?.focus()
    },
    [store],
  )

  const commitRename = useCallback(
    (key: string, name: string) => {
      setRenaming(undefined)
      const item = index.byKey.get(key)
      const trimmed = name.trim()
      if (item?.kind === 'folder' && trimmed && trimmed !== item.name) {
        store.updateFolder(item.id, (folder) => ({ ...folder, name: trimmed }))
      }
      treeRef.current?.focus()
    },
    [index, store],
  )

  const activeRow = activeIndex >= 0 ? rows[activeIndex] : undefined

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (renaming !== undefined || rows.length === 0) return
    const current = activeIndex >= 0 ? activeIndex : 0
    const row = rows[current]
    if (!row) return
    const go = (i: number) => {
      const target = rows[Math.max(0, Math.min(rows.length - 1, i))]
      if (target) setActive(target.key)
    }
    const command = event.metaKey || event.ctrlKey
    let handled = true

    switch (event.key) {
      case 'ArrowDown':
        go(activeIndex < 0 ? 0 : current + 1)
        break
      case 'ArrowUp':
        go(activeIndex < 0 ? 0 : current - 1)
        break
      case 'Home':
        go(0)
        break
      case 'End':
        go(rows.length - 1)
        break
      case 'ArrowRight':
        if (row.expandable && !row.expanded) setOpen(row, true)
        else if (row.expanded) go(current + 1)
        else setActive(row.key)
        break
      case 'ArrowLeft':
        if (row.expanded && !filtering) setOpen(row, false)
        else if (row.parentKey !== undefined) setActive(row.parentKey)
        else setActive(row.key)
        break
      case 'Enter':
        setActive(row.key)
        activate(row)
        break
      case 'F2':
        if (row.item.kind === 'folder') setRenaming(row.key)
        break
      case 'Delete':
      case 'Backspace':
        if (row.item.kind === 'folder') removeFolder(row)
        else handled = false
        break
      case 'Escape':
        if (cut !== undefined) {
          setCut(undefined)
          setStatus('Move cancelled.')
        } else handled = false
        break
      default:
        if (command && event.key.toLowerCase() === 'x' && row.item.kind !== 'root') {
          setCut(row.key)
          setStatus(`“${displayName(row.item)}” is ready to move. Paste it into a folder.`)
        } else if (command && event.key.toLowerCase() === 'v' && cut !== undefined) {
          if (move(cut, row.key)) setCut(undefined)
        } else if (!command && !event.altKey && event.key.length === 1 && event.key !== ' ') {
          typeAhead(event.key)
        } else handled = false
    }

    if (handled) {
      event.preventDefault()
      // Letters typed into the tree are type-ahead, not the app's g/i shortcuts.
      event.stopPropagation()
    }
  }

  /** Jump to the next row whose name starts with what was typed in the last second. */
  const typeAhead = (char: string) => {
    const now = Date.now()
    const buffer = now - typeahead.current.at < 1000 ? typeahead.current.text + char : char
    typeahead.current = { text: buffer, at: now }
    const needle = buffer.toLowerCase()
    const start = activeIndex < 0 ? 0 : activeIndex + (buffer.length === 1 ? 1 : 0)
    for (let step = 0; step < rows.length; step += 1) {
      const candidate = rows[(start + step) % rows.length]
      if (candidate && displayName(candidate.item).toLowerCase().startsWith(needle)) {
        setActive(candidate.key)
        return
      }
    }
  }

  const dragProps = (row: TreeRow) => ({
    draggable: row.item.kind !== 'root' && renaming === undefined,
    onDragStart: (event: DragEvent) => {
      dragKey.current = row.key
      event.dataTransfer.effectAllowed = 'move'
      // Firefox starts no drag without data.
      event.dataTransfer.setData('text/plain', displayName(row.item))
    },
    onDragOver: (event: DragEvent) => {
      const dragged = dragKey.current === undefined ? undefined : index.byKey.get(dragKey.current)
      const destination = destinationOf(index, row.key)
      if (!dragged || !destination || moveRefusal(index, dragged, destination)) {
        if (dropKey !== undefined) setDropKey(undefined)
        return
      }
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
      if (dropKey !== row.key) setDropKey(row.key)
    },
    onDrop: (event: DragEvent) => {
      event.preventDefault()
      const dragged = dragKey.current
      dragKey.current = undefined
      setDropKey(undefined)
      if (dragged !== undefined) move(dragged, row.key)
    },
    onDragEnd: () => {
      dragKey.current = undefined
      setDropKey(undefined)
    },
  })

  const renderRow = (row: TreeRow, i: number, style?: CSSProperties) => {
    const { item } = row
    const classes = ['tree__row']
    if (row.key === active) classes.push('tree__row--active')
    if (row.key === selectedKey) classes.push('tree__row--selected')
    if (row.key === cut) classes.push('tree__row--cut')
    if (row.key === dropKey) classes.push('tree__row--drop')
    if (item.kind === 'root') classes.push('tree__row--root')
    return (
      <div
        key={row.key}
        id={rowDomId(treeId, i)}
        role="treeitem"
        aria-level={row.level}
        aria-setsize={row.setsize}
        aria-posinset={row.posinset}
        aria-expanded={row.expandable ? row.expanded : undefined}
        aria-selected={row.key === selectedKey}
        className={classes.join(' ')}
        style={{ ...style, paddingLeft: 6 + (row.level - 1) * 14 }}
        title={rowTitle(item)}
        data-kind={item.kind}
        onClick={() => {
          setActive(row.key)
          treeRef.current?.focus()
          activate(row)
        }}
        onDoubleClick={() => {
          if (item.kind === 'folder') setRenaming(row.key)
        }}
        {...dragProps(row)}
      >
        <span
          className="tree__caret"
          aria-hidden="true"
          onClick={(event) => {
            event.stopPropagation()
            setActive(row.key)
            treeRef.current?.focus()
            setOpen(row, !row.expanded)
          }}
        >
          {row.expandable ? (row.expanded ? '▾' : '▸') : ''}
        </span>
        <RowGlyph item={item} />
        {renaming === row.key ? (
          <RenameInput
            initial={item.name}
            onCommit={(name) => commitRename(row.key, name)}
            onCancel={() => {
              setRenaming(undefined)
              treeRef.current?.focus()
            }}
          />
        ) : (
          <span className="tree__name">{displayName(item)}</span>
        )}
      </div>
    )
  }

  return (
    <div className="model-tree" id={id}>
      <div className="model-tree__head">
        <span className="section-label">Model tree</span>
        <div className="model-tree__tools">
          <button
            type="button"
            className="model-tree__tool"
            onClick={createFolder}
            disabled={!activeRow}
            title="New folder in the selected group or folder"
          >
            + Folder
          </button>
          <button
            type="button"
            className="model-tree__tool"
            onClick={() => activeRow && setRenaming(activeRow.key)}
            disabled={activeRow?.item.kind !== 'folder'}
            title="Rename folder (F2)"
          >
            Rename
          </button>
          <button
            type="button"
            className="model-tree__tool"
            onClick={() => activeRow && removeFolder(activeRow)}
            disabled={activeRow?.item.kind !== 'folder'}
            title="Delete folder (Delete); its contents move up a level"
          >
            Delete
          </button>
        </div>
      </div>
      <input
        className="model-tree__filter"
        type="search"
        placeholder="Filter tree…"
        aria-label="Filter the model tree"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && query) {
            event.stopPropagation()
            setQuery('')
          } else if (event.key === 'ArrowDown') {
            event.preventDefault()
            treeRef.current?.focus()
            if (rows[0] && activeIndex < 0) setActive(rows[0].key)
          }
        }}
      />
      {filtering && (
        <div className="model-tree__count">
          {rows.filter((row) => row.item.kind !== 'root').length} shown
        </div>
      )}
      <div
        ref={treeRef}
        className="model-tree__scroll tree"
        role="tree"
        aria-label="Model tree"
        tabIndex={0}
        aria-activedescendant={activeIndex >= 0 ? rowDomId(treeId, activeIndex) : undefined}
        onKeyDown={onKeyDown}
        onFocus={() => {
          if (activeIndex < 0 && rows[0]) setActive(rows[0].key)
        }}
      >
        {virtualise ? (
          <div
            role="presentation"
            className="tree__virtual"
            style={{ height: virtualizer.getTotalSize() }}
          >
            {virtualizer.getVirtualItems().map((virtual) => {
              const row = rows[virtual.index]
              return row
                ? renderRow(row, virtual.index, {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    transform: `translateY(${virtual.start}px)`,
                  })
                : null
            })}
          </div>
        ) : (
          rows.map((row, i) => renderRow(row, i))
        )}
      </div>
      {/* A polite live region rather than role="status": that role is the save notice's. */}
      <div className="visually-hidden" aria-live="polite" data-testid="tree-announcer">
        {status}
      </div>
    </div>
  )
}

function rowDomId(treeId: string, index: number): string {
  return `${treeId}-row-${index}`
}

function displayName(item: TreeItem): string {
  if (item.name) return item.name
  switch (item.kind) {
    case 'view':
      return '(unnamed view)'
    case 'folder':
      return '(unnamed folder)'
    default:
      return '(unnamed)'
  }
}

function rowTitle(item: TreeItem): string | undefined {
  if (item.kind === 'relationship') {
    return `${item.relationship.type} relationship`
  }
  return undefined
}

function destinationLabel(index: TreeIndex, destination: FolderDestination): string {
  const item =
    'folder' in destination
      ? index.byKey.get(itemKey('folder', destination.folder))
      : index.byKey.get(itemKey('root', destination.root))
  return item ? `“${displayName(item)}”` : 'its group'
}

/** Type code, relationship abbreviation, or a mark for folders and views. */
function RowGlyph({ item }: { item: TreeItem }) {
  switch (item.kind) {
    case 'root':
      return null
    case 'folder':
      return <span className="tree__glyph tree__glyph--folder" aria-hidden="true" />
    case 'element':
      return <TypeCodeBadge type={item.element.type} size={15} />
    case 'relationship':
      return (
        <span className="tree__code" aria-hidden="true">
          {findRelationshipType(item.relationship.type)?.abbr ?? 'REL'}
        </span>
      )
    case 'view':
      return (
        <span className="tree__code tree__code--view" aria-hidden="true">
          VW
        </span>
      )
  }
}

function RenameInput({
  initial,
  onCommit,
  onCancel,
}: {
  initial: string
  onCommit: (name: string) => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  const done = useRef(false)
  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])
  return (
    <input
      ref={ref}
      className="tree__rename"
      aria-label="Folder name"
      defaultValue={initial}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation()
        if (event.key === 'Enter') {
          done.current = true
          onCommit(event.currentTarget.value)
        } else if (event.key === 'Escape') {
          done.current = true
          onCancel()
        }
      }}
      onBlur={(event) => {
        if (!done.current) onCommit(event.currentTarget.value)
      }}
    />
  )
}
