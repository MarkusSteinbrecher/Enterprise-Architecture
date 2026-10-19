import Ajv2020 from 'ajv/dist/2020'
import addFormats from 'ajv-formats'
import { describe, expect, it } from 'vitest'
import claimsXml from './fixtures/claims-platform.xml?raw'
import type { Workspace } from '@/model'
import { fromCanonicalJson, toCanonicalJson } from './canonical-json'
import { exportExchange, importExchangeXml } from './exchange-format'
import { STYLE_KEY } from './exchange-views'
import { buildWorkspaceJsonSchema } from './json-schema'

/**
 * A view's router and a connection's label position (#133), through both
 * writers and both readers: canonical JSON keeps both byte for byte; the
 * exchange format carries the label position in `archipelago.style` and
 * cannot say the router, which its writer reports.
 */

function claims(): Workspace {
  return importExchangeXml(claimsXml, 'claims-platform.xml').workspace!
}

/** The landscape routed Manhattan-style, with labels at both ends. */
function edited(): Workspace {
  const workspace = claims()
  const view = workspace.views.find((v) => v.id === 'v-landscape')!
  view.router = 'manhattan'
  const [first, second] = view.connections
  first!.appearance = { ...first!.appearance, labelPosition: 'source' }
  second!.appearance = { ...second!.appearance, labelPosition: 'target' }
  return workspace
}

const landscape = (w: Workspace) => w.views.find((v) => v.id === 'v-landscape')!

describe('canonical JSON (#133)', () => {
  it('keeps the router and the label positions, byte for byte', () => {
    const text = toCanonicalJson(edited())
    const read = fromCanonicalJson(text)
    expect(read.problems).toEqual([])
    const view = landscape(read.workspace!)
    const ours = landscape(edited())
    const label = (id: string) =>
      view.connections.find((c) => c.id === id)?.appearance?.labelPosition
    expect(view.router).toBe('manhattan')
    expect(label(ours.connections[0]!.id)).toBe('source')
    expect(label(ours.connections[1]!.id)).toBe('target')
    expect(toCanonicalJson(read.workspace!)).toBe(text)
  })

  it('writes no router for a view drawn through its bend-points', () => {
    expect(toCanonicalJson(claims())).not.toContain('"router"')
  })

  it('reports a router it does not know, and draws the view through its bend-points', () => {
    const raw = JSON.parse(toCanonicalJson(edited()))
    raw.views.find((v: { id: string }) => v.id === 'v-landscape').router = 'diagonal'
    const read = fromCanonicalJson(JSON.stringify(raw))
    expect(read.problems.map((p) => p.code)).toEqual(['json.invalid-view-router'])
    expect(landscape(read.workspace!)).not.toHaveProperty('router')
  })

  it('takes a written-out manual router as the default, without a problem', () => {
    const raw = JSON.parse(toCanonicalJson(edited()))
    raw.views.find((v: { id: string }) => v.id === 'v-landscape').router = 'manual'
    const read = fromCanonicalJson(JSON.stringify(raw))
    expect(read.problems).toEqual([])
    expect(landscape(read.workspace!)).not.toHaveProperty('router')
  })

  it('reports a label position it does not know', () => {
    const raw = JSON.parse(toCanonicalJson(edited()))
    const view = raw.views.find((v: { id: string }) => v.id === 'v-landscape')
    const labelled = view.connections.find(
      (c: { appearance?: { labelPosition?: string } }) => c.appearance?.labelPosition,
    )
    labelled.appearance.labelPosition = 'above'
    const read = fromCanonicalJson(JSON.stringify(raw))
    expect(read.problems.map((p) => p.code)).toEqual(['json.invalid-appearance'])
    expect(read.problems[0]!.message).toMatch(/labelPosition/)
  })

  it('writes what the published schema allows, and the schema refuses what the reader refuses', () => {
    const ajv = new Ajv2020({ strict: false, allErrors: true })
    addFormats(ajv)
    const check = ajv.compile(buildWorkspaceJsonSchema())
    const raw = JSON.parse(toCanonicalJson(edited()))
    expect(check(raw), JSON.stringify(check.errors)).toBe(true)
    raw.views.find((v: { id: string }) => v.id === 'v-landscape').router = 'diagonal'
    expect(check(raw)).toBe(false)
  })
})

describe('exchange format (#133)', () => {
  it('says the router is lost, since the format cannot carry it', () => {
    const { problems } = exportExchange(edited())
    expect(problems.map((p) => p.code)).toEqual(['exchange.router-not-written'])
    expect(problems[0]).toMatchObject({ subject: 'v-landscape' })
    expect(exportExchange(claims()).problems).toEqual([])
  })

  it('carries the label positions in archipelago.style, and reads them back', () => {
    const { xml } = exportExchange(edited())
    expect(xml).toContain(STYLE_KEY)
    const read = importExchangeXml(xml)
    const view = landscape(read.workspace!)
    const ours = landscape(edited())
    const label = (w: typeof view, id: string) =>
      w.connections.find((c) => c.id === id)?.appearance?.labelPosition
    expect(label(view, ours.connections[0]!.id)).toBe('source')
    expect(label(view, ours.connections[1]!.id)).toBe('target')
    // Read back with the router gone, as reported.
    expect(view).not.toHaveProperty('router')
  })

  it('counts a carried label position it cannot read as unread, not ignored', () => {
    const { xml } = exportExchange(edited())
    const broken = xml.replace('"labelPosition":"source"', '"labelPosition":"above"')
    expect(broken).not.toBe(xml)
    const read = importExchangeXml(broken)
    expect(read.problems.map((p) => p.code)).toContain('exchange.carried-unreadable')
  })
})
