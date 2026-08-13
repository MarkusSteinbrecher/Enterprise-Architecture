import { describe, expect, it } from 'vitest'
import { SCHEMA_VERSION, emptyWorkspace, type Workspace } from '@/model'
import { smallWorkspace } from '@/test/fixtures'
import { fromCanonicalJson, toCanonicalJson } from './canonical-json'
import { exportExchangeXml } from './exchange-format'

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

describe('canonical JSON hardening (review findings, PR #17)', () => {
  it('rejects a top-level array instead of importing an empty workspace', () => {
    const result = fromCanonicalJson('[1, 2, 3]')
    expect(result.ok).toBe(false)
    expect(result.problems[0]?.code).toBe('json.not-a-workspace')
  })

  it('skips duplicate element ids and says so', () => {
    const result = fromCanonicalJson(
      JSON.stringify({
        schemaVersion: SCHEMA_VERSION,
        id: 'ws',
        name: 'W',
        elements: [
          { id: 'a', type: 'ApplicationComponent', name: 'First' },
          { id: 'a', type: 'BusinessProcess', name: 'Second' },
        ],
      }),
    )
    expect(result.workspace?.elements).toHaveLength(1)
    expect(result.workspace?.elements[0]?.name).toBe('First')
    expect(result.problems[0]).toMatchObject({ code: 'json.duplicate-id', subject: 'a' })
  })

  it('skips duplicate relationship ids and says so', () => {
    const result = fromCanonicalJson(
      JSON.stringify({
        schemaVersion: SCHEMA_VERSION,
        id: 'ws',
        name: 'W',
        elements: [
          { id: 'a', type: 'ApplicationComponent', name: 'A' },
          { id: 'b', type: 'ApplicationComponent', name: 'B' },
        ],
        relationships: [
          { id: 'r', type: 'Serving', source: 'a', target: 'b' },
          { id: 'r', type: 'Flow', source: 'b', target: 'a' },
        ],
      }),
    )
    expect(result.workspace?.relationships).toHaveLength(1)
    expect(result.workspace?.relationships[0]?.type).toBe('Serving')
    expect(result.problems[0]?.code).toBe('json.duplicate-relationship-id')
  })

  it('validates profile fields instead of letting malformed ones crash a later export', () => {
    const result = fromCanonicalJson(
      JSON.stringify({
        schemaVersion: SCHEMA_VERSION,
        id: 'ws',
        name: 'W',
        elements: [
          {
            id: 'a',
            type: 'ApplicationComponent',
            name: 'A',
            profile: { tags: 'Core', functionalFit: 9, timeClassification: 'Invest' },
          },
        ],
      }),
    )
    expect(result.ok).toBe(true)
    const element = result.workspace?.elements[0]
    expect(element?.profile).toEqual({ timeClassification: 'Invest' })
    expect(result.problems[0]).toMatchObject({ code: 'json.invalid-profile', subject: 'a' })
    expect(result.problems[0]?.message).toContain('tags')
    expect(result.problems[0]?.message).toContain('functionalFit')
    // The crash vector: exporting the imported workspace must not throw.
    expect(() => exportExchangeXml(result.workspace!)).not.toThrow()
  })

  it('validates relationship profile fields the same way', () => {
    const result = fromCanonicalJson(
      JSON.stringify({
        schemaVersion: SCHEMA_VERSION,
        id: 'ws',
        name: 'W',
        elements: [
          { id: 'a', type: 'ApplicationComponent', name: 'A' },
          { id: 'b', type: 'ApplicationComponent', name: 'B' },
        ],
        relationships: [
          {
            id: 'r',
            type: 'Serving',
            source: 'a',
            target: 'b',
            profile: { annualCost: 'lots', currency: 'EUR' },
          },
        ],
      }),
    )
    expect(result.workspace?.relationships[0]?.profile).toEqual({ currency: 'EUR' })
    expect(result.problems[0]).toMatchObject({ code: 'json.invalid-profile', subject: 'r' })
  })

  it('reports malformed views and tag groups instead of dropping them silently', () => {
    const result = fromCanonicalJson(
      JSON.stringify({
        schemaVersion: SCHEMA_VERSION,
        id: 'ws',
        name: 'W',
        views: [{ id: 'v1' }],
        tagGroups: [{ name: 'no id or tags' }],
      }),
    )
    expect(result.workspace?.views).toEqual([])
    expect(result.workspace?.tagGroups).toEqual([])
    expect(result.problems.map((p) => p.code).sort()).toEqual([
      'json.invalid-tag-group',
      'json.invalid-view',
    ])
  })

  it('sorts tag-group tags in code-unit order, independent of locale', () => {
    const workspace: Workspace = {
      ...emptyWorkspace('ws-x', 'X'),
      tagGroups: [
        {
          id: 'tg',
          name: 'G',
          multiSelect: true,
          tags: [
            { name: 'b', colourToken: 'var(--accent)' },
            { name: 'ä', colourToken: 'var(--accent)' },
            { name: 'A', colourToken: 'var(--accent)' },
          ],
        },
      ],
    }
    const json = toCanonicalJson(workspace)
    const order = [json.indexOf('"A"'), json.indexOf('"b"'), json.indexOf('"ä"')]
    expect(order[0]).toBeGreaterThan(-1)
    expect(order).toEqual([...order].sort((a, b) => a - b))
  })
})

