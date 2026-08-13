import {
  LIFECYCLE_PHASE_LABELS,
  LIFECYCLE_PHASE_TOKENS,
  TIME_TOKENS,
  completenessToken,
  type LifecyclePhase,
  type TimeClassification,
} from '@/model'
import './meters.css'

/**
 * The small semantic display primitives shared by the inventory, fact sheet and
 * graph side panel. All of them come straight from the handoff's "Derived values":
 * four bars of heights 6/8/10/12, phase squares, TIME chips, completeness bars.
 *
 * They live together because they are the app's colour vocabulary — the pieces
 * that are *allowed* to be coloured, as opposed to chrome.
 */

export interface FitMeterProps {
  /** 1–4, or undefined for "not assessed". */
  value: number | undefined
  /** Colour of the filled bars. */
  token: string
  barWidth?: number
  label?: string
}

export function FitMeter({ value, token, barWidth = 4, label }: FitMeterProps) {
  return (
    <span className="meter" title={label} aria-label={label}>
      {[1, 2, 3, 4].map((step) => (
        <span
          key={step}
          className="meter__bar"
          style={{
            width: barWidth,
            height: 4 + step * 2,
            background: value !== undefined && step <= value ? token : 'var(--panel2)',
          }}
        />
      ))}
    </span>
  )
}

export function LifecycleDot({ phase, size = 5 }: { phase: LifecyclePhase; size?: number }) {
  return (
    <span
      className="lifecycle-dot"
      style={{ width: size, height: size, background: LIFECYCLE_PHASE_TOKENS[phase] }}
      aria-hidden="true"
    />
  )
}

export function LifecycleCell({ phase }: { phase: LifecyclePhase }) {
  return (
    <span className="lifecycle-cell">
      <LifecycleDot phase={phase} />
      {LIFECYCLE_PHASE_LABELS[phase]}
    </span>
  )
}

/** Outlined mono chip in the TIME colour — no fill, per the handoff. */
export function TimeChip({ value }: { value: TimeClassification | undefined }) {
  if (!value) return <span className="time-chip time-chip--empty">—</span>
  return (
    <span
      className="time-chip"
      style={{ color: TIME_TOKENS[value], borderColor: TIME_TOKENS[value] }}
    >
      {value}
    </span>
  )
}

export function CompletenessBar({ score, height = 2 }: { score: number; height?: number }) {
  return (
    <span className="completeness-bar" style={{ height }}>
      <span
        className="completeness-bar__fill"
        style={{ width: `${score}%`, height, background: completenessToken(score) }}
      />
    </span>
  )
}

/** The 42px SVG ring on the fact sheet header (handoff "Screen 2 — header"). */
export function CompletenessRing({ score, size = 42 }: { score: number; size?: number }) {
  const radius = 16
  const circumference = 2 * Math.PI * radius
  const centre = size / 2
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle
        cx={centre}
        cy={centre}
        r={radius}
        fill="none"
        stroke="var(--panel2)"
        strokeWidth={4}
      />
      <circle
        cx={centre}
        cy={centre}
        r={radius}
        fill="none"
        stroke={completenessToken(score)}
        strokeWidth={4}
        strokeDasharray={`${(circumference * score) / 100} ${circumference}`}
        transform={`rotate(-90 ${centre} ${centre})`}
      />
    </svg>
  )
}
