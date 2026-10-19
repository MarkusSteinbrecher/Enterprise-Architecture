import type { Bounds, Point } from '@/model'

/**
 * The orthogonal route of a connection in a Manhattan view (#133), as ADR 0006
 * chose: diagram-js's `ManhattanLayout.connectRectangles` with its default
 * hints, ported to TypeScript from diagram-js v15.4.0
 * (`lib/layout/ManhattanLayout.js`, with `getOrientation` and `getMid` from
 * `lib/layout/LayoutUtil.js` and `pointsOnLine` from `lib/util/Geometry.js`).
 * Ported rather than installed: the package is the whole diagram-js editor, and
 * this is the one function the canvas uses, typed and tested here. Only the
 * path `connectRectangles` takes is ported; repairing a route after a move is
 * not, since Archipelago lays a Manhattan route out afresh every time, as
 * Archi's `ManhattanConnectionRouter` does.
 *
 * Archi ignores a Manhattan view's bend-points (`DiagramConnectionEditPart
 * .refreshBendpoints` returns early for `ManhattanConnectionRouter`), so this
 * takes none.
 *
 * diagram-js is MIT licensed:
 *
 *   The MIT License (MIT)
 *   Copyright (c) 2014-present Camunda Services GmbH
 *
 *   Permission is hereby granted, free of charge, to any person obtaining a copy
 *   of this software and associated documentation files (the "Software"), to
 *   deal in the Software without restriction, including without limitation the
 *   rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 *   sell copies of the Software, and to permit persons to whom the Software is
 *   furnished to do so, subject to the following conditions:
 *
 *   The above copyright notice and this permission notice shall be included in
 *   all copies or substantial portions of the Software.
 *
 *   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 *   FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 *   IN THE SOFTWARE.
 */

type Orientation =
  | 'top'
  | 'right'
  | 'bottom'
  | 'left'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'intersect'

const MIN_SEGMENT_LENGTH = 20
const POINT_ORIENTATION_PADDING = 5
/** `ORIENTATION_THRESHOLD['h:h']`: the default layout's. */
const ORIENTATION_THRESHOLD = 20
const round = Math.round

/** Where `rect` lies with respect to `reference`, `padding` widening the gap that counts. */
function getOrientation(rect: Bounds, reference: Bounds, padding = 0): Orientation {
  const top = rect.y + rect.height + padding <= reference.y
  const right = rect.x - padding >= reference.x + reference.width
  const bottom = rect.y - padding >= reference.y + reference.height
  const left = rect.x + rect.width + padding <= reference.x
  const vertical = top ? 'top' : bottom ? 'bottom' : null
  const horizontal = left ? 'left' : right ? 'right' : null
  if (horizontal && vertical) return `${vertical}-${horizontal}`
  return horizontal ?? vertical ?? 'intersect'
}

const pointBounds = (p: Point): Bounds => ({ x: p.x, y: p.y, width: 0, height: 0 })

const getMid = (b: Bounds): Point => ({
  x: round(b.x + b.width / 2),
  y: round(b.y + b.height / 2),
})

function needsTurn(orientation: Orientation, startDirection: string): boolean {
  const test: Record<string, RegExp> = {
    t: /top/,
    r: /right/,
    b: /bottom/,
    l: /left/,
    h: /./,
    v: /./,
  }
  return !test[startDirection]!.test(orientation)
}

function canLayoutStraight(direction: string, targetOrientation: Orientation): boolean {
  const test: Record<string, RegExp> = {
    t: /top/,
    r: /right/,
    b: /bottom/,
    l: /left/,
    h: /left|right/,
    v: /top|bottom/,
  }
  return test[direction]!.test(targetOrientation)
}

interface Segment {
  waypoints: Point[]
  directions: string
  turnNextDirections: boolean
}

function getSegmentBendpoints(a: Point, b: Point, directions: string): Segment {
  const orientation = getOrientation(pointBounds(b), pointBounds(a), POINT_ORIENTATION_PADDING)
  const startDirection = directions.split(':')[0]!
  const xmid = round((b.x - a.x) / 2 + a.x)
  const ymid = round((b.y - a.y) / 2 + a.y)
  let segmentEnd: Point
  let segmentDirections: string
  const layoutStraight = canLayoutStraight(startDirection, orientation)
  const layoutHorizontal = /h|r|l/.test(startDirection)
  let turnNextDirections = false

  if (layoutStraight) {
    segmentEnd = layoutHorizontal ? { x: xmid, y: a.y } : { x: a.x, y: ymid }
    segmentDirections = layoutHorizontal ? 'h:h' : 'v:v'
  } else {
    const layoutTurn = needsTurn(orientation, startDirection)
    segmentDirections = layoutHorizontal ? 'h:v' : 'v:h'
    if (layoutTurn) {
      if (layoutHorizontal) {
        turnNextDirections = ymid === a.y
        segmentEnd = {
          x: a.x + MIN_SEGMENT_LENGTH * (/l/.test(startDirection) ? -1 : 1),
          y: turnNextDirections ? ymid + MIN_SEGMENT_LENGTH : ymid,
        }
      } else {
        turnNextDirections = xmid === a.x
        segmentEnd = {
          x: turnNextDirections ? xmid + MIN_SEGMENT_LENGTH : xmid,
          y: a.y + MIN_SEGMENT_LENGTH * (/t/.test(startDirection) ? -1 : 1),
        }
      }
    } else {
      segmentEnd = { x: xmid, y: ymid }
    }
  }
  return {
    waypoints: [...getBendpoints(a, segmentEnd, segmentDirections), segmentEnd],
    directions: segmentDirections,
    turnNextDirections,
  }
}

