import type { ElementType } from './element-types'

/**
 * The portfolio profile — LeanIX-style assessment fields layered over the
 * ArchiMate core (concept §4.2). Profiles serialise as ArchiMate properties, so
 * a model that carries them still round-trips through the exchange format.
 *
 * The four ordinal scales are stored as 1–4 so meters and sorting are trivial;
 * the labels come from the design handoff and are the only strings the UI shows.
 * TIME is categorical, not ordinal — its index is display order, never a score.
 */

export const LIFECYCLE_PHASES = ['plan', 'phaseIn', 'active', 'phaseOut', 'endOfLife'] as const
export type LifecyclePhase = (typeof LIFECYCLE_PHASES)[number]

export const LIFECYCLE_PHASE_LABELS: Record<LifecyclePhase, string> = {
  plan: 'Plan',
  phaseIn: 'Phase In',
  active: 'Active',
  phaseOut: 'Phase Out',
  endOfLife: 'End of Life',
}

/** CSS custom property carrying each phase colour (handoff "Lifecycle phase colours"). */
export const LIFECYCLE_PHASE_TOKENS: Record<LifecyclePhase, string> = {
  plan: 'var(--lc-plan)',
  phaseIn: 'var(--lc-in)',
  active: 'var(--lc-act)',
  phaseOut: 'var(--lc-out)',
  endOfLife: 'var(--lc-eol)',
}

/**
 * The date each phase *starts*, as an ISO `YYYY-MM-DD` string.
 * Every field is optional: most element types carry no lifecycle at all, and
 * partially-filled lifecycles are normal in a real inventory.
 */
export type LifecycleDates = Partial<Record<LifecyclePhase, string>>

export const FUNCTIONAL_FIT_LABELS = [
  'Insufficient',
  'Unreasonable',
  'Appropriate',
  'Perfect',
] as const

export const TECHNICAL_FIT_LABELS = [
  'Inadequate',
  'Unreasonable',
  'Adequate',
  'Fully adequate',
] as const

export const BUSINESS_CRITICALITY_LABELS = ['Low', 'Medium', 'High', 'Critical'] as const

/** 1–4, low to high. */
export type FitLevel = 1 | 2 | 3 | 4
export type CriticalityLevel = 1 | 2 | 3 | 4

export const TIME_CLASSIFICATIONS = ['Tolerate', 'Invest', 'Migrate', 'Eliminate'] as const
export type TimeClassification = (typeof TIME_CLASSIFICATIONS)[number]

export const TIME_TOKENS: Record<TimeClassification, string> = {
  Tolerate: 'var(--t-tol)',
  Invest: 'var(--t-inv)',
  Migrate: 'var(--t-mig)',
  Eliminate: 'var(--t-eli)',
}

export interface PortfolioProfile {
  lifecycle?: LifecycleDates
  functionalFit?: FitLevel
  technicalFit?: FitLevel
  businessCriticality?: CriticalityLevel
  timeClassification?: TimeClassification
  tags?: string[]
}

export function functionalFitLabel(level: FitLevel | undefined): string {
  return level ? (FUNCTIONAL_FIT_LABELS[level - 1] ?? 'Not assessed') : 'Not assessed'
}

export function technicalFitLabel(level: FitLevel | undefined): string {
  return level ? (TECHNICAL_FIT_LABELS[level - 1] ?? 'Not assessed') : 'Not assessed'
}

export function criticalityLabel(level: CriticalityLevel | undefined): string {
  return level ? (BUSINESS_CRITICALITY_LABELS[level - 1] ?? 'Not assessed') : 'Not assessed'
}

/**
 * Display index of a TIME class, 1–4. The handoff renders it as a meter, but the
 * scale is categorical: the index is ordering, not magnitude.
 */
export function timeIndex(value: TimeClassification | undefined): number {
  return value ? TIME_CLASSIFICATIONS.indexOf(value) + 1 : 0
}

export function isFitLevel(value: unknown): value is FitLevel {
  return value === 1 || value === 2 || value === 3 || value === 4
}

export function isTimeClassification(value: unknown): value is TimeClassification {
  return typeof value === 'string' && (TIME_CLASSIFICATIONS as readonly string[]).includes(value)
}

/**
 * Element types that carry a portfolio profile by default (concept §4.2:
 * "applied to Application Component by default; configurable per type later").
 * Types outside this set render "Not assessed" and are not scored on profile
 * fields — a Capability must not look incomplete for lacking a technical fit.
 */
export const PROFILED_TYPES: readonly ElementType[] = [
  'ApplicationComponent',
  'SystemSoftware',
  'Node',
  'Device',
  'TechnologyService',
  'ApplicationService',
]

export function carriesProfile(type: ElementType): boolean {
  return PROFILED_TYPES.includes(type)
}
