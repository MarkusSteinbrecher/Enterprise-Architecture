import { XMLParser } from 'fast-xml-parser'
import {
  DEFAULT_JUNCTION_KIND,
  DEFAULT_TAG_GROUP,
  FOLDER_ROOT_LABELS,
  SCHEMA_VERSION,
  isElementType,
  isInfluenceModifier,
  isRelationshipType,
  type AccessType,
  type Appearance,
  type Element,
  type ElementType,
  type Folder,
  type FolderRoot,
  type FontStyle,
  type JunctionKind,
  type Point,
  type PropertyValue,
  type Relationship,
  type TextAlignment,
  type TextPosition,
  type View,
  type ViewConnection,
  type ViewNode,
  type Workspace,
} from '@/model'
import { isReportDefinition, isTagGroup } from './canonical-json'
import { defaultNodeSize } from './default-sizes'
import {
  LEGACY_REPORTS_KEY,
  REPORTS_KEY,
  TAG_GROUPS_KEY,
  carried,
  reportForeignModelProperties,
  reportUnreadProfileKeys,
  type ProblemSink,
} from './exchange-format'
import { STYLE_KEY, applyCarriedStyle, drawsEnds, readCarriedStyle } from './exchange-views'
import { asString, claimIdentifier, isRawNode, list, listed, type RawNode } from './exchange-xml'
import {
  failed,
  problem,
  propertyRepeated,
  relationshipDocumentationSkipped,
  succeeded,
  type ImportProblem,
  type ImportResult,
} from './problems'
import {
  readPortfolioProfile,
  readRelationshipProfile,
  stripProfileKeys,
} from './profile-properties'
import { setKey } from './records'
import { ARCHI_NAMESPACE, isArchiNamespace, rootUnreadable, xmlRoot } from './xml-root'

/**
 * Archi's native `.archimate` file (#13): how Archi users arrive.
 *
 * Read directly into the model, not through the exchange format. Archi's file
 * is closer to the model than the exchange format is: bounds are already
 * relative to the parent, colours are written only when someone set them, and
 * it holds things Archi's own exchange export loses (text alignment, a line's
 * name, an empty property value). The readers share what they can: the
 * portfolio-profile properties, the carried reports, tag groups and view style,
 * and the default sizes.
 *
 * `checked-in pairs` in `fixtures/` are each one model saved by Archi and
 * exported by Archi; `archimate-native.test.ts` reads both and compares them.
 * The differences it allows are the places where Archi's export is lossy.
 */

export { ARCHI_NAMESPACE, ARCHI_LEGACY_NAMESPACE } from './xml-root'

/** Is this text an Archi model file rather than an exchange file? Decided by the root's own namespace (#99). */
export function isArchiModel(text: string): boolean {
  return isArchiNamespace(xmlRoot(text)?.namespace)
}

/** Archi's viewpoint ids, as the exchange format (and so the model) spells them. Taken from Archi 5.10's own export. */
const VIEWPOINTS = new Map<string, string>([
  ['application_cooperation', 'Application Cooperation'],
  ['application_usage', 'Application Usage'],
  ['business_process_cooperation', 'Business Process Cooperation'],
  ['capability', 'Capability Map'],
  ['goal_realization', 'Goal Realization'],
  ['implementation_deployment', 'Implementation and Deployment'],
  ['implementation_migration', 'Implementation and Migration'],
  ['information_structure', 'Information Structure'],
  ['layered', 'Layered'],
  ['migration', 'Migration'],
  ['motivation', 'Motivation'],
  ['organization', 'Organization'],
  ['outcome_realization', 'Outcome Realization'],
  ['physical', 'Physical'],
  ['product', 'Product'],
  ['project', 'Project'],
  ['requirements_realization', 'Requirements Realization'],
  ['resource', 'Resource Map'],
  ['service_realization', 'Service Realization'],
  ['stakeholder', 'Stakeholder'],
  ['strategy', 'Strategy'],
  ['technology', 'Technology'],
  ['technology_usage', 'Technology Usage'],
  ['value_stream', 'Value Stream'],
])

/** Archi's top-level folder types. A `Map`: the key comes from the file (#37). */
const TOP_FOLDERS = new Map<string, FolderRoot>([
  ['strategy', 'strategy'],
  ['business', 'business'],
  ['application', 'application'],
  ['technology', 'technology'],
  ['motivation', 'motivation'],
  ['implementation_migration', 'implementation'],
  ['other', 'other'],
  ['relations', 'relations'],
  ['diagrams', 'views'],
])

/** Archi's access codes. Absent is 0, Write: EMF does not write a default. */
const ACCESS_CODES = new Map<string, AccessType>([
  ['0', 'Write'],
  ['1', 'Read'],
  ['2', 'Access'],
  ['3', 'ReadWrite'],
])

const TEXT_ALIGNMENT_CODES = new Map<string, TextAlignment>([
  ['1', 'left'],
  ['2', 'center'],
  ['4', 'right'],
])

const TEXT_POSITION_CODES = new Map<string, TextPosition>([
  ['0', 'top'],
  ['1', 'middle'],
  ['2', 'bottom'],
])

/** What Archi calls a specialization's property when it exports one. */
export const SPECIALIZATION_KEY = 'Specialization'

/** Attributes a shape may carry that are read. Anything else is counted and reported. */
const NODE_ATTRIBUTES = new Set([
  'xsi:type',
  'id',
  'name',
  'archimateElement',
  'targetConnections',
  'model',
  'fillColor',
  'alpha',
  'lineColor',
  'lineWidth',
  'font',
  'fontColor',
  'textAlignment',
  'textPosition',
])

const CONNECTION_ATTRIBUTES = new Set([
  'xsi:type',
  'id',
  'name',
  'source',
  'target',
  'archimateRelationship',
  'targetConnections',
  'lineColor',
  'lineWidth',
  'font',
  'fontColor',
])

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  // Kept, unlike the exchange reader: a junction carries both `xsi:type` and its
  // own `type`, and without the prefix the second overwrote the first.
  removeNSPrefix: false,
  parseAttributeValue: false,
  parseTagValue: false,
  // Archi writes names, keys, values and documentation verbatim, so they are read
  // verbatim: trimming changed them silently, and could merge two keys (#100).
  trimValues: false,
  htmlEntities: true,
})

interface Member {
  raw: RawNode
  type: string
  folder?: string
}

