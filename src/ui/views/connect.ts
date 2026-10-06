import {
  allowedRelationshipsBetween,
  junctionTypes,
  oneType,
  relationshipsInView,
  validateRelationshipBetween,
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
      /** Why no type is offered, when none is: the reasons the rules gave. */
      why?: string
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
  const types = allowedRelationshipsBetween(model, source, target)
  return {
    kind: 'relationship',
    source,
    target,
    types,
    existing,
    ...(types.length ? {} : { why: nothingAllowed(model, source, target) }),
  }
}

/**
 * What the menu says when it offers no type. Association joins any two
 * elements, so the matrix alone never empties the menu: only a junction's
 * rules do, and the menu says which (#142 review). Archi checks "through" before
 * "one type", so asking the rules type by type would give the "through" reason
 * for nearly every type. Instead: the one-type rule once, then why the type the
 * junction does join is refused here.
 */
export function nothingAllowed(model: ConnectModel, source: Element, target: Element): string {
  const reasons: string[] = []
  for (const end of [source, target]) {
    if (end.type !== 'Junction') continue
    for (const joined of junctionTypes(model, end.id)) {
      reasons.push(oneType(joined))
      const result = validateRelationshipBetween(model, source, joined, target)
      if (!result.valid && result.reason) reasons.push(result.reason)
    }
  }
  const lead = `No relationship can join ${named(source)} to ${named(target)}.`
  return [lead, ...new Set(reasons)].join(' ')
}

/** An element as a sentence names it: its type, and its name when it has one. */
function named(element: Element): string {
  return element.name ? `${typeLabel(element.type)} “${element.name}”` : typeLabel(element.type)
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
