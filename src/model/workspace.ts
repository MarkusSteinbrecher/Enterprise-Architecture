import type { ElementType, JunctionKind } from './element-types'
import type { AccessType, RelationshipType } from './relationship-types'
import type { PortfolioProfile } from './profile'
import type { Layer } from './layers'

/**
 * The workspace: plain, serialisable data. The in-memory store (#4) wraps this
 * with indexes and a command stack; the canonical JSON format (#5) is this shape
 * with sorted keys and deterministic array order.
 */

/**
 * Current native schema version. Bump on any breaking shape change, and teach
 * `migrate.ts` to bring the previous version forward.
 *
 * - 1: elements, relationships, saved report views (`views`), tag groups.
 * - 2: hand-drawn views (`views`), folders; saved report views move to `reports`.
 */
export const SCHEMA_VERSION = 2

/** ArchiMate properties are string-valued in the exchange format; numbers and
 *  booleans are allowed here and serialise as their string form. */
export type PropertyValue = string | number | boolean

export interface Element {
  id: string
  type: ElementType
  name: string
  documentation?: string
  properties: Record<string, PropertyValue>
  profile?: PortfolioProfile
  /**
   * And/or flavour of a `Junction`; meaningless on every other type. Absent
   * means `and`, which is what the specification says an unqualified junction is.
   */
  junctionKind?: JunctionKind
  /** Folder the element is filed in; absent means its type's default group. */
  folder?: string
}

/**
 * Relationship properties are first class (concept §4.3): support type, annual
 * cost, CRUD usage and validity dates live on the edge, not on either endpoint.
 * Anything not modelled here still lives in `properties`.
 */
export interface RelationshipProfile {
  /** Total annual cost carried by this dependency, in `currency`. */
  annualCost?: number
  currency?: string
  /** LeanIX-style support type on an application → capability realization. */
  supportType?: string
  /** Relation validity window — the time dimension on edges. */
  validFrom?: string
  validTo?: string
  /** Access qualifier for Access relationships. */
  accessType?: AccessType
}

export interface Relationship {
  id: string
  type: RelationshipType
  source: string
  target: string
  name?: string
  properties: Record<string, PropertyValue>
  profile?: RelationshipProfile
  /** Folder the relationship is filed in; absent means the Relations group. */
  folder?: string
}

/**
 * A saved report definition — the report engine's five primitives (concept §6.1).
 *
 * Called `ViewDefinition` and stored under `views` until schema 2, when hand-drawn
 * diagrams took the name `View` (#75).
 */
export interface ReportDefinition {
  id: string
  name: string
  kind: 'graph' | 'capability-map' | 'landscape' | 'matrix' | 'roadmap' | 'portfolio'
  baseType?: ElementType
  /** Facet filter, in the inventory's own encoding (`layer:application`, …). */
  filter?: { facets: string[]; mode: 'AND' | 'OR' | 'NOT'; query?: string }
  cluster?: string
  drilldown?: string
  colorView?: 'layer' | 'lifecycle' | 'time'
  /** Time point as a year, matching the graph slider. */
  timePoint?: number
}

// ── Hand-drawn views (#75, modelling concept §5.1) ───────────────────────────

/**
 * Position and size of a diagram node, **relative to its parent node** — or to
 * the view, for a node without one. Relative because that is what makes a group
 * move as one: dragging a parent changes one node's bounds, not every
 * descendant's. Archi stores nodes the same way; the exchange format's absolute
 * coordinates are converted at the boundary.
 */
export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

/** A point in view coordinates (absolute, not relative to any node). */
export interface Point {
  x: number
  y: number
}

export const FONT_STYLES = ['bold', 'italic', 'underline', 'strikethrough'] as const
export type FontStyle = (typeof FONT_STYLES)[number]

export const TEXT_ALIGNMENTS = ['left', 'center', 'right'] as const
export type TextAlignment = (typeof TEXT_ALIGNMENTS)[number]

export const TEXT_POSITIONS = ['top', 'middle', 'bottom'] as const
export type TextPosition = (typeof TEXT_POSITIONS)[number]

/**
 * Per-object overrides of the notation's default look. Every field is optional:
 * absent means "as the notation draws it", so a model that never touched
 * appearance carries none of this. Colours are `#rrggbb`, or `#rrggbbaa` with an
 * alpha — the user's data, not the product palette, so tokens do not apply.
 */
export interface Appearance {
  fillColor?: string
  lineColor?: string
  lineWidth?: number
  fontName?: string
  fontSize?: number
  fontColor?: string
  fontStyle?: FontStyle[]
  textAlignment?: TextAlignment
  textPosition?: TextPosition
}

interface ViewNodeBase {
  /** Unique within its view. */
  id: string
  bounds: Bounds
  /** Id of the node this one is nested in, within the same view. */
  parent?: string
  appearance?: Appearance
}

/** A drawing of a model element. Many nodes, in many views, may draw one element. */
export interface ElementNode extends ViewNodeBase {
  kind: 'element'
  element: string
}

/** Free text on the canvas; not part of the model. */
export interface NoteNode extends ViewNodeBase {
  kind: 'note'
  text: string
}

/** A visual group: a labelled box, not the ArchiMate Grouping element. */
export interface GroupNode extends ViewNodeBase {
  kind: 'group'
  name: string
  documentation?: string
}

