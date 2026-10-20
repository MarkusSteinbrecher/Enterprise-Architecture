import {
  FONT_STYLES,
  TEXT_ALIGNMENTS,
  TEXT_POSITIONS,
  type Appearance,
  type FontStyle,
  type TextAlignment,
  type TextPosition,
  type View,
  type ViewConnection,
  type ViewNode,
} from './workspace'

/**
 * Editing a drawing's appearance (#135): the guards a form value passes on its
 * way into the model, the fields each kind of drawing has, and the pure view
 * operations the selection panel and the format painter commit.
 *
 * An absent field means "as the notation draws it" (`Appearance`), so clearing
 * an override removes the field, and a drawing left with none loses its
 * `appearance` altogether: its canonical JSON is then that of a drawing never
 * edited. Each view operation returns the view it was given when nothing
 * changes, which the store records as nothing.
 */

export type AppearanceField = keyof Appearance

/** A drawing: a node or a connection. Both carry an `appearance`. */
export type Drawing = ViewNode | ViewConnection

/** `#rrggbb` or `#rrggbbaa`, in either case. Shared with the published JSON schema. */
export const HEX_COLOUR_PATTERN = '^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$'
const HEX_COLOUR = new RegExp(HEX_COLOUR_PATTERN)

export function isHexColour(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOUR.test(value)
}

export function isTextAlignment(value: unknown): value is TextAlignment {
  return (TEXT_ALIGNMENTS as readonly unknown[]).includes(value)
}

export function isTextPosition(value: unknown): value is TextPosition {
  return (TEXT_POSITIONS as readonly unknown[]).includes(value)
}

/**
 * A colour typed into a field, as the model holds one: `#rrggbb` or
 * `#rrggbbaa`, lower-cased, so `#FFAA00` and `#ffaa00` are one colour and one
 * file (the canonical reader lower-cases too, ADR 0004). The `#` may be left
 * out. Anything else, an empty field included, is `undefined`: never `''` or
 * `#`, which the published schema rejects.
 */
export function colourFromInput(raw: string): string | undefined {
  const text = raw.trim()
  const hex = text.startsWith('#') ? text : `#${text}`
  return isHexColour(hex) ? hex.toLowerCase() : undefined
}

/**
 * A font size typed into a field: whole points, as Archi holds a font's
 * height, so what Archi saves is what was typed. Anything else is `undefined`.
 */
export function fontSizeFromInput(raw: string): number | undefined {
  const text = raw.trim()
  if (!/^\d+$/.test(text)) return undefined
  const size = Number(text)
  return size > 0 ? size : undefined
}

/** A line width from the width control: a whole number of pixels, at least one. */
export function lineWidthFromInput(raw: string): number | undefined {
  const text = raw.trim()
  if (!/^\d+$/.test(text)) return undefined
  const width = Number(text)
  return width > 0 ? width : undefined
}

/** A font name typed into a field, trimmed; an empty one is `undefined`. */
export function fontNameFromInput(raw: string): string | undefined {
  const name = raw.trim()
  return name ? name : undefined
}

/**
 * The appearance a shape has. A connection has no fill and no text box: its
 * label sits along the line (`labelPosition`) instead.
 */
const SHAPE_FIELDS: readonly AppearanceField[] = [
  'fillColor',
  'lineColor',
  'lineWidth',
  'fontName',
  'fontSize',
  'fontColor',
  'fontStyle',
  'textAlignment',
  'textPosition',
]
/** A junction has no text: Archi exposes its fill, line colour and line width only (`JunctionUIProvider`). */
const JUNCTION_FIELDS: readonly AppearanceField[] = ['fillColor', 'lineColor', 'lineWidth']
const LINE_FIELDS: readonly AppearanceField[] = [
  'lineColor',
  'lineWidth',
  'fontName',
  'fontSize',
  'fontColor',
  'fontStyle',
  'labelPosition',
]

