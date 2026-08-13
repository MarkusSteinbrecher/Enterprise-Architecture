import {
  ACCESS_TYPES,
  DEFAULT_JUNCTION_KIND,
  LIFECYCLE_PHASES,
  SCHEMA_VERSION,
  isElementType,
  isFitLevel,
  isJunctionKind,
  isRelationshipType,
  isTimeClassification,
  type AccessType,
  type Element,
  type LifecycleDates,
  type PortfolioProfile,
  type PropertyValue,
  type Relationship,
  type RelationshipProfile,
  type TagGroup,
  type ViewDefinition,
  type Workspace,
} from '@/model'
import { isExchangeSafeId } from '@/store/ids'
import { failed, problem, succeeded, type ImportProblem, type ImportResult } from './problems'

/**
 * Canonical JSON — the native format (concept §5.3 item 1).
 *
 * The point is git. Two exports of the same model must be byte-identical, and a
 * one-field edit must produce a one-line diff, so:
 *
 * - object keys are emitted in sorted order, at every depth;
 * - arrays are sorted by a stable key (id, or name for tags) rather than by
 *   insertion order, because Map iteration order is an implementation detail;
 * - `undefined` and empty containers are omitted rather than emitted as null;
 * - two-space indent and a trailing newline, so the file ends the way every other
 *   text file in a repository ends.
 *
 * The published schema lives at `design/archipelago-workspace.schema.json`.
 */

export const CANONICAL_JSON_INDENT = 2

/** Serialise a workspace to canonical JSON. Deterministic for a given model. */
export function toCanonicalJson(workspace: Workspace): string {
  const canonical = {
    schemaVersion: workspace.schemaVersion || SCHEMA_VERSION,
    id: workspace.id,
    name: workspace.name,
    elements: [...workspace.elements].sort(byId).map(canonicalElement),
    relationships: [...workspace.relationships].sort(byId).map(canonicalRelationship),
    views: [...workspace.views].sort(byId).map(canonicalView),
    tagGroups: [...workspace.tagGroups].sort(byId).map(canonicalTagGroup),
    propertyTypes: workspace.propertyTypes && emptyToUndefined(workspace.propertyTypes),
  }
  return `${JSON.stringify(canonical, sortKeys, CANONICAL_JSON_INDENT)}\n`
}

