import { typeLabel, type ElementType } from './element-types'
import { findRelationshipType, type RelationshipType } from './relationship-types'
import { LEGEND_ROWS, LEGEND_WIDTH_OFFSET, type LegendOptions, type View } from './workspace'

/**
 * What a legend lists (#134), worked out from the view as Archi 5.10 works it
 * out: `LegendGraphics.update`, read at the `release_5.10.0` tag.
 *
 * - **What counts.** Every element shape and every relationship connection in
 *   the view, at any depth (`eAllContents` over `IDiagramModelArchimateComponent`).
 *   Notes, groups, view references, plain lines and other legends are not
 *   ArchiMate components, so they never appear.
 * - **One entry per type**, whatever the number of drawings: Archi collects
 *   them in a set keyed by the class, its label and its colour.
 * - **Which types.** Elements when `elements` is on, relationships when
 *   `relations` is on. Archi lists a concept that has a specialization under
 *   the specialization's name instead, governed by `specializedElements` and
 *   `specializedRelations`; Archipelago has no specializations yet, so every
 *   concept is listed by its type and those two options change nothing.
 * - **Order.** Elements first and relationships last. With `sort` `category`,
 *   elements go by Archi's category (`ARCHI_LEGEND_RANK`), and by label within
 *   one; with `name`, by label alone. Archi compares
 *   labels with the platform's `Collator`; here the locale is English, so the
 *   order does not change from one machine to the next.
 * - **Labels** are Archi's default names: an element type's label, and
 *   "Serving relation" for a relationship (the `*UIProvider_0` messages).
 *
 * A drawing whose element or relationship is not in the model shows nothing,
 * as there is no type to list.
 */

export interface LegendEntry {
  /** `element` for an element type, `relationship` for a relationship type. */
  kind: 'element' | 'relationship'
  type: ElementType | RelationshipType
  label: string
}

export interface LegendLookups {
  elementType(id: string): ElementType | undefined
  relationshipType(id: string): RelationshipType | undefined
}

/**
 * Archi's category rank for each element type (`LegendGraphics.update`): the
 * first of strategy 0, business 1, application 2, technology 3, physical 4,
 * motivation 5 and implementation and migration 6 whose class `isSuperTypeOf`
 * the type's, else 10. Derived from Archi's class hierarchy (`archimate.ecore`
 * at `release_5.10.0`), not from our catalogue's layers, because they differ
 * once: Material is a `PhysicalElement` and a `TechnologyObject`, so a
 * `TechnologyElement`, and Archi tests technology first (#187 review).
 */
// One row per rank: kept off the formatter so the table stays readable.
// prettier-ignore
export const ARCHI_LEGEND_RANK: Readonly<Record<ElementType, number>> = {
  Resource: 0, Capability: 0, CourseOfAction: 0, ValueStream: 0,
  BusinessActor: 1, BusinessRole: 1, BusinessCollaboration: 1, BusinessInterface: 1,
  BusinessProcess: 1, BusinessFunction: 1, BusinessInteraction: 1, BusinessEvent: 1,
  BusinessService: 1, BusinessObject: 1, Contract: 1, Representation: 1, Product: 1,
  ApplicationComponent: 2, ApplicationCollaboration: 2, ApplicationInterface: 2,
  ApplicationFunction: 2, ApplicationInteraction: 2, ApplicationProcess: 2,
  ApplicationEvent: 2, ApplicationService: 2, DataObject: 2,
  Node: 3, Device: 3, SystemSoftware: 3, TechnologyCollaboration: 3, TechnologyInterface: 3,
  Path: 3, CommunicationNetwork: 3, TechnologyFunction: 3, TechnologyProcess: 3,
  TechnologyInteraction: 3, TechnologyEvent: 3, TechnologyService: 3, Artifact: 3,
  Material: 3,
  Equipment: 4, Facility: 4, DistributionNetwork: 4,
  Stakeholder: 5, Driver: 5, Assessment: 5, Goal: 5, Outcome: 5, Principle: 5,
  Requirement: 5, Constraint: 5, Meaning: 5, Value: 5,
  WorkPackage: 6, Deliverable: 6, ImplementationEvent: 6, Plateau: 6, Gap: 6,
  Location: 10, Grouping: 10, Junction: 10,
}

/** Where an entry sorts: Archi's category rank, with relationships last at 50. */
function rank(entry: LegendEntry, options: LegendOptions): number {
  if (entry.kind === 'relationship') return 50
  if (options.sort === 'name') return 0
  return ARCHI_LEGEND_RANK[entry.type as ElementType]
}

export function legendEntries(
  view: View,
  options: LegendOptions,
  lookups: LegendLookups,
): LegendEntry[] {
  // Two maps, one per kind, so an element type and a relationship type never share a key.
  const elements = new Map<ElementType, LegendEntry>()
  const relationships = new Map<RelationshipType, LegendEntry>()
  if (options.elements) {
    for (const node of view.nodes) {
      if (node.kind !== 'element') continue
      const type = lookups.elementType(node.element)
      if (type === undefined || elements.has(type)) continue
      elements.set(type, { kind: 'element', type, label: typeLabel(type) })
    }
  }
  if (options.relations) {
    for (const connection of view.connections) {
      if (connection.kind !== 'relationship') continue
      const type = lookups.relationshipType(connection.relationship)
      if (type === undefined || relationships.has(type)) continue
      const label = findRelationshipType(type)?.label ?? type
      relationships.set(type, { kind: 'relationship', type, label: `${label} relation` })
    }
  }
  return [...elements.values(), ...relationships.values()].sort(
    (a, b) => rank(a, options) - rank(b, options) || a.label.localeCompare(b.label, 'en'),
  )
}

/**
 * A rows-per-column value as Archi takes it: clamped into `LEGEND_ROWS`
 * (`LegendOptions.rowsPerColumn`). `undefined` for a value that is not a whole
 * number, which Archi's parser never yields.
 */
export function legendRows(value: number): number | undefined {
  if (!Number.isInteger(value)) return undefined
  return Math.min(Math.max(value, LEGEND_ROWS.min), LEGEND_ROWS.max)
}

/** A column offset as Archi takes it: clamped into `LEGEND_WIDTH_OFFSET` (`LegendOptions.widthOffset`). */
export function legendWidthOffset(value: number): number | undefined {
  if (!Number.isInteger(value)) return undefined
  return Math.min(Math.max(value, LEGEND_WIDTH_OFFSET.min), LEGEND_WIDTH_OFFSET.max)
}
