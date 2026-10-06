import { ELEMENT_TYPES, type ElementType } from './element-types'
import type { Layer } from './layers'

/**
 * The ArchiMate 3.2 viewpoints (#130): for each, the element types a view drawn
 * from it may hold. The palette offers only these.
 *
 * The table is ours and is checked against Archi 5.10's `viewpoints.xml`
 * (vendored unmodified in `./archi/`) by `viewpoints.test.ts`, which reads the
 * file and expands its `$…Elements$` groups as Archi's `ViewpointManager` does.
 * So a type missing here, or one too many, fails the test.
 *
 * - **`id`** is Archi's, as an `.archimate` file spells it (`application_cooperation`).
 * - **`name`** is how the exchange format spells it, and how `View.viewpoint`
 *   holds it (`Application Cooperation`).
 * - **`types: 'all'`** is a viewpoint that restricts nothing (Layered), as
 *   Archi's empty concept list is.
 *
 * Junction and Grouping are allowed in every viewpoint, whatever the list says:
 * Archi's `Viewpoint.isAllowedConcept` adds them to every viewpoint (its
 * `defaultList`, read with `javap`). Flagging elements of other types already in
 * a view is M3.
 */
export interface Viewpoint {
  readonly id: string
  readonly name: string
  readonly types: readonly ElementType[] | 'all'
}

/** Every element type of one layer, in catalogue order: Archi's `$…Elements$` groups. */
function layer(name: Layer): ElementType[] {
  return ELEMENT_TYPES.filter((meta) => meta.layer === name).map((meta) => meta.type)
}

/** In every viewpoint, whatever its list: Archi's `Viewpoint.defaultList`. */
export const ALWAYS_ALLOWED: readonly ElementType[] = ['Junction', 'Grouping']

