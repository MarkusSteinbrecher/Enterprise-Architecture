import { importArchimate } from '@/io/archimate-native'
import { STYLE_KEY } from '@/io/exchange-views'
import type { ImportProblem } from '@/io/problems'
import {
  absoluteBounds,
  type Appearance,
  type Bounds,
  type View,
  type ViewConnection,
  type ViewNode,
  type ViewNodeKind,
  type Workspace,
} from '@/model'

/**
 * The Archi oracle for edited views (#127, ADR 0008). Archipelago writes a view,
 * Archi 5.10 imports and saves it (`scripts/fixtures/archi-roundtrip.sh`), and
 * the save must hold what Archipelago drew. `compareViews` lists every
 * difference; `explainDifference` names the few that Archi's own code accounts
 * for, so a test can require that nothing else differs.
 *
 * **Drawings are matched by id.** Archi's exchange import keeps every
 * `identifier` as the object's id (seen in `claims-edited.archi.archimate`), and
 * Archipelago's writer rewrites only an id that is not a legal `xs:ID`, which
 * the store never generates. A drawing Archi made up has a fresh id, so it shows
 * as `extra`, never silently paired with one of ours.
 */

export interface ViewDifference {
  /** The view's id, or `(model)` for an element or relationship a view draws. */
  view: string
  /** Node, connection, element or relationship id; the view's own id for a view-level field. */
  drawing: string
  /**
   * What differs. For a view: `missing`, `extra`, `name`, `documentation`,
   * `viewpoint`, `folder`, `properties`, and `order` (a parent's children, by id).
   * For a drawing: `missing`, `extra`, `draws`, `bounds`, `parent`, `source`,
   * `target`, `bendpoints`, `appearance.<field>`. For what a view draws:
   * `element.<field>` or `relationship.<field>`.
   */
  field: string
  ours: unknown
  archi: unknown
}

export interface ArchiSave {
  workspace: Workspace
  /** What our reader could not take from Archi's save. Anything here is outside the comparison, so a test requires it empty. */
  problems: ImportProblem[]
}

/**
 * Read Archi's save as Archi itself sees it. Archipelago carries what the
 * exchange format cannot say (text alignment and position, strikethrough) in
 * the `archipelago.style` view property; Archi keeps that property and draws
 * none of it, so it is removed before reading, or the comparison would credit
 * Archi with what only Archipelago reads. If Archi ever spells the property
 * differently, the removal misses it, so its absence afterwards is checked.
 */
export function readArchiSave(archimate: string): ArchiSave {
  const key = STYLE_KEY.replace(/\./g, '\\.')
  const withoutCarried = archimate.replace(
    new RegExp(`\\s*<property key="${key}" value="[^"]*"/>`, 'g'),
    '',
  )
  if (withoutCarried.includes(STYLE_KEY)) {
    throw new Error(`${STYLE_KEY} is still in Archi's save: its spelling is not the one removed`)
  }
  const result = importArchimate(withoutCarried)
  if (!result.workspace) {
    throw new Error(`Archi's save did not import: ${result.problems.map((p) => p.code).join(', ')}`)
  }
  return { workspace: result.workspace, problems: result.problems }
}

/** Every difference between the views of `ours` and the views of Archi's save. */
export function compareViews(ours: Workspace, archi: Workspace): ViewDifference[] {
  const differences: ViewDifference[] = []
  const archiViews = new Map(archi.views.map((view) => [view.id, view]))
  for (const view of ours.views) {
    const other = archiViews.get(view.id)
    archiViews.delete(view.id)
    if (!other) {
      differences.push({
        view: view.id,
        drawing: view.id,
        field: 'missing',
        ours: view.name,
        archi: undefined,
      })
      continue
    }
    differences.push(
      ...compareViewFields(view, other, ours, archi),
      ...compareNodes(view, other),
      ...compareOrder(view, other),
      ...compareConnections(view, other),
    )
  }
  for (const view of archiViews.values()) {
    differences.push({
      view: view.id,
      drawing: view.id,
      field: 'extra',
      ours: undefined,
      archi: view.name,
    })
  }
  return [...differences, ...compareDrawn(ours, archi)]
}