/** A link to another view, drawn as a box that navigates there. */
export interface ViewReferenceNode extends ViewNodeBase {
  kind: 'view-ref'
  view: string
}

export type ViewNode = ElementNode | NoteNode | GroupNode | ViewReferenceNode
export type ViewNodeKind = ViewNode['kind']

interface ViewConnectionBase {
  /** Unique within its view. */
  id: string
  /** Node ids, within the same view. */
  source: string
  target: string
  /** Route corners in order from source to target, in view coordinates. */
  bendpoints?: Point[]
  appearance?: Appearance
}

/** A drawing of a model relationship between the nodes of its two elements. */
export interface RelationshipConnection extends ViewConnectionBase {
  kind: 'relationship'
  relationship: string
}

/** A plain line, typically from a note or group; not part of the model. */
export interface LineConnection extends ViewConnectionBase {
  kind: 'line'
  name?: string
}

export type ViewConnection = RelationshipConnection | LineConnection

/** A hand-drawn diagram (concept §5.1). Distinct from a `ReportDefinition`. */
export interface View {
  id: string
  name: string
  documentation?: string
  /** ArchiMate viewpoint name, as the exchange format spells it. Enforced in M3. */
  viewpoint?: string
  folder?: string
  properties: Record<string, PropertyValue>
  nodes: ViewNode[]
  connections: ViewConnection[]
}

// ── Folders ──────────────────────────────────────────────────────────────────

/**
 * The fixed top-level groups of the model tree (#80), which user folders sit
 * within. Archi's own: Physical files under Technology, and Location, Grouping
 * and Junction under Other.
 */
export const FOLDER_ROOTS = [
  'strategy',
  'business',
  'application',
  'technology',
  'motivation',
  'implementation',
  'other',
  'relations',
  'views',
] as const
export type FolderRoot = (typeof FOLDER_ROOTS)[number]

export const FOLDER_ROOT_LABELS: Record<FolderRoot, string> = {
  strategy: 'Strategy',
  business: 'Business',
  application: 'Application',
  technology: 'Technology & Physical',
  motivation: 'Motivation',
  implementation: 'Implementation & Migration',
  other: 'Other',
  relations: 'Relations',
  views: 'Views',
}

/**
 * User organisation of elements, relationships and views. Organisation, not
 * semantics: nothing about an element changes with the folder it is filed in.
 *
 * Exactly one of `parent` and `root` is set: a folder nests in another folder,
 * or sits directly in one of the fixed groups. Membership is recorded on the
 * member (`Element.folder` and friends), so moving one object is one update.
 */
export interface Folder {
  id: string
  name: string
  documentation?: string
  parent?: string
  root?: FolderRoot
}

/** The group an element type is filed under when it has no folder. */
export function defaultFolderRoot(layer: Layer): FolderRoot {
  return layer === 'physical' ? 'technology' : layer
}

export function isFolderRoot(value: unknown): value is FolderRoot {
  return typeof value === 'string' && (FOLDER_ROOTS as readonly string[]).includes(value)
}

export interface TagDefinition {
  name: string
  /** CSS custom property carrying the tag colour (handoff "Tag colours"). */
  colourToken: string
}

export interface TagGroup {
  id: string
  name: string
  multiSelect: boolean
  tags: TagDefinition[]
}

export interface Workspace {
  id: string
  name: string
  schemaVersion: number
  elements: Element[]
  relationships: Relationship[]
  /** Hand-drawn diagrams. */
  views: View[]
  folders: Folder[]
  /** Saved report definitions. */
  reports: ReportDefinition[]
  tagGroups: TagGroup[]
  /**
   * Exchange-format types declared for property keys whose values we hold as
   * text: `currency`, `date` and `time` have no counterpart in `PropertyValue`,
   * so `typeof value` can only say `string` for them and a re-export declared
   * them as `string` — a colleague reopening the file in Archi had lost the
   * typing and its formatting (#37). Keyed by property key. Absent for the keys
   * whose type the value itself carries (`boolean`, `number`).
   */
  propertyTypes?: Record<string, string>
}

/** The default tag group and colours from the design handoff. */
export const DEFAULT_TAG_GROUP: TagGroup = {
  id: 'tg-portfolio',
  name: 'Portfolio',
  multiSelect: true,
  tags: [
    { name: 'Core', colourToken: 'var(--accent2)' },
    { name: 'Differentiating', colourToken: 'var(--accent)' },
    { name: 'Supporting', colourToken: 'var(--pas)' },
    { name: 'Cloud target', colourToken: 'var(--app)' },
    { name: 'GDPR', colourToken: 'var(--mot)' },
    { name: 'Vendor risk', colourToken: 'var(--lc-eol)' },
  ],
}

export function emptyWorkspace(id: string, name: string): Workspace {
  return {
    id,
    name,
    schemaVersion: SCHEMA_VERSION,
    elements: [],
    relationships: [],
    views: [],
    folders: [],
    reports: [],
    tagGroups: [DEFAULT_TAG_GROUP],
  }
}

/** Colour token for a tag, falling back to the neutral border colour. */
export function tagColourToken(workspace: Workspace, tag: string): string {
  for (const group of workspace.tagGroups) {
    const found = group.tags.find((t) => t.name === tag)
    if (found) return found.colourToken
  }
  return 'var(--bd2)'
}
