import { describe, expect, it } from 'vitest'
import { DEFAULT_TAG_GROUP, SCHEMA_VERSION, validate, type Element, type Workspace } from '@/model'
import { isExchangeSafeId } from '@/store/ids'
import { smallWorkspace } from '@/test/fixtures'
import { fromCanonicalJson, toCanonicalJson } from './canonical-json'
import { exportExchange, exportExchangeXml, importExchangeXml } from './exchange-format'
import { DEMO_WORKSPACE_XML, loadDemoWorkspace } from './demo'
import junctionFlowXml from './fixtures/junction-flow.xml?raw'

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

describe('exchange hardening (review findings, PR #17)', () => {
  it('skips duplicate relationship identifiers and says so', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<model xmlns="http://www.opengroup.org/xsd/archimate/3.0/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" identifier="m">
  <elements>
    <element identifier="a" xsi:type="ApplicationComponent"><name xml:lang="en">A</name></element>
    <element identifier="b" xsi:type="ApplicationComponent"><name xml:lang="en">B</name></element>
  </elements>
  <relationships>
    <relationship identifier="r" source="a" target="b" xsi:type="Serving"/>
    <relationship identifier="r" source="b" target="a" xsi:type="Flow"/>
  </relationships>
</model>`
    const result = importExchangeXml(xml)
    expect(result.workspace?.relationships).toHaveLength(1)
    expect(result.workspace?.relationships[0]?.type).toBe('Serving')
    expect(result.problems.map((p) => p.code)).toContain('exchange.duplicate-relationship-id')
  })

  it('strips XML-illegal control characters on export so the file stays well-formed', () => {
    const workspace = smallWorkspace()
    const first = workspace.elements[0]!
    first.name = 'Claim' + '\u000B' + 'Handling'
    const xml = exportExchangeXml(workspace)
    // eslint-disable-next-line no-control-regex
    expect(xml).not.toMatch(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/)
    const back = importExchangeXml(xml)
    expect(back.ok).toBe(true)
    expect(back.workspace?.elements.find((e) => e.id === first.id)?.name).toBe('Claim' + 'Handling')
  })

  it('treats an empty annualCost property as no cost data, not a cost of zero', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<model xmlns="http://www.opengroup.org/xsd/archimate/3.0/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" identifier="m">
  <elements>
    <element identifier="a" xsi:type="ApplicationComponent"><name xml:lang="en">A</name></element>
    <element identifier="b" xsi:type="ApplicationComponent"><name xml:lang="en">B</name></element>
  </elements>
  <relationships>
    <relationship identifier="r" source="a" target="b" xsi:type="Serving">
      <properties>
        <property propertyDefinitionRef="p1"><value></value></property>
      </properties>
    </relationship>
  </relationships>
  <propertyDefinitions>
    <propertyDefinition identifier="p1" type="string"><name xml:lang="en">archipelago.annualCost</name></propertyDefinition>
  </propertyDefinitions>
</model>`
    const result = importExchangeXml(xml)
    expect(result.ok).toBe(true)
    expect(result.workspace?.relationships[0]?.profile?.annualCost).toBeUndefined()
  })
})

