import { useState, type ReactNode } from 'react'
import type { Alignment, Axis, Dimension, ZOrder } from './arrange'
import { GRID_MAX, GRID_MIN, isGridSize, type GridPreferences } from './grid-preferences'

/**
 * The editor's layout aids (#136): the grid and snapping, align, distribute,
 * match size and drawing order. Archi's names, from its editor and GEF's
 * messages. A button stays focusable when its action does not apply
 * (`aria-disabled`, not `disabled`): its own action can be what makes it stop
 * applying (bring to front, then the shape is at the front), and a disabled
 * button would drop focus to `<body>`. A press on one changes nothing, because
 * an action that does not apply returns the view as it was, and the store
 * records nothing for that.
 */

export type ArrangeAction =
  | { kind: 'align'; alignment: Alignment }
  | { kind: 'distribute'; axis: Axis }
  | { kind: 'match'; dimension: Dimension }
  | { kind: 'order'; order: ZOrder }

interface Tool {
  action: ArrangeAction
  label: string
  icon: ReactNode
}

const box = (x: number, y: number, w: number, h: number, filled = false) => (
  <rect x={x} y={y} width={w} height={h} className={filled ? 'view-tool__fill' : undefined} />
)
const rule = (x1: number, y1: number, x2: number, y2: number) => (
  <line x1={x1} y1={y1} x2={x2} y2={y2} />
)

const ALIGN: Tool[] = [
  {
    action: { kind: 'align', alignment: 'left' },
    label: 'Align Left',
    icon: (
      <>
        {rule(2.5, 1, 2.5, 15)}
        {box(4.5, 3.5, 9, 3)}
        {box(4.5, 9.5, 5, 3)}
      </>
    ),
  },
  {
    action: { kind: 'align', alignment: 'centre' },
    label: 'Align Center',
    icon: (
      <>
        {rule(8, 1, 8, 15)}
        {box(3.5, 3.5, 9, 3)}
        {box(5.5, 9.5, 5, 3)}
      </>
    ),
  },
  {
    action: { kind: 'align', alignment: 'right' },
    label: 'Align Right',
    icon: (
      <>
        {rule(13.5, 1, 13.5, 15)}
        {box(2.5, 3.5, 9, 3)}
        {box(6.5, 9.5, 5, 3)}
      </>
    ),
  },
  {
    action: { kind: 'align', alignment: 'top' },
    label: 'Align Top',
    icon: (
      <>
        {rule(1, 2.5, 15, 2.5)}
        {box(3.5, 4.5, 3, 9)}
        {box(9.5, 4.5, 3, 5)}
      </>
    ),
  },
  {
    action: { kind: 'align', alignment: 'middle' },
    label: 'Align Middle',
    icon: (
      <>
        {rule(1, 8, 15, 8)}
        {box(3.5, 3.5, 3, 9)}
        {box(9.5, 5.5, 3, 5)}
      </>
    ),
  },
  {
    action: { kind: 'align', alignment: 'bottom' },
    label: 'Align Bottom',
    icon: (
      <>
        {rule(1, 13.5, 15, 13.5)}
        {box(3.5, 2.5, 3, 9)}
        {box(9.5, 6.5, 3, 5)}
      </>
    ),
  },
]

const DISTRIBUTE: Tool[] = [
  {
    action: { kind: 'distribute', axis: 'horizontal' },
    label: 'Distribute Horizontally',
    icon: (
      <>
        {box(1.5, 4.5, 3, 7)}
        {box(6.5, 4.5, 3, 7)}
        {box(11.5, 4.5, 3, 7)}
      </>
    ),
  },
  {
    action: { kind: 'distribute', axis: 'vertical' },
    label: 'Distribute Vertically',
    icon: (
      <>
        {box(4.5, 1.5, 7, 3)}
        {box(4.5, 6.5, 7, 3)}
        {box(4.5, 11.5, 7, 3)}
      </>
    ),
  },
]

const MATCH: Tool[] = [
  {
    action: { kind: 'match', dimension: 'width' },
    label: 'Match Width',
    icon: (
      <>
        {box(3.5, 2.5, 9, 4)}
        {box(3.5, 9.5, 9, 4, true)}
      </>
    ),
  },
  {
    action: { kind: 'match', dimension: 'height' },
    label: 'Match Height',
    icon: (
      <>
        {box(2.5, 3.5, 4, 9)}
        {box(9.5, 3.5, 4, 9, true)}
      </>
    ),
  },
]

