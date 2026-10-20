import { memo, useSyncExternalStore } from 'react'
import type { Appearance, ElementType, LegendEntry, LegendOptions, RelationshipType } from '@/model'
import { ElementShape } from './ElementShape'
import { emptyTabWidth, labelInTab, tabbedLabel } from './label-box'
import { NotationText } from './NotationText'
import { RelationshipLine } from './RelationshipLine'
import { UI_FAMILY, getFontsVersion, measureText, quoteFamily, subscribeFonts } from './text'

/**
 * The diagram objects that are not model elements (#75): notes, visual groups,
 * view references and legends (#134). Drawn at the origin into `width` × `height`, like
 * `ElementShape`. Their default colours are the neutral tokens; an appearance
 * override wins.
 */

interface ObjectProps {
  width: number
  height: number
  appearance?: Appearance | undefined
}

const PAD = 5
const FOLD = 10

function paint(appearance: Appearance | undefined, fill: string) {
  return {
    fill: appearance?.fillColor ?? fill,
    stroke: appearance?.lineColor ?? 'var(--bd2)',
    strokeWidth: appearance?.lineWidth ?? 1,
  }
}

/** Free text in a box with a folded corner. Notes keep their line breaks. */
export const NoteShape = memo(function NoteShape({
  width: w,
  height: h,
  text,
  appearance,
}: ObjectProps & { text: string }) {
  const p = paint(appearance, 'var(--surface)')
  const fold = Math.min(FOLD, w / 3, h / 3)
  return (
    <g data-shape="note">
      <path d={`M0,0H${w}V${h - fold}L${w - fold},${h}H0Z`} {...p} />
      <path
        d={`M${w},${h - fold}H${w - fold}V${h}`}
        fill="none"
        stroke={p.stroke}
        strokeWidth={p.strokeWidth}
      />
      <NotationText
        name={text}
        box={{ x: PAD, y: PAD, w: w - PAD * 2, h: h - PAD * 2 }}
        appearance={appearance}
        defaultAlignment="left"
        defaultPosition="top"
      />
    </g>
  )
})

const TAB_PAD = 6

/** A labelled box: a tab with the name, over a body that holds what is grouped. */
export const GroupShape = memo(function GroupShape({
  width: w,
  height: h,
  name,
  appearance,
}: ObjectProps & { name: string }) {
  const p = paint(appearance, 'var(--panel)')
  const size = appearance?.fontSize ?? 12
  const tabH = Math.min(h, Math.round(size * 1.25) + 6)
  const whole = { x: TAB_PAD, y: PAD, w: w - TAB_PAD * 2, h: h - PAD * 2 }
  const inTab = labelInTab(appearance, whole)
  const tabW = inTab
    ? Math.min(w, Math.max(40, measureText(name, `${size}px ${UI_FAMILY}`) + TAB_PAD * 2 + 2))
    : emptyTabWidth(w, 'group')
  const label = tabbedLabel(
    appearance,
    inTab,
    { x: TAB_PAD, y: 0, w: tabW - TAB_PAD * 2, h: tabH },
    whole,
  )
  return (
    <g data-shape="group">
      <path d={`M0,0H${tabW}V${tabH}H0Z`} {...p} />
      <path d={`M0,${tabH}H${w}V${h}H0Z`} {...p} />
      <NotationText
        name={name}
        box={label.box}
        appearance={label.appearance}
        defaultAlignment="left"
        defaultPosition="middle"
      />
    </g>
  )
})

/**
 * A link to another view: a box with a small diagram glyph, named after the view
 * it opens. `name` is undefined when the view no longer exists.
 */
export const ViewReferenceShape = memo(function ViewReferenceShape({
  width: w,
  height: h,
  name,
  appearance,
}: ObjectProps & { name: string | undefined }) {
  const p = paint(appearance, 'var(--surface)')
  const gx = w - 22
  return (
    <g data-shape="view-ref">
      <rect width={w} height={h} {...p} />
      {/* Two small boxes joined by a line: "a diagram". */}
      <g fill="none" stroke={p.stroke} strokeWidth={1}>
        <rect x={gx} y={5} width={7} height={5} />
        <rect x={gx + 10} y={11} width={7} height={5} />
        <path d={`M${gx + 3.5},10V13.5H${gx + 10}`} />
      </g>
      <NotationText
        name={name ?? 'Missing view'}
        box={{ x: PAD, y: PAD, w: w - PAD * 2, h: h - PAD * 2 }}
        clear={{ height: 12, width: Math.max(w - PAD * 2 - 48, 1) }}
        appearance={name === undefined ? { ...appearance, fontColor: 'var(--ink3)' } : appearance}
        defaultAlignment="center"
        defaultPosition="top"
      />
    </g>
  )
})

