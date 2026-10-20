import {
  elementsInView,
  type Element,
  type Point,
  type Relationship,
  type View,
  type ViewConnection,
  type ViewNode,
} from '@/model'
import { absoluteIndex } from './geometry'
import { topSelected, withDescendants } from './edit'

/**
 * Copy and paste on the canvas (#137), as Archi 5.10.0 does it: `CopyAction`,
 * `PasteAction`, `PasteSpecialAction` and `CopySnapshot`, read at the
 * `release_5.10.0` tag and checked against the shipped jar with `javap`. The
 * rule, with its evidence, is on #137.
 *
 * The clipboard is in the app, as Archi's `LocalClipboard` is. Nothing is
 * written to the system clipboard: nothing leaves the browser except a
 * download the user starts.
 */

/**
 * What a copy holds: Archi's `CopySnapshot`. It holds the copied drawings as
 * they were when they were copied, and the elements and relationships they
 * draw, so an edit or a deletion after the copy does not change what a paste
 * of copies makes.
 */
export interface Snapshot {
  /** The workspace copied from. A paste into another one makes copies. */
  readonly workspace: string
  /**
   * Every copied shape, in the source view's order. A shape's descendants come
   * with it, selected or not. A top-level shape here has no parent and absolute
   * bounds. A shape nested in another copied shape keeps its parent and its
   * bounds relative to that parent.
   */
  readonly nodes: readonly ViewNode[]
  /** Every connection whose two ends are both copied. A connection's own selection plays no part. */
  readonly connections: readonly ViewConnection[]
  /** What the copied drawings draw, by id, as it was at the copy. */
  readonly elements: ReadonlyMap<string, Element>
  readonly relationships: ReadonlyMap<string, Relationship>
  /** The top-left corner of the top-level shapes, in view coordinates. A paste at the pointer puts this corner there. */
  readonly origin: Point
}

/** What a copy and a paste read from the model. */
export interface PasteModel {
  readonly id: string
  element(id: string): Element | undefined
  relationship(id: string): Relationship | undefined
  view(id: string): View | undefined
}

/**
 * Copy the selected shapes of `view`, as `CopySnapshot`'s constructor does.
 * A selection that holds no shape copies nothing: Archi's Copy is disabled
 * then (`CopyAction.calculateEnabled`), and a selected connection copies
 * nothing on its own.
 */
export function copySelection(
  view: View,
  selected: Iterable<string>,
  model: PasteModel,
): Snapshot | undefined {
  // A shape whose ancestor is selected is copied with that ancestor, not again.
  const top = topSelected(view, new Set(selected))
  if (top.size === 0) return undefined
  const copied = withDescendants(view, top)
  const absolute = absoluteIndex(view)

  const nodes: ViewNode[] = []
  const elements = new Map<string, Element>()
  for (const node of view.nodes) {
    if (!copied.has(node.id)) continue
    if (node.kind === 'element') {
      const element = model.element(node.element)
      if (element) elements.set(element.id, element)
    }
    if (!top.has(node.id)) {
      nodes.push(node)
      continue
    }
    const { x, y } = absolute.get(node.id)!
    const lifted: ViewNode = { ...node, bounds: { ...node.bounds, x, y } }
    delete lifted.parent
    nodes.push(lifted)
  }

  // `COPY_SELECTED_CONNECTIONS` is false: a connection is copied when both its ends are.
  const connections = view.connections.filter(
    (connection) => copied.has(connection.source) && copied.has(connection.target),
  )
  const relationships = new Map<string, Relationship>()
  for (const connection of connections) {
    if (connection.kind !== 'relationship') continue
    const relationship = model.relationship(connection.relationship)
    if (relationship) relationships.set(relationship.id, relationship)
  }

  const tops = nodes.filter((node) => node.parent === undefined)
  return {
    workspace: model.id,
    nodes,
    connections,
    elements,
    relationships,
    origin: {
      x: Math.min(...tops.map((node) => node.bounds.x)),
      y: Math.min(...tops.map((node) => node.bounds.y)),
    },
  }
}

/** How far each paste with no pointer moves on from the last: `calculateXYOffset`'s 10, 10. */
export const PASTE_STEP = 10

/**
 * The offset of the next paste, as `CopySnapshot.calculateXYOffset` works it
 * out. If the canvas was pressed since the copy or the last paste, the top-left
 * of the copied shapes lands on that point. Otherwise the offset moves on by
 * 10, 10 from the last paste's, so repeated pastes step down and to the right.
 */
export function nextOffset(snapshot: Snapshot, last: Point, pressed: Point | null): Point {
  if (pressed) return { x: pressed.x - snapshot.origin.x, y: pressed.y - snapshot.origin.y }
  return { x: last.x + PASTE_STEP, y: last.y + PASTE_STEP }
}

