import { XMLParser } from 'fast-xml-parser'
import {
  ACCESS_TYPES,
  DEFAULT_JUNCTION_KIND,
  DEFAULT_TAG_GROUP,
  SCHEMA_VERSION,
  isElementType,
  isRelationshipType,
  type AccessType,
  type Element,
  type ElementType,
  type JunctionKind,
  type PropertyValue,
  type Relationship,
  type Workspace,
} from '@/model'
import { isExchangeSafeId } from '@/store/ids'
import {
  canonicalTagGroupsJson,
  canonicalViewsJson,
  isTagGroup,
  isViewDefinition,
} from './canonical-json'
import { failed, problem, succeeded, type ImportProblem, type ImportResult } from './problems'
import { setKey } from './records'
import {
  PROFILE_NAMESPACE,
  profileToProperties,
  readPortfolioProfile,
  readRelationshipProfile,
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
 * Not read yet: the format's `<views>` (diagrams) and `<organizations>` (folder
 * structure). Both are reported as skipped rather than silently dropped —
 * diagram support is phase 3 (concept §6.3). Note that a *diagram* is not one of
 * our `ViewDefinition`s: ours are saved report definitions, and those the writer
 * does carry, as model properties.
 */

const NS = 'http://www.opengroup.org/xsd/archimate/3.0/'
const XSI = 'http://www.w3.org/2001/XMLSchema-instance'
const SCHEMA_LOCATION = `${NS} http://www.opengroup.org/xsd/archimate/3.1/archimate3_Model.xsd`

/**
 * Model-level properties carrying what the format has no home for.
 *
 * Saved report views and tag groups are not ArchiMate concepts, so the schema
 * has nowhere to put them and an earlier build simply dropped both — an
 * Archipelago → XML → Archipelago trip destroyed every saved view and every
 * custom tag colour without saying a word (#36). They now travel as two
 * namespaced model properties: a tool that does not know Archipelago shows two
 * extra key/value pairs on the model and hands them back untouched.
 */
const VIEWS_KEY = `${PROFILE_NAMESPACE}.views`
const TAG_GROUPS_KEY = `${PROFILE_NAMESPACE}.tagGroups`

/** Tag groups identical to the shipped default are left out — import restores them. */
const DEFAULT_TAG_GROUPS_JSON = canonicalTagGroupsJson([DEFAULT_TAG_GROUP])

/**
 * `Junction` is one element type here and two concrete types in the schema.
 *
 * A `Map` rather than an object literal because the key comes from the file:
 * `JUNCTION_TYPES['toString']` on a literal resolves to `Object.prototype`'s
 * method, so `xsi:type="toString"` imported as a Junction that was never in the
 * file, carrying a *function* as its `junctionKind` (#37).
 */
const JUNCTION_TYPES = new Map<string, JunctionKind>([
  ['AndJunction', 'and'],
  ['OrJunction', 'or'],
])

/**
 * The data types the schema allows on a `propertyDefinition`.
 *
 * `currency`, `date` and `time` have no counterpart in `PropertyValue` — their
 * values are text to us — so the declaration is remembered on the workspace and
 * written back out. Deriving the type from `typeof value` alone re-declared them
 * as `string`, and a colleague reopening the file in Archi had lost the typing
 * and its formatting (#37).
 */
const EXCHANGE_PROPERTY_TYPES = ['string', 'boolean', 'currency', 'date', 'time', 'number'] as const
type ExchangePropertyType = (typeof EXCHANGE_PROPERTY_TYPES)[number]

function isExchangePropertyType(value: string): value is ExchangePropertyType {
  return (EXCHANGE_PROPERTY_TYPES as readonly string[]).includes(value)
}

export interface ExchangeExportOptions {
  /** Overrides the model documentation written into the file. */
  documentation?: string
}

/** The XML, plus anything the format could not carry exactly as it stood. */
export interface ExchangeExportResult {
  xml: string
  problems: ImportProblem[]
}

