import {
  FONT_STYLES,
  TEXT_ALIGNMENTS,
  TEXT_POSITIONS,
  isFolderRoot,
  type Appearance,
  type Bounds,
  type Folder,
  type FontStyle,
  type Point,
  type TextAlignment,
  type TextPosition,
  type View,
  type ViewConnection,
  type ViewNode,
} from '@/model'
import { problem, type ImportProblem } from './problems'
import { asArray, byId, emptyToUndefined, isRecord, prune, readProperties } from './json-helpers'

/**
 * Hand-drawn views and folders in canonical JSON (#75, ADR 0004).
 *
 * Writing: views, nodes, connections and folders are each sorted by id, so the
 * file does not depend on the order anything was drawn in. Bend-points are the
 * exception — their order *is* the route — and font styles are written in
 * declaration order, so `[italic, bold]` and `[bold, italic]` are one file.
 *
 * Reading: every reference is checked against what the file actually contains,
 * and anything that cannot be carried is dropped with a problem saying so —
 * never silently, because the next save would make the loss permanent.
 */

// ── Writing ──────────────────────────────────────────────────────────────────

export function canonicalView(view: View): Record<string, unknown> {
  return prune({
    id: view.id,
    name: view.name,
    documentation: view.documentation,
    viewpoint: view.viewpoint,
    folder: view.folder,
    properties: emptyToUndefined(view.properties),
    nodes: [...view.nodes].sort(byId).map(canonicalNode),
    connections: [...view.connections].sort(byId).map(canonicalConnection),
  })
}

function canonicalNode(node: ViewNode): Record<string, unknown> {
  const base = {
    id: node.id,
    kind: node.kind,
    bounds: canonicalBounds(node.bounds),
    parent: node.parent,
    appearance: node.appearance && canonicalAppearance(node.appearance),
  }
  switch (node.kind) {
    case 'element':
      return prune({ ...base, element: node.element })
    case 'note':
      // Written even when empty: an empty note is still a note.
      return { ...prune(base), text: node.text }
    case 'group':
      return { ...prune({ ...base, documentation: node.documentation }), name: node.name }
    case 'view-ref':
      return prune({ ...base, view: node.view })
  }
}

function canonicalConnection(connection: ViewConnection): Record<string, unknown> {
  const base = {
    id: connection.id,
    kind: connection.kind,
    source: connection.source,
    target: connection.target,
    bendpoints: connection.bendpoints?.map((point) => ({ x: point.x, y: point.y })),
    appearance: connection.appearance && canonicalAppearance(connection.appearance),
  }
  return connection.kind === 'relationship'
    ? prune({ ...base, relationship: connection.relationship })
    : prune({ ...base, name: connection.name })
}

function canonicalBounds(bounds: Bounds): Bounds {
  return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
}

function canonicalAppearance(appearance: Appearance): Record<string, unknown> | undefined {
  const fontStyle = appearance.fontStyle?.length
    ? FONT_STYLES.filter((style) => appearance.fontStyle?.includes(style))
    : undefined
  const out = prune({ ...appearance, fontStyle })
  return Object.keys(out).length ? out : undefined
}

export function canonicalFolder(folder: Folder): Record<string, unknown> {
  return prune({ ...folder })
}

// ── Reading ──────────────────────────────────────────────────────────────────

interface Where {
  file?: string
}

/** What the views may refer to: the ids the rest of the file defined. */
export interface ViewReferences {
  elements: ReadonlySet<string>
  relationships: ReadonlySet<string>
  folders: ReadonlySet<string>
}

/**
 * Read the `views` array. Views are read in two passes because a view may
 * reference another: the first collects the ids that exist, the second reads
 * each view against them.
 */
export function readViews(
  raw: unknown,
  references: ViewReferences,
  problems: ImportProblem[],
  where: Where,
): View[] {
  const candidates = asArray(raw)
  const viewIds = new Set<string>()
  for (const candidate of candidates) {
    if (isRecord(candidate) && typeof candidate.id === 'string' && candidate.id) {
      viewIds.add(candidate.id)
    }
  }

  const views: View[] = []
  const seen = new Set<string>()
  for (const [index, candidate] of candidates.entries()) {
    const view = readView(candidate, index, { ...references, views: viewIds }, problems, where)
    if (!view) continue
    if (seen.has(view.id)) {
      problems.push(
        problem(
          'warning',
          'json.duplicate-view-id',
          `Two views share the id "${view.id}"; the later one was skipped.`,
          { ...where, subject: view.id },
        ),
      )
      continue
    }
    seen.add(view.id)
    views.push(view)
  }
  return views
}

