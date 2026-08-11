import type { ElementType, JunctionKind } from './element-types'
import type { AccessType, RelationshipType } from './relationship-types'
import type { PortfolioProfile } from './profile'

/**
 * The workspace: plain, serialisable data. The in-memory store (#4) wraps this
 * with indexes and a command stack; the canonical JSON format (#5) is this shape
 * with sorted keys and deterministic array order.
 */

/** Current native schema version. Bump on any breaking shape change. */
export const SCHEMA_VERSION = 1

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
}

/** A saved report definition — the report engine's five primitives (concept §6.1). */
export interface ViewDefinition {
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
  views: ViewDefinition[]
  tagGroups: TagGroup[]
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
