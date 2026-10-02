import { findElementType } from './element-types'
import type { Finding } from './validate'
import {
  FOLDER_ROOT_LABELS,
  defaultFolderRoot,
  type Element,
  type Folder,
  type FolderRoot,
  type View,
  type Workspace,
} from './workspace'

/**
 * Referential integrity of hand-drawn views and folders (#75).
 *
 * The store's commands keep a workspace consistent as it is edited; these checks
 * are for what arrives from outside — a hand-edited file, an agent's write, an
 * import from a tool with looser rules — and for the validator view in M3.
 */
export function validateViewsAndFolders(workspace: Workspace, findings: Finding[]): void {
  const elementsById = new Map(workspace.elements.map((element) => [element.id, element]))
  const relationshipsById = new Map(workspace.relationships.map((r) => [r.id, r]))
  const viewIds = new Set(workspace.views.map((view) => view.id))

  const seenViewIds = new Set<string>()
  for (const view of workspace.views) {
    if (seenViewIds.has(view.id)) {
      findings.push(
        viewFinding('error', 'view.duplicate-id', `Two views share the id "${view.id}".`, view),
      )
    }
    seenViewIds.add(view.id)
    validateView(view, elementsById, relationshipsById, viewIds, findings)
  }

  validateFolders(workspace, findings)
}

function validateView(
  view: View,
  elementsById: Map<string, Element>,
  relationshipsById: Map<string, Workspace['relationships'][number]>,
  viewIds: Set<string>,
  findings: Finding[],
): void {
  const nodesById = new Map<string, View['nodes'][number]>()
  for (const node of view.nodes) {
    if (nodesById.has(node.id)) {
      findings.push(
        viewFinding(
          'error',
          'view.duplicate-node-id',
          `View "${view.name}" has two nodes with the id "${node.id}".`,
          view,
        ),
      )
    }
    nodesById.set(node.id, node)

    if (node.kind === 'element' && !elementsById.has(node.element)) {
      findings.push(
        viewFinding(
          'error',
          'view.dangling-element',
          `View "${view.name}" draws element "${node.element}", which is not in the model.`,
          view,
        ),
      )
    }
    if (node.kind === 'view-ref' && !viewIds.has(node.view)) {
      findings.push(
        viewFinding(
          'error',
          'view.dangling-view-reference',
          `View "${view.name}" references view "${node.view}", which is not in the model.`,
          view,
        ),
      )
    }
  }

  for (const node of view.nodes) {
    if (node.parent === undefined) continue
    if (!nodesById.has(node.parent)) {
      findings.push(
        viewFinding(
          'error',
          'view.dangling-parent',
          `In view "${view.name}", node "${node.id}" is nested in "${node.parent}", which is not in the view.`,
          view,
        ),
      )
      continue
    }
    if (inParentCycle(node.id, nodesById)) {
      findings.push(
        viewFinding(
          'error',
          'view.nesting-cycle',
          `In view "${view.name}", node "${node.id}" is nested inside itself.`,
          view,
        ),
      )
    }
  }

  const seenConnectionIds = new Set<string>()
  for (const connection of view.connections) {
    if (seenConnectionIds.has(connection.id)) {
      findings.push(
        viewFinding(
          'error',
          'view.duplicate-connection-id',
          `View "${view.name}" has two connections with the id "${connection.id}".`,
          view,
        ),
      )
    }
    seenConnectionIds.add(connection.id)

    const source = nodesById.get(connection.source)
    const target = nodesById.get(connection.target)
    if (!source || !target) {
      findings.push(
        viewFinding(
          'error',
          'view.dangling-connection',
          `In view "${view.name}", connection "${connection.id}" ends on a node that is not in the view.`,
          view,
        ),
      )
      continue
    }
    if (connection.kind !== 'relationship') continue

    const relationship = relationshipsById.get(connection.relationship)
    if (!relationship) {
      findings.push(
        viewFinding(
          'error',
          'view.dangling-relationship',
          `View "${view.name}" draws relationship "${connection.relationship}", which is not in the model.`,
          view,
        ),
      )
      continue
    }
    // A connection is a drawing of its relationship, so it has to run between
    // drawings of the relationship's own two elements, in the same direction.
    const sourceElement = source.kind === 'element' ? source.element : undefined
    const targetElement = target.kind === 'element' ? target.element : undefined
    if (sourceElement !== relationship.source || targetElement !== relationship.target) {
      findings.push(
        viewFinding(
          'error',
          'view.connection-mismatch',
          `In view "${view.name}", connection "${connection.id}" draws ${relationship.type} relationship "${relationship.id}" between nodes that do not show its source and target elements.`,
          view,
        ),
      )
    }
  }
}

