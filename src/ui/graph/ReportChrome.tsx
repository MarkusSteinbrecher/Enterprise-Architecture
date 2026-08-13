import type { ReactNode } from 'react'
import type { LegendEntry } from './colouring'

/**
 * The shared report chrome (UI spec §3.4).
 *
 * Established here on the dependency graph and reused verbatim by the five
 * phase-2 reports (#12): title with a live stats line, a colour-view segmented
 * control, the time-point slider with its TODAY reset, a legend regenerated from
 * the active view, and an export button. Only the canvas below it varies.
 *
 * Keeping this a presentational component with no knowledge of graphs is the
 * whole point — a matrix and a roadmap will pass different `options` and a
 * different legend and get the identical bar.
 */

export interface ReportChromeProps {
  title: string
  /** Mono sub-line: "21 nodes · 36 relations · time point 2026". */
  stats: string
  colourViews: { key: string; label: string }[]
  activeColourView: string
  onColourViewChange: (key: string) => void
  timePoint: { value: number; min: number; max: number; today: number }
  onTimePointChange: (year: number) => void
  legend: LegendEntry[]
  onExport: () => void
  /**
   * Why Export is unavailable, if it is. A blank SVG headed with the model's own
   * counts is a worse outcome than no file, so the reason is shown rather than
   * the button silently doing nothing.
   */
  exportDisabledReason?: string | undefined
  /** Extra controls between the segmented control and the export button. */
  children?: ReactNode
}

export function ReportChrome({
  title,
  stats,
  colourViews,
  activeColourView,
  onColourViewChange,
  timePoint,
  onTimePointChange,
  legend,
  onExport,
  exportDisabledReason,
  children,
}: ReportChromeProps) {
  return (
    <div className="chrome">
      <div className="chrome__row">
        <div>
          <h1 className="chrome__title">{title}</h1>
          <p className="chrome__stats">{stats}</p>
        </div>

        <div className="chrome__controls">
          <span className="section-label">Colour</span>
          <div className="segmented" role="group" aria-label="Colour view">
            {colourViews.map((view) => (
              <button
                key={view.key}
                type="button"
                className={`segmented__option${view.key === activeColourView ? ' segmented__option--active' : ''}`}
                aria-pressed={view.key === activeColourView}
                onClick={() => onColourViewChange(view.key)}
              >
                {view.label.toUpperCase()}
              </button>
            ))}
          </div>
          {children}
          <button
            type="button"
            className="button"
            onClick={onExport}
            disabled={Boolean(exportDisabledReason)}
            title={exportDisabledReason}
          >
            Export SVG
          </button>
        </div>
      </div>

      <div className="chrome__row chrome__row--second">
        <span className="section-label">Time point</span>
        <input
          className="chrome__slider"
          type="range"
          min={timePoint.min}
          max={timePoint.max}
          step={1}
          value={timePoint.value}
          aria-label="Time point"
          onChange={(event) => onTimePointChange(Number(event.target.value))}
        />
        <span className="chrome__year">{timePoint.value}</span>
        <button
          type="button"
          className="chrome__today"
          onClick={() => onTimePointChange(timePoint.today)}
        >
          TODAY
        </button>

        <span className="chrome__divider" aria-hidden="true" />

        <div className="chrome__legend">
          {legend.map((entry) => (
            <span key={entry.key} className="chrome__legend-entry">
              <span
                className="chrome__swatch"
                style={{ borderColor: entry.stroke, background: entry.fill }}
                aria-hidden="true"
              />
              {entry.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
