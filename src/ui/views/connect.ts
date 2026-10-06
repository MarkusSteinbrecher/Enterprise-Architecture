import {
  allowedRelationshipsBetween,
  relationshipsInView,
  typeLabel,
  type Element,
  type Point,
  type Relationship,
  type RelationshipContext,
  type RelationshipType,
  type View,
} from '@/model'
import { absoluteIndex, childrenIndex } from './geometry'

/**
 * Connecting two shapes (#129): what a press on one and a release on another
 * may create. Pure, so the menu, its tests and the Archi fixture all ask the
 * same question.
 *
 * Between two element shapes, the answer is the relationship types ArchiMate
 * allows from the one element to the other, junction rules included
 * (`validateRelationshipBetween`), and the relationships the model already
 * holds between them in that direction that this view does not draw: drawing
 * one of those re-uses it rather than adding a duplicate. A note, a group or a
 * view reference at either end makes a plain line, with no type to choose, as
 * in Archi.
 */

/** What the connect menu reads from the model. The store satisfies it. */
export interface ConnectModel extends RelationshipContext {
  element(id: string): Element | undefined
  relationshipsOf(elementId: string): readonly Relationship[]
}

export type ConnectChoice =
  | { kind: 'line' }
  | {
      kind: 'relationship'
      source: Element
      target: Element
      /** New relationship types ArchiMate allows, in catalogue order. */
      types: RelationshipType[]
      /** Relationships from source to target the model holds and this view does not draw. */
      existing: Relationship[]
    }
  | { kind: 'refused'; reason: string }

export function connectChoice(
  model: ConnectModel,
  view: View,
  sourceNode: string,
  targetNode: string,
): ConnectChoice {
  const from = view.nodes.find((n) => n.id === sourceNode)
  const to = view.nodes.find((n) => n.id === targetNode)
  if (!from || !to) return { kind: 'refused', reason: 'That shape is no longer in the view.' }
  if (from.kind !== 'element' || to.kind !== 'element') return { kind: 'line' }
  const source = model.element(from.element)
  const target = model.element(to.element)
  if (!source || !target) {
    return {
      kind: 'refused',
      reason: 'One of these shapes draws an element that is not in the model.',
    }
  }
  const drawn = relationshipsInView(view)
  const existing = model
    .relationshipsOf(source.id)
    .filter((r) => r.source === source.id && r.target === target.id && !drawn.has(r.id))
  return {
    kind: 'relationship',
    source,
    target,
    types: allowedRelationshipsBetween(model, source, target),
    existing,
  }
}

/** What the menu says when ArchiMate allows no relationship from one element to the other. */
export function nothingAllowed(source: Element, target: Element): string {
  return `ArchiMate allows no relationship from ${typeLabel(source.type)} “${source.name}” to ${typeLabel(target.type)} “${target.name}”.`
}

/**
 * The node drawn on top at `point` (view coordinates): the last, in drawing
 * order, whose box holds it. Drawing order is `ViewDrawing`'s, a parent and
 * then its children, which is not array order.
 */
export function nodeAt(view: View, point: Point): string | undefined {
  const bounds = absoluteIndex(view)
  const children = childrenIndex(view)
  let found: string | undefined
  const visit = (parent: string | undefined) => {
    for (const node of children.get(parent) ?? []) {
      const b = bounds.get(node.id)
      if (
        b &&
        point.x >= b.x &&
        point.x <= b.x + b.width &&
        point.y >= b.y &&
        point.y <= b.y + b.height
      ) {
        found = node.id
      }
      visit(node.id)
    }
  }
  visit(undefined)
  return found
}
