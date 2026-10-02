/**
 * Writes `src/io/fixtures/claims-platform.archimate` — an original Archi model
 * (ours, MIT) built to exercise everything #76 reads: nested groups, elements
 * nested in elements, notes, a view reference, plain lines, bend-points,
 * appearance overrides, a junction, folders three levels deep, and a
 * relationship drawn twice.
 *
 * The exchange-format fixture is then produced by real Archi, not by us:
 *
 *   npx vite-node scripts/fixtures/build-claims-model.ts
 *   scripts/fixtures/export-with-archi.sh
 *
 * Layout is authored in absolute view coordinates here and converted to Archi's
 * own conventions on the way out: child bounds relative to the parent, and
 * bend-points as offsets from the source and target centres.
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

type Box = { x: number; y: number; w: number; h: number }

interface ElementDef {
  id: string
  type: string
  name: string
  documentation?: string
  folder: string
}

interface RelationDef {
  id: string
  type: string
  source: string
  target: string
  name?: string
  accessType?: number
  folder?: string
}

interface ObjectDef {
  id: string
  /** Absolute bounds in the view. */
  box: Box
  kind: 'element' | 'group' | 'note' | 'ref'
  element?: string
  name?: string
  text?: string
  view?: string
  style?: Record<string, string>
  children?: ObjectDef[]
}

interface ConnectionDef {
  id: string
  source: string
  target: string
  relationship?: string
  /** Absolute bend-points. */
  bends?: [number, number][]
  style?: Record<string, string>
}

interface ViewDef {
  id: string
  name: string
  viewpoint?: string
  documentation?: string
  folder: string
  objects: ObjectDef[]
  connections: ConnectionDef[]
}

// ── Folders ──────────────────────────────────────────────────────────────────

const TOP = [
  ['strategy', 'Strategy'],
  ['business', 'Business'],
  ['application', 'Application'],
  ['technology', 'Technology & Physical'],
  ['motivation', 'Motivation'],
  ['implementation_migration', 'Implementation & Migration'],
  ['other', 'Other'],
  ['relations', 'Relations'],
  ['diagrams', 'Views'],
] as const

/** User folders: id → [name, parent folder id or top-level type]. */
const FOLDERS: Record<string, [string, string]> = {
  'f-customer': ['Customer-facing', 'business'],
  'f-claims-apps': ['Claims applications', 'application'],
  'f-legacy': ['Legacy', 'f-claims-apps'],
  'f-legacy-host': ['Host-based', 'f-legacy'],
  'f-serving': ['Serving', 'relations'],
  'f-landscapes': ['Landscapes', 'diagrams'],
}

// ── Elements ─────────────────────────────────────────────────────────────────

const E = (id: string, type: string, name: string, folder: string, documentation?: string) =>
  ({ id, type, name, folder, ...(documentation ? { documentation } : {}) }) as ElementDef