interface Tally {
  defaultSized: number
  onConnections: number
  /** Attribute name → how many objects carried it. */
  unsupported: Map<string, number>
  /** Attribute name → how many objects carried a value Archi would not write. */
  malformed: Map<string, number>
  /** What a view object carried that it cannot hold here → how many times. */
  viewContent: Map<string, number>
  /** Concept kind → what it carried that was not read → the concepts carrying it. */
  conceptContent: Map<'element' | 'relationship', Map<string, string[]>>
  routers: number
  specializations: number
  /** Ids of imported relationships that have documentation. */
  relationshipDocs: string[]
}

interface Reader extends ProblemSink {
  /** Specialization id → its name. */
  profiles: Map<string, string>
  tally: Tally
}

export function importArchimate(xml: string, file?: string): ImportResult {
  const problems: ImportProblem[] = []
  const where = file ? { file } : {}

  let parsed: RawNode
  try {
    parsed = parser.parse(xml) as RawNode
  } catch (error) {
    return failed([
      problem(
        'error',
        'archimate.unparseable',
        `The file is not valid XML: ${error instanceof Error ? error.message : String(error)}`,
        where,
      ),
    ])
  }
  // Any root called `model` parses, so a file in another format would come in
  // empty, ok and silent. The namespace is what makes it Archi's (#99). A root
  // the scan cannot find is refused too: a guard that cannot classify its input
  // must not wave it through (#103). With no root and no model either, the
  // file is not a model at all, and the not-a-model check below says so (#104).
  const root = xmlRoot(xml)
  const rootKey = Object.keys(parsed).find((key) => /(^|:)model$/.test(key))
  if (!root && rootKey) return failed([rootUnreadable('archimate', where)])
  if (root?.local === 'model' && !isArchiNamespace(root.namespace)) {
    return failed([
      problem(
        'error',
        'archimate.wrong-namespace',
        `The root element <${root.local}> is ${root.namespace ? `in the namespace ${root.namespace}` : 'in no namespace'}, not Archi’s (${ARCHI_NAMESPACE}), so this is not an Archi model file.`,
        where,
      ),
    ])
  }
  const model = rootKey ? parsed[rootKey] : undefined
  if (!isRawNode(model)) {
    return failed([
      problem(
        'error',
        'archimate.not-a-model',
        'No <archimate:model> element — this does not look like an Archi model file.',
        where,
      ),
    ])
  }

  const reader: Reader = {
    problems,
    where,
    profiles: readProfiles(model),
    tally: {
      defaultSized: 0,
      onConnections: 0,
      unsupported: new Map(),
      malformed: new Map(),
      viewContent: new Map(),
      conceptContent: new Map(),
      routers: 0,
      specializations: 0,
      relationshipDocs: [],
    },
  }

  const { members, folders } = readFolders(model, reader)

  const elements: Element[] = []
  const elementIds = new Set<string>()
  for (const member of members) {
    const kind = classify(member.type)
    if (kind !== 'element') continue
    const element = readElement(member, reader)
    if (!element) continue
    if (elementIds.has(element.id)) {
      duplicate(reader, 'element', element.id)
      continue
    }
    elementIds.add(element.id)
    elements.push(element)
  }

  const relationships: Relationship[] = []
  const relationshipsById = new Map<string, Relationship>()
  for (const member of members) {
    if (classify(member.type) !== 'relationship') continue
    const relationship = readRelationship(member, elementIds, reader)
    if (!relationship) continue
    if (relationshipsById.has(relationship.id)) {
      duplicate(reader, 'relationship', relationship.id)
      continue
    }
    relationshipsById.set(relationship.id, relationship)
    relationships.push(relationship)
    // Counted only once kept: a skipped relationship's documentation is not lost here (#100).
    if (textOf(member.raw.documentation)) reader.tally.relationshipDocs.push(relationship.id)
  }

  const diagrams = members.filter((member) => classify(member.type) === 'diagram')
  const modelNames = new Map(
    members.map((member) => [
      asString(member.raw['@id']) ?? '',
      asString(member.raw['@name']) ?? '',
    ]),
  )
  for (const member of members) {
    if (classify(member.type) !== 'unsupported-view') continue
    problems.push(
      problem(
        'warning',
        'archimate.view-type-unsupported',
        `“${asString(member.raw['@name']) ?? ''}” is ${describeUnsupported(member.type)}, which Archipelago does not draw. It was skipped.`,
        { ...where, subject: asString(member.raw['@id']) ?? '' },
      ),
    )
  }
  for (const member of members) {
    if (classify(member.type) !== 'unknown') continue
    problems.push(
      problem(
        'error',
        'archimate.unknown-type',
        `"${asString(member.raw['@id']) ?? '(no id)'}" has type "${member.type}", which is not an ArchiMate 3.2 element, relationship or view. It was skipped.`,
        { ...where, subject: asString(member.raw['@id']) ?? '' },
      ),
    )
  }

  const viewIds = new Set(diagrams.map((member) => asString(member.raw['@id'])).filter(isString))
  const context: ViewContext = {
    elements: new Map(elements.map((element) => [element.id, element])),
    relationships: relationshipsById,
    viewIds,
    modelNames,
    reader,
  }
  const views: View[] = []
  const seenViews = new Set<string>()
  for (const member of diagrams) {
    const view = readView(member, context)
    if (!view) continue
    if (seenViews.has(view.id)) {
      duplicate(reader, 'view', view.id)
      continue
    }
    seenViews.add(view.id)
    views.push(view)
  }

  const modelProperties = readProperties(model, reader)
  const reports =
    carried(modelProperties[REPORTS_KEY], isReportDefinition, 'saved reports', reader) ??
    carried(modelProperties[LEGACY_REPORTS_KEY], isReportDefinition, 'saved reports', reader)
  const tagGroups = carried(modelProperties[TAG_GROUPS_KEY], isTagGroup, 'tag groups', reader)
  reportForeignModelProperties(modelProperties, problems, where)
  if (textOf(model.purpose)) {
    problems.push(
      problem(
        'info',
        'archimate.model-purpose-skipped',
        'The model’s purpose text was not imported — Archipelago has no place for it yet.',
        where,
      ),
    )
  }
  reportTally(reader)

  const workspace: Workspace = {
    id: asString(model['@id']) || 'ws-imported',
    name: asString(model['@name']) || 'Imported model',
    schemaVersion: SCHEMA_VERSION,
    elements,
    relationships,
    views,
    folders,
    reports: reports ?? [],
    tagGroups: tagGroups ?? [DEFAULT_TAG_GROUP],
  }
  return succeeded(workspace, problems)
}

// ── Folders ──────────────────────────────────────────────────────────────────

/**
 * Walk Archi's folder tree. Its top-level folders are the model tree's fixed
 * groups (they carry a `type`); every folder below them becomes a `Folder`.
 * Everything Archi files — elements, relationships, views — is an `<element>`
 * somewhere in this tree, so the walk also collects them, with their folder.
 */
