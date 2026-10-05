import { describe, expect, it } from 'vitest'
import Ajv2020 from 'ajv/dist/2020'
import addFormats from 'ajv-formats'
import { validate, type Relationship, type Workspace } from '@/model'
import { fromCanonicalJson, toCanonicalJson } from './canonical-json'
import { exportExchange, importExchangeXml } from './exchange-format'
import { buildWorkspaceJsonSchema } from './json-schema'
import archiXml from './fixtures/relationship-attributes.xml?raw'

/**
 * Association `isDirected` and Influence `modifier` (#84). The fixture is a
 * model authored in Archi and exported by Archi 5.10 itself
 * (`scripts/fixtures/export-with-archi.sh`), so the reader is tested against
 * what a real tool writes, not against our idea of it.
 */

function fromArchi(): Workspace {
  const result = importExchangeXml(archiXml, 'relationship-attributes.xml')
  if (!result.workspace) throw new Error('fixture did not import')
  // The model's purpose, which Archi exports as its documentation, is all it reports.
  expect(result.problems.map((p) => p.code)).toEqual(['exchange.model-documentation-skipped'])
  return result.workspace
}

const byId = (workspace: Workspace, id: string): Relationship =>
  workspace.relationships.find((relationship) => relationship.id === id)!

/** A minimal exchange file around one relationship's opening tag. */
function oneRelationship(tag: string): string {
  return `<model xmlns="http://www.opengroup.org/xsd/archimate/3.0/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" identifier="m">
  <name xml:lang="en">M</name>
  <elements>
    <element identifier="a" xsi:type="Goal"><name xml:lang="en">A</name></element>
    <element identifier="b" xsi:type="Goal"><name xml:lang="en">B</name></element>
  </elements>
  <relationships>
    <relationship identifier="r" source="a" target="b" ${tag} />
  </relationships>
</model>`
}

describe('reading what Archi writes (#84)', () => {
  it('reads a directed association as directed, and an undirected one as nothing', () => {
    const workspace = fromArchi()
    expect(byId(workspace, 'r-files').isDirected).toBe(true)
    expect(byId(workspace, 'r-claim-policy')).not.toHaveProperty('isDirected')
  })

  it('reads every influence modifier as the text Archi wrote', () => {
    const workspace = fromArchi()
    expect(byId(workspace, 'r-satisfaction-faster').modifier).toBe('++')
    expect(byId(workspace, 'r-faster-fraud').modifier).toBe('-')
    expect(byId(workspace, 'r-faster-cost').modifier).toBe('7')
    expect(byId(workspace, 'r-cost-premiums')).not.toHaveProperty('modifier')
  })

  it('produces a model that validates', () => {
    expect(validate(fromArchi()).errors).toEqual([])
  })
})

describe('round trips (#84)', () => {
  it('writes both attributes back the way Archi wrote them', () => {
    const { xml, problems } = exportExchange(fromArchi())
    expect(problems).toEqual([])
    for (const line of archiXml.split('\n').filter((l) => /isDirected=|modifier=/.test(l))) {
      const attribute = /(isDirected|modifier)="[^"]*"/.exec(line)![0]
      const id = /identifier="([^"]+)"/.exec(line)![1]!
      const ours = xml.split('\n').find((l) => l.includes(`identifier="${id}"`))
      expect(ours, id).toContain(attribute)
    }
    expect(xml.match(/isDirected=/g)).toHaveLength(1)
    expect(xml.match(/modifier=/g)).toHaveLength(3)
  })

  it('survives exchange → model → exchange → model unchanged', () => {
    const first = fromArchi()
    const again = importExchangeXml(exportExchange(first).xml)
    expect(again.problems).toEqual([])
    expect(again.workspace!.relationships).toEqual(first.relationships)
  })

  it('is byte-identical through canonical JSON export → import → export', () => {
    const json = toCanonicalJson(fromArchi())
    expect(JSON.parse(json).relationships).toContainEqual(
      expect.objectContaining({ id: 'r-files', isDirected: true }),
    )
    expect(JSON.parse(json).relationships).toContainEqual(
      expect.objectContaining({ id: 'r-satisfaction-faster', modifier: '++' }),
    )
    const back = fromCanonicalJson(json)
    expect(back.problems).toEqual([])
    expect(toCanonicalJson(back.workspace!)).toBe(json)
  })

  it('writes a canonical form the published JSON Schema accepts', () => {
    const ajv = new Ajv2020({ strict: false, allErrors: true })
    addFormats(ajv)
    const check = ajv.compile(buildWorkspaceJsonSchema())
    const ok = check(JSON.parse(toCanonicalJson(fromArchi())))
    expect(ok, JSON.stringify(check.errors)).toBe(true)
  })
})

