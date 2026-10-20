import { LAYERS, type Layer } from './layers'
import { findElementType, typeLabel, type ElementType } from './element-types'
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
 *   elements go by layer, in Archi's order (strategy, business, application,
 *   technology, physical, motivation, implementation and migration, then the
 *   rest), and by label within one; with `name`, by label alone. Archi compares
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

/** Archi's category rank (`LegendGraphics.update`): the layers in order, then the rest at 10, relationships last at 50. */
function rank(entry: LegendEntry, options: LegendOptions): number {
  if (entry.kind === 'relationship') return 50
  if (options.sort === 'name') return 0
  const layer = findElementType(entry.type)?.layer
  return layer === undefined || layer === 'other' ? 10 : LAYERS.indexOf(layer as Layer)
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
