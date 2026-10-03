import { describe, expect, it } from 'vitest'
import type { Folder, Workspace } from '@/model'
import { drawnWorkspace } from '@/test/fixtures'
import {
  ancestorKeys,
  buildTree,
  destinationOf,
  itemKey,
  moveRefusal,
  visibleRows,
  type TreeIndex,
} from './tree-model'

function tree(workspace: Workspace = drawnWorkspace()): TreeIndex {
  return buildTree({
    elements: workspace.elements,
    relationships: workspace.relationships,
    views: workspace.views,
    folders: workspace.folders,
    elementName: (id) => workspace.elements.find((element) => element.id === id)?.name,
  })
}

/** Names under a row, in display order. */
function childNames(index: TreeIndex, key: string): string[] {
  return (index.children.get(key) ?? []).map((item) => item.name)
}

const root = (id: Parameters<typeof itemKey>[1]) => itemKey('root', id)
const folder = (id: string) => itemKey('folder', id)

describe('placement', () => {
  it('shows the nine groups in Archi order, empty or not', () => {
    expect(tree().roots.map((item) => item.name)).toEqual([
      'Strategy',
      'Business',
      'Application',
      'Technology & Physical',
      'Motivation',
      'Implementation & Migration',
      'Other',
      'Relations',
      'Views',
    ])
  })

  it('files folders in their group or parent, and members in their folder or default group', () => {
    const index = tree()
    // f-business (root business) → f-core → proc-claim; cap-claim has no folder.
    expect(index.parent.get(folder('f-business'))).toBe(root('business'))
    expect(index.parent.get(folder('f-core'))).toBe(folder('f-business'))
    expect(index.parent.get(itemKey('element', 'proc-claim'))).toBe(folder('f-core'))
    expect(index.parent.get(itemKey('element', 'cap-claim'))).toBe(root('strategy'))
    expect(index.parent.get(itemKey('element', 'app-claims'))).toBe(folder('f-apps'))
    expect(index.parent.get(itemKey('element', 'tec-k8s'))).toBe(root('technology'))
    expect(index.parent.get(itemKey('relationship', 'rel-app-proc'))).toBe(folder('f-relations'))
    expect(index.parent.get(itemKey('view', 'view-landscape'))).toBe(folder('f-views'))
    expect(ancestorKeys(index, itemKey('element', 'proc-claim'))).toEqual([
      root('business'),
      folder('f-business'),
      folder('f-core'),
    ])
  })

  it('lists folders first, then by name', () => {
    const workspace = drawnWorkspace()
    workspace.folders.push({ id: 'f-z', name: 'Zeta', root: 'strategy' })
    workspace.elements.push({ id: 'cap-a', type: 'Capability', name: 'Accounting', properties: {} })
    // `Zeta` is a folder, so it comes before `Accounting`, which is not.
    expect(childNames(tree(workspace), root('strategy'))).toEqual([
      'Zeta',
      'Accounting',
      'Claim Handling',
    ])
  })

  it('names an unnamed relationship by its ends', () => {
    const index = tree()
    const relationship = index.byKey.get(itemKey('relationship', 'rel-app-proc'))
    expect(relationship?.name).toBe('Claim Handling Engine → Handle Claim')
  })

  it('keeps a member whose folder is missing, in its own group', () => {
    const workspace = drawnWorkspace()
    workspace.elements = workspace.elements.map((element) =>
      element.id === 'app-claims' ? { ...element, folder: 'f-gone' } : element,
    )
    expect(tree(workspace).parent.get(itemKey('element', 'app-claims'))).toBe(root('application'))
  })

  it('keeps folders on a cycle or with a missing parent, at the top of Other', () => {
    const workspace = drawnWorkspace()
    const broken: Folder[] = [
      { id: 'f-a', name: 'A', parent: 'f-b' },
      { id: 'f-b', name: 'B', parent: 'f-a' },
      // Below the cycle but not on it: it stays with its parent.
      { id: 'f-c', name: 'C', parent: 'f-a' },
      { id: 'f-orphan', name: 'Orphan', parent: 'f-gone' },
    ]
    workspace.folders.push(...broken)
    const index = tree(workspace)
    expect(childNames(index, root('other'))).toEqual(['A', 'B', 'Orphan'])
    expect(index.parent.get(folder('f-c'))).toBe(folder('f-a'))
    // Every folder is reachable exactly once.
    const reachable = visibleRows(index, new Set(index.byKey.keys()), '').map((row) => row.key)
    expect(new Set(reachable).size).toBe(reachable.length)
    for (const f of broken) expect(reachable).toContain(folder(f.id))
  })
})

