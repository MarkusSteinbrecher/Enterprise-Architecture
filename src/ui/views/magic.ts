import { defaultNodeSize } from '@/io/default-sizes'
import {
  LAYER_LABELS,
  RELATIONSHIP_TYPE_NAMES,
  junctionTypes,
  typeLabel,
  validateRelationshipBetween,
  viewpointAllows,
  type Element,
  type ElementNode,
  type ElementType,
  type Layer,
  type Point,
  type Relationship,
  type RelationshipContext,
  type RelationshipType,
  type View,
} from '@/model'
import { newElement, placement } from './create'

/**
 * The magic connector (#132): a connect gesture released on empty canvas asks
 * which relationship and which new element, and makes both, drawn, in one
 * command. Pure, so the menu, its tests and the Archi fixture
 * (`edited-claims.ts`) ask the same question and make the same edit.
 *
 * Everything here follows Archi 5.10's `MagicConnectionCreationTool`, with its
 * default preferences: relationship types first (`polarityMagicConnector` is
 * false), each opening the element types valid as its target, grouped by layer;
 * and the view's viewpoint hides target types it does not allow
 * (`viewpointsHideMagicConnectorElements` is true).
 */

/**
 * The target groups, in Archi's order and with Archi's members in Archi's
 * order (`ArchimateModelUtils.get…Classes`). It is not the catalogue's: Archi
 * lists Value Stream before Course of Action, and closes "Other" with the
 * junction (`getConnectorClasses`).
 */
export const MAGIC_TARGET_GROUPS: readonly { layer: Layer; types: readonly ElementType[] }[] = [
  { layer: 'strategy', types: ['Resource', 'Capability', 'ValueStream', 'CourseOfAction'] },
  {
    layer: 'business',
    types: [
      'BusinessActor',
      'BusinessRole',
      'BusinessCollaboration',
      'BusinessInterface',
      'BusinessProcess',
      'BusinessFunction',
      'BusinessInteraction',
      'BusinessEvent',
      'BusinessService',
      'BusinessObject',
      'Contract',
      'Representation',
      'Product',
    ],
  },
  {
    layer: 'application',
    types: [
      'ApplicationComponent',
      'ApplicationCollaboration',
      'ApplicationInterface',
      'ApplicationFunction',
      'ApplicationInteraction',
      'ApplicationProcess',
      'ApplicationEvent',
      'ApplicationService',
      'DataObject',
    ],
  },
  {
    layer: 'technology',
    types: [
      'Node',
      'Device',
      'SystemSoftware',
      'TechnologyCollaboration',
      'TechnologyInterface',
      'Path',
      'CommunicationNetwork',
      'TechnologyFunction',
      'TechnologyProcess',
      'TechnologyInteraction',
      'TechnologyEvent',
      'TechnologyService',
      'Artifact',
    ],
  },
  { layer: 'physical', types: ['Equipment', 'Facility', 'DistributionNetwork', 'Material'] },
  {
    layer: 'motivation',
    types: [
      'Stakeholder',
      'Driver',
      'Assessment',
      'Goal',
      'Outcome',
      'Principle',
      'Requirement',
      'Constraint',
      'Meaning',
      'Value',
    ],
  },
  {
    layer: 'implementation',
    types: ['WorkPackage', 'Deliverable', 'ImplementationEvent', 'Plateau', 'Gap'],
  },
  { layer: 'other', types: ['Location', 'Grouping', 'Junction'] },
]

/**
 * What a relationship from the source is called in the menu: Archi's phrase
 * for its forward direction (`ArchiLabelProvider.getRelationshipPhrase`).
 */
export const RELATIONSHIP_PHRASES: Readonly<Record<RelationshipType, string>> = {
  Composition: 'Composed of',
  Aggregation: 'Aggregates',
  Assignment: 'Assigned to',
  Realization: 'Realizes',
  Serving: 'Serves',
  Access: 'Accesses',
  Influence: 'Influences',
  Triggering: 'Triggers',
  Flow: 'Flows to',
  Specialization: 'Specializes',
  Association: 'Associated to',
}

export interface MagicTargetGroup {
  layer: Layer
  label: string
  types: ElementType[]
}

