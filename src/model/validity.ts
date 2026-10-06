import matrixXml from './archi/relationships.xml?raw'
import { ELEMENT_TYPES, elementTypeMeta, type ElementType } from './element-types'
import { RELATIONSHIP_TYPE_NAMES, type RelationshipType } from './relationship-types'

/**
 * The ArchiMate 3.2 relationship validity matrix: which relationship types may
 * join an element of one type to an element of another.
 *
 * The data is Archi's own `relationships.xml` (`./archi/`, vendored unmodified,
 * MIT; see its NOTICE): the specification's Appendix B as Archi 5.10 enforces
 * it. Archi is the oracle for everything the editor makes (ADR 0008), so a
 * relationship we allow and Archi does not is one its validator flags in a
 * model we saved. Until #129 this module derived the matrix from structural
 * rules over (layer, aspect) instead; that disagreed with Archi on 5,437 cells,
 * allowing 4,540 that Archi rejects and rejecting 897 that Archi allows.
 *
 * A junction is checked against the model as well as the matrix, as Archi does
 * (`ArchimateModelUtils.isValidRelationship`, read with `javap`): see
 * `validateRelationshipBetween`.
 */

export interface ValidityResult {
  readonly valid: boolean
  /** Human-readable explanation, present when `valid` is false. */
  readonly reason?: string
}

const VALID: ValidityResult = { valid: true }

function invalid(reason: string): ValidityResult {
  return { valid: false, reason }
}

/** `relationships-keys.xml`, beside Archi's matrix. */
const LETTERS: Readonly<Record<string, RelationshipType>> = {
  a: 'Access',
  c: 'Composition',
  f: 'Flow',
  g: 'Aggregation',
  i: 'Assignment',
  n: 'Influence',
  o: 'Association',
  r: 'Realization',
  s: 'Specialization',
  t: 'Triggering',
  v: 'Serving',
}

/**
 * `source>target` → the relationship types allowed between them. A pair the
 * file does not list allows nothing, as in Archi. `validity.test.ts` holds that
 * the file lists every pair of our element types, so a renamed type cannot
 * quietly allow nothing.
 */
export function parseRelationshipMatrix(xml: string): Map<string, ReadonlySet<RelationshipType>> {
  const matrix = new Map<string, ReadonlySet<RelationshipType>>()
  let source: string | undefined
  for (const match of xml.matchAll(
    /<(source|target)\s+concept="(\w+)"(?:\s+relations="(\w*)")?/g,
  )) {
    const [, tag, concept, relations] = match
    if (tag === 'source') {
      source = concept
      continue
    }
    if (source === undefined)
      throw new Error(`relationships.xml: target ${concept} outside a source`)
    const allowed = new Set<RelationshipType>()
    // Upper case marks a derived relationship in Archi's format; it is allowed all the same.
    for (const letter of relations ?? '') {
      const type = LETTERS[letter.toLowerCase()]
      if (!type)
        throw new Error(`relationships.xml: unknown letter "${letter}" for ${source}>${concept}`)
      allowed.add(type)
    }
    matrix.set(`${source}>${concept}`, allowed)
  }
  return matrix
}

const MATRIX = parseRelationshipMatrix(matrixXml)
const NONE: ReadonlySet<RelationshipType> = new Set()

function allowedSet(sourceType: string, targetType: string): ReadonlySet<RelationshipType> {
  return MATRIX.get(`${sourceType}>${targetType}`) ?? NONE
}

function list(types: readonly string[]): string {
  if (types.length <= 1) return types.join('')
  return `${types.slice(0, -1).join(', ')} and ${types.at(-1)}`
}

/**
 * Is `source —rel→ target` a legal ArchiMate 3.2 relationship between elements
 * of these types? The `reason` on a rejection is written for the relation
 * pickers, so it says what is allowed instead.
 */
export function validateRelationship(
  sourceType: ElementType,
  relType: RelationshipType,
  targetType: ElementType,
): ValidityResult {
  if (allowedSet(sourceType, targetType).has(relType)) return VALID
  const source = elementTypeMeta(sourceType).label
  const target = elementTypeMeta(targetType).label
  const allowed = allowedRelationships(sourceType, targetType)
  const instead = allowed.length
    ? `From ${source} to ${target} it allows ${list(allowed)}.`
    : `It allows no relationship from ${source} to ${target}.`
  const reverse = allowedSet(targetType, sourceType).has(relType)
    ? ` ${relType} is allowed the other way, from ${target} to ${source}.`
    : ''
  return invalid(
    `ArchiMate does not allow ${relType} from ${source} to ${target}. ${instead}${reverse}`,
  )
}

/** Every relationship type permitted from `sourceType` to `targetType`, in catalogue order. */
export function allowedRelationships(
  sourceType: ElementType,
  targetType: ElementType,
): RelationshipType[] {
  const allowed = allowedSet(sourceType, targetType)
  return RELATIONSHIP_TYPE_NAMES.filter((rel) => allowed.has(rel))
}