// ── Export ───────────────────────────────────────────────────────────────────

/**
 * Serialise a workspace to exchange-format XML, reporting what had to change.
 *
 * Two things can change on the way out: an id that is not a legal XML name has
 * to be rewritten, and a relationship whose endpoint is not in the model cannot
 * be referenced at all. Both are in the result rather than in the file's
 * silence.
 *
 * Property *definitions* are collected first because the format references them
 * by id from every property instance: one definition per distinct key, in first-
 * seen order, so a re-export of an unchanged model is stable.
 */
export function exportExchange(
  workspace: Workspace,
  options: ExchangeExportOptions = {},
): ExchangeExportResult {
  const problems: ImportProblem[] = []
  const ids = exchangeIdentifiers(workspace, problems)
  const modelProperties = modelLevelProperties(workspace)
  const definitions = collectPropertyDefinitions(workspace, modelProperties, ids, problems)
  const lines: string[] = []

  lines.push('<?xml version="1.0" encoding="UTF-8"?>')
  lines.push(
    `<model xmlns="${NS}" xmlns:xsi="${XSI}" xsi:schemaLocation="${SCHEMA_LOCATION}" identifier="${attr(ids.model)}">`,
  )
  lines.push(`  <name xml:lang="en">${text(workspace.name)}</name>`)
  if (options.documentation) {
    lines.push(`  <documentation xml:lang="en">${text(options.documentation)}</documentation>`)
  }
  lines.push(...propertyLines(modelProperties, definitions, 2))

  if (workspace.elements.length) {
    lines.push('  <elements>')
    for (const element of workspace.elements) {
      const properties = { ...element.properties, ...profileToProperties(element.profile) }
      lines.push(
        `    <element identifier="${attr(ids.of(element.id))}" xsi:type="${attr(exchangeType(element))}">`,
      )
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

  const relationships = workspace.relationships.filter((relationship) => {
    const missing = [relationship.source, relationship.target].find((id) => !ids.knows(id))
    if (missing === undefined) return true
    problems.push(
      problem(
        'warning',
        'exchange.dangling-relationship',
        `Relationship "${relationship.id}" points at "${missing}", which is not in this model. The format cannot reference what is not in the file, so the relationship was left out.`,
        { subject: relationship.id },
      ),
    )
    return false
  })

  if (relationships.length) {
    lines.push('  <relationships>')
    for (const relationship of relationships) {
      const properties = {
        ...relationship.properties,
        ...relationshipProfileToProperties(relationship.profile),
      }
      const accessType =
        relationship.type === 'Access' && relationship.profile?.accessType
          ? ` accessType="${attr(relationship.profile.accessType)}"`
          : ''
      lines.push(
        `    <relationship identifier="${attr(ids.of(relationship.id))}" source="${attr(ids.of(relationship.source))}" target="${attr(ids.of(relationship.target))}"${accessType} xsi:type="${attr(relationship.type)}">`,
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
    for (const [key, definition] of definitions) {
      lines.push(
        `    <propertyDefinition identifier="${attr(definition.id)}" type="${definition.type}">`,
      )
      lines.push(`      <name xml:lang="en">${text(key)}</name>`)
      lines.push('    </propertyDefinition>')
    }
    lines.push('  </propertyDefinitions>')
  }

  lines.push('</model>')
  return { xml: `${lines.join('\n')}\n`, problems }
}

/**
 * The XML alone.
 *
 * Prefer `exportExchange`, which also hands back what it had to rewrite or leave
 * out — a caller that ignores those is back to losing data quietly.
 */
export function exportExchangeXml(
  workspace: Workspace,
  options: ExchangeExportOptions = {},
): string {
  return exportExchange(workspace, options).xml
}

/** The concrete schema type for an element: junctions are And or Or, never bare. */
function exchangeType(element: Element): string {
  if (element.type !== 'Junction') return element.type
  return (element.junctionKind ?? DEFAULT_JUNCTION_KIND) === 'or' ? 'OrJunction' : 'AndJunction'
}

interface ExchangeIdentifiers {
  /** The xs:ID written for the model itself. */
  model: string
  /** The xs:ID written for a concept — its own id, unless that had to be rewritten. */
  of: (id: string) => string
  /** Is this id in the file at all? An IDREF to anything else is unwritable. */
  knows: (id: string) => boolean
  /**
   * An xs:ID nothing else in this file has taken, spelled as close to `base` as
   * possible. Everything written into the document's one `xs:ID` namespace has
   * to come through here — property definitions minted their own `propid-N`
   * beside it, and a model holding an element *called* `propid-1` produced a
   * file with two identical `xs:ID`s that no certified tool will open (#37).
   */
  claim: (base: string) => string
}

/**
 * Map every id in the workspace to a legal xs:ID.
 *
 * xs:ID values are XML names: they cannot start with a digit and cannot contain
 * most punctuation. Ids we generate always qualify (`el-<uuid>`), but ids that
 * arrived in a JSON file need not — the native reader accepts them — and writing
 * one unchanged produced a file no ArchiMate tool would read (#36).
 *
 * Ids that already qualify keep their spelling, and they are all claimed before
 * anything is rewritten so that a rewrite cannot take a name another concept
 * needs.
 */
function exchangeIdentifiers(workspace: Workspace, problems: ImportProblem[]): ExchangeIdentifiers {
  const conceptIds = [...workspace.elements, ...workspace.relationships].map(
    (concept) => concept.id,
  )
  const used = new Set(conceptIds.filter(isExchangeSafeId))
  const byId = new Map<string, string>()

  for (const id of conceptIds) {
    if (byId.has(id)) continue
    if (isExchangeSafeId(id)) {
      byId.set(id, id)
      continue
    }
    const safe = claimIdentifier(id, used)
    byId.set(id, safe)
    problems.push(
      problem(
        'warning',
        'exchange.id-rewritten',
        `"${id}" cannot be used as an XML id, so this file calls it "${safe}". Importing the file back will not restore the original id.`,
        { subject: id },
      ),
    )
  }

  let model = workspace.id
  if (!isExchangeSafeId(model) || used.has(model)) {
    model = claimIdentifier(workspace.id, used)
    problems.push(
      problem(
        'warning',
        'exchange.id-rewritten',
        `The workspace id "${workspace.id}" cannot be used as the model's XML id, so this file calls it "${model}".`,
        { subject: workspace.id },
      ),
    )
  } else {
    used.add(model)
  }

  return {
    model,
    of: (id) => byId.get(id) ?? id,
    knows: (id) => byId.has(id),
    claim: (base) => claimIdentifier(base, used),
  }
}

/** An unused XML name for `id`, close to how it was spelled. */
function claimIdentifier(id: string, used: Set<string>): string {
  const base = sanitiseId(id)
  let candidate = base
  for (let n = 2; used.has(candidate); n += 1) candidate = `${base}-${n}`
  used.add(candidate)
  return candidate
}

function sanitiseId(id: string): string {
  const cleaned = id.replace(/[^A-Za-z0-9_.-]/g, '-')
  return /^[A-Za-z_]/.test(cleaned) ? cleaned : `id-${cleaned}`
}

/** What the workspace carries that the schema has no element for. */
function modelLevelProperties(workspace: Workspace): Record<string, PropertyValue> {
  const out: Record<string, PropertyValue> = {}
  if (workspace.views.length) out[VIEWS_KEY] = canonicalViewsJson(workspace.views)
  const tagGroups = canonicalTagGroupsJson(workspace.tagGroups)
  if (tagGroups !== DEFAULT_TAG_GROUPS_JSON) out[TAG_GROUPS_KEY] = tagGroups
  return out
}

interface PropertyDefinition {
  /** xs:ID of the definition, referenced by every instance of the key. */
  id: string
  /** One of the schema's data types. */
  type: ExchangePropertyType
}

function propertyLines(
  properties: Record<string, PropertyValue>,
  definitions: Map<string, PropertyDefinition>,
  indent: number,
): string[] {
  const keys = Object.keys(properties)
  if (!keys.length) return []
  const pad = ' '.repeat(indent)
  const out = [`${pad}<properties>`]
  for (const key of keys) {
    const definition = definitions.get(key)
    if (!definition) continue
    out.push(`${pad}  <property propertyDefinitionRef="${attr(definition.id)}">`)
    out.push(`${pad}    <value xml:lang="en">${text(String(properties[key]))}</value>`)
    out.push(`${pad}  </property>`)
  }
  out.push(`${pad}</properties>`)
  return out
}

/**
 * One definition per distinct key, typed by the values it actually holds.
 *
 * The type matters on the way back in: written as `string`, `"pii": true` and
 * `"capacity": 42` returned as the strings `"true"` and `"42"`, which broke
 * filters and made the next canonical-JSON export differ from the last (#36).
 * A key used inconsistently — a number here, a word there — falls back to
 * `string`, because the format allows exactly one type per definition.
 */
function collectPropertyDefinitions(
  workspace: Workspace,
  modelProperties: Record<string, PropertyValue>,
  ids: ExchangeIdentifiers,
  problems: ImportProblem[],
): Map<string, PropertyDefinition> {
  const kinds = new Map<string, Set<string>>()
  const remember = (properties: Record<string, PropertyValue>) => {
    for (const [key, value] of Object.entries(properties)) {
      const seen = kinds.get(key)
      if (seen) seen.add(typeof value)
      else kinds.set(key, new Set([typeof value]))
    }
  }

  remember(modelProperties)
  for (const element of workspace.elements) {
    remember(element.properties)
    remember(profileToProperties(element.profile))
  }
  for (const relationship of workspace.relationships) {
    remember(relationship.properties)
    remember(relationshipProfileToProperties(relationship.profile))
  }

  // A Map, not the record itself: the keys are the file's, and `declared['toString']`
  // on a plain object hands back a function (#37, finding 2's shape one file over).
  const declared = new Map(Object.entries(workspace.propertyTypes ?? {}))

  const definitions = new Map<string, PropertyDefinition>()
  for (const [key, seen] of kinds) {
    const derived = definitionType(seen)
    // `currency`, `date` and `time` values are text to us, so `typeof value` can
    // only ever say `string` for them. Where it says exactly that, the file's own
    // declaration is the better information and is written back unchanged (#37).
    const carried = declared.get(key)
    const type =
      derived === 'string' && carried !== undefined && isExchangePropertyType(carried)
        ? carried
        : derived
    if (seen.size > 1) {
      problems.push(
        problem(
          'info',
          'exchange.property-type-mixed',
          `Property "${key}" holds ${[...seen].sort().join(' and ')} values in this model, and the format allows one type per key. It was written as text, so it comes back as text.`,
        ),
      )
    }
    definitions.set(key, { id: ids.claim(`propid-${definitions.size + 1}`), type })
  }
  return definitions
}

function definitionType(seen: Set<string>): ExchangePropertyType {
  if (seen.size !== 1) return 'string'
  const [only] = [...seen]
  return only === 'boolean' || only === 'number' ? only : 'string'
}

function text(value: string): string {
  return (
    value
      // Control characters are illegal in XML 1.0 even as numeric references
      // (only tab, LF and CR survive), so they are stripped rather than written
      // into a file no parser would accept back.
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  )
}

function attr(value: string): string {
  return text(value).replace(/"/g, '&quot;')
}

// ── Import ───────────────────────────────────────────────────────────────────

interface RawNode {
  [key: string]: unknown
}

/** A property definition as the file declares it: the key, and how to read values. */
interface DeclaredProperty {
  key: string
  type: string
}

/** Everything the readers below need, so the argument lists stay honest. */
interface Reader {
  definitions: Map<string, DeclaredProperty>
  /** propertyDefinitionRefs that resolved to nothing — reported once, at the end. */
  unresolved: Set<string>
  problems: ImportProblem[]
  where: { file?: string }
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

  const reader: Reader = {
    definitions: readPropertyDefinitions(model, problems, where),
    unresolved: new Set<string>(),
    problems,
    where,
  }

  const elements: Element[] = []
  const seenIds = new Set<string>()

  for (const raw of list((model.elements as RawNode | undefined)?.element)) {
    const element = readElement(raw, reader)
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
  const seenRelationshipIds = new Set<string>()
  for (const raw of list((model.relationships as RawNode | undefined)?.relationship)) {
    const relationship = readRelationship(raw, seenIds, reader)
    if (!relationship) continue
    if (seenRelationshipIds.has(relationship.id)) {
      problems.push(
        problem(
          'warning',
          'exchange.duplicate-relationship-id',
          `Two relationships share the identifier "${relationship.id}"; the later one was skipped.`,
          { ...where, subject: relationship.id },
        ),
      )
      continue
    }
    seenRelationshipIds.add(relationship.id)
    relationships.push(relationship)
  }

  const modelProperties = readProperties(model, reader)
  const views = carried(modelProperties[VIEWS_KEY], isViewDefinition, 'saved views', reader)
  const tagGroups = carried(modelProperties[TAG_GROUPS_KEY], isTagGroup, 'tag groups', reader)

  reportForeignModelProperties(modelProperties, problems, where)
  reportUnresolvedProperties(reader)
  reportSkipped(model, problems, where)

  const workspace: Workspace = {
    id: asString(model['@identifier']) || 'ws-imported',
    name: langString(model.name) || 'Imported model',
    schemaVersion: SCHEMA_VERSION,
    elements,
    relationships,
    views: views ?? [],
    tagGroups: tagGroups ?? [DEFAULT_TAG_GROUP],
  }
  const propertyTypes = declaredPropertyTypes(reader.definitions)
  if (propertyTypes) workspace.propertyTypes = propertyTypes

  return succeeded(workspace, problems)
}

function readPropertyDefinitions(
  model: RawNode,
  problems: ImportProblem[],
  where: { file?: string },
): Map<string, DeclaredProperty> {
  const definitions = new Map<string, DeclaredProperty>()
  const unknown = new Set<string>()
  const container = model.propertyDefinitions as RawNode | undefined
  for (const raw of list(container?.propertyDefinition)) {
    const id = asString(raw['@identifier'])
    const key = langString(raw.name)
    if (!id || !key) continue
    const type = asString(raw['@type']) ?? 'string'
    if (!isExchangePropertyType(type)) unknown.add(type)
    definitions.set(id, { key, type })
  }
  if (unknown.size) {
    problems.push(
      problem(
        'warning',
        'exchange.property-type-unknown',
        `${unknown.size} property definition${unknown.size === 1 ? '' : 's'} in this file declare${unknown.size === 1 ? 's' : ''} a type the exchange format has no such thing as (${listed([...unknown])}). Those values were read as text, and a re-export declares them as text.`,
        where,
      ),
    )
  }
  return definitions
}

/**
 * The declared types worth remembering on the workspace.
 *
 * `boolean` and `number` are re-derived from the value on the way out, but
 * `currency`, `date` and `time` have no counterpart in `PropertyValue`, so
 * without this the declaration was gone and the re-export said `string` (#37).
 * `string` itself is the default and is not worth a line in the file.
 */
function declaredPropertyTypes(
  definitions: Map<string, DeclaredProperty>,
): Record<string, string> | undefined {
  const out: Record<string, string> = {}
  for (const { key, type } of definitions.values()) {
    if (type === 'string' || !isExchangePropertyType(type)) continue
    if (!Object.hasOwn(out, key)) setKey(out, key, type)
  }
  return Object.keys(out).length ? out : undefined
}

/**
 * The schema's element type, as a model type.
 *
 * The catalogue follows the specification, which has one `Junction`; the schema
 * has two concrete junction types. A bare `Junction` is not schema-valid but
 * tools write it, and the specification says an unqualified junction is an
 * And-junction — so it is read rather than refused.
 */
function readType(raw: string): { type: ElementType; junctionKind?: JunctionKind } | undefined {
  const kind = JUNCTION_TYPES.get(raw)
  if (kind !== undefined || raw === 'Junction') {
    // Absent means `and`, and the canonical writer omits it on that account, so
    // materialising it here made two files holding the same model differ byte
    // for byte on the field the reader had just invented (ADR 0004, #37).
    return kind === undefined || kind === DEFAULT_JUNCTION_KIND
      ? { type: 'Junction' }
      : { type: 'Junction', junctionKind: kind }
  }
  return isElementType(raw) ? { type: raw } : undefined
}

function readElement(raw: RawNode, reader: Reader): Element | undefined {
  const { problems, where } = reader
  const id = asString(raw['@identifier'])
  const type = asString(raw['@type'])
  if (!id) {
    problems.push(
      problem('error', 'exchange.element-no-id', 'An <element> has no identifier.', where),
    )
    return undefined
  }
  const mapped = type ? readType(type) : undefined
  if (!mapped) {
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

  const properties = readProperties(raw, reader)
  const { profile, unread } = readPortfolioProfile(properties)
  reportUnreadProfileKeys(id, unread, reader)
  const element: Element = {
    id,
    type: mapped.type,
    name: langString(raw.name) ?? '',
    properties: stripProfileKeys(properties, unread),
  }
  if (mapped.junctionKind) element.junctionKind = mapped.junctionKind
  const documentation = langString(raw.documentation)
  if (documentation) element.documentation = documentation
  if (profile) element.profile = profile
  return element
}

/**
 * An `archipelago.*` key this build knows but could not read.
 *
 * The value is kept as an ordinary property by `stripProfileKeys`, so nothing is
 * lost — but the assessment the file was trying to express did not arrive, and
 * saying so is the difference between this and the silent drop it replaced (#37).
 */
function reportUnreadProfileKeys(subject: string, unread: readonly string[], reader: Reader): void {
  if (!unread.length) return
  reader.problems.push(
    problem(
      'warning',
      'exchange.profile-value-unreadable',
      `"${subject}" carries ${unread.length} Archipelago propert${unread.length === 1 ? 'y' : 'ies'} (${listed(unread)}) whose value this build cannot read, so ${unread.length === 1 ? 'it was' : 'they were'} kept as ordinary properties rather than as portfolio fields.`,
      { ...reader.where, subject },
    ),
  )
}

function readRelationship(
  raw: RawNode,
  knownIds: Set<string>,
  reader: Reader,
): Relationship | undefined {
  const { problems, where } = reader
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

  const properties = readProperties(raw, reader)
  const read = readRelationshipProfile(properties)
  reportUnreadProfileKeys(id, read.unread, reader)
  const relationship: Relationship = {
    id,
    type,
    source,
    target,
    properties: stripProfileKeys(properties, read.unread),
  }
  const name = langString(raw.name)
  if (name) relationship.name = name

  const profile = read.profile ?? {}
  const accessType = asString(raw['@accessType'])
  if (type === 'Access' && accessType && (ACCESS_TYPES as readonly string[]).includes(accessType)) {
    profile.accessType = accessType as AccessType
  }
  if (Object.keys(profile).length) relationship.profile = profile

  return relationship
}

function readProperties(raw: RawNode, reader: Reader): Record<string, PropertyValue> {
  const out: Record<string, PropertyValue> = {}
  const container = raw.properties as RawNode | undefined
  for (const property of list(container?.property)) {
    const ref = asString(property['@propertyDefinitionRef'])
    const definition = ref ? reader.definitions.get(ref) : undefined
    if (!definition) {
      reader.unresolved.add(ref ?? '(none)')
      continue
    }
    const value = langString(property.value)
    if (value !== undefined) setKey(out, definition.key, typedValue(value, definition.type))
  }
  return out
}

/**
 * A property value in the type its definition declares.
 *
 * A value that does not match its declared type stays a string rather than
 * becoming `NaN` or `false`: the file said one thing and holds another, and
 * guessing would lose what it actually holds.
 *
 * "Matches" means the *text* survives, not just the parse. `Number` is not
 * reversible — `0912345678`, `1.50` and a twenty-digit account number all come
 * back spelled differently, and it is the new spelling that the next export
 * writes into the file (#37). A number we cannot spell back stays the text it
 * was; `currency`, `date` and `time` are text to begin with.
 */
function typedValue(value: string, type: string): PropertyValue {
  if (type === 'boolean') {
    if (value === 'true') return true
    if (value === 'false') return false
    return value
  }
  if (type === 'number') {
    const parsed = Number(value)
    if (value.trim() === '' || !Number.isFinite(parsed)) return value
    return String(parsed) === value ? parsed : value
  }
  return value
}

/**
 * Read back one of the lists the writer carries as a model property. `undefined`
 * means the file carries none, which is not the same as carrying an empty one.
 */
function carried<T>(
  raw: PropertyValue | undefined,
  isValid: (value: unknown) => value is T,
  what: string,
  reader: Reader,
): T[] | undefined {
  if (raw === undefined) return undefined
  let parsed: unknown
  try {
    parsed = typeof raw === 'string' ? JSON.parse(raw) : undefined
  } catch {
    parsed = undefined
  }
  if (!Array.isArray(parsed)) {
    reader.problems.push(
      problem(
        'warning',
        'exchange.carried-unreadable',
        `The ${what} carried by this file could not be read and were dropped.`,
        reader.where,
      ),
    )
    return undefined
  }
  const kept = parsed.filter(isValid)
  if (kept.length !== parsed.length) {
    reader.problems.push(
      problem(
        'warning',
        'exchange.carried-unreadable',
        `${parsed.length - kept.length} of the ${parsed.length} ${what} carried by this file were malformed and were dropped.`,
        reader.where,
      ),
    )
  }
  return kept
}

/** Model-level properties are read for what is ours; the rest have nowhere to go. */
function reportForeignModelProperties(
  modelProperties: Record<string, PropertyValue>,
  problems: ImportProblem[],
  where: { file?: string },
): void {
  const foreign = Object.keys(modelProperties).filter(
    (key) => key !== VIEWS_KEY && key !== TAG_GROUPS_KEY,
  )
  if (!foreign.length) return
  problems.push(
    problem(
      'info',
      'exchange.model-properties-skipped',
      `${foreign.length} model-level propert${foreign.length === 1 ? 'y' : 'ies'} (${listed(foreign)}) ${foreign.length === 1 ? 'was' : 'were'} not imported — Archipelago keeps properties on elements and relationships.`,
      where,
    ),
  )
}

function reportUnresolvedProperties(reader: Reader): void {
  if (!reader.unresolved.size) return
  const refs = [...reader.unresolved]
  reader.problems.push(
    problem(
      'warning',
      'exchange.property-unresolved',
      `${refs.length} property definition${refs.length === 1 ? '' : 's'} referenced by this file ${refs.length === 1 ? 'is' : 'are'} missing (${listed(refs)}), so the values using ${refs.length === 1 ? 'it' : 'them'} could not be read.`,
      reader.where,
    ),
  )
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

/** The first few of a list, for a message that must stay one line. */
function listed(values: readonly string[]): string {
  return values.slice(0, 3).join(', ') + (values.length > 3 ? ', …' : '')
}

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
    if (typeof inner === 'string' || typeof inner === 'number') return String(inner)
    // `<value xml:lang="en"></value>` parses to its attributes alone. The value
    // is the empty string, not "no value" — reading it as absent dropped the
    // property and made the next export differ from this one (#36).
    return ''
  }
  return undefined
}
