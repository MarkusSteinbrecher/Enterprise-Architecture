import { memo } from 'react'
import { type Appearance, type ElementType, type JunctionKind } from '@/model'
import { ELEMENT_NOTATION, notationColours, type Body } from './element-notation'
import { GLYPHS, type Box, type Paint } from './glyphs'
import { NotationText } from './NotationText'
import { UI_FAMILY, measureText } from './text'

/**
 * One ArchiMate 3.2 element, drawn at the origin into `width` × `height`. The
 * caller positions it (a `<g transform>`), so the same component serves the
 * read-only canvas, the editor and exported images (ADR 0006).
 *
 * Colours come from the layer ramp in `tokens.css`; an `appearance` override is
 * the user's own data and wins over the ramp.
 */

export type Figure = 'rectangle' | 'alternative'

export interface ElementShapeProps {
  type: ElementType
  name: string
  width: number
  height: number
  /** The full-size figure instead of the rectangle; ignored for types without one. */
  figure?: Figure
  junctionKind?: JunctionKind
  appearance?: Appearance
}

/** Icon box in the rectangle notation's top-right corner. */
const ICON = { w: 18, h: 13, inset: 5 }
const PAD = 5

export const ElementShape = memo(function ElementShape({
  type,
  name,
  width,
  height,
  figure = 'rectangle',
  junctionKind,
  appearance,
}: ElementShapeProps) {
  const notation = ELEMENT_NOTATION[type]
  const tokens = notationColours(type)
  const paint: Paint = {
    stroke: appearance?.lineColor ?? tokens.stroke,
    fill: appearance?.fillColor ?? tokens.fill,
    strokeWidth: appearance?.lineWidth ?? 1,
    filled: false,
  }
  const drawn: Figure =
    figure === 'alternative' && notation.alternative ? 'alternative' : 'rectangle'
  const common = { 'data-shape': type, 'data-figure': drawn } as const

  if (notation.body === 'junction') {
    const r = Math.min(width, height) / 2
    const ink = appearance?.lineColor ?? 'var(--ink)'
    return (
      <g {...common} data-junction={junctionKind ?? 'and'}>
        <circle
          cx={width / 2}
          cy={height / 2}
          r={r - paint.strokeWidth / 2}
          stroke={ink}
          strokeWidth={paint.strokeWidth}
          fill={junctionKind === 'or' ? (appearance?.fillColor ?? 'var(--surface)') : ink}
        />
      </g>
    )
  }

  if (drawn === 'alternative' && notation.glyph) {
    const glyph = GLYPHS[notation.glyph]
    const below = notation.alternative === 'below'
    // A figure with its name beneath keeps two lines of text clear at the bottom.
    const textH = below ? Math.min(height * 0.45, lineHeight(appearance) * 2 + PAD) : 0
    const figureBox: Box = { x: 1, y: 1, w: width - 2, h: height - 2 - textH }
    return (
      <g {...common}>
        {/* A transparent hit area, so the name below a figure is part of the shape. */}
        <rect width={width} height={height} fill="transparent" stroke="none" />
        {glyph(figureBox, { ...paint, filled: true })}
        <NotationText
          name={name}
          box={
            below
              ? { x: 0, y: height - textH, w: width, h: textH }
              : { x: width * 0.1, y: height * 0.12, w: width * 0.8, h: height * 0.76 }
          }
          // Inside a figure a long word may use the figure's full width before it is split.
          hardWidth={width - 2}
          appearance={appearance}
          defaultAlignment="center"
          defaultPosition={below ? 'top' : 'middle'}
        />
      </g>
    )
  }

  const icon = notation.glyph ? GLYPHS[notation.glyph] : undefined
  const iconBox: Box = { x: width - ICON.w - ICON.inset, y: ICON.inset, w: ICON.w, h: ICON.h }
  const grouping = notation.body === 'grouping'
  const tab = grouping ? groupingTab(width, name, appearance) : undefined
  const top = tab ? 0 : headerOffset(notation.body)
  const textBox: Box = tab
    ? { x: PAD, y: 0, w: tab.w - PAD * 2, h: tab.h }
    : { x: PAD, y: PAD + top, w: width - PAD * 2, h: height - PAD * 2 - top }
  // Lines beside the icon stay clear of it on both sides, so centred names stay centred.
  const clear = icon
    ? {
        height: ICON.inset + ICON.h - PAD,
        width: Math.max(textBox.w - (ICON.w + ICON.inset + 2 - PAD) * 2, 1),
      }
    : undefined
  return (
    <g {...common}>
      <BodyOutline body={notation.body} width={width} height={height} paint={paint} tab={tab} />
      {icon?.(iconBox, paint)}
      <NotationText
        name={name}
        box={textBox}
        clear={clear}
        appearance={appearance}
        defaultAlignment={grouping ? 'left' : 'center'}
        defaultPosition={grouping ? 'middle' : 'top'}
      />
    </g>
  )
})