function readFolders(model: RawNode, reader: Reader): { members: Member[]; folders: Folder[] } {
  const members: Member[] = []
  const folders: Folder[] = []
  const used = new Set<string>()
  collectIds(model, used)
  const folderProperties: string[] = []
  const topDocumented: string[] = []

  const claim = (raw: RawNode): string => {
    const own = asString(raw['@id'])
    if (own && !used.has(own)) {
      used.add(own)
      return own
    }
    return claimIdentifier(`folder-${own ?? 'unnamed'}`, used)
  }

  const walk = (raws: RawNode[], parent: Folder | undefined, root: FolderRoot) => {
    for (const raw of raws) {
      const folder: Folder = { id: claim(raw), name: asString(raw['@name']) ?? '' }
      const documentation = textOf(raw.documentation)
      if (documentation) folder.documentation = documentation
      if (parent) folder.parent = parent.id
      else folder.root = root
      if (list(raw.property).length) folderProperties.push(folder.name || folder.id)
      folders.push(folder)
      for (const element of list(raw.element)) {
        members.push({ raw: element, type: typeOf(element), folder: folder.id })
      }
      walk(list(raw.folder), folder, root)
    }
  }

  for (const top of list(model.folder)) {
    const type = asString(top['@type']) ?? ''
    let root = TOP_FOLDERS.get(type)
    if (!root) {
      root = 'other'
      reader.problems.push(
        problem(
          'warning',
          'archimate.folder-type-unknown',
          `Top-level folder "${asString(top['@name']) ?? ''}" has type "${type}", which is not one of Archi's; its contents were placed under ${FOLDER_ROOT_LABELS.other}.`,
          reader.where,
        ),
      )
    }
    // A top-level folder is one of the model tree's fixed groups, which hold
    // neither documentation nor properties (#100).
    const name = asString(top['@name']) || FOLDER_ROOT_LABELS[root]
    if (textOf(top.documentation)) topDocumented.push(name)
    if (list(top.property).length) folderProperties.push(name)
    for (const element of list(top.element)) members.push({ raw: element, type: typeOf(element) })
    walk(list(top.folder), undefined, root)
  }

  if (topDocumented.length) {
    reader.problems.push(
      problem(
        'warning',
        'archimate.top-folder-documentation-skipped',
        `${topDocumented.length} top-level folder${topDocumented.length === 1 ? '' : 's'} (${listed(topDocumented)}) carr${topDocumented.length === 1 ? 'ies' : 'y'} documentation. Archipelago's top-level groups are fixed and hold none, so it was not imported.`,
        reader.where,
      ),
    )
  }
  if (folderProperties.length) {
    reader.problems.push(
      problem(
        'warning',
        'archimate.folder-properties-skipped',
        `${folderProperties.length} folder${folderProperties.length === 1 ? '' : 's'} (${listed(folderProperties)}) carr${folderProperties.length === 1 ? 'ies' : 'y'} properties, which Archipelago folders do not hold yet. They were not imported.`,
        reader.where,
      ),
    )
  }
  return { members, folders }
}

/** Every id in the file, so a folder id that collides with one is replaced. */
function collectIds(node: RawNode, out: Set<string>): void {
  for (const element of list(node.element)) {
    const id = asString(element['@id'])
    if (id) out.add(id)
  }
  for (const folder of list(node.folder)) collectIds(folder, out)
}

type MemberKind = 'element' | 'relationship' | 'diagram' | 'unsupported-view' | 'unknown'

function classify(type: string): MemberKind {
  const [prefix, local] = splitType(type)
  if (prefix === 'canvas') return 'unsupported-view'
  if (local === 'ArchimateDiagramModel') return 'diagram'
  if (local === 'SketchModel') return 'unsupported-view'
  if (local.endsWith('Relationship') && isRelationshipType(local.slice(0, -'Relationship'.length)))
    return 'relationship'
  if (local === 'Junction' || isElementType(local)) return 'element'
  return 'unknown'
}

function describeUnsupported(type: string): string {
  const [prefix, local] = splitType(type)
  if (prefix === 'canvas') return 'an Archi canvas'
  if (local === 'SketchModel') return 'an Archi sketch'
  return `a ${local}`
}

/** `archimate:BusinessActor` → `['archimate', 'BusinessActor']`. */
function splitType(type: string): [string, string] {
  const colon = type.indexOf(':')
  return colon < 0 ? ['', type] : [type.slice(0, colon), type.slice(colon + 1)]
}

function typeOf(raw: RawNode): string {
  return asString(raw['@xsi:type']) ?? ''
}

// ── Elements and relationships ───────────────────────────────────────────────

function readElement(member: Member, reader: Reader): Element | undefined {
  const { raw } = member
  const id = asString(raw['@id'])
  if (!id) {
    reader.problems.push(
      problem(
        'error',
        'archimate.element-no-id',
        'An element has no id and was skipped.',
        reader.where,
      ),
    )
    return undefined
  }
  const [, local] = splitType(member.type)
  let type: ElementType
  let junctionKind: JunctionKind | undefined
  if (local === 'Junction') {
    type = 'Junction'
    // Archi writes `type="or"` and leaves an and-junction without one.
    const kind = asString(raw['@type'])
    if (kind === 'or') junctionKind = 'or'
    else if (kind !== undefined && kind !== DEFAULT_JUNCTION_KIND) {
      reader.problems.push(
        problem(
          'warning',
          'archimate.junction-kind-unknown',
          `Junction "${id}" has type "${kind}", which is neither and nor or. It was read as an and-junction.`,
          { ...reader.where, subject: id },
        ),
      )
    }
  } else if (isElementType(local)) type = local
  else return undefined

  checkConceptContent(
    raw,
    id,
    'element',
    local === 'Junction' ? JUNCTION_ATTRIBUTES : ELEMENT_ATTRIBUTES,
    reader,
  )
  const properties = readConceptProperties(raw, id, reader)
  const { profile, unread } = readPortfolioProfile(properties)
  reportUnreadProfileKeys(id, unread, reader)
  const element: Element = {
    id,
    type,
    name: asString(raw['@name']) ?? '',
    properties: stripProfileKeys(properties, unread),
  }
  if (junctionKind) element.junctionKind = junctionKind
  const documentation = textOf(raw.documentation)
  if (documentation) element.documentation = documentation
  if (profile) element.profile = profile
  if (member.folder) element.folder = member.folder
  return element
}