describe('itemKey', () => {
  it('cannot be made to collide by an id, whatever it contains', () => {
    // The same id under two kinds, an id containing the separator, and an id
    // that looks like a whole key.
    const keys = [
      itemKey('folder', 'x'),
      itemKey('element', 'x'),
      itemKey('folder', 'x","element'),
      itemKey('element', '["folder","x"]'),
      itemKey('folder', '["element","x"]'),
    ]
    expect(new Set(keys).size).toBe(keys.length)
    expect(JSON.parse(itemKey('folder', 'x","element'))).toEqual(['folder', 'x","element'])
  })
})

describe('visible rows', () => {
  it('shows only the groups until one is opened, with their positions', () => {
    const index = tree()
    const rows = visibleRows(index, new Set(), '')
    expect(rows).toHaveLength(9)
    expect(rows[1]).toMatchObject({ level: 1, posinset: 2, setsize: 9, expanded: false })
    expect(rows[1]?.expandable).toBe(true)
    // Motivation has nothing in it: nothing to open.
    expect(rows[4]).toMatchObject({ expandable: false })
  })

  it('shows the children of an opened row, one level down', () => {
    const index = tree()
    const rows = visibleRows(index, new Set([root('business'), folder('f-business')]), '')
    const names = rows.map((row) => `${row.level}:${row.item.name}`)
    expect(names.slice(1, 4)).toEqual(['1:Business', '2:Claims', '3:Core processes'])
    // f-core is not open, so Handle Claim is not on screen.
    expect(names).not.toContain('4:Handle Claim')
    expect(rows[2]).toMatchObject({ parentKey: root('business'), posinset: 1, setsize: 1 })
  })

  it('filters to the matches and the folders they sit in, opened', () => {
    const index = tree()
    const rows = visibleRows(index, new Set(), 'handle claim')
    // Relationships named by their ends match on those names too.
    expect(rows.map((row) => row.item.name)).toEqual([
      'Business',
      'Claims',
      'Core processes',
      'Handle Claim',
      'Relations',
      'Claims relations',
      'Claim Handling Engine → Handle Claim',
      'Handle Claim → Claim Handling',
    ])
    expect(rows.every((row) => row.expanded === row.expandable)).toBe(true)
    expect(rows[3]).toMatchObject({ level: 4, posinset: 1, setsize: 1 })
  })

  it('matches an element by type label, as the inventory does', () => {
    const rows = visibleRows(tree(), new Set(), 'node')
    expect(rows.map((row) => row.item.name)).toContain('Kubernetes Platform')
  })

  it('shows a folder found by name with its contents', () => {
    const rows = visibleRows(tree(), new Set(), 'claims apps')
    expect(rows.map((row) => row.item.name)).toEqual([
      'Application',
      'Claims apps',
      'Claim Handling Engine',
    ])
  })

  it('brings the user’s own expansion back when the filter clears', () => {
    const index = tree()
    const expanded = new Set([root('views')])
    visibleRows(index, expanded, 'handle')
    const rows = visibleRows(index, expanded, '')
    expect(rows.map((row) => row.item.name)).toContain('Landscapes')
    expect(rows.map((row) => row.item.name)).not.toContain('Core processes')
  })
})

describe('moving', () => {
  it('lands in a folder, a group, or beside a member', () => {
    const index = tree()
    expect(destinationOf(index, folder('f-core'))).toEqual({ folder: 'f-core' })
    expect(destinationOf(index, root('application'))).toEqual({ root: 'application' })
    expect(destinationOf(index, itemKey('element', 'proc-claim'))).toEqual({ folder: 'f-core' })
  })

  it('refuses another group, a folder into itself, and the groups themselves', () => {
    const index = tree()
    const app = index.byKey.get(itemKey('element', 'app-claims'))!
    const business = index.byKey.get(folder('f-business'))!
    expect(moveRefusal(index, app, { root: 'application' })).toBeUndefined()
    expect(moveRefusal(index, app, { folder: 'f-core' })).toMatch(/belongs under Application/)
    expect(moveRefusal(index, business, { folder: 'f-core' })).toMatch(/inside itself/)
    expect(moveRefusal(index, business, { folder: 'f-business' })).toMatch(/inside itself/)
    expect(moveRefusal(index, index.roots[0]!, { root: 'business' })).toMatch(/fixed/)
    const view = index.byKey.get(itemKey('view', 'view-landscape'))!
    expect(moveRefusal(index, view, { root: 'views' })).toBeUndefined()
    expect(moveRefusal(index, view, { root: 'relations' })).toMatch(/belongs under Views/)
  })
})
