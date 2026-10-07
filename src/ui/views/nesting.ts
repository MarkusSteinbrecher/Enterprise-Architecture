import {
  validateRelationshipBetween,
  type Element,
  type Relationship,
  type RelationshipConnection,
  type RelationshipType,
  type View,
} from '@/model'
import type { ConnectModel } from './connect'

/**
 * Nesting a shape in an element's shape (#131), as Archi 5.10.0 does it: its
 * `CreateNestedArchimateConnectionsWithDialogCommand`, run when a shape is moved
 * into an element's shape (`ArchimateContainerLayoutPolicy`), created there from
 * the palette (`CreateDiagramArchimateObjectCommand`) or dropped there from the
 * model tree (`ArchimateDNDEditPolicy`), all on by default. Read at the
 * `release_5.10.0` tag. Pure, so the canvas, its tests and the Archi oracle
 * fixture all ask the same question.
 *
 * - **Which children are asked about:** every element shape newly nested in the
 *   element shape, except a junction's.
 * - **When nothing is asked:** the model already holds a relationship from the
 *   parent's element to the child's of one of the offered types, or a
 *   Specialization the other way; or none of the types is valid between them.
 *   Archi's reverse-direction list (`NEW_REVERSE_RELATIONS_TYPES`) is empty by
 *   default, so nothing else counts.
 * - **What is offered:** each of `NESTING_TYPES` that ArchiMate allows from the
 *   parent's element to the child's, in that order, the first preselected.
 *   Specialization is checked that way round and created the other: the child
 *   is a kind of the parent (`NestedConnectionInfo.isInverted`).
 * - **What a choice makes:** the relationship, and a connection drawing it
 *   between the two shapes, which the canvas then hides (#96). "None", or
 *   closing the prompt, nests the shape and makes nothing.
 * - **Whatever is chosen:** a relationship of any type between the two elements
 *   that the view does not draw between the two shapes gets a connection, for
 *   each direction in which none of them is drawn yet (`createNewConnectionCommands`;
 *   `HIDDEN_RELATIONS_TYPES` holds all eleven by default). Archi does the same
 *   for a relationship whose end is another relationship drawn inside the
 *   parent; Archipelago's connections join only shapes, so that case cannot
 *   arise.
 */

/**
 * The relationship types a nesting can mean: Archi's `NEW_RELATIONS_TYPES`
 * default (`PreferenceInitializer`: bits 9, 8, 7, 6, 5 and 1), in the order of
 * `ConnectionPreferences.RELATION_KEYMAP`, which is the order Archi lists them.
 */
export const NESTING_TYPES = [
  'Composition',
  'Aggregation',
  'Access',
  'Assignment',
  'Realization',
  'Specialization',
] as const satisfies readonly RelationshipType[]

export interface NestingOption {
  readonly type: RelationshipType
  /** The relationship's ends as it would be made: parent to child, but child to parent for Specialization. */
  readonly source: Element
  readonly target: Element
}

export interface NestedChild {
  /** The child's shape. */
  readonly node: string
  readonly element: Element
  /** Never empty: a child with nothing to offer is not asked about. */
  readonly options: readonly NestingOption[]
}

export interface Nesting {
  /** The parent's shape. */
  readonly node: string
  readonly element: Element
  /** The children the prompt asks about, in the order given. */
  readonly ask: readonly NestedChild[]
}

/** A child's answer: the option chosen, or `null` for none. */
export type NestingChoices = ReadonlyMap<string, NestingOption | null>

/**
 * What nesting `child` in `parent` offers, or `undefined` when Archi would ask
 * nothing about it.
 */
export function nestingOptions(
  model: ConnectModel,
  parent: Element,
  child: Element,
): NestingOption[] | undefined {
  if (child.type === 'Junction') return undefined
  const offered = new Set<RelationshipType>(NESTING_TYPES)
  for (const r of model.relationshipsOf(parent.id)) {
    if (r.source === parent.id && r.target === child.id && offered.has(r.type)) return undefined
    if (r.source === child.id && r.target === parent.id && r.type === 'Specialization') {
      return undefined
    }
  }
  const options = NESTING_TYPES.filter(
    (type) => validateRelationshipBetween(model, parent, type, child).valid,
  ).map((type): NestingOption =>
    type === 'Specialization'
      ? { type, source: child, target: parent }
      : { type, source: parent, target: child },
  )
  return options.length > 0 ? options : undefined
}

