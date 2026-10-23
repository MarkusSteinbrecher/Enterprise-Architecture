import type { RelationshipType } from './relationship-types'
import type { Relationship } from './workspace'

/**
 * What nesting one element's shape in another's can mean: one rule, asked by
 * the canvas's nesting prompt (#131) and by the validator's nesting check
 * (#193), so the two cannot disagree.
 *
 * Archi 5.10 keeps the list twice. The prompt offers its `NEW_RELATIONS_TYPES`
 * default (`PreferenceInitializer`: bits 9, 8, 7, 6, 5 and 1, in the order of
 * `ConnectionPreferences.RELATION_KEYMAP`), and the validator's
 * `NestedElementsChecker.isNestedTypeRelationship` tests the same six types
 * with `instanceof` (both read with `javap`). The order here is the prompt's.
 */
export const NESTING_TYPES = [
  'Composition',
  'Aggregation',
  'Access',
  'Assignment',
  'Realization',
  'Specialization',
] as const satisfies readonly RelationshipType[]

const NESTING = new Set<RelationshipType>(NESTING_TYPES)

/**
 * Does `relationship` say what nesting `child`'s shape in `parent`'s means?
 * One of `NESTING_TYPES` from the parent to the child, except Specialization,
 * which runs from the child to the parent: the child is a kind of the parent
 * (Archi's `NestedConnectionInfo.isInverted`, and the checker's
 * `ISpecializationRelationship` branch).
 */
export function meansNesting(
  relationship: Pick<Relationship, 'type' | 'source' | 'target'>,
  parent: string,
  child: string,
): boolean {
  if (!NESTING.has(relationship.type)) return false
  return relationship.type === 'Specialization'
    ? relationship.source === child && relationship.target === parent
    : relationship.source === parent && relationship.target === child
}
