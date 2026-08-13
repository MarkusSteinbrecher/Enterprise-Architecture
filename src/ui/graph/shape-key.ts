import type { Element, Relationship } from '@/model'

/**
 * The identity of the graph's *shape* — what decides whether to re-run layout.
 *
 * JSON, not `join(',')`. Element ids survive import as arbitrary non-empty
 * strings (`canonical-json.ts` restricts no character), so a workspace with one
 * element `a,b` and one with elements `a` and `b` produced the **same key**.
 * Importing the second over the first with the graph open left the layout effect
 * asleep, and `buildView` then dropped every node the stale layout had never
 * seen along with every edge touching them — an empty canvas for a model that
 * loaded fine. Exported so the collision is testable rather than inferable.
 */
export function shapeKeyOf(
  elements: readonly Element[],
  relationships: readonly Relationship[],
): string {
  return JSON.stringify([
    elements.map((element) => element.id),
    relationships.map((r) => [r.source, r.target]),
  ])
}
