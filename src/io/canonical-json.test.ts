import { describe, expect, it } from 'vitest'
import { SCHEMA_VERSION, emptyWorkspace, type Workspace } from '@/model'
import { smallWorkspace } from '@/test/fixtures'
import { fromCanonicalJson, toCanonicalJson } from './canonical-json'

describe('canonical JSON', () => {
  it('round-trips byte-identically', () => {
    const once = toCanonicalJson(smallWorkspace())
    const parsed = fromCanonicalJson(once)
    expect(parsed.ok).toBe(true)
    const twice = toCanonicalJson(parsed.workspace!)
    expect(twice).toBe(once)
  })

  it('is independent of insertion order — the whole point for git', () => {
    const workspace = smallWorkspace()
    const shuffled: Workspace = {
      ...workspace,
      elements: [...workspace.elements].reverse(),
      relationships: [...workspace.relationships].reverse(),
    }
    expect(toCanonicalJson(shuffled)).toBe(toCanonicalJson(workspace))
  })

  it('is independent of property key order', () => {
    const workspace = smallWorkspace()
    const reordered: Workspace = {
      ...workspace,
      elements: workspace.elements.map((element) => ({
        ...element,
        properties: Object.fromEntries(Object.entries(element.properties).reverse()),
      })),
    }
    expect(toCanonicalJson(reordered)).toBe(toCanonicalJson(workspace))
  })

  it('sorts object keys at every depth', () => {
    const json = toCanonicalJson(smallWorkspace())
    const element = json.slice(json.indexOf('"id": "app-claims"'))
    // Inside the profile: businessCriticality before functionalFit before lifecycle.
    expect(element.indexOf('"businessCriticality"')).toBeLessThan(
      element.indexOf('"functionalFit"'),
    )
    expect(element.indexOf('"functionalFit"')).toBeLessThan(element.indexOf('"lifecycle"'))
  })

  it('omits absent and empty values rather than writing nulls', () => {
    const json = toCanonicalJson(smallWorkspace())
    expect(json).not.toContain('null')
    // obj-claim has no properties and no documentation.
    expect(json).not.toMatch(/"properties": \{\}/)
  })

  it('ends with a newline and uses two-space indent', () => {
    const json = toCanonicalJson(emptyWorkspace('ws-x', 'X'))
    expect(json.endsWith('}\n')).toBe(true)
    expect(json).toContain('\n  "id": "ws-x"')
  })

  it('preserves relationship properties, which are first class', () => {
    const restored = fromCanonicalJson(toCanonicalJson(smallWorkspace())).workspace!
    expect(restored.relationships.find((r) => r.id === 'rel-app-proc')?.profile).toEqual({
      annualCost: 1_200_000,
      currency: 'EUR',
    })
    expect(restored.relationships.find((r) => r.id === 'rel-app-obj')?.profile).toEqual({
      accessType: 'ReadWrite',
    })
  })
})

describe('canonical JSON import problems', () => {
  it('reports unparseable JSON without throwing', () => {
    const result = fromCanonicalJson('{ not json', 'broken.json')
    expect(result.ok).toBe(false)
    expect(result.problems[0]).toMatchObject({ code: 'json.unparseable', file: 'broken.json' })
  })

  it('rejects a file that is valid JSON but not a workspace', () => {
    expect(fromCanonicalJson('"just a string"').problems[0]?.code).toBe('json.not-a-workspace')
  })

  it('skips unknown element types and says which', () => {
    const result = fromCanonicalJson(
      JSON.stringify({
        schemaVersion: SCHEMA_VERSION,
        id: 'ws',
        name: 'W',
        elements: [
          { id: 'a', type: 'ApplicationComponent', name: 'Good' },
          { id: 'b', type: 'Microservice', name: 'Bad' },
        ],
      }),
    )
    expect(result.ok).toBe(true)
    expect(result.workspace?.elements.map((e) => e.id)).toEqual(['a'])
    expect(result.problems[0]).toMatchObject({
      code: 'json.unknown-element-type',
      subject: 'b',
      severity: 'error',
    })
    expect(result.problems[0]?.message).toContain('Microservice')
  })

  it('drops relationships whose endpoints are missing, as a warning', () => {
    const result = fromCanonicalJson(
      JSON.stringify({
        schemaVersion: SCHEMA_VERSION,
        id: 'ws',
        name: 'W',
        elements: [{ id: 'a', type: 'ApplicationComponent', name: 'A' }],
        relationships: [{ id: 'r', type: 'Serving', source: 'a', target: 'ghost' }],
      }),
    )
    expect(result.workspace?.relationships).toEqual([])
    expect(result.problems[0]).toMatchObject({
      code: 'json.dangling-relationship',
      severity: 'warning',
    })
  })

  it('warns when a file comes from a newer schema', () => {
    const result = fromCanonicalJson(
      JSON.stringify({ schemaVersion: SCHEMA_VERSION + 5, id: 'ws', name: 'W' }),
    )
    expect(result.ok).toBe(true)
    expect(result.problems[0]?.code).toBe('json.newer-schema-version')
  })

  it('reads a file with no elements at all', () => {
    const result = fromCanonicalJson(JSON.stringify({ schemaVersion: 1, id: 'ws', name: 'Empty' }))
    expect(result.ok).toBe(true)
    expect(result.workspace?.elements).toEqual([])
    expect(result.workspace?.name).toBe('Empty')
  })
})