describe('junctions (issue #36)', () => {
  const importFixture = () => {
    const result = importExchangeXml(junctionFlowXml, 'junction-flow.xml')
    expect(result.problems).toEqual([])
    return result.workspace!
  }

  it('reads both concrete junction types and keeps every relationship through them', () => {
    const workspace = importFixture()
    expect(workspace.elements).toHaveLength(7)
    expect(workspace.relationships).toHaveLength(7)
    expect(
      workspace.elements
        .filter((element) => element.type === 'Junction')
        .map((junction) => [junction.id, junction.junctionKind]),
    ).toEqual([
      // Absent, not 'and'. The canonical writer spells the default kind by
      // leaving it out, so reading `AndJunction` back as an explicit 'and' made
      // the same model produce two different files (ADR 0004, #37).
      ['jun-split', undefined],
      ['jun-decide', 'or'],
    ])
  })

  it('is a valid ArchiMate model once read', () => {
    expect(validate(importFixture()).errors).toEqual([])
  })

  it('writes junctions back the way the schema spells them', () => {
    const xml = exportExchangeXml(importFixture())
    expect(xml).toContain('xsi:type="AndJunction"')
    expect(xml).toContain('xsi:type="OrJunction"')
    expect(xml).not.toContain('xsi:type="Junction"')
  })

  it('round-trips the whole flow chain byte for byte', () => {
    const once = exportExchangeXml(importFixture())
    const twice = exportExchangeXml(importExchangeXml(once).workspace!)
    expect(twice).toBe(once)
  })

  it('reads a bare Junction as an and-junction, which is what the specification calls it', () => {
    const xml = `<model xmlns="http://www.opengroup.org/xsd/archimate/3.0/" identifier="m1">
  <name xml:lang="en">Bare</name>
  <elements><element identifier="j" xsi:type="Junction"><name xml:lang="en">Split</name></element></elements>
</model>`
    const element = importExchangeXml(xml).workspace?.elements[0]
    expect(element).toMatchObject({ type: 'Junction' })
    // An and-junction *is* one with no kind — the specification's default, and
    // the only spelling the canonical writer emits.
    expect(element?.junctionKind).toBeUndefined()
    expect(exportExchangeXml(importExchangeXml(xml).workspace!)).toContain('xsi:type="AndJunction"')
  })

  // Finding 9 of the #37 review: the field the canonical writer omits was being
  // invented by the reader, so two files holding one model were not one file.
  it('gives an and-junction the same canonical JSON however the file spelled it', () => {
    const spell = (type: string) =>
      toCanonicalJson(
        importExchangeXml(
          `<model xmlns="http://www.opengroup.org/xsd/archimate/3.0/" identifier="m1">
  <name xml:lang="en">Bare</name>
  <elements><element identifier="j" xsi:type="${type}"><name xml:lang="en">Split</name></element></elements>
</model>`,
        ).workspace!,
      )
    expect(spell('AndJunction')).toBe(spell('Junction'))
    expect(spell('AndJunction')).not.toContain('junctionKind')
  })

  it('imports an xsi:type naming an Object.prototype member as nothing at all', () => {
    // `JUNCTION_TYPES['toString']` on an object literal resolves to a *function*,
    // so the type check passed, the element became a Junction that was never in
    // the file, and junctionKind held something JSON.stringify drops (#37).
    const xml = `<model xmlns="http://www.opengroup.org/xsd/archimate/3.0/" identifier="m1">
  <name xml:lang="en">Odd</name>
  <elements><element identifier="e1" xsi:type="toString"><name xml:lang="en">Odd</name></element></elements>
</model>`
    const result = importExchangeXml(xml)
    expect(result.workspace?.elements).toEqual([])
    expect(result.problems.map((p) => p.code)).toEqual(['exchange.unknown-element-type'])
  })

  it('rejects the other prototype members the same lookup used to accept', () => {
    for (const type of ['constructor', 'valueOf', 'hasOwnProperty', '__proto__']) {
      const xml = `<model xmlns="http://www.opengroup.org/xsd/archimate/3.0/" identifier="m1">
  <name xml:lang="en">Odd</name>
  <elements><element identifier="e1" xsi:type="${type}"><name xml:lang="en">Odd</name></element></elements>
</model>`
      expect(importExchangeXml(xml).workspace?.elements, type).toEqual([])
    }
  })
})