function compareViewFields(
  ours: View,
  archi: View,
  oursModel: Workspace,
  archiModel: Workspace,
): ViewDifference[] {
  const differences: ViewDifference[] = []
  const push = (field: string, a: unknown, b: unknown) => {
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      differences.push({ view: ours.id, drawing: ours.id, field, ours: a, archi: b })
    }
  }
  push('name', ours.name, archi.name)
  push('documentation', ours.documentation, archi.documentation)
  push('viewpoint', ours.viewpoint, archi.viewpoint)
  push('properties', sortedEntries(ours.properties), sortedEntries(archi.properties))
  // Archi gives the folders it imports ids of its own, so a folder is compared by its path.
  push('folder', folderPath(oursModel, ours.folder), folderPath(archiModel, archi.folder))
  return differences
}

function sortedEntries(record: Record<string, unknown>): [string, unknown][] {
  return Object.entries(record).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
}

/** A folder's names from its group down, or `undefined` for none. */
function folderPath(workspace: Workspace, id: string | undefined): string[] | undefined {
  if (id === undefined) return undefined
  const folders = new Map(workspace.folders.map((folder) => [folder.id, folder]))
  const path: string[] = []
  const seen = new Set<string>()
  let folder = folders.get(id)
  while (folder && !seen.has(folder.id)) {
    seen.add(folder.id)
    path.unshift(folder.name)
    if (folder.parent === undefined) {
      if (folder.root !== undefined) path.unshift(folder.root)
      break
    }
    folder = folders.get(folder.parent)
  }
  return path
}

function compareNodes(ours: View, archi: View): ViewDifference[] {
  const differences: ViewDifference[] = []
  const push = (drawing: string, field: string, a: unknown, b: unknown) =>
    differences.push({ view: ours.id, drawing, field, ours: a, archi: b })
  const theirs = new Map(archi.nodes.map((node) => [node.id, node]))
  for (const node of ours.nodes) {
    const other = theirs.get(node.id)
    theirs.delete(node.id)
    if (!other) {
      push(node.id, 'missing', describeNode(node), undefined)
      continue
    }
    if (describeNode(node) !== describeNode(other)) {
      push(node.id, 'draws', describeNode(node), describeNode(other))
    }
    const a = absoluteBounds(ours, node.id)
    const b = absoluteBounds(archi, other.id)
    if (!sameBounds(a, b)) push(node.id, 'bounds', a, b)
    if (node.parent !== other.parent) push(node.id, 'parent', node.parent, other.parent)
    for (const d of compareAppearance(node.appearance, other.appearance)) {
      push(node.id, d.field, d.ours, d.archi)
    }
  }
  for (const node of theirs.values()) push(node.id, 'extra', undefined, describeNode(node))
  return differences
}

/**
 * Drawing order: each parent's children, in the order they are drawn. Only the
 * children both sides have are compared, so a missing or extra drawing is
 * reported once, as itself. The flat order of `view.nodes` is not compared:
 * Archi saves a tree, so siblings under different parents interleave
 * differently and are drawn the same.
 */
function compareOrder(ours: View, archi: View): ViewDifference[] {
  const differences: ViewDifference[] = []
  const both = new Set(archi.nodes.map((node) => node.id))
  const inOurs = new Set(ours.nodes.map((node) => node.id))
  const children = (view: View, keep: Set<string>) => {
    const byParent = new Map<string, string[]>()
    for (const node of view.nodes) {
      if (!keep.has(node.id)) continue
      const parent = node.parent ?? ours.id
      byParent.set(parent, [...(byParent.get(parent) ?? []), node.id])
    }
    return byParent
  }
  const a = children(ours, both)
  const b = children(archi, inOurs)
  for (const [parent, ids] of a) {
    const other = b.get(parent) ?? []
    // Re-parented children are reported as `parent`; order compares the ones both put here.
    const shared = new Set(other)
    const mine = ids.filter((id) => shared.has(id))
    const theirsHere = other.filter((id) => mine.includes(id))
    if (JSON.stringify(mine) !== JSON.stringify(theirsHere)) {
      differences.push({
        view: ours.id,
        drawing: parent,
        field: 'order',
        ours: mine,
        archi: theirsHere,
      })
    }
  }
  return differences
}