/** Parse canonical JSON back into a workspace, reporting what it could not read. */
export function fromCanonicalJson(text: string, file?: string): ImportResult {
  const problems: ImportProblem[] = []
  const where = file ? { file } : {}

  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch (error) {
    return failed([
      problem('error', 'json.unparseable', `The file is not valid JSON: ${message(error)}`, where),
    ])
  }

  if (!isRecord(raw)) {
    return failed([
      problem(
        'error',
        'json.not-a-workspace',
        'The file does not contain a workspace object.',
        where,
      ),
    ])
  }

  const schemaVersion = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 0
  if (schemaVersion === 0) {
    problems.push(
      problem(
        'warning',
        'json.missing-schema-version',
        'No schemaVersion — assuming the current one.',
        where,
      ),
    )
  } else if (schemaVersion > SCHEMA_VERSION) {
    problems.push(
      problem(
        'warning',
        'json.newer-schema-version',
        `This file was written by a newer version of Archipelago (schema ${schemaVersion}, this build reads ${SCHEMA_VERSION}). Anything it does not recognise was dropped.`,
        where,
      ),
    )
  }

  const elements: Element[] = []
  const knownIds = new Set<string>()
  for (const [index, candidate] of asArray(raw.elements).entries()) {
    const element = readElement(candidate, index, problems, where)
    if (!element) continue
    if (knownIds.has(element.id)) {
      problems.push(
        problem(
          'warning',
          'json.duplicate-id',
          `Two elements share the id "${element.id}"; the later one was skipped.`,
          { ...where, subject: element.id },
        ),
      )
      continue
    }
    knownIds.add(element.id)
    elements.push(element)
  }

  const relationships: Relationship[] = []
  const seenRelationshipIds = new Set<string>()
  for (const [index, candidate] of asArray(raw.relationships).entries()) {
    const relationship = readRelationship(candidate, index, knownIds, problems, where)
    if (!relationship) continue
    if (seenRelationshipIds.has(relationship.id)) {
      problems.push(
        problem(
          'warning',
          'json.duplicate-relationship-id',
          `Two relationships share the id "${relationship.id}"; the later one was skipped.`,
          { ...where, subject: relationship.id },
        ),
      )
      continue
    }
    seenRelationshipIds.add(relationship.id)
    relationships.push(relationship)
  }

  // The published schema requires ids that are usable as an xs:ID, but nothing
  // in this reader enforces the pattern — a file that ignores it imports fine
  // and then has to be rewritten on the way out to XML. Say so once, here,
  // rather than letting the surprise happen at export time.
  const unsafeIds = [...elements, ...relationships]
    .map((concept) => concept.id)
    .filter((id) => !isExchangeSafeId(id))
  if (unsafeIds.length) {
    const examples = unsafeIds
      .slice(0, 3)
      .map((id) => `"${id}"`)
      .join(', ')
    problems.push(
      problem(
        'warning',
        'json.id-not-exchange-safe',
        `${unsafeIds.length} id${unsafeIds.length === 1 ? '' : 's'} (${examples}${unsafeIds.length > 3 ? ', …' : ''}) cannot be used as an XML id, which the published schema requires. They work here, but an exchange-format export has to rewrite them.`,
        where,
      ),
    )
  }

  // Malformed views and tag groups are dropped like everything else that cannot
  // be read — but never silently: the next save would delete them for good.
  const views: ViewDefinition[] = []
  for (const [index, candidate] of asArray(raw.views).entries()) {
    if (isViewDefinition(candidate)) views.push(candidate)
    else {
      problems.push(
        problem(
          'warning',
          'json.invalid-view',
          `View ${index} is malformed and was skipped.`,
          where,
        ),
      )
    }
  }
  const tagGroups: TagGroup[] = []
  for (const [index, candidate] of asArray(raw.tagGroups).entries()) {
    if (isTagGroup(candidate)) tagGroups.push(candidate)
    else {
      problems.push(
        problem(
          'warning',
          'json.invalid-tag-group',
          `Tag group ${index} is malformed and was skipped.`,
          where,
        ),
      )
    }
  }

  const workspace: Workspace = {
    id: typeof raw.id === 'string' && raw.id ? raw.id : 'ws-imported',
    name: typeof raw.name === 'string' && raw.name ? raw.name : 'Imported workspace',
    schemaVersion: schemaVersion || SCHEMA_VERSION,
    elements,
    relationships,
    views,
    tagGroups,
  }
  const propertyTypes = readPropertyTypes(raw.propertyTypes, problems, where)
  if (propertyTypes) workspace.propertyTypes = propertyTypes

  return succeeded(workspace, problems)
}

// ── Canonical shapes ─────────────────────────────────────────────────────────

function canonicalElement(element: Element): Record<string, unknown> {
  return prune({
    id: element.id,
    type: element.type,
    name: element.name,
    documentation: element.documentation,
    // Absent *means* `and`, so the two spellings are one model and have to
    // produce one file: an XML round trip reads `AndJunction` back as absent,
    // and keeping an explicit `and` here made the same model differ (ADR 0004).
    junctionKind: element.junctionKind === DEFAULT_JUNCTION_KIND ? undefined : element.junctionKind,
    properties: emptyToUndefined(element.properties),
    profile: element.profile ? prune({ ...element.profile }) : undefined,
  })
}

function canonicalRelationship(relationship: Relationship): Record<string, unknown> {
  return prune({
    id: relationship.id,
    type: relationship.type,
    source: relationship.source,
    target: relationship.target,
    name: relationship.name,
    properties: emptyToUndefined(relationship.properties),
    profile: relationship.profile ? prune({ ...relationship.profile }) : undefined,
  })
}

