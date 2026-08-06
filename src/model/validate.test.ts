import { describe, expect, it } from 'vitest'
import { validate } from './validate'
import { emptyWorkspace, type Relationship, type Workspace } from './workspace'

function workspace(over: Partial<Workspace> = {}): Workspace {
  return {
    ...emptyWorkspace('ws-test', 'Test'),
    elements: [
      { id: 'app-crm', type: 'ApplicationComponent', name: 'CRM System', properties: {} },
      { id: 'proc-claim', type: 'BusinessProcess', name: 'Handle Claim', properties: {} },
      { id: 'obj-policy', type: 'DataObject', name: 'Policy Data', properties: {} },
    ],
    ...over,
  }
}

function relationship(over: Partial<Relationship> = {}): Relationship {
  return {
    id: 'rel-1',
    type: 'Serving',
    source: 'app-crm',
    target: 'proc-claim',
    properties: {},
    ...over,
  }
}

describe('workspace validation', () => {
  it('passes a clean model', () => {
    const report = validate(workspace({ relationships: [relationship()] }))
    expect(report.valid).toBe(true)
    expect(report.findings).toHaveLength(0)
  })

  it('reports dangling relationship endpoints', () => {
    const report = validate(
      workspace({ relationships: [relationship({ source: 'ghost', target: 'phantom' })] }),
    )
    expect(report.valid).toBe(false)
    expect(report.errors.map((f) => f.code)).toEqual([
      'relationship.dangling-source',
      'relationship.dangling-target',
    ])
  })

  it('reports relationships the validity matrix rejects, with the reason', () => {
    const report = validate(
      workspace({
        relationships: [relationship({ type: 'Access', source: 'obj-policy', target: 'app-crm' })],
      }),
    )
    expect(report.valid).toBe(false)
    const finding = report.errors[0]
    expect(finding?.code).toBe('relationship.invalid')
    expect(finding?.message).toContain('Access')
    expect(finding?.message).toContain('behaviour or active structure')
  })

  it('reports duplicate ids', () => {
    const base = workspace()
    const duplicated = workspace({
      elements: [...base.elements, { ...base.elements[0]!, name: 'Copy' }],
    })
    expect(validate(duplicated).errors.map((f) => f.code)).toContain('element.duplicate-id')
  })

  it('warns about unnamed elements without failing the model', () => {
    const report = validate(
      workspace({
        elements: [{ id: 'x', type: 'Capability', name: '  ', properties: {} }],
      }),
    )
    expect(report.valid).toBe(true)
    expect(report.warnings.map((f) => f.code)).toEqual(['element.no-name'])
  })

  it('warns about lifecycle dates that run backwards or will not parse', () => {
    const report = validate(
      workspace({
        elements: [
          {
            id: 'app-legacy',
            type: 'ApplicationComponent',
            name: 'Legacy',
            properties: {},
            profile: { lifecycle: { active: '2020-01-01', phaseOut: '2015-01-01' } },
          },
          {
            id: 'app-odd',
            type: 'ApplicationComponent',
            name: 'Odd',
            properties: {},
            profile: { lifecycle: { active: 'whenever' } },
          },
        ],
      }),
    )
    expect(report.warnings.map((f) => f.code)).toEqual([
      'element.lifecycle-out-of-order',
      'element.unparseable-date',
    ])
    expect(report.valid).toBe(true)
  })

  it('warns about self-referencing relationships except association', () => {
    const selfServe = validate(
      workspace({ relationships: [relationship({ source: 'app-crm', target: 'app-crm' })] }),
    )
    expect(selfServe.warnings.map((f) => f.code)).toContain('relationship.self-reference')

    const selfAssociate = validate(
      workspace({
        relationships: [
          relationship({ type: 'Association', source: 'app-crm', target: 'app-crm' }),
        ],
      }),
    )
    expect(selfAssociate.findings).toHaveLength(0)
  })

  it('rejects unknown types coming in from a bad import', () => {
    const report = validate(
      workspace({
        elements: [{ id: 'x', type: 'Microservice' as never, name: 'X', properties: {} }],
        relationships: [
          relationship({ type: 'Consumes' as never, source: 'x', target: 'proc-claim' }),
        ],
      }),
    )
    expect(report.errors.map((f) => f.code)).toEqual([
      'element.unknown-type',
      'relationship.unknown-type',
    ])
  })
})