const ELEMENTS: ElementDef[] = [
  E('ba-customer', 'BusinessActor', 'Customer', 'f-customer', 'A policy holder making a claim.'),
  E('br-insurant', 'BusinessRole', 'Insurant', 'f-customer'),
  E('bs-registration', 'BusinessService', 'Claim Registration Service', 'f-customer'),
  E('bs-information', 'BusinessService', 'Customer Information Service', 'f-customer'),
  E('bs-payment', 'BusinessService', 'Claims Payment Service', 'f-customer'),
  E('bp-handle', 'BusinessProcess', 'Handle Claim', 'business'),
  E('bp-register', 'BusinessProcess', 'Register', 'business'),
  E('bp-accept', 'BusinessProcess', 'Accept', 'business'),
  E('bp-valuate', 'BusinessProcess', 'Valuate', 'business'),
  E('bp-pay', 'BusinessProcess', 'Pay', 'business'),
  E('be-damage', 'BusinessEvent', 'Damage Occurred', 'business'),
  E('bo-claim', 'BusinessObject', 'Claim', 'business'),
  E('ac-portal', 'ApplicationComponent', 'Claims Portal', 'f-claims-apps'),
  E(
    'ac-engine',
    'ApplicationComponent',
    'Claims Engine',
    'f-claims-apps',
    'Rules-driven assessment.',
  ),
  E('af-rules', 'ApplicationFunction', 'Rules Evaluation', 'f-claims-apps'),
  E('af-calc', 'ApplicationFunction', 'Payment Calculation', 'f-claims-apps'),
  E('ac-customer', 'ApplicationComponent', 'Customer Data Hub', 'f-claims-apps'),
  E('ac-crm', 'ApplicationComponent', 'Legacy CRM', 'f-legacy'),
  E('ac-host', 'ApplicationComponent', 'Policy Host', 'f-legacy-host'),
  E('ai-portal', 'ApplicationInterface', 'Portal UI', 'f-claims-apps'),
  E('as-claims', 'ApplicationService', 'Claims Administration Service', 'application'),
  E('as-customer', 'ApplicationService', 'Customer Administration Service', 'application'),
  E('as-payment', 'ApplicationService', 'Payment Service', 'application'),
  E('do-claim', 'DataObject', 'Claim Record', 'application'),
  E('do-customer', 'DataObject', 'Customer File', 'application'),
  E('n-k8s', 'Node', 'Kubernetes Cluster', 'technology'),
  E('ss-runtime', 'SystemSoftware', 'Claims Runtime', 'technology'),
  E('ss-postgres', 'SystemSoftware', 'PostgreSQL', 'technology'),
  E('n-mainframe', 'Node', 'Mainframe', 'technology'),
  E('ss-cics', 'SystemSoftware', 'CICS', 'technology'),
  E('ts-hosting', 'TechnologyService', 'Container Hosting', 'technology'),
  E('ts-database', 'TechnologyService', 'Database Service', 'technology'),
  E('cn-backbone', 'CommunicationNetwork', 'Backbone', 'technology'),
  E('eq-scanner', 'Equipment', 'Mail Scanner', 'technology'),
  E('g-settle', 'Goal', 'Settle claims within five days', 'motivation'),
  E('r-rules', 'Requirement', 'Assessment is rules-driven', 'motivation'),
  E('wp-rollout', 'WorkPackage', 'Rules engine rollout', 'implementation_migration'),
  E('loc-zurich', 'Location', 'Zurich data centre', 'other'),
  E('j-split', 'OrJunction', 'Junction', 'other'),
]

const R = (
  id: string,
  type: string,
  source: string,
  target: string,
  extra: Partial<RelationDef> = {},
): RelationDef => ({ id, type, source, target, ...extra })