function compareConnections(ours: View, archi: View): ViewDifference[] {
  const differences: ViewDifference[] = []
  const push = (drawing: string, field: string, a: unknown, b: unknown) =>
    differences.push({ view: ours.id, drawing, field, ours: a, archi: b })
  const theirs = new Map(archi.connections.map((connection) => [connection.id, connection]))
  for (const connection of ours.connections) {
    const other = theirs.get(connection.id)
    theirs.delete(connection.id)
    if (!other) {
      push(connection.id, 'missing', describeConnection(connection), undefined)
      continue
    }
    if (describeConnection(connection) !== describeConnection(other)) {
      push(connection.id, 'draws', describeConnection(connection), describeConnection(other))
    }
    if (connection.source !== other.source) {
      push(connection.id, 'source', connection.source, other.source)
    }
    if (connection.target !== other.target) {
      push(connection.id, 'target', connection.target, other.target)
    }
    const a = connection.bendpoints ?? []
    const b = other.bendpoints ?? []
    if (JSON.stringify(a) !== JSON.stringify(b)) push(connection.id, 'bendpoints', a, b)
    for (const d of compareAppearance(connection.appearance, other.appearance)) {
      push(connection.id, d.field, d.ours, d.archi)
    }
  }
  for (const connection of theirs.values()) {
    push(connection.id, 'extra', undefined, describeConnection(connection))
  }
  return differences
}

/**
 * The elements and relationships our views draw, held to Archi's: a drawing
 * that matches by id can still draw a different shape or arrow if the concept
 * behind it came out wrong.
 */
function compareDrawn(ours: Workspace, archi: Workspace): ViewDifference[] {
  const differences: ViewDifference[] = []
  const push = (drawing: string, field: string, a: unknown, b: unknown) => {
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      differences.push({ view: '(model)', drawing, field, ours: a, archi: b })
    }
  }
  const elementIds = new Set<string>()
  const relationshipIds = new Set<string>()
  for (const view of ours.views) {
    for (const node of view.nodes) if (node.kind === 'element') elementIds.add(node.element)
    for (const connection of view.connections) {
      if (connection.kind === 'relationship') relationshipIds.add(connection.relationship)
    }
  }
  const archiElements = new Map(archi.elements.map((element) => [element.id, element]))
  for (const element of ours.elements) {
    if (!elementIds.has(element.id)) continue
    const other = archiElements.get(element.id)
    if (!other) {
      push(element.id, 'element.missing', element.type, undefined)
      continue
    }
    push(element.id, 'element.type', element.type, other.type)
    push(element.id, 'element.name', element.name, other.name)
    push(element.id, 'element.junctionKind', element.junctionKind, other.junctionKind)
  }
  const archiRelationships = new Map(archi.relationships.map((r) => [r.id, r]))
  for (const relationship of ours.relationships) {
    if (!relationshipIds.has(relationship.id)) continue
    const other = archiRelationships.get(relationship.id)
    if (!other) {
      push(relationship.id, 'relationship.missing', relationship.type, undefined)
      continue
    }
    push(relationship.id, 'relationship.type', relationship.type, other.type)
    push(relationship.id, 'relationship.name', relationship.name, other.name)
    push(relationship.id, 'relationship.source', relationship.source, other.source)
    push(relationship.id, 'relationship.target', relationship.target, other.target)
    push(relationship.id, 'relationship.isDirected', relationship.isDirected, other.isDirected)
    push(relationship.id, 'relationship.modifier', relationship.modifier, other.modifier)
  }
  return differences
}

