import { findElementType, isElementType, typeLabel } from './element-types'
import { meansNesting } from './nesting'
import { isRelationshipType } from './relationship-types'
import type { Finding, FindingSeverity } from './validate'
import {
  validateRelationshipBetween,
  type RelationshipContext,
  type RelationshipRef,
} from './validity'
import { findViewpoint, viewpointAllows } from './viewpoints'
import type {
  Element,
  ElementNode,
  Relationship,
  RelationshipConnection,
  Workspace,
} from './workspace'

/**
 * Archi 5.10's eight validator checks (`com.archimatetool.hammer`, #193),
 * ported from the bytecode of each `*Checker` class (read with `javap` on
 * `com.archimatetool.hammer_5.10.0.202605271610.jar`). Archi's command line
 * has no validator, so there is no output to diff against: each check's
 * evidence is a fixture built to trip it alone (`checks.test.ts`).
 *
 * Archipelago's own findings (`validate()`'s integrity checks: dangling
 * references, duplicate ids, unparseable dates) are not here. They run on
 * every validation and cannot be switched off.
 */

/** One per checker, named after its Archi preference key (`checkInvalidRelations` → `invalid-relations`). */
export type CheckId =
  | 'invalid-relations'
  | 'unused-elements'
  | 'unused-relations'
  | 'empty-views'
  | 'viewpoint'
  | 'nesting'
  | 'duplicate-elements'
  | 'junctions'

export interface Check {
  readonly id: CheckId
  /** The checker's issue name (`*Checker_0` in `checkers/messages.properties`), which heads its findings. */
  readonly name: string
  /** Its line on Archi's Validator preference page (`ValidatorPreferencePage_*`). */
  readonly label: string
  /** The issue type the checker creates: `ErrorType`, `WarningType` or `AdviceType`. */
  readonly severity: FindingSeverity
  /** The Archi class, for the record. */
  readonly checker: string
}

/**
 * In the order Archi's `Validator.validate` runs them. Every one is on by
 * default (`PreferenceInitializer` sets all eight preferences to true).
 */
export const CHECKS: readonly Check[] = [
  {
    id: 'invalid-relations',
    name: 'Illegal relation',
    label: 'Invalid relations',
    severity: 'error',
    checker: 'InvalidRelationsChecker',
  },
  {
    id: 'unused-elements',
    name: 'Unused element',
    label: 'Unused elements',
    severity: 'warning',
    checker: 'UnusedElementsChecker',
  },
  {
    id: 'unused-relations',
    name: 'Unused relation',
    label: 'Unused relations',
    severity: 'warning',
    checker: 'UnusedRelationsChecker',
  },
  {
    id: 'empty-views',
    name: 'Empty view',
    label: 'Empty views',
    severity: 'advice',
    checker: 'EmptyViewsChecker',
  },
  {
    id: 'viewpoint',
    name: 'Concept in viewpoint',
    label: 'Invalid elements in viewpoints',
    severity: 'warning',
    checker: 'ViewpointChecker',
  },
  {
    id: 'nesting',
    name: 'Visual nesting',
    label: 'Invalid nested elements',
    severity: 'advice',
    checker: 'NestedElementsChecker',
  },
  {
    id: 'duplicate-elements',
    name: 'Possible duplicate',
    label: 'Possible duplicate elements',
    severity: 'warning',
    checker: 'DuplicateElementChecker',
  },
  {
    id: 'junctions',
    name: 'Junction relationships',
    label: 'Relations to junctions',
    severity: 'error',
    checker: 'JunctionsChecker',
  },
]

export const CHECK_IDS: readonly CheckId[] = CHECKS.map((check) => check.id)

const BY_ID = new Map(CHECKS.map((check) => [check.id, check]))

export function findCheck(id: CheckId): Check {
  return BY_ID.get(id)!
}

export function isCheckId(value: unknown): value is CheckId {
  return typeof value === 'string' && BY_ID.has(value as CheckId)
}