const RELATIONS: RelationDef[] = [
  R('r-cust-ins', 'Assignment', 'ba-customer', 'br-insurant'),
  R('r-ins-reg', 'Serving', 'bs-registration', 'br-insurant', { folder: 'f-serving' }),
  R('r-ins-info', 'Serving', 'bs-information', 'br-insurant', { folder: 'f-serving' }),
  R('r-ins-pay', 'Serving', 'bs-payment', 'br-insurant', { folder: 'f-serving' }),
  R('r-handle-reg', 'Realization', 'bp-handle', 'bs-registration'),
  R('r-handle-pay', 'Realization', 'bp-handle', 'bs-payment'),
  R('r-handle-register', 'Composition', 'bp-handle', 'bp-register'),
  R('r-handle-accept', 'Composition', 'bp-handle', 'bp-accept'),
  R('r-handle-valuate', 'Composition', 'bp-handle', 'bp-valuate'),
  R('r-handle-pay2', 'Composition', 'bp-handle', 'bp-pay'),
  R('r-register-accept', 'Triggering', 'bp-register', 'bp-accept'),
  R('r-accept-split', 'Triggering', 'bp-accept', 'j-split'),
  R('r-split-valuate', 'Triggering', 'j-split', 'bp-valuate'),
  R('r-split-pay', 'Triggering', 'j-split', 'bp-pay', { name: 'fast track' }),
  R('r-valuate-pay', 'Triggering', 'bp-valuate', 'bp-pay'),
  R('r-damage-register', 'Triggering', 'be-damage', 'bp-register'),
  R('r-handle-claim', 'Access', 'bp-handle', 'bo-claim', { accessType: 3 }),
  R('r-as-handle', 'Serving', 'as-claims', 'bp-handle', { folder: 'f-serving' }),
  R('r-asc-info', 'Serving', 'as-customer', 'bp-handle', { folder: 'f-serving' }),
  R('r-asp-pay', 'Serving', 'as-payment', 'bp-pay', { folder: 'f-serving' }),
  R('r-engine-as', 'Realization', 'ac-engine', 'as-claims'),
  R('r-engine-rules', 'Assignment', 'ac-engine', 'af-rules'),
  R('r-engine-calc', 'Assignment', 'ac-engine', 'af-calc'),
  R('r-calc-pay', 'Realization', 'af-calc', 'as-payment'),
  R('r-cust-as', 'Realization', 'ac-customer', 'as-customer'),
  R('r-portal-ai', 'Composition', 'ac-portal', 'ai-portal'),
  R('r-portal-engine', 'Flow', 'ac-portal', 'ac-engine', { name: 'claim intake' }),
  R('r-engine-claim', 'Access', 'ac-engine', 'do-claim', { accessType: 3 }),
  R('r-cust-file', 'Access', 'ac-customer', 'do-customer', { accessType: 1 }),
  R('r-crm-cust', 'Flow', 'ac-crm', 'ac-customer'),
  R('r-host-crm', 'Serving', 'ac-host', 'ac-crm', { folder: 'f-serving' }),
  R('r-claim-bo', 'Realization', 'do-claim', 'bo-claim'),
  R('r-k8s-runtime', 'Composition', 'n-k8s', 'ss-runtime'),
  R('r-k8s-pg', 'Composition', 'n-k8s', 'ss-postgres'),
  R('r-mf-cics', 'Composition', 'n-mainframe', 'ss-cics'),
  R('r-k8s-hosting', 'Realization', 'n-k8s', 'ts-hosting'),
  R('r-pg-db', 'Realization', 'ss-postgres', 'ts-database'),
  R('r-hosting-engine', 'Serving', 'ts-hosting', 'ac-engine', { folder: 'f-serving' }),
  R('r-hosting-portal', 'Serving', 'ts-hosting', 'ac-portal', { folder: 'f-serving' }),
  R('r-db-customer', 'Serving', 'ts-database', 'ac-customer', { folder: 'f-serving' }),
  R('r-cics-host', 'Serving', 'ss-cics', 'ac-host', { folder: 'f-serving' }),
  R('r-net-k8s', 'Association', 'cn-backbone', 'n-k8s'),
  R('r-net-mf', 'Association', 'cn-backbone', 'n-mainframe'),
  R('r-scanner-net', 'Association', 'eq-scanner', 'cn-backbone'),
  R('r-zurich-k8s', 'Aggregation', 'loc-zurich', 'n-k8s'),
  R('r-engine-req', 'Realization', 'ac-engine', 'r-rules'),
  R('r-req-goal', 'Realization', 'r-rules', 'g-settle'),
  R('r-wp-engine', 'Realization', 'wp-rollout', 'ac-engine'),
]

// ── Views ────────────────────────────────────────────────────────────────────

const el = (id: string, element: string, box: Box, extra: Partial<ObjectDef> = {}): ObjectDef => ({
  id,
  kind: 'element',
  element,
  box,
  ...extra,
})
const at = (x: number, y: number, w = 150, h = 55): Box => ({ x, y, w, h })