function readView(
  candidate: unknown,
  index: number,
  references: ViewReferences & { views: ReadonlySet<string> },
  problems: ImportProblem[],
  where: Where,
): View | undefined {
  if (!isRecord(candidate) || typeof candidate.id !== 'string' || !candidate.id) {
    problems.push(
      problem('warning', 'json.invalid-view', `View ${index} has no id and was skipped.`, where),
    )
    return undefined
  }
  const id = candidate.id
  const at = { ...where, subject: id }
  const view: View = {
    id,
    name: typeof candidate.name === 'string' ? candidate.name : '',
    properties: readProperties(candidate.properties),
    nodes: [],
    connections: [],
  }
  if (typeof candidate.documentation === 'string') view.documentation = candidate.documentation
  if (typeof candidate.viewpoint === 'string' && candidate.viewpoint) {
    view.viewpoint = candidate.viewpoint
  }
  const folder = readFolderRef(candidate.folder, `View "${id}"`, references.folders, problems, at)
  if (folder !== undefined) view.folder = folder

  const nodeIds = new Set<string>()
  for (const [n, raw] of asArray(candidate.nodes).entries()) {
    const node = readNode(raw, n, id, references, problems, at)
    if (!node) continue
    if (nodeIds.has(node.id)) {
      problems.push(
        problem(
          'warning',
          'json.duplicate-node-id',
          `View "${id}" has two nodes with the id "${node.id}"; the later one was skipped.`,
          at,
        ),
      )
      continue
    }
    nodeIds.add(node.id)
    view.nodes.push(node)
  }
  repairNesting(view, problems, at)

  const connectionIds = new Set<string>()
  for (const [n, raw] of asArray(candidate.connections).entries()) {
    const connection = readConnection(raw, n, id, nodeIds, references, problems, at)
    if (!connection) continue
    if (connectionIds.has(connection.id)) {
      problems.push(
        problem(
          'warning',
          'json.duplicate-connection-id',
          `View "${id}" has two connections with the id "${connection.id}"; the later one was skipped.`,
          at,
        ),
      )
      continue
    }
    connectionIds.add(connection.id)
    view.connections.push(connection)
  }
  return view
}

function readNode(
  raw: unknown,
  index: number,
  viewId: string,
  references: ViewReferences & { views: ReadonlySet<string> },
  problems: ImportProblem[],
  at: Where & { subject: string },
): ViewNode | undefined {
  const skip = (why: string, code = 'json.invalid-view-node'): undefined => {
    problems.push(
      problem('warning', code, `View "${viewId}", node ${index}: ${why} It was skipped.`, at),
    )
    return undefined
  }
  if (!isRecord(raw)) return skip('not an object.')
  if (typeof raw.id !== 'string' || !raw.id) return skip('no id.')
  const bounds = readBounds(raw.bounds)
  if (!bounds) return skip(`"${raw.id}" has no usable bounds.`)

  const base: { id: string; bounds: Bounds; parent?: string; appearance?: Appearance } = {
    id: raw.id,
    bounds,
  }
  if (typeof raw.parent === 'string' && raw.parent) base.parent = raw.parent
  const appearance = readAppearance(
    raw.appearance,
    `Node "${raw.id}" in view "${viewId}"`,
    problems,
    at,
  )
  if (appearance) base.appearance = appearance

  switch (raw.kind) {
    case 'element': {
      if (typeof raw.element !== 'string') return skip(`"${raw.id}" names no element.`)
      if (!references.elements.has(raw.element)) {
        return skip(
          `"${raw.id}" draws element "${raw.element}", which is not in the file.`,
          'json.dangling-view-node',
        )
      }
      return { ...base, kind: 'element', element: raw.element }
    }
    case 'note':
      return { ...base, kind: 'note', text: typeof raw.text === 'string' ? raw.text : '' }
    case 'group': {
      const group: ViewNode = {
        ...base,
        kind: 'group',
        name: typeof raw.name === 'string' ? raw.name : '',
      }
      if (typeof raw.documentation === 'string') group.documentation = raw.documentation
      return group
    }
    case 'view-ref': {
      if (typeof raw.view !== 'string') return skip(`"${raw.id}" names no view.`)
      if (!references.views.has(raw.view)) {
        return skip(
          `"${raw.id}" references view "${raw.view}", which is not in the file.`,
          'json.dangling-view-node',
        )
      }
      return { ...base, kind: 'view-ref', view: raw.view }
    }
    default:
      return skip(`"${raw.id}" has kind "${String(raw.kind)}", which this build does not know.`)
  }
}

/**
 * A parent that is not in the view, or a ring of nodes nested in each other,
 * would leave nodes with no position to draw at. Such a node keeps its bounds
 * and becomes top-level, with a problem naming it. Nodes are visited in id
 * order, so the same file always loses the same link.
 */