function readRelationship(
  member: Member,
  elementIds: ReadonlySet<string>,
  reader: Reader,
): Relationship | undefined {
  const { raw } = member
  const { problems, where } = reader
  const id = asString(raw['@id'])
  const [, local] = splitType(member.type)
  const type = local.slice(0, -'Relationship'.length)
  if (!id || !isRelationshipType(type)) {
    problems.push(
      problem(
        'error',
        'archimate.relationship-no-id',
        'A relationship has no id and was skipped.',
        where,
      ),
    )
    return undefined
  }
  const source = asString(raw['@source'])
  const target = asString(raw['@target'])
  if (!source || !target || !elementIds.has(source) || !elementIds.has(target)) {
    problems.push(
      problem(
        'warning',
        'archimate.dangling-relationship',
        `Relationship "${id}" does not connect two elements of this model (Archi allows a relationship to end on another relationship; Archipelago does not yet). It was skipped.`,
        { ...where, subject: id },
      ),
    )
    return undefined
  }

  checkConceptContent(raw, id, 'relationship', relationshipAttributes(type), reader)
  const properties = readConceptProperties(raw, id, reader)
  const read = readRelationshipProfile(properties)
  reportUnreadProfileKeys(id, read.unread, reader)
  const relationship: Relationship = {
    id,
    type,
    source,
    target,
    properties: stripProfileKeys(properties, read.unread),
  }
  const name = asString(raw['@name'])
  if (name) relationship.name = name
  const profile = read.profile ?? {}

  if (type === 'Access') {
    const code = asString(raw['@accessType']) ?? '0'
    const accessType = ACCESS_CODES.get(code)
    if (accessType) profile.accessType = accessType
    else {
      problems.push(
        problem(
          'warning',
          'archimate.access-type-unknown',
          `Access relationship "${id}" has access type "${code}", which Archi does not define. It was read without one.`,
          { ...where, subject: id },
        ),
      )
    }
  }
  if (type === 'Association' && asString(raw['@directed']) === 'true')
    relationship.isDirected = true
  if (type === 'Influence') {
    const strength = asString(raw['@strength'])
    if (isInfluenceModifier(strength)) relationship.modifier = strength
  }
  if (Object.keys(profile).length) relationship.profile = profile
  if (member.folder) relationship.folder = member.folder
  return relationship
}

/** A concept's properties, with its specialization carried the way Archi exports it. */
function readConceptProperties(
  raw: RawNode,
  id: string,
  reader: Reader,
): Record<string, PropertyValue> {
  const properties = readProperties(raw, reader)
  const at = { ...reader.where, subject: id }
  const profileIds = (asString(raw['@profiles']) ?? '').split(/\s+/).filter(Boolean)
  const names: string[] = []
  const unknown: string[] = []
  for (const profileId of profileIds) {
    const name = reader.profiles.get(profileId)
    if (name === undefined) unknown.push(profileId)
    else names.push(name)
  }
  if (unknown.length) {
    reader.problems.push(
      problem(
        'warning',
        'archimate.specialization-unknown',
        `"${id}" refers to specialization${unknown.length === 1 ? '' : 's'} "${unknown.join('", "')}", which the file does not define. ${unknown.length === 1 ? 'It was' : 'They were'} not imported.`,
        at,
      ),
    )
  }
  if (names[0] === undefined) return properties
  if (Object.hasOwn(properties, SPECIALIZATION_KEY)) {
    // The property is the user's own; overwriting it would lose that instead (#100).
    reader.problems.push(
      problem(
        'warning',
        'archimate.specialization-shadowed',
        `"${id}" has the specialization “${names[0]}” and also its own “${SPECIALIZATION_KEY}” property, where a specialization is kept. The property was kept and the specialization was not imported.`,
        at,
      ),
    )
    return properties
  }
  setKey(properties, SPECIALIZATION_KEY, names[0])
  reader.tally.specializations += 1
  if (names.length > 1) {
    reader.problems.push(
      problem(
        'warning',
        'archimate.specializations-dropped',
        `"${id}" has ${names.length} specializations; only the first, “${names[0]}”, was kept.`,
        at,
      ),
    )
  }
  return properties
}

/** `<property key value>`. A property without a value is the empty string, as Archi shows it. */
function readProperties(raw: RawNode, reader: Reader): Record<string, PropertyValue> {
  const out: Record<string, PropertyValue> = {}
  let keyless = 0
  const repeated = new Set<string>()
  for (const property of entries(raw.property)) {
    const key = asString(property['@key'])
    if (key === undefined) {
      keyless += 1
      continue
    }
    // Archi allows a key twice; a record holds it once. The first is kept and
    // the rest are reported (#100).
    if (Object.hasOwn(out, key)) repeated.add(key)
    else setKey(out, key, asString(property['@value']) ?? '')
  }
  const subject = asString(raw['@id'])
  if (repeated.size) reader.problems.push(propertyRepeated(subject, [...repeated], reader.where))
  if (keyless) {
    reader.problems.push(
      problem(
        'warning',
        'archimate.property-no-key',
        `${keyless} propert${keyless === 1 ? 'y has' : 'ies have'} no name; ${keyless === 1 ? 'its value was' : 'their values were'} not imported.`,
        subject === undefined ? reader.where : { ...reader.where, subject },
      ),
    )
  }
  return out
}

function readProfiles(model: RawNode): Map<string, string> {
  const out = new Map<string, string>()
  for (const profile of list(model.profile)) {
    const id = asString(profile['@id'])
    const name = asString(profile['@name'])
    if (id && name) out.set(id, name)
  }
  return out
}

// ── Views ────────────────────────────────────────────────────────────────────

interface ViewContext {
  elements: ReadonlyMap<string, Element>
  relationships: ReadonlyMap<string, Relationship>
  /** Views this import will hold: what a view reference may point at. */
  viewIds: ReadonlySet<string>
  /** Every model object's name, for a reference to a view that was not imported. */
  modelNames: ReadonlyMap<string, string>
  reader: Reader
}

/** A shape's absolute bounds, which bendpoints are computed from. */
interface Box {
  x: number
  y: number
  width: number
  height: number
}

