import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import viewpointsXml from './archi/viewpoints.xml?raw'
import { ELEMENT_TYPES, type ElementType } from './element-types'
import {
  ALWAYS_ALLOWED,
  VIEWPOINTS,
  findViewpoint,
  viewpointAllows,
  viewpointByArchiId,
} from './viewpoints'

/**
 * Our viewpoint table against Archi 5.10's `viewpoints.xml` (#130). The test
 * reads Archi's file, so a typo in our table fails it.
 *
 * The file names whole layers as `$ApplicationElements$` and the like, which
 * Archi's `ViewpointManager` expands with `ArchimateModelUtils.get…Classes()`.
 * Those lists are Java, not data, so they are copied here as `javap -c` printed
 * them from `com.archimatetool.model_5.10.0`, in Archi's order.
 */
const ARCHI_GROUPS: Record<string, readonly ElementType[]> = {
  $StrategyElements$: ['Resource', 'Capability', 'ValueStream', 'CourseOfAction'],
  $BusinessElements$: [
    'BusinessActor',
    'BusinessRole',
    'BusinessCollaboration',
    'BusinessInterface',
    'BusinessProcess',
    'BusinessFunction',
    'BusinessInteraction',
    'BusinessEvent',
    'BusinessService',
    'BusinessObject',
    'Contract',
    'Representation',
    'Product',
  ],
  $ApplicationElements$: [
    'ApplicationComponent',
    'ApplicationCollaboration',
    'ApplicationInterface',
    'ApplicationFunction',
    'ApplicationInteraction',
    'ApplicationProcess',
    'ApplicationEvent',
    'ApplicationService',
    'DataObject',
  ],
  $TechnologyElements$: [
    'Node',
    'Device',
    'SystemSoftware',
    'TechnologyCollaboration',
    'TechnologyInterface',
    'Path',
    'CommunicationNetwork',
    'TechnologyFunction',
    'TechnologyProcess',
    'TechnologyInteraction',
    'TechnologyEvent',
    'TechnologyService',
    'Artifact',
  ],
  $PhysicalElements$: ['Equipment', 'Facility', 'DistributionNetwork', 'Material'],
  $MotivationElements$: [
    'Stakeholder',
    'Driver',
    'Assessment',
    'Goal',
    'Outcome',
    'Principle',
    'Requirement',
    'Constraint',
    'Meaning',
    'Value',
  ],
  $ImplementationMigrationElements$: [
    'WorkPackage',
    'Deliverable',
    'ImplementationEvent',
    'Plateau',
    'Gap',
  ],
}

const TYPES = new Set<string>(ELEMENT_TYPES.map((meta) => meta.type))

interface ArchiViewpoint {
  id: string
  name: string
  /** Element types, expanded; empty means every type, as Archi reads it. */
  types: Set<string>
}

function readArchiViewpoints(xml: string): ArchiViewpoint[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.querySelector('parsererror')) throw new Error('viewpoints.xml did not parse')
  return [...doc.getElementsByTagName('viewpoint')].map((viewpoint) => {
    const types = new Set<string>()
    for (const concept of viewpoint.getElementsByTagName('concept')) {
      const text = concept.textContent?.trim() ?? ''
      const group = ARCHI_GROUPS[text]
      if (group) for (const type of group) types.add(type)
      else if (text.startsWith('$')) {
        // A relationship group: the palette offers elements, so these restrict nothing here.
        if (!text.endsWith('Relationships$')) throw new Error(`unknown group ${text}`)
      } else types.add(text)
    }
    return {
      id: viewpoint.getAttribute('id') ?? '',
      name: viewpoint.getElementsByTagName('name')[0]?.textContent?.trim() ?? '',
      types,
    }
  })
}

const archi = readArchiViewpoints(viewpointsXml)
const sorted = (types: Iterable<string>) => [...types].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))

describe('the vendored viewpoints.xml', () => {
  it('is the file copied from Archi 5.10, unedited', () => {
    // The hash in ./archi/NOTICE.md. A newer Archi's file updates both.
    expect(createHash('sha256').update(viewpointsXml, 'utf8').digest('hex')).toBe(
      'a101699683fe7a92e4f62d6a389712a92fe2792fe36cb2a0614815aca21211c8',
    )
  })

  it('names only element types we have, so the comparison below sees every one', () => {
    const unknown = archi.flatMap((viewpoint) => [...viewpoint.types].filter((t) => !TYPES.has(t)))
    expect(unknown).toEqual([])
    expect(archi).toHaveLength(25)
  })

  it('expands groups to the types our catalogue files under the same layer', () => {
    // Archi's groups and our layers are two sources for one fact; if they part, say so here.
    const layers: Record<string, string> = {
      $StrategyElements$: 'strategy',
      $BusinessElements$: 'business',
      $ApplicationElements$: 'application',
      $TechnologyElements$: 'technology',
      $PhysicalElements$: 'physical',
      $MotivationElements$: 'motivation',
      $ImplementationMigrationElements$: 'implementation',
    }
    for (const [group, types] of Object.entries(ARCHI_GROUPS)) {
      const ours = ELEMENT_TYPES.filter((meta) => meta.layer === layers[group]).map((m) => m.type)
      expect(sorted(ours), group).toEqual(sorted(types))
    }
  })
})

describe('our viewpoint table', () => {
  it('has Archi’s viewpoints, with Archi’s ids and names, in Archi’s order', () => {
    expect(VIEWPOINTS.map((v) => [v.id, v.name])).toEqual(archi.map((v) => [v.id, v.name]))
  })

  it.each(archi.map((viewpoint) => [viewpoint.name, viewpoint] as const))(
    '%s allows exactly the element types Archi allows',
    (_name, expected) => {
      const ours = viewpointByArchiId(expected.id)!
      if (expected.types.size === 0) {
        expect(ours.types).toBe('all')
        return
      }
      expect(ours.types).not.toBe('all')
      const allowed = ELEMENT_TYPES.map((m) => m.type).filter((t) => viewpointAllows(ours.name, t))
      expect(sorted(allowed)).toEqual(sorted(new Set([...expected.types, ...ALWAYS_ALLOWED])))
      // No duplicates: a type listed twice is a sign the table was edited by hand badly.
      const list = ours.types as readonly string[]
      expect(new Set(list).size).toBe(list.length)
    },
  )
})

describe('viewpointAllows', () => {
  it('keeps Business Actor out of Application Cooperation, and keeps the junction in', () => {
    expect(viewpointAllows('Application Cooperation', 'BusinessActor')).toBe(false)
    expect(viewpointAllows('Application Cooperation', 'ApplicationComponent')).toBe(true)
    expect(viewpointAllows('Application Cooperation', 'Junction')).toBe(true)
    expect(viewpointAllows('Application Cooperation', 'Grouping')).toBe(true)
  })

  it('restricts nothing for a view with no viewpoint, Layered, or one we do not know', () => {
    for (const name of [undefined, 'Layered', 'Some Future Viewpoint']) {
      expect(
        ELEMENT_TYPES.every((m) => viewpointAllows(name, m.type)),
        String(name),
      ).toBe(true)
    }
    expect(findViewpoint('Some Future Viewpoint')).toBeUndefined()
  })
})
