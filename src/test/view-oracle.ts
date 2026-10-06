import { importArchimate } from '@/io/archimate-native'
import { STYLE_KEY } from '@/io/exchange-views'
import {
  absoluteBounds,
  type Appearance,
  type View,
  type ViewConnection,
  type ViewNode,
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
  view: string
  /** Node or connection id; the view's own id for a whole missing view. */
  drawing: string
  /** What differs: `missing`, `extra`, `kind`, `draws`, `bounds`, `parent`, `source`, `target`, `bendpoints`, or `appearance.<field>`. */
  field: string
  ours: unknown
  archi: unknown
}

/**
 * Read Archi's save as Archi itself sees it. Archipelago carries what the
 * exchange format cannot say (text alignment and position, strikethrough) in
 * the `archipelago.style` view property; Archi keeps that property and draws
 * none of it, so it is removed before reading, or the comparison would credit
 * Archi with what only Archipelago reads.
 */
export function readArchiSave(archimate: string): Workspace {
  const key = STYLE_KEY.replace(/\./g, '\\.')
  const withoutCarried = archimate.replace(
    new RegExp(`\\s*<property key="${key}" value="[^"]*"/>`, 'g'),
    '',
  )
  const result = importArchimate(withoutCarried)
  if (!result.workspace) {
    throw new Error(`Archi's save did not import: ${result.problems.map((p) => p.code).join(', ')}`)
  }
  return result.workspace
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
    differences.push(...compareNodes(view, other), ...compareConnections(view, other))
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
  return differences
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
    if (node.kind !== other.kind) {
      push(node.id, 'kind', node.kind, other.kind)
      continue
    }
    if (describeNode(node) !== describeNode(other)) {
      push(node.id, 'draws', describeNode(node), describeNode(other))
    }
    const a = absoluteBounds(ours, node.id)
    const b = absoluteBounds(archi, other.id)
    if (!sameBounds(a, b)) push(node.id, 'bounds', a, b)
    if (node.parent !== other.parent) push(node.id, 'parent', node.parent, other.parent)
    differences.push(
      ...compareAppearance(node.appearance, other.appearance).map((d) => ({
        view: ours.id,
        drawing: node.id,
        ...d,
      })),
    )
  }
  for (const node of theirs.values()) push(node.id, 'extra', undefined, describeNode(node))
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
    if (connection.kind !== other.kind) {
      push(connection.id, 'kind', connection.kind, other.kind)
      continue
    }
    if (describeConnection(connection) !== describeConnection(other)) {
      push(connection.id, 'draws', describeConnection(connection), describeConnection(other))
    }
    if (connection.source !== other.source)
      push(connection.id, 'source', connection.source, other.source)
    if (connection.target !== other.target)
      push(connection.id, 'target', connection.target, other.target)
    const a = connection.bendpoints ?? []
    const b = other.bendpoints ?? []
    if (JSON.stringify(a) !== JSON.stringify(b)) push(connection.id, 'bendpoints', a, b)
    differences.push(
      ...compareAppearance(connection.appearance, other.appearance).map((d) => ({
        view: ours.id,
        drawing: connection.id,
        ...d,
      })),
    )
  }
  for (const connection of theirs.values()) {
    push(connection.id, 'extra', undefined, describeConnection(connection))
  }
  return differences
}

/** What a node draws, as one comparable string. */
function describeNode(node: ViewNode): string {
  switch (node.kind) {
    case 'element':
      return `element ${node.element}`
    case 'note':
      return `note ${JSON.stringify(node.text)}`
    case 'group':
      return `group ${JSON.stringify(node.name)}`
    case 'view-ref':
      return `view-ref ${node.view}`
  }
}

/** What a connection draws, and between which nodes. */
function describeConnection(connection: ViewConnection): string {
  const what =
    connection.kind === 'relationship'
      ? `relationship ${connection.relationship}`
      : `line ${JSON.stringify(connection.name ?? '')}`
  return `${what} ${connection.source} → ${connection.target}`
}

function sameBounds(a: ReturnType<typeof absoluteBounds>, b: ReturnType<typeof absoluteBounds>) {
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
 * 5.10's `XMLModelImporter` (with `javap`) or from the exchange format itself,
 * and each one is a property of the format or of Archi's reader. None of them is
 * a tolerance.
 */
export function explainDifference(
  difference: ViewDifference,
  ours: Workspace,
  archi: Workspace,
): string | undefined {
  const { field } = difference
  if (field === 'appearance.textAlignment' || field === 'appearance.textPosition') {
    return CARRIED_ONLY
  }
  if (field === 'appearance.fontStyle' && onlyStrikethroughLost(difference)) return CARRIED_ONLY
  if (
    field === 'appearance.lineWidth' &&
    isNode(ours, difference) &&
    difference.archi === undefined
  ) {
    return NODE_LINE_WIDTH
  }
  if (
    field === 'appearance.fontName' &&
    difference.ours === undefined &&
    typeof difference.archi === 'string'
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

export const CARRIED_ONLY =
  'The exchange format has no text alignment, text position or strikethrough. Archipelago carries them in archipelago.style, which Archi keeps and does not draw.'
export const NODE_LINE_WIDTH =
  "Archi's exchange import does not read a shape's lineWidth: XMLModelImporter.addNodeStyle reads fillColor, lineColor and font only (addConnectionStyle does read it)."
export const DEFAULT_FONT_NAME =
  "A <font> with no name takes the name of the user's default view font: XMLModelImporter.addFont starts from FontFactory.getDefaultUserViewFontData and replaces only what the file says. Archi draws the same font; its save names the machine's."
export const ALPHA_PERCENT =
  'The exchange format holds alpha as a whole percent, and Archi reads it as round(a × 255 / 100), so an alpha byte comes back as the nearest byte a percent can name.'
export const NESTED_CONNECTION =
  "Archi's exchange import draws every relationship between a shape and the shape it is nested in (XMLModelImporter.addNestedConnections). Archi hides such connections when drawing; #96 does the same."

function isNode(workspace: Workspace, difference: ViewDifference): boolean {
  const view = workspace.views.find((v) => v.id === difference.view)
  return view?.nodes.some((node) => node.id === difference.drawing) ?? false
}

function onlyStrikethroughLost({ ours, archi }: ViewDifference): boolean {
  const a = (ours as string[] | undefined) ?? []
  const b = (archi as string[] | undefined) ?? []
  const kept = a.filter((style) => style !== 'strikethrough')
  return a.includes('strikethrough') && JSON.stringify(kept) === JSON.stringify(b.length ? b : [])
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
