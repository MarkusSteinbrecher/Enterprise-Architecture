import {
  FOLDER_ROOTS,
  FOLDER_ROOT_LABELS,
  TEXT_ALIGNMENTS,
  TEXT_POSITIONS,
  absoluteBounds,
  defaultFolderRoot,
  findElementType,
  type Appearance,
  type Element,
  type Folder,
  type FolderRoot,
  type FontStyle,
  type Point,
  type PropertyValue,
  type Relationship,
  type TextAlignment,
  type TextPosition,
  type View,
  type ViewConnection,
  type ViewNode,
} from '@/model'
import { isExchangeSafeId } from '@/store/ids'
import { problem, type ImportProblem } from './problems'
import { defaultNodeSize } from './default-sizes'
import {
  asString,
  attr,
  claimIdentifier,
  langString,
  list,
  listed,
  text,
  type RawNode,
} from './exchange-xml'

/**
 * Diagrams (`<views><diagrams>`) and folders (`<organizations>`) in the Open
 * Group exchange format (#76, modelling concept §2.3).
 *
 * Three translations happen at this boundary, each documented in `io/README.md`:
 *
 * 1. **Coordinates.** The format places every node absolutely; we place nodes
 *    relative to their parent, as Archi does internally. Bend-points are
 *    absolute on both sides. The format wants non-negative integers, so a view
 *    that has drifted negative or fractional is shifted or rounded on the way
 *    out — with a problem saying so.
 * 2. **Appearance.** Archi writes its *whole* computed style on every node —
 *    the type's default fill, a grey outline, the platform font. Read literally,
 *    every imported shape would be frozen in Archi's palette and ignore our
 *    theme. So a style value equal to Archi's default for that kind of object
 *    is read as "no override", and only real overrides are kept. The defaults
 *    below were measured from Archi 5.10's own export, not recalled.
 * 3. **Folders.** Archi writes folder items without identifiers and names its
 *    top-level folders after the fixed groups ("Business", "Relations",
 *    "Views", …). Those become our top-level groups; every other item becomes a
 *    folder, with an id derived from its label path so that importing the same
 *    file twice produces the same ids.
 */

// ── Archi's defaults ─────────────────────────────────────────────────────────

type Rgb = readonly [number, number, number]

const BLACK: Rgb = [0, 0, 0]
const NODE_LINE: Rgb = [92, 92, 92]
const LAYER_FILL: Record<string, Rgb> = {
  strategy: [245, 222, 170],
  business: [255, 255, 181],
  application: [181, 255, 255],
  technology: [201, 231, 183],
  physical: [201, 231, 183],
  motivation: [204, 204, 255],
  implementation: [255, 224, 224],
}
const TYPE_FILL: Record<string, Rgb> = {
  Location: [237, 207, 226],
  Grouping: [255, 255, 255],
  Junction: [0, 0, 0],
}
const GROUP_FILL: Rgb = [210, 215, 215]
const NOTE_FILL: Rgb = [255, 255, 255]
const VIEW_REF_FILL: Rgb = [220, 235, 235]

interface StyleDefaults {
  fill?: Rgb
  line?: Rgb
  font?: Rgb
}

/** For a style Archipelago wrote: every value in it is an override. */
const NO_DEFAULTS: StyleDefaults = {}

function nodeDefaults(node: ViewNode, elements: ReadonlyMap<string, Element>): StyleDefaults {
  switch (node.kind) {
    case 'group':
      return { fill: GROUP_FILL, line: NODE_LINE, font: BLACK }
    case 'note':
      return { fill: NOTE_FILL, line: NODE_LINE, font: BLACK }
    case 'view-ref':
      return { fill: VIEW_REF_FILL, line: NODE_LINE, font: BLACK }
    case 'element': {
      const element = elements.get(node.element)
      if (!element) return { line: NODE_LINE, font: BLACK }
      const meta = findElementType(element.type)
      const fill = TYPE_FILL[element.type] ?? (meta ? LAYER_FILL[meta.layer] : undefined)
      return {
        ...(fill ? { fill } : {}),
        line: element.type === 'Junction' ? BLACK : NODE_LINE,
        font: BLACK,
      }
    }
  }
}

const CONNECTION_DEFAULTS: StyleDefaults = { line: BLACK, font: BLACK }

// ── Carried style ────────────────────────────────────────────────────────────

/**
 * What `<style>` cannot say, carried in one namespaced property per view as
 * canonical JSON keyed by the ids shapes and lines have in the file — the same
 * answer #36 gave saved reports. A tool that does not know Archipelago shows
 * one extra property on the view and hands it back untouched. Two things go in it:
 *
 * - **Text alignment, text position and strikethrough**, which the format's
 *   style has no attribute for.
 * - **`literal`**: this `<style>` was written by Archipelago and holds only real
 *   overrides. The reader normally drops values equal to Archi's defaults,
 *   because Archi writes its whole style on every object; on a style we wrote,
 *   that would discard an override someone chose — black text, say, which is
 *   Archi's default and not ours in a dark theme.
 */
export const STYLE_KEY = 'archipelago.style'

interface CarriedStyle {
  literal?: true
  textAlignment?: TextAlignment
  textPosition?: TextPosition
  strikethrough?: true
}

function carriedStyle(item: ViewNode | ViewConnection): CarriedStyle | undefined {
  const appearance = item.appearance
  if (!appearance) return undefined
  const carried: CarriedStyle = {}
  if (writeStyle(appearance, '').length) carried.literal = true
  if (appearance.textAlignment) carried.textAlignment = appearance.textAlignment
  if (appearance.textPosition) carried.textPosition = appearance.textPosition
  if (appearance.fontStyle?.includes('strikethrough')) carried.strikethrough = true
  return Object.keys(carried).length ? carried : undefined
}

