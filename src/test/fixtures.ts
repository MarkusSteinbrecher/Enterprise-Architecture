import {
  SCHEMA_VERSION,
  DEFAULT_TAG_GROUP,
  type Element,
  type Relationship,
  type Workspace,
} from '@/model'

/** A tiny hand-written model, ArchiSurance-flavoured, for behavioural tests. */
export function smallWorkspace(): Workspace {
  const elements: Element[] = [
    {
      id: 'cap-claim',
      type: 'Capability',
      name: 'Claim Handling',
      documentation: 'Intake, assessment, settlement and recovery of claims.',
      properties: { owner: 'Claims' },
      profile: { tags: ['Core'] },
    },
    {
      id: 'proc-claim',
      type: 'BusinessProcess',
      name: 'Handle Claim',
      properties: { owner: 'Claims' },
    },
    {
      id: 'app-claims',
      type: 'ApplicationComponent',
      name: 'Claim Handling Engine',
      documentation: 'New rules-driven claim assessment platform.',
      properties: { owner: 'Claims' },
      profile: {
        lifecycle: {
          plan: '2024-01-01',
          phaseIn: '2025-01-01',
          active: '2027-01-01',
          phaseOut: '2033-01-01',
          endOfLife: '2034-01-01',
        },
        functionalFit: 4,
        technicalFit: 4,
        businessCriticality: 4,
        timeClassification: 'Invest',
        tags: ['Core', 'Cloud target'],
      },
    },
    {
      id: 'obj-claim',
      type: 'DataObject',
      name: 'Claim Record',
      properties: {},
    },
    {
      id: 'tec-k8s',
      type: 'Node',
      name: 'Kubernetes Platform',
      properties: { owner: 'Platform Ops' },
    },
  ]

  const relationships: Relationship[] = [
    {
      id: 'rel-proc-cap',
      type: 'Realization',
      source: 'proc-claim',
      target: 'cap-claim',
      properties: {},
    },
    {
      id: 'rel-app-proc',
      type: 'Serving',
      source: 'app-claims',
      target: 'proc-claim',
      properties: {},
      profile: { annualCost: 1_200_000, currency: 'EUR' },
    },
    {
      id: 'rel-app-obj',
      type: 'Access',
      source: 'app-claims',
      target: 'obj-claim',
      properties: {},
      profile: { accessType: 'ReadWrite' },
    },
    {
      id: 'rel-k8s-app',
      type: 'Serving',
      source: 'tec-k8s',
      target: 'app-claims',
      properties: {},
    },
  ]

  return {
    id: 'ws-test',
    name: 'ArchiSurance',
    schemaVersion: SCHEMA_VERSION,
    elements,
    relationships,
    views: [],
    tagGroups: [DEFAULT_TAG_GROUP],
  }
}

/**
 * A synthetic workspace of `size` elements with roughly two relationships each —
 * the 5,000-element scale the brief and issue #4 call out.
 *
 * Deterministic: no randomness, so a slow run is a real regression rather than an
 * unlucky shuffle.
 */
const TIME_CYCLE = ['Tolerate', 'Invest', 'Migrate', 'Eliminate'] as const

export function syntheticWorkspace(size: number, id = 'ws-synthetic'): Workspace {
  const elements: Element[] = []
  const relationships: Relationship[] = []

  const capabilityCount = Math.max(1, Math.floor(size / 50))
  for (let i = 0; i < capabilityCount; i += 1) {
    elements.push({
      id: `cap-${i}`,
      type: 'Capability',
      name: `Capability ${i}`,
      properties: { owner: `BU ${i % 7}` },
    })
  }

  const appCount = size - capabilityCount
  for (let i = 0; i < appCount; i += 1) {
    const year = 2000 + (i % 20)
    elements.push({
      id: `app-${i}`,
      type: 'ApplicationComponent',
      name: `Application ${i}`,
      ...(i % 3 === 0 ? { documentation: `Synthetic application ${i}.` } : {}),
      properties: i % 2 === 0 ? { owner: `BU ${i % 7}` } : {},
      profile: {
        lifecycle: {
          plan: `${year}-01-01`,
          phaseIn: `${year + 1}-01-01`,
          active: `${year + 2}-01-01`,
          phaseOut: `${year + 18}-01-01`,
          endOfLife: `${year + 20}-01-01`,
        },
        functionalFit: ((i % 4) + 1) as 1 | 2 | 3 | 4,
        technicalFit: (((i + 2) % 4) + 1) as 1 | 2 | 3 | 4,
        businessCriticality: (((i + 1) % 4) + 1) as 1 | 2 | 3 | 4,
        timeClassification: TIME_CYCLE[i % TIME_CYCLE.length] ?? 'Tolerate',
        tags: i % 5 === 0 ? ['Core'] : [],
      },
    })

    // Each application realizes a capability and serves the next application.
    relationships.push({
      id: `rel-cap-${i}`,
      type: 'Realization',
      source: `app-${i}`,
      target: `cap-${i % capabilityCount}`,
      properties: {},
    })
    if (i + 1 < appCount) {
      relationships.push({
        id: `rel-app-${i}`,
        type: 'Flow',
        source: `app-${i}`,
        target: `app-${i + 1}`,
        properties: {},
      })
    }
  }

  return {
    id,
    name: `Synthetic ${size}`,
    schemaVersion: SCHEMA_VERSION,
    elements,
    relationships,
    views: [],
    tagGroups: [DEFAULT_TAG_GROUP],
  }
}
