import { describe, expect, it } from 'vitest'
import claimsXml from '@/io/fixtures/claims-platform.xml?raw'
import { importExchangeXml } from '@/io'
import type { View, Workspace } from '@/model'
import { excludedBy, ghostsIn } from './ghosts'

/**
 * Which shapes and lines a viewpoint ghosts (#194), on the claims landscape.
 * The expected ids are written out from the fixture, not computed, so the test
 * cannot agree with the code by construction. The landscape is drawn with
 * Layered, which allows everything; each case sets the viewpoint it means.
 */

function claims(): Workspace {
  const result = importExchangeXml(claimsXml, 'claims-platform.xml')
  if (!result.workspace) throw new Error('fixture did not import')
  return result.workspace
}

function landscape(viewpoint: string | undefined): { view: View; workspace: Workspace } {
  const workspace = claims()
  const view = workspace.views.find((v) => v.id === 'v-landscape')!
  if (viewpoint === undefined) delete view.viewpoint
  else view.viewpoint = viewpoint
  return { view, workspace }
}

function ghosts(view: View, workspace: Workspace) {
  const types = new Map(workspace.elements.map((e) => [e.id, e.type]))
  return ghostsIn(view, (id) => types.get(id))
}

/**
 * The landscape's shapes Application Cooperation refuses: every business,
 * technology, motivation and implementation element. Its application elements,
 * Zurich (a Location, which it lists) and the split (a Junction) stay.
 */
const REFUSED_BY_APPLICATION_COOPERATION = [
  'o-accept',
  'o-backbone',
  'o-cics',
  'o-claim-bo',
  'o-customer',
  'o-damage',
  'o-database',
  'o-goal',
  'o-handle',
  'o-hosting',
  'o-info-svc',
  'o-insurant',
  'o-k8s',
  'o-mainframe',
  'o-pay',
  'o-pay-svc',
  'o-postgres',
  'o-reg-svc',
  'o-register',
  'o-req',
  'o-rollout',
  'o-runtime',
  'o-scanner',
  'o-valuate',
]

describe('ghostsIn (#194)', () => {
  it('ghosts a Business Actor under Application Cooperation and leaves an Application Component alone', () => {
    const { view, workspace } = landscape('Application Cooperation')
    const { nodes } = ghosts(view, workspace)
    expect(nodes.has('o-customer')).toBe(true)
    expect(nodes.has('o-portal')).toBe(false)
  })

  it('ghosts exactly the shapes whose type the viewpoint refuses', () => {
    const { view, workspace } = landscape('Application Cooperation')
    expect([...ghosts(view, workspace).nodes].sort()).toEqual(REFUSED_BY_APPLICATION_COOPERATION)
  })

  it('ghosts nothing with no viewpoint, with Layered, or with one it does not know', () => {
    for (const viewpoint of [undefined, 'Layered', 'A Viewpoint From A Newer Tool']) {
      const { view, workspace } = landscape(viewpoint)
      const { nodes, connections } = ghosts(view, workspace)
      expect(view.nodes.some((n) => n.id === 'o-customer')).toBe(true)
      expect([...nodes, ...connections]).toEqual([])
    }
  })

  it('never ghosts a Junction, which every viewpoint allows', () => {
    const { view, workspace } = landscape('Application Cooperation')
    const { nodes } = ghosts(view, workspace)
    // A business process either side of it, both ghosted: only Junction's rule spares the split.
    expect(nodes.has('o-accept')).toBe(true)
    expect(nodes.has('o-split')).toBe(false)
  })

  it('never ghosts a note, a group or a shape whose element is missing', () => {
    const { view, workspace } = landscape('Application Cooperation')
    view.nodes.push({
      id: 'o-missing',
      kind: 'element',
      element: 'no-such-element',
      bounds: { x: 0, y: 0, width: 120, height: 55 },
    })
    const { nodes } = ghosts(view, workspace)
    expect(nodes.has('o-customer')).toBe(true)
    expect(nodes.has('o-g-business')).toBe(false)
    expect(nodes.has('o-missing')).toBe(false)
  })

  it('ghosts a connection whose source is ghosted, and one whose target is, as Archi does', () => {
    const { view, workspace } = landscape('Application Cooperation')
    const { connections } = ghosts(view, workspace)
    // Technology Service → Application Component: only the source is refused.
    expect(connections.has('c-hosting-engine')).toBe(true)
    // Application Component → Requirement: only the target is.
    expect(connections.has('c-engine-req')).toBe(true)
    // Application Component → Application Component: neither.
    expect(connections.has('c-portal-engine')).toBe(false)
  })

  it('never ghosts a plain line, even to a ghosted shape', () => {
    const { view, workspace } = landscape('Application Cooperation')
    view.nodes.push({
      id: 'o-note',
      kind: 'note',
      text: 'A note',
      bounds: { x: 0, y: 0, width: 120, height: 55 },
    } as View['nodes'][number])
    view.connections.push({ id: 'c-line', kind: 'line', source: 'o-note', target: 'o-customer' })
    const { nodes, connections } = ghosts(view, workspace)
    expect(nodes.has('o-customer')).toBe(true)
    expect(connections.has('c-cust-ins')).toBe(true)
    expect(connections.has('c-line')).toBe(false)
  })
})

describe('excludedBy (#194)', () => {
  it('names the viewpoint that refuses a type, and none that allows it', () => {
    expect(excludedBy('Application Cooperation', 'BusinessActor')?.name).toBe(
      'Application Cooperation',
    )
    expect(excludedBy('Application Cooperation', 'ApplicationComponent')).toBeUndefined()
    expect(excludedBy(undefined, 'BusinessActor')).toBeUndefined()
  })
})
