import { LIFECYCLE_PHASES, carriesProfile } from './profile'
import type { Element } from './workspace'

/**
 * Completeness scoring (issue #3; UI spec open question 4, resolved here).
 *
 * **The rule.** Completeness is the weighted fraction of the fields that are
 * *expected* of an element, expressed as a percentage. Which fields are expected
 * depends on the element type: every element is expected to carry documentation,
 * an owner, at least one relationship and at least one tag; only element types
 * that carry a portfolio profile (`PROFILED_TYPES`) are additionally scored on
 * lifecycle dates and the four assessment fields.
 *
 * That distinction is the point. A Capability with no technical fit is not an
 * incomplete capability — asking it for one would make every non-application
 * element look neglected and make model health meaningless. The lifecycle
 * criterion scores partially: an element with three of five phase dates gets
 * three fifths of that weight, because half-filled lifecycles are the normal
 * state of a real inventory rather than an error.
 *
 * Weights live in `COMPLETENESS_CONFIG` and nowhere else. Colour thresholds are
 * ≥75 green / ≥50 amber / else red (handoff, "Derived values").
 */

export interface CompletenessWeights {
  documentation: number
  owner: number
  relations: number
  tags: number
  /** Scored as the fraction of the five phase dates that are set. */
  lifecycle: number
  functionalFit: number
  technicalFit: number
  businessCriticality: number
  timeClassification: number
}

export interface CompletenessConfig {
  weights: CompletenessWeights
  /** Property key holding the owner (also drives "n elements missing an owner"). */
  ownerProperty: string
  /** Percentage at or above which completeness reads as healthy. */
  goodThreshold: number
  /** Percentage at or above which completeness reads as partial. */
  fairThreshold: number
}

export const COMPLETENESS_CONFIG: CompletenessConfig = {
  weights: {
    documentation: 2,
    owner: 1,
    relations: 2,
    tags: 1,
    lifecycle: 3,
    functionalFit: 1,
    technicalFit: 1,
    businessCriticality: 1,
    timeClassification: 1,
  },
  ownerProperty: 'owner',
  goodThreshold: 75,
  fairThreshold: 50,
}

export interface CompletenessCriterion {
  key: keyof CompletenessWeights
  label: string
  weight: number
  /** 0–1; fractional only for the lifecycle criterion. */
  filled: number
}

export interface CompletenessDetail {
  /** 0–100, rounded. */
  score: number
  criteria: CompletenessCriterion[]
  /** Criteria that scored nothing — what the fact sheet would prompt for. */
  missing: CompletenessCriterion[]
}

export interface CompletenessContext {
  /** How many relationships touch this element, in either direction. */
  relationCount: number
  config?: CompletenessConfig
}

function filled(value: unknown): number {
  if (value === undefined || value === null) return 0
  if (typeof value === 'string') return value.trim() ? 1 : 0
  if (Array.isArray(value)) return value.length > 0 ? 1 : 0
  return 1
}

/** Full breakdown — used by the fact sheet and by the tests. */
export function completenessDetail(
  element: Element,
  { relationCount, config = COMPLETENESS_CONFIG }: CompletenessContext,
): CompletenessDetail {
  const w = config.weights
  const profile = element.profile
  const criteria: CompletenessCriterion[] = [
    {
      key: 'documentation',
      label: 'Documentation',
      weight: w.documentation,
      filled: filled(element.documentation),
    },
    {
      key: 'owner',
      label: 'Owner',
      weight: w.owner,
      filled: filled(element.properties[config.ownerProperty]),
    },
    {
      key: 'relations',
      label: 'At least one relation',
      weight: w.relations,
      filled: relationCount > 0 ? 1 : 0,
    },
    { key: 'tags', label: 'Tags', weight: w.tags, filled: filled(profile?.tags) },
  ]

  if (carriesProfile(element.type)) {
    const dates = profile?.lifecycle
    const set = dates ? LIFECYCLE_PHASES.filter((phase) => filled(dates[phase])).length : 0
    criteria.push(
      {
        key: 'lifecycle',
        label: 'Lifecycle dates',
        weight: w.lifecycle,
        filled: set / LIFECYCLE_PHASES.length,
      },
      {
        key: 'functionalFit',
        label: 'Functional fit',
        weight: w.functionalFit,
        filled: filled(profile?.functionalFit),
      },
      {
        key: 'technicalFit',
        label: 'Technical fit',
        weight: w.technicalFit,
        filled: filled(profile?.technicalFit),
      },
      {
        key: 'businessCriticality',
        label: 'Business criticality',
        weight: w.businessCriticality,
        filled: filled(profile?.businessCriticality),
      },
      {
        key: 'timeClassification',
        label: 'TIME classification',
        weight: w.timeClassification,
        filled: filled(profile?.timeClassification),
      },
    )
  }

  const total = criteria.reduce((sum, c) => sum + c.weight, 0)
  const earned = criteria.reduce((sum, c) => sum + c.weight * c.filled, 0)

  return {
    score: total === 0 ? 100 : Math.round((earned / total) * 100),
    criteria,
    missing: criteria.filter((c) => c.filled === 0),
  }
}

/** 0–100, rounded. */
export function completenessScore(element: Element, context: CompletenessContext): number {
  return completenessDetail(element, context).score
}

/** Token for the completeness colour ramp: ≥75 green, ≥50 amber, else red. */
export function completenessToken(
  score: number,
  config: CompletenessConfig = COMPLETENESS_CONFIG,
): string {
  if (score >= config.goodThreshold) return 'var(--lc-act)'
  if (score >= config.fairThreshold) return 'var(--lc-out)'
  return 'var(--lc-eol)'
}

/** Mean element completeness, rounded — the nav footer's "model health". */
export function modelHealth(scores: Iterable<number>): number {
  let sum = 0
  let count = 0
  for (const score of scores) {
    sum += score
    count += 1
  }
  return count === 0 ? 0 : Math.round(sum / count)
}