function canonicalView(view: ViewDefinition): Record<string, unknown> {
  return prune({ ...view })
}

/**
 * Views and tag groups as a canonical JSON string.
 *
 * The exchange format has no element for either, so rather than dropping them
 * the XML writer carries them as namespaced model properties (#36). Canonical
 * for the usual reason: the same model has to produce the same bytes, whichever
 * format it is written in.
 */
export function canonicalViewsJson(views: readonly ViewDefinition[]): string {
  return JSON.stringify([...views].sort(byId).map(canonicalView), sortKeys)
}

export function canonicalTagGroupsJson(groups: readonly TagGroup[]): string {
  return JSON.stringify([...groups].sort(byId).map(canonicalTagGroup), sortKeys)
}

function canonicalTagGroup(group: TagGroup): Record<string, unknown> {
  return {
    ...prune({ ...group }),
    // `tags` is written even when empty. It is the one field `isTagGroup`
    // requires, so pruning it made the writer produce exactly what the reader
    // refuses: a group created but not yet filled came back as a warning
    // blaming the file for what this function had done to it (#37).
    //
    // Code-unit order, not localeCompare: collation depends on the machine's
    // locale, and two collaborators must commit identical bytes (ADR 0004).
    tags: [...group.tags].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)),
  }
}

/** JSON.stringify replacer: emit object keys in sorted order at every depth. */
function sortKeys(_key: string, value: unknown): unknown {
  if (!isRecord(value) || Array.isArray(value)) return value
  const sorted: Record<string, unknown> = {}
  for (const key of Object.keys(value).sort()) sorted[key] = value[key]
  return sorted
}

function byId(a: { id: string }, b: { id: string }): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

/** Drop undefined and empty values so absent data never shows up as noise in a diff. */
function prune(object: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(object)) {
    if (value === undefined) continue
    if (Array.isArray(value) && value.length === 0) continue
    if (isRecord(value) && !Array.isArray(value) && Object.keys(value).length === 0) continue
    out[key] = value
  }
  return out
}

function emptyToUndefined<T extends object>(value: T): T | undefined {
  return Object.keys(value).length ? value : undefined
}

// ── Reading ──────────────────────────────────────────────────────────────────

function readElement(
  candidate: unknown,
  index: number,
  problems: ImportProblem[],
  where: { file?: string },
): Element | undefined {
  if (!isRecord(candidate)) {
    problems.push(problem('error', 'json.bad-element', `Element ${index} is not an object.`, where))
    return undefined
  }
  const id = candidate.id
  const type = candidate.type
  if (typeof id !== 'string' || !id) {
    problems.push(problem('error', 'json.element-no-id', `Element ${index} has no id.`, where))
    return undefined
  }
  if (typeof type !== 'string' || !isElementType(type)) {
    problems.push(
      problem(
        'error',
        'json.unknown-element-type',
        `Element "${id}" has type "${String(type)}", which is not an ArchiMate 3.2 element type. It was skipped.`,
        { ...where, subject: id },
      ),
    )
    return undefined
  }
  const element: Element = {
    id,
    type,
    name: typeof candidate.name === 'string' ? candidate.name : '',
    properties: readProperties(candidate.properties),
  }
  if (typeof candidate.documentation === 'string') element.documentation = candidate.documentation
  if (candidate.junctionKind !== undefined) {
    if (type !== 'Junction') {
      problems.push(
        problem(
          'warning',
          'json.junction-kind-ignored',
          `Element "${id}" is a ${type}, not a Junction, so its junctionKind was ignored.`,
          { ...where, subject: id },
        ),
      )
    } else if (!isJunctionKind(candidate.junctionKind)) {
      problems.push(
        problem(
          'warning',
          'json.junction-kind-ignored',
          `Junction "${id}" has junctionKind "${String(candidate.junctionKind)}", which is neither "and" nor "or"; it was read as "${DEFAULT_JUNCTION_KIND}".`,
          { ...where, subject: id },
        ),
      )
    } else {
      element.junctionKind = candidate.junctionKind
    }
  }
  if (isRecord(candidate.profile)) {
    const { profile, dropped } = readPortfolioProfile(candidate.profile)
    if (profile) element.profile = profile
    reportDroppedProfileFields('Element', id, dropped, problems, where)
  }
  return element
}