// In Archi's file order, which is the order its viewpoint menu shows them in.
export const VIEWPOINTS: readonly Viewpoint[] = [
  {
    id: 'organization',
    name: 'Organization',
    types: [
      'BusinessActor',
      'BusinessCollaboration',
      'BusinessInterface',
      'BusinessRole',
      'Location',
    ],
  },
  {
    id: 'business_process_cooperation',
    name: 'Business Process Cooperation',
    types: [
      ...layer('application'),
      'BusinessActor',
      'BusinessCollaboration',
      'BusinessEvent',
      'BusinessFunction',
      'BusinessInteraction',
      'BusinessInterface',
      'BusinessObject',
      'BusinessProcess',
      'BusinessRole',
      'BusinessService',
      'Location',
      'Representation',
    ],
  },
  {
    id: 'product',
    name: 'Product',
    types: [
      ...layer('application'),
      'Artifact',
      'BusinessActor',
      'BusinessCollaboration',
      'BusinessEvent',
      'BusinessFunction',
      'BusinessInteraction',
      'BusinessInterface',
      'BusinessObject',
      'BusinessProcess',
      'BusinessRole',
      'BusinessService',
      'Contract',
      'Material',
      'Product',
      'TechnologyService',
      'Value',
    ],
  },
  {
    id: 'application_cooperation',
    name: 'Application Cooperation',
    types: [...layer('application'), 'Location'],
  },
  {
    id: 'application_structure',
    name: 'Application Structure',
    types: [
      'ApplicationComponent',
      'ApplicationCollaboration',
      'ApplicationInterface',
      'DataObject',
    ],
  },
  {
    id: 'application_usage',
    name: 'Application Usage',
    types: [
      ...layer('application'),
      'BusinessActor',
      'BusinessCollaboration',
      'BusinessEvent',
      'BusinessFunction',
      'BusinessInteraction',
      'BusinessObject',
      'BusinessProcess',
      'BusinessRole',
    ],
  },
  {
    id: 'implementation_deployment',
    name: 'Implementation and Deployment',
    types: [
      ...layer('application'),
      'Artifact',
      'Path',
      'SystemSoftware',
      'TechnologyFunction',
      'TechnologyInteraction',
      'TechnologyInterface',
      'TechnologyProcess',
      'TechnologyService',
    ],
  },
  {
    id: 'technology',
    name: 'Technology',
    types: [...layer('technology'), 'Location'],
  },
  {
    id: 'technology_usage',
    name: 'Technology Usage',
    types: [
      'ApplicationComponent',
      'ApplicationCollaboration',
      'ApplicationEvent',
      'ApplicationFunction',
      'ApplicationInteraction',
      'ApplicationProcess',
      ...layer('technology'),
    ],
  },
  {
    id: 'information_structure',
    name: 'Information Structure',
    types: ['Artifact', 'BusinessObject', 'DataObject', 'Meaning', 'Representation'],
  },
  {
    id: 'service_realization',
    name: 'Service Realization',
    types: [
      ...layer('application'),
      'BusinessActor',
      'BusinessCollaboration',
      'BusinessEvent',
      'BusinessFunction',
      'BusinessInteraction',
      'BusinessInterface',
      'BusinessObject',
      'BusinessProcess',
      'BusinessRole',
      'BusinessService',
      'Representation',
    ],
  },
  {
    id: 'physical',
    name: 'Physical',
    types: [...layer('physical'), 'CommunicationNetwork', 'Device', 'Location', 'Node', 'Path'],
  },
  {
    id: 'stakeholder',
    name: 'Stakeholder',
    types: ['Assessment', 'Driver', 'Goal', 'Outcome', 'Stakeholder'],
  },
  {
    id: 'goal_realization',
    name: 'Goal Realization',
    types: ['Constraint', 'Goal', 'Outcome', 'Principle', 'Requirement'],
  },
  {
    id: 'requirements_realization',
    name: 'Requirements Realization',
    types: [
      'Constraint',
      'Goal',
      'Meaning',
      'Outcome',
      'Principle',
      'Requirement',
      'Value',
      ...layer('strategy'),
      ...layer('business'),
      ...layer('application'),
      ...layer('technology'),
      'Location',
    ],
  },
  { id: 'motivation', name: 'Motivation', types: layer('motivation') },
  { id: 'strategy', name: 'Strategy', types: [...layer('strategy'), 'Outcome'] },
  { id: 'capability', name: 'Capability Map', types: ['Capability', 'Outcome', 'Resource'] },
  {
    id: 'value_stream',
    name: 'Value Stream',
    types: ['Capability', 'Outcome', 'Stakeholder', 'ValueStream'],
  },
  {
    id: 'outcome_realization',
    name: 'Outcome Realization',
    types: [
      'Capability',
      'Meaning',
      'Outcome',
      'Resource',
      'Value',
      'ValueStream',
      ...layer('business'),
      ...layer('application'),
      ...layer('technology'),
      'Location',
    ],
  },
  { id: 'resource', name: 'Resource Map', types: ['Capability', 'Resource', 'WorkPackage'] },
  {
    id: 'project',
    name: 'Project',
    types: [
      'BusinessActor',
      'BusinessRole',
      'Deliverable',
      'Goal',
      'ImplementationEvent',
      'Outcome',
      'WorkPackage',
    ],
  },
  { id: 'migration', name: 'Migration', types: ['Gap', 'Plateau'] },
  {
    id: 'implementation_migration',
    name: 'Implementation and Migration',
    types: [
      ...layer('business'),
      ...layer('application'),
      ...layer('technology'),
      ...layer('implementation'),
      'Constraint',
      'Goal',
      'Location',
      'Requirement',
    ],
  },
  { id: 'layered', name: 'Layered', types: 'all' },
]

const BY_NAME = new Map(VIEWPOINTS.map((viewpoint) => [viewpoint.name, viewpoint]))
const BY_ID = new Map(VIEWPOINTS.map((viewpoint) => [viewpoint.id, viewpoint]))

/** The viewpoint a view names (`View.viewpoint`), or `undefined` for none or one we do not know. */
export function findViewpoint(name: string | undefined): Viewpoint | undefined {
  return name === undefined ? undefined : BY_NAME.get(name)
}

/** The viewpoint with Archi's id (`application_cooperation`), as an `.archimate` file names it. */
export function viewpointByArchiId(id: string): Viewpoint | undefined {
  return BY_ID.get(id)
}

/**
 * May a view with this viewpoint draw an element of `type`? A view with no
 * viewpoint restricts nothing, and so does one whose name we do not know: the
 * palette must not go empty on a file from a newer tool.
 */
export function viewpointAllows(name: string | undefined, type: ElementType): boolean {
  const viewpoint = findViewpoint(name)
  if (!viewpoint || viewpoint.types === 'all') return true
  return ALWAYS_ALLOWED.includes(type) || viewpoint.types.includes(type)
}