export interface MagicEntry {
  type: RelationshipType
  phrase: string
  /** Only groups with a type in them, as Archi drops an empty submenu. */
  groups: MagicTargetGroup[]
}

/**
 * Stands for the element the menu would create. A new element has no
 * relationships yet, so the junction rules see a junction with nothing on it,
 * as Archi's check on a freshly created concept does.
 */
const NEW_TARGET = '\u0000magic-target'

/**
 * The menu for a gesture from `source` in a view with `viewpoint`: every
 * relationship type, in catalogue order (which is Archi's), that reaches at
 * least one target type, and under it each target type for which
 * `validateRelationshipBetween` holds. The source's own relationships count,
 * so from a junction the menu keeps to the type the junction already joins.
 */
export function magicMenu(
  model: RelationshipContext,
  source: Element,
  viewpoint: string | undefined,
): MagicEntry[] {
  const entries: MagicEntry[] = []
  for (const type of RELATIONSHIP_TYPE_NAMES) {
    const groups: MagicTargetGroup[] = []
    for (const group of MAGIC_TARGET_GROUPS) {
      const types = group.types.filter(
        (target) =>
          viewpointAllows(viewpoint, target) &&
          validateRelationshipBetween(model, source, type, { id: NEW_TARGET, type: target }).valid,
      )
      if (types.length) groups.push({ layer: group.layer, label: LAYER_LABELS[group.layer], types })
    }
    if (groups.length) entries.push({ type, phrase: RELATIONSHIP_PHRASES[type], groups })
  }
  return entries
}

/**
 * What the menu says when it offers nothing. Every relationship type reaches
 * some new element from any element, and a junction joining one type still
 * reaches a new junction with it, so only a junction already joining more than
 * one type empties the menu: a file can hold one, the connect menu cannot make
 * one (`magic.test.tsx` holds both claims).
 */
export function magicNothing(model: RelationshipContext, source: Element): string {
  const name = source.name ? `${typeLabel(source.type)} “${source.name}”` : typeLabel(source.type)
  // In catalogue order, not the order the store happens to hold them in.
  const types = junctionTypes(model, source.id)
  const joined = RELATIONSHIP_TYPE_NAMES.filter((type) => types.includes(type)).join(' and ')
  return `No relationship can start from ${name}. It already joins ${joined} relationships, and every relationship on a junction is of one type. Nothing was created.`
}

/** What one menu choice makes: the new element, the relationship to it, and the view drawing both. */
export interface MagicEdit {
  view: View
  element: Element
  relationship: Relationship
  /** The new element's node, which the canvas selects and names. */
  node: string
}

/**
 * `view` with a new element of `targetType` drawn with its top-left corner at
 * `at`, and a new `type` relationship from the element `sourceNode` draws to
 * it, drawn too. Placed as the palette places (`placement`), so a spot inside
 * a container would nest the shape in it, and Archi places the new shape at
 * the pointer the same way. The canvas opens the menu only on empty canvas,
 * where the parent is the view itself: a release on a group draws #129's line.
 * `id` names the node, the relationship and the connection, by the prefix each
 * is asked with; the element takes its id from `newElement` unless `element`
 * gives one.
 */
export function magicEdit(
  view: View,
  sourceNode: string,
  type: RelationshipType,
  targetType: ElementType,
  at: Point,
  isJunction: (elementId: string) => boolean,
  id: (prefix: 'node' | 'rel' | 'conn') => string,
  element: Partial<Element> = {},
): MagicEdit | undefined {
  const from = view.nodes.find((n) => n.id === sourceNode)
  if (!from || from.kind !== 'element') return undefined
  const made: Element = { ...newElement({ kind: 'element', type: targetType }), ...element }
  const node: ElementNode = {
    id: id('node'),
    kind: 'element',
    element: made.id,
    ...placement(view, at, defaultNodeSize('element', targetType), isJunction),
  }
  const relationship: Relationship = {
    id: id('rel'),
    type,
    source: from.element,
    target: made.id,
    properties: {},
  }
  return {
    view: {
      ...view,
      nodes: [...view.nodes, node],
      connections: [
        ...view.connections,
        {
          id: id('conn'),
          kind: 'relationship',
          relationship: relationship.id,
          source: sourceNode,
          target: node.id,
        },
      ],
    },
    element: made,
    relationship,
    node: node.id,
  }
}
