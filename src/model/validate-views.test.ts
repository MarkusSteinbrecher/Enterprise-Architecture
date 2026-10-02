import { describe, expect, it } from 'vitest'
import { validate, type View, type Workspace } from '@/model'
import { drawnWorkspace } from '@/test/fixtures'

function landscape(workspace: Workspace): View {
  const view = workspace.views.find((v) => v.id === 'view-landscape')
  if (!view) throw new Error('fixture lost its landscape view')
  return view
}

function codes(workspace: Workspace): string[] {
  return validate(workspace).findings.map((finding) => finding.code)
}

describe('validating views and folders (#75)', () => {
  it('finds nothing wrong with a consistent drawn workspace', () => {
    expect(validate(drawnWorkspace()).findings).toEqual([])
  })

  it('flags a connection whose relationship does not join the elements of its nodes', () => {
    const workspace = drawnWorkspace()
    // c-serving draws app → process. Point it at the platform node instead.
    const connection = landscape(workspace).connections.find((c) => c.id === 'c-serving')
    if (connection) connection.source = 'n-k8s'
    const findings = validate(workspace).findings
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({
      severity: 'error',
      code: 'view.connection-mismatch',
      subjectId: 'view-landscape',
      subjectKind: 'view',
    })
  })

  it("flags a connection drawn against its relationship's direction", () => {
    const workspace = drawnWorkspace()
    const connection = landscape(workspace).connections.find((c) => c.id === 'c-serving')
    if (connection) [connection.source, connection.target] = [connection.target, connection.source]
    expect(codes(workspace)).toEqual(['view.connection-mismatch'])
  })

  it('flags a relationship connection that ends on a note', () => {
    const workspace = drawnWorkspace()
    const connection = landscape(workspace).connections.find((c) => c.id === 'c-serving')
    if (connection) connection.target = 'n-note'
    expect(codes(workspace)).toEqual(['view.connection-mismatch'])
  })

  it('flags references to things the model does not have', () => {
    const workspace = drawnWorkspace()
    const view = landscape(workspace)
    view.nodes.push(
      { id: 'x-el', kind: 'element', element: 'gone', bounds: { x: 0, y: 0, width: 1, height: 1 } },
      { id: 'x-ref', kind: 'view-ref', view: 'gone', bounds: { x: 0, y: 0, width: 1, height: 1 } },
      {
        id: 'x-kid',
        kind: 'note',
        text: '',
        parent: 'gone',
        bounds: { x: 0, y: 0, width: 1, height: 1 },
      },
    )
    view.connections.push(
      { id: 'x-line', kind: 'line', source: 'n-app', target: 'gone' },
      {
        id: 'x-rel',
        kind: 'relationship',
        relationship: 'gone',
        source: 'n-app',
        target: 'n-proc',
      },
    )
    expect(codes(workspace).sort()).toEqual([
      'view.dangling-connection',
      'view.dangling-element',
      'view.dangling-parent',
      'view.dangling-relationship',
      'view.dangling-view-reference',
    ])
  })

  it('flags duplicate ids and a nesting cycle', () => {
    const workspace = drawnWorkspace()
    const view = landscape(workspace)
    const group = view.nodes.find((n) => n.id === 'g-claims')
    if (group) group.parent = 'n-proc'
    const note = view.nodes.find((n) => n.id === 'n-note')
    if (note) view.nodes.push({ ...note })
    const line = view.connections.find((c) => c.id === 'c-note')
    if (line) view.connections.push({ ...line })
    workspace.views.push(structuredClone(view))
    const found = codes(workspace)
    expect(found).toContain('view.nesting-cycle')
    expect(found).toContain('view.duplicate-node-id')
    expect(found).toContain('view.duplicate-connection-id')
    expect(found).toContain('view.duplicate-id')
  })

  it('flags folders with no place, a missing parent, or a cycle', () => {
    const workspace = drawnWorkspace()
    workspace.folders.push(
      { id: 'f-both', name: 'Both', parent: 'f-apps', root: 'application' },
      { id: 'f-neither', name: 'Neither' },
      { id: 'f-orphan', name: 'Orphan', parent: 'gone' },
      { id: 'f-a', name: 'A', parent: 'f-b' },
      { id: 'f-b', name: 'B', parent: 'f-a' },
    )
    expect(codes(workspace).sort()).toEqual([
      'folder.cycle',
      'folder.cycle',
      'folder.dangling-parent',
      'folder.no-place',
      'folder.no-place',
    ])
  })

  it('flags a member filed in a missing folder, or in the wrong group', () => {
    const workspace = drawnWorkspace()
    const process = workspace.elements.find((e) => e.id === 'proc-claim')
    if (process) process.folder = 'f-apps' // a business process under Application
    const app = workspace.elements.find((e) => e.id === 'app-claims')
    if (app) app.folder = 'gone'
    landscape(workspace).folder = 'f-relations'
    const findings = validate(workspace).findings
    expect(findings.map((f) => [f.code, f.subjectId])).toEqual([
      ['folder.wrong-group', 'proc-claim'],
      ['folder.dangling-member', 'app-claims'],
      ['folder.wrong-group', 'view-landscape'],
    ])
    expect(findings[0]?.severity).toBe('warning')
    expect(findings[0]?.message).toBe(
      '"Handle Claim" is filed under Application; it belongs under Business.',
    )
  })

  it('files Physical elements under Technology & Physical', () => {
    const workspace = drawnWorkspace()
    workspace.folders.push({ id: 'f-tech', name: 'Plant', root: 'technology' })
    workspace.elements.push({
      id: 'eq',
      type: 'Equipment',
      name: 'Press',
      properties: {},
      folder: 'f-tech',
    })
    expect(validate(workspace).findings).toEqual([])
  })
})
