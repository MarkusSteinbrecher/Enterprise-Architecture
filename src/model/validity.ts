import {
  ELEMENT_TYPES,
  elementTypeMeta,
  type ElementType,
  type ElementTypeMeta,
} from './element-types'
import { RELATIONSHIP_TYPE_NAMES, type RelationshipType } from './relationship-types'

/**
 * The ArchiMate 3.2 relationship validity matrix.
 *
 * The specification publishes the matrix as a generated table (Appendix B) that
 * already includes derived relationships, which is why it is so permissive. Rather
 * than transcribing ~4,000 cells that cannot be reviewed, this module expresses the
 * structural rules the matrix is generated from, over the (layer, aspect) metadata
 * in `element-types.ts`, plus a short list of named exceptions from the spec text.
 *
 * The rules, one per relationship type:
 *
 * | Relationship   | Rule                                                                    |
 * |----------------|-------------------------------------------------------------------------|
 * | Composition    | same aspect and same layer group; composite elements may contain anything |
 * | Aggregation    | as Composition, plus Product aggregating services and contracts          |
 * | Assignment     | active structure → behaviour; active → active within a layer group;      |
 * |                | technology active structure → artifact/material (deployment);            |
 * |                | Work Package → Deliverable; Stakeholder → Driver; Location → anything    |
 * | Realization    | source no more abstract than target (rank ≤), or anything → motivation,   |
 * |                | or implementation → core / implementation                               |
 * | Serving        | behaviour or active structure both ends, source rank ≤ target rank        |
 * | Access         | behaviour or active structure → passive structure                        |
 * | Influence      | anything → a motivation element                                          |
 * | Triggering     | behaviour, active structure or plateau at both ends                      |
 * | Flow           | as Triggering                                                            |
 * | Specialization | both ends the same element type                                          |
 * | Association    | always permitted                                                        |
 *
 * Grouping and Location connect to anything (spec: Grouping "may be related to any
 * other concept"); Junction participates in every relationship except the three
 * that require structural identity (Composition, Aggregation, Specialization).
 *
 * The rules are deliberately at least as permissive as the published matrix in the
 * places where the matrix admits derived relationships, and never more permissive
 * on the cross-layer patterns the tests pin down. Where the two could differ, the
 * tests in `validity.test.ts` are the specification of record.
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

/**
 * Abstraction rank: realization and serving flow from the concrete to the abstract.
 * Physical shares Technology's rank (the spec treats physical as a technology
 * extension); Strategy sits above Business.
 */
const LAYER_RANK: Record<string, number> = {
  technology: 1,
  physical: 1,
  application: 2,
  business: 3,
  strategy: 4,
}

/** Layer group used by the structural rules — technology and physical are one. */
function layerGroup(meta: ElementTypeMeta): string {
  return meta.layer === 'physical' ? 'technology' : meta.layer
}

function isCore(meta: ElementTypeMeta): boolean {
  return meta.layer in LAYER_RANK
}

function isMotivation(meta: ElementTypeMeta): boolean {
  return meta.aspect === 'motivation'
}

/** Grouping and Location — "may be related to any other concept". */
function isOpenComposite(meta: ElementTypeMeta): boolean {
  return meta.type === 'Grouping' || meta.type === 'Location'
}

function isJunction(meta: ElementTypeMeta): boolean {
  return meta.aspect === 'connector'
}

function isBehaviourOrActive(meta: ElementTypeMeta): boolean {
  return meta.aspect === 'behaviour' || meta.aspect === 'active-structure'
}

/** Relationship types that require structural identity and so reject junctions. */
const STRUCTURAL_IDENTITY: readonly RelationshipType[] = [
  'Composition',
  'Aggregation',
  'Specialization',
]

/** Product aggregates the services and contracts it bundles (spec §8.2.8). */
const PRODUCT_AGGREGATES: readonly string[] = [
  'BusinessService',
  'ApplicationService',
  'TechnologyService',
  'Contract',
]