const LANDSCAPE: ViewDef = {
  id: 'v-landscape',
  name: 'Claims landscape',
  viewpoint: 'layered',
  documentation: 'Business, application and platform layers of the claims platform.',
  folder: 'f-landscapes',
  objects: [
    {
      id: 'o-g-business',
      kind: 'group',
      name: 'Business',
      box: at(20, 20, 1180, 300),
      style: { fillColor: '#fff5d6' },
      children: [
        el('o-customer', 'ba-customer', at(40, 60)),
        el('o-insurant', 'br-insurant', at(240, 60)),
        el('o-reg-svc', 'bs-registration', at(460, 60)),
        el('o-info-svc', 'bs-information', at(660, 60)),
        el('o-pay-svc', 'bs-payment', at(860, 60)),
        el('o-damage', 'be-damage', at(40, 180, 120, 55)),
        el('o-handle', 'bp-handle', at(200, 150, 760, 140), {
          style: { textAlignment: '1', textPosition: '0' },
          children: [
            el('o-register', 'bp-register', at(220, 200, 120, 55)),
            el('o-accept', 'bp-accept', at(380, 200, 120, 55)),
            el('o-split', 'j-split', at(540, 220, 15, 15)),
            el('o-valuate', 'bp-valuate', at(600, 180, 120, 50)),
            el('o-pay', 'bp-pay', at(800, 200, 120, 55)),
          ],
        }),
        el('o-claim-bo', 'bo-claim', at(1000, 180, 150, 55)),
        {
          id: 'o-note-biz',
          kind: 'note',
          box: at(1000, 60, 170, 70),
          text: 'Fast track skips valuation\nfor claims under 500.',
        },
      ],
    },
    {
      id: 'o-g-apps',
      kind: 'group',
      name: 'Applications',
      box: at(20, 360, 1180, 320),
      children: [
        el('o-as-claims', 'as-claims', at(200, 390, 180, 55)),
        el('o-as-customer', 'as-customer', at(460, 390, 180, 55)),
        el('o-as-payment', 'as-payment', at(800, 390, 150, 55)),
        el('o-portal', 'ac-portal', at(40, 500)),
        el('o-ai-portal', 'ai-portal', at(40, 600, 150, 50)),
        el('o-engine', 'ac-engine', at(220, 480, 400, 160), {
          style: {
            fillColor: '#c9e7f7',
            lineColor: '#1d5c8c',
            lineWidth: '2',
            fontColor: '#0b2e4a',
            font: '1|Arial|11.0|1|COCOA|1|Arial-BoldMT',
          },
          children: [
            el('o-rules', 'af-rules', at(240, 560, 160, 55)),
            el('o-calc', 'af-calc', at(440, 560, 160, 55)),
          ],
        }),
        el('o-customer-hub', 'ac-customer', at(660, 500)),
        el('o-crm', 'ac-crm', at(860, 500), { style: { fillColor: '#e0e0e0', alpha: '160' } }),
        el('o-host', 'ac-host', at(1030, 500, 150, 55)),
        el('o-do-claim', 'do-claim', at(660, 610, 150, 50)),
        el('o-do-customer', 'do-customer', at(860, 610, 150, 50)),
      ],
    },
    {
      id: 'o-g-platform',
      kind: 'group',
      name: 'Platform',
      box: at(20, 720, 1180, 300),
      children: [
        el('o-hosting', 'ts-hosting', at(200, 750)),
        el('o-database', 'ts-database', at(660, 750)),
        el('o-k8s', 'n-k8s', at(180, 830, 560, 150), {
          children: [
            el('o-runtime', 'ss-runtime', at(220, 880)),
            el('o-postgres', 'ss-postgres', at(540, 880)),
          ],
        }),
        el('o-mainframe', 'n-mainframe', at(860, 830, 300, 150), {
          children: [el('o-cics', 'ss-cics', at(940, 890, 140, 55))],
        }),
        el('o-backbone', 'cn-backbone', at(40, 960, 120, 45)),
        el('o-scanner', 'eq-scanner', at(40, 860, 120, 55)),
      ],
    },
    el('o-zurich', 'loc-zurich', at(1240, 830, 150, 55)),
    el('o-goal', 'g-settle', at(1240, 60, 170, 60)),
    el('o-req', 'r-rules', at(1240, 180, 170, 60)),
    el('o-rollout', 'wp-rollout', at(1240, 500, 170, 55)),
    { id: 'o-ref-data', kind: 'ref', view: 'v-data', box: at(1240, 640, 170, 55) },
    {
      id: 'o-note-ref',
      kind: 'note',
      box: at(1240, 380, 170, 70),
      text: 'Data ownership: see the Claim data view.',
    },
  ],
  connections: [
    { id: 'c-cust-ins', source: 'o-customer', target: 'o-insurant', relationship: 'r-cust-ins' },
    { id: 'c-reg-ins', source: 'o-reg-svc', target: 'o-insurant', relationship: 'r-ins-reg' },
    {
      id: 'c-info-ins',
      source: 'o-info-svc',
      target: 'o-insurant',
      relationship: 'r-ins-info',
      bends: [
        [735, 40],
        [315, 40],
      ],
    },
    {
      id: 'c-pay-ins',
      source: 'o-pay-svc',
      target: 'o-insurant',
      relationship: 'r-ins-pay',
      bends: [
        [935, 30],
        [300, 30],
      ],
      style: { lineColor: '#7a7a7a' },
    },
    { id: 'c-handle-reg', source: 'o-handle', target: 'o-reg-svc', relationship: 'r-handle-reg' },
    { id: 'c-handle-pay', source: 'o-handle', target: 'o-pay-svc', relationship: 'r-handle-pay' },
    {
      id: 'c-register-accept',
      source: 'o-register',
      target: 'o-accept',
      relationship: 'r-register-accept',
    },
    { id: 'c-accept-split', source: 'o-accept', target: 'o-split', relationship: 'r-accept-split' },
    {
      id: 'c-split-valuate',
      source: 'o-split',
      target: 'o-valuate',
      relationship: 'r-split-valuate',
    },
    {
      id: 'c-split-pay',
      source: 'o-split',
      target: 'o-pay',
      relationship: 'r-split-pay',
      bends: [
        [547, 270],
        [860, 270],
      ],
    },
    { id: 'c-valuate-pay', source: 'o-valuate', target: 'o-pay', relationship: 'r-valuate-pay' },
    {
      id: 'c-damage-register',
      source: 'o-damage',
      target: 'o-register',
      relationship: 'r-damage-register',
    },
    {
      id: 'c-handle-claim',
      source: 'o-handle',
      target: 'o-claim-bo',
      relationship: 'r-handle-claim',
    },
    { id: 'c-as-handle', source: 'o-as-claims', target: 'o-handle', relationship: 'r-as-handle' },
    { id: 'c-asc-handle', source: 'o-as-customer', target: 'o-handle', relationship: 'r-asc-info' },
    { id: 'c-asp-pay', source: 'o-as-payment', target: 'o-pay', relationship: 'r-asp-pay' },
    { id: 'c-engine-as', source: 'o-engine', target: 'o-as-claims', relationship: 'r-engine-as' },
    {
      id: 'c-calc-pay',
      source: 'o-calc',
      target: 'o-as-payment',
      relationship: 'r-calc-pay',
      bends: [
        [520, 470],
        [875, 470],
      ],
    },
    {
      id: 'c-cust-as',
      source: 'o-customer-hub',
      target: 'o-as-customer',
      relationship: 'r-cust-as',
    },
    { id: 'c-portal-ai', source: 'o-portal', target: 'o-ai-portal', relationship: 'r-portal-ai' },
    {
      id: 'c-portal-engine',
      source: 'o-portal',
      target: 'o-engine',
      relationship: 'r-portal-engine',
    },
    {
      id: 'c-engine-claim',
      source: 'o-engine',
      target: 'o-do-claim',
      relationship: 'r-engine-claim',
      bends: [[640, 635]],
    },
    {
      id: 'c-cust-file',
      source: 'o-customer-hub',
      target: 'o-do-customer',
      relationship: 'r-cust-file',
    },
    { id: 'c-crm-cust', source: 'o-crm', target: 'o-customer-hub', relationship: 'r-crm-cust' },
    { id: 'c-host-crm', source: 'o-host', target: 'o-crm', relationship: 'r-host-crm' },
    { id: 'c-k8s-runtime', source: 'o-k8s', target: 'o-runtime', relationship: 'r-k8s-runtime' },
    { id: 'c-k8s-hosting', source: 'o-k8s', target: 'o-hosting', relationship: 'r-k8s-hosting' },
    { id: 'c-pg-db', source: 'o-postgres', target: 'o-database', relationship: 'r-pg-db' },
    {
      id: 'c-hosting-engine',
      source: 'o-hosting',
      target: 'o-engine',
      relationship: 'r-hosting-engine',
      bends: [
        [275, 700],
        [420, 700],
      ],
    },
    {
      id: 'c-hosting-portal',
      source: 'o-hosting',
      target: 'o-portal',
      relationship: 'r-hosting-portal',
      bends: [
        [180, 777],
        [115, 777],
      ],
    },
    {
      id: 'c-db-customer',
      source: 'o-database',
      target: 'o-customer-hub',
      relationship: 'r-db-customer',
    },
    { id: 'c-cics-host', source: 'o-cics', target: 'o-host', relationship: 'r-cics-host' },
    { id: 'c-net-k8s', source: 'o-backbone', target: 'o-k8s', relationship: 'r-net-k8s' },
    {
      id: 'c-net-mf',
      source: 'o-backbone',
      target: 'o-mainframe',
      relationship: 'r-net-mf',
      bends: [
        [100, 1010],
        [1010, 1010],
      ],
    },
    {
      id: 'c-scanner-net',
      source: 'o-scanner',
      target: 'o-backbone',
      relationship: 'r-scanner-net',
    },
    { id: 'c-zurich-k8s', source: 'o-zurich', target: 'o-k8s', relationship: 'r-zurich-k8s' },
    { id: 'c-engine-req', source: 'o-engine', target: 'o-req', relationship: 'r-engine-req' },
    { id: 'c-req-goal', source: 'o-req', target: 'o-goal', relationship: 'r-req-goal' },
    { id: 'c-wp-engine', source: 'o-rollout', target: 'o-engine', relationship: 'r-wp-engine' },
    { id: 'c-note-ref', source: 'o-note-ref', target: 'o-ref-data' },
    {
      id: 'c-note-split',
      source: 'o-note-biz',
      target: 'o-split',
      style: { lineColor: '#999999' },
    },
  ],
}