function readView(member: Member, context: ViewContext): View | undefined {
  const { raw } = member
  const { reader } = context
  const id = asString(raw['@id'])
  const name = asString(raw['@name']) ?? ''
  if (!id) {
    reader.problems.push(
      problem(
        'error',
        'archimate.view-no-id',
        `A view${name ? ` (“${name}”)` : ''} has no id and was skipped.`,
        reader.where,
      ),
    )
    return undefined
  }
  const at = { ...reader.where, subject: id }
  const skip = (code: string, message: string) =>
    reader.problems.push(problem('warning', code, `View "${name || id}": ${message}`, at))

  const { [STYLE_KEY]: carriedRaw, ...properties } = readProperties(raw, reader)
  const view: View = { id, name, properties, nodes: [], connections: [] }
  const documentation = textOf(raw.documentation)
  if (documentation) view.documentation = documentation
  const viewpoint = asString(raw['@viewpoint'])
  if (viewpoint) {
    const mapped = VIEWPOINTS.get(viewpoint)
    if (mapped) view.viewpoint = mapped
    else
      skip(
        'archimate.viewpoint-unknown',
        `viewpoint "${viewpoint}" is not one Archipelago knows; the view was read without one.`,
      )
  }
  if (raw['@connectionRouterType'] !== undefined) reader.tally.routers += 1
  if (member.folder) view.folder = member.folder

  const boxes = new Map<string, Box>()
  const nodesById = new Map<string, ViewNode>()
  /** Shapes that carry connections, with the connection elements on them. */
  const owners: RawNode[] = []

  /**
   * Archi's bounds are relative to the parent shape. A shape that is skipped
   * still moves its children, so they are placed relative to the nearest
   * ancestor that was kept.
   */
  const walk = (raws: RawNode[], parent: { id: string; box: Box } | undefined, origin: Point) => {
    for (const child of raws) {
      owners.push(child)
      countUnsupported(child, NODE_ATTRIBUTES, reader)
      const bounds = entries(child.bounds)[0] ?? {}
      const x = origin.x + (measured(bounds, 'x', reader) ?? 0)
      const y = origin.y + (measured(bounds, 'y', reader) ?? 0)
      const node = readNode(child, context, skip)
      let next = parent
      if (node) {
        const size = defaultNodeSize(
          node.kind,
          node.kind === 'element' ? context.elements.get(node.element)?.type : undefined,
        )
        // Absent or not positive is Archi's default size, which it does not
        // record. Malformed is not: it was tallied as such (#100).
        let archiSized = false
        const sized = (key: 'width' | 'height'): number | undefined => {
          const value = measured(bounds, key, reader)
          if (value === undefined ? bounds[`@${key}`] === undefined : value <= 0) archiSized = true
          return value !== undefined && value > 0 ? value : undefined
        }
        const width = sized('width') ?? size.width
        const height = sized('height') ?? size.height
        if (archiSized) reader.tally.defaultSized += 1
        const box: Box = { x, y, width, height }
        node.bounds = {
          x: x - (parent?.box.x ?? 0),
          y: y - (parent?.box.y ?? 0),
          width,
          height,
        }
        if (parent) node.parent = parent.id
        if (boxes.has(node.id)) {
          skip(
            'archimate.duplicate-node-id',
            `two shapes share the id "${node.id}"; the later one was skipped.`,
          )
        } else {
          checkViewContent(child, node, reader)
          boxes.set(node.id, box)
          nodesById.set(node.id, node)
          view.nodes.push(node)
          next = { id: node.id, box }
        }
      }
      walk(list(child.child), next, { x, y })
    }
  }
  walk(list(raw.child), undefined, { x: 0, y: 0 })

  const rawConnections = owners.flatMap((owner) => list(owner.sourceConnection))
  const connectionIds = new Set(rawConnections.map((c) => asString(c['@id'])).filter(isString))
  const seen = new Set<string>()
  for (const rawConnection of rawConnections) {
    countUnsupported(rawConnection, CONNECTION_ATTRIBUTES, reader)
    const connection = readConnection(rawConnection, boxes, nodesById, connectionIds, context, skip)
    if (!connection) continue
    if (seen.has(connection.id)) {
      skip(
        'archimate.duplicate-connection-id',
        `two connections share the id "${connection.id}"; the later one was skipped.`,
      )
      continue
    }
    seen.add(connection.id)
    checkViewContent(rawConnection, connection, reader)
    view.connections.push(connection)
  }

  applyCarriedStyle(view, readCarriedStyle(carriedRaw), reader.problems, at)
  return view
}

function readNode(
  raw: RawNode,
  context: ViewContext,
  skip: (code: string, message: string) => void,
): ViewNode | undefined {
  const id = asString(raw['@id'])
  if (!id) {
    skip(
      'archimate.node-no-id',
      'a shape has no id and was skipped; anything nested in it was kept.',
    )
    return undefined
  }
  const base = { id, bounds: { x: 0, y: 0, width: 0, height: 0 } }
  const [, local] = splitType(typeOf(raw))
  let node: ViewNode
  switch (local) {
    case 'DiagramObject': {
      const element = asString(raw['@archimateElement'])
      if (!element || !context.elements.has(element)) {
        skip(
          'archimate.dangling-view-node',
          `shape "${id}" draws element "${element ?? '(none)'}", which was not imported. It was skipped; anything nested in it was kept.`,
        )
        return undefined
      }
      node = { ...base, kind: 'element', element }
      break
    }
    case 'Group': {
      node = { ...base, kind: 'group', name: asString(raw['@name']) ?? '' }
      const documentation = textOf(raw.documentation)
      if (documentation) node.documentation = documentation
      break
    }
    case 'Note':
      node = { ...base, kind: 'note', text: textOf(raw.content) ?? '' }
      break
    case 'DiagramModelReference': {
      const ref = asString(raw['@model'])
      if (ref !== undefined && context.viewIds.has(ref)) {
        node = { ...base, kind: 'view-ref', view: ref }
      } else {
        const target = ref === undefined ? undefined : context.modelNames.get(ref)
        skip(
          'archimate.dangling-view-reference',
          `shape "${id}" refers to ${target === undefined ? `"${ref ?? '(none)'}", which is not in the file` : `“${target}”, which was not imported`}. It was kept as a note.`,
        )
        node = { ...base, kind: 'note', text: target ?? '' }
      }
      break
    }
    default:
      skip(
        'archimate.node-type-unsupported',
        `shape "${id}" is ${local ? `a ${local}` : 'untyped'}, which Archipelago does not draw. It was skipped; anything nested in it was kept.`,
      )
      return undefined
  }
  // Archi centres a label it has no alignment for, and writes none at its
  // default. Archipelago draws these three left by default, so the centre is
  // said out loud; elsewhere the two defaults agree (#100).
  const centred =
    node.kind === 'note' ||
    node.kind === 'group' ||
    (node.kind === 'element' && context.elements.get(node.element)?.type === 'Grouping')
  const appearance = readAppearance(raw, context.reader, { node: true, centred })
  if (appearance) node.appearance = appearance
  return node
}