function checkContainment(
  rel: 'Composition' | 'Aggregation',
  source: ElementTypeMeta,
  target: ElementTypeMeta,
): ValidityResult {
  // Plateau aggregates the core elements that make up a state of the architecture.
  if (source.type === 'Plateau') {
    return isCore(target) || target.type === 'Plateau' || target.aspect === 'composite'
      ? VALID
      : invalid(`A Plateau can only contain core elements, not ${target.label}.`)
  }
  if (rel === 'Aggregation' && source.type === 'Product') {
    if (PRODUCT_AGGREGATES.includes(target.type)) return VALID
  }
  if (source.aspect !== target.aspect) {
    return invalid(
      `${rel} joins elements of the same aspect — ${source.label} is ${source.aspect}, ${target.label} is ${target.aspect}.`,
    )
  }
  if (layerGroup(source) !== layerGroup(target)) {
    return invalid(
      `${rel} joins elements of the same layer — ${source.label} is ${source.layer}, ${target.label} is ${target.layer}. Consider Realization across layers.`,
    )
  }
  return VALID
}

function checkAssignment(source: ElementTypeMeta, target: ElementTypeMeta): ValidityResult {
  if (source.aspect === 'active-structure') {
    // Who performs what: active structure carries out behaviour.
    if (target.aspect === 'behaviour') return VALID
    // Actor fulfils role, node hosts node, interface belongs to a component.
    if (target.aspect === 'active-structure' && layerGroup(source) === layerGroup(target)) {
      return VALID
    }
    // Deployment: a node or device holds an artifact; equipment handles material.
    if (target.aspect === 'passive-structure' && layerGroup(source) === 'technology') {
      return VALID
    }
  }
  // A work package produces a deliverable.
  if (source.layer === 'implementation' && target.layer === 'implementation') {
    if (source.aspect === 'behaviour' && target.aspect === 'passive-structure') return VALID
  }
  // A stakeholder holds a driver.
  if (source.type === 'Stakeholder' && isMotivation(target)) return VALID

  return invalid(
    `Assignment runs from an active structure element to the behaviour it performs — ${source.label} cannot be assigned to ${target.label}.`,
  )
}

function checkRealization(source: ElementTypeMeta, target: ElementTypeMeta): ValidityResult {
  // Anything can realize a motivation element (a requirement, principle, goal).
  if (isMotivation(target)) return VALID
  // Deliverables realize the core elements and plateaus they produce.
  if (source.layer === 'implementation') {
    return isCore(target) || target.layer === 'implementation' || target.aspect === 'composite'
      ? VALID
      : invalid(`${source.label} cannot realize ${target.label}.`)
  }
  if (isCore(source) && isCore(target)) {
    const from = LAYER_RANK[layerGroup(source)] ?? 0
    const to = LAYER_RANK[layerGroup(target)] ?? 0
    if (from <= to) return VALID
    return invalid(
      `Realization runs from the concrete to the abstract — a ${source.label} (${source.layer}) cannot realize a ${target.label} (${target.layer}). Try the other direction, or Serving.`,
    )
  }
  return invalid(`${source.label} cannot realize ${target.label}.`)
}

function checkServing(source: ElementTypeMeta, target: ElementTypeMeta): ValidityResult {
  if (!isBehaviourOrActive(source) || !isBehaviourOrActive(target)) {
    return invalid(
      `Serving connects behaviour or active structure elements — ${source.label} and ${target.label} do not qualify.`,
    )
  }
  if (isCore(source) && isCore(target)) {
    const from = LAYER_RANK[layerGroup(source)] ?? 0
    const to = LAYER_RANK[layerGroup(target)] ?? 0
    if (from <= to) return VALID
    return invalid(
      `Serving runs from the serving element upward — a ${source.label} (${source.layer}) cannot serve a ${target.label} (${target.layer}).`,
    )
  }
  return VALID
}