const DATA: ViewDef = {
  id: 'v-data',
  name: 'Claim data',
  folder: 'diagrams',
  objects: [
    el('d-engine', 'ac-engine', at(40, 40)),
    el('d-claim', 'do-claim', at(300, 40)),
    el('d-claim-bo', 'bo-claim', at(300, 160)),
    el('d-hub', 'ac-customer', at(40, 280)),
    el('d-file', 'do-customer', at(300, 280)),
    // The same relationship drawn twice in one view.
    el('d-claim-2', 'do-claim', at(560, 40)),
  ],
  connections: [
    {
      id: 'dc-engine-claim',
      source: 'd-engine',
      target: 'd-claim',
      relationship: 'r-engine-claim',
    },
    {
      id: 'dc-engine-claim-2',
      source: 'd-engine',
      target: 'd-claim-2',
      relationship: 'r-engine-claim',
      bends: [
        [115, 20],
        [635, 20],
      ],
    },
    { id: 'dc-claim-bo', source: 'd-claim', target: 'd-claim-bo', relationship: 'r-claim-bo' },
    { id: 'dc-hub-file', source: 'd-hub', target: 'd-file', relationship: 'r-cust-file' },
  ],
}

const EMPTY: ViewDef = {
  id: 'v-empty',
  name: 'Target state (to do)',
  folder: 'f-landscapes',
  objects: [],
  connections: [],
}