function readConnection(
  raw: RawNode,
  boxes: ReadonlyMap<string, Box>,
  nodesById: ReadonlyMap<string, ViewNode>,
  connectionIds: ReadonlySet<string>,
  context: ViewContext,
  skip: (code: string, message: string) => void,
): ViewConnection | undefined {
  const id = asString(raw['@id'])
  const source = asString(raw['@source'])
  const target = asString(raw['@target'])
  if (!id || !source || !target) {
    skip(
      'archimate.connection-incomplete',
      'a connection without an id, source or target was skipped.',
    )
    return undefined
  }
  const from = boxes.get(source)
  const to = boxes.get(target)
  if (!from || !to) {
    const unknown = [source, target].filter((end) => !boxes.has(end))
    if (unknown.every((end) => connectionIds.has(end))) context.reader.tally.onConnections += 1
    else {
      skip(
        'archimate.dangling-view-connection',
        `connection "${id}" ends on "${unknown.join('", "')}", which is not a shape in the view. It was skipped.`,
      )
    }
    return undefined
  }

  const bendpoints = absoluteBendpoints(entries(raw.bendpoint), from, to, context.reader)
  const base = { id, source, target, ...(bendpoints.length ? { bendpoints } : {}) }
  // EMF writes no `xsi:type` when it is the reference's own type, which for a
  // shape's connections is the plain line. Only a re-save by Archi showed it (#100).
  const [, local] = splitType(typeOf(raw) || 'archimate:DiagramModelConnection')
  let connection: ViewConnection
  if (local === 'Connection') {
    const relationship = asString(raw['@archimateRelationship'])
    const drawn = relationship === undefined ? undefined : context.relationships.get(relationship)
    if (!relationship || !drawn) {
      skip(
        'archimate.dangling-view-connection',
        `connection "${id}" draws relationship "${relationship ?? '(none)'}", which was not imported. It was skipped.`,
      )
      return undefined
    }
    if (!drawsEnds(drawn, nodesById.get(source), nodesById.get(target))) {
      skip(
        'archimate.connection-mismatch',
        `connection "${id}" draws ${drawn.type} relationship "${relationship}" between shapes that do not show its source and target. It was skipped.`,
      )
      return undefined
    }
    connection = { ...base, kind: 'relationship', relationship }
  } else if (local === 'DiagramModelConnection') {
    connection = { ...base, kind: 'line' }
    const name = asString(raw['@name'])
    if (name) connection.name = name
  } else {
    skip(
      'archimate.connection-type-unsupported',
      `connection "${id}" is ${local ? `a ${local}` : 'untyped'}, which Archipelago does not draw. It was skipped.`,
    )
    return undefined
  }
  const appearance = readAppearance(raw, context.reader, { node: false, centred: false })
  if (appearance) connection.appearance = appearance
  return connection
}

/**
 * Archi stores a bendpoint as two offsets: one from the source shape's centre,
 * one from the target's. It draws the i-th of n at the weighted mean of the two,
 * weight (i + 1) / (n + 1), with integer centres and the result floored (GEF's
 * `RelativeBendpoint`, and Archi's exchange export, which this matches).
 */
function absoluteBendpoints(raws: RawNode[], from: Box, to: Box, reader: Reader): Point[] {
  const fromCentre = {
    x: from.x + Math.trunc(from.width / 2),
    y: from.y + Math.trunc(from.height / 2),
  }
  const toCentre = { x: to.x + Math.trunc(to.width / 2), y: to.y + Math.trunc(to.height / 2) }
  return raws.map((raw, i) => {
    const weight = (i + 1) / (raws.length + 1)
    const start = {
      x: fromCentre.x + (measured(raw, 'startX', reader) ?? 0),
      y: fromCentre.y + (measured(raw, 'startY', reader) ?? 0),
    }
    const end = {
      x: toCentre.x + (measured(raw, 'endX', reader) ?? 0),
      y: toCentre.y + (measured(raw, 'endY', reader) ?? 0),
    }
    return {
      x: Math.floor((1 - weight) * start.x + weight * end.x + 1e-9),
      y: Math.floor((1 - weight) * start.y + weight * end.y + 1e-9),
    }
  })
}

/**
 * Archi writes a colour or font only when someone set it, so everything here is
 * an override — unlike the exchange export, which writes Archi's defaults on
 * every object for the reader to recognise and drop.
 */
function readAppearance(
  raw: RawNode,
  reader: Reader,
  object: { node: boolean; centred: boolean },
): Appearance | undefined {
  const appearance: Appearance = {}
  const fill = colour(raw, 'fillColor', 'alpha', measured(raw, 'alpha', reader), reader)
  if (fill) appearance.fillColor = fill
  const lineAlpha = featureNumber(raw, LINE_ALPHA, reader)
  const line = colour(raw, 'lineColor', LINE_ALPHA, lineAlpha, reader)
  if (line) appearance.lineColor = line
  const lineWidth = measured(raw, 'lineWidth', reader)
  if (lineWidth !== undefined && lineWidth !== 1 && lineWidth > 0) appearance.lineWidth = lineWidth
  const font = readFont(asString(raw['@font']))
  if (font.name) appearance.fontName = font.name
  if (font.size) appearance.fontSize = font.size
  if (font.style.length) appearance.fontStyle = font.style
  const fontColor = colour(raw, 'fontColor', undefined, undefined, reader)
  if (fontColor) appearance.fontColor = fontColor
  if (object.node) {
    const alignment = coded(raw, 'textAlignment', TEXT_ALIGNMENT_CODES, reader)
    if (alignment) appearance.textAlignment = alignment
    else if (raw['@textAlignment'] === undefined && object.centred) {
      appearance.textAlignment = 'center'
    }
    const position = coded(raw, 'textPosition', TEXT_POSITION_CODES, reader)
    if (position) appearance.textPosition = position
  }
  return Object.keys(appearance).length ? appearance : undefined
}

/**
 * `#rrggbb` plus Archi's 0–255 alpha → `#rrggbb` or `#rrggbbaa`. Archi applies
 * an alpha to the default colour too, and that colour has no value here, so an
 * alpha on its own is reported rather than dropped (#100).
 */
function colour(
  raw: RawNode,
  key: string,
  alphaKey: string | undefined,
  a: number | undefined,
  reader: Reader,
): string | undefined {
  const value = raw[`@${key}`]
  if (value === undefined) {
    if (alphaKey !== undefined && a !== undefined && a < 255) {
      bump(reader.tally.unsupported, `${alphaKey} without ${key}`)
    }
    return undefined
  }
  const text = asString(value)
  if (!text || !/^#[0-9a-f]{6}$/i.test(text)) {
    bump(reader.tally.malformed, key)
    return undefined
  }
  const base = text.toLowerCase()
  if (a === undefined || a >= 255) return base
  return `${base}${Math.max(0, Math.round(a)).toString(16).padStart(2, '0')}`
}