const ORDER: Tool[] = [
  {
    action: { kind: 'order', order: 'front' },
    label: 'Bring To Front',
    icon: (
      <>
        {box(1.5, 1.5, 8, 8)}
        {box(6.5, 6.5, 8, 8, true)}
      </>
    ),
  },
  {
    action: { kind: 'order', order: 'forward' },
    label: 'Bring Forward',
    icon: (
      <>
        {box(1.5, 1.5, 8, 8)}
        {box(6.5, 6.5, 8, 8, true)}
        {rule(11, 1, 11, 4)}
      </>
    ),
  },
  {
    action: { kind: 'order', order: 'backward' },
    label: 'Send Backward',
    icon: (
      <>
        {box(1.5, 1.5, 8, 8, true)}
        {box(6.5, 6.5, 8, 8)}
        {rule(11, 1, 11, 4)}
      </>
    ),
  },
  {
    action: { kind: 'order', order: 'back' },
    label: 'Send To Back',
    icon: (
      <>
        {box(1.5, 1.5, 8, 8, true)}
        {box(6.5, 6.5, 8, 8)}
      </>
    ),
  },
]

export function ArrangeBar({
  grid,
  onGrid,
  applies,
  onArrange,
}: {
  grid: GridPreferences
  onGrid: (change: Partial<GridPreferences>) => void
  /** Whether an action would change anything for the current selection. */
  applies: (action: ArrangeAction) => boolean
  onArrange: (action: ArrangeAction) => void
}) {
  const group = (label: string, tools: Tool[]) => (
    <div className="view-tools__group" role="group" aria-label={label}>
      {tools.map((tool) => {
        const on = applies(tool.action)
        return (
          <button
            key={tool.label}
            type="button"
            className="view-tool"
            aria-label={tool.label}
            title={tool.label}
            aria-disabled={!on}
            onClick={() => onArrange(tool.action)}
          >
            <svg viewBox="0 0 16 16" width={16} height={16} aria-hidden="true">
              {tool.icon}
            </svg>
          </button>
        )
      })}
    </div>
  )
  // A short label on the button, Archi's name as its accessible name and tooltip.
  const toggle = (shown: string, name: string, key: 'visible' | 'snap' | 'guides') => (
    <button
      type="button"
      className="view-toggle"
      aria-label={name}
      title={name}
      aria-pressed={grid[key]}
      onClick={() => onGrid({ [key]: !grid[key] })}
    >
      {shown}
    </button>
  )
  return (
    <div className="view-tools">
      <div className="view-tools__group" role="group" aria-label="Grid">
        {toggle('Grid', 'Grid Visible', 'visible')}
        {toggle('Snap', 'Snap to Grid', 'snap')}
        <GridSize size={grid.size} onSize={(size) => onGrid({ size })} />
        {toggle('Guides', 'Snap to Alignment Guides', 'guides')}
      </div>
      <span className="view-screen__divider" />
      {group('Align', ALIGN)}
      <span className="view-screen__divider" />
      {group('Distribute', DISTRIBUTE)}
      <span className="view-screen__divider" />
      {group('Match size', MATCH)}
      <span className="view-screen__divider" />
      {group('Order', ORDER)}
    </div>
  )
}

/**
 * The grid size, typed. What is typed is held as text, so a size can pass
 * through values the guard refuses on the way to one it takes ("1" on the way
 * to "12"); only a size in Archi's range reaches the preference, and leaving
 * the field shows the size in force again.
 */
function GridSize({ size, onSize }: { size: number; onSize: (size: number) => void }) {
  const [draft, setDraft] = useState(String(size))
  return (
    <label className="view-tools__size">
      <span className="view-screen__viewpoint-label">Size</span>
      <input
        className="view-screen__select view-tools__size-input"
        type="number"
        min={GRID_MIN}
        max={GRID_MAX}
        aria-label="Grid size"
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value)
          // Through the guard (CLAUDE.md): an empty field is `Number('')`, 0, which it refuses.
          const value = Number(event.target.value)
          if (isGridSize(value)) onSize(value)
        }}
        onBlur={() => setDraft(String(size))}
      />
    </label>
  )
}