const VIEWS = [LANDSCAPE, DATA, EMPTY]

// ── Archi serialisation ──────────────────────────────────────────────────────

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '&#xD;&#xA;')
}

const attrs = (record: Record<string, string | number | undefined>): string =>
  Object.entries(record)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => ` ${key}="${esc(String(value))}"`)
    .join('')

/** Archi's xsi:type for an ArchiMate concept. */
function conceptType(type: string, relation = false): string {
  if (relation) return `archimate:${type}Relationship`
  if (type === 'OrJunction' || type === 'AndJunction') return 'archimate:Junction'
  return `archimate:${type}`
}

function view(def: ViewDef): string[] {
  const index = new Map<string, { abs: Box; def: ObjectDef }>()
  const walk = (objects: ObjectDef[]) => {
    for (const object of objects) {
      index.set(object.id, { abs: object.box, def: object })
      walk(object.children ?? [])
    }
  }
  walk(def.objects)

  const incoming = new Map<string, string[]>()
  for (const connection of def.connections) {
    incoming.set(connection.target, [...(incoming.get(connection.target) ?? []), connection.id])
  }
  const centre = (id: string) => {
    const box = index.get(id)?.abs
    if (!box) throw new Error(`unknown object ${id}`)
    return { x: box.x + box.w / 2, y: box.y + box.h / 2 }
  }

  const lines: string[] = []
  const object = (o: ObjectDef, parent: Box | undefined, depth: number): void => {
    const pad = '  '.repeat(depth)
    const rel = parent ? { x: o.box.x - parent.x, y: o.box.y - parent.y } : o.box
    const head: Record<string, string | undefined> = {
      'xsi:type':
        o.kind === 'element'
          ? 'archimate:DiagramObject'
          : o.kind === 'group'
            ? 'archimate:Group'
            : o.kind === 'note'
              ? 'archimate:Note'
              : 'archimate:DiagramModelReference',
      id: o.id,
      name: o.kind === 'group' ? o.name : undefined,
      targetConnections: incoming.get(o.id)?.join(' '),
      archimateElement: o.element,
      model: o.view,
      ...o.style,
    }
    lines.push(`${pad}<child${attrs(head)}>`)
    lines.push(`${pad}  <bounds x="${rel.x}" y="${rel.y}" width="${o.box.w}" height="${o.box.h}"/>`)
    if (o.kind === 'note' && o.text) lines.push(`${pad}  <content>${esc(o.text)}</content>`)
    for (const c of def.connections.filter((connection) => connection.source === o.id)) {
      const s = centre(c.source)
      const t = centre(c.target)
      const cHead = {
        'xsi:type': c.relationship ? 'archimate:Connection' : 'archimate:DiagramModelConnection',
        id: c.id,
        source: c.source,
        target: c.target,
        archimateRelationship: c.relationship,
        ...c.style,
      }
      if (!c.bends?.length) {
        lines.push(`${pad}  <sourceConnection${attrs(cHead)}/>`)
        continue
      }
      lines.push(`${pad}  <sourceConnection${attrs(cHead)}>`)
      for (const [x, y] of c.bends) {
        lines.push(
          // Archi stores the offsets as integers.
          `${pad}    <bendpoint startX="${Math.round(x - s.x)}" startY="${Math.round(y - s.y)}" endX="${Math.round(x - t.x)}" endY="${Math.round(y - t.y)}"/>`,
        )
      }
      lines.push(`${pad}  </sourceConnection>`)
    }
    for (const child of o.children ?? []) object(child, o.box, depth + 1)
    lines.push(`${pad}</child>`)
  }

  lines.push(
    `<element${attrs({ 'xsi:type': 'archimate:ArchimateDiagramModel', name: def.name, id: def.id, viewpoint: def.viewpoint })}>`,
  )
  if (def.documentation) lines.push(`  <documentation>${esc(def.documentation)}</documentation>`)
  for (const o of def.objects) object(o, undefined, 1)
  lines.push('</element>')
  return lines
}