describe('an attribute on the wrong type, or with a value the schema forbids (#84)', () => {
  it.each([
    ['isDirected on a Flow', 'xsi:type="Flow" isDirected="true"', 'isDirected'],
    ['modifier on an Association', 'xsi:type="Association" modifier="+"', 'modifier'],
    ['accessType on a Serving', 'xsi:type="Serving" accessType="Read"', 'profile'],
  ])('reports %s and does not carry it', (_, tag, key) => {
    const result = importExchangeXml(oneRelationship(tag))
    const relationship = result.workspace!.relationships[0]!
    expect(relationship).toBeDefined()
    expect(relationship).not.toHaveProperty(key)
    expect(result.problems.map((p) => p.code)).toEqual(['exchange.relationship-attribute-ignored'])
    expect(result.problems[0]!.subject).toBe('r')
  })

  it.each([
    ['an accessType outside the four', 'xsi:type="Access" accessType="Delete"', 'profile'],
    [
      'an isDirected that is not a boolean',
      'xsi:type="Association" isDirected="yes"',
      'isDirected',
    ],
  ])('reports %s', (_, tag, key) => {
    const result = importExchangeXml(oneRelationship(tag))
    expect(result.workspace!.relationships[0]).not.toHaveProperty(key)
    expect(result.problems.map((p) => p.code)).toEqual(['exchange.relationship-attribute-ignored'])
  })

  it('reads the xs:boolean spellings 1 and 0, and false as undirected, without a problem', () => {
    const one = importExchangeXml(oneRelationship('xsi:type="Association" isDirected="1"'))
    expect(one.problems).toEqual([])
    expect(one.workspace!.relationships[0]!.isDirected).toBe(true)
    for (const spelling of ['0', 'false']) {
      const off = importExchangeXml(
        oneRelationship(`xsi:type="Association" isDirected="${spelling}"`),
      )
      expect(off.problems).toEqual([])
      expect(off.workspace!.relationships[0]).toHaveProperty('type', 'Association')
      expect(off.workspace!.relationships[0]).not.toHaveProperty('isDirected')
    }
  })

  // #90 trimmed these on write, because the reader trimmed them on read. The
  // reader keeps them as written since #100, so they round-trip as they are.
  it.each([
    ['surrounding spaces', ' ++ '],
    ['only spaces', '   '],
  ])('writes a modifier with %s and reads it back unchanged (#90, #100)', (_, modifier) => {
    const workspace = fromArchi()
    byId(workspace, 'r-satisfaction-faster').modifier = modifier
    const { xml, problems } = exportExchange(workspace)
    expect(problems).toEqual([])
    const reread = importExchangeXml(xml)
    expect(reread.problems).toEqual([])
    expect(byId(reread.workspace!, 'r-satisfaction-faster').modifier).toBe(modifier)
  })

  it('does not write a misplaced attribute, and says so', () => {
    const workspace = fromArchi()
    const flow = byId(workspace, 'r-claim-policy')
    Object.assign(flow, { type: 'Flow', isDirected: true, modifier: '+' })
    const { xml, problems } = exportExchange(workspace)
    const line = xml.split('\n').find((l) => l.includes('identifier="r-claim-policy"'))!
    expect(line).toContain('xsi:type="Flow"')
    expect(line).not.toMatch(/isDirected|modifier/)
    expect(problems.map((p) => [p.code, p.subject])).toEqual([
      ['exchange.relationship-attribute-dropped', 'r-claim-policy'],
      ['exchange.relationship-attribute-dropped', 'r-claim-policy'],
    ])
    // The model-level check names the same two.
    expect(
      validate(workspace)
        .errors.filter((f) => f.code === 'relationship.misplaced-attribute')
        .map((f) => f.subjectId),
    ).toEqual(['r-claim-policy', 'r-claim-policy'])
  })
})