function checkAccess(source: ElementTypeMeta, target: ElementTypeMeta): ValidityResult {
  if (!isBehaviourOrActive(source)) {
    return invalid(`Access starts at behaviour or active structure — ${source.label} does not.`)
  }
  if (target.aspect !== 'passive-structure') {
    return invalid(
      `Access targets passive structure (a business object, data object, artifact) — ${target.label} is ${target.aspect}.`,
    )
  }
  return VALID
}

function checkInfluence(source: ElementTypeMeta, target: ElementTypeMeta): ValidityResult {
  if (isMotivation(target)) return VALID
  return invalid(
    `Influence targets a motivation element — ${target.label} is not one. ${source.label} can use Association instead.`,
  )
}

function checkDynamic(
  rel: 'Triggering' | 'Flow',
  source: ElementTypeMeta,
  target: ElementTypeMeta,
): ValidityResult {
  const ok = (m: ElementTypeMeta) => isBehaviourOrActive(m) || m.type === 'Plateau'
  if (ok(source) && ok(target)) return VALID
  return invalid(
    `${rel} connects behaviour or active structure elements — ${source.label} and ${target.label} do not qualify.`,
  )
}

/**
 * Is `source —rel→ target` a legal ArchiMate 3.2 relationship?
 *
 * The `reason` on a rejection is written for the relation picker in the fact sheet,
 * so it explains the rule rather than restating the inputs.
 */
export function validateRelationship(
  sourceType: ElementType,
  relType: RelationshipType,
  targetType: ElementType,
): ValidityResult {
  const source = elementTypeMeta(sourceType)
  const target = elementTypeMeta(targetType)

  // A junction is a connector, not a concept: it joins dynamic and dependency
  // relationships and takes no part in the three that require structural identity.
  if (isJunction(source) || isJunction(target)) {
    return STRUCTURAL_IDENTITY.includes(relType)
      ? invalid(`A Junction cannot take part in a ${relType} relationship.`)
      : VALID
  }

  // Specialization is about type identity, so it is checked before the escape hatch
  // that lets Grouping and Location relate to anything.
  if (relType === 'Specialization') {
    return sourceType === targetType
      ? VALID
      : invalid(
          `Specialization joins two elements of the same type — ${source.label} and ${target.label} differ.`,
        )
  }

  // Grouping and Location are the modelling escape hatch: they relate to anything.
  if (isOpenComposite(source) || isOpenComposite(target)) return VALID

  switch (relType) {
    case 'Association':
      return VALID
    case 'Composition':
    case 'Aggregation':
      return checkContainment(relType, source, target)
    case 'Assignment':
      return checkAssignment(source, target)
    case 'Realization':
      return checkRealization(source, target)
    case 'Serving':
      return checkServing(source, target)
    case 'Access':
      return checkAccess(source, target)
    case 'Influence':
      return checkInfluence(source, target)
    case 'Triggering':
    case 'Flow':
      return checkDynamic(relType, source, target)
  }
}

/** Every relationship type permitted from `sourceType` to `targetType`. */
export function allowedRelationships(
  sourceType: ElementType,
  targetType: ElementType,
): RelationshipType[] {
  return RELATIONSHIP_TYPE_NAMES.filter(
    (rel) => validateRelationship(sourceType, rel, targetType).valid,
  )
}

/** Every element type that can be the target of `sourceType —relType→ ?`. */
export function allowedTargets(sourceType: ElementType, relType: RelationshipType): ElementType[] {
  return ELEMENT_TYPES.map((m) => m.type).filter(
    (target) => validateRelationship(sourceType, relType, target).valid,
  )
}

/**
 * Materialise the whole matrix as `source>target → relationship types`.
 * Used by the relation picker and by the matrix tests; ~4k entries, so build it
 * once and keep it rather than calling this per render.
 */
export function buildValidityMatrix(): Map<string, readonly RelationshipType[]> {
  const matrix = new Map<string, readonly RelationshipType[]>()
  for (const source of ELEMENT_TYPES) {
    for (const target of ELEMENT_TYPES) {
      matrix.set(`${source.type}>${target.type}`, allowedRelationships(source.type, target.type))
    }
  }
  return matrix
}
