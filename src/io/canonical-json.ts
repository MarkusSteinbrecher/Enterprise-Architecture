import {
  SCHEMA_VERSION,
  isElementType,
  isRelationshipType,
  type Element,
  type PortfolioProfile,
  type PropertyValue,
  type Relationship,
  type RelationshipProfile,
  type TagGroup,
  type ViewDefinition,
  type Workspace,
} from '@/model'
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
  for (const [index, candidate] of asArray(raw.elements).entries()) {
    const element = readElement(candidate, index, problems, where)
    if (element) elements.push(element)
  }

  const knownIds = new Set(elements.map((element) => element.id))
  const relationships: Relationship[] = []
  for (const [index, candidate] of asArray(raw.relationships).entries()) {
    const relationship = readRelationship(candidate, index, knownIds, problems, where)
    if (relationship) relationships.push(relationship)
  }

  const workspace: Workspace = {
    id: typeof raw.id === 'string' && raw.id ? raw.id : 'ws-imported',
    name: typeof raw.name === 'string' && raw.name ? raw.name : 'Imported workspace',
    schemaVersion: schemaVersion || SCHEMA_VERSION,
    elements,
    relationships,
    views: asArray(raw.views).filter(isViewDefinition),
    tagGroups: asArray(raw.tagGroups).filter(isTagGroup),
  }

  return succeeded(workspace, problems)
}

// ── Canonical shapes ─────────────────────────────────────────────────────────

function canonicalElement(element: Element): Record<string, unknown> {
  return prune({
    id: element.id,
    type: element.type,
    name: element.name,
    documentation: element.documentation,
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

function canonicalTagGroup(group: TagGroup): Record<string, unknown> {
  return prune({
    ...group,
    tags: [...group.tags].sort((a, b) => a.name.localeCompare(b.name)),
  })
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
  if (isRecord(candidate.profile)) element.profile = candidate.profile as PortfolioProfile
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
    relationship.profile = candidate.profile as RelationshipProfile
  }
  return relationship
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

function isViewDefinition(value: unknown): value is ViewDefinition {
  return isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string'
}

function isTagGroup(value: unknown): value is TagGroup {
  return isRecord(value) && typeof value.id === 'string' && Array.isArray(value.tags)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