function carriedStyleJson(
  items: readonly (ViewNode | ViewConnection)[],
  idOf: (id: string) => string,
): string | undefined {
  const entries: (CarriedStyle & { id: string })[] = []
  for (const item of items) {
    const carried = carriedStyle(item)
    if (carried) entries.push({ id: idOf(item.id), ...carried })
  }
  if (!entries.length) return undefined
  entries.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  return JSON.stringify(entries, [
    'id',
    'literal',
    'strikethrough',
    'textAlignment',
    'textPosition',
  ])
}

/** Whether a view carries a style property, so its definition can be declared up front. */
export function carriesStyle(view: View): boolean {
  return [...view.nodes, ...view.connections].some((item) => carriedStyle(item) !== undefined)
}

export interface CarriedEntries {
  entries: Map<string, Record<string, unknown>>
  unread: number
}

/** The carried style entries, by file id. Malformed entries are counted, not thrown. */
export function readCarriedStyle(raw: PropertyValue | undefined): CarriedEntries {
  const entries = new Map<string, Record<string, unknown>>()
  if (raw === undefined) return { entries, unread: 0 }
  let parsed: unknown
  try {
    parsed = typeof raw === 'string' ? JSON.parse(raw) : undefined
  } catch {
    parsed = undefined
  }
  if (!Array.isArray(parsed)) return { entries, unread: 1 }
  let unread = 0
  for (const entry of parsed) {
    const record = entry as Record<string, unknown> | null
    if (record && typeof record === 'object' && typeof record.id === 'string') {
      entries.set(record.id, record)
    } else unread += 1
  }
  return { entries, unread }
}

/** Apply the carried text settings to the shapes and lines they name. */
export function applyCarriedStyle(
  view: View,
  carried: CarriedEntries,
  problems: ImportProblem[],
  at: { file?: string; subject: string },
): void {
  const items = new Map<string, ViewNode | ViewConnection>(
    [...view.nodes, ...view.connections].map((item) => [item.id, item]),
  )
  let unread = carried.unread
  for (const [id, record] of carried.entries) {
    const item = items.get(id)
    if (!item) {
      unread += 1
      continue
    }
    const appearance: Appearance = { ...item.appearance }
    if ((TEXT_ALIGNMENTS as readonly unknown[]).includes(record.textAlignment)) {
      appearance.textAlignment = record.textAlignment as TextAlignment
    }
    if ((TEXT_POSITIONS as readonly unknown[]).includes(record.textPosition)) {
      appearance.textPosition = record.textPosition as TextPosition
    }
    if (record.strikethrough === true) {
      appearance.fontStyle = [...(appearance.fontStyle ?? []), 'strikethrough']
    }
    if (Object.keys(appearance).length) item.appearance = appearance
  }
  if (unread) {
    problems.push(
      problem(
        'warning',
        'exchange.carried-unreadable',
        `View "${view.name}": ${unread} carried style entr${unread === 1 ? 'y' : 'ies'} could not be applied and ${unread === 1 ? 'was' : 'were'} dropped.`,
        at,
      ),
    )
  }
}

// ── Reading ──────────────────────────────────────────────────────────────────

export interface ViewReadContext {
  elements: ReadonlyMap<string, Element>
  relationships: ReadonlyMap<string, Relationship>
  readProperties: (raw: RawNode) => Record<string, PropertyValue>
  problems: ImportProblem[]
  where: { file?: string }
}

/** Counted across the file and reported once each, so a big file says it in one line. */
interface Tally {
  attachments: number
  onConnections: number
  defaultSized: number
}

export function readViews(model: RawNode, context: ViewReadContext): View[] {
  const raws = list((model.views as RawNode | undefined)?.diagrams).flatMap((diagrams) =>
    list(diagrams.view),
  )
  const viewIds = new Set(raws.map((raw) => asString(raw['@identifier'])).filter(isString))
  const font = dominantFont(raws)
  const tally: Tally = { attachments: 0, onConnections: 0, defaultSized: 0 }
  // A connection may end on another connection (the format allows it, Archi
  // draws it). The IDREF does not say which it points at, so collect them.
  const connectionIds = new Set(
    raws
      .flatMap((raw) => list(raw.connection).map((c) => asString(c['@identifier'])))
      .filter(isString),
  )

  const views: View[] = []
  const seen = new Set<string>()
  for (const raw of raws) {
    const view = readView(raw, viewIds, connectionIds, font, tally, context)
    if (!view) continue
    if (seen.has(view.id)) {
      context.problems.push(
        problem(
          'warning',
          'exchange.duplicate-view-id',
          `Two views share the identifier "${view.id}"; the later one was skipped.`,
          { ...context.where, subject: view.id },
        ),
      )
      continue
    }
    seen.add(view.id)
    views.push(view)
  }

  if (tally.attachments) {
    context.problems.push(
      problem(
        'info',
        'exchange.connection-attachment-ignored',
        `${tally.attachments} connection end${tally.attachments === 1 ? '' : 's'} carried a fixed attachment point. Archipelago attaches connections at the shape outline, so ${tally.attachments === 1 ? 'that end' : 'those ends'} may be drawn slightly differently.`,
        context.where,
      ),
    )
  }
  if (tally.defaultSized) {
    context.problems.push(
      problem(
        'info',
        'exchange.default-size',
        `${tally.defaultSized} shape${tally.defaultSized === 1 ? ' has' : 's have'} no size in the file (Archi exports a shape left at its default size as -1). ${tally.defaultSized === 1 ? 'It was' : 'They were'} drawn at Archi's standard defaults (120 × 55 for an element).`,
        context.where,
      ),
    )
  }
  if (tally.onConnections) {
    context.problems.push(
      problem(
        'warning',
        'exchange.connection-on-connection',
        `${tally.onConnections} connection${tally.onConnections === 1 ? '' : 's'} ended on another connection rather than on a shape. Archipelago does not draw those yet, so ${tally.onConnections === 1 ? 'it was' : 'they were'} skipped.`,
        context.where,
      ),
    )
  }
  return views
}