/** One of Archi's numeric codes; a value it does not define is tallied as malformed. */
function coded<T>(
  raw: RawNode,
  key: string,
  codes: ReadonlyMap<string, T>,
  reader: Reader,
): T | undefined {
  const value = raw[`@${key}`]
  if (value === undefined) return undefined
  const mapped = codes.get(asString(value) ?? '')
  if (mapped === undefined) bump(reader.tally.malformed, key)
  return mapped
}

/**
 * SWT's font string: `version|name|height|style|platform|…`. Style is a bit set:
 * 1 bold, 2 italic.
 */
function readFont(value: string | undefined): { name?: string; size?: number; style: FontStyle[] } {
  if (!value) return { style: [] }
  const [, name, height, style] = value.split('|')
  const size = Number(height)
  const bits = Number(style) || 0
  const styles: FontStyle[] = []
  if (bits & 1) styles.push('bold')
  if (bits & 2) styles.push('italic')
  return {
    ...(name ? { name } : {}),
    ...(Number.isFinite(size) && size > 0 ? { size: Math.round(size * 100) / 100 } : {}),
    style: styles,
  }
}

/**
 * Display settings Archi added after its first file format are `<feature>`
 * children, not attributes (`IDiagramModelObject.FEATURE_*` and its kin in
 * Archi 5.10). `lineAlpha` is read; the rest are counted with the unsupported
 * attributes. Any other feature is content, reported by `checkViewContent`.
 */
const LINE_ALPHA = 'lineAlpha'
const DISPLAY_FEATURES: ReadonlySet<string> = new Set([
  'gradient',
  'iconVisible',
  'iconColor',
  'deriveElementLineColor',
  'lineStyle',
  'hideJunctionArrows',
  'imageSource',
  'nameVisible',
  'textRelativePosition',
])
const isAppearanceFeature = (name: string) => name === LINE_ALPHA || DISPLAY_FEATURES.has(name)

/** A feature's value as a number; present but not a number is malformed. */
function featureNumber(raw: RawNode, name: string, reader: Reader): number | undefined {
  const feature = list(raw.feature).find((f) => asString(f['@name']) === name)
  if (feature === undefined) return undefined
  const n = num(feature['@value'])
  if (n === undefined) bump(reader.tally.malformed, name)
  return n
}

function countUnsupported(raw: RawNode, known: ReadonlySet<string>, reader: Reader): void {
  for (const key of Object.keys(raw)) {
    if (!key.startsWith('@')) continue
    const name = key.slice(1)
    if (known.has(name) || name.startsWith('xmlns')) continue
    bump(reader.tally.unsupported, name)
  }
  for (const feature of list(raw.feature)) {
    const name = asString(feature['@name']) ?? ''
    if (DISPLAY_FEATURES.has(name)) bump(reader.tally.unsupported, name)
  }
}

/** What each kind of view object reads among its child elements. */
const NODE_CHILDREN: Record<ViewNode['kind'], ReadonlySet<string>> = {
  element: new Set(['bounds', 'child', 'sourceConnection']),
  group: new Set(['bounds', 'child', 'sourceConnection', 'documentation']),
  note: new Set(['bounds', 'child', 'sourceConnection', 'content']),
  'view-ref': new Set(['bounds', 'child', 'sourceConnection']),
}
const CONNECTION_CHILDREN: ReadonlySet<string> = new Set(['bendpoint'])

const VIEW_OBJECT_LABELS: Record<ViewNode['kind'] | ViewConnection['kind'], string> = {
  element: 'an element’s shape',
  group: 'a group',
  note: 'a note',
  'view-ref': 'a view reference',
  relationship: 'a relationship’s connection',
  line: 'a line',
}

/**
 * The child elements of a shape or connection that it has no place for here:
 * properties on a note or a line, a line's documentation, a label expression
 * (#100). Attributes are `countUnsupported`'s.
 */
function checkViewContent(raw: RawNode, object: ViewNode | ViewConnection, reader: Reader): void {
  const known =
    object.kind === 'relationship' || object.kind === 'line'
      ? CONNECTION_CHILDREN
      : NODE_CHILDREN[object.kind]
  for (const what of unreadChildren(raw, known, isAppearanceFeature)) {
    bump(reader.tally.viewContent, `${what} on ${VIEW_OBJECT_LABELS[object.kind]}`)
  }
}

/** Attributes an element or relationship carries that are read; anything else is reported. */
const CONCEPT_ATTRIBUTES = ['xsi:type', 'id', 'name', 'profiles']
const ELEMENT_ATTRIBUTES: ReadonlySet<string> = new Set(CONCEPT_ATTRIBUTES)
const JUNCTION_ATTRIBUTES: ReadonlySet<string> = new Set([...CONCEPT_ATTRIBUTES, 'type'])
const RELATIONSHIP_ATTRIBUTES = [...CONCEPT_ATTRIBUTES, 'source', 'target']
const TYPED_RELATIONSHIP_ATTRIBUTES = new Map<string, ReadonlySet<string>>([
  ['Access', new Set([...RELATIONSHIP_ATTRIBUTES, 'accessType'])],
  ['Association', new Set([...RELATIONSHIP_ATTRIBUTES, 'directed'])],
  ['Influence', new Set([...RELATIONSHIP_ATTRIBUTES, 'strength'])],
])
const PLAIN_RELATIONSHIP_ATTRIBUTES: ReadonlySet<string> = new Set(RELATIONSHIP_ATTRIBUTES)

function relationshipAttributes(type: string): ReadonlySet<string> {
  return TYPED_RELATIONSHIP_ATTRIBUTES.get(type) ?? PLAIN_RELATIONSHIP_ATTRIBUTES
}
const CONCEPT_CHILDREN: ReadonlySet<string> = new Set(['documentation', 'property'])

/** What an element or relationship carries that is not read: an unknown attribute or child (#100). */
function checkConceptContent(
  raw: RawNode,
  id: string,
  kind: 'element' | 'relationship',
  attributes: ReadonlySet<string>,
  reader: Reader,
): void {
  const unread = unreadChildren(raw, CONCEPT_CHILDREN, () => false)
  for (const key of Object.keys(raw)) {
    if (!key.startsWith('@')) continue
    const name = key.slice(1)
    if (!attributes.has(name) && !name.startsWith('xmlns')) unread.push(`the attribute “${name}”`)
  }
  if (!unread.length) return
  let byWhat = reader.tally.conceptContent.get(kind)
  if (!byWhat) reader.tally.conceptContent.set(kind, (byWhat = new Map()))
  for (const what of unread) {
    const ids = byWhat.get(what)
    if (ids) ids.push(id)
    else byWhat.set(what, [id])
  }
}

