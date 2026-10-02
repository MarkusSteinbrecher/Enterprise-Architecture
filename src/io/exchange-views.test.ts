import { describe, expect, it } from 'vitest'
import { absoluteBounds, validate, type View, type Workspace } from '@/model'
import { drawnWorkspace } from '@/test/fixtures'
import { toCanonicalJson } from './canonical-json'
import { exportExchange, importExchangeXml } from './exchange-format'
import claimsArchimate from './fixtures/claims-platform.archimate?raw'
import claimsXml from './fixtures/claims-platform.xml?raw'
import attachmentsXml from './fixtures/archi-bendpoint-attachments.xml?raw'
import unsupportedXml from './fixtures/unsupported-view-constructs.xml?raw'

function read(xml: string): Workspace {
  const result = importExchangeXml(xml)
  if (!result.workspace) throw new Error(JSON.stringify(result.problems))
  return result.workspace
}

function view(workspace: Workspace, id: string): View {
  const found = workspace.views.find((v) => v.id === id)
  if (!found) throw new Error(`no view ${id}`)
  return found
}

/**
 * What Archi wrote, counted from the file with plain pattern matching — no help
 * from our reader, so the import is checked against the file, not against itself.
 *
 * (Archi's model has one more connection in the landscape than its export: it
 * leaves out a connection drawn between a shape and a shape nested inside it,
 * since the nesting already shows the relationship. Matching the file is right.)
 */
function countInFile(viewId: string) {
  const start = claimsXml.indexOf(`<view identifier="${viewId}"`)
  const body = claimsXml.slice(start, claimsXml.indexOf('</view>', start))
  const count = (pattern: RegExp) => (body.match(pattern) ?? []).length
  return {
    nodes: count(/<node /g),
    connections: count(/<connection /g),
    bendpoints: count(/<bendpoint /g),
  }
}

