import { childrenByParent, type Bounds, type View, type ViewNode } from '@/model'
import { followBendpoints, resizeNode, topSelected } from './edit'

/**
 * Arranging a selection (#136): align, distribute, match width or height, and
 * z-order. Pure, and each returns the view unchanged (the same object) when
 * there is nothing to do, so the store records nothing for a no-op; the canvas
 * commits each as one command.
 *
 * `selection` is in the order it was made, so its last id is what GEF calls the
 * primary selection: the shape the others are aligned or matched to. Archi
 * marks it with solid handles; the canvas outlines it more heavily.
 */

export type Alignment = 'left' | 'centre' | 'right' | 'top' | 'middle' | 'bottom'
export type Axis = 'horizontal' | 'vertical'
export type Dimension = 'width' | 'height'
export type ZOrder = 'front' | 'forward' | 'backward' | 'back'

/**
 * The shapes an align or distribute moves, primary last, or `undefined` when
 * the selection cannot be arranged. GEF's `AlignmentAction.getOperationSet`
 * (Archi 5.10, `org.eclipse.gef` 3.26, read with `javap`): the selection
 * without the shapes nested in another selected one, and only when that leaves
 * at least `min`, keeps the primary, and puts them all in one parent. Within
 * one parent, relative bounds compare as absolute ones do.
 */
export function arrangeable(
  view: View,
  selection: readonly string[],
  min: number,
): ViewNode[] | undefined {
  const primary = selection[selection.length - 1]
  if (primary === undefined) return undefined
  const top = topSelected(view, new Set(selection))
  const byId = new Map(view.nodes.map((node) => [node.id, node]))
  const nodes = selection.filter((id) => top.has(id)).map((id) => byId.get(id)!)
  if (nodes.length < min || nodes[nodes.length - 1]!.id !== primary) return undefined
  const parent = nodes[0]!.parent
  return nodes.every((node) => node.parent === parent) ? nodes : undefined
}

/**
 * Align to the primary selection's edge or centre: GEF's `AlignmentRequest`.
 * A centre lands on draw2d's integer, which floors (`PrecisionGeometry
 * .doubleToInteger`), so a shape 1 px narrower than the primary's half-pixel
 * centre sits half a pixel left of it, as in Archi.
 */
export function align(view: View, selection: readonly string[], alignment: Alignment): View {
  const nodes = arrangeable(view, selection, 2)
  if (!nodes) return view
  const anchor = nodes[nodes.length - 1]!.bounds
  const place = (b: Bounds): Bounds => {
    const floor = (value: number) => Math.floor(value + 1e-9)
    switch (alignment) {
      case 'left':
        return { ...b, x: anchor.x }
      case 'centre':
        return { ...b, x: floor(anchor.x + anchor.width / 2 - b.width / 2) }
      case 'right':
        return { ...b, x: anchor.x + anchor.width - b.width }
      case 'top':
        return { ...b, y: anchor.y }
      case 'middle':
        return { ...b, y: floor(anchor.y + anchor.height / 2 - b.height / 2) }
      case 'bottom':
        return { ...b, y: anchor.y + anchor.height - b.height }
    }
  }
  return placed(view, new Map(nodes.map((node) => [node.id, place(node.bounds)])))
}

/**
 * Space three or more shapes evenly, with equal gaps between them. Archi 5.10
 * has no distribute (no such action in its editor or in GEF), so the rule is
 * ours, built like its align: the same operation set, one parent, positions
 * relative to it. Shapes are taken in the order of their centres (selection
 * order breaks a tie); the first and the last stay where they are, and the
 * ones between are placed so that every gap is the same, rounded to the pixel.
 */
export function distribute(view: View, selection: readonly string[], axis: Axis): View {
  const nodes = arrangeable(view, selection, 3)
  if (!nodes) return view
  const horizontal = axis === 'horizontal'
  const start = (b: Bounds) => (horizontal ? b.x : b.y)
  const size = (b: Bounds) => (horizontal ? b.width : b.height)
  const ordered = nodes
    .map((node, index) => ({ node, index }))
    .sort(
      (a, b) =>
        start(a.node.bounds) +
          size(a.node.bounds) / 2 -
          (start(b.node.bounds) + size(b.node.bounds) / 2) || a.index - b.index,
    )
    .map(({ node }) => node)
  const first = ordered[0]!.bounds
  const last = ordered[ordered.length - 1]!.bounds
  const inner = ordered.slice(1, -1)
  const room = start(last) - (start(first) + size(first))
  const gap =
    (room - inner.reduce((sum, node) => sum + size(node.bounds), 0)) / (ordered.length - 1)
  let cursor = start(first) + size(first)
  const targets = new Map<string, Bounds>()
  for (const node of inner) {
    cursor += gap
    const at = Math.round(cursor)
    targets.set(node.id, horizontal ? { ...node.bounds, x: at } : { ...node.bounds, y: at })
    cursor += size(node.bounds)
  }
  return placed(view, targets)
}

