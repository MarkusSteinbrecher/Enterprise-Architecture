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
import { setKey } from './records'

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
 *
 * The two forms have to be told apart *exactly*, not guessed at. Testing the
 * first character for `[` is a guess, and it was wrong for a tag that is itself
 * spelled like the escaped form: `["a"]` written as a comma list read back as
 * the single tag `a`, and a tag named `[]` took `profile.tags` with it (#37).
 * So one function decides — `asTagArray` — and both directions call it: the
 * writer refuses the comma form for anything the reader would take as JSON.
 */
function encodeTags(tags: readonly string[]): string {
  const joined = tags.join(', ')
  const splittable =
    tags.every((tag) => tag === tag.trim() && tag !== '' && !tag.includes(',')) &&
    asTagArray(joined) === undefined
  return splittable ? joined : JSON.stringify(tags)
}

function decodeTags(value: string): string[] {
  const array = asTagArray(value)
  if (array) return array.filter(Boolean)
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

/** The value read as the JSON-array form, or `undefined` when it is not one. */
function asTagArray(value: string): string[] | undefined {
  if (!value.trim().startsWith('[')) return undefined
  try {
    const parsed: unknown = JSON.parse(value)
    if (Array.isArray(parsed) && parsed.every((tag) => typeof tag === 'string')) {
      return parsed as string[]
    }
  } catch {
    // Not JSON after all — a tag that merely starts with "[". Read it as a list.
  }
  return undefined
}

/**
 * A profile read back out of properties, and what could not be read.
 *
 * The two halves have to be handed back together. `stripProfileKeys` used to
 * remove every key this module owns while the reader kept only the values its
 * guards accepted, and nothing reconciled the two — so
 * `archipelago.timeClassification: "Banana"` was stripped from the properties,
 * rejected by the guard, and gone, with `problems: []` (#37). A key this build
 * cannot read is somebody's data: it stays an ordinary property, and the caller
 * says so.
 */
export interface ProfileRead<T> {
  profile: T | undefined
  /** Owned keys present in the input whose value produced no field. */
  unread: readonly string[]
}

/** Read a portfolio profile back out of properties; `undefined` when there is none. */
export function readPortfolioProfile(
  properties: Record<string, PropertyValue>,
): ProfileRead<PortfolioProfile> {
  const profile: PortfolioProfile = {}
  const lifecycle: LifecycleDates = {}
  /** Every key that became a field. What is left over is exactly what did not. */
  const consumed = new Set<string>()

  for (const phase of LIFECYCLE_PHASES) {
    const key = LIFECYCLE_KEYS[phase]
    const value = properties[key]
    if (typeof value === 'string' && value.trim() !== '') {
      lifecycle[phase] = value.trim()
      consumed.add(key)
    }
  }
  if (Object.keys(lifecycle).length) profile.lifecycle = lifecycle

  const functionalFit = toLevel(properties[FUNCTIONAL_FIT_KEY])
  if (functionalFit !== undefined) {
    profile.functionalFit = functionalFit
    consumed.add(FUNCTIONAL_FIT_KEY)
  }
  const technicalFit = toLevel(properties[TECHNICAL_FIT_KEY])
  if (technicalFit !== undefined) {
    profile.technicalFit = technicalFit
    consumed.add(TECHNICAL_FIT_KEY)
  }
  const criticality = toLevel(properties[CRITICALITY_KEY])
  if (criticality !== undefined) {
    profile.businessCriticality = criticality
    consumed.add(CRITICALITY_KEY)
  }

  const time = properties[TIME_KEY]
  if (isTimeClassification(time)) {
    profile.timeClassification = time
    consumed.add(TIME_KEY)
  }

  const tags = properties[TAGS_KEY]
  const decoded = typeof tags === 'string' ? decodeTags(tags) : []
  if (decoded.length) {
    profile.tags = decoded
    consumed.add(TAGS_KEY)
  }

  return {
    profile: Object.keys(profile).length ? profile : undefined,
    unread: unreadKeys(properties, consumed),
  }
}

/** Owned keys the reader was handed and did not consume. */
function unreadKeys(
  properties: Record<string, PropertyValue>,
  consumed: ReadonlySet<string>,
): string[] {
  return Object.keys(properties).filter((key) => isProfileKey(key) && !consumed.has(key))
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

export function readRelationshipProfile(
  properties: Record<string, PropertyValue>,
): ProfileRead<RelationshipProfile> {
  const profile: RelationshipProfile = {}
  const consumed = new Set<string>()

  const rawCost = properties[ANNUAL_COST_KEY]
  // Number('') is 0 — an empty value must stay "no cost data", not become €0.
  const hasCost =
    typeof rawCost === 'number' || (typeof rawCost === 'string' && rawCost.trim() !== '')
  const cost = Number(rawCost)
  if (hasCost && Number.isFinite(cost)) {
    profile.annualCost = cost
    consumed.add(ANNUAL_COST_KEY)
  }

  /** The value at `key` when it is text this build can use, else `undefined`. */
  const text = (key: string): string | undefined => {
    const value = properties[key]
    if (typeof value !== 'string' || value === '') return undefined
    consumed.add(key)
    return value
  }
  const currency = text(CURRENCY_KEY)
  if (currency !== undefined) profile.currency = currency
  const supportType = text(SUPPORT_TYPE_KEY)
  if (supportType !== undefined) profile.supportType = supportType
  const validFrom = text(VALID_FROM_KEY)
  if (validFrom !== undefined) profile.validFrom = validFrom
  const validTo = text(VALID_TO_KEY)
  if (validTo !== undefined) profile.validTo = validTo

  return {
    profile: Object.keys(profile).length ? profile : undefined,
    unread: unreadKeys(properties, consumed),
  }
}

/**
 * Properties minus the keys that were actually read into typed fields.
 *
 * Stripping by *key* rather than by namespace prefix is deliberate: a key this
 * build does not know — one written by a newer version, or by an architect who
 * borrowed the prefix — has to survive as an ordinary property. Stripping the
 * whole prefix deleted it (#36).
 *
 * `unread` closes the same hole one step in: a key this build *does* know but
 * whose value it could not read is data too, and stripping it deleted that
 * (#37). Pass what `readPortfolioProfile` or `readRelationshipProfile` handed
 * back, so exactly the keys that became fields are the keys that leave.
 */
export function stripProfileKeys(
  properties: Record<string, PropertyValue>,
  unread: readonly string[] = [],
): Record<string, PropertyValue> {
  const kept = new Set(unread)
  const out: Record<string, PropertyValue> = {}
  for (const [key, value] of Object.entries(properties)) {
    if (!isProfileKey(key) || kept.has(key)) setKey(out, key, value)
  }
  return out
}

function toLevel(value: PropertyValue | undefined): 1 | 2 | 3 | 4 | undefined {
  if (value === undefined) return undefined
  const level = Number(value)
  return isFitLevel(level) ? level : undefined
}
