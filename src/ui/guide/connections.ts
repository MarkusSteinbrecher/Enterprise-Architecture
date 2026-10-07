import {
  allowedRelationships,
  ELEMENT_TYPE_LIST,
  type ElementType,
  type ElementTypeMeta,
  type RelationshipType,
} from '@/model'

/**
 * The guide's "what can connect to what" lookup (#149).
 *
 * It reads `allowedRelationships`, the same type-level matrix the connect menu
 * and the fact sheet's relation picker start from (ADR 0009), so the guide
 * cannot promise a relationship the editor refuses. `guide.test.tsx` holds it
 * to Archi's `relationships.xml` read from disk, not to this module.
 *
 * Junction is left out: what a junction allows depends on the relationships
 * already on it, which a type-level lookup cannot know.
 */

export const LOOKUP_TYPES: readonly ElementTypeMeta[] = ELEMENT_TYPE_LIST.filter(
  (meta) => meta.type !== 'Junction',
)

export interface Connections {
  /** source → target */
  readonly forward: readonly RelationshipType[]
  /** target → source */
  readonly reverse: readonly RelationshipType[]
}

export function connectionsBetween(source: ElementType, target: ElementType): Connections {
  return {
    forward: allowedRelationships(source, target),
    reverse: allowedRelationships(target, source),
  }
}

/** The guide anchor for an element type, or the element reference when there is none. */
export function guideHref(type: ElementType | undefined): string {
  return type ? `/guide#${type}` : '/guide#elements'
}
