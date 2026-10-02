import { describe, expect, it } from 'vitest'
import Ajv2020 from 'ajv/dist/2020'
import addFormats from 'ajv-formats'
import { SCHEMA_VERSION, type View, type Workspace } from '@/model'
import { drawnWorkspace } from '@/test/fixtures'
import { fromCanonicalJson, toCanonicalJson } from './canonical-json'
import { buildWorkspaceJsonSchema } from './json-schema'
import workspaceV1 from './fixtures/workspace-v1.json?raw'

/** Read canonical JSON, failing the test on anything but a clean read. */
function read(text: string): Workspace {
  const result = fromCanonicalJson(text)
  expect(result.problems).toEqual([])
  if (!result.workspace) throw new Error('no workspace')
  return result.workspace
}

/** Parse a workspace's canonical JSON, apply `edit` to the raw object, and read it back. */
function readEdited(
  edit: (raw: Record<string, unknown> & { views: Record<string, unknown>[] }) => void,
) {
  const raw = JSON.parse(toCanonicalJson(drawnWorkspace()))
  edit(raw)
  return fromCanonicalJson(JSON.stringify(raw))
}

/** The landscape view's raw nodes or connections, out of a parsed canonical file. */
function landscapeRaw(
  raw: { views: Record<string, unknown>[] },
  key: 'nodes' | 'connections',
): Record<string, Record<string, unknown> | unknown>[] {
  const view = raw.views.find((v) => v.id === 'view-landscape')
  return view?.[key] as Record<string, Record<string, unknown> | unknown>[]
}

function landscape(workspace: Workspace | undefined): View | undefined {
  return workspace?.views.find((v) => v.id === 'view-landscape')
}

function codes(problems: readonly { code: string }[]): string[] {
  return problems.map((p) => p.code)
}

describe('views and folders in canonical JSON (#75)', () => {
  it('round-trips views, nesting, bend-points and folders byte-identically', () => {
    const workspace = drawnWorkspace()
    const first = toCanonicalJson(workspace)
    const restored = read(first)

    expect(restored.views).toHaveLength(2)
    expect(restored.views).toEqual(workspace.views)
    expect(restored.folders).toEqual(workspace.folders)
    const filing = (items: readonly { id: string; folder?: string }[]) =>
      Object.fromEntries(items.map((item) => [item.id, item.folder]))
    expect(filing(restored.elements)).toEqual(filing(workspace.elements))
    expect(filing(restored.relationships)).toEqual(filing(workspace.relationships))
    expect(toCanonicalJson(restored)).toBe(first)
  })

  it('writes the same bytes whatever order things were drawn and filed in', () => {
    const workspace = drawnWorkspace()
    const shuffled: Workspace = {
      ...workspace,
      views: [...workspace.views].reverse().map((view) => ({
        ...view,
        nodes: [...view.nodes].reverse(),
        connections: [...view.connections].reverse(),
      })),
      folders: [...workspace.folders].reverse(),
    }
    expect(toCanonicalJson(shuffled)).toBe(toCanonicalJson(workspace))
  })

  it('keeps bend-points in route order, because the order is the route', () => {
    const workspace = drawnWorkspace()
    const reversed = structuredClone(workspace)
    const connection = landscape(reversed)?.connections.find((c) => c.id === 'c-serving')
    connection?.bendpoints?.reverse()
    expect(toCanonicalJson(reversed)).not.toBe(toCanonicalJson(workspace))
    expect(
      landscape(read(toCanonicalJson(reversed)))?.connections.find((c) => c.id === 'c-serving')
        ?.bendpoints,
    ).toEqual([
      { x: 80, y: 120 },
      { x: 80, y: 180 },
    ])
  })

  it('writes font styles in one order, so two spellings of the same style are one file', () => {
    const workspace = drawnWorkspace()
    const respelled = structuredClone(workspace)
    const node = landscape(respelled)?.nodes.find((n) => n.id === 'n-app')
    if (node?.appearance) node.appearance.fontStyle = ['italic', 'bold']
    expect(toCanonicalJson(respelled)).toBe(toCanonicalJson(workspace))
  })

  it('lower-cases colours on the way in, so #FFAA00 and #ffaa00 are one file', () => {
    const result = readEdited((raw) => {
      const group = landscapeRaw(raw, 'nodes').find(
        (n) => (n as { id: string }).id === 'g-claims',
      ) as Record<string, Record<string, unknown>> | undefined
      if (group?.appearance) group.appearance.fillColor = '#F5F0E6'
    })
    expect(result.problems).toEqual([])
    expect(toCanonicalJson(result.workspace as Workspace)).toBe(toCanonicalJson(drawnWorkspace()))
  })

  it('validates against the published schema', () => {
    const ajv = new Ajv2020({ strict: false, allErrors: true })
    addFormats(ajv)
    const validate = ajv.compile(buildWorkspaceJsonSchema())
    const canonical = JSON.parse(toCanonicalJson(drawnWorkspace()))
    expect(validate(canonical), JSON.stringify(validate.errors)).toBe(true)

    // And the schema is not vacuous about views: a node that draws nothing fails.
    const broken = structuredClone(canonical)
    delete broken.views
      .find((v: { id: string }) => v.id === 'view-landscape')
      .nodes.find((n: { id: string }) => n.id === 'n-app').element
    expect(validate(broken)).toBe(false)
    const homeless = structuredClone(canonical)
    homeless.folders.push({ id: 'f-nowhere', name: 'Nowhere' })
    expect(validate(homeless)).toBe(false)
  })
})