/**
 * Give every other selected shape the primary's width or height: GEF's
 * `MatchWidthAction` and `MatchHeightAction`. Each is resized by the
 * difference, so its top-left corner stays, and what is nested in it stays
 * where it was drawn. Unlike align, GEF asks for no common parent here.
 */
export function matchSize(view: View, selection: readonly string[], dimension: Dimension): View {
  const primary = view.nodes.find((node) => node.id === selection[selection.length - 1])
  if (!primary) return view
  let next = view
  for (const id of selection.slice(0, -1)) {
    const node = next.nodes.find((n) => n.id === id)
    if (!node) continue
    next = resizeNode(next, id, { ...node.bounds, [dimension]: primary.bounds[dimension] })
  }
  return next
}

/** Whether matching would change anything: at least two shapes, the primary among them. */
export function canMatch(view: View, selection: readonly string[]): boolean {
  return selection.length >= 2 && view.nodes.some((n) => n.id === selection[selection.length - 1])
}

/**
 * Change the drawing order within each selected shape's parent: Archi's
 * `ObjectPositionAction` (read with `javap`). Each selected shape is one
 * `PositionCommand`, made in selection order and run in that order on the
 * order as the ones before it left it. Front and back move it to the end or the
 * start of its parent's children; forward and backward move it one place. A
 * shape already at the end it would move toward makes no command, judged on
 * the order before any of them ran. A parent's children are drawn in their
 * order in `view.nodes`, so the siblings trade places in the array and every
 * other node keeps its own.
 *
 * Archi's rule, kept even where it surprises: two neighbours brought forward,
 * the back one selected first, end where they began, because the first one
 * steps over the second and the second then steps back over it.
 */
export function reorder(view: View, selection: readonly string[], order: ZOrder): View {
  const groups = childrenByParent(view)
  const parentOf = new Map<string, string | undefined>()
  for (const [parent, children] of groups) {
    for (const child of children) parentOf.set(child.id, parent)
  }
  const siblings = new Map<string | undefined, string[]>(
    [...groups].map(([parent, children]) => [parent, children.map((child) => child.id)]),
  )
  const toEnd = order === 'front' || order === 'forward'
  // Which commands Archi makes: decided before any runs (`canExecute` on the old position).
  const commands = selection.filter((id) => {
    if (!parentOf.has(id)) return false
    const list = siblings.get(parentOf.get(id))!
    const at = list.indexOf(id)
    return toEnd ? at < list.length - 1 : at > 0
  })
  if (commands.length === 0) return view
  for (const id of commands) {
    const list = siblings.get(parentOf.get(id))!
    const at = list.indexOf(id)
    const to =
      order === 'front'
        ? list.length - 1
        : order === 'back'
          ? 0
          : order === 'forward'
            ? at + 1
            : at - 1
    list.splice(at, 1)
    list.splice(to, 0, id)
  }
  // Each parent's children go back into the slots its children held, in their new order.
  const byId = new Map(view.nodes.map((node) => [node.id, node]))
  const next = new Map<string | undefined, string[]>(
    [...siblings].map(([parent, ids]) => [parent, [...ids]]),
  )
  const nodes = view.nodes.map((node) => byId.get(next.get(parentOf.get(node.id))!.shift()!)!)
  return nodes.every((node, i) => node === view.nodes[i]) ? view : { ...view, nodes }
}

/** Whether `reorder` would change anything. */
export function canReorder(view: View, selection: readonly string[], order: ZOrder): boolean {
  return reorder(view, selection, order) !== view
}

/** `view` with the given nodes at new relative bounds, their contents and bend-points following. */
function placed(view: View, targets: ReadonlyMap<string, Bounds>): View {
  let changed = false
  const nodes = view.nodes.map((node) => {
    const target = targets.get(node.id)
    if (!target || (target.x === node.bounds.x && target.y === node.bounds.y)) return node
    changed = true
    return { ...node, bounds: target }
  })
  return changed ? followBendpoints(view, { ...view, nodes }) : view
}
