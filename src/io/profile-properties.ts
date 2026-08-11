import {
  LIFECYCLE_PHASES,
  isFitLevel,
  isTimeClassification,
  type LifecycleDates,
  type LifecyclePhase,
  type PortfolioProfile,
  type PropertyValue,
  type RelationshipProfile,
} from '@/model'

/**
 * The portfolio profile as ArchiMate properties.
 *
 * Concept §4.1: "profiles serialise as ArchiMate properties" — that is what keeps
 * a model with LeanIX-style assessments exchangeable with Archi and every other
 * certified tool. A tool that does not know Archipelago sees a handful of extra
 * key/value pairs and round-trips them untouched; we read them back into typed
 * fields on import.
 *
 * Keys are namespaced so they cannot collide with an architect's own properties,
 * and the namespace is the only place these strings appear.
 */

export const PROFILE_NAMESPACE = 'archipelago'

const LIFECYCLE_KEYS: Record<LifecyclePhase, string> = {
  plan: `${PROFILE_NAMESPACE}.lifecycle.plan`,
  phaseIn: `${PROFILE_NAMESPACE}.lifecycle.phaseIn`,
  active: `${PROFILE_NAMESPACE}.lifecycle.active`,
  phaseOut: `${PROFILE_NAMESPACE}.lifecycle.phaseOut`,
  endOfLife: `${PROFILE_NAMESPACE}.lifecycle.endOfLife`,
}

const FUNCTIONAL_FIT_KEY = `${PROFILE_NAMESPACE}.functionalFit`
const TECHNICAL_FIT_KEY = `${PROFILE_NAMESPACE}.technicalFit`
const CRITICALITY_KEY = `${PROFILE_NAMESPACE}.businessCriticality`
const TIME_KEY = `${PROFILE_NAMESPACE}.timeClassification`
const TAGS_KEY = `${PROFILE_NAMESPACE}.tags`

const ANNUAL_COST_KEY = `${PROFILE_NAMESPACE}.annualCost`
const CURRENCY_KEY = `${PROFILE_NAMESPACE}.currency`
const SUPPORT_TYPE_KEY = `${PROFILE_NAMESPACE}.supportType`
const VALID_FROM_KEY = `${PROFILE_NAMESPACE}.validFrom`
const VALID_TO_KEY = `${PROFILE_NAMESPACE}.validTo`

/** Every key this module owns — used to strip them back out on import. */
export const PROFILE_KEYS: readonly string[] = [
  ...Object.values(LIFECYCLE_KEYS),
  FUNCTIONAL_FIT_KEY,
  TECHNICAL_FIT_KEY,
  CRITICALITY_KEY,
  TIME_KEY,
  TAGS_KEY,
  ANNUAL_COST_KEY,
  CURRENCY_KEY,
  SUPPORT_TYPE_KEY,
  VALID_FROM_KEY,
  VALID_TO_KEY,
]

const OWNED_KEYS = new Set(PROFILE_KEYS)

/**
 * Is this one of the keys this module reads back into a typed profile field?
 *
 * Membership, not prefix: an `archipelago.*` key this build does not know is
 * somebody's data, and stripping the whole namespace deleted it (#36).
 */
export function isProfileKey(key: string): boolean {
  return OWNED_KEYS.has(key)
}

/** Flatten a portfolio profile into exchangeable string properties. */
export function profileToProperties(profile: PortfolioProfile | undefined): Record<string, string> {
  if (!profile) return {}
  const out: Record<string, string> = {}
  for (const phase of LIFECYCLE_PHASES) {
    const value = profile.lifecycle?.[phase]
    if (value) out[LIFECYCLE_KEYS[phase]] = value
  }
  if (profile.functionalFit) out[FUNCTIONAL_FIT_KEY] = String(profile.functionalFit)
  if (profile.technicalFit) out[TECHNICAL_FIT_KEY] = String(profile.technicalFit)
  if (profile.businessCriticality) out[CRITICALITY_KEY] = String(profile.businessCriticality)
  if (profile.timeClassification) out[TIME_KEY] = profile.timeClassification
  if (profile.tags?.length) out[TAGS_KEY] = encodeTags(profile.tags)
  return out
}

/**
 * Tags travel as one property value. The readable form is a comma-separated
 * list — that is what an architect sees in Archi's property sheet — but a tag
 * containing a comma (or leading padding) does not survive a naive split, so
 * such a list is written as a JSON array instead. `decodeTags` accepts both, and
 * the choice is a pure function of the tags, so the bytes stay deterministic.
 */