/**
 * Whether a paste makes copies of the elements and relationships rather than
 * drawing the same ones again. It is decided once for the whole paste, as
 * `CopySnapshot.getPasteCommand` does.
 *
 * Paste (`needsNewArchimateConcepts`) makes copies when the paste goes into
 * another workspace, when any copied concept has left the model, or when any
 * is already drawn in the target view. Otherwise it draws them again.
 *
 * Paste Special, with Archi's default `pasteSpecialBehavior` (0, "Always paste
 * a reference to copied element"), draws them again unless the paste goes into
 * another workspace. Archi 5.10 does that even when a copied concept has left
 * the model, and the drawing then points at nothing. Here that case makes
 * copies, as Paste does: a drawing of a missing element is what `validate`
 * rejects.
 */
export function pastesCopies(
  snapshot: Snapshot,
  view: View,
  model: PasteModel,
  special: boolean,
): boolean {
  if (snapshot.workspace !== model.id) return true
  const gone =
    [...snapshot.elements.keys()].some((id) => !model.element(id)) ||
    [...snapshot.relationships.keys()].some((id) => !model.relationship(id))
  if (gone) return true
  if (special) return false
  // Archi asks the same of each copied relationship. Here a drawn relationship
  // runs between drawings of its two elements (`drawsRelationshipEnds`), and a
  // copied relationship's elements are copied too, so asking of the elements is enough.
  const drawn = elementsInView(view)
  return [...snapshot.elements.keys()].some((id) => drawn.has(id))
}

/** The suffix Archi gives a copied element's name in the same model (`CopySnapshot_1`). */
export const COPY_SUFFIX = ' (copy)'

export type MintKind = 'node' | 'conn' | 'el' | 'rel'

export interface PasteOptions {
  /** Added to every pasted shape's absolute position, and to every bend-point. */
  readonly offset: Point
  /** Paste Special. */
  readonly special: boolean
  /** A new id of each kind. Injected, so the Archi oracle's fixture gets the same ids on every run. */
  readonly mint: (kind: MintKind) => string
}

export interface Paste {
  /** The target view with the pasted shapes and connections added on top. */
  readonly view: View
  /** The copies this paste makes; empty when it draws the same concepts again. */
  readonly elements: readonly Element[]
  readonly relationships: readonly Relationship[]
  /** The new top-level shapes, which Archi selects after a paste. */
  readonly pasted: readonly string[]
}

/**
 * Paste `snapshot` into `view`, as `CopySnapshot.getPasteCommand` builds the
 * paste. Every pasted shape and connection gets a new id. Top-level shapes go
 * to the top level of the view, never into a container. Each lands at its
 * copied position plus `offset`, and nesting inside the copied shapes is kept.
 * The pasted drawings go after everything else, so they are drawn on top.
 *
 * With copies, each pasted shape gets its own new element (two shapes of one
 * element paste as two), named with Archi's ` (copy)` and filed in the default
 * folder for its type. Each pasted connection gets its own new relationship,
 * between the copied elements at its ends. A relationship keeps its name.
 *
 * A view reference pastes only when the view it points to still exists
 * (`isValidPasteComponent`). A shape that does not paste takes what is nested
 * in it along, and so does a connection with an end that does not paste.
 * Returns `undefined` when nothing pastes.
 */
