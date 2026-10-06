import { defaultNodeSize } from '@/io/default-sizes'
import {
  LAYERS,
  LAYER_LABELS,
  absoluteBounds,
  elementTypesInLayer,
  typeCode,
  typeLabel,
  viewpointAllows,
  type Bounds,
  type Element,
  type ElementType,
  type JunctionKind,
  type Layer,
  type Point,
  type View,
  type ViewNode,
} from '@/model'
import { newId } from '@/store/ids'
import { dropTarget } from './edit'

/**
 * Making things in a view (#130): what the palette offers, what a placement
 * creates and where it goes. Pure, so the canvas, its tests and the Archi
 * fixture (`edited-claims.ts`) all place shapes with the same function.
 */

/** What the palette can place: an element of a type, a note, or a visual group. */
export type Tool =
  | { kind: 'element'; type: ElementType; junctionKind?: JunctionKind }
  | { kind: 'note' }
  | { kind: 'group' }

export interface ToolGroup {
  /** A layer, or `view` for the drawing aids that are not model elements. */
  id: Layer | 'view'
  label: string
  tools: Tool[]
}

/** What a tool is called in the palette and in the history. */
export function toolLabel(tool: Tool): string {
  if (tool.kind === 'note') return 'Note'
  if (tool.kind === 'group') return 'Group'
  if (tool.type === 'Junction') return tool.junctionKind === 'or' ? 'Or junction' : 'And junction'
  return typeLabel(tool.type)
}

/**
 * Every word typed appears in the tool's name, in any order, so "app comp"
 * finds Application Component; or the query is the type's two-letter code.
 */
export function toolMatches(tool: Tool, needle: string): boolean {
  const label = toolLabel(tool).toLowerCase()
  if (
    tool.kind === 'element' &&
    tool.type !== 'Junction' &&
    typeCode(tool.type).toLowerCase() === needle
  ) {
    return true
  }
  return needle.split(/\s+/).every((word) => label.includes(word))
}

/** A stable key for a tool, for React and for tests. */
export function toolKey(tool: Tool): string {
  if (tool.kind !== 'element') return tool.kind
  return tool.junctionKind ? `${tool.type}:${tool.junctionKind}` : tool.type
}

/**
 * The palette for a view: every element type, grouped by layer in catalogue
 * order, then note, group and the two junctions. A viewpoint leaves out the
 * element types it does not allow, and a layer it leaves empty goes too.
 */
export function paletteFor(viewpoint: string | undefined): ToolGroup[] {
  const groups: ToolGroup[] = []
  for (const layer of LAYERS) {
    const tools: Tool[] = elementTypesInLayer(layer)
      .map((meta) => meta.type as ElementType)
      // The junction has two entries of its own, with the drawing aids.
      .filter((type) => type !== 'Junction' && viewpointAllows(viewpoint, type))
      .map((type) => ({ kind: 'element', type }))
    if (tools.length) groups.push({ id: layer, label: LAYER_LABELS[layer], tools })
  }
  groups.push({
    id: 'view',
    label: 'Notes, groups, junctions',
    tools: [
      { kind: 'note' },
      { kind: 'group' },
      { kind: 'element', type: 'Junction' },
      { kind: 'element', type: 'Junction', junctionKind: 'or' },
    ],
  })
  return groups
}

/** The size a tool's shape is drawn at when placed: Archi's own defaults. */
export function toolSize(tool: Tool): { width: number; height: number } {
  return tool.kind === 'element'
    ? defaultNodeSize('element', tool.type)
    : defaultNodeSize(tool.kind)
}

/**
 * Where a shape of `size` goes when placed with its top-left corner at `point`
 * (view coordinates): inside the innermost container there, as a move drops
 * one (#128), with bounds relative to it. Archi places a new shape the same
 * way, top-left at the click.
 */
export function placement(
  view: View,
  point: Point,
  size: { width: number; height: number },
  isJunction: (elementId: string) => boolean,
): { parent?: string; bounds: Bounds } {
  const x = Math.round(point.x)
  const y = Math.round(point.y)
  const parent = dropTarget(view, new Set(), { x, y }, isJunction)
  const origin = parent === undefined ? undefined : absoluteBounds(view, parent)
  const bounds = { x: x - (origin?.x ?? 0), y: y - (origin?.y ?? 0), ...size }
  return parent === undefined ? { bounds } : { parent, bounds }
}

/** The element a tool creates: named for its type, as Archi names a new one. A junction has no name. */
export function newElement(tool: Extract<Tool, { kind: 'element' }>): Element {
  const element: Element = {
    id: newId('el'),
    type: tool.type,
    name: tool.type === 'Junction' ? '' : typeLabel(tool.type),
    properties: {},
  }
  if (tool.junctionKind === 'or') element.junctionKind = 'or'
  return element
}

/** The node a note or group tool creates. */
export function newDrawingNode(
  tool: Extract<Tool, { kind: 'note' | 'group' }>,
  place: { parent?: string; bounds: Bounds },
): ViewNode {
  const node: ViewNode =
    tool.kind === 'note'
      ? { id: newId('node'), kind: 'note', text: '', bounds: place.bounds }
      : { id: newId('node'), kind: 'group', name: 'Group', bounds: place.bounds }
  if (place.parent !== undefined) node.parent = place.parent
  return node
}

/** The name a new view gets, as Archi's "New ArchiMate View" is its. */
export const NEW_VIEW_NAME = 'New view'

/** A new, empty view, filed in `folder` or, without one, directly under Views. */
export function newView(folder?: string): View {
  const view: View = {
    id: newId('view'),
    name: NEW_VIEW_NAME,
    properties: {},
    nodes: [],
    connections: [],
  }
  if (folder !== undefined) view.folder = folder
  return view
}

/**
 * The drag data a model-tree element row carries, so the canvas can draw that
 * element (#130). Its value is the element's id: the drop draws the element
 * itself, never a copy.
 */
export const ELEMENT_DRAG_TYPE = 'application/x-archipelago-element'