/** What a node draws, as one comparable string; JSON, so no id can impersonate a separator. */
function describeNode(node: ViewNode): string {
  switch (node.kind) {
    case 'element':
      return JSON.stringify(['element', node.element])
    case 'note':
      return JSON.stringify(['note', node.text])
    case 'group':
      return JSON.stringify(['group', node.name, node.documentation ?? null])
    case 'view-ref':
      return JSON.stringify(['view-ref', node.view])
  }
}

/** What a connection draws, and between which nodes. */
function describeConnection(connection: ViewConnection): string {
  const what =
    connection.kind === 'relationship'
      ? ['relationship', connection.relationship]
      : ['line', connection.name ?? null]
  return JSON.stringify([...what, connection.source, connection.target])
}

function sameBounds(a: Bounds | undefined, b: Bounds | undefined): boolean {
  return (
    a !== undefined &&
    b !== undefined &&
    a.x === b.x &&
    a.y === b.y &&
    a.width === b.width &&
    a.height === b.height
  )
}

const APPEARANCE_FIELDS: readonly (keyof Appearance)[] = [
  'fillColor',
  'lineColor',
  'lineWidth',
  'fontName',
  'fontSize',
  'fontColor',
  'fontStyle',
  'textAlignment',
  'textPosition',
]

function compareAppearance(
  ours: Appearance | undefined,
  archi: Appearance | undefined,
): { field: string; ours: unknown; archi: unknown }[] {
  const differences: { field: string; ours: unknown; archi: unknown }[] = []
  for (const field of APPEARANCE_FIELDS) {
    const a = ours?.[field]
    const b = archi?.[field]
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      differences.push({ field: `appearance.${field}`, ours: a, archi: b })
    }
  }
  return differences
}

// ── What Archi's own code accounts for ───────────────────────────────────────

/**
 * Why a difference is Archi's doing and not a fault in what Archipelago wrote,
 * or `undefined` when nothing accounts for it. Each reason is read from Archi
 * 5.10's `XMLModelImporter` (with `javap`) or from the exchange format itself.
 * Each is a predicate on the **values** Archi produces, not on the field name:
 * Archi's default is the only value its import can give a field it was not
 * told, so any other value is still a difference (#139 review).
 */
export function explainDifference(
  difference: ViewDifference,
  ours: Workspace,
  archi: Workspace,
): string | undefined {
  const { field } = difference
  const mine = drawingIn(ours, difference)
  const node = mine !== undefined && 'bounds' in mine ? mine : undefined
  if (field === 'appearance.textAlignment' || field === 'appearance.textPosition') {
    const defaults =
      field === 'appearance.textAlignment' ? ARCHI_TEXT_ALIGNMENT : ARCHI_TEXT_POSITION
    if (!node || !(node.kind in defaults)) return undefined
    return difference.archi === defaults[node.kind] ? CARRIED_ONLY : undefined
  }
  if (field === 'appearance.fontStyle' && onlyStrikethroughLost(difference)) return CARRIED_ONLY
  if (field === 'appearance.lineWidth' && node && difference.archi === undefined) {
    return NODE_LINE_WIDTH
  }
  if (
    field === 'appearance.fontName' &&
    difference.ours === undefined &&
    typeof difference.archi === 'string' &&
    wroteFont(mine?.appearance)
  ) {
    return DEFAULT_FONT_NAME
  }
  if (
    (field === 'appearance.fillColor' || field === 'appearance.lineColor') &&
    samePercentAlpha(difference.ours, difference.archi)
  ) {
    return ALPHA_PERCENT
  }
  if (field === 'extra' && isNestedConnection(difference, archi)) return NESTED_CONNECTION
  return undefined
}

/**
 * What our reader makes of the text alignment Archi gives an object it was not
 * told one for, by kind: measured from `claims-edited.archi.archimate`, where
 * Archi writes `textAlignment="1"` (left) on groups and notes and nothing,
 * which is centre, on element shapes. A kind not measured is not explained.
 */