function readRelationship(
  candidate: unknown,
  index: number,
  knownIds: Set<string>,
  problems: ImportProblem[],
  where: { file?: string },
): Relationship | undefined {
  if (!isRecord(candidate)) {
    problems.push(
      problem('error', 'json.bad-relationship', `Relationship ${index} is not an object.`, where),
    )
    return undefined
  }
  const { id, type, source, target } = candidate
  if (typeof id !== 'string' || !id) {
    problems.push(
      problem('error', 'json.relationship-no-id', `Relationship ${index} has no id.`, where),
    )
    return undefined
  }
  if (typeof type !== 'string' || !isRelationshipType(type)) {
    problems.push(
      problem(
        'error',
        'json.unknown-relationship-type',
        `Relationship "${id}" has type "${String(type)}", which is not an ArchiMate 3.2 relationship type. It was skipped.`,
        { ...where, subject: id },
      ),
    )
    return undefined
  }
  if (typeof source !== 'string' || typeof target !== 'string') {
    problems.push(
      problem('error', 'json.relationship-no-endpoints', `Relationship "${id}" has no endpoints.`, {
        ...where,
        subject: id,
      }),
    )
    return undefined
  }
  if (!knownIds.has(source) || !knownIds.has(target)) {
    problems.push(
      problem(
        'warning',
        'json.dangling-relationship',
        `Relationship "${id}" points at an element that is not in the file. It was skipped.`,
        { ...where, subject: id },
      ),
    )
    return undefined
  }

  const relationship: Relationship = {
    id,
    type,
    source,
    target,
    properties: readProperties(candidate.properties),
  }
  if (typeof candidate.name === 'string') relationship.name = candidate.name
  if (isRecord(candidate.profile)) {
    const { profile, dropped } = readRelationshipProfile(candidate.profile)
    if (profile) relationship.profile = profile
    reportDroppedProfileFields('Relationship', id, dropped, problems, where)
  }
  return relationship
}

/**
 * Profiles are validated field by field rather than cast: a malformed profile
 * (a string where an array belongs, a fit of 9) must not enter the workspace,
 * where it would crash a later export instead of failing here with a problem.
 */
function readPortfolioProfile(raw: Record<string, unknown>): {
  profile: PortfolioProfile | undefined
  dropped: string[]
} {
  const profile: PortfolioProfile = {}
  const dropped: string[] = []
  for (const [key, value] of Object.entries(raw)) {
    switch (key) {
      case 'lifecycle': {
        const lifecycle: LifecycleDates = {}
        if (isRecord(value)) {
          for (const phase of LIFECYCLE_PHASES) {
            const date = value[phase]
            if (typeof date === 'string' && date) lifecycle[phase] = date
          }
        }
        if (Object.keys(lifecycle).length) profile.lifecycle = lifecycle
        else dropped.push(key)
        break
      }
      case 'functionalFit':
      case 'technicalFit':
      case 'businessCriticality': {
        if (isFitLevel(value)) profile[key] = value
        else dropped.push(key)
        break
      }
      case 'timeClassification': {
        if (isTimeClassification(value)) profile.timeClassification = value
        else dropped.push(key)
        break
      }
      case 'tags': {
        if (Array.isArray(value) && value.every((tag) => typeof tag === 'string')) {
          if (value.length) profile.tags = value as string[]
        } else dropped.push(key)
        break
      }
      default:
        dropped.push(key)
    }
  }
  return { profile: Object.keys(profile).length ? profile : undefined, dropped }
}