/** What the checks read from the model, indexed once per run: 5,000 elements make a scan per element quadratic. */
export interface CheckModel {
  readonly workspace: Workspace
  readonly elementsById: ReadonlyMap<string, Element>
  readonly relationshipsById: ReadonlyMap<string, Relationship>
  /** Every relationship of a known type touching the element, in either direction, each once. */
  readonly relationshipsOf: (elementId: string) => readonly Relationship[]
  readonly context: RelationshipContext
  /** Elements some view draws, and relationships some view draws. */
  readonly drawnElements: ReadonlySet<string>
  readonly drawnRelationships: ReadonlySet<string>
}

export function checkModel(workspace: Workspace): CheckModel {
  const elementsById = new Map(workspace.elements.map((element) => [element.id, element]))
  const relationshipsById = new Map(workspace.relationships.map((r) => [r.id, r]))
  const byElement = new Map<string, Relationship[]>()
  for (const relationship of workspace.relationships) {
    if (!isRelationshipType(relationship.type)) continue
    for (const end of new Set([relationship.source, relationship.target])) {
      const list = byElement.get(end)
      if (list) list.push(relationship)
      else byElement.set(end, [relationship])
    }
  }
  const relationshipsOf = (id: string): readonly Relationship[] => byElement.get(id) ?? []
  const drawnElements = new Set<string>()
  const drawnRelationships = new Set<string>()
  for (const view of workspace.views) {
    for (const node of view.nodes) if (node.kind === 'element') drawnElements.add(node.element)
    for (const connection of view.connections) {
      if (connection.kind === 'relationship') drawnRelationships.add(connection.relationship)
    }
  }
  return {
    workspace,
    elementsById,
    relationshipsById,
    relationshipsOf,
    // The junction rules see only known types: the others are reported on their own.
    context: {
      element: (id) => {
        const element = elementsById.get(id)
        return element && isElementType(element.type) ? element : undefined
      },
      relationshipsOf: (id) => relationshipsOf(id) as readonly RelationshipRef[],
    },
    drawnElements,
    drawnRelationships,
  }
}

/** Archi's `ArchiLabelProvider.getLabel`: the name, or the type's name when there is none. */
function label(element: Element): string {
  return element.name.trim() ? element.name : typeLabel(element.type)
}

function relationshipLabel(model: CheckModel, relationship: Relationship): string {
  if (relationship.name?.trim()) return relationship.name
  const source = model.elementsById.get(relationship.source)
  const target = model.elementsById.get(relationship.target)
  return `${relationship.type} from "${source ? label(source) : relationship.source}" to "${target ? label(target) : relationship.target}"`
}

function finding(
  check: CheckId,
  code: string,
  message: string,
  subject: Pick<Finding, 'subjectId' | 'subjectKind' | 'viewId'>,
): Finding {
  return { severity: findCheck(check).severity, code, message, ...subject, check }
}

// ── The eight ────────────────────────────────────────────────────────────────

/**
 * `InvalidRelationsChecker`: every relationship through
 * `ArchimateModelUtils.isValidRelationship`, which is the matrix and the
 * junction rules (`validateRelationshipBetween`). A relationship with a
 * dangling end or an unknown type is Archipelago's finding, not this one.
 */
export function invalidRelations(model: CheckModel): Finding[] {
  const findings: Finding[] = []
  for (const relationship of model.workspace.relationships) {
    if (!isRelationshipType(relationship.type)) continue
    const source = model.elementsById.get(relationship.source)
    const target = model.elementsById.get(relationship.target)
    if (!source || !target || !findElementType(source.type) || !findElementType(target.type)) {
      continue
    }
    const result = validateRelationshipBetween(model.context, source, relationship.type, target)
    if (result.valid) continue
    findings.push(
      finding(
        'invalid-relations',
        'relationship.invalid',
        `${relationship.type} from "${source.name}" to "${target.name}" is not permitted. ${result.reason ?? ''}`.trim(),
        { subjectId: relationship.id, subjectKind: 'relationship' },
      ),
    )
  }
  return findings
}

/**
 * `UnusedElementsChecker`: an element no view draws
 * (`DiagramModelUtils.isArchimateConceptReferencedInDiagrams`, which asks
 * whether any diagram component references it).
 */
export function unusedElements(model: CheckModel): Finding[] {
  return model.workspace.elements
    .filter((element) => !model.drawnElements.has(element.id))
    .map((element) =>
      finding('unused-elements', 'element.unused', `"${label(element)}" is not used in a view.`, {
        subjectId: element.id,
        subjectKind: 'element',
      }),
    )
}

