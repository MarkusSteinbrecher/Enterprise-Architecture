import { describe, expect, it } from 'vitest'
import { validate, type Workspace } from '@/model'
import { smallWorkspace } from '@/test/fixtures'
import { exportExchangeXml, importExchangeXml } from './exchange-format'
import { DEMO_WORKSPACE_XML, loadDemoWorkspace } from './demo'

function roundTrip(workspace: Workspace): Workspace {
  const result = importExchangeXml(exportExchangeXml(workspace))
  expect(result.problems.filter((p) => p.severity === 'error')).toEqual([])
  return result.workspace!
}

describe('exchange format export', () => {
  it('writes a well-formed model with the schema namespaces', () => {
    const xml = exportExchangeXml(smallWorkspace())
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<model ')).toBe(true)
    expect(xml).toContain('xmlns="http://www.opengroup.org/xsd/archimate/3.0/"')
    expect(xml).toContain('xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"')
    expect(xml).toContain('<name xml:lang="en">ArchiSurance</name>')
    expect(xml.trimEnd().endsWith('</model>')).toBe(true)
  })

  it('keeps the element order the schema requires', () => {
    const xml = exportExchangeXml(smallWorkspace())
    const element = xml.slice(xml.indexOf('identifier="app-claims"'))
    const name = element.indexOf('<name')
    const documentation = element.indexOf('<documentation')
    const properties = element.indexOf('<properties>')
    expect(name).toBeLessThan(documentation)
    expect(documentation).toBeLessThan(properties)
    // …and elements come before relationships, which come before definitions.
    expect(xml.indexOf('<elements>')).toBeLessThan(xml.indexOf('<relationships>'))
    expect(xml.indexOf('<relationships>')).toBeLessThan(xml.indexOf('<propertyDefinitions>'))
  })

  it('escapes markup in names and documentation', () => {
    const xml = exportExchangeXml({
      ...smallWorkspace(),
      name: 'Risk & <Underwriting>',
    })
    expect(xml).toContain('<name xml:lang="en">Risk &amp; &lt;Underwriting&gt;</name>')
  })

  it('declares one property definition per distinct key and references it', () => {
    const xml = exportExchangeXml(smallWorkspace())
    const owners = xml.match(/<name xml:lang="en">owner<\/name>/g) ?? []
    expect(owners).toHaveLength(1)
    expect(xml).toContain('propertyDefinitionRef="propid-1"')
  })

  it('writes accessType as the native attribute, not as a property', () => {
    const xml = exportExchangeXml(smallWorkspace())
    expect(xml).toContain('accessType="ReadWrite"')
    expect(xml).not.toContain('archipelago.accessType')
  })
})

