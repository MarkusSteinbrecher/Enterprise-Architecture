import { XMLParser } from 'fast-xml-parser'
import {
  ACCESS_TYPES,
  DEFAULT_TAG_GROUP,
  SCHEMA_VERSION,
  isElementType,
  isRelationshipType,
  type AccessType,
  type Element,
  type PropertyValue,
  type Relationship,
  type Workspace,
} from '@/model'
import { failed, problem, succeeded, type ImportProblem, type ImportResult } from './problems'
import {
  profileFromProperties,
  profileToProperties,
  relationshipProfileFromProperties,
  relationshipProfileToProperties,
  stripProfileKeys,
} from './profile-properties'

/**
 * The Open Group ArchiMate Model Exchange File Format (concept §5.3 item 2).
 *
 * This is the entry ticket to the ArchiMate tool ecosystem: Archi and every
 * certified tool reads and writes it, so it is how a model gets in and out of
 * Archipelago without anyone's data being trapped.
 *
 * Written by hand rather than through a serialiser library because the schema
 * pins **element order** (`name`, `documentation`, `properties`) and identifier
 * types (`xs:ID` / `xs:IDREF`), and a generic object-to-XML mapper gives no
 * control over either. Reading uses fast-xml-parser; writing is string building
 * with explicit escaping.
 *
 * Not read yet: `views` (diagrams) and `organizations` (folder structure). Both
 * are reported as skipped rather than silently dropped — diagram support is
 * phase 3 (concept §6.3).
 */

const NS = 'http://www.opengroup.org/xsd/archimate/3.0/'
const XSI = 'http://www.w3.org/2001/XMLSchema-instance'
const SCHEMA_LOCATION = `${NS} http://www.opengroup.org/xsd/archimate/3.1/archimate3_Model.xsd`

export interface ExchangeExportOptions {
  /** Overrides the model documentation written into the file. */
  documentation?: string
}

// ── Export ───────────────────────────────────────────────────────────────────

/**
 * Serialise a workspace to exchange-format XML.
 *
 * Property *definitions* are collected first because the format references them
 * by id from every property instance: one definition per distinct key, in first-
 * seen order, so a re-export of an unchanged model is stable.
 */
export function exportExchangeXml(
  workspace: Workspace,
  options: ExchangeExportOptions = {},
): string {
  const definitions = collectPropertyDefinitions(workspace)
  const lines: string[] = []

  lines.push('<?xml version="1.0" encoding="UTF-8"?>')
  lines.push(
    `<model xmlns="${NS}" xmlns:xsi="${XSI}" xsi:schemaLocation="${SCHEMA_LOCATION}" identifier="${attr(modelIdentifier(workspace.id))}">`,
  )
  lines.push(`  <name xml:lang="en">${text(workspace.name)}</name>`)
  if (options.documentation) {
    lines.push(`  <documentation xml:lang="en">${text(options.documentation)}</documentation>`)
  }

  if (workspace.elements.length) {
    lines.push('  <elements>')
    for (const element of workspace.elements) {
      const properties = { ...element.properties, ...profileToProperties(element.profile) }
      lines.push(`    <element identifier="${attr(element.id)}" xsi:type="${attr(element.type)}">`)
      lines.push(`      <name xml:lang="en">${text(element.name)}</name>`)
      if (element.documentation) {
        lines.push(
          `      <documentation xml:lang="en">${text(element.documentation)}</documentation>`,
        )
      }
      lines.push(...propertyLines(properties, definitions, 6))
      lines.push('    </element>')
    }
    lines.push('  </elements>')
  }

  if (workspace.relationships.length) {
    lines.push('  <relationships>')
    for (const relationship of workspace.relationships) {
      const properties = {
        ...relationship.properties,
        ...relationshipProfileToProperties(relationship.profile),
      }
      const accessType =
        relationship.type === 'Access' && relationship.profile?.accessType
          ? ` accessType="${attr(relationship.profile.accessType)}"`
          : ''
      lines.push(
        `    <relationship identifier="${attr(relationship.id)}" source="${attr(relationship.source)}" target="${attr(relationship.target)}"${accessType} xsi:type="${attr(relationship.type)}">`,
      )
      if (relationship.name) {
        lines.push(`      <name xml:lang="en">${text(relationship.name)}</name>`)
      }
      lines.push(...propertyLines(properties, definitions, 6))
      lines.push('    </relationship>')
    }
    lines.push('  </relationships>')
  }

  if (definitions.size) {
    lines.push('  <propertyDefinitions>')
    for (const [key, id] of definitions) {
      lines.push(`    <propertyDefinition identifier="${attr(id)}" type="string">`)
      lines.push(`      <name xml:lang="en">${text(key)}</name>`)
      lines.push('    </propertyDefinition>')
    }
    lines.push('  </propertyDefinitions>')
  }

  lines.push('</model>')
  return `${lines.join('\n')}\n`
}