/**
 * `UnusedRelationsChecker`: a relationship no view draws. A connection the
 * canvas hides because the nesting shows it (#96) still draws it.
 */
export function unusedRelations(model: CheckModel): Finding[] {
  return model.workspace.relationships
    .filter((relationship) => !model.drawnRelationships.has(relationship.id))
    .map((relationship) =>
      finding(
        'unused-relations',
        'relationship.unused',
        `"${relationshipLabel(model, relationship)}" is not used in a view.`,
        { subjectId: relationship.id, subjectKind: 'relationship' },
      ),
    )
}

/**
 * `EmptyViewsChecker`: a view whose `getChildren()` is empty. Its message says
 * "any elements or relationships", but the test is any child at all, so a
 * view holding only a note or a group is not empty.
 */
export function emptyViews(model: CheckModel): Finding[] {
  return model.workspace.views
    .filter((view) => view.nodes.length === 0)
    .map((view) =>
      finding('empty-views', 'view.empty', `"${view.name}" is empty.`, {
        subjectId: view.id,
        subjectKind: 'view',
      }),
    )
}

/**
 * `ViewpointChecker`: each element's shape, at any depth, whose type the view's
 * viewpoint does not allow (`viewpointAllows`, the palette's rule). Archi
 * 5.10 has a message for a relationship too, but `findComponentsInWrongViewpoints`
 * only passes `IDiagramModelArchimateObject`s (shapes) to `createIssue`, so no
 * relationship is ever reported, and none is here.
 */
export function viewpointConcepts(model: CheckModel): Finding[] {
  const findings: Finding[] = []
  for (const view of model.workspace.views) {
    for (const node of view.nodes) {
      if (node.kind !== 'element') continue
      const element = model.elementsById.get(node.element)
      if (!element || !isElementType(element.type)) continue
      // No viewpoint, one that allows everything (Layered) and one we do not know all allow it.
      if (viewpointAllows(view.viewpoint, element.type)) continue
      const viewpoint = findViewpoint(view.viewpoint)!
      findings.push(
        finding(
          'viewpoint',
          'view.viewpoint-concept',
          `"${label(element)}" does not belong in "${view.name}" (${viewpoint.name} viewpoint).`,
          { subjectId: node.id, subjectKind: 'node', viewId: view.id },
        ),
      )
    }
  }
  return findings
}

/**
 * `NestedElementsChecker`: an element's shape nested directly in another
 * element's shape where the model says nothing that nesting can mean. The
 * meaning is `meansNesting`, the rule the canvas's nesting prompt asks (#131).
 * Archi's `isNestedWithoutValidRelation`, in order:
 *
 * 1. A junction's shape is never reported.
 * 2. A line the view draws between the two shapes that does not mean the
 *    nesting (another type, or a nesting type the wrong way round) reports it,
 *    whatever else the model holds.
 * 3. Otherwise a relationship of a nesting type between the two elements, in
 *    either direction, drawn or not, means it is not reported. Archi's model
 *    test does not check the direction; only its test of drawn lines does.
 */
export function nestedElements(model: CheckModel): Finding[] {
  const findings: Finding[] = []
  for (const view of model.workspace.views) {
    const nodesById = new Map(view.nodes.map((node) => [node.id, node]))
    const linesOf = new Map<string, RelationshipConnection[]>()
    for (const connection of view.connections) {
      if (connection.kind !== 'relationship') continue
      for (const end of new Set([connection.source, connection.target])) {
        const list = linesOf.get(end)
        if (list) list.push(connection)
        else linesOf.set(end, [connection])
      }
    }
    for (const child of view.nodes) {
      if (child.kind !== 'element' || child.parent === undefined) continue
      const parent = nodesById.get(child.parent)
      if (parent?.kind !== 'element') continue
      const parentElement = model.elementsById.get(parent.element)
      const childElement = model.elementsById.get(child.element)
      if (!parentElement || !childElement) continue
      if (!nestedWithoutMeaning(model, linesOf.get(child.id) ?? [], parent, child)) continue
      findings.push(
        finding(
          'nesting',
          'view.nesting-without-relationship',
          `"${label(childElement)}" is nested inside of "${label(parentElement)}" but there is a non-nesting relationship between them or no relationship.`,
          { subjectId: child.id, subjectKind: 'node', viewId: view.id },
        ),
      )
    }
  }
  return findings
}

