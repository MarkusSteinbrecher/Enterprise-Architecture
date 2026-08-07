import type { Aspect, ColourGroup, Layer } from './layers'

/**
 * The ArchiMate 3.2 element catalogue.
 *
 * Every element type in the specification, with the metadata the rest of the app
 * needs: layer, aspect, the colour group it renders in, and the two-letter
 * monospace code that replaces the notation shape set in list, card, graph,
 * breadcrumb and palette contexts (UI spec §2.2, ADR UI-2).
 *
 * `external: true` marks the elements the spec calls external behaviour /
 * external active structure — services and interfaces. The validity rules use it.
 *
 * Codes are unique across the catalogue; `assertUniqueCodes` in the tests holds
 * that invariant. Where the obvious two letters were taken, the second letter
 * moves to a distinctive consonant (Business Interaction `BN`, Assessment `AM`).
 */
export interface ElementTypeMeta {
  /** Stable identifier; matches the ArchiMate Model Exchange Format xsi:type. */
  readonly type: string
  /** Human label as printed in the specification. */
  readonly label: string
  readonly layer: Layer
  readonly aspect: Aspect
  readonly colourGroup: ColourGroup
  /** Two-letter monospace code (UI spec §2.2). */
  readonly code: string
  /** Services and interfaces — the spec's "external" behaviour / active structure. */
  readonly external?: boolean
}

