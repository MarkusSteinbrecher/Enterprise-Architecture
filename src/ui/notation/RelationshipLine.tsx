import { memo } from 'react'
import type { AccessType, Appearance, Point, RelationshipType } from '@/model'
import { DASH, RELATIONSHIP_NOTATION, relationshipHeads, type Head } from './relationship-notation'

/**
 * One ArchiMate 3.2 relationship drawn along `points`: the route in view
 * coordinates, already anchored on the two shapes (the canvas computes anchors;
 * the notation only draws).
 *
 * Heads are drawn as geometry at the ends rather than SVG `<marker>`s: markers
 * need document-unique ids, which collide when several diagrams share a page and
 * break when one diagram is exported on its own.
 */

export interface RelationshipLineProps {
  type: RelationshipType
  /** At least two points: source anchor, bend-points, target anchor. */
  points: readonly Point[]
  accessType?: AccessType
  /** Association only: draws a half arrow at the target (#84 carries it on the model). */
  directed?: boolean
  /** Text at the middle of the route: the relationship's name, or an influence modifier. */
  label?: string
  appearance?: Appearance
}

interface HeadSize {
  length: number
  half: number
  /** How far the line stops short of the tip, so it does not show through a closed head. */
  inset: number
}

const SIZE: Record<Head, HeadSize> = {
  'open-arrow': { length: 10, half: 5, inset: 0 },
  'small-arrow': { length: 7, half: 4, inset: 0 },
  'filled-arrow': { length: 10, half: 4.5, inset: 9 },
  'hollow-triangle': { length: 12, half: 7, inset: 12 },
  'filled-diamond': { length: 14, half: 5, inset: 14 },
  'hollow-diamond': { length: 14, half: 5, inset: 14 },
  dot: { length: 6, half: 3, inset: 0 },
  'half-arrow': { length: 10, half: 5, inset: 0 },
}

const LABEL_SIZE = 11

export const RelationshipLine = memo(function RelationshipLine({
  type,
  points,
  accessType,
  directed,
  label,
  appearance,
}: RelationshipLineProps) {
  if (points.length < 2) return null
  const stroke = appearance?.lineColor ?? 'var(--ink)'
  const width = appearance?.lineWidth ?? 1
  const heads = relationshipHeads(type, {
    ...(accessType ? { accessType } : {}),
    ...(directed !== undefined ? { directed } : {}),
  })
  const route = [...points]
  const n = route.length
  const sourceEnd = end(route[1]!, route[0]!)
  const targetEnd = end(route[n - 2]!, route[n - 1]!)
  if (heads.source) route[0] = shorten(sourceEnd, SIZE[heads.source].inset)
  if (heads.target) route[n - 1] = shorten(targetEnd, SIZE[heads.target].inset)
  const d = `M${route.map((p) => `${r(p.x)},${r(p.y)}`).join('L')}`
  const mid = midpoint(points)

  return (
    <g
      data-relationship={type}
      data-access={type === 'Access' ? (accessType ?? 'Write') : undefined}
    >
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={width}
        strokeDasharray={DASH[RELATIONSHIP_NOTATION[type].pattern]}
      />
      {heads.source && (
        <HeadShape head={heads.source} end={sourceEnd} stroke={stroke} width={width} at="source" />
      )}
      {heads.target && (
        <HeadShape head={heads.target} end={targetEnd} stroke={stroke} width={width} at="target" />
      )}
      {label && (
        <text
          x={r(mid.x)}
          y={r(mid.y - 4)}
          textAnchor="middle"
          fontSize={appearance?.fontSize ?? LABEL_SIZE}
          fontFamily="var(--font-ui)"
          fill={appearance?.fontColor ?? 'var(--ink2)'}
          // A halo in the canvas colour keeps the label legible where it crosses a line.
          stroke="var(--paper)"
          strokeWidth={3}
          paintOrder="stroke"
          pointerEvents="none"
        >
          {label}
        </text>
      )}
    </g>
  )
})

/** The tip and the unit direction of travel into it. */
interface End {
  tip: Point
  ux: number
  uy: number
}

function end(from: Point, tip: Point): End {
  const dx = tip.x - from.x
  const dy = tip.y - from.y
  const len = Math.hypot(dx, dy) || 1
  return { tip, ux: dx / len, uy: dy / len }
}

function shorten({ tip, ux, uy }: End, by: number): Point {
  return { x: tip.x - ux * by, y: tip.y - uy * by }
}

function HeadShape({
  head,
  end: e,
  stroke,
  width,
  at,
}: {
  head: Head
  end: End
  stroke: string
  width: number
  at: 'source' | 'target'
}) {
  const { length, half } = SIZE[head]
  const { tip, ux, uy } = e
  // `back(l, s)`: l along the line behind the tip, s to its side.
  const back = (l: number, s: number) =>
    `${r(tip.x - ux * l - uy * s)},${r(tip.y - uy * l + ux * s)}`
  const t = `${r(tip.x)},${r(tip.y)}`
  const common = {
    'data-head': head,
    'data-end': at,
    stroke,
    strokeWidth: width,
    strokeLinejoin: 'miter' as const,
  }
  switch (head) {
    case 'open-arrow':
    case 'small-arrow':
      return (
        <path {...common} d={`M${back(length, half)}L${t}L${back(length, -half)}`} fill="none" />
      )
    case 'half-arrow':
      return <path {...common} d={`M${back(length, half)}L${t}`} fill="none" />
    case 'filled-arrow':
      return (
        <path {...common} d={`M${back(length, half)}L${t}L${back(length, -half)}Z`} fill={stroke} />
      )
    case 'hollow-triangle':
      return (
        <path {...common} d={`M${back(length, half)}L${t}L${back(length, -half)}Z`} fill="none" />
      )
    case 'filled-diamond':
    case 'hollow-diamond':
      return (
        <path
          {...common}
          d={`M${t}L${back(length / 2, half)}L${back(length, 0)}L${back(length / 2, -half)}Z`}
          fill={head === 'filled-diamond' ? stroke : 'none'}
        />
      )
    case 'dot': {
      const c = { x: tip.x - ux * half, y: tip.y - uy * half }
      return <circle {...common} cx={r(c.x)} cy={r(c.y)} r={half} fill={stroke} />
    }
  }
}

/** The point halfway along the route's length. */
function midpoint(points: readonly Point[]): Point {
  let total = 0
  for (let i = 1; i < points.length; i++) total += dist(points[i - 1]!, points[i]!)
  let left = total / 2
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!
    const b = points[i]!
    const seg = dist(a, b)
    if (seg >= left && seg > 0)
      return { x: a.x + ((b.x - a.x) * left) / seg, y: a.y + ((b.y - a.y) * left) / seg }
    left -= seg
  }
  return points[0]!
}

const dist = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y)
const r = (v: number) => Math.round(v * 100) / 100
