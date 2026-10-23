import {
  findViewpoint,
  viewpointAllows,
  type ElementType,
  type View,
  type Viewpoint,
} from '@/model'

/**
 * What a view draws ghosted (#194): the concepts its viewpoint does not allow.
 * Archi 5.10 does this by default (`viewpointsGhostDiagramElements`), and this
 * follows its rules, read with `javap`:
 *
 * - A **shape** is ghosted when it draws an element of a type the viewpoint
 *   refuses (`AbstractArchimateElementEditPart.refreshFigure` →
 *   `ViewpointManager.isAllowedDiagramModelComponent`). Junction and Grouping
 *   never are (`viewpointAllows`). A note, a group, a view reference and a
 *   legend draw no concept, so they never are either.
 * - A **connection** drawing a relationship is ghosted when either end is
 *   (`isAllowedDiagramModelComponent` on a connection asks it of its source and
 *   its target). Its own type is never the reason: no viewpoint restricts
 *   relationships. A plain line draws no concept and is never ghosted.
 *
 * Derived from the view at draw time and never stored, so the saved file does
 * not change (ADR 0004). A shape whose element is missing is drawn as missing,
 * not ghosted.
 */
export interface Ghosts {
  nodes: ReadonlySet<string>
  connections: ReadonlySet<string>
}

export function ghostsIn(
  view: View,
  elementType: (elementId: string) => ElementType | undefined,
): Ghosts {
  const viewpoint = view.viewpoint
  const nodes = new Set<string>()
  for (const node of view.nodes) {
    if (node.kind !== 'element') continue
    const type = elementType(node.element)
    if (type !== undefined && !viewpointAllows(viewpoint, type)) nodes.add(node.id)
  }
  const connections = new Set<string>()
  for (const connection of view.connections) {
    if (connection.kind !== 'relationship') continue
    if (nodes.has(connection.source) || nodes.has(connection.target)) connections.add(connection.id)
  }
  return { nodes, connections }
}

/** The viewpoint that refuses an element of `type` in a view with `viewpoint`, if one does. */
export function excludedBy(
  viewpoint: string | undefined,
  type: ElementType,
): Viewpoint | undefined {
  return viewpointAllows(viewpoint, type) ? undefined : findViewpoint(viewpoint)
}