function inParentCycle(nodeId: string, nodesById: Map<string, View['nodes'][number]>): boolean {
  const seen = new Set<string>()
  let current = nodesById.get(nodeId)
  while (current?.parent !== undefined) {
    if (current.parent === nodeId) return true
    if (seen.has(current.parent)) return false // a cycle above us; reported for its own members
    seen.add(current.parent)
    current = nodesById.get(current.parent)
  }
  return false
}

function validateFolders(workspace: Workspace, findings: Finding[]): void {
  const foldersById = new Map<string, Folder>()
  for (const folder of workspace.folders) {
    if (foldersById.has(folder.id)) {
      findings.push(
        folderFinding(
          'error',
          'folder.duplicate-id',
          `Two folders share the id "${folder.id}".`,
          folder,
        ),
      )
    }
    foldersById.set(folder.id, folder)
  }

  for (const folder of workspace.folders) {
    if ((folder.parent === undefined) === (folder.root === undefined)) {
      findings.push(
        folderFinding(
          'error',
          'folder.no-place',
          `Folder "${folder.name}" must sit either in another folder or directly in a top-level group, not ${folder.parent === undefined ? 'neither' : 'both'}.`,
          folder,
        ),
      )
      continue
    }
    if (folder.parent !== undefined && !foldersById.has(folder.parent)) {
      findings.push(
        folderFinding(
          'error',
          'folder.dangling-parent',
          `Folder "${folder.name}" is inside "${folder.parent}", which is not in the model.`,
          folder,
        ),
      )
    } else if (inFolderCycle(folder, foldersById)) {
      findings.push(
        folderFinding('error', 'folder.cycle', `Folder "${folder.name}" is inside itself.`, folder),
      )
    }
  }

  // Members: a folder that does not exist, or one in the wrong group. Archi
  // keeps each kind of object in its own group, and the model tree (#80) relies
  // on it — an application filed under Business would be lost to anyone looking
  // for it where every other application is.
  const check = (
    subjectId: string,
    subjectKind: 'element' | 'relationship' | 'view',
    label: string,
    folderId: string | undefined,
    expected: FolderRoot,
  ): void => {
    if (folderId === undefined) return
    if (!foldersById.has(folderId)) {
      findings.push({
        severity: 'error',
        code: 'folder.dangling-member',
        message: `${label} is filed in folder "${folderId}", which is not in the model.`,
        subjectId,
        subjectKind,
      })
      return
    }
    const root = folderRoot(folderId, foldersById)
    if (root !== undefined && root !== expected) {
      findings.push({
        severity: 'warning',
        code: 'folder.wrong-group',
        message: `${label} is filed under ${FOLDER_ROOT_LABELS[root]}; it belongs under ${FOLDER_ROOT_LABELS[expected]}.`,
        subjectId,
        subjectKind,
      })
    }
  }

  for (const element of workspace.elements) {
    const meta = findElementType(element.type)
    if (!meta) continue
    check(element.id, 'element', `"${element.name}"`, element.folder, defaultFolderRoot(meta.layer))
  }
  for (const relationship of workspace.relationships) {
    check(
      relationship.id,
      'relationship',
      `Relationship ${relationship.id}`,
      relationship.folder,
      'relations',
    )
  }
  for (const view of workspace.views) {
    check(view.id, 'view', `View "${view.name}"`, view.folder, 'views')
  }
}

function inFolderCycle(folder: Folder, foldersById: Map<string, Folder>): boolean {
  const seen = new Set<string>()
  let parentId = folder.parent
  while (parentId !== undefined) {
    if (parentId === folder.id) return true
    if (seen.has(parentId)) return false // a cycle above us; reported for its own members
    seen.add(parentId)
    parentId = foldersById.get(parentId)?.parent
  }
  return false
}

/** The top-level group a folder sits in, or `undefined` if its chain is broken or cyclic. */
export function folderRoot(
  folderId: string,
  foldersById: Map<string, Folder>,
): FolderRoot | undefined {
  const seen = new Set<string>()
  let current = foldersById.get(folderId)
  while (current && !seen.has(current.id)) {
    if (current.root !== undefined) return current.root
    seen.add(current.id)
    current = current.parent === undefined ? undefined : foldersById.get(current.parent)
  }
  return undefined
}

function viewFinding(
  severity: Finding['severity'],
  code: string,
  message: string,
  view: View,
): Finding {
  return { severity, code, message, subjectId: view.id, subjectKind: 'view' }
}

function folderFinding(
  severity: Finding['severity'],
  code: string,
  message: string,
  folder: Folder,
): Finding {
  return { severity, code, message, subjectId: folder.id, subjectKind: 'folder' }
}