// One row per element type: the catalogue reads as a table, so it is kept off the formatter.
// prettier-ignore
export const ELEMENT_TYPES = [
  // ── Strategy ────────────────────────────────────────────────────────────────
  { type: 'Resource', label: 'Resource', layer: 'strategy', aspect: 'active-structure', colourGroup: 'biz', code: 'RS' },
  { type: 'Capability', label: 'Capability', layer: 'strategy', aspect: 'behaviour', colourGroup: 'biz', code: 'CP' },
  { type: 'CourseOfAction', label: 'Course of Action', layer: 'strategy', aspect: 'behaviour', colourGroup: 'biz', code: 'CA' },
  { type: 'ValueStream', label: 'Value Stream', layer: 'strategy', aspect: 'behaviour', colourGroup: 'biz', code: 'VS' },

  // ── Business ────────────────────────────────────────────────────────────────
  { type: 'BusinessActor', label: 'Business Actor', layer: 'business', aspect: 'active-structure', colourGroup: 'biz', code: 'BA' },
  { type: 'BusinessRole', label: 'Business Role', layer: 'business', aspect: 'active-structure', colourGroup: 'biz', code: 'BR' },
  { type: 'BusinessCollaboration', label: 'Business Collaboration', layer: 'business', aspect: 'active-structure', colourGroup: 'biz', code: 'BC' },
  { type: 'BusinessInterface', label: 'Business Interface', layer: 'business', aspect: 'active-structure', colourGroup: 'biz', code: 'BI', external: true },
  { type: 'BusinessProcess', label: 'Business Process', layer: 'business', aspect: 'behaviour', colourGroup: 'biz', code: 'BP' },
  { type: 'BusinessFunction', label: 'Business Function', layer: 'business', aspect: 'behaviour', colourGroup: 'biz', code: 'BF' },
  { type: 'BusinessInteraction', label: 'Business Interaction', layer: 'business', aspect: 'behaviour', colourGroup: 'biz', code: 'BN' },
  { type: 'BusinessEvent', label: 'Business Event', layer: 'business', aspect: 'behaviour', colourGroup: 'biz', code: 'BE' },
  { type: 'BusinessService', label: 'Business Service', layer: 'business', aspect: 'behaviour', colourGroup: 'biz', code: 'BS', external: true },
  { type: 'BusinessObject', label: 'Business Object', layer: 'business', aspect: 'passive-structure', colourGroup: 'pas', code: 'BO' },
  { type: 'Contract', label: 'Contract', layer: 'business', aspect: 'passive-structure', colourGroup: 'pas', code: 'CT' },
  { type: 'Representation', label: 'Representation', layer: 'business', aspect: 'passive-structure', colourGroup: 'pas', code: 'RP' },
  { type: 'Product', label: 'Product', layer: 'business', aspect: 'passive-structure', colourGroup: 'pas', code: 'PD' },

  // ── Application ─────────────────────────────────────────────────────────────
  { type: 'ApplicationComponent', label: 'Application Component', layer: 'application', aspect: 'active-structure', colourGroup: 'app', code: 'AC' },
  { type: 'ApplicationCollaboration', label: 'Application Collaboration', layer: 'application', aspect: 'active-structure', colourGroup: 'app', code: 'AL' },
  { type: 'ApplicationInterface', label: 'Application Interface', layer: 'application', aspect: 'active-structure', colourGroup: 'app', code: 'AI', external: true },
  { type: 'ApplicationFunction', label: 'Application Function', layer: 'application', aspect: 'behaviour', colourGroup: 'app', code: 'AF' },
  { type: 'ApplicationInteraction', label: 'Application Interaction', layer: 'application', aspect: 'behaviour', colourGroup: 'app', code: 'AN' },
  { type: 'ApplicationProcess', label: 'Application Process', layer: 'application', aspect: 'behaviour', colourGroup: 'app', code: 'AP' },
  { type: 'ApplicationEvent', label: 'Application Event', layer: 'application', aspect: 'behaviour', colourGroup: 'app', code: 'AE' },
  { type: 'ApplicationService', label: 'Application Service', layer: 'application', aspect: 'behaviour', colourGroup: 'app', code: 'AS', external: true },
  { type: 'DataObject', label: 'Data Object', layer: 'application', aspect: 'passive-structure', colourGroup: 'pas', code: 'DO' },

  // ── Technology ──────────────────────────────────────────────────────────────
  { type: 'Node', label: 'Node', layer: 'technology', aspect: 'active-structure', colourGroup: 'tec', code: 'NO' },
  { type: 'Device', label: 'Device', layer: 'technology', aspect: 'active-structure', colourGroup: 'tec', code: 'DV' },
  { type: 'SystemSoftware', label: 'System Software', layer: 'technology', aspect: 'active-structure', colourGroup: 'tec', code: 'SS' },
  { type: 'TechnologyCollaboration', label: 'Technology Collaboration', layer: 'technology', aspect: 'active-structure', colourGroup: 'tec', code: 'TL' },
  { type: 'TechnologyInterface', label: 'Technology Interface', layer: 'technology', aspect: 'active-structure', colourGroup: 'tec', code: 'TI', external: true },
  { type: 'Path', label: 'Path', layer: 'technology', aspect: 'active-structure', colourGroup: 'tec', code: 'PA' },
  { type: 'CommunicationNetwork', label: 'Communication Network', layer: 'technology', aspect: 'active-structure', colourGroup: 'tec', code: 'CN' },
  { type: 'TechnologyFunction', label: 'Technology Function', layer: 'technology', aspect: 'behaviour', colourGroup: 'tec', code: 'TF' },
  { type: 'TechnologyProcess', label: 'Technology Process', layer: 'technology', aspect: 'behaviour', colourGroup: 'tec', code: 'TP' },
  { type: 'TechnologyInteraction', label: 'Technology Interaction', layer: 'technology', aspect: 'behaviour', colourGroup: 'tec', code: 'TN' },
  { type: 'TechnologyEvent', label: 'Technology Event', layer: 'technology', aspect: 'behaviour', colourGroup: 'tec', code: 'TE' },
  { type: 'TechnologyService', label: 'Technology Service', layer: 'technology', aspect: 'behaviour', colourGroup: 'tec', code: 'TS', external: true },
  { type: 'Artifact', label: 'Artifact', layer: 'technology', aspect: 'passive-structure', colourGroup: 'pas', code: 'AR' },

  // ── Physical ────────────────────────────────────────────────────────────────
  { type: 'Equipment', label: 'Equipment', layer: 'physical', aspect: 'active-structure', colourGroup: 'tec', code: 'EQ' },
  { type: 'Facility', label: 'Facility', layer: 'physical', aspect: 'active-structure', colourGroup: 'tec', code: 'FC' },
  { type: 'DistributionNetwork', label: 'Distribution Network', layer: 'physical', aspect: 'active-structure', colourGroup: 'tec', code: 'DN' },
  { type: 'Material', label: 'Material', layer: 'physical', aspect: 'passive-structure', colourGroup: 'pas', code: 'MT' },

  // ── Motivation ──────────────────────────────────────────────────────────────
  { type: 'Stakeholder', label: 'Stakeholder', layer: 'motivation', aspect: 'motivation', colourGroup: 'mot', code: 'SH' },
  { type: 'Driver', label: 'Driver', layer: 'motivation', aspect: 'motivation', colourGroup: 'mot', code: 'DR' },
  { type: 'Assessment', label: 'Assessment', layer: 'motivation', aspect: 'motivation', colourGroup: 'mot', code: 'AM' },
  { type: 'Goal', label: 'Goal', layer: 'motivation', aspect: 'motivation', colourGroup: 'mot', code: 'GO' },
  { type: 'Outcome', label: 'Outcome', layer: 'motivation', aspect: 'motivation', colourGroup: 'mot', code: 'OC' },
  { type: 'Principle', label: 'Principle', layer: 'motivation', aspect: 'motivation', colourGroup: 'mot', code: 'PR' },
  { type: 'Requirement', label: 'Requirement', layer: 'motivation', aspect: 'motivation', colourGroup: 'mot', code: 'RQ' },
  { type: 'Constraint', label: 'Constraint', layer: 'motivation', aspect: 'motivation', colourGroup: 'mot', code: 'CS' },
  { type: 'Meaning', label: 'Meaning', layer: 'motivation', aspect: 'motivation', colourGroup: 'mot', code: 'ME' },
  { type: 'Value', label: 'Value', layer: 'motivation', aspect: 'motivation', colourGroup: 'mot', code: 'VA' },

  // ── Implementation & Migration ──────────────────────────────────────────────
  { type: 'WorkPackage', label: 'Work Package', layer: 'implementation', aspect: 'behaviour', colourGroup: 'imp', code: 'WP' },
  { type: 'Deliverable', label: 'Deliverable', layer: 'implementation', aspect: 'passive-structure', colourGroup: 'imp', code: 'DL' },
  { type: 'ImplementationEvent', label: 'Implementation Event', layer: 'implementation', aspect: 'behaviour', colourGroup: 'imp', code: 'IE' },
  { type: 'Plateau', label: 'Plateau', layer: 'implementation', aspect: 'composite', colourGroup: 'imp', code: 'PL' },
  { type: 'Gap', label: 'Gap', layer: 'implementation', aspect: 'passive-structure', colourGroup: 'imp', code: 'GA' },

  // ── Composite / other ───────────────────────────────────────────────────────
  { type: 'Location', label: 'Location', layer: 'other', aspect: 'composite', colourGroup: 'biz', code: 'LO' },
  { type: 'Grouping', label: 'Grouping', layer: 'other', aspect: 'composite', colourGroup: 'pas', code: 'GR' },
  // Junction is a relationship connector rather than a true element, but the
  // exchange format serialises it in the element list, so it is carried here.
  { type: 'Junction', label: 'Junction', layer: 'other', aspect: 'connector', colourGroup: 'pas', code: 'JU' },
] as const satisfies readonly ElementTypeMeta[]

