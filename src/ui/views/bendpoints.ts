import type { Point, View, ViewConnection } from '@/model'

/**
 * Shaping a connection by hand (#133), as Archi's `ManualBendpointEditPolicy`
 * (GEF's `BendpointEditPolicy`) does in a view routed through bend-points:
 * dragging the handle in the middle of a segment makes **one** bend-point
 * there (`getCreateBendpointCommand`), dragging a bend-point moves it, and a
 * bend-point can be removed. A Manhattan view has none of this: Archi removes
 * the policy for `ManhattanConnectionRouter` (`DiagramConnectionEditPart
 * .refreshBendpointEditPolicy`), since that router ignores bend-points.
 *
 * Pure, and each returns the connection itself when nothing changes, so the
 * store records nothing. A connection left with no bend-points has no
 * `bendpoints` field, as one never bent has none: their canonical JSON is the same.
 * Points are rounded to whole pixels, as Archi stores them.
 */

const whole = (p: Point): Point => ({ x: Math.round(p.x), y: Math.round(p.y) })

function withBendpoints(connection: ViewConnection, points: Point[]): ViewConnection {
  const next = { ...connection }
  if (points.length) next.bendpoints = points
  else delete next.bendpoints
  return next
}

/**
 * A new bend-point at `at` on segment `segment` of the route: segment 0 runs
 * from the source anchor to the first bend-point, so the point goes in at that
 * index of `bendpoints`.
 */
export function insertBendpoint(
  connection: ViewConnection,
  segment: number,
  at: Point,
): ViewConnection {
  const points = [...(connection.bendpoints ?? [])]
  if (segment < 0 || segment > points.length) return connection
  points.splice(segment, 0, whole(at))
  return withBendpoints(connection, points)
}

/** Bend-point `index` moved to `at`. */
export function moveBendpoint(
  connection: ViewConnection,
  index: number,
  at: Point,
): ViewConnection {
  const points = connection.bendpoints ?? []
  const old = points[index]
  if (!old) return connection
  const moved = whole(at)
  if (moved.x === old.x && moved.y === old.y) return connection
  return withBendpoints(
    connection,
    points.map((p, i) => (i === index ? moved : p)),
  )
}

/** Bend-point `index` removed. */
export function removeBendpoint(connection: ViewConnection, index: number): ViewConnection {
  const points = connection.bendpoints ?? []
  if (!points[index]) return connection
  return withBendpoints(
    connection,
    points.filter((_, i) => i !== index),
  )
}

/** Every bend-point removed, so the line runs straight between its two shapes again. */
export function straightened(connection: ViewConnection): ViewConnection {
  return connection.bendpoints?.length ? withBendpoints(connection, []) : connection
}

/** Where each segment's handle is: the middle of the segment, in route order. */
export function segmentHandles(route: readonly Point[]): Point[] {
  const handles: Point[] = []
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1]!
    const b = route[i]!
    handles.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
  }
  return handles
}

/** `view` with connection `id` changed by `change`, or `view` itself when nothing changed. */
export function changeConnection(
  view: View,
  id: string,
  change: (connection: ViewConnection) => ViewConnection,
): View {
  const connection = view.connections.find((c) => c.id === id)
  if (!connection) return view
  const next = change(connection)
  if (next === connection) return view
  return { ...view, connections: view.connections.map((c) => (c === connection ? next : c)) }
}