describe('a schema-1 workspace (#75)', () => {
  it('loads, and its saved report views become reports', () => {
    const result = fromCanonicalJson(workspaceV1, 'workspace-v1.json')
    const workspace = result.workspace
    if (!workspace) throw new Error('no workspace')

    expect(workspace.reports.map((report) => report.id)).toEqual(['report-caps', 'report-eol'])
    expect(workspace.reports.find((r) => r.id === 'report-eol')).toMatchObject({
      kind: 'graph',
      colorView: 'lifecycle',
      timePoint: 2030,
      filter: { facets: ['layer:application', 'lifecycle:endOfLife'], mode: 'AND' },
    })
    expect(workspace.views).toEqual([])
    expect(workspace.folders).toEqual([])
    expect(workspace.elements).toHaveLength(5)
    expect(workspace.schemaVersion).toBe(SCHEMA_VERSION)
    expect(codes(result.problems)).toEqual(['json.schema-upgraded'])
  })

  it('saves in the new shape, and that file reads back without another migration', () => {
    const migrated = fromCanonicalJson(workspaceV1).workspace as Workspace
    const saved = toCanonicalJson(migrated)
    expect(JSON.parse(saved)).toMatchObject({ schemaVersion: SCHEMA_VERSION, views: [] })
    expect(JSON.parse(saved).reports).toHaveLength(2)
    expect(toCanonicalJson(read(saved))).toBe(saved)
  })
})

