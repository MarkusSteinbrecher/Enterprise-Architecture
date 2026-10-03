/**
 * The 11 ArchiMate 3.2 relationship types.
 *
 * `notation` follows the design handoff's graph spec — solid for the structural
 * relations it names (Realization, Serving, Assignment, Composition), dashed for
 * Flow / Access / Association — extended to the remaining types along ArchiMate's
 * own notation conventions.
 *
 * `abbr` is the four-letter monospace code the graph side panel prints on traced
 * dependency rows (handoff, "Screen 3 — side panel").
 */

export interface RelationshipTypeMeta {
  readonly type: string
  readonly label: string
  /** ArchiMate's own grouping of the relationship types. */
  readonly category: 'structural' | 'dependency' | 'dynamic' | 'other'
  readonly notation: 'solid' | 'dashed'
  /** Four-letter mono abbreviation for dense contexts. */
  readonly abbr: string
  /** True when the relationship is inherently directed source → target. */
  readonly directed: boolean
}

// One row per relationship type: kept off the formatter so the table stays readable.
// prettier-ignore
export const RELATIONSHIP_TYPES = [
  { type: 'Composition',    label: 'Composition',    category: 'structural', notation: 'solid',  abbr: 'COMP', directed: true },
  { type: 'Aggregation',    label: 'Aggregation',    category: 'structural', notation: 'solid',  abbr: 'AGGR', directed: true },
  { type: 'Assignment',     label: 'Assignment',     category: 'structural', notation: 'solid',  abbr: 'ASGN', directed: true },
  { type: 'Realization',    label: 'Realization',    category: 'structural', notation: 'solid',  abbr: 'REAL', directed: true },
  { type: 'Serving',        label: 'Serving',        category: 'dependency', notation: 'solid',  abbr: 'SERV', directed: true },
  { type: 'Access',         label: 'Access',         category: 'dependency', notation: 'dashed', abbr: 'ACCS', directed: true },
  { type: 'Influence',      label: 'Influence',      category: 'dependency', notation: 'dashed', abbr: 'INFL', directed: true },
  { type: 'Triggering',     label: 'Triggering',     category: 'dynamic',    notation: 'solid',  abbr: 'TRIG', directed: true },
  { type: 'Flow',           label: 'Flow',           category: 'dynamic',    notation: 'dashed', abbr: 'FLOW', directed: true },
  { type: 'Specialization', label: 'Specialization', category: 'other',      notation: 'solid',  abbr: 'SPEC', directed: true },
  { type: 'Association',    label: 'Association',    category: 'other',      notation: 'dashed', abbr: 'ASSO', directed: false },
] as const satisfies readonly RelationshipTypeMeta[]

export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number]['type']

const BY_TYPE = new Map<string, RelationshipTypeMeta>(RELATIONSHIP_TYPES.map((m) => [m.type, m]))

export const RELATIONSHIP_TYPE_NAMES: readonly RelationshipType[] = RELATIONSHIP_TYPES.map(
  (m) => m.type,
)

export function isRelationshipType(value: string): value is RelationshipType {
  return BY_TYPE.has(value)
}

export function findRelationshipType(type: string): RelationshipTypeMeta | undefined {
  return BY_TYPE.get(type)
}

export function relationshipTypeMeta(type: RelationshipType): RelationshipTypeMeta {
  const meta = BY_TYPE.get(type)
  if (!meta) throw new Error(`Unknown ArchiMate relationship type: ${type}`)
  return meta
}

/** Access has a direction qualifier that is carried as a relationship property. */
export const ACCESS_TYPES = ['Access', 'Read', 'Write', 'ReadWrite'] as const
export type AccessType = (typeof ACCESS_TYPES)[number]

export function isAccessType(value: unknown): value is AccessType {
  return typeof value === 'string' && (ACCESS_TYPES as readonly string[]).includes(value)
}

/**
 * The strengths the specification names for an Influence. The exchange schema
 * also allows any other text (`InfluenceModifierType` is a union with
 * `xs:string`), so these are suggestions, not a closed set.
 */
export const INFLUENCE_STRENGTHS = ['++', '+', '0', '-', '--'] as const

/**
 * A modifier worth storing: any non-empty text. Empty is what a cleared form
 * field yields, and means "no modifier", so it is not one.
 */
export function isInfluenceModifier(value: unknown): value is string {
  return typeof value === 'string' && value !== ''
}

/**
 * Attributes ArchiMate defines on one relationship type only, and the type
 * each belongs to. Anything carrying one on another type is malformed: the
 * exchange schema would reject the file that wrote it.
 */
export const TYPE_SPECIFIC_ATTRIBUTES = {
  accessType: 'Access',
  isDirected: 'Association',
  modifier: 'Influence',
} as const satisfies Record<string, RelationshipType>

export type TypeSpecificAttribute = keyof typeof TYPE_SPECIFIC_ATTRIBUTES

/** The type-specific attributes this relationship carries on the wrong type. */
export function misplacedAttributes(relationship: {
  type: RelationshipType
  isDirected?: boolean
  modifier?: string
  profile?: { accessType?: AccessType }
}): TypeSpecificAttribute[] {
  const carried: Record<TypeSpecificAttribute, boolean> = {
    accessType: relationship.profile?.accessType !== undefined,
    isDirected: relationship.isDirected !== undefined,
    modifier: relationship.modifier !== undefined,
  }
  return (Object.keys(TYPE_SPECIFIC_ATTRIBUTES) as TypeSpecificAttribute[]).filter(
    (attribute) => carried[attribute] && TYPE_SPECIFIC_ATTRIBUTES[attribute] !== relationship.type,
  )
}

/**
 * Fixed display order for the fact sheet's RELATIONS blocks (handoff, "Screen 2").
 * The eight the handoff names come first, in its order; the remaining three follow.
 */
export const RELATION_BLOCK_ORDER: readonly RelationshipType[] = [
  'Realization',
  'Serving',
  'Flow',
  'Access',
  'Assignment',
  'Composition',
  'Association',
  'Influence',
  'Aggregation',
  'Triggering',
  'Specialization',
]