describe('junctions and exchange-safe ids (issue #36)', () => {
  function withJunction(): Workspace {
    const workspace = smallWorkspace()
    workspace.elements.push({
      id: 'jun-split',
      type: 'Junction',
      name: 'Split',
      junctionKind: 'or',
      properties: {},
    })
    return workspace
  }

  it('writes the junction kind and reads it back', () => {
    const json = toCanonicalJson(withJunction())
    expect(json).toContain('"junctionKind": "or"')
    const restored = fromCanonicalJson(json).workspace!
    expect(restored.elements.find((e) => e.id === 'jun-split')?.junctionKind).toBe('or')
  })

  it('omits the kind of a plain and-junction rather than writing the default', () => {
    const workspace = withJunction()
    delete workspace.elements.at(-1)!.junctionKind
    expect(toCanonicalJson(workspace)).not.toContain('junctionKind')
  })

  it('ignores a junction kind on something that is not a junction, and says so', () => {
    const result = fromCanonicalJson(
      JSON.stringify({
        schemaVersion: 1,
        id: 'ws',
        name: 'W',
        elements: [{ id: 'a', type: 'Capability', name: 'A', junctionKind: 'or' }],
        relationships: [],
      }),
    )
    expect(result.workspace?.elements[0]?.junctionKind).toBeUndefined()
    expect(result.problems).toEqual([
      expect.objectContaining({ code: 'json.junction-kind-ignored', subject: 'a' }),
    ])
  })

  it('reports a junction kind that is neither and nor or', () => {
    const result = fromCanonicalJson(
      JSON.stringify({
        schemaVersion: 1,
        id: 'ws',
        name: 'W',
        elements: [{ id: 'j', type: 'Junction', name: 'J', junctionKind: 'xor' }],
        relationships: [],
      }),
    )
    expect(result.workspace?.elements[0]?.junctionKind).toBeUndefined()
    expect(result.problems.map((p) => p.code)).toEqual(['json.junction-kind-ignored'])
  })

  it('warns once about ids the exchange format would have to rewrite', () => {
    const result = fromCanonicalJson(
      JSON.stringify({
        schemaVersion: 1,
        id: 'ws',
        name: 'W',
        elements: [
          { id: '9abc', type: 'Capability', name: 'A' },
          { id: 'a b', type: 'Capability', name: 'B' },
        ],
        relationships: [{ id: 'ok-1', type: 'Association', source: '9abc', target: 'a b' }],
      }),
    )
    expect(result.workspace?.elements).toHaveLength(2)
    const unsafe = result.problems.filter((p) => p.code === 'json.id-not-exchange-safe')
    expect(unsafe).toHaveLength(1)
    expect(unsafe[0]?.message).toContain('"9abc", "a b"')
  })
})

describe('canonical JSON hardening (review findings, PR #37)', () => {
  it('writes a tag group with no tags in a shape it can read back', () => {
    const workspace: Workspace = {
      ...smallWorkspace(),
      tagGroups: [{ id: 'tg-risk', name: 'Risk', multiSelect: false, tags: [] }],
    }
    const json = toCanonicalJson(workspace)
    // `prune` dropped the zero-length array and `isTagGroup` requires it, so the
    // writer produced exactly what the reader refuses (#37).
    expect(json).toContain('"tags": []')
    const back = fromCanonicalJson(json)
    expect(back.problems).toEqual([])
    expect(back.workspace?.tagGroups).toEqual(workspace.tagGroups)
    expect(toCanonicalJson(back.workspace!)).toBe(json)
  })

  it('spells an and-junction one way, whichever way it was handed one', () => {
    const explicit: Workspace = {
      ...emptyWorkspace('ws-j', 'Junctions'),
      elements: [
        { id: 'j1', type: 'Junction', name: 'Split', junctionKind: 'and', properties: {} },
      ],
    }
    const absent: Workspace = {
      ...emptyWorkspace('ws-j', 'Junctions'),
      elements: [{ id: 'j1', type: 'Junction', name: 'Split', properties: {} }],
    }
    expect(toCanonicalJson(explicit)).toBe(toCanonicalJson(absent))
    expect(toCanonicalJson(explicit)).not.toContain('junctionKind')
    // An or-junction still says so — this is a default, not a deletion.
    const or: Workspace = {
      ...emptyWorkspace('ws-j', 'Junctions'),
      elements: [{ id: 'j1', type: 'Junction', name: 'Split', junctionKind: 'or', properties: {} }],
    }
    expect(toCanonicalJson(or)).toContain('"junctionKind": "or"')
  })

  it('carries declared property types, and reports one it cannot read', () => {
    const workspace: Workspace = {
      ...smallWorkspace(),
      // `string` is what an unlisted key already means, so it is not one of the
      // values this carries — a file that lists it is telling us nothing.
      propertyTypes: { validUntil: 'date', owner: 'string' },
    }
    const back = fromCanonicalJson(toCanonicalJson(workspace))
    expect(back.workspace?.propertyTypes).toEqual({ validUntil: 'date' })
    expect(back.problems.map((p) => p.code)).toEqual(['json.invalid-property-types'])
  })

  it('leaves propertyTypes out of a workspace that has none', () => {
    expect(toCanonicalJson(smallWorkspace())).not.toContain('propertyTypes')
    expect(toCanonicalJson({ ...smallWorkspace(), propertyTypes: {} })).not.toContain(
      'propertyTypes',
    )
  })
})