export type ElementType = (typeof ELEMENT_TYPES)[number]['type']

/**
 * The catalogue as uniformly-typed metadata. `ELEMENT_TYPES` keeps its literal
 * types so `ElementType` can be derived from it, which means entries that omit
 * an optional field do not carry it at all — use this view when reading one.
 */
export const ELEMENT_TYPE_LIST: readonly ElementTypeMeta[] = ELEMENT_TYPES

const BY_TYPE = new Map<string, ElementTypeMeta>(ELEMENT_TYPES.map((m) => [m.type, m]))

/** Every element type, in catalogue order. */
export const ELEMENT_TYPE_NAMES: readonly ElementType[] = ELEMENT_TYPES.map((m) => m.type)

export function isElementType(value: string): value is ElementType {
  return BY_TYPE.has(value)
}

/** Metadata for a known element type; `undefined` for anything else. */
export function findElementType(type: string): ElementTypeMeta | undefined {
  return BY_TYPE.get(type)
}

/** Metadata for a known element type. Throws on an unknown type. */
export function elementTypeMeta(type: ElementType): ElementTypeMeta {
  const meta = BY_TYPE.get(type)
  if (!meta) throw new Error(`Unknown ArchiMate element type: ${type}`)
  return meta
}

/** Two-letter code, e.g. `AC` for Application Component. */
export function typeCode(type: ElementType): string {
  return elementTypeMeta(type).code
}

/** Printable label, e.g. `Application Component`. */
export function typeLabel(type: ElementType): string {
  return elementTypeMeta(type).label
}

export function elementTypesInLayer(layer: Layer): readonly ElementTypeMeta[] {
  return ELEMENT_TYPES.filter((m) => m.layer === layer)
}

export function elementTypesInColourGroup(group: ColourGroup): readonly ElementTypeMeta[] {
  return ELEMENT_TYPES.filter((m) => m.colourGroup === group)
}
