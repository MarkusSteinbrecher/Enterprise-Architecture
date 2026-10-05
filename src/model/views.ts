import type { Bounds, Relationship, View, ViewConnection, ViewNode } from './workspace'

/**
 * Pure operations on a hand-drawn view (#75). Each returns a new `View` and
 * never mutates its input — the store keeps the before and after of every
 * command, and an input edited in place would make undo restore the edit.
 *
 * The store builds its integrity cascades from these, so they hold the rules in
 * one place: a node's removal takes its connections with it, and its children
 * stay where they were drawn.
 */

/**
 * Remove nodes, and the connections attached to them. Children of a
 * removed node are kept and lifted to the removed node's parent, with their
 * bounds translated so they stay exactly where they were drawn — deleting a
 * container should not silently delete the other elements' drawings inside it.
 */
export function removeNodes(view: View, nodeIds: ReadonlySet<string>): View {
  if (nodeIds.size === 0) return view
  const byId = new Map(view.nodes.map((node) => [node.id, node]))

  const nodes: ViewNode[] = []
  for (const node of view.nodes) {
    if (nodeIds.has(node.id)) continue
    let parent = node.parent
    let { x, y } = node.bounds
    // Walk up through every removed ancestor, accumulating its offset.
    while (parent !== undefined && nodeIds.has(parent)) {
      const removed = byId.get(parent)
      if (!removed) break
      x += removed.bounds.x
      y += removed.bounds.y
      parent = removed.parent
    }
    if (parent === node.parent) {
      nodes.push(node)
      continue
    }
    const lifted: ViewNode = { ...node, bounds: { ...node.bounds, x, y } }
    if (parent === undefined) delete lifted.parent
    else lifted.parent = parent
    nodes.push(lifted)
  }

  return { ...view, nodes, connections: withoutDangling(view.connections, nodeIds) }
}

/** Remove connections by id. */
export function removeConnections(view: View, connectionIds: ReadonlySet<string>): View {
  if (connectionIds.size === 0) return view
  return {
    ...view,
    connections: view.connections.filter((connection) => !connectionIds.has(connection.id)),
  }
}

/**
 * The view with every drawing of `elementId` removed, or `undefined` when the
 * view does not draw it — so the caller can tell which views a deletion touches.
 */
export function withoutElement(view: View, elementId: string): View | undefined {
  const ids = new Set<string>()
  for (const node of view.nodes) {
    if (node.kind === 'element' && node.element === elementId) ids.add(node.id)
  }
  return ids.size ? removeNodes(view, ids) : undefined
}

/** The view with every drawing of `relationshipId` removed, or `undefined`. */
export function withoutRelationship(view: View, relationshipId: string): View | undefined {
  const ids = new Set<string>()
  for (const connection of view.connections) {
    if (connection.kind === 'relationship' && connection.relationship === relationshipId) {
      ids.add(connection.id)
    }
  }
  return ids.size ? removeConnections(view, ids) : undefined
}

/** The view with every reference to view `viewId` removed, or `undefined`. */
export function withoutViewReference(view: View, viewId: string): View | undefined {
  const ids = new Set<string>()
  for (const node of view.nodes) {
    if (node.kind === 'view-ref' && node.view === viewId) ids.add(node.id)
  }
  return ids.size ? removeNodes(view, ids) : undefined
}

/**
 * A node's bounds in view coordinates, resolving the parent chain. A cycle or a
 * missing parent stops the walk rather than looping — the validator reports both.
 */
export function absoluteBounds(view: View, nodeId: string): Bounds | undefined {
  const byId = new Map(view.nodes.map((node) => [node.id, node]))
  const node = byId.get(nodeId)
  if (!node) return undefined
  let { x, y } = node.bounds
  const seen = new Set([node.id])
  let parent = node.parent === undefined ? undefined : byId.get(node.parent)
  while (parent && !seen.has(parent.id)) {
    seen.add(parent.id)
    x += parent.bounds.x
    y += parent.bounds.y
    parent = parent.parent === undefined ? undefined : byId.get(parent.parent)
  }
  return { ...node.bounds, x, y }
}

/** Element ids a view draws, each once. */
export function elementsInView(view: View): Set<string> {
  const ids = new Set<string>()
  for (const node of view.nodes) if (node.kind === 'element') ids.add(node.element)
  return ids
}

/** Relationship ids a view draws, each once. */
export function relationshipsInView(view: View): Set<string> {
  const ids = new Set<string>()
  for (const connection of view.connections) {
    if (connection.kind === 'relationship') ids.add(connection.relationship)
  }
  return ids
}

/** View ids a view references, each once. */
export function viewsReferencedBy(view: View): Set<string> {
  const ids = new Set<string>()
  for (const node of view.nodes) if (node.kind === 'view-ref') ids.add(node.view)
  return ids
}

/** Drop connections that end on a removed node. */
function withoutDangling(
  connections: readonly ViewConnection[],
  removedNodes: ReadonlySet<string>,
): ViewConnection[] {
  return connections.filter(
    (connection) => !removedNodes.has(connection.source) && !removedNodes.has(connection.target),
  )
}

/**
 * A connection is a drawing of its relationship, so it runs between drawings of
 * the relationship's own two elements, in its direction. `validate` requires
 * it, and both readers skip a connection that breaks it rather than importing
 * what validation then rejects (#100). One rule, so the two cannot drift.
 */
export function drawsRelationshipEnds(
  relationship: Pick<Relationship, 'source' | 'target'>,
  source: ViewNode | undefined,
  target: ViewNode | undefined,
): boolean {
  return (
    source?.kind === 'element' &&
    target?.kind === 'element' &&
    source.element === relationship.source &&
    target.element === relationship.target
  )
}