describe('canonical JSON guards (#84)', () => {
  function readOne(relationship: Record<string, unknown>) {
    return fromCanonicalJson(
      JSON.stringify({
        schemaVersion: 3,
        id: 'ws',
        name: 'W',
        elements: [
          { id: 'a', type: 'Goal', name: 'A' },
          { id: 'b', type: 'Goal', name: 'B' },
        ],
        relationships: [{ id: 'r', source: 'a', target: 'b', ...relationship }],
      }),
    )
  }

  it.each([
    ['isDirected on a Flow', { type: 'Flow', isDirected: true }, 'isDirected'],
    ['modifier on an Association', { type: 'Association', modifier: '+' }, 'modifier'],
    ['accessType on a Serving', { type: 'Serving', profile: { accessType: 'Read' } }, 'profile'],
    ['a non-boolean isDirected', { type: 'Association', isDirected: 'yes' }, 'isDirected'],
    ['a non-text modifier', { type: 'Influence', modifier: 3 }, 'modifier'],
  ])('reports %s and does not carry it', (_, fields, key) => {
    const result = readOne(fields)
    const relationship = result.workspace!.relationships[0]!
    expect(relationship).toHaveProperty('type', fields.type)
    expect(relationship).not.toHaveProperty(key)
    expect(result.problems.map((p) => p.code)).toEqual(['json.relationship-attribute-ignored'])
  })

  it('drops an accessType on the wrong type but keeps the profile fields beside it', () => {
    const result = readOne({
      type: 'Serving',
      profile: { accessType: 'Read', supportType: 'Leading' },
    })
    expect(result.workspace!.relationships[0]!.profile).toEqual({ supportType: 'Leading' })
  })

  it('reads isDirected false as undirected, since absent is how the model spells it', () => {
    const result = readOne({ type: 'Association', isDirected: false })
    expect(result.problems).toEqual([])
    expect(result.workspace!.relationships[0]).toHaveProperty('type', 'Association')
    expect(result.workspace!.relationships[0]).not.toHaveProperty('isDirected')
  })

  it('the JSON Schema rejects each attribute on the wrong type and accepts it on its own', () => {
    const ajv = new Ajv2020({ strict: false, allErrors: true })
    addFormats(ajv)
    const check = ajv.compile(buildWorkspaceJsonSchema())
    const doc = (relationship: Record<string, unknown>) => ({
      schemaVersion: 3,
      id: 'ws',
      name: 'W',
      elements: [
        { id: 'a', type: 'Goal', name: 'A' },
        { id: 'b', type: 'Goal', name: 'B' },
      ],
      relationships: [{ id: 'r', source: 'a', target: 'b', ...relationship }],
    })
    expect(check(doc({ type: 'Association', isDirected: true }))).toBe(true)
    expect(check(doc({ type: 'Influence', modifier: '++' }))).toBe(true)
    expect(check(doc({ type: 'Access', profile: { accessType: 'Read' } }))).toBe(true)
    expect(check(doc({ type: 'Flow', isDirected: true }))).toBe(false)
    expect(check(doc({ type: 'Association', modifier: '++' }))).toBe(false)
    expect(check(doc({ type: 'Serving', profile: { accessType: 'Read' } }))).toBe(false)
    expect(check(doc({ type: 'Influence', modifier: '' }))).toBe(false)
  })
})