function repairNesting(
  view: View,
  problems: ImportProblem[],
  at: Where & { subject: string },
): void {
  const byId = new Map(view.nodes.map((node) => [node.id, node]))
  for (const node of [...view.nodes].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
    if (node.parent === undefined) continue
    if (!byId.has(node.parent)) {
      problems.push(
        problem(
          'warning',
          'json.dangling-node-parent',
          `View "${view.id}": node "${node.id}" is nested in "${node.parent}", which is not in the view. It was placed at the top level.`,
          at,
        ),
      )
      delete node.parent
      continue
    }
    const seen = new Set<string>([node.id])
    let parent: string | undefined = node.parent
    while (parent !== undefined && !seen.has(parent)) {
      seen.add(parent)
      parent = byId.get(parent)?.parent
    }
    if (parent === node.id) {
      problems.push(
        problem(
          'warning',
          'json.node-nesting-cycle',
          `View "${view.id}": node "${node.id}" is nested inside itself. It was placed at the top level.`,
          at,
        ),
      )
      delete node.parent
    }
  }
}

function readConnection(
  raw: unknown,
  index: number,
  viewId: string,
  nodeIds: ReadonlySet<string>,
  references: ViewReferences,
  problems: ImportProblem[],
  at: Where & { subject: string },
): ViewConnection | undefined {
  const skip = (why: string, code = 'json.invalid-view-connection'): undefined => {
    problems.push(
      problem('warning', code, `View "${viewId}", connection ${index}: ${why} It was skipped.`, at),
    )
    return undefined
  }
  if (!isRecord(raw)) return skip('not an object.')
  if (typeof raw.id !== 'string' || !raw.id) return skip('no id.')
  if (typeof raw.source !== 'string' || typeof raw.target !== 'string') {
    return skip(`"${raw.id}" has no endpoints.`)
  }
  if (!nodeIds.has(raw.source) || !nodeIds.has(raw.target)) {
    return skip(
      `"${raw.id}" ends on a node that is not in the view.`,
      'json.dangling-view-connection',
    )
  }
  const base: {
    id: string
    source: string
    target: string
    bendpoints?: Point[]
    appearance?: Appearance
  } = { id: raw.id, source: raw.source, target: raw.target }
  if (raw.bendpoints !== undefined) {
    const points = asArray(raw.bendpoints).map(readPoint)
    if (points.every((point): point is Point => point !== undefined)) {
      if (points.length) base.bendpoints = points
    } else {
      problems.push(
        problem(
          'warning',
          'json.invalid-bendpoints',
          `View "${viewId}": connection "${raw.id}" has malformed bend-points; it was drawn straight.`,
          at,
        ),
      )
    }
  }
  const appearance = readAppearance(
    raw.appearance,
    `Connection "${raw.id}" in view "${viewId}"`,
    problems,
    at,
  )
  if (appearance) base.appearance = appearance

  switch (raw.kind) {
    case 'relationship': {
      if (typeof raw.relationship !== 'string') return skip(`"${raw.id}" names no relationship.`)
      if (!references.relationships.has(raw.relationship)) {
        return skip(
          `"${raw.id}" draws relationship "${raw.relationship}", which is not in the file.`,
          'json.dangling-view-connection',
        )
      }
      return { ...base, kind: 'relationship', relationship: raw.relationship }
    }
    case 'line': {
      const line: ViewConnection = { ...base, kind: 'line' }
      if (typeof raw.name === 'string') line.name = raw.name
      return line
    }
    default:
      return skip(`"${raw.id}" has kind "${String(raw.kind)}", which this build does not know.`)
  }
}

function readBounds(raw: unknown): Bounds | undefined {
  if (!isRecord(raw)) return undefined
  const { x, y, width, height } = raw
  if (!isFiniteNumber(x) || !isFiniteNumber(y)) return undefined
  if (!isFiniteNumber(width) || !isFiniteNumber(height) || width < 0 || height < 0) {
    return undefined
  }
  return { x, y, width, height }
}

function readPoint(raw: unknown): Point | undefined {
  if (!isRecord(raw) || !isFiniteNumber(raw.x) || !isFiniteNumber(raw.y)) return undefined
  return { x: raw.x, y: raw.y }
}

const HEX_COLOUR = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i

/** `#rrggbb` or `#rrggbbaa`. The write-path guard for appearance colours. */
export function isHexColour(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOUR.test(value)
}