function lineHeight(appearance?: Appearance): number {
  return Math.round((appearance?.fontSize ?? DEFAULT_FONT_SIZE) * 1.25)
}

const DEFAULT_FONT_SIZE = 12

/** The passive objects draw their name below the header band. */
function headerOffset(body: Body): number {
  return body === 'object' || body === 'contract' || body === 'product' ? HEADER : 0
}

const HEADER = 12
const RADIUS = 8
const CUT = 8
const TAB_H = 18

/** The grouping's label tab: as wide as its name, within the shape. */
function groupingTab(width: number, name: string, appearance?: Appearance) {
  const size = appearance?.fontSize ?? DEFAULT_FONT_SIZE
  const text = measureText(name, `${size}px ${UI_FAMILY}`)
  return { w: Math.min(width, Math.max(40, text + PAD * 2 + 2)), h: lineHeight(appearance) + 6 }
}

interface BodyProps {
  body: Exclude<Body, 'junction'>
  width: number
  height: number
  paint: Paint
  tab: { w: number; h: number } | undefined
}

function BodyOutline({ body, width: w, height: h, paint, tab }: BodyProps) {
  const fill = { fill: paint.fill, stroke: paint.stroke, strokeWidth: paint.strokeWidth }
  const line = { fill: 'none', stroke: paint.stroke, strokeWidth: paint.strokeWidth }
  switch (body) {
    case 'square':
      return <rect width={w} height={h} {...fill} />
    case 'rounded':
      return <rect width={w} height={h} rx={RADIUS} {...fill} />
    case 'cut':
      return (
        <path
          d={`M${CUT},0H${w - CUT}L${w},${CUT}V${h - CUT}L${w - CUT},${h}H${CUT}L0,${h - CUT}V${CUT}Z`}
          {...fill}
        />
      )
    case 'object':
      return (
        <g>
          <rect width={w} height={h} {...fill} />
          <path d={`M0,${HEADER}H${w}`} {...line} />
        </g>
      )
    case 'contract':
      return (
        <g>
          <rect width={w} height={h} {...fill} />
          <path d={`M0,${HEADER}H${w}M0,${h - HEADER}H${w}`} {...line} />
        </g>
      )
    case 'representation': {
      // A wavy bottom edge: one full wave across the width.
      const wave = Math.min(h * 0.15, 8)
      const base = h - wave
      return (
        <path
          d={`M0,0H${w}V${base}C${w * 0.75},${base - wave * 1.5} ${w * 0.25},${base + wave * 1.5} 0,${base}Z`}
          {...fill}
        />
      )
    }
    case 'product':
      return (
        <g>
          <rect width={w} height={h} {...fill} />
          <path d={`M0,${HEADER}H${w * 0.5}V0`} {...line} />
        </g>
      )
    case 'grouping': {
      const t = tab ?? { w: w * 0.5, h: TAB_H }
      return (
        <g strokeDasharray="6 3">
          <path d={`M0,0H${t.w}V${t.h}H0Z`} {...fill} />
          <path d={`M0,${t.h}H${w}V${h}H0Z`} {...fill} />
        </g>
      )
    }
  }
}