describe('exchange format import', () => {
  it('round-trips a workspace without losing anything that matters', () => {
    const original = smallWorkspace()
    const restored = roundTrip(original)

    expect(restored.elements).toHaveLength(original.elements.length)
    expect(restored.relationships).toHaveLength(original.relationships.length)
    expect(restored.name).toBe(original.name)

    const app = restored.elements.find((e) => e.id === 'app-claims')
    expect(app?.type).toBe('ApplicationComponent')
    expect(app?.documentation).toContain('rules-driven')
    expect(app?.properties).toEqual({ owner: 'Claims' })
    expect(app?.profile).toEqual(original.elements.find((e) => e.id === 'app-claims')?.profile)

    const serving = restored.relationships.find((r) => r.id === 'rel-app-proc')
    expect(serving?.profile).toEqual({ annualCost: 1_200_000, currency: 'EUR' })
    expect(restored.relationships.find((r) => r.id === 'rel-app-obj')?.profile?.accessType).toBe(
      'ReadWrite',
    )
  })

  it('keeps the architect’s own properties apart from profile properties', () => {
    const restored = roundTrip(smallWorkspace())
    const capability = restored.elements.find((e) => e.id === 'cap-claim')
    expect(capability?.properties).toEqual({ owner: 'Claims' })
    expect(capability?.profile).toEqual({ tags: ['Core'] })
  })

  it('is stable across a second round trip', () => {
    const once = exportExchangeXml(roundTrip(smallWorkspace()))
    const twice = exportExchangeXml(roundTrip(importExchangeXml(once).workspace!))
    expect(twice).toBe(once)
  })

  it('reads a file that uses a different namespace prefix', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<archimate:model xmlns:archimate="http://www.opengroup.org/xsd/archimate/3.0/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" identifier="m1">
  <archimate:name xml:lang="en">Prefixed</archimate:name>
  <archimate:elements>
    <archimate:element identifier="e1" xsi:type="ApplicationComponent">
      <archimate:name xml:lang="en">Portal</archimate:name>
    </archimate:element>
  </archimate:elements>
</archimate:model>`
    const result = importExchangeXml(xml)
    expect(result.ok).toBe(true)
    expect(result.workspace?.name).toBe('Prefixed')
    expect(result.workspace?.elements[0]?.name).toBe('Portal')
  })

  it('reads a name that carries no xml:lang', () => {
    const xml = `<model xmlns="${'http://www.opengroup.org/xsd/archimate/3.0/'}" identifier="m1">
  <name>Plain</name>
  <elements><element identifier="e1" xsi:type="Capability"><name>Claims</name></element></elements>
</model>`
    expect(importExchangeXml(xml).workspace?.elements[0]?.name).toBe('Claims')
  })
})

describe('exchange format problems', () => {
  it('rejects XML that is not a model', () => {
    const result = importExchangeXml('<html><body>nope</body></html>', 'page.html')
    expect(result.ok).toBe(false)
    expect(result.problems[0]).toMatchObject({ code: 'exchange.not-a-model', file: 'page.html' })
  })

  it('never crashes on malformed input', () => {
    for (const junk of ['', '   ', '<model', '<<>>', '{"json":true}']) {
      expect(() => importExchangeXml(junk)).not.toThrow()
      expect(importExchangeXml(junk).ok).toBe(false)
    }
  })

  it('skips unknown types and dangling relationships, and keeps the rest', () => {
    const xml = `<model xmlns="http://www.opengroup.org/xsd/archimate/3.0/" identifier="m1">
  <name xml:lang="en">Partly broken</name>
  <elements>
    <element identifier="e1" xsi:type="ApplicationComponent"><name xml:lang="en">Portal</name></element>
    <element identifier="e2" xsi:type="Microservice"><name xml:lang="en">Mesh</name></element>
    <element identifier="e3"><name xml:lang="en">Typeless</name></element>
  </elements>
  <relationships>
    <relationship identifier="r1" source="e1" target="e2" xsi:type="Serving"/>
    <relationship identifier="r2" source="e1" target="e1" xsi:type="Consumes"/>
  </relationships>
</model>`
    const result = importExchangeXml(xml, 'partly.xml')
    expect(result.ok).toBe(true)
    expect(result.workspace?.elements.map((e) => e.id)).toEqual(['e1'])
    expect(result.workspace?.relationships).toEqual([])
    expect(result.problems.map((p) => p.code)).toEqual([
      'exchange.unknown-element-type',
      'exchange.unknown-element-type',
      'exchange.dangling-relationship',
      'exchange.unknown-relationship-type',
    ])
    expect(result.problems.every((p) => p.file === 'partly.xml')).toBe(true)
  })

  it('reports diagrams and folders as skipped rather than dropping them silently', () => {
    const xml = `<model xmlns="http://www.opengroup.org/xsd/archimate/3.0/" identifier="m1">
  <name xml:lang="en">With views</name>
  <elements><element identifier="e1" xsi:type="Capability"><name xml:lang="en">C</name></element></elements>
  <organizations><item identifierRef="e1"/></organizations>
  <views><diagrams><view identifier="v1" xsi:type="Diagram"><name xml:lang="en">Layered</name></view></diagrams></views>
</model>`
    const codes = importExchangeXml(xml).problems.map((p) => p.code)
    expect(codes).toContain('exchange.views-skipped')
    expect(codes).toContain('exchange.organizations-skipped')
  })

  it('skips a duplicate identifier instead of overwriting the first element', () => {
    const xml = `<model xmlns="http://www.opengroup.org/xsd/archimate/3.0/" identifier="m1">
  <name xml:lang="en">Dupes</name>
  <elements>
    <element identifier="e1" xsi:type="Capability"><name xml:lang="en">First</name></element>
    <element identifier="e1" xsi:type="Capability"><name xml:lang="en">Second</name></element>
  </elements>
</model>`
    const result = importExchangeXml(xml)
    expect(result.workspace?.elements).toHaveLength(1)
    expect(result.workspace?.elements[0]?.name).toBe('First')
    expect(result.problems[0]?.code).toBe('exchange.duplicate-id')
  })
})

describe('the bundled demo workspace', () => {
  it('imports without errors', () => {
    const result = importExchangeXml(DEMO_WORKSPACE_XML, 'archisurance.xml')
    expect(result.problems.filter((p) => p.severity === 'error')).toEqual([])
    expect(result.ok).toBe(true)
  })

  it('has the element and relationship counts of the source model', () => {
    const workspace = loadDemoWorkspace()
    expect(workspace.elements).toHaveLength(29)
    expect(workspace.relationships).toHaveLength(47)
    expect(workspace.name).toBe('ArchiSurance')
  })

  it('is a valid ArchiMate model', () => {
    const report = validate(loadDemoWorkspace())
    expect(report.errors).toEqual([])
  })

  it('covers the element types the fact sheet has to survive', () => {
    const types = new Set(loadDemoWorkspace().elements.map((e) => e.type))
    expect([...types].toSorted()).toEqual([
      'ApplicationComponent',
      'BusinessActor',
      'BusinessProcess',
      'Capability',
      'DataObject',
      'Goal',
      'Node',
      'SystemSoftware',
      'TechnologyService',
      'WorkPackage',
    ])
  })

  it('carries portfolio assessments on applications and none on capabilities', () => {
    const workspace = loadDemoWorkspace()
    const app = workspace.elements.find((e) => e.id === 'app-policy-ha')
    expect(app?.profile?.timeClassification).toBe('Migrate')
    expect(app?.profile?.functionalFit).toBe(2)
    expect(app?.profile?.lifecycle).toEqual({
      plan: '2006-01-01',
      phaseIn: '2007-01-01',
      active: '2008-01-01',
      phaseOut: '2027-01-01',
      endOfLife: '2029-01-01',
    })

    const capability = workspace.elements.find((e) => e.id === 'cap-claim')
    expect(capability?.profile?.lifecycle).toBeUndefined()
    expect(capability?.profile?.tags).toEqual(['Core', 'Differentiating'])
  })

  it('exercises the relationship types the graph draws', () => {
    const types = new Set(loadDemoWorkspace().relationships.map((r) => r.type))
    expect([...types].toSorted()).toEqual([
      'Access',
      'Assignment',
      'Association',
      'Composition',
      'Flow',
      'Influence',
      'Realization',
      'Serving',
    ])
  })
})