function readAppearance(
  raw: unknown,
  subject: string,
  problems: ImportProblem[],
  at: Where & { subject: string },
): Appearance | undefined {
  if (raw === undefined) return undefined
  const appearance: Appearance = {}
  const dropped: string[] = []
  if (!isRecord(raw)) {
    dropped.push('appearance')
  } else {
    for (const [key, value] of Object.entries(raw)) {
      switch (key) {
        case 'fillColor':
        case 'lineColor':
        case 'fontColor':
          // Lower-cased: `#FFAA00` and `#ffaa00` are one colour and must be one file.
          if (isHexColour(value)) appearance[key] = value.toLowerCase()
          else dropped.push(key)
          break
        case 'lineWidth':
        case 'fontSize':
          if (isFiniteNumber(value) && value > 0) appearance[key] = value
          else dropped.push(key)
          break
        case 'fontName':
          if (typeof value === 'string' && value) appearance.fontName = value
          else dropped.push(key)
          break
        case 'fontStyle':
          if (
            Array.isArray(value) &&
            value.every((style) => (FONT_STYLES as readonly unknown[]).includes(style))
          ) {
            if (value.length) appearance.fontStyle = value as FontStyle[]
          } else dropped.push(key)
          break
        case 'textAlignment':
          if ((TEXT_ALIGNMENTS as readonly unknown[]).includes(value)) {
            appearance.textAlignment = value as TextAlignment
          } else dropped.push(key)
          break
        case 'textPosition':
          if ((TEXT_POSITIONS as readonly unknown[]).includes(value)) {
            appearance.textPosition = value as TextPosition
          } else dropped.push(key)
          break
        default:
          dropped.push(key)
      }
    }
  }
  if (dropped.length) {
    problems.push(
      problem(
        'warning',
        'json.invalid-appearance',
        `${subject}: appearance field${dropped.length === 1 ? '' : 's'} ${dropped.join(', ')} could not be read and ${dropped.length === 1 ? 'was' : 'were'} ignored.`,
        at,
      ),
    )
  }
  return Object.keys(appearance).length ? appearance : undefined
}

/**
 * Read the `folders` array. A folder must end up in a top-level group: one whose
 * parent is missing, or whose chain of parents loops, has nowhere to be shown
 * and is skipped — with its members falling back to their default group, which
 * `readFolderRef` reports for each of them.
 */
export function readFolders(raw: unknown, problems: ImportProblem[], where: Where): Folder[] {
  const candidates = new Map<string, Folder>()
  for (const [index, candidate] of asArray(raw).entries()) {
    if (!isRecord(candidate) || typeof candidate.id !== 'string' || !candidate.id) {
      problems.push(
        problem(
          'warning',
          'json.invalid-folder',
          `Folder ${index} has no id and was skipped.`,
          where,
        ),
      )
      continue
    }
    const id = candidate.id
    const at = { ...where, subject: id }
    if (candidates.has(id)) {
      problems.push(
        problem(
          'warning',
          'json.duplicate-folder-id',
          `Two folders share the id "${id}"; the later one was skipped.`,
          at,
        ),
      )
      continue
    }
    const hasParent = typeof candidate.parent === 'string' && candidate.parent !== ''
    const root = isFolderRoot(candidate.root) ? candidate.root : undefined
    if (hasParent === (root !== undefined)) {
      problems.push(
        problem(
          'warning',
          'json.invalid-folder',
          `Folder "${id}" must name exactly one of a parent folder or a top-level group. It was skipped.`,
          at,
        ),
      )
      continue
    }
    const folder: Folder = { id, name: typeof candidate.name === 'string' ? candidate.name : '' }
    if (typeof candidate.documentation === 'string') folder.documentation = candidate.documentation
    if (hasParent) folder.parent = candidate.parent as string
    else if (root !== undefined) folder.root = root
    candidates.set(id, folder)
  }

  const placed = new Map<string, boolean>()
  const isPlaced = (folder: Folder, trail: Set<string>): boolean => {
    const known = placed.get(folder.id)
    if (known !== undefined) return known
    if (folder.parent === undefined) return true
    const parent = candidates.get(folder.parent)
    if (!parent || trail.has(parent.id)) return false
    trail.add(folder.id)
    const ok = isPlaced(parent, trail)
    placed.set(folder.id, ok)
    return ok
  }

  const folders: Folder[] = []
  for (const folder of candidates.values()) {
    if (isPlaced(folder, new Set())) {
      folders.push(folder)
      continue
    }
    problems.push(
      problem(
        'warning',
        'json.unplaced-folder',
        `Folder "${folder.id}" sits in "${folder.parent ?? ''}", which is missing or contains it in turn. It was skipped; its contents moved to their default group.`,
        { ...where, subject: folder.id },
      ),
    )
  }
  return folders
}

/** A member's `folder` field, checked against the folders that were read. */
export function readFolderRef(
  raw: unknown,
  subject: string,
  folders: ReadonlySet<string>,
  problems: ImportProblem[],
  at: Where & { subject: string },
): string | undefined {
  if (raw === undefined) return undefined
  if (typeof raw === 'string' && folders.has(raw)) return raw
  problems.push(
    problem(
      'warning',
      'json.dangling-folder',
      `${subject} is filed in folder "${String(raw)}", which is not in the file. It was moved to its default group.`,
      at,
    ),
  )
  return undefined
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}