const invertDirections = (directions: string) => directions.split(':').reverse().join(':')

function getEndSegment(a: Point, b: Point, directions: string): Segment {
  const inverted = getSegmentBendpoints(b, a, invertDirections(directions))
  return {
    waypoints: [...inverted.waypoints].reverse(),
    directions: invertDirections(inverted.directions),
    turnNextDirections: inverted.turnNextDirections,
  }
}

function getMidSegment(start: Segment, end: Segment): Point[] {
  let startDirection = start.directions.split(':')[1]!
  let endDirection = end.directions.split(':')[0]!
  if (start.turnNextDirections) startDirection = startDirection === 'h' ? 'v' : 'h'
  if (end.turnNextDirections) endDirection = endDirection === 'h' ? 'v' : 'h'
  return getBendpoints(
    start.waypoints[start.waypoints.length - 1]!,
    end.waypoints[0]!,
    `${startDirection}:${endDirection}`,
  )
}

/** Layouts with at most two bend-points, between two points. */
function getSimpleBendpoints(a: Point, b: Point, directions: string): Point[] {
  const xmid = round((b.x - a.x) / 2 + a.x)
  const ymid = round((b.y - a.y) / 2 + a.y)
  if (directions === 'h:v') return [{ x: b.x, y: a.y }]
  if (directions === 'v:h') return [{ x: a.x, y: b.y }]
  if (directions === 'h:h') {
    return [
      { x: xmid, y: a.y },
      { x: xmid, y: b.y },
    ]
  }
  if (directions === 'v:v') {
    return [
      { x: a.x, y: ymid },
      { x: b.x, y: ymid },
    ]
  }
  throw new Error(`invalid directions: ${directions}`)
}

const isExplicitDirections = (directions: string) => /t|r|b|l/.test(directions)

function getBendpoints(a: Point, b: Point, directions = 'h:h'): Point[] {
  if (isExplicitDirections(directions)) {
    const start = getSegmentBendpoints(a, b, directions)
    const end = getEndSegment(a, b, directions)
    return [...start.waypoints, ...getMidSegment(start, end), ...end.waypoints]
  }
  return getSimpleBendpoints(a, b, directions)
}

/** Whether `r` lies on the line through `p` and `q`, within `accuracy`. */
function pointsOnLine(p: Point | undefined, q: Point | undefined, r: Point, accuracy: number) {
  if (!p || !q) return false
  const val = (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)
  const dist = Math.hypot(q.x - p.x, q.y - p.y)
  return Math.abs(val / dist) <= accuracy
}

/** The points with every one that lies on the line between its neighbours left out. */
export function withoutRedundantPoints(waypoints: readonly Point[]): Point[] {
  return waypoints.reduce<Point[]>((points, p, idx) => {
    const previous = points[points.length - 1]
    const next = waypoints[idx + 1]
    if (!pointsOnLine(previous, next, p, 0)) points.push(p)
    return points
  }, [])
}

function getDirections(orientation: Orientation): string {
  switch (orientation) {
    case 'intersect':
      return 't:t'
    case 'top':
    case 'bottom':
      return 'v:v'
    case 'left':
    case 'right':
      return 'h:h'
    default:
      return 'h:h'
  }
}

const INVERTED: Record<Orientation, Orientation> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
  'top-left': 'bottom-right',
  'bottom-right': 'top-left',
  'top-right': 'bottom-left',
  'bottom-left': 'top-right',
  intersect: 'intersect',
}

function getDockingPoint(
  point: Point,
  rectangle: Bounds,
  dockingDirection: string,
  targetOrientation: Orientation,
): Point {
  let direction = dockingDirection
  if (direction === 'h') direction = /left/.test(targetOrientation) ? 'l' : 'r'
  if (direction === 'v') direction = /top/.test(targetOrientation) ? 't' : 'b'
  if (direction === 't') return { x: point.x, y: rectangle.y }
  if (direction === 'r') return { x: rectangle.x + rectangle.width, y: point.y }
  if (direction === 'b') return { x: point.x, y: rectangle.y + rectangle.height }
  return { x: rectangle.x, y: point.y }
}

/**
 * The route between two boxes in horizontal and vertical segments only,
 * docked on their outlines: `connectRectangles(source, target)` with the
 * default `h:h` layout. A box beside the other is joined across the gap, one
 * above the other through a horizontal middle segment, and two that overlap
 * over their tops.
 */
export function manhattanRoute(source: Bounds, target: Bounds): Point[] {
  const orientation = getOrientation(source, target, ORIENTATION_THRESHOLD)
  const directions = getDirections(orientation)
  const [from, to] = directions.split(':') as [string, string]
  const start = getDockingPoint(getMid(source), source, from, INVERTED[orientation])
  const end = getDockingPoint(getMid(target), target, to, orientation)
  return withoutRedundantPoints([start, ...getBendpoints(start, end, directions), end])
}