/** Archi's legend layout (`LegendGraphics`): margins, the icon's column, the first row and the row pitch. */
const LEGEND = { left: 5, icon: 26, top: 5, row: 22 } as const
/** An entry's symbol: the palette's glyph (34 × 20) at this scale. */
const LEGEND_ICON_SCALE = 0.6

/**
 * A legend (#134): a plain box listing `entries`, each with its symbol and its
 * label, in columns of `options.rowsPerColumn`, as Archi's `LegendGraphics
 * .drawLegend` lays them out. A column starts after the widest label of the one
 * before it, plus the margins and the legend's own offset. The entries are the
 * caller's (`legendEntries`); this only draws them. With `colours` `none` the
 * symbols are drawn unfilled; `core` and `user` both take the notation's colours,
 * since Archipelago has no per-user default fill for Archi's `user` to mean.
 * What overflows the box is clipped, as Archi's figure clips it.
 */
export const LegendShape = memo(function LegendShape({
  width: w,
  height: h,
  entries,
  options,
  appearance,
}: ObjectProps & { entries: readonly LegendEntry[]; options: LegendOptions }) {
  // Column widths are measured, so they change when the web font arrives.
  useSyncExternalStore(subscribeFonts, getFontsVersion, getFontsVersion)
  const p = paint(appearance, 'var(--surface)')
  const size = appearance?.fontSize ?? 12
  const family = appearance?.fontName
    ? `${quoteFamily(appearance.fontName)}, ${UI_FAMILY}`
    : UI_FAMILY
  const font = `${size}px ${family}`
  const pitch = Math.max(Math.round(size * 1.25), LEGEND.row)
  const rows = Math.max(1, options.rowsPerColumn)
  const placed: { entry: LegendEntry; x: number; y: number }[] = []
  let x = LEGEND.left
  let widest = 0
  entries.forEach((entry, index) => {
    if (index !== 0 && index % rows === 0) {
      x += widest + LEGEND.left + LEGEND.icon + options.widthOffset
      widest = 0
    }
    widest = Math.max(widest, measureText(entry.label, font))
    placed.push({ entry, x, y: LEGEND.top + (index % rows) * pitch })
  })
  const unfilled = options.colours === 'none'
  return (
    <g data-shape="legend">
      <rect width={w} height={h} {...p} />
      <svg width={Math.max(w, 0)} height={Math.max(h, 0)} overflow="hidden">
        {placed.map(({ entry, x: at, y }) => (
          <g key={`${entry.kind} ${entry.type}`} data-legend-entry={entry.type}>
            <g transform={`translate(${at} ${y + (pitch - 20 * LEGEND_ICON_SCALE) / 2})`}>
              <LegendSymbol entry={entry} unfilled={unfilled} />
            </g>
            <text
              x={at + LEGEND.icon}
              y={y + pitch / 2}
              dominantBaseline="central"
              fontFamily={family}
              fontSize={size}
              fill={appearance?.fontColor ?? 'var(--ink)'}
            >
              {entry.label}
            </text>
          </g>
        ))}
      </svg>
    </g>
  )
})

function LegendSymbol({ entry, unfilled }: { entry: LegendEntry; unfilled: boolean }) {
  const w = 34
  const h = 20
  if (entry.kind === 'relationship') {
    return (
      <g transform={`scale(${LEGEND_ICON_SCALE})`}>
        <RelationshipLine
          type={entry.type as RelationshipType}
          points={[
            { x: 0, y: h / 2 },
            { x: w, y: h / 2 },
          ]}
        />
      </g>
    )
  }
  const type = entry.type as ElementType
  if (type === 'Junction') {
    return (
      <g transform={`translate(${(w / 2 - 6) * LEGEND_ICON_SCALE} 0) scale(${LEGEND_ICON_SCALE})`}>
        <ElementShape type="Junction" name="" width={12} height={12} />
      </g>
    )
  }
  return (
    <g transform={`scale(${LEGEND_ICON_SCALE})`}>
      <ElementShape
        type={type}
        name=""
        width={w}
        height={h}
        {...(unfilled ? { appearance: { fillColor: 'none' } } : {})}
      />
    </g>
  )
}

/** What a diagram draws for a node whose element is missing from the model. */
export const MissingShape = memo(function MissingShape({
  width: w,
  height: h,
  label,
}: ObjectProps & { label: string }) {
  return (
    <g data-shape="missing">
      <rect width={w} height={h} fill="none" stroke="var(--ink3)" strokeDasharray="4 3" />
      <NotationText
        name={label}
        box={{ x: PAD, y: PAD, w: w - PAD * 2, h: h - PAD * 2 }}
        appearance={{ fontColor: 'var(--ink3)' }}
        defaultAlignment="center"
        defaultPosition="middle"
      />
    </g>
  )
})
