import { memo } from 'react'
import {
  nestedConnections,
  type Bounds,
  type ElementType,
  type JunctionKind,
  type Point,
  type Relationship,
  type View,
  type ViewConnection,
  type ViewNode,
} from '@/model'
import {
  ElementShape,
  GroupShape,
  MissingShape,
  NoteShape,
  RelationshipLine,
  ViewReferenceShape,
  relationshipLabel,
} from '@/ui/notation'
import { connectionRoute } from './geometry'

/**
 * A hand-drawn view as SVG (#79), drawn with the #77 notation. Pure: it renders
 * what it is given, holds no state and handles no events, so the canvas, the
 * export and the editor (ADR 0006) all draw the same thing.
 *
 * Nodes are drawn flat, each `<g>` at its absolute position, in tree order: a
 * parent before its children, siblings in their order, which is the order
 * Archi paints them in. Flat rather than nested so that each node can skip
 * rendering on its own (#128): with nested `<g>`s, a parent that skipped would
 * also stop a moved grandchild from updating. Connections are drawn after every
 * node, on top, as Archi draws them, except one the nesting already shows
 * (`nestedConnections`, #96), which Archi does not draw either.
 *
 * Every node `<g>` carries `data-node` (and `data-parent` when it is nested)
 * and every connection `data-connection`: the canvas finds what was clicked
 * through them, and the tests and the export count them.
 */

export interface DrawingLookups {
  element(id: string): { type: ElementType; name: string; junctionKind?: JunctionKind } | undefined
  relationship(
    id: string,
  ): Pick<Relationship, 'type' | 'name' | 'isDirected' | 'modifier' | 'profile'> | undefined
  viewName(id: string): string | undefined
}

export interface ViewDrawingProps {
  view: View
  bounds: ReadonlyMap<string, Bounds>
  children: ReadonlyMap<string | undefined, ViewNode[]>
  lookups: DrawingLookups
}

export const ViewDrawing = memo(function ViewDrawing({
  view,
  bounds,
  children,
  lookups,
}: ViewDrawingProps) {
  const ordered: ViewNode[] = []
  const visit = (parent: string | undefined) => {
    for (const node of children.get(parent) ?? []) {
      ordered.push(node)
      visit(node.id)
    }
  }
  visit(undefined)
  const hidden = nestedConnections(view)
  return (
    <g data-view-drawing={view.id}>
      <g>
        {ordered.map((node) => (
          <DrawnNode
            key={node.id}
            node={node}
            at={bounds.get(node.id) ?? node.bounds}
            element={node.kind === 'element' ? lookups.element(node.element) : undefined}
            viewName={node.kind === 'view-ref' ? lookups.viewName(node.view) : undefined}
          />
        ))}
      </g>
      <g>
        {view.connections.map((connection) => {
          if (hidden.has(connection.id)) return null
          const points = connectionRoute(connection, bounds)
          if (!points) return null
          return (
            <DrawnConnection
              key={connection.id}
              connection={connection}
              points={points}
              relationship={
                connection.kind === 'relationship'
                  ? lookups.relationship(connection.relationship)
                  : undefined
              }
            />
          )
        })}
      </g>
    </g>
  )
})

type ResolvedElement = ReturnType<DrawingLookups['element']>
type ResolvedRelationship = ReturnType<DrawingLookups['relationship']>

const sameBox = (a: Bounds, b: Bounds) =>
  a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height

/**
 * One node, redrawn only when something it shows changed: its own object, where
 * it sits, or the element or view name it draws. The store keeps the identity
 * of everything an edit does not touch, so an element is the same object until
 * it is changed.
 */
const DrawnNode = memo(
  function DrawnNode({
    node,
    at,
    element,
    viewName,
  }: {
    node: ViewNode
    at: Bounds
    element: ResolvedElement
    viewName: string | undefined
  }) {
    return (
      <g
        data-node={node.id}
        data-kind={node.kind}
        data-parent={node.parent}
        transform={`translate(${at.x} ${at.y})`}
      >
        <NodeBody
          node={node}
          width={node.bounds.width}
          height={node.bounds.height}
          element={element}
          viewName={viewName}
        />
      </g>
    )
  },
  (a, b) =>
    a.node === b.node &&
    sameBox(a.at, b.at) &&
    a.element === b.element &&
    a.viewName === b.viewName,
)

const DrawnConnection = memo(
  function DrawnConnection({
    connection,
    points,
    relationship,
  }: {
    connection: ViewConnection
    points: Point[]
    relationship: ResolvedRelationship
  }) {
    if (connection.kind === 'relationship' && relationship) {
      const label = relationshipLabel(relationship)
      return (
        <g data-connection={connection.id}>
          <RelationshipLine
            type={relationship.type}
            points={points}
            {...(relationship.profile?.accessType
              ? { accessType: relationship.profile.accessType }
              : {})}
            {...(relationship.isDirected ? { directed: true } : {})}
            {...(label ? { label } : {})}
            {...(connection.appearance ? { appearance: connection.appearance } : {})}
          />
        </g>
      )
    }
    // A plain line, or a relationship that is no longer in the model.
    const missing = connection.kind === 'relationship'
    return (
      <g data-connection={connection.id} data-missing={missing || undefined}>
        <path
          d={`M${points.map((p) => `${p.x},${p.y}`).join('L')}`}
          fill="none"
          stroke={connection.appearance?.lineColor ?? (missing ? 'var(--ink3)' : 'var(--ink2)')}
          strokeWidth={connection.appearance?.lineWidth ?? 1}
          strokeDasharray={missing ? '4 3' : undefined}
        />
      </g>
    )
  },
  (a, b) =>
    a.connection === b.connection &&
    a.relationship === b.relationship &&
    a.points.length === b.points.length &&
    a.points.every((p, i) => p.x === b.points[i]!.x && p.y === b.points[i]!.y),
)

function NodeBody({
  node,
  width,
  height,
  element,
  viewName,
}: {
  node: ViewNode
  width: number
  height: number
  element: ResolvedElement
  viewName: string | undefined
}) {
  switch (node.kind) {
    case 'element': {
      if (!element) return <MissingShape width={width} height={height} label="Missing element" />
      return (
        <ElementShape
          type={element.type}
          name={element.name}
          width={width}
          height={height}
          {...(element.junctionKind ? { junctionKind: element.junctionKind } : {})}
          {...(node.appearance ? { appearance: node.appearance } : {})}
        />
      )
    }
    case 'note':
      return (
        <NoteShape width={width} height={height} text={node.text} appearance={node.appearance} />
      )
    case 'group':
      return (
        <GroupShape width={width} height={height} name={node.name} appearance={node.appearance} />
      )
    case 'view-ref':
      return (
        <ViewReferenceShape
          width={width}
          height={height}
          name={viewName}
          appearance={node.appearance}
        />
      )
  }
}