describe('an exchange file exported by Archi 5.10 (#76)', () => {
  const workspace = read(claimsXml)

  it('imports with nothing to report', () => {
    expect(importExchangeXml(claimsXml).problems).toEqual([])
    expect(validate(workspace).findings).toEqual([])
  })

  it('has the views, nodes, connections and bend-points of the Archi model', () => {
    expect(workspace.views.map((v) => v.id).sort()).toEqual(['v-data', 'v-empty', 'v-landscape'])
    for (const id of ['v-landscape', 'v-data', 'v-empty']) {
      const imported = view(workspace, id)
      const expected = countInFile(id)
      expect(
        {
          nodes: imported.nodes.length,
          connections: imported.connections.length,
          bendpoints: imported.connections.flatMap((c) => c.bendpoints ?? []).length,
        },
        id,
      ).toEqual(expected)
    }
    // And the totals are not vacuous.
    expect(countInFile('v-landscape')).toEqual({ nodes: 45, connections: 40, bendpoints: 15 })
  })

  it('has the folders of the Archi model, nested and filled as they were', () => {
    // User folders are the ones without a `type` in Archi's own model file.
    const archiFolders = (claimsArchimate.match(/<folder name="[^"]*" id="[^"]*">/g) ?? []).length
    expect(workspace.folders).toHaveLength(archiFolders)
    expect(archiFolders).toBe(6)

    const byName = new Map(workspace.folders.map((f) => [f.name, f]))
    const hostBased = byName.get('Host-based')
    const legacy = byName.get('Legacy')
    const apps = byName.get('Claims applications')
    expect(hostBased?.parent).toBe(legacy?.id)
    expect(legacy?.parent).toBe(apps?.id)
    expect(apps?.root).toBe('application')
    expect(byName.get('Serving')?.root).toBe('relations')
    expect(byName.get('Landscapes')?.root).toBe('views')

    const element = (id: string) => workspace.elements.find((e) => e.id === id)
    expect(element('ac-host')?.folder).toBe(hostBased?.id)
    expect(element('ba-customer')?.folder).toBe(byName.get('Customer-facing')?.id)
    // Filed directly in a top-level group: no folder at all.
    expect(element('bp-handle')?.folder).toBeUndefined()
    expect(
      workspace.relationships.filter((r) => r.folder === byName.get('Serving')?.id),
    ).toHaveLength(11)
    expect(view(workspace, 'v-landscape').folder).toBe(byName.get('Landscapes')?.id)
    expect(view(workspace, 'v-data').folder).toBeUndefined()
  })

  it('gives folders the same ids every time the same file is read', () => {
    expect(read(claimsXml).folders).toEqual(workspace.folders)
  })

  it('places nested shapes relative to their parent, where Archi drew them', () => {
    const landscape = view(workspace, 'v-landscape')
    const rules = landscape.nodes.find((n) => n.id === 'o-rules')
    expect(rules?.parent).toBe('o-engine')
    expect(rules?.bounds).toEqual({ x: 20, y: 80, width: 160, height: 55 })
    // Three levels deep: group ⊃ process ⊃ sub-process.
    expect(landscape.nodes.find((n) => n.id === 'o-register')?.parent).toBe('o-handle')
    expect(absoluteBounds(landscape, 'o-register')).toEqual({
      x: 220,
      y: 200,
      width: 120,
      height: 55,
    })
  })

  it('reads notes, groups, view references, the viewpoint and documentation', () => {
    const landscape = view(workspace, 'v-landscape')
    const node = (id: string) => landscape.nodes.find((n) => n.id === id)
    expect(node('o-ref-data')).toMatchObject({ kind: 'view-ref', view: 'v-data' })
    expect(node('o-g-platform')).toMatchObject({ kind: 'group', name: 'Platform' })
    // Archi writes the line break as &#xD;&#xA;; it arrives as one.
    expect(node('o-note-biz')).toMatchObject({
      kind: 'note',
      text: 'Fast track skips valuation\r\nfor claims under 500.',
    })
    expect(landscape.viewpoint).toBe('Layered')
    expect(landscape.documentation).toBe(
      'Business, application and platform layers of the claims platform.',
    )
    const line = landscape.connections.find((c) => c.id === 'c-note-ref')
    expect(line).toMatchObject({ kind: 'line', source: 'o-note-ref', target: 'o-ref-data' })
  })

  it("keeps only real style overrides, not Archi's defaults", () => {
    const styled = workspace.views.flatMap((v) =>
      [...v.nodes, ...v.connections].filter((item) => item.appearance).map((item) => item.id),
    )
    expect(styled.sort()).toEqual([
      'c-note-split',
      'c-pay-ins',
      'o-crm',
      'o-engine',
      'o-g-business',
    ])
    const landscape = view(workspace, 'v-landscape')
    expect(landscape.nodes.find((n) => n.id === 'o-engine')?.appearance).toEqual({
      fillColor: '#c9e7f7',
      lineColor: '#1d5c8c',
      fontName: 'Arial',
      fontSize: 11,
      fontStyle: ['bold'],
      fontColor: '#0b2e4a',
    })
    // Archi's alpha 160/255 is written as 63%, and comes back as the byte 0xa1.
    expect(landscape.nodes.find((n) => n.id === 'o-crm')?.appearance).toEqual({
      fillColor: '#e0e0e0a1',
    })
  })

  it('round-trips through Archipelago without losing anything', () => {
    const { xml, problems } = exportExchange(workspace)
    expect(problems).toEqual([])
    const back = read(xml)
    expect(back.views).toHaveLength(3)
    expect(toCanonicalJson(back)).toBe(toCanonicalJson(workspace))
  })
})

