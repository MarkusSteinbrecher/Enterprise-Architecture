import { memo } from 'react'
import type {
  AccessType,
  Bounds,
  ElementType,
  JunctionKind,
  RelationshipType,
  View,
  ViewNode,
} from '@/model'
import {
  ElementShape,
  GroupShape,
  MissingShape,
  NoteShape,
  RelationshipLine,
  ViewReferenceShape,
} from '@/ui/notation'
import { connectionRoute } from './geometry'

/**
 * A hand-drawn view as SVG (#79), drawn with the #77 notation. Pure: it renders
 * what it is given, holds no state and handles no events, so the canvas, the
 * export and later the editor (ADR 0006) all draw the same thing.
 *
 * Nodes nest in the DOM as they nest in the model, each `<g>` translated by its
 * offset from the `<g>` it is drawn in. Connections are drawn after every node,
 * on top, as Archi draws them.
 *
 * Every node `<g>` carries `data-node` and every connection `data-connection`:
 * the canvas finds what was clicked through them, and the tests and the export
 * count them.
 */

export interface DrawingLookups {
  element(id: string): { type: ElementType; name: string; junctionKind?: JunctionKind } | undefined
  relationship(
    id: string,
  ): { type: RelationshipType; name?: string; accessType?: AccessType } | undefined
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
  return (
    <g data-view-drawing={view.id}>
      <g>
        {(children.get(undefined) ?? []).map((node) => (
          <NodeTree
            key={node.id}
            node={node}
            origin={ORIGIN}
            bounds={bounds}
            children={children}
            lookups={lookups}
          />
        ))}
      </g>
      <g>
        {view.connections.map((connection) => {
          const points = connectionRoute(connection, bounds)
          if (!points) return null
          if (connection.kind === 'relationship') {
            const relationship = lookups.relationship(connection.relationship)
            if (relationship) {
              return (
                <g key={connection.id} data-connection={connection.id}>
                  <RelationshipLine
                    type={relationship.type}
                    points={points}
                    {...(relationship.accessType ? { accessType: relationship.accessType } : {})}
                    {...(relationship.name ? { label: relationship.name } : {})}
                    {...(connection.appearance ? { appearance: connection.appearance } : {})}
                  />
                </g>
              )
            }
          }
          // A plain line, or a relationship that is no longer in the model.
          const missing = connection.kind === 'relationship'
          return (
            <g
              key={connection.id}
              data-connection={connection.id}
              data-missing={missing || undefined}
            >
              <path
                d={`M${points.map((p) => `${p.x},${p.y}`).join('L')}`}
                fill="none"
                stroke={
                  connection.appearance?.lineColor ?? (missing ? 'var(--ink3)' : 'var(--ink2)')
                }
                strokeWidth={connection.appearance?.lineWidth ?? 1}
                strokeDasharray={missing ? '4 3' : undefined}
              />
            </g>
          )
        })}
      </g>
    </g>
  )
})

const ORIGIN = { x: 0, y: 0 }

interface NodeTreeProps {
  node: ViewNode
  /** Absolute position of the `<g>` this node is drawn in. */
  origin: { x: number; y: number }
  bounds: ReadonlyMap<string, Bounds>
  children: ReadonlyMap<string | undefined, ViewNode[]>
  lookups: DrawingLookups
}

function NodeTree({ node, origin, bounds, children, lookups }: NodeTreeProps) {
  const at = bounds.get(node.id) ?? { ...node.bounds }
  const { width, height } = node.bounds
  return (
    <g
      data-node={node.id}
      data-kind={node.kind}
      transform={`translate(${at.x - origin.x} ${at.y - origin.y})`}
    >
      <NodeBody node={node} width={width} height={height} lookups={lookups} />
      {(children.get(node.id) ?? []).map((child) => (
        <NodeTree
          key={child.id}
          node={child}
          origin={at}
          bounds={bounds}
          children={children}
          lookups={lookups}
        />
      ))}
    </g>
  )
}

function NodeBody({
  node,
  width,
  height,
  lookups,
}: {
  node: ViewNode
  width: number
  height: number
  lookups: DrawingLookups
}) {
  switch (node.kind) {
    case 'element': {
      const element = lookups.element(node.element)
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
          name={lookups.viewName(node.view)}
          appearance={node.appearance}
        />
      )
  }
}
