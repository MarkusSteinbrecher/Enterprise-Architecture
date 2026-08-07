import {
  LIFECYCLE_PHASES,
  LIFECYCLE_PHASE_LABELS,
  type LifecycleDates,
  type LifecyclePhase,
} from './profile'

/**
 * Lifecycle derivation (UI spec §3.1, ADR UI-3).
 *
 * There is no stored `lifecycle` field. Each date in `LifecycleDates` is the date
 * its phase *starts*, and the phase at a time point is the last phase whose start
 * has been reached:
 *
 *     t < phaseIn  → Plan        t < active → Phase In      t < phaseOut → Active
 *     t < endOfLife → Phase Out                             otherwise    → End of Life
 *
 * Deriving rather than storing is what makes the time dimension free: the
 * inventory evaluates at today, the graph at its slider year, the roadmap reads
 * the same dates, and nothing can drift out of sync.
 *
 * Partial lifecycles are handled by the same rule: phases whose start date is
 * missing are skipped, and a time point before every known start resolves to the
 * phase preceding the earliest one. With all four boundary dates present this is
 * exactly the rule in the UI spec — `deriveLifecyclePhase` and the spec's
 * four-comparison form agree on every input, which `lifecycle.test.ts` pins down.
 *
 * Elements with no dates at all are treated as Active and render `—` for every
 * phase date (capabilities, actors, data objects, goals).
 */

/** Parse an ISO `YYYY-MM-DD` (or full ISO timestamp) into epoch ms; NaN when unusable. */
export function parseLifecycleDate(value: string | undefined): number {
  if (!value) return Number.NaN
  const ms = Date.parse(value)
  return Number.isNaN(ms) ? Number.NaN : ms
}

/** Does this element carry any lifecycle date at all? */
export function hasLifecycle(dates: LifecycleDates | undefined): boolean {
  if (!dates) return false
  return LIFECYCLE_PHASES.some((phase) => !Number.isNaN(parseLifecycleDate(dates[phase])))
}

/**
 * The phase at `at` (epoch ms, defaults to now).
 * Returns `'active'` for elements without lifecycle dates.
 */
export function deriveLifecyclePhase(
  dates: LifecycleDates | undefined,
  at: number = Date.now(),
): LifecyclePhase {
  if (!dates) return 'active'

  let started: LifecyclePhase | undefined
  let earliestKnown: LifecyclePhase | undefined

  for (const phase of LIFECYCLE_PHASES) {
    const ms = parseLifecycleDate(dates[phase])
    if (Number.isNaN(ms)) continue
    if (earliestKnown === undefined) earliestKnown = phase
    if (ms <= at) started = phase
  }

  if (started) return started
  if (earliestKnown) return previousPhase(earliestKnown)
  return 'active'
}

/** The phase before `phase`; Plan is its own predecessor. */
export function previousPhase(phase: LifecyclePhase): LifecyclePhase {
  const index = LIFECYCLE_PHASES.indexOf(phase)
  return LIFECYCLE_PHASES[Math.max(0, index - 1)] ?? 'plan'
}

export function lifecyclePhaseLabel(phase: LifecyclePhase): string {
  return LIFECYCLE_PHASE_LABELS[phase]
}

/** Has this element passed its end-of-life date at `at`? Drives the graph's dashed nodes. */
export function isPastEndOfLife(dates: LifecycleDates | undefined, at: number): boolean {
  const eol = parseLifecycleDate(dates?.endOfLife)
  return !Number.isNaN(eol) && eol <= at
}

/** Midnight UTC on 1 January of `year` — the graph's time slider works in years. */
export function startOfYear(year: number): number {
  return Date.UTC(year, 0, 1)
}

/** Formats a phase date the way the fact sheet prints it: `01 Jan 2027`, or `—`. */
export function formatLifecycleDate(value: string | undefined): string {
  const ms = parseLifecycleDate(value)
  if (Number.isNaN(ms)) return '—'
  const date = new Date(ms)
  const day = String(date.getUTCDate()).padStart(2, '0')
  const month = MONTHS[date.getUTCMonth()] ?? ''
  return `${day} ${month} ${date.getUTCFullYear()}`
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

/**
 * The span of years covered by a set of lifecycle dates — the min/max for the
 * graph's time-point slider. Returns `undefined` when nothing is dated.
 */
export function lifecycleYearRange(
  all: Iterable<LifecycleDates | undefined>,
): { min: number; max: number } | undefined {
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY
  for (const dates of all) {
    if (!dates) continue
    for (const phase of LIFECYCLE_PHASES) {
      const ms = parseLifecycleDate(dates[phase])
      if (Number.isNaN(ms)) continue
      const year = new Date(ms).getUTCFullYear()
      if (year < min) min = year
      if (year > max) max = year
    }
  }
  return Number.isFinite(min) && Number.isFinite(max) ? { min, max } : undefined
}