describe('our own views through the exchange format (#76)', () => {
  it('round-trips a drawn workspace losslessly, text style and explicit defaults included', () => {
    const workspace = drawnWorkspace()
    const { xml, problems } = exportExchange(workspace)
    expect(problems).toEqual([])
    // Not carried by <style>: these travel in the view's archipelago.style property.
    expect(xml).toContain('archipelago.style')
    const back = read(xml)
    expect(back.views.flatMap((v) => v.nodes)).toHaveLength(8)
    const app = view(back, 'view-landscape').nodes.find((n) => n.id === 'n-app')
    expect(app?.appearance).toEqual({
      fontName: 'Inter',
      fontSize: 11,
      // Black is Archi's default font colour — kept, because this style is ours.
      fontColor: '#000000',
      fontStyle: ['bold', 'italic'],
      textAlignment: 'left',
      textPosition: 'top',
    })
    expect(toCanonicalJson(back)).toBe(toCanonicalJson(workspace))
  })

  it('writes absolute coordinates, as the format requires', () => {
    const { xml } = exportExchange(drawnWorkspace())
    // n-proc sits at (20, 40) inside g-claims at (0, 0); n-app inside it too.
    expect(xml).toContain('identifier="n-proc" x="20" y="40" w="120" h="55"')
    const shifted = drawnWorkspace()
    const group = view(shifted, 'view-landscape').nodes.find((n) => n.id === 'g-claims')
    if (group) group.bounds = { ...group.bounds, x: 100, y: 50 }
    expect(exportExchange(shifted).xml).toContain('identifier="n-proc" x="120" y="90"')
  })

  it('moves a view that reaches above or left of the origin, and says so', () => {
    const workspace = drawnWorkspace()
    const k8s = view(workspace, 'view-landscape').nodes.find((n) => n.id === 'n-k8s')
    if (k8s) k8s.bounds = { ...k8s.bounds, x: -30 }
    const { xml, problems } = exportExchange(workspace)
    expect(xml).toContain('identifier="n-k8s" x="0" y="460"')
    expect(xml).toContain('identifier="g-claims" x="30" y="0"')
    expect(problems.map((p) => p.code)).toEqual(['exchange.view-shifted'])
  })

  it('rounds positions the format cannot hold, and says so', () => {
    const workspace = drawnWorkspace()
    const k8s = view(workspace, 'view-landscape').nodes.find((n) => n.id === 'n-k8s')
    if (k8s) k8s.bounds = { ...k8s.bounds, x: 20.4, width: 0 }
    const { xml, problems } = exportExchange(workspace)
    expect(xml).toContain('identifier="n-k8s" x="20" y="460" w="1"')
    expect(problems.map((p) => p.code)).toEqual(['exchange.view-rounded'])
  })

  it('writes a shape nested in a note into the nearest real container', () => {
    const workspace = drawnWorkspace()
    view(workspace, 'view-landscape').nodes.push({
      id: 'n-sticker',
      kind: 'note',
      text: 'inside the note',
      parent: 'n-note',
      bounds: { x: 5, y: 5, width: 40, height: 20 },
    })
    const { xml, problems } = exportExchange(workspace)
    const back = read(xml)
    const sticker = view(back, 'view-landscape').nodes.find((n) => n.id === 'n-sticker')
    expect(sticker?.parent).toBe('g-claims')
    // Same place on the canvas: n-note is at (300, 40) in g-claims at (0, 0).
    expect(absoluteBounds(view(back, 'view-landscape'), 'n-sticker')).toEqual({
      x: 305,
      y: 45,
      width: 40,
      height: 20,
    })
    expect(problems.map((p) => p.code)).toEqual(['exchange.nesting-flattened'])
  })

  it('renames a shape id that clashes with another id in the file', () => {
    const workspace = drawnWorkspace()
    const detail = view(workspace, 'view-detail')
    // Node ids are per view in our model, but one xs:ID space in the file.
    detail.nodes = detail.nodes.map((n) => (n.id === 'd-app' ? { ...n, id: 'app-claims' } : n))
    detail.connections = detail.connections.map((c) =>
      c.source === 'd-app' ? { ...c, source: 'app-claims' } : c,
    )
    const { xml, problems } = exportExchange(workspace)
    expect(xml).toContain('identifier="app-claims-2"')
    expect(problems.map((p) => p.code)).toEqual(['exchange.view-ids-renamed'])
    const back = view(read(xml), 'view-detail')
    expect(back.connections[0]?.source).toBe('app-claims-2')
  })

  it('leaves out drawings of a relationship the file cannot hold, and says so', () => {
    const workspace = drawnWorkspace()
    // A relationship to an element that is not in the model is not written…
    const relationship = workspace.relationships.find((r) => r.id === 'rel-app-obj')
    if (relationship) relationship.target = 'gone'
    const { xml, problems } = exportExchange(workspace)
    // …so neither is the connection that draws it.
    expect(xml).toContain('identifier="d-app"')
    expect(xml).not.toContain('identifier="d-access"')
    expect(problems.map((p) => p.code)).toEqual([
      'exchange.dangling-relationship',
      'exchange.view-drawing-dropped',
    ])
  })

  it('writes folder identifiers, so folder ids survive the trip', () => {
    const { xml } = exportExchange(drawnWorkspace())
    expect(xml).toContain('<item identifier="f-core">')
    expect(
      read(xml)
        .folders.map((f) => f.id)
        .sort(),
    ).toEqual(
      drawnWorkspace()
        .folders.map((f) => f.id)
        .sort(),
    )
  })
})