/** The element a shape draws, if it is an element's shape. */
function elementOf(model: ConnectModel, view: View, nodeId: string): Element | undefined {
  const node = view.nodes.find((n) => n.id === nodeId)
  return node?.kind === 'element' ? model.element(node.element) : undefined
}

/**
 * The prompt for `children`, shapes just nested in `parent`, or `undefined`
 * when there is nothing to ask: the parent is not an element's shape (a group,
 * the view itself), or no child has anything to offer.
 */
export function nestingFor(
  model: ConnectModel,
  view: View,
  parent: string,
  children: readonly string[],
): Nesting | undefined {
  const element = elementOf(model, view, parent)
  if (!element) return undefined
  const ask = children.flatMap((node): NestedChild[] => {
    const child = elementOf(model, view, node)
    const options = child && nestingOptions(model, element, child)
    return child && options ? [{ node, element: child, options }] : []
  })
  return ask.length > 0 ? { node: parent, element, ask } : undefined
}

/**
 * `view` after `children` were nested in `parent`, with the choices made:
 * the relationships to add, and the view with their connections and those of
 * the relationships the model already holds between parent and child. Ids come
 * from `makeId`, called once per object, so a caller can fix them.
 */
export function nestingEdit(
  model: ConnectModel,
  view: View,
  parent: string,
  children: readonly string[],
  choices: NestingChoices,
  makeId: (kind: 'rel' | 'conn') => string,
): { view: View; relationships: Relationship[] } {
  const parentElement = elementOf(model, view, parent)
  if (!parentElement) return { view, relationships: [] }
  const relationships: Relationship[] = []
  const connections: RelationshipConnection[] = []

  // Chosen first, as Archi adds them first.
  for (const child of children) {
    const chosen = choices.get(child)
    if (!chosen) continue
    const id = makeId('rel')
    relationships.push({
      id,
      type: chosen.type,
      source: chosen.source.id,
      target: chosen.target.id,
      properties: {},
    })
    const forward = chosen.source.id === parentElement.id
    connections.push({
      id: makeId('conn'),
      kind: 'relationship',
      relationship: id,
      source: forward ? parent : child,
      target: forward ? child : parent,
    })
  }

  // Then the relationships the model held already, in each direction where the
  // view draws none of them between these two shapes.
  const drawn = (relationship: string, source: string, target: string) =>
    view.connections.some(
      (c) =>
        c.kind === 'relationship' &&
        c.relationship === relationship &&
        c.source === source &&
        c.target === target,
    )
  for (const child of children) {
    const childElement = elementOf(model, view, child)
    if (!childElement) continue
    const held = model.relationshipsOf(parentElement.id)
    for (const [from, to, fromNode, toNode] of [
      [parentElement.id, childElement.id, parent, child],
      [childElement.id, parentElement.id, child, parent],
    ] as const) {
      const between = held.filter((r) => r.source === from && r.target === to)
      if (between.some((r) => drawn(r.id, fromNode, toNode))) continue
      for (const r of between) {
        connections.push({
          id: makeId('conn'),
          kind: 'relationship',
          relationship: r.id,
          source: fromNode,
          target: toNode,
        })
      }
    }
  }

  return {
    view: connections.length
      ? { ...view, connections: [...view.connections, ...connections] }
      : view,
    relationships,
  }
}

/**
 * `model`, also holding `element`, which has no relationships yet: a new
 * element from the palette is asked about before the command that makes it.
 */
export function withNewElement(model: ConnectModel, element: Element): ConnectModel {
  return {
    element: (id) => (id === element.id ? element : model.element(id)),
    relationshipsOf: (id) => (id === element.id ? [] : model.relationshipsOf(id)),
  }
}