/**
 * Describe each child element of `raw` not in `known`, one entry per child. A
 * `<feature>` is named by its own name, the way Archi stores label expressions
 * and other settings it added after its first file format; `accounted` says
 * which features are read or reported elsewhere.
 */
function unreadChildren(
  raw: RawNode,
  known: ReadonlySet<string>,
  accounted: (feature: string) => boolean,
): string[] {
  const out: string[] = []
  for (const [key, value] of Object.entries(raw)) {
    if (key.startsWith('@') || known.has(key)) continue
    if (key === '#text') {
      // Indentation between child elements, now that values are not trimmed.
      if (typeof value === 'string' && value.trim() === '') continue
      out.push('text')
    } else if (key === 'feature') {
      for (const feature of list(value)) {
        const name = asString(feature['@name']) ?? ''
        if (accounted(name)) continue
        out.push(name === 'labelExpression' ? 'a label expression' : `the feature “${name}”`)
      }
    } else if (key === 'property') out.push('properties')
    else if (key === 'documentation') out.push('documentation')
    else out.push(`<${key}>`)
  }
  return out
}

// ── Reporting ────────────────────────────────────────────────────────────────

function reportTally(reader: Reader): void {
  const { tally, problems, where } = reader
  if (tally.defaultSized) {
    problems.push(
      problem(
        'info',
        'archimate.default-size',
        `${tally.defaultSized} shape${tally.defaultSized === 1 ? ' was' : 's were'} left at Archi's default size, which the file does not record. ${tally.defaultSized === 1 ? 'It was' : 'They were'} drawn at Archi's standard defaults (120 × 55 for an element).`,
        where,
      ),
    )
  }
  if (tally.onConnections) {
    problems.push(
      problem(
        'warning',
        'archimate.connection-on-connection',
        `${tally.onConnections} connection${tally.onConnections === 1 ? '' : 's'} ended on another connection rather than on a shape. Archipelago does not draw those yet, so ${tally.onConnections === 1 ? 'it was' : 'they were'} skipped.`,
        where,
      ),
    )
  }
  if (tally.unsupported.size) {
    const names = [...tally.unsupported.keys()].sort()
    problems.push(
      problem(
        'info',
        'archimate.appearance-unsupported',
        `Some shapes and lines use Archi display settings Archipelago does not support yet (${listed(names)}); they are drawn without them.`,
        where,
      ),
    )
  }
  if (tally.malformed.size) {
    const names = [...tally.malformed.keys()].sort()
    problems.push(
      problem(
        'warning',
        'archimate.value-malformed',
        `Some shapes and lines hold values Archi does not write (${listed(names)}). A malformed position or bendpoint offset was read as 0, a size as Archi's default, and a colour, line width or text placement as not set.`,
        where,
      ),
    )
  }
  if (tally.viewContent.size) {
    const found = [...tally.viewContent].map(([what, count]) => `${what} (${count})`).sort()
    problems.push(
      problem(
        'warning',
        'archimate.view-content-skipped',
        `Some objects in views carry what Archipelago cannot hold on them yet: ${found.join(', ')}. It was not imported.`,
        where,
      ),
    )
  }
  for (const [kind, byWhat] of tally.conceptContent) {
    for (const [what, ids] of byWhat) {
      const n = ids.length
      problems.push(
        problem(
          'warning',
          'archimate.content-unread',
          `${n} ${kind}${n === 1 ? '' : 's'} (${listed(ids)}) carr${n === 1 ? 'ies' : 'y'} ${what}, which Archipelago does not read. It was not imported.`,
          n === 1 && ids[0] !== undefined ? { ...where, subject: ids[0] } : where,
        ),
      )
    }
  }
  if (tally.routers) {
    problems.push(
      problem(
        'info',
        'archimate.router-unsupported',
        `${tally.routers} view${tally.routers === 1 ? ' uses' : 's use'} a connection router other than Archi's default. Archipelago draws connections through their bendpoints only.`,
        where,
      ),
    )
  }
  if (tally.relationshipDocs.length) {
    problems.push(relationshipDocumentationSkipped(tally.relationshipDocs, where))
  }
  if (tally.specializations) {
    problems.push(
      problem(
        'info',
        'archimate.specialization-as-property',
        `${tally.specializations} element${tally.specializations === 1 ? ' has a specialization' : 's have specializations'}. Archipelago has none yet, so each was kept as a “${SPECIALIZATION_KEY}” property, as Archi's exchange export does.`,
        where,
      ),
    )
  }
}

function duplicate(reader: Reader, what: string, id: string): void {
  reader.problems.push(
    problem(
      'warning',
      'archimate.duplicate-id',
      `Two ${what}s share the id "${id}"; the later one was skipped.`,
      { ...reader.where, subject: id },
    ),
  )
}

// ── Values ───────────────────────────────────────────────────────────────────

/** A text child (`documentation`, `content`, `purpose`). */
function textOf(value: unknown): string | undefined {
  if (typeof value === 'string') return value || undefined
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value)) return textOf(value[0])
  if (isRawNode(value)) return textOf(value['#text'])
  return undefined
}

/**
 * A number attribute. Present but not a number is tallied as malformed rather
 * than read as absent: `x="1e"` came in at 0 without a word (#100).
 */
function measured(raw: RawNode, key: string, reader: Reader): number | undefined {
  const value = raw[`@${key}`]
  if (value === undefined) return undefined
  const n = num(value)
  if (n === undefined) bump(reader.tally.malformed, key)
  return n
}

/**
 * Like `list`, but an element with neither attributes nor content is an empty
 * node rather than nothing. EMF writes a bendpoint at 0, 0 as `<bendpoint/>`,
 * which the parser hands over as `''`, and `list` dropped it (#100).
 */
function entries(value: unknown): RawNode[] {
  if (value === undefined || value === null) return []
  return (Array.isArray(value) ? value : [value])
    .map((item: unknown) => (item === '' ? {} : item))
    .filter(isRawNode)
}

function bump(counts: Map<string, number>, key: string): void {
  counts.set(key, (counts.get(key) ?? 0) + 1)
}

function num(value: unknown): number | undefined {
  const text = asString(value)
  if (text === undefined || text.trim() === '') return undefined
  const n = Number(text)
  return Number.isFinite(n) ? n : undefined
}

function isString(value: string | undefined): value is string {
  return value !== undefined
}