function propertyLines(
  properties: Record<string, PropertyValue>,
  definitions: Map<string, string>,
  indent: number,
): string[] {
  const keys = Object.keys(properties)
  if (!keys.length) return []
  const pad = ' '.repeat(indent)
  const out = [`${pad}<properties>`]
  for (const key of keys) {
    const id = definitions.get(key)
    if (!id) continue
    out.push(`${pad}  <property propertyDefinitionRef="${attr(id)}">`)
    out.push(`${pad}    <value xml:lang="en">${text(String(properties[key]))}</value>`)
    out.push(`${pad}  </property>`)
  }
  out.push(`${pad}</properties>`)
  return out
}

function collectPropertyDefinitions(workspace: Workspace): Map<string, string> {
  const definitions = new Map<string, string>()
  const remember = (key: string) => {
    if (!definitions.has(key)) definitions.set(key, `propid-${definitions.size + 1}`)
  }
  for (const element of workspace.elements) {
    for (const key of Object.keys(element.properties)) remember(key)
    for (const key of Object.keys(profileToProperties(element.profile))) remember(key)
  }
  for (const relationship of workspace.relationships) {
    for (const key of Object.keys(relationship.properties)) remember(key)
    for (const key of Object.keys(relationshipProfileToProperties(relationship.profile))) {
      remember(key)
    }
  }
  return definitions
}

/** Model identifiers are xs:ID, so they cannot start with a digit. */
function modelIdentifier(id: string): string {
  return /^[A-Za-z_]/.test(id) ? id : `id-${id}`
}

