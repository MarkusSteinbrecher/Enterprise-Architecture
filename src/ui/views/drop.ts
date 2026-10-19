import type { ElementNode, Relationship, RelationshipConnection, View } from '@/model'

/**
 * What a drop from the model tree draws besides the shape (#145), as Archi
 * 5.10.0 does it: `ArchimateDNDEditPolicy.getDropCommand`, read at the
 * `release_5.10.0` tag.
 *
 * For each relationship of the dropped element (`ArchimateModelUtils
 * .getAllRelationshipsForConcept`: the ones it is the source of and the ones it
 * is the target of, each once), Archi finds every drawing of the other end in
 * the view (`DiagramModelUtils.findDiagramModelComponentsForArchimateConcept`)
 * and adds a connection between it and the new shape, in the relationship's
 * direction. Every drawing, so an element drawn twice gets two lines.
 *
 * That loop checks neither `hasDiagramModelArchimateConnection` nor
 * `shouldBeHiddenConnection`: the shape is new, so nothing is connected to it
 * yet, and a connection the nesting hides is still made and then hidden in the
 * drawing (#96). Those two checks guard the other loop, for relationships
 * dragged from the tree, which Archipelago's tree does not offer. A drop into
 * an element's shape then runs the nesting (#131), which adds no second line
 * for a pair this has connected, because `nestingEdit` connects only what the
 * view does not draw yet.
 *
 * Archi skips it all when the copy key is held (`ArchimateDiagramTransfer
 * DropTargetListener`: `add_element_connections = detail != DND.DROP_COPY`),
 * which its own comment names as Ctrl on Windows and Linux and Alt on a Mac.
 *
 * A relationship whose other end is a relationship has no drawing to connect
 * to here: Archipelago's connections join shapes only.
 */
export function dropConnections(
  relationships: readonly Relationship[],
  view: View,
  node: ElementNode,
  makeId: () => string,
): RelationshipConnection[] {
  const drawings = (elementId: string) =>
    view.nodes.filter((n) => n.id !== node.id && n.kind === 'element' && n.element === elementId)
  const connections: RelationshipConnection[] = []
  const seen = new Set<string>()
  for (const relationship of relationships) {
    if (seen.has(relationship.id)) continue
    seen.add(relationship.id)
    const connect = (source: string, target: string) =>
      connections.push({
        id: makeId(),
        kind: 'relationship',
        relationship: relationship.id,
        source,
        target,
      })
    // Its source drawn, the new shape its target; then the other way. A
    // relationship from the element to itself is both.
    if (relationship.target === node.element) {
      for (const source of drawings(relationship.source)) connect(source.id, node.id)
    }
    if (relationship.source === node.element) {
      for (const target of drawings(relationship.target)) connect(node.id, target.id)
    }
  }
  return connections
}

/**
 * `view` with `node` dropped into it, and, unless `relationships` is empty
 * (the copy key), the lines `dropConnections` draws with it. One function, so
 * the canvas and the Archi oracle's fixture (`edited-claims.ts`) drop alike.
 */
export function withDrop(
  view: View,
  node: ElementNode,
  relationships: readonly Relationship[],
  makeId: () => string,
): View {
  const drawn = { ...view, nodes: [...view.nodes, node] }
  const lines = dropConnections(relationships, drawn, node, makeId)
  return lines.length ? { ...drawn, connections: [...drawn.connections, ...lines] } : drawn
}

/**
 * Whether a drop was made with the copy key held: Alt on a Mac, Ctrl
 * elsewhere, as Archi names them. Either one counts, on every platform: the
 * browser does not say which platform's convention the user follows, and
 * holding Ctrl while dragging on a Mac, or Alt elsewhere, asks for nothing else.
 */
export function heldCopyKey(event: { altKey: boolean; ctrlKey: boolean }): boolean {
  return event.altKey || event.ctrlKey
}