describe('what the reader repairs, and says it did (#75)', () => {
  it('skips a node that draws an element the file does not have, and its connections', () => {
    const result = readEdited((raw) => {
      const node = landscapeRaw(raw, 'nodes').find((n) => (n as { id: string }).id === 'n-k8s') as
        Record<string, unknown> | undefined
      if (node) node.element = 'gone'
    })
    const view = landscape(result.workspace)
    expect(view?.nodes.map((n) => n.id)).toContain('n-app')
    expect(view?.nodes.map((n) => n.id)).not.toContain('n-k8s')
    expect(view?.connections.map((c) => c.id)).not.toContain('c-k8s')
    expect(codes(result.problems)).toEqual([
      'json.dangling-view-node',
      'json.dangling-view-connection',
    ])
  })

  it('skips a connection that draws a relationship the file does not have', () => {
    const result = readEdited((raw) => {
      raw.relationships = (raw.relationships as { id: string }[]).filter(
        (r) => r.id !== 'rel-app-obj',
      )
    })
    const detail = result.workspace?.views.find((v) => v.id === 'view-detail')
    expect(detail?.nodes).toHaveLength(2)
    expect(detail?.connections).toEqual([])
    expect(codes(result.problems)).toEqual(['json.dangling-view-connection'])
  })

  it('skips a view reference to a view the file does not have', () => {
    const result = readEdited((raw) => {
      raw.views = raw.views.filter((v) => v.id !== 'view-detail')
    })
    const view = landscape(result.workspace)
    expect(view?.nodes.map((n) => n.id)).toContain('n-app')
    expect(view?.nodes.map((n) => n.id)).not.toContain('n-ref')
    expect(codes(result.problems)).toEqual(['json.dangling-view-node'])
  })

  it('lifts a node whose parent is missing to the top level, keeping its bounds', () => {
    const result = readEdited((raw) => {
      const node = landscapeRaw(raw, 'nodes').find((n) => (n as { id: string }).id === 'n-proc') as
        Record<string, unknown> | undefined
      if (node) node.parent = 'nobody'
    })
    const node = landscape(result.workspace)?.nodes.find((n) => n.id === 'n-proc')
    expect(node?.bounds).toEqual({ x: 20, y: 40, width: 120, height: 55 })
    expect(node?.parent).toBeUndefined()
    expect(codes(result.problems)).toEqual(['json.dangling-node-parent'])
  })

  it('breaks a ring of nodes nested in each other at one deterministic link', () => {
    const result = readEdited((raw) => {
      const nodes = landscapeRaw(raw, 'nodes') as Record<string, unknown>[]
      const group = nodes.find((n) => n.id === 'g-claims')
      if (group) group.parent = 'n-proc'
    })
    const nodes = landscape(result.workspace)?.nodes ?? []
    expect(nodes.find((n) => n.id === 'n-proc')).toBeDefined()
    // g-claims sorts first, so its link is the one cut; n-proc stays inside it.
    expect(nodes.find((n) => n.id === 'g-claims')?.parent).toBeUndefined()
    expect(nodes.find((n) => n.id === 'n-proc')?.parent).toBe('g-claims')
    expect(codes(result.problems)).toEqual(['json.node-nesting-cycle'])
  })

  it('draws a connection straight when its bend-points are malformed', () => {
    const result = readEdited((raw) => {
      const connection = (landscapeRaw(raw, 'connections') as Record<string, unknown>[]).find(
        (c) => c.id === 'c-serving',
      )
      if (connection) connection.bendpoints = [{ x: 1, y: 2 }, { x: 'left' }]
    })
    const connection = landscape(result.workspace)?.connections.find((c) => c.id === 'c-serving')
    expect(connection?.kind).toBe('relationship')
    expect(connection?.bendpoints).toBeUndefined()
    expect(codes(result.problems)).toEqual(['json.invalid-bendpoints'])
  })

  it('keeps the readable appearance fields and names the ones it dropped', () => {
    const result = readEdited((raw) => {
      const group = landscapeRaw(raw, 'nodes').find(
        (n) => (n as { id: string }).id === 'g-claims',
      ) as Record<string, Record<string, unknown>> | undefined
      if (group?.appearance) {
        group.appearance.fillColor = 'tomato'
        group.appearance.glow = true
      }
    })
    const group = landscape(result.workspace)?.nodes.find((n) => n.id === 'g-claims')
    expect(group?.appearance).toEqual({ lineColor: '#333333', lineWidth: 2 })
    expect(result.problems).toHaveLength(1)
    expect(result.problems[0]?.message).toContain('fillColor, glow')
  })

  it('skips a node of a kind it does not know, and a later duplicate id', () => {
    const result = readEdited((raw) => {
      const nodes = raw.views.find((v) => v.id === 'view-detail')?.nodes as Record<
        string,
        unknown
      >[]
      nodes.push({ id: 'd-sketch', kind: 'sketch', bounds: { x: 0, y: 0, width: 1, height: 1 } })
      nodes.push({ ...nodes[0], bounds: { x: 9, y: 9, width: 9, height: 9 } })
    })
    const detail = result.workspace?.views.find((v) => v.id === 'view-detail')
    expect(detail?.nodes.map((n) => n.id).sort()).toEqual(['d-app', 'd-obj'])
    expect(detail?.nodes.find((n) => n.id === 'd-app')?.bounds.x).toBe(0)
    expect(codes(result.problems)).toEqual(['json.invalid-view-node', 'json.duplicate-node-id'])
  })

  it('skips a folder with nowhere to sit, and files its contents in their default group', () => {
    const result = readEdited((raw) => {
      const folders = raw.folders as Record<string, unknown>[]
      const business = folders.find((f) => f.id === 'f-business')
      if (business) {
        delete business.root
        business.parent = 'f-core' // f-core is inside f-business: a ring
      }
    })
    const workspace = result.workspace
    expect(workspace?.folders.map((f) => f.id).sort()).toEqual(['f-apps', 'f-relations', 'f-views'])
    expect(workspace?.elements.find((e) => e.id === 'app-claims')?.folder).toBe('f-apps')
    expect(workspace?.elements.find((e) => e.id === 'proc-claim')?.folder).toBeUndefined()
    expect(codes(result.problems).sort()).toEqual([
      'json.dangling-folder',
      'json.unplaced-folder',
      'json.unplaced-folder',
    ])
  })

  it('refuses a folder that names both a parent and a root', () => {
    const result = readEdited((raw) => {
      const core = (raw.folders as Record<string, unknown>[]).find((f) => f.id === 'f-core')
      if (core) core.root = 'business'
    })
    expect(result.workspace?.folders.map((f) => f.id)).toContain('f-business')
    expect(result.workspace?.folders.map((f) => f.id)).not.toContain('f-core')
    expect(codes(result.problems)).toEqual(['json.invalid-folder', 'json.dangling-folder'])
  })

  it('moves a view filed in a missing folder to the Views group', () => {
    const result = readEdited((raw) => {
      raw.folders = (raw.folders as { id: string }[]).filter((f) => f.id !== 'f-views')
    })
    const view = result.workspace?.views.find((v) => v.id === 'view-landscape') as View
    expect(view.nodes).toHaveLength(6)
    expect(view.folder).toBeUndefined()
    expect(codes(result.problems)).toEqual(['json.dangling-folder'])
  })
})