describe('identifiers that are not XML names (issue #36)', () => {
  function oddIds(): Workspace {
    return {
      ...smallWorkspace(),
      id: '9 workspace',
      elements: [
        { id: '9abc', type: 'ApplicationComponent', name: 'Portal', properties: {} },
        { id: 'a b', type: 'Capability', name: 'Claims', properties: {} },
      ],
      relationships: [
        { id: 'rel:1', type: 'Realization', source: '9abc', target: 'a b', properties: {} },
      ],
    }
  }

  it('rewrites them consistently, references included, and says what it did', () => {
    const { xml, problems } = exportExchange(oddIds())
    expect(xml).toContain('<element identifier="id-9abc"')
    expect(xml).toContain('<element identifier="a-b"')
    expect(xml).toContain('source="id-9abc" target="a-b"')
    expect(problems.map((p) => p.code)).toEqual([
      'exchange.id-rewritten',
      'exchange.id-rewritten',
      'exchange.id-rewritten',
      'exchange.id-rewritten',
    ])
    expect(problems.map((p) => p.subject)).toEqual(['9abc', 'a b', 'rel:1', '9 workspace'])
  })

  it('never writes an identifier or a reference the schema would reject', () => {
    const { xml } = exportExchange(oddIds())
    const written = [...xml.matchAll(/(?:identifier|source|target)="([^"]+)"/g)].map((m) => m[1]!)
    expect(written.length).toBeGreaterThan(0)
    expect(written.filter((id) => !isExchangeSafeId(id))).toEqual([])
  })

  it('reads the rewritten file back as a whole model', () => {
    const back = importExchangeXml(exportExchange(oddIds()).xml)
    expect(back.problems.filter((p) => p.severity === 'error')).toEqual([])
    expect(back.workspace?.elements).toHaveLength(2)
    expect(back.workspace?.relationships).toHaveLength(1)
  })

  it('leaves ids that are already valid exactly as they were', () => {
    const { xml, problems } = exportExchange(smallWorkspace())
    expect(problems).toEqual([])
    expect(xml).toContain('identifier="app-claims"')
  })

  it('leaves out a relationship pointing at something that is not in the model', () => {
    const workspace = smallWorkspace()
    workspace.relationships.push({
      id: 'rel-ghost',
      type: 'Serving',
      source: 'app-claims',
      target: 'ghost',
      properties: {},
    })
    const { xml, problems } = exportExchange(workspace)
    expect(xml).not.toContain('rel-ghost')
    expect(problems).toEqual([
      expect.objectContaining({ code: 'exchange.dangling-relationship', subject: 'rel-ghost' }),
    ])
  })
})

describe('what the exchange format has no home for (issue #36)', () => {
  it('carries saved views and custom tag groups through the round trip', () => {
    const workspace: Workspace = {
      ...smallWorkspace(),
      views: [
        {
          id: 'view-eol',
          name: 'End-of-life applications',
          kind: 'graph',
          filter: { facets: ['layer:app', 'lifecycle:endOfLife'], mode: 'AND' },
          colorView: 'lifecycle',
        },
      ],
      tagGroups: [
        {
          id: 'tg-portfolio',
          name: 'Portfolio',
          multiSelect: true,
          tags: [
            { name: 'Buy, hold', colourToken: 'var(--app)' },
            { name: 'Core', colourToken: 'var(--accent2)' },
          ],
        },
      ],
    }
    const restored = roundTrip(workspace)
    expect(restored.views).toEqual(workspace.views)
    expect(restored.tagGroups).toEqual(workspace.tagGroups)
  })

  it('leaves the default tag groups out of the file and restores them on the way back', () => {
    const xml = exportExchangeXml(smallWorkspace())
    expect(xml).not.toContain('archipelago.tagGroups')
    expect(importExchangeXml(xml).workspace?.tagGroups).toEqual([DEFAULT_TAG_GROUP])
  })

  it('reports carried views it cannot read instead of pretending there were none', () => {
    const xml = `<model xmlns="http://www.opengroup.org/xsd/archimate/3.0/" identifier="m1">
  <name xml:lang="en">Broken carry</name>
  <properties><property propertyDefinitionRef="p1"><value xml:lang="en">not json</value></property></properties>
  <propertyDefinitions>
    <propertyDefinition identifier="p1" type="string"><name xml:lang="en">archipelago.views</name></propertyDefinition>
  </propertyDefinitions>
</model>`
    const result = importExchangeXml(xml)
    expect(result.workspace?.views).toEqual([])
    expect(result.problems.map((p) => p.code)).toContain('exchange.carried-unreadable')
  })

  it('reports model-level properties that belong to another tool', () => {
    const xml = `<model xmlns="http://www.opengroup.org/xsd/archimate/3.0/" identifier="m1">
  <name xml:lang="en">Foreign</name>
  <properties><property propertyDefinitionRef="p1"><value xml:lang="en">Archi</value></property></properties>
  <propertyDefinitions>
    <propertyDefinition identifier="p1" type="string"><name xml:lang="en">generatedBy</name></propertyDefinition>
  </propertyDefinitions>
</model>`
    expect(importExchangeXml(xml).problems).toEqual([
      expect.objectContaining({ code: 'exchange.model-properties-skipped', severity: 'info' }),
    ])
  })

  it('reports a property whose definition is missing rather than dropping it in silence', () => {
    const xml = `<model xmlns="http://www.opengroup.org/xsd/archimate/3.0/" identifier="m1">
  <name xml:lang="en">Missing definition</name>
  <elements>
    <element identifier="e1" xsi:type="Capability">
      <name xml:lang="en">Claims</name>
      <properties><property propertyDefinitionRef="p9"><value xml:lang="en">Claims</value></property></properties>
    </element>
  </elements>
</model>`
    const result = importExchangeXml(xml)
    expect(result.workspace?.elements[0]?.properties).toEqual({})
    expect(result.problems).toEqual([
      expect.objectContaining({ code: 'exchange.property-unresolved', severity: 'warning' }),
    ])
  })
})