function readRelationshipProfile(raw: Record<string, unknown>): {
  profile: RelationshipProfile | undefined
  dropped: string[]
} {
  const profile: RelationshipProfile = {}
  const dropped: string[] = []
  for (const [key, value] of Object.entries(raw)) {
    switch (key) {
      case 'annualCost': {
        if (typeof value === 'number' && Number.isFinite(value)) profile.annualCost = value
        else dropped.push(key)
        break
      }
      case 'currency':
      case 'supportType':
      case 'validFrom':
      case 'validTo': {
        if (typeof value === 'string' && value) profile[key] = value
        else dropped.push(key)
        break
      }
      case 'accessType': {
        if (typeof value === 'string' && (ACCESS_TYPES as readonly string[]).includes(value)) {
          profile.accessType = value as AccessType
        } else dropped.push(key)
        break
      }
      default:
        dropped.push(key)
    }
  }
  return { profile: Object.keys(profile).length ? profile : undefined, dropped }
}

function reportDroppedProfileFields(
  kind: 'Element' | 'Relationship',
  id: string,
  dropped: string[],
  problems: ImportProblem[],
  where: { file?: string },
): void {
  if (!dropped.length) return
  problems.push(
    problem(
      'warning',
      'json.invalid-profile',
      `${kind} "${id}": profile field${dropped.length === 1 ? '' : 's'} ${dropped.join(', ')} could not be read and ${dropped.length === 1 ? 'was' : 'were'} ignored.`,
      { ...where, subject: id },
    ),
  )
}

function readProperties(value: unknown): Record<string, PropertyValue> {
  if (!isRecord(value)) return {}
  const out: Record<string, PropertyValue> = {}
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
      out[key] = raw
    }
  }
  return out
}

// Exported because the exchange reader validates the views and tag groups it
// carries the same way this one does — one definition of "readable" per concept.
export function isViewDefinition(value: unknown): value is ViewDefinition {
  return isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string'
}

export function isTagGroup(value: unknown): value is TagGroup {
  return isRecord(value) && typeof value.id === 'string' && Array.isArray(value.tags)
}

/**
 * Exchange-format property types the workspace carries so a typed file leaves
 * typed (see `Workspace.propertyTypes`). The set is the schema's, minus
 * `string`, which is what an unlisted key already means.
 */
const CARRIED_PROPERTY_TYPES = new Set(['boolean', 'currency', 'date', 'number', 'time'])

function readPropertyTypes(
  candidate: unknown,
  problems: ImportProblem[],
  where: { file?: string },
): Record<string, string> | undefined {
  if (candidate === undefined) return undefined
  if (!isRecord(candidate)) {
    problems.push(
      problem(
        'warning',
        'json.invalid-property-types',
        'propertyTypes is not an object, so the property types this file declared were dropped. Their values are unaffected; an export will declare them as text.',
        where,
      ),
    )
    return undefined
  }
  const out: Record<string, string> = {}
  const rejected: string[] = []
  for (const [key, value] of Object.entries(candidate)) {
    if (typeof value === 'string' && CARRIED_PROPERTY_TYPES.has(value)) out[key] = value
    else rejected.push(key)
  }
  if (rejected.length) {
    problems.push(
      problem(
        'warning',
        'json.invalid-property-types',
        `${rejected.length} propert${rejected.length === 1 ? 'y' : 'ies'} (${rejected.slice(0, 3).join(', ')}${rejected.length > 3 ? ', …' : ''}) declare a type this build does not know, so ${rejected.length === 1 ? 'it was' : 'they were'} dropped. Their values are unaffected; an export will declare them as text.`,
        where,
      ),
    )
  }
  return Object.keys(out).length ? out : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  // Arrays are excluded: a top-level JSON array must fail the workspace guard
  // rather than import as an empty workspace.
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
