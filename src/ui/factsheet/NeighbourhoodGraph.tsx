import { elementTypeMeta, relationshipTypeMeta, type Element, type Relationship } from '@/model'

/**
 * The radial mini-graph in the right rail (handoff "Screen 2 — right rail").
 *
 * Geometry is from the handoff: 260×176, centre node r=8 in the accent colour
 * with the type code, up to seven neighbours on a 78×62 ellipse starting at
 * −90°, r=5.5 in their layer colours, labels anchored outward, edges dashed for
 * Flow and Access.
 *
 * It is a hand-drawn SVG rather than a React Flow instance on purpose: it is a
 * glance, not a diagram, and it must lay out identically every time so the shape
 * of a neighbourhood is recognisable from one element to the next.
 */

const WIDTH = 260
const HEIGHT = 176
const RADIUS_X = 78
const RADIUS_Y = 62
const MAX_NEIGHBOURS = 7
/**
 * Horizontal breathing room in the viewBox only. Node geometry stays exactly as
 * the handoff specifies; this stops outward-anchored labels being clipped by the
 * edge of the box, which the prototype capture shows happening.
 */
const LABEL_MARGIN = 34

export interface NeighbourhoodGraphProps {
  element: Element
  relationships: Relationship[]
  elementById: (id: string) => Element | undefined
  onSelect: (id: string) => void
}

export function NeighbourhoodGraph({
  element,
  relationships,
  elementById,
  onSelect,
}: NeighbourhoodGraphProps) {
  const centre = { x: WIDTH / 2, y: HEIGHT / 2 }

  const seen = new Set<string>()
  const neighbours: { element: Element; relationship: Relationship }[] = []
  for (const relationship of relationships) {
    const otherId = relationship.source === element.id ? relationship.target : relationship.source
    if (otherId === element.id || seen.has(otherId)) continue
    const other = elementById(otherId)
    if (!other) continue
    seen.add(otherId)
    neighbours.push({ element: other, relationship })
    if (neighbours.length === MAX_NEIGHBOURS) break
  }

  if (neighbours.length === 0) {
    return (
      <div className="neighbourhood">
        <p className="neighbourhood__empty">
          Nothing is connected to this element yet.
          <br />
          Add a relation below.
        </p>
      </div>
    )
  }

  const placed = neighbours.map((neighbour, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / neighbours.length
    return {
      ...neighbour,
      x: centre.x + Math.cos(angle) * RADIUS_X,
      y: centre.y + Math.sin(angle) * RADIUS_Y,
    }
  })

  const centreMeta = elementTypeMeta(element.type)

  return (
    <div className="neighbourhood">
      <svg
        width="100%"
        viewBox={`${-LABEL_MARGIN} 0 ${WIDTH + LABEL_MARGIN * 2} ${HEIGHT}`}
        // Not `role="img"`: that makes the subtree presentational, and this one
        // contains up to seven focusable buttons — seven tab stops announced as
        // nothing. A group keeps the label and keeps its children reachable.
        role="group"
        aria-label="Neighbourhood"
      >
        {placed.map((neighbour) => {
          const notation = relationshipTypeMeta(neighbour.relationship.type).notation
          return (
            <line
              key={`edge-${neighbour.element.id}`}
              x1={centre.x}
              y1={centre.y}
              x2={neighbour.x}
              y2={neighbour.y}
              stroke="var(--bd2)"
              strokeWidth={1}
              strokeDasharray={notation === 'dashed' ? '3 2' : undefined}
            />
          )
        })}

        {placed.map((neighbour) => {
          const meta = elementTypeMeta(neighbour.element.type)
          const toTheRight = neighbour.x >= centre.x
          return (
            <g
              key={neighbour.element.id}
              className="neighbourhood__node"
              onClick={() => onSelect(neighbour.element.id)}
              role="button"
              tabIndex={0}
              aria-label={neighbour.element.name}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return
                // Space scrolls the page unless it is claimed here, so it used
                // to navigate *and* scroll.
                event.preventDefault()
                onSelect(neighbour.element.id)
              }}
            >
              <circle
                cx={neighbour.x}
                cy={neighbour.y}
                r={5.5}
                fill={`var(--${meta.colourGroup}bg)`}
                stroke={`var(--${meta.colourGroup})`}
                strokeWidth={1}
              />
              <text
                className="neighbourhood__label"
                x={neighbour.x + (toTheRight ? 9 : -9)}
                y={neighbour.y + 3}
                textAnchor={toTheRight ? 'start' : 'end'}
              >
                {truncate(neighbour.element.name)}
              </text>
            </g>
          )
        })}

        <circle cx={centre.x} cy={centre.y} r={8} fill="var(--accent)" />
        <text className="neighbourhood__code" x={centre.x} y={centre.y + 3} textAnchor="middle">
          {centreMeta.code}
        </text>
      </svg>
    </div>
  )
}

function truncate(name: string, max = 12): string {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name
}