describe('property fidelity (issue #36)', () => {
  function withProperties(properties: Record<string, string | number | boolean>): Workspace {
    const workspace = smallWorkspace()
    workspace.elements[0]!.properties = properties
    return workspace
  }

  function propertiesOf(workspace: Workspace): Record<string, unknown> {
    return workspace.elements.find((element) => element.id === 'cap-claim')!.properties
  }

  it('keeps an archipelago key this build does not know', () => {
    const restored = roundTrip(
      withProperties({ owner: 'Claims', 'archipelago.businessValue': 'high' }),
    )
    expect(propertiesOf(restored)).toEqual({ owner: 'Claims', 'archipelago.businessValue': 'high' })
  })

  it('keeps boolean and number properties typed', () => {
    const workspace = withProperties({ pii: true, capacity: 42, owner: 'Claims' })
    const xml = exportExchangeXml(workspace)
    expect(xml).toMatch(
      /<propertyDefinition identifier="[^"]+" type="boolean">\s*<name xml:lang="en">pii<\/name>/,
    )
    expect(xml).toMatch(
      /<propertyDefinition identifier="[^"]+" type="number">\s*<name xml:lang="en">capacity<\/name>/,
    )
    expect(propertiesOf(importExchangeXml(xml).workspace!)).toEqual({
      pii: true,
      capacity: 42,
      owner: 'Claims',
    })
  })

  it('writes a key used inconsistently as text, and says so', () => {
    const workspace = withProperties({ capacity: 42 })
    workspace.elements[1]!.properties = { capacity: 'unknown' }
    const { xml, problems } = exportExchange(workspace)
    expect(xml).toMatch(
      /<propertyDefinition identifier="[^"]+" type="string">\s*<name xml:lang="en">capacity<\/name>/,
    )
    expect(problems).toEqual([
      expect.objectContaining({ code: 'exchange.property-type-mixed', severity: 'info' }),
    ])
  })

  it('keeps a property whose value is the empty string', () => {
    const once = exportExchangeXml(withProperties({ owner: '' }))
    const restored = importExchangeXml(once).workspace!
    expect(propertiesOf(restored)).toEqual({ owner: '' })
    expect(exportExchangeXml(restored)).toBe(once)
  })

  it('keeps a tag that contains a comma as one tag', () => {
    const workspace = smallWorkspace()
    workspace.elements[0]!.profile = { tags: ['Buy, hold', 'Core'] }
    const restored = roundTrip(workspace)
    expect(restored.elements.find((e) => e.id === 'cap-claim')?.profile?.tags).toEqual([
      'Buy, hold',
      'Core',
    ])
  })
})