const ARCHI_TEXT_ALIGNMENT: Partial<Record<ViewNodeKind, string | undefined>> = {
  element: undefined,
  group: 'left',
  note: 'left',
}
/** The same for text position: Archi writes none, which is its default, top. */
const ARCHI_TEXT_POSITION: Partial<Record<ViewNodeKind, string | undefined>> = {
  element: undefined,
}

export const CARRIED_ONLY =
  'The exchange format has no text alignment, text position or strikethrough. Archipelago carries them in archipelago.style, which Archi keeps and does not draw, so Archi shows its own default: the text visibly moves.'
export const NODE_LINE_WIDTH =
  "Archi's exchange import does not read a shape's lineWidth: XMLModelImporter.addNodeStyle reads fillColor, lineColor and font only (addConnectionStyle does read it)."
export const DEFAULT_FONT_NAME =
  "A <font> with no name takes the name of the user's default view font: XMLModelImporter.addFont starts from FontFactory.getDefaultUserViewFontData and replaces only what the file says. Archi draws the same font; its save names the machine's."
export const ALPHA_PERCENT =
  'The exchange format holds alpha as a whole percent, and Archi reads it as round(a × 255 / 100), so an alpha byte comes back as the nearest byte a percent can name.'
export const NESTED_CONNECTION =
  "Archi's exchange import draws every relationship between a shape and the shape it is nested in (XMLModelImporter.addNestedConnections). Archi hides such connections when drawing; #96 does the same."

function drawingIn(
  workspace: Workspace,
  difference: ViewDifference,
): ViewNode | ViewConnection | undefined {
  const view = workspace.views.find((v) => v.id === difference.view)
  return (
    view?.nodes.find((node) => node.id === difference.drawing) ??
    view?.connections.find((connection) => connection.id === difference.drawing)
  )
}

/**
 * Whether our writer wrote a `<font>` for this appearance: a size, a colour, or
 * a style the format can say. Strikethrough alone is carried, not written.
 */
function wroteFont(appearance: Appearance | undefined): boolean {
  if (!appearance) return false
  return (
    appearance.fontSize !== undefined ||
    appearance.fontColor !== undefined ||
    (appearance.fontStyle ?? []).some((style) => style !== 'strikethrough')
  )
}

function onlyStrikethroughLost({ ours, archi }: ViewDifference): boolean {
  const a = (ours as string[] | undefined) ?? []
  const b = (archi as string[] | undefined) ?? []
  const kept = a.filter((style) => style !== 'strikethrough')
  return a.includes('strikethrough') && JSON.stringify(kept) === JSON.stringify(b)
}

/** Called on two values that differ: the same colour, with alphas that are the same whole percent. */
function samePercentAlpha(ours: unknown, archi: unknown): boolean {
  if (typeof ours !== 'string' || typeof archi !== 'string') return false
  if (ours.slice(0, 7) !== archi.slice(0, 7)) return false
  const alpha = (hex: string) => (hex.length === 9 ? parseInt(hex.slice(7), 16) : 255)
  const percent = (byte: number) => Math.round((byte * 100) / 255)
  return percent(alpha(ours)) === percent(alpha(archi))
}

/**
 * A connection Archi added between a shape and the element shape it sits in,
 * drawing a relationship between their two elements, in either direction.
 */
function isNestedConnection(difference: ViewDifference, archi: Workspace): boolean {
  const view = archi.views.find((v) => v.id === difference.view)
  const connection = view?.connections.find((c) => c.id === difference.drawing)
  if (!view || connection?.kind !== 'relationship') return false
  const relationship = archi.relationships.find((r) => r.id === connection.relationship)
  const nodes = new Map(view.nodes.map((node) => [node.id, node]))
  const source = nodes.get(connection.source)
  const target = nodes.get(connection.target)
  if (source?.kind !== 'element' || target?.kind !== 'element' || !relationship) return false
  const nested = source.parent === target.id || target.parent === source.id
  return nested && relationship.source === source.element && relationship.target === target.element
}
