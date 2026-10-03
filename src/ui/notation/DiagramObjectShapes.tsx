import { memo } from 'react'
import type { Appearance } from '@/model'
import { NotationText } from './NotationText'
import { UI_FAMILY, measureText } from './text'

/**
 * The diagram objects that are not model elements (#75): notes, visual groups
 * and view references. Drawn at the origin into `width` × `height`, like
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
  const tabW = Math.min(
    w,
    Math.max(40, measureText(name, `${size}px ${UI_FAMILY}`) + TAB_PAD * 2 + 2),
  )
  return (
    <g data-shape="group">
      <path d={`M0,0H${tabW}V${tabH}H0Z`} {...p} />
      <path d={`M0,${tabH}H${w}V${h}H0Z`} {...p} />
      <NotationText
        name={name}
        box={{ x: TAB_PAD, y: 0, w: tabW - TAB_PAD * 2, h: tabH }}
        appearance={appearance}
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