function readView(
  raw: RawNode,
  viewIds: ReadonlySet<string>,
  fileConnectionIds: ReadonlySet<string>,
  font: FontKey | undefined,
  tally: Tally,
  context: ViewReadContext,
): View | undefined {
  const { problems, where } = context
  const id = asString(raw['@identifier'])
  if (!id) {
    problems.push(
      problem(
        'warning',
        'exchange.view-no-id',
        'A <view> has no identifier and was skipped.',
        where,
      ),
    )
    return undefined
  }
  const at = { ...where, subject: id }
  const type = asString(raw['@type'])
  if (type !== undefined && type !== 'Diagram') {
    problems.push(
      problem(
        'warning',
        'exchange.view-type-unsupported',
        `View "${id}" is a ${type}, not a Diagram, and was skipped.`,
        at,
      ),
    )
    return undefined
  }

  const view: View = {
    id,
    name: langString(raw.name) ?? '',
    properties: {},
    nodes: [],
    connections: [],
  }
  const { [STYLE_KEY]: carriedRaw, ...properties } = context.readProperties(raw)
  view.properties = properties
  const carried = readCarriedStyle(carriedRaw)
  const literal = (itemId: string) => carried.entries.get(itemId)?.literal === true
  const documentation = langString(raw.documentation)
  if (documentation) view.documentation = documentation
  const viewpoint = asString(raw['@viewpoint'])
  if (viewpoint) view.viewpoint = viewpoint

  const nodesById = new Map<string, ViewNode>()
  const connectionIds = new Set<string>()
  const skip = (code: string, message: string) =>
    problems.push(problem('warning', code, `View "${view.name || id}": ${message}`, at))

  /**
   * Walk the node tree. Children's coordinates are absolute in the file, so a
   * skipped node's children are simply kept, nested in the skipped node's parent.
   */
  const walk = (raws: RawNode[], parent: Anchor | undefined) => {
    for (const rawNode of raws) {
      let anchor = parent
      const node = readNode(rawNode, parent, viewIds, font, literal, tally, context, skip)
      if (node && nodesById.has(node.id)) {
        skip(
          'exchange.duplicate-node-id',
          `two nodes share the identifier "${node.id}"; the later one was skipped.`,
        )
      } else if (node) {
        nodesById.set(node.id, node)
        view.nodes.push(node)
        anchor = { id: node.id, x: num(rawNode['@x']) ?? 0, y: num(rawNode['@y']) ?? 0 }
      }
      walk(list(rawNode.node), anchor)
    }
  }
  walk(list(raw.node), undefined)

  for (const rawConnection of list(raw.connection)) {
    const connection = readConnection(
      rawConnection,
      nodesById,
      fileConnectionIds,
      font,
      literal,
      tally,
      context,
      skip,
    )
    if (!connection) continue
    if (connectionIds.has(connection.id)) {
      skip(
        'exchange.duplicate-connection-id',
        `two connections share the identifier "${connection.id}"; the later one was skipped.`,
      )
      continue
    }
    connectionIds.add(connection.id)
    view.connections.push(connection)
  }
  applyCarriedStyle(view, carried, problems, at)
  return view
}

/**
 * A connection draws its relationship between drawings of the relationship's own
 * two elements, in its direction, as `validate` requires. One that does not is
 * reported at import rather than left for validation to find (#100).
 */
export function drawsEnds(
  relationship: Relationship,
  source: ViewNode | undefined,
  target: ViewNode | undefined,
): boolean {
  return (
    source?.kind === 'element' &&
    target?.kind === 'element' &&
    source.element === relationship.source &&
    target.element === relationship.target
  )
}

/** A node's id and absolute position: what its children are placed relative to. */
interface Anchor {
  id: string
  x: number
  y: number
}

function readNode(
  raw: RawNode,
  parent: Anchor | undefined,
  viewIds: ReadonlySet<string>,
  font: FontKey | undefined,
  literal: (id: string) => boolean,
  tally: Tally,
  context: ViewReadContext,
  skip: (code: string, message: string) => void,
): ViewNode | undefined {
  const id = asString(raw['@identifier'])
  if (!id) {
    skip('exchange.node-no-id', 'a node has no identifier and was skipped.')
    return undefined
  }
  const x = num(raw['@x'])
  const y = num(raw['@y'])
  const width = num(raw['@w'])
  const height = num(raw['@h'])
  if (x === undefined || y === undefined || width === undefined || height === undefined) {
    skip('exchange.node-no-bounds', `node "${id}" has no position or size and was skipped.`)
    return undefined
  }
  const base = {
    id,
    bounds: { x: x - (parent?.x ?? 0), y: y - (parent?.y ?? 0), width, height },
    ...(parent ? { parent: parent.id } : {}),
  }
  const label = langString(raw.label)

  let node: ViewNode
  const type = asString(raw['@type'])
  switch (type) {
    case 'Element': {
      const elementRef = asString(raw['@elementRef'])
      if (!elementRef || !context.elements.has(elementRef)) {
        skip(
          'exchange.dangling-view-node',
          `node "${id}" draws element "${elementRef ?? '(none)'}", which is not in the file. It was skipped; anything nested in it was kept.`,
        )
        return undefined
      }
      node = { ...base, kind: 'element', element: elementRef }
      break
    }
    case 'Container': {
      node = { ...base, kind: 'group', name: label ?? '' }
      const documentation = langString(raw.documentation)
      if (documentation) node.documentation = documentation
      break
    }
    case 'Label': {
      const viewRef = asString((list(raw.viewRef)[0] ?? {})['@ref'])
      if (viewRef !== undefined && viewIds.has(viewRef)) {
        node = { ...base, kind: 'view-ref', view: viewRef }
      } else {
        if (viewRef !== undefined) {
          skip(
            'exchange.dangling-view-reference',
            `node "${id}" references view "${viewRef}", which is not in the file. It was kept as a note.`,
          )
        }
        node = { ...base, kind: 'note', text: label ?? '' }
        if (raw['@conceptRef'] !== undefined) {
          skip(
            'exchange.label-binding-ignored',
            `label "${id}" is bound to concept "${asString(raw['@conceptRef']) ?? ''}", which Archipelago does not support; its current text was kept as a note.`,
          )
        }
      }
      break
    }
    default:
      skip(
        'exchange.node-type-unsupported',
        `node "${id}" is a ${type ?? '(untyped)'} node, which Archipelago does not draw. It was skipped; anything nested in it was kept.`,
      )
      return undefined
  }

  // Archi writes a default-sized shape as -1 by -1, which its own XSD rejects (#13).
  if (width <= 0 || height <= 0) {
    tally.defaultSized += 1
    const size = defaultNodeSize(
      node.kind,
      node.kind === 'element' ? context.elements.get(node.element)?.type : undefined,
    )
    node.bounds = {
      ...node.bounds,
      width: width > 0 ? width : size.width,
      height: height > 0 ? height : size.height,
    }
  }

  const appearance = literal(id)
    ? readStyle(raw.style, NO_DEFAULTS, undefined)
    : readStyle(raw.style, nodeDefaults(node, context.elements), font)
  if (appearance) node.appearance = appearance
  return node
}