function folderContent(folderId: string, depth: number): string[] {
  const pad = '  '.repeat(depth)
  const out: string[] = []
  for (const [id, [name, parent]] of Object.entries(FOLDERS)) {
    if (parent !== folderId) continue
    out.push(`${pad}<folder${attrs({ name, id })}>`)
    out.push(...folderContent(id, depth + 1))
    out.push(`${pad}</folder>`)
  }
  for (const e of ELEMENTS.filter((element) => element.folder === folderId)) {
    const head = attrs({
      'xsi:type': conceptType(e.type),
      name: e.name,
      id: e.id,
      type: e.type === 'OrJunction' ? 'or' : undefined,
    })
    if (e.documentation) {
      out.push(
        `${pad}<element${head}>`,
        `${pad}  <documentation>${esc(e.documentation)}</documentation>`,
        `${pad}</element>`,
      )
    } else out.push(`${pad}<element${head}/>`)
  }
  for (const r of RELATIONS.filter((relation) => (relation.folder ?? 'relations') === folderId)) {
    out.push(
      `${pad}<element${attrs({
        'xsi:type': conceptType(r.type, true),
        id: r.id,
        name: r.name,
        source: r.source,
        target: r.target,
        accessType: r.accessType,
      })}/>`,
    )
  }
  for (const v of VIEWS.filter((candidate) => candidate.folder === folderId)) {
    out.push(...view(v).map((line) => pad + line))
  }
  return out
}

const out: string[] = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<archimate:model xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:archimate="http://www.archimatetool.com/archimate" name="Claims platform" id="m-claims" version="5.0.0">',
  '  <purpose>An original test model for Archipelago (MIT). Not ArchiSurance.</purpose>',
]
for (const [type, name] of TOP) {
  out.push(`  <folder${attrs({ name, id: `f-top-${type}`, type })}>`)
  out.push(...folderContent(type, 2))
  out.push('  </folder>')
}
out.push('</archimate:model>', '')

const target = join(process.cwd(), 'src', 'io', 'fixtures', 'claims-platform.archimate')
writeFileSync(target, out.join('\n'))
console.log(`Wrote ${target}`)