function nestedWithoutMeaning(
  model: CheckModel,
  childLines: readonly RelationshipConnection[],
  parent: ElementNode,
  child: ElementNode,
): boolean {
  if (model.elementsById.get(child.element)?.type === 'Junction') return false
  for (const connection of childLines) {
    const between =
      (connection.source === parent.id && connection.target === child.id) ||
      (connection.source === child.id && connection.target === parent.id)
    if (!between) continue
    const relationship = model.relationshipsById.get(connection.relationship)
    if (!relationship) continue
    if (!meansNesting(relationship, parent.element, child.element)) return true
  }
  for (const relationship of model.relationshipsOf(parent.element)) {
    if (
      meansNesting(relationship, parent.element, child.element) ||
      meansNesting(relationship, child.element, parent.element)
    ) {
      return false
    }
  }
  return true
}

/**
 * `DuplicateElementChecker`: two elements of one type with one name. Its
 * `isDuplicate` compares `StringUtils.safeString(name)` with `String.equals`,
 * so case and surrounding spaces count, and two unnamed elements of a type
 * are duplicates; and it compares `eClass()` by identity, so the type must be
 * the same. Two junctions are never duplicates. Each duplicate is one finding,
 * in the order Archi's pairwise scan adds them to its `LinkedHashSet`.
 */
export function duplicateElements(model: CheckModel): Finding[] {
  const groups = new Map<string, Element[]>()
  const keyOf = (element: Element) => JSON.stringify([element.type, element.name])
  for (const element of model.workspace.elements) {
    if (element.type === 'Junction' || !isElementType(element.type)) continue
    const key = keyOf(element)
    const group = groups.get(key)
    if (group) group.push(element)
    else groups.set(key, [element])
  }
  const findings: Finding[] = []
  const reported = new Set<string>()
  for (const element of model.workspace.elements) {
    const group = groups.get(keyOf(element))
    if (!group || group.length < 2 || reported.has(keyOf(element))) continue
    reported.add(keyOf(element))
    for (const duplicate of group) {
      findings.push(
        finding(
          'duplicate-elements',
          'element.duplicate-name',
          `The name "${duplicate.name}" is used more than once for the type ${typeLabel(duplicate.type)}.`,
          { subjectId: duplicate.id, subjectKind: 'element' },
        ),
      )
    }
  }
  return findings
}

/**
 * `JunctionsChecker`: a junction whose relationships are not all of one type,
 * reported once. Unlike `isValidRelationship`, it makes no exception for a
 * Grouping or Location containing the junction: it compares the `eClass` of
 * every relationship `getAllRelationshipsForConcept` returns.
 */
export function junctions(model: CheckModel): Finding[] {
  const findings: Finding[] = []
  for (const element of model.workspace.elements) {
    if (element.type !== 'Junction') continue
    const types = new Set(model.relationshipsOf(element.id).map((r) => r.type))
    if (types.size < 2) continue
    findings.push(
      finding(
        'junctions',
        'junction.mixed-types',
        `"${label(element)}" has different relationship types. A junction's incoming and outgoing relationships should all be of one type.`,
        { subjectId: element.id, subjectKind: 'element' },
      ),
    )
  }
  return findings
}

const RUN: Readonly<Record<CheckId, (model: CheckModel) => Finding[]>> = {
  'invalid-relations': invalidRelations,
  'unused-elements': unusedElements,
  'unused-relations': unusedRelations,
  'empty-views': emptyViews,
  viewpoint: viewpointConcepts,
  nesting: nestedElements,
  'duplicate-elements': duplicateElements,
  junctions,
}

/** The findings of each check in `enabled`, in Archi's order. */
export function runChecks(
  workspace: Workspace,
  enabled: ReadonlySet<CheckId> = new Set(CHECK_IDS),
  model: CheckModel = checkModel(workspace),
): Finding[] {
  return CHECKS.filter((check) => enabled.has(check.id)).flatMap((check) => RUN[check.id](model))
}