function encodeTags(tags: readonly string[]): string {
  const splittable = tags.every((tag) => tag === tag.trim() && tag !== '' && !tag.includes(','))
  return splittable ? tags.join(', ') : JSON.stringify(tags)
}

function decodeTags(value: string): string[] {
  if (value.trim().startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(value)
      if (Array.isArray(parsed) && parsed.every((tag) => typeof tag === 'string')) {
        return (parsed as string[]).filter(Boolean)
      }
    } catch {
      // Not JSON after all — a tag that merely starts with "[". Read it as a list.
    }
  }
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

/** Read a portfolio profile back out of properties; `undefined` when there is none. */
export function profileFromProperties(
  properties: Record<string, PropertyValue>,
): PortfolioProfile | undefined {
  const profile: PortfolioProfile = {}
  const lifecycle: LifecycleDates = {}

  for (const phase of LIFECYCLE_PHASES) {
    const value = properties[LIFECYCLE_KEYS[phase]]
    if (typeof value === 'string' && value.trim()) lifecycle[phase] = value.trim()
  }
  if (Object.keys(lifecycle).length) profile.lifecycle = lifecycle

  const functionalFit = toLevel(properties[FUNCTIONAL_FIT_KEY])
  if (functionalFit) profile.functionalFit = functionalFit
  const technicalFit = toLevel(properties[TECHNICAL_FIT_KEY])
  if (technicalFit) profile.technicalFit = technicalFit
  const criticality = toLevel(properties[CRITICALITY_KEY])
  if (criticality) profile.businessCriticality = criticality

  const time = properties[TIME_KEY]
  if (isTimeClassification(time)) profile.timeClassification = time

  const tags = properties[TAGS_KEY]
  if (typeof tags === 'string' && tags.trim()) {
    const decoded = decodeTags(tags)
    if (decoded.length) profile.tags = decoded
  }

  return Object.keys(profile).length ? profile : undefined
}

export function relationshipProfileToProperties(
  profile: RelationshipProfile | undefined,
): Record<string, string> {
  if (!profile) return {}
  const out: Record<string, string> = {}
  if (profile.annualCost !== undefined) out[ANNUAL_COST_KEY] = String(profile.annualCost)
  if (profile.currency) out[CURRENCY_KEY] = profile.currency
  if (profile.supportType) out[SUPPORT_TYPE_KEY] = profile.supportType
  if (profile.validFrom) out[VALID_FROM_KEY] = profile.validFrom
  if (profile.validTo) out[VALID_TO_KEY] = profile.validTo
  // accessType is a native attribute of the Access relationship, not a property.
  return out
}

export function relationshipProfileFromProperties(
  properties: Record<string, PropertyValue>,
): RelationshipProfile | undefined {
  const profile: RelationshipProfile = {}
  const rawCost = properties[ANNUAL_COST_KEY]
  // Number('') is 0 — an empty value must stay "no cost data", not become €0.
  const hasCost =
    typeof rawCost === 'number' || (typeof rawCost === 'string' && rawCost.trim() !== '')
  const cost = Number(rawCost)
  if (hasCost && Number.isFinite(cost)) {
    profile.annualCost = cost
  }
  const currency = properties[CURRENCY_KEY]
  if (typeof currency === 'string' && currency) profile.currency = currency
  const supportType = properties[SUPPORT_TYPE_KEY]
  if (typeof supportType === 'string' && supportType) profile.supportType = supportType
  const validFrom = properties[VALID_FROM_KEY]
  if (typeof validFrom === 'string' && validFrom) profile.validFrom = validFrom
  const validTo = properties[VALID_TO_KEY]
  if (typeof validTo === 'string' && validTo) profile.validTo = validTo
  return Object.keys(profile).length ? profile : undefined
}

/**
 * Properties minus the keys this module reads back into typed fields.
 *
 * Stripping by *key* rather than by namespace prefix is deliberate: a key this
 * build does not know — one written by a newer version, or by an architect who
 * borrowed the prefix — has to survive as an ordinary property. Stripping the
 * whole prefix deleted it (#36).
 */
export function stripProfileKeys(
  properties: Record<string, PropertyValue>,
): Record<string, PropertyValue> {
  const out: Record<string, PropertyValue> = {}
  for (const [key, value] of Object.entries(properties)) {
    if (!isProfileKey(key)) out[key] = value
  }
  return out
}

function toLevel(value: PropertyValue | undefined): 1 | 2 | 3 | 4 | undefined {
  if (value === undefined) return undefined
  const level = Number(value)
  return isFitLevel(level) ? level : undefined
}