describe('hardening (review findings, PR #37)', () => {
  function element(id: string, properties: Record<string, string | number | boolean>): Element {
    return { id, type: 'ApplicationComponent', name: 'Portal', properties }
  }

  function workspaceOf(elements: Element[]): Workspace {
    return {
      id: 'ws-hardening',
      name: 'Hardening',
      schemaVersion: SCHEMA_VERSION,
      elements,
      relationships: [],
      views: [],
      tagGroups: [DEFAULT_TAG_GROUP],
    }
  }

  /** Every xs:ID the file declares — `identifier`, never a reference. */
  function declaredIds(xml: string): string[] {
    return [...xml.matchAll(/\sidentifier="([^"]*)"/g)].map((match) => match[1]!)
  }

  /** A file declaring one property of `type`, holding `value` verbatim. */
  function fileWithProperty(type: string, value: string, key = 'assetNo'): string {
    return `<model xmlns="http://www.opengroup.org/xsd/archimate/3.0/" identifier="m1">
  <name xml:lang="en">Typed</name>
  <elements>
    <element identifier="e1" xsi:type="ApplicationComponent">
      <name xml:lang="en">Portal</name>
      <properties><property propertyDefinitionRef="p1"><value xml:lang="en">${value}</value></property></properties>
    </element>
  </elements>
  <propertyDefinitions>
    <propertyDefinition identifier="p1" type="${type}"><name xml:lang="en">${key}</name></propertyDefinition>
  </propertyDefinitions>
</model>`
  }

  describe('finding 1 — one xs:ID namespace, property definitions included', () => {
    it('does not collide a minted propid with an element that is called propid-1', () => {
      const { xml, problems } = exportExchange(workspaceOf([element('propid-1', { owner: 'x' })]))
      const ids = declaredIds(xml)
      expect(ids).toContain('propid-1')
      expect(new Set(ids).size, `duplicate xs:ID in ${ids.join(', ')}`).toBe(ids.length)
      expect(problems).toEqual([])
    })

    it('does not collide with an id that only becomes propid-1 once sanitised', () => {
      const { xml } = exportExchange(workspaceOf([element('propid/1', { owner: 'x' })]))
      const ids = declaredIds(xml)
      expect(ids).toContain('propid-1')
      expect(new Set(ids).size, `duplicate xs:ID in ${ids.join(', ')}`).toBe(ids.length)
    })

    it('still reads the file it wrote around the collision', () => {
      const { xml } = exportExchange(workspaceOf([element('propid-1', { owner: 'x' })]))
      const result = importExchangeXml(xml)
      expect(result.problems.filter((p) => p.severity === 'error')).toEqual([])
      expect(result.workspace?.elements[0]?.properties).toEqual({ owner: 'x' })
    })
  })

  describe('finding 3 — a tag spelled like the tag encoding', () => {
    // The comma form and the JSON-array form have to be told apart exactly. The
    // separator rule's read side: a value that *looks like* the escaped form.
    const awkward = [
      ['a tag that is the encoding', '["a"]'],
      ['an empty array', '[]'],
      ['a bare bracket', '['],
      ['something that parses as JSON but is one tag', '[a, b]'],
      ['a comma, which is the separator', 'Buy, hold'],
      ['leading padding', '  padded'],
      ['a quote and a backslash', 'say "hi" \\ bye'],
    ] as const

    it.each(awkward)('round-trips %s', (_what, tag) => {
      const workspace = workspaceOf([element('e1', {})])
      workspace.elements[0]!.profile = { tags: [tag, 'Core'] }
      const restored = roundTrip(workspace)
      expect(restored.elements[0]?.profile?.tags).toEqual([tag, 'Core'])
    })

    it('does not let a tag named ["a"] come back as the tag a', () => {
      const workspace = workspaceOf([element('e1', {})])
      workspace.elements[0]!.profile = { tags: ['["a"]'] }
      expect(roundTrip(workspace).elements[0]?.profile?.tags).toEqual(['["a"]'])
    })

    it('does not let a tag named [] take profile.tags with it', () => {
      const workspace = workspaceOf([element('e1', {})])
      workspace.elements[0]!.profile = { tags: ['[]'] }
      expect(roundTrip(workspace).elements[0]?.profile?.tags).toEqual(['[]'])
    })
  })

  describe('finding 4 — a known archipelago key with a value this build cannot read', () => {
    it('keeps the value as an ordinary property instead of deleting it', () => {
      const xml = exportExchangeXml(
        workspaceOf([
          element('e1', { owner: 'keep me', 'archipelago.timeClassification': 'Banana' }),
        ]),
      )
      const result = importExchangeXml(xml)
      expect(result.workspace?.elements[0]?.properties).toEqual({
        owner: 'keep me',
        'archipelago.timeClassification': 'Banana',
      })
      expect(result.workspace?.elements[0]?.profile).toBeUndefined()
    })

    it('says the assessment did not arrive rather than saying nothing', () => {
      const xml = exportExchangeXml(
        workspaceOf([element('e1', { 'archipelago.functionalFit': 'quite good' })]),
      )
      expect(importExchangeXml(xml).problems.map((p) => p.code)).toContain(
        'exchange.profile-value-unreadable',
      )
    })

    it('keeps it through a second trip, byte for byte', () => {
      const once = exportExchangeXml(
        workspaceOf([element('e1', { 'archipelago.timeClassification': 'Banana' })]),
      )
      expect(exportExchangeXml(importExchangeXml(once).workspace!)).toBe(once)
    })

    it('does the same for a relationship profile key', () => {
      const workspace = workspaceOf([
        element('e1', {}),
        { id: 'e2', type: 'Node', name: 'Host', properties: {} },
      ])
      workspace.relationships = [
        {
          id: 'r1',
          type: 'Association',
          source: 'e1',
          target: 'e2',
          properties: { 'archipelago.annualCost': 'about a lot' },
        },
      ]
      const result = importExchangeXml(exportExchangeXml(workspace))
      expect(result.workspace?.relationships[0]?.properties).toEqual({
        'archipelago.annualCost': 'about a lot',
      })
      expect(result.problems.map((p) => p.code)).toContain('exchange.profile-value-unreadable')
    })
  })

  describe('finding 5 — a number the text of which does not survive Number()', () => {
    it.each([
      ['a leading zero', '0912345678'],
      ['trailing cents', '1.50'],
      ['more digits than a double holds', '12345678901234567890'],
      ['exponent notation', '1e3'],
      ['not a number at all', 'n/a'],
      ['nothing', ''],
    ])('keeps %s as the text the file held', (_what, value) => {
      const result = importExchangeXml(fileWithProperty('number', value))
      expect(result.workspace?.elements[0]?.properties.assetNo).toBe(value)
    })

    it('still reads a number whose text does survive', () => {
      const result = importExchangeXml(fileWithProperty('number', '42'))
      expect(result.workspace?.elements[0]?.properties.assetNo).toBe(42)
    })

    it('keeps a boolean definition holding something that is not a boolean', () => {
      const result = importExchangeXml(fileWithProperty('boolean', 'maybe', 'pii'))
      expect(result.workspace?.elements[0]?.properties.pii).toBe('maybe')
    })

    it('writes the untouched text back out, so the file round-trips', () => {
      const once = fileWithProperty('number', '0912345678')
      const twice = exportExchangeXml(importExchangeXml(once).workspace!)
      expect(twice).toContain('<value xml:lang="en">0912345678</value>')
      expect(twice).toContain('type="number"')
    })
  })

  describe('finding 6 — a declared type that has no counterpart in the model', () => {
    it.each(['currency', 'date', 'time'])(
      'keeps a %s declaration through the round trip',
      (type) => {
        const once = fileWithProperty(type, '2024-01-01', 'validUntil')
        const workspace = importExchangeXml(once).workspace!
        expect(workspace.propertyTypes).toEqual({ validUntil: type })
        const twice = exportExchangeXml(workspace)
        expect(twice).toMatch(
          new RegExp(
            `<propertyDefinition identifier="[^"]+" type="${type}">\\s*<name xml:lang="en">validUntil</name>`,
          ),
        )
        // And the value itself is untouched.
        expect(twice).toContain('<value xml:lang="en">2024-01-01</value>')
      },
    )

    it('carries the declaration through canonical JSON too', () => {
      const workspace = importExchangeXml(
        fileWithProperty('date', '2024-01-01', 'validUntil'),
      ).workspace!
      const back = fromCanonicalJson(toCanonicalJson(workspace))
      expect(back.problems).toEqual([])
      expect(back.workspace?.propertyTypes).toEqual({ validUntil: 'date' })
      expect(exportExchangeXml(back.workspace!)).toBe(exportExchangeXml(workspace))
    })

    it('lets the value decide when the value knows better', () => {
      // A key declared `date` but holding a boolean is a boolean: the carried
      // declaration only fills in where `typeof value` can say nothing but "string".
      const workspace = importExchangeXml(
        fileWithProperty('date', '2024-01-01', 'validUntil'),
      ).workspace!
      workspace.elements[0]!.properties.validUntil = true
      expect(exportExchangeXml(workspace)).toMatch(
        /<propertyDefinition identifier="[^"]+" type="boolean">\s*<name xml:lang="en">validUntil<\/name>/,
      )
    })

    it('reports a declared type the exchange format has no such thing as', () => {
      const result = importExchangeXml(fileWithProperty('banana', 'yellow', 'fruit'))
      expect(result.problems.map((p) => p.code)).toContain('exchange.property-type-unknown')
      expect(result.workspace?.elements[0]?.properties.fruit).toBe('yellow')
      expect(result.workspace?.propertyTypes).toBeUndefined()
    })
  })

  describe('finding 7 — a tag group with no tags in it yet', () => {
    const empty = { id: 'tg-risk', name: 'Risk', multiSelect: false, tags: [] }

    it('survives the exchange round trip instead of being blamed on the file', () => {
      const workspace = { ...smallWorkspace(), tagGroups: [DEFAULT_TAG_GROUP, empty] }
      const result = importExchangeXml(exportExchangeXml(workspace))
      // The writer pruned `tags: []` and `isTagGroup` then rejected what it had
      // just written, so the group vanished *and* the file was blamed for it.
      expect(result.problems).toEqual([])
      expect(result.workspace?.tagGroups.find((group) => group.id === 'tg-risk')).toEqual(empty)
      expect(result.workspace?.tagGroups).toHaveLength(2)
    })
  })

  describe('finding 10 — the fallback branches nothing was driving', () => {
    it('counts the carried views it had to drop', () => {
      const xml = `<model xmlns="http://www.opengroup.org/xsd/archimate/3.0/" identifier="m1">
  <name xml:lang="en">Half broken carry</name>
  <properties><property propertyDefinitionRef="p1"><value xml:lang="en">[{"id":"v1","name":"Kept","kind":"graph"},{"nope":true},7]</value></property></properties>
  <propertyDefinitions>
    <propertyDefinition identifier="p1" type="string"><name xml:lang="en">archipelago.views</name></propertyDefinition>
  </propertyDefinitions>
</model>`
      const result = importExchangeXml(xml)
      expect(result.workspace?.views.map((view) => view.id)).toEqual(['v1'])
      expect(
        result.problems.find((p) => p.code === 'exchange.carried-unreadable')?.message,
      ).toContain('2 of the 3 saved views')
    })
  })
})