/** Every element type that can be the target of `sourceType —relType→ ?`. */
export function allowedTargets(sourceType: ElementType, relType: RelationshipType): ElementType[] {
  return ELEMENT_TYPES.map((m) => m.type).filter((target) =>
    allowedSet(sourceType, target).has(relType),
  )
}

/** The whole matrix as `source>target → relationship types`, for the tests. */
export function buildValidityMatrix(): Map<string, readonly RelationshipType[]> {
  const matrix = new Map<string, readonly RelationshipType[]>()
  for (const source of ELEMENT_TYPES) {
    for (const target of ELEMENT_TYPES) {
      matrix.set(`${source.type}>${target.type}`, allowedRelationships(source.type, target.type))
    }
  }
  return matrix
}

// ── In a model: junctions ────────────────────────────────────────────────────

/** An element as the junction rules see it. */
export interface ElementRef {
  readonly id: string
  readonly type: ElementType
}

/** A relationship as the junction rules see it. */
export interface RelationshipRef {
  readonly id: string
  readonly type: RelationshipType
  readonly source: string
  readonly target: string
}

/** What the junction rules read from the model. The store satisfies it. */
export interface RelationshipContext {
  element(id: string): ElementRef | undefined
  /** Every relationship touching the element, in either direction, each once. */
  relationshipsOf(elementId: string): readonly RelationshipRef[]
}

/** A Grouping or Location containing something: Archi's exception to the junction rules. */
function isContainment(sourceType: ElementType, relType: RelationshipType): boolean {
  return (
    (sourceType === 'Grouping' || sourceType === 'Location') &&
    (relType === 'Aggregation' || relType === 'Composition')
  )
}

/** The first relationship on `junction` of another type than `relType`, if any. */
function otherTypeOn(
  context: RelationshipContext,
  junction: string,
  relType: RelationshipType,
): RelationshipRef | undefined {
  return context.relationshipsOf(junction).find((r) => {
    if (r.type === relType) return false
    const from = context.element(r.source)
    return !(from && isContainment(from.type, r.type))
  })
}

/**
 * Is `source —relType→ target` legal between these two elements of the model?
 *
 * The matrix, and two rules for a junction, both Archi's
 * (`ArchimateModelUtils.isValidRelationship`, which its connection tool and its
 * validator both call):
 *
 * - **One type.** Every relationship on a junction is of one type, so a
 *   junction joining Flows takes no Serving. A Grouping or Location containing
 *   the junction does not count.
 * - **Through it.** A junction stands for the relationships it joins, so each
 *   element on its far side must be a legal end. From a junction to `target`,
 *   every element flowing into the junction must be allowed to reach `target`;
 *   from `source` to a junction, `source` must be allowed to reach every
 *   element the junction leads to.
 *
 * The validator checks a relationship already in the model the same way: its
 * own type matches itself, and it is never on the far side of its own junction.
 */
export function validateRelationshipBetween(
  context: RelationshipContext,
  source: ElementRef,
  relType: RelationshipType,
  target: ElementRef,
): ValidityResult {
  if (source.type === 'Junction') {
    for (const r of context.relationshipsOf(source.id)) {
      if (r.target !== source.id) continue
      const before = context.element(r.source)
      if (before && !allowedSet(before.type, target.type).has(relType)) {
        return invalid(
          `Through this junction, ${relType} would join ${elementTypeMeta(before.type).label} to ${elementTypeMeta(target.type).label}, which ArchiMate does not allow.`,
        )
      }
    }
    const other = otherTypeOn(context, source.id, relType)
    if (other) return invalid(oneType(other.type, relType))
  }
  if (target.type === 'Junction' && !isContainment(source.type, relType)) {
    for (const r of context.relationshipsOf(target.id)) {
      if (r.source !== target.id) continue
      const after = context.element(r.target)
      if (after && !allowedSet(source.type, after.type).has(relType)) {
        return invalid(
          `Through this junction, ${relType} would join ${elementTypeMeta(source.type).label} to ${elementTypeMeta(after.type).label}, which ArchiMate does not allow.`,
        )
      }
    }
    const other = otherTypeOn(context, target.id, relType)
    if (other) return invalid(oneType(other.type, relType))
  }
  return validateRelationship(source.type, relType, target.type)
}

function oneType(joined: RelationshipType, relType: RelationshipType): string {
  return `This junction already joins ${joined} relationships, and every relationship on a junction is of one type, so it cannot take ${relType}.`
}

/** Every relationship type `validateRelationshipBetween` allows, in catalogue order. */
export function allowedRelationshipsBetween(
  context: RelationshipContext,
  source: ElementRef,
  target: ElementRef,
): RelationshipType[] {
  return RELATIONSHIP_TYPE_NAMES.filter(
    (rel) => validateRelationshipBetween(context, source, rel, target).valid,
  )
}