function readConnection(
  raw: RawNode,
  nodesById: ReadonlyMap<string, ViewNode>,
  fileConnectionIds: ReadonlySet<string>,
  font: FontKey | undefined,
  literal: (id: string) => boolean,
  tally: Tally,
  context: ViewReadContext,
  skip: (code: string, message: string) => void,
): ViewConnection | undefined {
  const id = asString(raw['@identifier'])
  const source = asString(raw['@source'])
  const target = asString(raw['@target'])
  if (!id || !source || !target) {
    skip(
      'exchange.connection-incomplete',
      `a connection without an identifier, source or target was skipped.`,
    )
    return undefined
  }
  if (!nodesById.has(source) || !nodesById.has(target)) {
    // Ending on another connection is a known gap; ending on a node that was
    // skipped, or on nothing at all, is a different problem.
    const unknown = [source, target].filter((end) => !nodesById.has(end))
    if (unknown.every((end) => fileConnectionIds.has(end))) tally.onConnections += 1
    else {
      skip(
        'exchange.dangling-view-connection',
        `connection "${id}" ends on "${unknown.join('", "')}", which is not a shape in the view. It was skipped.`,
      )
    }
    return undefined
  }

  const bendpoints: Point[] = []
  for (const point of list(raw.bendpoint)) {
    const x = num(point['@x'])
    const y = num(point['@y'])
    if (x !== undefined && y !== undefined) bendpoints.push({ x, y })
  }
  if (raw.sourceAttachment !== undefined) tally.attachments += 1
  if (raw.targetAttachment !== undefined) tally.attachments += 1

  const base = { id, source, target, ...(bendpoints.length ? { bendpoints } : {}) }
  let connection: ViewConnection
  const type = asString(raw['@type'])
  if (type === 'Relationship' || type === 'NestingRelationship') {
    const relationshipRef = asString(raw['@relationshipRef'])
    const drawn =
      relationshipRef === undefined ? undefined : context.relationships.get(relationshipRef)
    if (!relationshipRef || !drawn) {
      skip(
        'exchange.dangling-view-connection',
        `connection "${id}" draws relationship "${relationshipRef ?? '(none)'}", which is not in the file. It was skipped.`,
      )
      return undefined
    }
    if (!drawsEnds(drawn, nodesById.get(source), nodesById.get(target))) {
      skip(
        'exchange.connection-mismatch',
        `connection "${id}" draws ${drawn.type} relationship "${relationshipRef}" between nodes that do not show its source and target. It was skipped.`,
      )
      return undefined
    }
    connection = { ...base, kind: 'relationship', relationship: relationshipRef }
  } else if (type === 'Line') {
    connection = { ...base, kind: 'line' }
    const name = langString(raw.label)
    if (name) connection.name = name
  } else {
    skip(
      'exchange.connection-type-unsupported',
      `connection "${id}" is a ${type ?? '(untyped)'} connection, which Archipelago does not draw. It was skipped.`,
    )
    return undefined
  }
  const appearance = literal(id)
    ? readStyle(raw.style, NO_DEFAULTS, undefined)
    : readStyle(raw.style, CONNECTION_DEFAULTS, font)
  if (appearance) connection.appearance = appearance
  return connection
}

// ── Style ────────────────────────────────────────────────────────────────────

type FontKey = string

/**
 * The font most of the file is drawn in — the exporting tool's default, which
 * Archi writes on every object. Read as "no override", like the default colours.
 *
 * It has to be on *most objects in the file*, not merely the most common font
 * written: a file that only writes real overrides (ours does) would otherwise
 * have its one override mistaken for the default and dropped.
 */