/** Whether a drawing is a connection rather than a node. */
export function isConnection(drawing: Drawing): drawing is ViewConnection {
  return !('bounds' in drawing)
}

function isJunctionDrawing(drawing: Drawing, isJunction: (elementId: string) => boolean): boolean {
  return !isConnection(drawing) && drawing.kind === 'element' && isJunction(drawing.element)
}

/** The appearance fields a drawing has, in the order the panel shows them. */
export function appearanceFields(
  drawing: Drawing,
  isJunction: (elementId: string) => boolean,
): readonly AppearanceField[] {
  if (isConnection(drawing)) return LINE_FIELDS
  return isJunctionDrawing(drawing, isJunction) ? JUNCTION_FIELDS : SHAPE_FIELDS
}

/** The fields every one of `drawings` has, in panel order. */
export function sharedFields(
  drawings: readonly Drawing[],
  isJunction: (elementId: string) => boolean,
): AppearanceField[] {
  const [first, ...rest] = drawings
  if (!first) return []
  const sets = rest.map((d) => new Set(appearanceFields(d, isJunction)))
  return appearanceFields(first, isJunction).filter((field) => sets.every((s) => s.has(field)))
}

/** A field's value, in the one spelling two equal values share: font styles in their fixed order. */
function normalised(appearance: Appearance | undefined, field: AppearanceField): unknown {
  const value = appearance?.[field]
  if (field === 'fontStyle') {
    const styles = value as FontStyle[] | undefined
    return styles?.length ? FONT_STYLES.filter((style) => styles.includes(style)) : undefined
  }
  return value
}

function sameField(a: Appearance | undefined, b: Appearance | undefined, field: AppearanceField) {
  return JSON.stringify(normalised(a, field)) === JSON.stringify(normalised(b, field))
}

/** What a set of drawings holds in one field: one value (absence included), or a mix. */
export type Shared<T> = { mixed: false; value: T | undefined } | { mixed: true }

export function sharedValue<K extends AppearanceField>(
  drawings: readonly Drawing[],
  field: K,
): Shared<Appearance[K]> {
  const [first, ...rest] = drawings
  if (rest.some((d) => !sameField(first?.appearance, d.appearance, field))) return { mixed: true }
  return { mixed: false, value: normalised(first?.appearance, field) as Appearance[K] }
}

/** Whether every drawing has `style`, none does, or some do. */
export function sharedFontStyle(drawings: readonly Drawing[], style: FontStyle): boolean | 'mixed' {
  const on = drawings.map((d) => d.appearance?.fontStyle?.includes(style) === true)
  if (on.every(Boolean)) return on.length > 0
  return on.some(Boolean) ? 'mixed' : false
}

/**
 * `appearance` with `field` set, or removed when `value` is `undefined`, and
 * `undefined` once no field is left. An empty font style list is no style.
 */
export function withField<K extends AppearanceField>(
  appearance: Appearance | undefined,
  field: K,
  value: Appearance[K] | undefined,
): Appearance | undefined {
  const next: Appearance = { ...appearance }
  const empty = value === undefined || (Array.isArray(value) && value.length === 0)
  if (empty) delete next[field]
  else
    next[field] =
      field === 'fontStyle'
        ? (normalised({ fontStyle: value as FontStyle[] }, field) as Appearance[K])
        : value
  return Object.keys(next).length ? next : undefined
}

/**
 * The drawing with `appearance`, or with no `appearance` key at all when it is
 * `undefined`. The drawing itself when nothing a field holds changes.
 */
function withAppearance<T extends Drawing>(drawing: T, appearance: Appearance | undefined): T {
  const before = drawing.appearance
  const fields = new Set([...Object.keys(before ?? {}), ...Object.keys(appearance ?? {})])
  if ([...fields].every((f) => sameField(before, appearance, f as AppearanceField))) return drawing
  const next = { ...drawing }
  if (appearance) next.appearance = appearance
  else delete next.appearance
  return next
}