describe('a property key the writer did not choose (found while fixing #37 finding 2)', () => {
  const withKey = (key: string) =>
    `<model xmlns="http://www.opengroup.org/xsd/archimate/3.0/" identifier="m1">
  <name xml:lang="en">Proto</name>
  <elements>
    <element identifier="e1" xsi:type="ApplicationComponent">
      <name xml:lang="en">Portal</name>
      <properties>
        <property propertyDefinitionRef="p1"><value xml:lang="en">mine</value></property>
        <property propertyDefinitionRef="p2"><value xml:lang="en">kept</value></property>
      </properties>
    </element>
  </elements>
  <propertyDefinitions>
    <propertyDefinition identifier="p1" type="string"><name xml:lang="en">${key}</name></propertyDefinition>
    <propertyDefinition identifier="p2" type="string"><name xml:lang="en">owner</name></propertyDefinition>
  </propertyDefinitions>
</model>`

  // `out['__proto__'] = 'mine'` calls the prototype setter, which does nothing
  // for a string — so the property was read, assigned and gone, problems: [].
  // The write-side twin of the prototype *lookup* in finding 2.
  it.each(['__proto__', 'constructor', 'toString', 'hasOwnProperty'])(
    'keeps a property called %s',
    (key) => {
      const result = importExchangeXml(withKey(key))
      expect(result.problems).toEqual([])
      expect(result.workspace?.elements[0]?.properties).toEqual({ [key]: 'mine', owner: 'kept' })
      expect(exportExchangeXml(result.workspace!)).toContain(`<name xml:lang="en">${key}</name>`)
    },
  )

  it('keeps it through canonical JSON as well', () => {
    const workspace = importExchangeXml(withKey('__proto__')).workspace!
    const back = fromCanonicalJson(toCanonicalJson(workspace))
    expect(back.problems).toEqual([])
    // A *computed* key: `{ __proto__: 'mine' }` written out longhand is the very
    // trap this describes — the literal sets the prototype and the expectation
    // silently becomes `{ owner: 'kept' }`, which is how this test first passed
    // the wrong way round.
    expect(back.workspace?.elements[0]?.properties).toEqual({
      ['__proto__']: 'mine',
      owner: 'kept',
    })
    expect(toCanonicalJson(back.workspace!)).toBe(toCanonicalJson(workspace))
  })

  it('does not let one poison the prototype on the way in', () => {
    const workspace = importExchangeXml(withKey('__proto__')).workspace!
    expect(Object.getPrototypeOf(workspace.elements[0]!.properties)).toBe(Object.prototype)
    expect(({} as Record<string, unknown>).mine).toBeUndefined()
  })
})