export function pasteSnapshot(
  snapshot: Snapshot,
  view: View,
  model: PasteModel,
  { offset, special, mint }: PasteOptions,
): Paste | undefined {
  const copies = pastesCopies(snapshot, view, model, special)
  const byId = new Map(snapshot.nodes.map((node) => [node.id, node]))
  const decided = new Map<string, boolean>()
  const pastes = (node: ViewNode): boolean => {
    const known = decided.get(node.id)
    if (known !== undefined) return known
    // Settled before the parent is asked, so a parent cycle ends here rather than looping.
    decided.set(node.id, false)
    const parent = node.parent === undefined ? undefined : byId.get(node.parent)
    const own =
      node.kind === 'view-ref'
        ? model.view(node.view) !== undefined
        : node.kind !== 'element' || !copies || snapshot.elements.has(node.element)
    const result = own && (node.parent === undefined || (parent !== undefined && pastes(parent)))
    decided.set(node.id, result)
    return result
  }

  const nodeIds = new Map<string, string>()
  /** Pasted element shape → the element it draws in the target. */
  const drawsIn = new Map<string, string>()
  const elements: Element[] = []
  const nodes: ViewNode[] = []
  for (const node of snapshot.nodes) {
    if (!pastes(node)) continue
    const id = mint('node')
    nodeIds.set(node.id, id)
    const pasted: ViewNode = { ...node, id }
    if (node.parent === undefined) {
      pasted.bounds = { ...node.bounds, x: node.bounds.x + offset.x, y: node.bounds.y + offset.y }
    } else {
      pasted.parent = node.parent
    }
    if (pasted.kind === 'element') {
      if (copies) {
        // A deep copy, as Archi's `EcoreUtil.copy`: properties and profile are the copy's own.
        const copy: Element = {
          ...structuredClone(snapshot.elements.get(pasted.element)!),
          id: mint('el'),
        }
        copy.name += COPY_SUFFIX
        delete copy.folder
        elements.push(copy)
        pasted.element = copy.id
      }
      drawsIn.set(node.id, pasted.element)
    }
    nodes.push(pasted)
  }
  if (nodes.length === 0) return undefined
  // Parents are renamed once every pasted shape has its new id: a parent can come after its child.
  for (const node of nodes) {
    if (node.parent !== undefined) node.parent = nodeIds.get(node.parent)!
  }

  const relationships: Relationship[] = []
  const connections: ViewConnection[] = []
  for (const connection of snapshot.connections) {
    const source = nodeIds.get(connection.source)
    const target = nodeIds.get(connection.target)
    if (source === undefined || target === undefined) continue
    const pasted: ViewConnection = { ...connection, id: mint('conn'), source, target }
    if (connection.bendpoints) {
      pasted.bendpoints = connection.bendpoints.map((point) => ({
        x: point.x + offset.x,
        y: point.y + offset.y,
      }))
    }
    if (pasted.kind === 'relationship' && copies) {
      const original = snapshot.relationships.get(pasted.relationship)
      const from = drawsIn.get(connection.source)
      const to = drawsIn.get(connection.target)
      if (!original || from === undefined || to === undefined) continue
      const copy: Relationship = {
        ...structuredClone(original),
        id: mint('rel'),
        source: from,
        target: to,
      }
      delete copy.folder
      relationships.push(copy)
      pasted.relationship = copy.id
    }
    connections.push(pasted)
  }

  return {
    view: {
      ...view,
      nodes: [...view.nodes, ...nodes],
      connections: [...view.connections, ...connections],
    },
    elements,
    relationships,
    pasted: nodes.filter((node) => node.parent === undefined).map((node) => node.id),
  }
}

export type ClipboardChord = 'copy' | 'paste' | 'paste-special' | 'duplicate'

/**
 * Which clipboard action a key press on the canvas asks for. ⌘C or Ctrl+C
 * copies and ⌘V pastes. ⇧⌘V is Paste Special, Archi's `M1+M2+V`. ⌘D
 * duplicates; Archi binds `M1+D` to Duplicate in its model tree only.
 *
 * Only the canvas hears these, through its own key handler. So a text field
 * anywhere else keeps the browser's own copy and paste. The canvas's one text
 * field, the name typed on a shape, keeps its keys to itself (`InlineName`).
 */
export function clipboardChord(event: {
  key: string
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
}): ClipboardChord | undefined {
  if (!(event.metaKey || event.ctrlKey) || event.altKey) return undefined
  switch (event.key.toLowerCase()) {
    case 'c':
      return event.shiftKey ? undefined : 'copy'
    case 'v':
      return event.shiftKey ? 'paste-special' : 'paste'
    case 'd':
      return event.shiftKey ? undefined : 'duplicate'
    default:
      return undefined
  }
}

/**
 * The app's clipboard: the last copy, and the offset of the last paste from it.
 * One per model store, so it lasts as long as the tab and is shared by every
 * view, as Archi's `LocalClipboard` is shared by every diagram.
 */
export class Clipboard {
  #snapshot: Snapshot | undefined
  #offset: Point = { x: 0, y: 0 }

  get snapshot(): Snapshot | undefined {
    return this.#snapshot
  }

  /** The offset of the last paste of this snapshot; zero after a copy. */
  get offset(): Point {
    return this.#offset
  }

  copy(snapshot: Snapshot): void {
    this.#snapshot = snapshot
    this.#offset = { x: 0, y: 0 }
  }

  /** Called once a paste is made, with the offset it was made at. */
  pastedAt(offset: Point): void {
    this.#offset = offset
  }
}

const clipboards = new WeakMap<object, Clipboard>()

/** The clipboard that belongs to `owner`, the model store. */
export function clipboardFor(owner: object): Clipboard {
  let clipboard = clipboards.get(owner)
  if (!clipboard) {
    clipboard = new Clipboard()
    clipboards.set(owner, clipboard)
  }
  return clipboard
}