describe('what the exchange format holds that Archipelago cannot (#76)', () => {
  it('names every unsupported construct, after keeping everything it could', () => {
    const result = importExchangeXml(unsupportedXml)
    const main = view(result.workspace as Workspace, 'v-main')
    // Presence first: the view and what it could carry landed.
    expect(main.nodes.map((n) => n.id).sort()).toEqual([
      'n-app',
      'n-bound',
      'n-elsewhere',
      'n-orphan',
      'n-svc',
    ])
    expect(main.connections.map((c) => c.id)).toEqual(['c-real'])
    expect(main.nodes.find((n) => n.id === 'n-orphan')?.parent).toBeUndefined()
    expect(main.nodes.find((n) => n.id === 'n-elsewhere')).toMatchObject({
      kind: 'note',
      text: 'Old view',
    })

    expect(result.problems.map((p) => p.code)).toEqual([
      'exchange.dangling-view-node',
      'exchange.label-binding-ignored',
      'exchange.dangling-view-reference',
      'exchange.node-type-unsupported',
      'exchange.dangling-view-connection',
      'exchange.view-type-unsupported',
      'exchange.connection-attachment-ignored',
      'exchange.connection-on-connection',
      'exchange.folder-group-inferred',
      'exchange.organization-unknown-ref',
      'exchange.organization-duplicate-ref',
    ])
  })

  it('files a top-level folder outside the standard groups where its contents belong', () => {
    const workspace = read(unsupportedXml)
    expect(workspace.folders).toEqual([
      { id: 'folder-my-stuff', name: 'My stuff', root: 'application' },
    ])
    expect(workspace.elements.find((e) => e.id === 'e-svc')?.folder).toBe('folder-my-stuff')
    // e-app was listed under Application first; the second listing lost.
    expect(workspace.elements.find((e) => e.id === 'e-app')?.folder).toBeUndefined()
  })

  it("reads Archi's own attachment test file, and says the attachments were not kept", () => {
    const result = importExchangeXml(attachmentsXml)
    expect(result.workspace?.views[0]?.connections).toHaveLength(2)
    expect(result.problems.map((p) => p.code)).toEqual(['exchange.connection-attachment-ignored'])
    expect(result.problems[0]?.message).toContain('4 connection ends')
  })
})

describe('XML text the parser used to mangle (found in #76)', () => {
  it('decodes numeric character references in names and documentation', () => {
    const result =
      importExchangeXml(`<model xmlns="http://www.opengroup.org/xsd/archimate/3.0/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" identifier="m">
  <name xml:lang="en">M</name>
  <elements>
    <element identifier="e1" xsi:type="Capability">
      <name xml:lang="en">Caf&#233; &amp;#65;</name>
      <documentation xml:lang="en">Line one&#xD;&#xA;line two</documentation>
    </element>
  </elements>
</model>`)
    const element = result.workspace?.elements[0]
    expect(element?.name).toBe('Café &#65;')
    expect(element?.documentation).toBe('Line one\r\nline two')
  })

  it('writes a carriage return so that it comes back', () => {
    const workspace = drawnWorkspace()
    const element = workspace.elements[0]
    if (element) element.documentation = 'a\r\nb'
    const back = read(exportExchange(workspace).xml)
    expect(back.elements.find((e) => e.id === element?.id)?.documentation).toBe('a\r\nb')
  })
})
