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
import { STYLE_KEY, applyCarriedStyle, readCarriedStyle } from './exchange-views'
import { asString, claimIdentifier, isRawNode, list, listed, type RawNode } from './exchange-xml'
import {
  failed,
  problem,
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
  'lineAlpha',
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
  'lineAlpha',
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
  trimValues: true,
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
  routers: number
  specializations: number
  relationshipDocs: number
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
  // must not wave it through (#103).
  const root = xmlRoot(xml)
  if (!root) return failed([rootUnreadable('archimate', where)])
  if (root.local === 'model' && !isArchiNamespace(root.namespace)) {
    return failed([
      problem(
        'error',
        'archimate.wrong-namespace',
        `The root element <${root.local}> is ${root.namespace ? `in the namespace ${root.namespace}` : 'in no namespace'}, not Archi’s (${ARCHI_NAMESPACE}), so this is not an Archi model file.`,
        where,
      ),
    ])
  }
  const rootKey = Object.keys(parsed).find((key) => /(^|:)model$/.test(key))
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
      routers: 0,
      specializations: 0,
      relationshipDocs: 0,
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
  const relationshipIds = new Set<string>()
  for (const member of members) {
    if (classify(member.type) !== 'relationship') continue
    const relationship = readRelationship(member, elementIds, reader)
    if (!relationship) continue
    if (relationshipIds.has(relationship.id)) {
      duplicate(reader, 'relationship', relationship.id)
      continue
    }
    relationshipIds.add(relationship.id)
    relationships.push(relationship)
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
    relationships: relationshipIds,
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
    for (const element of list(top.element)) members.push({ raw: element, type: typeOf(element) })
    walk(list(top.folder), undefined, root)
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
  if (textOf(raw.documentation)) reader.tally.relationshipDocs += 1
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
  const profileIds = (asString(raw['@profiles']) ?? '').split(/\s+/).filter(Boolean)
  const names = profileIds.map((profileId) => reader.profiles.get(profileId)).filter(isString)
  if (names[0] !== undefined && !Object.hasOwn(properties, SPECIALIZATION_KEY)) {
    setKey(properties, SPECIALIZATION_KEY, names[0])
    reader.tally.specializations += 1
    if (names.length > 1) {
      reader.problems.push(
        problem(
          'warning',
          'archimate.specializations-dropped',
          `"${id}" has ${names.length} specializations; only the first, “${names[0]}”, was kept.`,
          { ...reader.where, subject: id },
        ),
      )
    }
  }
  return properties
}

/** `<property key value>`. A property without a value is the empty string, as Archi shows it. */
function readProperties(raw: RawNode, reader: Reader): Record<string, PropertyValue> {
  const out: Record<string, PropertyValue> = {}
  let keyless = 0
  for (const property of list(raw.property)) {
    const key = asString(property['@key'])
    if (key === undefined) {
      keyless += 1
      continue
    }
    setKey(out, key, asString(property['@value']) ?? '')
  }
  if (keyless) {
    const subject = asString(raw['@id'])
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
  relationships: ReadonlySet<string>
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
  if (!id) return undefined
  const name = asString(raw['@name']) ?? ''
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
      const bounds = list(child.bounds)[0] ?? {}
      const x = origin.x + (num(bounds['@x']) ?? 0)
      const y = origin.y + (num(bounds['@y']) ?? 0)
      const node = readNode(child, context, skip)
      let next = parent
      if (node) {
        const size = defaultNodeSize(
          node.kind,
          node.kind === 'element' ? context.elements.get(node.element)?.type : undefined,
        )
        let width = num(bounds['@width']) ?? -1
        let height = num(bounds['@height']) ?? -1
        if (width <= 0 || height <= 0) reader.tally.defaultSized += 1
        if (width <= 0) width = size.width
        if (height <= 0) height = size.height
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
          boxes.set(node.id, box)
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
    const connection = readConnection(rawConnection, boxes, connectionIds, context, skip)
    if (!connection) continue
    if (seen.has(connection.id)) {
      skip(
        'archimate.duplicate-connection-id',
        `two connections share the id "${connection.id}"; the later one was skipped.`,
      )
      continue
    }
    seen.add(connection.id)
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
  const appearance = readAppearance(raw, true)
  if (appearance) node.appearance = appearance
  return node
}

function readConnection(
  raw: RawNode,
  boxes: ReadonlyMap<string, Box>,
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

  const bendpoints = absoluteBendpoints(list(raw.bendpoint), from, to)
  const base = { id, source, target, ...(bendpoints.length ? { bendpoints } : {}) }
  const [, local] = splitType(typeOf(raw))
  let connection: ViewConnection
  if (local === 'Connection') {
    const relationship = asString(raw['@archimateRelationship'])
    if (!relationship || !context.relationships.has(relationship)) {
      skip(
        'archimate.dangling-view-connection',
        `connection "${id}" draws relationship "${relationship ?? '(none)'}", which was not imported. It was skipped.`,
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
  const appearance = readAppearance(raw, false)
  if (appearance) connection.appearance = appearance
  return connection
}

/**
 * Archi stores a bendpoint as two offsets: one from the source shape's centre,
 * one from the target's. It draws the i-th of n at the weighted mean of the two,
 * weight (i + 1) / (n + 1), with integer centres and the result floored (GEF's
 * `RelativeBendpoint`, and Archi's exchange export, which this matches).
 */
function absoluteBendpoints(raws: RawNode[], from: Box, to: Box): Point[] {
  const fromCentre = {
    x: from.x + Math.trunc(from.width / 2),
    y: from.y + Math.trunc(from.height / 2),
  }
  const toCentre = { x: to.x + Math.trunc(to.width / 2), y: to.y + Math.trunc(to.height / 2) }
  return raws.map((raw, i) => {
    const weight = (i + 1) / (raws.length + 1)
    const start = {
      x: fromCentre.x + (num(raw['@startX']) ?? 0),
      y: fromCentre.y + (num(raw['@startY']) ?? 0),
    }
    const end = {
      x: toCentre.x + (num(raw['@endX']) ?? 0),
      y: toCentre.y + (num(raw['@endY']) ?? 0),
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
function readAppearance(raw: RawNode, isNode: boolean): Appearance | undefined {
  const appearance: Appearance = {}
  const fill = colour(raw['@fillColor'], raw['@alpha'])
  if (fill) appearance.fillColor = fill
  const line = colour(raw['@lineColor'], raw['@lineAlpha'])
  if (line) appearance.lineColor = line
  const lineWidth = num(raw['@lineWidth'])
  if (lineWidth !== undefined && lineWidth !== 1 && lineWidth > 0) appearance.lineWidth = lineWidth
  const font = readFont(asString(raw['@font']))
  if (font.name) appearance.fontName = font.name
  if (font.size) appearance.fontSize = font.size
  if (font.style.length) appearance.fontStyle = font.style
  const fontColor = colour(raw['@fontColor'], undefined)
  if (fontColor) appearance.fontColor = fontColor
  if (isNode) {
    const alignment = TEXT_ALIGNMENT_CODES.get(asString(raw['@textAlignment']) ?? '')
    if (alignment) appearance.textAlignment = alignment
    const position = TEXT_POSITION_CODES.get(asString(raw['@textPosition']) ?? '')
    if (position) appearance.textPosition = position
  }
  return Object.keys(appearance).length ? appearance : undefined
}

/** `#rrggbb` plus Archi's 0–255 alpha → `#rrggbb` or `#rrggbbaa`. */
function colour(value: unknown, alpha: unknown): string | undefined {
  const text = asString(value)
  if (!text || !/^#[0-9a-f]{6}$/i.test(text)) return undefined
  const base = text.toLowerCase()
  const a = num(alpha)
  if (a === undefined || a >= 255) return base
  return `${base}${Math.max(0, Math.round(a)).toString(16).padStart(2, '0')}`
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

function countUnsupported(raw: RawNode, known: ReadonlySet<string>, reader: Reader): void {
  for (const key of Object.keys(raw)) {
    if (!key.startsWith('@')) continue
    const name = key.slice(1)
    if (known.has(name) || name.startsWith('xmlns')) continue
    reader.tally.unsupported.set(name, (reader.tally.unsupported.get(name) ?? 0) + 1)
  }
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
  if (tally.relationshipDocs) {
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

function num(value: unknown): number | undefined {
  const text = asString(value)
  if (text === undefined || text.trim() === '') return undefined
  const n = Number(text)
  return Number.isFinite(n) ? n : undefined
}

function isString(value: string | undefined): value is string {
  return value !== undefined
}