/**
 * Change the appearance of every drawing in `ids`, nodes and connections
 * alike, as one new view: one command, whatever the selection holds.
 */
export function editAppearance(
  view: View,
  ids: ReadonlySet<string>,
  change: (appearance: Appearance | undefined, drawing: Drawing) => Appearance | undefined,
): View {
  let changed = false
  const edit = <T extends Drawing>(drawing: T): T => {
    if (!ids.has(drawing.id)) return drawing
    const next = withAppearance(drawing, change(drawing.appearance, drawing))
    if (next !== drawing) changed = true
    return next
  }
  const nodes = view.nodes.map(edit)
  const connections = view.connections.map(edit)
  return changed ? { ...view, nodes, connections } : view
}

/**
 * Set one field on every drawing in `ids` that has it, or clear it with
 * `undefined`: "Reset to default" removes the field rather than writing the
 * default's value.
 */
export function setAppearanceField<K extends AppearanceField>(
  view: View,
  ids: ReadonlySet<string>,
  field: K,
  value: Appearance[K] | undefined,
  isJunction: (elementId: string) => boolean,
): View {
  return editAppearance(view, ids, (appearance, drawing) =>
    appearanceFields(drawing, isJunction).includes(field)
      ? withField(appearance, field, value)
      : appearance,
  )
}

/** Turn one font style on or off on every drawing in `ids` that has a font. */
export function setFontStyle(
  view: View,
  ids: ReadonlySet<string>,
  style: FontStyle,
  on: boolean,
  isJunction: (elementId: string) => boolean,
): View {
  return editAppearance(view, ids, (appearance, drawing) => {
    if (!appearanceFields(drawing, isJunction).includes('fontStyle')) return appearance
    const styles = (appearance?.fontStyle ?? []).filter((s) => s !== style)
    return withField(appearance, 'fontStyle', on ? [...styles, style] : styles)
  })
}

/** Every override gone: each drawing in `ids` is drawn as the notation draws it. */
export function resetAppearance(view: View, ids: ReadonlySet<string>): View {
  return editAppearance(view, ids, () => undefined)
}

// ── Format painter ───────────────────────────────────────────────────────────

/**
 * What the format painter picked up: the source's overrides, as they were when
 * picked up (Archi's `FormatPainterInfo` paints from a copy, so a later edit of
 * the source does not change what it paints), and the fields the source has.
 */
export interface Format {
  appearance: Appearance | undefined
  fields: readonly AppearanceField[]
}

/** Archi paints neither from nor onto a junction (`FormatPainterTool.isPaintableObject`). */
export function canPaint(drawing: Drawing, isJunction: (elementId: string) => boolean): boolean {
  return !isJunctionDrawing(drawing, isJunction)
}

export function pickUpFormat(
  drawing: Drawing,
  isJunction: (elementId: string) => boolean,
): Format | undefined {
  if (!canPaint(drawing, isJunction)) return undefined
  return {
    // Drawings are never edited in place, so holding the source's own object is
    // holding a copy: an edit of the source after makes a new one.
    appearance: drawing.appearance,
    fields: appearanceFields(drawing, isJunction),
  }
}

/**
 * Paint `format` onto the drawing `id`: every field both have takes the
 * source's override, and a field the source does not override loses the
 * target's, so the target is drawn as the source is. A field only one of them
 * has is left alone, as Archi's painter leaves a shape's fill when it paints
 * from a line. One new view, so one command.
 */
export function paintFormat(
  view: View,
  id: string,
  format: Format,
  isJunction: (elementId: string) => boolean,
): View {
  return editAppearance(view, new Set([id]), (appearance, drawing) => {
    if (!canPaint(drawing, isJunction)) return appearance
    const theirs = new Set(appearanceFields(drawing, isJunction))
    let next = appearance
    for (const field of format.fields) {
      if (!theirs.has(field)) continue
      next = withField(next, field, format.appearance?.[field])
    }
    return next
  })
}