function dominantFont(views: RawNode[]): FontKey | undefined {
  const counts = new Map<FontKey, number>()
  let objects = 0
  const count = (style: unknown) => {
    objects += 1
    const font = list((style as RawNode | undefined)?.font)[0]
    if (!font) return
    const key = fontKey(font)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const walk = (nodes: RawNode[]) => {
    for (const node of nodes) {
      count(node.style)
      walk(list(node.node))
    }
  }
  for (const view of views) {
    walk(list(view.node))
    for (const connection of list(view.connection)) count(connection.style)
  }
  for (const [key, n] of counts) if (n * 2 > objects) return key
  return undefined
}

function fontKey(font: RawNode): FontKey {
  return JSON.stringify([asString(font['@name']) ?? '', asString(font['@size']) ?? ''])
}

function readStyle(
  raw: unknown,
  defaults: StyleDefaults,
  font: FontKey | undefined,
): Appearance | undefined {
  const style = list(raw)[0]
  if (!style) return undefined
  const appearance: Appearance = {}

  const fill = readColour(list(style.fillColor)[0])
  if (fill && !isDefault(fill, defaults.fill)) appearance.fillColor = hex(fill)
  const line = readColour(list(style.lineColor)[0])
  if (line && !isDefault(line, defaults.line)) appearance.lineColor = hex(line)
  const lineWidth = num(style['@lineWidth'])
  if (lineWidth !== undefined && lineWidth !== 1 && lineWidth > 0) appearance.lineWidth = lineWidth

  const rawFont = list(style.font)[0]
  if (rawFont) {
    if (fontKey(rawFont) !== font) {
      const name = asString(rawFont['@name'])
      const size = num(rawFont['@size'])
      if (name) appearance.fontName = name
      if (size !== undefined && size > 0) appearance.fontSize = size
    }
    const styles = (asString(rawFont['@style']) ?? '')
      .split(/\s+/)
      .filter((s): s is FontStyle => s === 'bold' || s === 'italic' || s === 'underline')
    if (styles.length) appearance.fontStyle = styles
    const colour = readColour(list(rawFont.color)[0])
    if (colour && !isDefault(colour, defaults.font)) appearance.fontColor = hex(colour)
  }
  return Object.keys(appearance).length ? appearance : undefined
}

interface Colour {
  rgb: Rgb
  /** Opacity, 0–100, as the format writes it. */
  alpha: number
}

function readColour(raw: RawNode | undefined): Colour | undefined {
  if (!raw) return undefined
  const r = num(raw['@r'])
  const g = num(raw['@g'])
  const b = num(raw['@b'])
  if (r === undefined || g === undefined || b === undefined) return undefined
  const a = num(raw['@a'])
  return {
    rgb: [clampByte(r), clampByte(g), clampByte(b)],
    alpha: a === undefined ? 100 : Math.min(100, Math.max(0, a)),
  }
}

function isDefault(colour: Colour, fallback: Rgb | undefined): boolean {
  return (
    fallback !== undefined &&
    colour.alpha === 100 &&
    colour.rgb[0] === fallback[0] &&
    colour.rgb[1] === fallback[1] &&
    colour.rgb[2] === fallback[2]
  )
}

/**
 * `#rrggbb`, or `#rrggbbaa` below full opacity. A byte made from a percent comes
 * back as that percent; any other byte (Archi's own 0–255 alpha, read from a
 * `.archimate` file) moves to the nearest whole percent on the way out (#13).
 */
function hex({ rgb, alpha }: Colour): string {
  const byte = (n: number) => n.toString(16).padStart(2, '0')
  const base = `#${rgb.map(byte).join('')}`
  return alpha === 100 ? base : `${base}${byte(Math.round((alpha * 255) / 100))}`
}

function parseHex(value: string): Colour | undefined {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/i.exec(value)
  if (!match) return undefined
  const [, r, g, b, a] = match
  return {
    rgb: [parseInt(r ?? '0', 16), parseInt(g ?? '0', 16), parseInt(b ?? '0', 16)],
    alpha: a === undefined ? 100 : Math.round((parseInt(a, 16) * 100) / 255),
  }
}

// ── Organizations: reading ───────────────────────────────────────────────────

export interface OrganizationsResult {
  folders: Folder[]
  /** Member id → folder id, for elements, relationships and views. */
  membership: Map<string, string>
}

const ROOT_NAMES: ReadonlyMap<string, FolderRoot> = new Map([
  ['strategy', 'strategy'],
  ['business', 'business'],
  ['application', 'application'],
  ['technology', 'technology'],
  ['technologyphysical', 'technology'],
  ['technologyandphysical', 'technology'],
  ['motivation', 'motivation'],
  ['implementationmigration', 'implementation'],
  ['implementationandmigration', 'implementation'],
  ['other', 'other'],
  ['relations', 'relations'],
  ['relationships', 'relations'],
  ['views', 'views'],
  ['diagrams', 'views'],
])

/**
 * Read `<organizations>` into folders and memberships.
 *
 * @param members every element, relationship and view id the file defined, with
 *   the group each belongs in — used to place a top-level folder whose label
 *   names no group.
 */
export function readOrganizations(
  model: RawNode,
  members: ReadonlyMap<string, FolderRoot>,
  problems: ImportProblem[],
  where: { file?: string },
): OrganizationsResult {
  const folders: Folder[] = []
  const membership = new Map<string, string>()
  const usedIds = new Set<string>(members.keys())
  const unknownRefs: string[] = []
  const duplicateRefs: string[] = []
  const placedInGroup = new Set<string>()
  /** Top-level folders whose group has to be inferred from what they hold. */
  const unplaced: Folder[] = []

  const folderId = (item: RawNode, path: readonly string[]): string => {
    const own = asString(item['@identifier'])
    if (own && isExchangeSafeId(own) && !usedIds.has(own)) {
      usedIds.add(own)
      return own
    }
    const slug = path
      .join('-')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    return claimIdentifier(`folder-${slug || 'unnamed'}`, usedIds)
  }

  const walk = (
    items: RawNode[],
    context: {
      root?: FolderRoot | undefined
      folder?: Folder | undefined
      path: readonly string[]
      top: boolean
    },
  ) => {
    for (const item of items) {
      const ref = asString(item['@identifierRef'])
      if (ref !== undefined) {
        if (!members.has(ref)) unknownRefs.push(ref)
        else if (membership.has(ref) || placedInGroup.has(ref)) duplicateRefs.push(ref)
        else if (context.folder) membership.set(ref, context.folder.id)
        else placedInGroup.add(ref)
        walk(list(item.item), { ...context, top: false })
        continue
      }
      const label = langString(item.label) ?? ''
      const root = context.top
        ? ROOT_NAMES.get(label.toLowerCase().replace(/[^a-z]/g, ''))
        : undefined
      if (root) {
        walk(list(item.item), { root, path: [label], top: false })
        continue
      }
      const path = [...context.path, label]
      const folder: Folder = { id: folderId(item, path), name: label }
      const documentation = langString(item.documentation)
      if (documentation) folder.documentation = documentation
      if (context.folder) folder.parent = context.folder.id
      else if (context.root) folder.root = context.root
      else unplaced.push(folder)
      folders.push(folder)
      walk(list(item.item), { root: context.root, folder, path, top: false })
    }
  }
  for (const organizations of list(model.organizations)) {
    walk(list(organizations.item), { path: [], top: true })
  }

  // A top-level folder outside any named group goes where most of what it holds
  // belongs; an empty one goes to Other.
  for (const folder of unplaced) {
    const counts = new Map<FolderRoot, number>()
    const inside = descendants(folder.id, folders)
    for (const [member, holder] of membership) {
      if (!inside.has(holder)) continue
      const root = members.get(member)
      if (root) counts.set(root, (counts.get(root) ?? 0) + 1)
    }
    let best: FolderRoot = 'other'
    let bestCount = 0
    for (const root of FOLDER_ROOTS) {
      const n = counts.get(root) ?? 0
      if (n > bestCount) {
        best = root
        bestCount = n
      }
    }
    folder.root = best
    problems.push(
      problem(
        'info',
        'exchange.folder-group-inferred',
        `Folder "${folder.name}" is not inside any of the standard groups, so it was placed under ${FOLDER_ROOT_LABELS[best]}${bestCount ? ', where most of its contents belong' : ''}.`,
        { ...where, subject: folder.id },
      ),
    )
  }

  if (unknownRefs.length) {
    problems.push(
      problem(
        'warning',
        'exchange.organization-unknown-ref',
        `The folder structure lists ${unknownRefs.length} item${unknownRefs.length === 1 ? '' : 's'} that ${unknownRefs.length === 1 ? 'is' : 'are'} not in the file (${listed(unknownRefs)}); ${unknownRefs.length === 1 ? 'it was' : 'they were'} ignored.`,
        where,
      ),
    )
  }
  if (duplicateRefs.length) {
    problems.push(
      problem(
        'warning',
        'exchange.organization-duplicate-ref',
        `${duplicateRefs.length} item${duplicateRefs.length === 1 ? ' is' : 's are'} filed in more than one place (${listed(duplicateRefs)}); the first place was kept.`,
        where,
      ),
    )
  }
  return { folders, membership }
}

function descendants(id: string, folders: readonly Folder[]): Set<string> {
  const out = new Set([id])
  let grew = true
  while (grew) {
    grew = false
    for (const folder of folders) {
      if (folder.parent !== undefined && out.has(folder.parent) && !out.has(folder.id)) {
        out.add(folder.id)
        grew = true
      }
    }
  }
  return out
}

/** The group each element, relationship and view of a file belongs in. */
export function memberGroups(
  elements: readonly Element[],
  relationships: readonly Relationship[],
  views: readonly View[],
): Map<string, FolderRoot> {
  const out = new Map<string, FolderRoot>()
  for (const element of elements) {
    const meta = findElementType(element.type)
    out.set(element.id, meta ? defaultFolderRoot(meta.layer) : 'other')
  }
  for (const relationship of relationships) out.set(relationship.id, 'relations')
  for (const view of views) out.set(view.id, 'views')
  return out
}

// ── Writing ──────────────────────────────────────────────────────────────────

export interface ViewWriteContext {
  /** The written xs:ID of an element, relationship or view. */
  of: (id: string) => string
  /** Whether an element or relationship made it into the file. */
  written: (id: string) => boolean
  /** A fresh xs:ID close to `base`. */
  claim: (base: string) => string
  elements: ReadonlyMap<string, Element>
  propertyLines: (properties: Record<string, PropertyValue>, indent: number) => string[]
  problems: ImportProblem[]
}

/** `<views>`, or nothing when the workspace has no views. */
export function writeViews(views: readonly View[], context: ViewWriteContext): string[] {
  if (!views.length) return []
  const names = new Map(views.map((view) => [view.id, view.name]))
  const lines = ['  <views>', '    <diagrams>']
  for (const view of views) lines.push(...writeView(view, names, context))
  lines.push('    </diagrams>', '  </views>')
  return lines
}

function writeView(
  view: View,
  names: ReadonlyMap<string, string>,
  context: ViewWriteContext,
): string[] {
  const { problems } = context
  const subject = { subject: view.id }
  const lines: string[] = []
  const viewpoint = view.viewpoint ? ` viewpoint="${attr(view.viewpoint)}"` : ''
  lines.push(
    `      <view identifier="${attr(context.of(view.id))}" xsi:type="Diagram"${viewpoint}>`,
  )
  lines.push(`        <name xml:lang="en">${text(view.name)}</name>`)
  if (view.documentation) {
    lines.push(`        <documentation xml:lang="en">${text(view.documentation)}</documentation>`)
  }
  // Drawings of what did not make it into the file cannot be referenced.
  const dropped = new Set<string>()
  for (const node of view.nodes) {
    if (node.kind === 'element' && !context.written(node.element)) dropped.add(node.id)
  }
  const connections = view.connections.filter(
    (connection) =>
      !dropped.has(connection.source) &&
      !dropped.has(connection.target) &&
      (connection.kind !== 'relationship' || context.written(connection.relationship)),
  )
  const lostConnections = view.connections.length - connections.length
  if (dropped.size || lostConnections) {
    problems.push(
      problem(
        'warning',
        'exchange.view-drawing-dropped',
        `View "${view.name}": ${dropped.size} shape${dropped.size === 1 ? '' : 's'} and ${lostConnections} connection${lostConnections === 1 ? '' : 's'} draw something that is not in the file, and were left out.`,
        subject,
      ),
    )
  }

  // Absolute, integral, non-negative: what the format accepts.
  const nodes = view.nodes.filter((node) => !dropped.has(node.id))
  const absolute = new Map(
    nodes.map((node) => [node.id, absoluteBounds(view, node.id) ?? node.bounds]),
  )
  const points = connections.flatMap((connection) => connection.bendpoints ?? [])
  const xs = [...[...absolute.values()].map((b) => b.x), ...points.map((p) => p.x)]
  const ys = [...[...absolute.values()].map((b) => b.y), ...points.map((p) => p.y)]
  const dx = Math.max(0, -Math.min(0, ...xs))
  const dy = Math.max(0, -Math.min(0, ...ys))
  if (dx || dy) {
    problems.push(
      problem(
        'info',
        'exchange.view-shifted',
        `View "${view.name}" extends above or left of the origin, which the format cannot express; it was moved ${Math.ceil(dx)} right and ${Math.ceil(dy)} down.`,
        subject,
      ),
    )
  }
  let rounded = false
  const int = (n: number, min: number) => {
    const value = Math.max(min, Math.round(n))
    if (value !== n) rounded = true
    return value
  }

  // Node and connection ids live in the file's single xs:ID space, with the
  // concepts and every other view's nodes.
  const ids = new Map<string, string>()
  const idOf = (local: string) => {
    let id = ids.get(local)
    if (id === undefined) {
      id = context.claim(local)
      ids.set(local, id)
    }
    return id
  }
  let renamed = 0
  for (const local of [...nodes.map((n) => n.id), ...connections.map((c) => c.id)]) {
    if (idOf(local) !== local) renamed += 1
  }
  if (renamed) {
    problems.push(
      problem(
        'info',
        'exchange.view-ids-renamed',
        `View "${view.name}": ${renamed} shape or connection id${renamed === 1 ? '' : 's'} clashed with another id in the file and ${renamed === 1 ? 'was' : 'were'} renamed.`,
        subject,
      ),
    )
  }
  // Properties come before the nodes; the carried style names them by
  // the ids they have in this file, which is why it waits for the claims above.
  const carriedJson = carriedStyleJson([...nodes, ...connections], idOf)
  lines.push(
    ...context.propertyLines(
      carriedJson === undefined
        ? view.properties
        : { ...view.properties, [STYLE_KEY]: carriedJson },
      8,
    ),
  )

  // Only element and group nodes may contain others in the format. A node nested
  // in a note or a view reference is written in that node's nearest container.
  const byId = new Map(nodes.map((node) => [node.id, node]))
  let flattened = 0
  const writtenParent = (node: ViewNode): string | undefined => {
    let parent = node.parent === undefined ? undefined : byId.get(node.parent)
    const seen = new Set<string>()
    while (
      parent &&
      (parent.kind === 'note' || parent.kind === 'view-ref') &&
      !seen.has(parent.id)
    ) {
      seen.add(parent.id)
      parent = parent.parent === undefined ? undefined : byId.get(parent.parent)
    }
    if (node.parent !== undefined && parent?.id !== node.parent) flattened += 1
    return parent?.id
  }
  const children = new Map<string | undefined, ViewNode[]>()
  for (const node of nodes) {
    const parent = writtenParent(node)
    children.set(parent, [...(children.get(parent) ?? []), node])
  }

  const writeNode = (node: ViewNode, depth: number) => {
    const pad = ' '.repeat(8 + depth * 2)
    const bounds = absolute.get(node.id) ?? node.bounds
    const head = `identifier="${attr(idOf(node.id))}" x="${int(bounds.x + dx, 0)}" y="${int(bounds.y + dy, 0)}" w="${int(bounds.width, 1)}" h="${int(bounds.height, 1)}"`
    switch (node.kind) {
      case 'element':
        lines.push(
          `${pad}<node ${head} xsi:type="Element" elementRef="${attr(context.of(node.element))}">`,
        )
        lines.push(...writeStyle(node.appearance, pad))
        break
      case 'group':
        lines.push(`${pad}<node ${head} xsi:type="Container">`)
        lines.push(`${pad}  <label xml:lang="en">${text(node.name)}</label>`)
        if (node.documentation) {
          lines.push(
            `${pad}  <documentation xml:lang="en">${text(node.documentation)}</documentation>`,
          )
        }
        lines.push(...writeStyle(node.appearance, pad))
        break
      case 'note':
        lines.push(`${pad}<node ${head} xsi:type="Label">`)
        lines.push(`${pad}  <label xml:lang="en">${text(node.text)}</label>`)
        lines.push(...writeStyle(node.appearance, pad))
        break
      case 'view-ref':
        lines.push(`${pad}<node ${head} xsi:type="Label">`)
        lines.push(`${pad}  <label xml:lang="en">${text(names.get(node.view) ?? '')}</label>`)
        lines.push(...writeStyle(node.appearance, pad))
        if (names.has(node.view))
          lines.push(`${pad}  <viewRef ref="${attr(context.of(node.view))}" />`)
        break
    }
    for (const child of children.get(node.id) ?? []) writeNode(child, depth + 1)
    lines.push(`${pad}</node>`)
  }
  for (const node of children.get(undefined) ?? []) writeNode(node, 0)

  for (const connection of connections) {
    const pad = '        '
    const ends = `source="${attr(idOf(connection.source))}" target="${attr(idOf(connection.target))}"`
    if (connection.kind === 'relationship') {
      lines.push(
        `${pad}<connection identifier="${attr(idOf(connection.id))}" xsi:type="Relationship" relationshipRef="${attr(context.of(connection.relationship))}" ${ends}>`,
      )
    } else {
      lines.push(
        `${pad}<connection identifier="${attr(idOf(connection.id))}" xsi:type="Line" ${ends}>`,
      )
      if (connection.name)
        lines.push(`${pad}  <label xml:lang="en">${text(connection.name)}</label>`)
    }
    lines.push(...writeStyle(connection.appearance, pad))
    for (const point of connection.bendpoints ?? []) {
      lines.push(`${pad}  <bendpoint x="${int(point.x + dx, 0)}" y="${int(point.y + dy, 0)}" />`)
    }
    lines.push(`${pad}</connection>`)
  }
  lines.push('      </view>')

  if (rounded) {
    problems.push(
      problem(
        'info',
        'exchange.view-rounded',
        `View "${view.name}" has positions or sizes that are not whole numbers; the format needs whole numbers, so they were rounded.`,
        subject,
      ),
    )
  }
  if (flattened) {
    problems.push(
      problem(
        'warning',
        'exchange.nesting-flattened',
        `View "${view.name}": ${flattened} shape${flattened === 1 ? ' was' : 's were'} nested in a note or view reference, which the format cannot express. ${flattened === 1 ? 'It was' : 'They were'} written in the nearest enclosing shape instead, at the same position.`,
        subject,
      ),
    )
  }
  return lines
}

/**
 * `<style>`. Text alignment, text position and strikethrough have no place in
 * it; they travel in the view's `archipelago.textStyle` property instead.
 */
function writeStyle(appearance: Appearance | undefined, pad: string): string[] {
  if (!appearance) return []

  const inner: string[] = []
  const colour = (name: string, value: string | undefined) => {
    const parsed = value === undefined ? undefined : parseHex(value)
    if (!parsed) return
    const [r, g, b] = parsed.rgb
    const a = parsed.alpha === 100 ? '' : ` a="${parsed.alpha}"`
    inner.push(`${pad}    <${name} r="${r}" g="${g}" b="${b}"${a} />`)
  }
  colour('fillColor', appearance.fillColor)
  colour('lineColor', appearance.lineColor)

  const styles = (appearance.fontStyle ?? []).filter((s) => s !== 'strikethrough')
  const fontColour = appearance.fontColor === undefined ? undefined : parseHex(appearance.fontColor)
  if (appearance.fontName || appearance.fontSize || styles.length || fontColour) {
    const fontAttrs = [
      appearance.fontName ? ` name="${attr(appearance.fontName)}"` : '',
      // The format's font size is in half points.
      appearance.fontSize ? ` size="${Math.round(appearance.fontSize * 2) / 2}"` : '',
      styles.length ? ` style="${styles.join(' ')}"` : '',
    ].join('')
    if (fontColour) {
      const [r, g, b] = fontColour.rgb
      inner.push(
        `${pad}    <font${fontAttrs}>`,
        `${pad}      <color r="${r}" g="${g}" b="${b}" />`,
        `${pad}    </font>`,
      )
    } else inner.push(`${pad}    <font${fontAttrs} />`)
  }
  const lineWidth =
    appearance.lineWidth && appearance.lineWidth !== 1
      ? ` lineWidth="${Math.max(1, Math.round(appearance.lineWidth))}"`
      : ''
  if (!inner.length && !lineWidth) return []
  return [`${pad}  <style${lineWidth}>`, ...inner, `${pad}  </style>`]
}

// ── Organizations: writing ───────────────────────────────────────────────────

export interface OrganizationWriteContext {
  of: (id: string) => string
  written: (id: string) => boolean
  claim: (base: string) => string
}

/**
 * `<organizations>`: one item per fixed group that holds anything, named as
 * Archi names them, holding its folders and its unfiled members. Every member
 * is listed, as Archi does, so a tool reading the file files nothing by guesswork.
 */
export function writeOrganizations(
  folders: readonly Folder[],
  members: { id: string; folder?: string; root: FolderRoot }[],
  context: OrganizationWriteContext,
): string[] {
  if (!folders.length) return []
  const live = members.filter((member) => context.written(member.id))
  const subfolders = new Map<string | undefined, Folder[]>()
  for (const folder of folders) {
    const key = folder.parent
    subfolders.set(key, [...(subfolders.get(key) ?? []), folder])
  }
  const filed = new Map<string | undefined, string[]>()
  const folderIds = new Set(folders.map((folder) => folder.id))
  for (const member of live) {
    const key =
      member.folder !== undefined && folderIds.has(member.folder) ? member.folder : undefined
    if (key === undefined) continue
    filed.set(key, [...(filed.get(key) ?? []), member.id])
  }

  const lines = ['  <organizations>']
  const writeFolder = (folder: Folder, depth: number) => {
    const pad = ' '.repeat(4 + depth * 2)
    lines.push(`${pad}<item identifier="${attr(context.claim(folder.id))}">`)
    lines.push(`${pad}  <label xml:lang="en">${text(folder.name)}</label>`)
    if (folder.documentation) {
      lines.push(
        `${pad}  <documentation xml:lang="en">${text(folder.documentation)}</documentation>`,
      )
    }
    for (const child of subfolders.get(folder.id) ?? []) writeFolder(child, depth + 1)
    for (const id of filed.get(folder.id) ?? []) {
      lines.push(`${pad}  <item identifierRef="${attr(context.of(id))}" />`)
    }
    lines.push(`${pad}</item>`)
  }
  for (const root of FOLDER_ROOTS) {
    const top = (subfolders.get(undefined) ?? []).filter((folder) => folder.root === root)
    const loose = live.filter(
      (member) =>
        member.root === root && (member.folder === undefined || !folderIds.has(member.folder)),
    )
    if (!top.length && !loose.length) continue
    lines.push('    <item>', `      <label xml:lang="en">${text(FOLDER_ROOT_LABELS[root])}</label>`)
    for (const folder of top) writeFolder(folder, 1)
    for (const member of loose)
      lines.push(`      <item identifierRef="${attr(context.of(member.id))}" />`)
    lines.push('    </item>')
  }
  lines.push('  </organizations>')
  return lines
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function num(value: unknown): number | undefined {
  const s = asString(value)
  if (s === undefined || s.trim() === '') return undefined
  const n = Number(s)
  return Number.isFinite(n) ? n : undefined
}

function clampByte(n: number): number {
  return Math.min(255, Math.max(0, Math.round(n)))
}

function isString(value: string | undefined): value is string {
  return value !== undefined
}