function text(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function attr(value: string): string {
  return text(value).replace(/"/g, '&quot;')
}

// ── Import ───────────────────────────────────────────────────────────────────

interface RawNode {
  [key: string]: unknown
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  // Namespace prefixes vary between tools (`xsi:type`, `archimate:type`); dropping
  // them means the reader does not care which prefix a file happens to use.
  removeNSPrefix: true,
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true,
})

export function importExchangeXml(xml: string, file?: string): ImportResult {
  const problems: ImportProblem[] = []
  const where = file ? { file } : {}

  let parsed: RawNode
  try {
    parsed = parser.parse(xml) as RawNode
  } catch (error) {
    return failed([
      problem(
        'error',
        'exchange.unparseable',
        `The file is not valid XML: ${error instanceof Error ? error.message : String(error)}`,
        where,
      ),
    ])
  }

  const model = parsed.model as RawNode | undefined
  if (!model) {
    return failed([
      problem(
        'error',
        'exchange.not-a-model',
        'No <model> element — this does not look like an ArchiMate Model Exchange Format file.',
        where,
      ),
    ])
  }

  const definitions = readPropertyDefinitions(model)
  const elements: Element[] = []
  const seenIds = new Set<string>()

  for (const raw of list((model.elements as RawNode | undefined)?.element)) {
    const element = readElement(raw, definitions, problems, where)
    if (!element) continue
    if (seenIds.has(element.id)) {
      problems.push(
        problem(
          'warning',
          'exchange.duplicate-id',
          `Two elements share the identifier "${element.id}"; the later one was skipped.`,
          {
            ...where,
            subject: element.id,
          },
        ),
      )
      continue
    }
    seenIds.add(element.id)
    elements.push(element)
  }

  const relationships: Relationship[] = []
  for (const raw of list((model.relationships as RawNode | undefined)?.relationship)) {
    const relationship = readRelationship(raw, definitions, seenIds, problems, where)
    if (relationship) relationships.push(relationship)
  }

  reportSkipped(model, problems, where)

  const workspace: Workspace = {
    id: asString(model['@identifier']) || 'ws-imported',
    name: langString(model.name) || 'Imported model',
    schemaVersion: SCHEMA_VERSION,
    elements,
    relationships,
    views: [],
    tagGroups: [DEFAULT_TAG_GROUP],
  }

  return succeeded(workspace, problems)
}

function readPropertyDefinitions(model: RawNode): Map<string, string> {
  const definitions = new Map<string, string>()
  const container = model.propertyDefinitions as RawNode | undefined
  for (const raw of list(container?.propertyDefinition)) {
    const id = asString(raw['@identifier'])
    const name = langString(raw.name)
    if (id && name) definitions.set(id, name)
  }
  return definitions
}

function readElement(
  raw: RawNode,
  definitions: Map<string, string>,
  problems: ImportProblem[],
  where: { file?: string },
): Element | undefined {
  const id = asString(raw['@identifier'])
  const type = asString(raw['@type'])
  if (!id) {
    problems.push(
      problem('error', 'exchange.element-no-id', 'An <element> has no identifier.', where),
    )
    return undefined
  }
  if (!type || !isElementType(type)) {
    problems.push(
      problem(
        'error',
        'exchange.unknown-element-type',
        `Element "${id}" has xsi:type "${type || '(none)'}", which is not an ArchiMate 3.2 element type. It was skipped.`,
        { ...where, subject: id },
      ),
    )
    return undefined
  }

  const properties = readProperties(raw, definitions)
  const element: Element = {
    id,
    type,
    name: langString(raw.name) ?? '',
    properties: stripProfileKeys(properties),
  }
  const documentation = langString(raw.documentation)
  if (documentation) element.documentation = documentation
  const profile = profileFromProperties(properties)
  if (profile) element.profile = profile
  return element
}

function readRelationship(
  raw: RawNode,
  definitions: Map<string, string>,
  knownIds: Set<string>,
  problems: ImportProblem[],
  where: { file?: string },
): Relationship | undefined {
  const id = asString(raw['@identifier'])
  const type = asString(raw['@type'])
  const source = asString(raw['@source'])
  const target = asString(raw['@target'])

  if (!id) {
    problems.push(
      problem('error', 'exchange.relationship-no-id', 'A <relationship> has no identifier.', where),
    )
    return undefined
  }
  if (!type || !isRelationshipType(type)) {
    problems.push(
      problem(
        'error',
        'exchange.unknown-relationship-type',
        `Relationship "${id}" has xsi:type "${type || '(none)'}", which is not an ArchiMate 3.2 relationship type. It was skipped.`,
        { ...where, subject: id },
      ),
    )
    return undefined
  }
  if (!source || !target) {
    problems.push(
      problem(
        'error',
        'exchange.relationship-no-endpoints',
        `Relationship "${id}" is missing a source or target.`,
        {
          ...where,
          subject: id,
        },
      ),
    )
    return undefined
  }
  if (!knownIds.has(source) || !knownIds.has(target)) {
    problems.push(
      problem(
        'warning',
        'exchange.dangling-relationship',
        `Relationship "${id}" points at an element that is not in the file. It was skipped.`,
        { ...where, subject: id },
      ),
    )
    return undefined
  }

  const properties = readProperties(raw, definitions)
  const relationship: Relationship = {
    id,
    type,
    source,
    target,
    properties: stripProfileKeys(properties),
  }
  const name = langString(raw.name)
  if (name) relationship.name = name

  const profile = relationshipProfileFromProperties(properties) ?? {}
  const accessType = asString(raw['@accessType'])
  if (type === 'Access' && accessType && (ACCESS_TYPES as readonly string[]).includes(accessType)) {
    profile.accessType = accessType as AccessType
  }
  if (Object.keys(profile).length) relationship.profile = profile

  return relationship
}

function readProperties(
  raw: RawNode,
  definitions: Map<string, string>,
): Record<string, PropertyValue> {
  const out: Record<string, PropertyValue> = {}
  const container = raw.properties as RawNode | undefined
  for (const property of list(container?.property)) {
    const ref = asString(property['@propertyDefinitionRef'])
    const key = ref ? definitions.get(ref) : undefined
    if (!key) continue
    const value = langString(property.value)
    if (value !== undefined) out[key] = value
  }
  return out
}

/** Views and organizations are not read yet — say so rather than dropping them. */
function reportSkipped(model: RawNode, problems: ImportProblem[], where: { file?: string }): void {
  const views = list((model.views as RawNode | undefined)?.diagrams).flatMap((diagrams) =>
    list((diagrams as RawNode).view),
  ).length
  if (views) {
    problems.push(
      problem(
        'info',
        'exchange.views-skipped',
        `${views} diagram${views === 1 ? ' was' : 's were'} not imported — Archipelago generates its views from the model rather than storing them.`,
        where,
      ),
    )
  }
  const organizations = list(model.organizations).length
  if (organizations) {
    problems.push(
      problem(
        'info',
        'exchange.organizations-skipped',
        'The folder organization in this file was not imported.',
        where,
      ),
    )
  }
}

// ── XML shape helpers ────────────────────────────────────────────────────────

/** fast-xml-parser collapses a single child to an object; normalise to an array. */
function list(value: unknown): RawNode[] {
  if (value === undefined || value === null) return []
  if (Array.isArray(value)) return value.filter(isRawNode)
  return isRawNode(value) ? [value] : []
}

function isRawNode(value: unknown): value is RawNode {
  return typeof value === 'object' && value !== null
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : typeof value === 'number' ? String(value) : undefined
}

/**
 * `LangStringType` may appear as a bare string, as `{ '#text': … }` when it
 * carries `xml:lang`, or repeated once per language. Take the first value.
 */
function langString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value)) return langString(value[0])
  if (isRawNode(value)) {
    const inner = value['#text']
    return typeof inner === 'string' || typeof inner === 'number' ? String(inner) : undefined
  }
  return undefined
}
