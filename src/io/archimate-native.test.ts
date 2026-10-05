import { describe, expect, it } from 'vitest'
import { validate, type Folder, type View, type Workspace } from '@/model'
import claimsNative from './fixtures/claims-platform.archimate?raw'
import claimsExchange from './fixtures/claims-platform.xml?raw'
import attributesNative from './fixtures/relationship-attributes.archimate?raw'
import attributesExchange from './fixtures/relationship-attributes.xml?raw'
import coverageNative from './fixtures/archi-coverage.archimate?raw'
import coverageExchange from './fixtures/archi-coverage.xml?raw'
import {
  ARCHI_LEGACY_NAMESPACE,
  ARCHI_NAMESPACE,
  SPECIALIZATION_KEY,
  importArchimate,
  isArchiModel,
} from './archimate-native'
import { fromCanonicalJson, toCanonicalJson } from './canonical-json'
import { exportExchange, importExchangeXml } from './exchange-format'
import { readWorkspaceFile } from './file-system'

/**
 * Archi's native `.archimate` file (#13). Each fixture pair is one model saved by
 * Archi 5.10 and exported by Archi 5.10 (`scripts/fixtures/export-with-archi.sh`),
 * so the exchange reader, which has its own tests, is the oracle: both readers
 * must arrive at the same model. Where they do not, it is because Archi's export
 * is lossy or wrong, and each such place is named below.
 */

function read(xml: string): Workspace {
  const result = importArchimate(xml)
  if (!result.workspace) throw new Error(JSON.stringify(result.problems))
  return result.workspace
}

function exchange(xml: string): Workspace {
  const result = importExchangeXml(xml)
  if (!result.workspace) throw new Error(JSON.stringify(result.problems))
  return result.workspace
}

const codes = (xml: string) => importArchimate(xml).problems.map((p) => p.code)

/**
 * A workspace with folder ids replaced by their path. Archi's exchange export
 * gives folders no identifiers, so the exchange reader makes them up; the native
 * file has Archi's own, which are kept. Everything else must match as it is.
 */
function comparable(workspace: Workspace): unknown {
  const byId = new Map(workspace.folders.map((folder) => [folder.id, folder]))
  const path = (id: string | undefined): string | undefined => {
    if (id === undefined) return undefined
    const folder = byId.get(id) as Folder
    return folder.parent ? `${path(folder.parent)}/${folder.name}` : `${folder.root}:${folder.name}`
  }
  const sorted = <T extends { id: string }>(items: readonly T[]) =>
    [...items].sort((a, b) => (a.id < b.id ? -1 : 1))
  const refile = <T extends { id: string; folder?: string }>(item: T) => ({
    ...item,
    folder: path(item.folder),
  })
  return {
    elements: sorted(workspace.elements).map(refile),
    relationships: sorted(workspace.relationships).map(refile),
    views: sorted(workspace.views).map((view: View) => ({
      ...refile(view),
      nodes: sorted(view.nodes),
      connections: sorted(view.connections),
    })),
    folders: workspace.folders
      .map((folder) => ({ path: path(folder.id), documentation: folder.documentation }))
      .sort((a, b) => ((a.path ?? '') < (b.path ?? '') ? -1 : 1)),
  }
}

describe('the same model as Archi exports it (#13)', () => {
  it('reads the Claims platform as its exchange export reads, but for what the export loses', () => {
    const native = read(claimsNative)
    const exported = exchange(claimsExchange)
    // The exchange format writes opacity as a percentage: Archi's 160 of 255
    // becomes 63%, which reads back as 161. The native file has the 160.
    const landscape = (workspace: Workspace) => workspace.views.find((v) => v.id === 'v-landscape')!
    const crm = landscape(exported).nodes.find((n) => n.id === 'o-crm')!
    expect(crm.appearance?.fillColor).toBe('#e0e0e0a1')
    crm.appearance!.fillColor = '#e0e0e0a0'
    // Archi's exchange export has no text alignment, so the exchange reader
    // cannot see that Handle Claim's label sits on the left. (It sits at the
    // top too, which is Archi's default, so Archi's file does not say so.)
    const handle = landscape(native).nodes.find((n) => n.id === 'o-handle')!
    expect(handle.appearance).toEqual({ textAlignment: 'left' })
    delete handle.appearance
    // Nor that Archi centres a note's, a group's and a Grouping's label when the
    // file gives none, where Archipelago's own default is left (#100).
    const centred = native.views.flatMap((view) =>
      view.nodes.filter((node) => node.appearance?.textAlignment === 'center'),
    )
    expect(centred.map((node) => node.id).sort()).toEqual([
      'o-g-apps',
      'o-g-business',
      'o-g-platform',
      'o-note-biz',
      'o-note-ref',
    ])
    for (const node of centred) {
      delete node.appearance!.textAlignment
      if (!Object.keys(node.appearance!).length) delete node.appearance
    }

    // Archi hides a connection between a shape and one nested in it when the
    // nesting already says it, and its export leaves the connection out. The
    // native file has it, so it is kept: it is the model's, not the export's.
    const nested = landscape(native).connections.findIndex((c) => c.id === 'c-k8s-runtime')
    expect(landscape(native).connections[nested]).toMatchObject({
      source: 'o-k8s',
      target: 'o-runtime',
    })
    expect(landscape(exported).connections.map((c) => c.id)).not.toContain('c-k8s-runtime')
    landscape(native).connections.splice(nested, 1)

    // Archi exports a line width on connections but not on shapes.
    const engine = landscape(native).nodes.find((n) => n.id === 'o-engine')!
    expect(engine.appearance?.lineWidth).toBe(2)
    delete engine.appearance!.lineWidth

    expect(comparable(native)).toEqual(comparable(exported))
    expect(native.name).toBe(exported.name)
    expect(native.id).toBe(exported.id)
  })

  it('reads directed associations and influence modifiers exactly as the exchange export reads', () => {
    expect(comparable(read(attributesNative))).toEqual(comparable(exchange(attributesExchange)))
  })

  it('keeps Archi’s folder ids, which its exchange export leaves out', () => {
    expect(read(claimsNative).folders.map((f) => f.id)).toEqual(
      expect.arrayContaining(['f-customer', 'f-claims-apps', 'f-legacy', 'f-legacy-host']),
    )
  })

  it('maps every Archi viewpoint to the name Archi exports it as', () => {
    const viewpoint = (workspace: Workspace) =>
      Object.fromEntries(
        workspace.views.filter((v) => v.id.startsWith('vp-')).map((v) => [v.id, v.viewpoint]),
      )
    const native = viewpoint(read(coverageNative))
    expect(Object.keys(native)).toHaveLength(24)
    expect(native).toEqual(viewpoint(exchange(coverageExchange)))
  })

  it('produces a model that validates', () => {
    expect(validate(read(claimsNative)).findings).toEqual([])
  })
})

describe('what Archi’s file holds (#13)', () => {
  const coverage = read(coverageNative)
  const element = (id: string) => coverage.elements.find((e) => e.id === id)!
  const relationship = (id: string) => coverage.relationships.find((r) => r.id === id)!
  const edges = coverage.views.find((v) => v.id === 'v-edges')!
  const node = (id: string) => edges.nodes.find((n) => n.id === id)!
  const connection = (id: string) => edges.connections.find((c) => c.id === id)!

  it('reads Archi’s access codes, absent being Write', () => {
    expect(
      ['r-write', 'r-read', 'r-access', 'r-readwrite'].map(
        (id) => relationship(id).profile?.accessType,
      ),
    ).toEqual(['Write', 'Read', 'Access', 'ReadWrite'])
  })

  it('reads junction kinds, a directed association and an influence strength', () => {
    expect(element('j-and')).not.toHaveProperty('junctionKind')
    expect(element('j-or').junctionKind).toBe('or')
    expect(relationship('r-directed').isDirected).toBe(true)
    expect(relationship('r-influence').modifier).toBe('++')
    expect(relationship('r-influence').name).toBe('Drives')
  })

  it('keeps properties, an empty value, documentation line breaks and folder documentation', () => {
    expect(element('ba-adjuster').properties).toEqual({
      owner: 'Claims',
      headcount: '42',
      empty: '',
    })
    expect(element('ba-adjuster').documentation).toBe('Assesses a claim.\r\nSecond line.')
    expect(coverage.folders.find((f) => f.id === 'f-actors')).toEqual({
      id: 'f-actors',
      name: 'Actors',
      documentation: 'Who does the work.',
      root: 'business',
    })
    expect(edges.properties).toEqual({ audience: 'Architects' })
  })

  it('keeps a specialization as the property Archi exports it as', () => {
    expect(element('ac-engine').properties).toEqual({ [SPECIALIZATION_KEY]: 'Microservice' })
    expect(
      exchange(coverageExchange).elements.find((e) => e.id === 'ac-engine')?.properties,
    ).toEqual({ [SPECIALIZATION_KEY]: 'Microservice' })
  })

  it('draws a default-sized shape at the size Archi draws it', () => {
    expect(node('o-adjuster').bounds).toEqual({ x: 40, y: 40, width: 120, height: 55 })
    expect(node('o-group').bounds).toEqual({ x: 40, y: 360, width: 400, height: 140 })
    expect(node('o-note').bounds).toEqual({ x: 10, y: 30, width: 185, height: 80 })
    expect(node('o-and').bounds).toEqual({ x: 500, y: 320, width: 15, height: 15 })
    expect(node('o-ref').bounds).toEqual({ x: 800, y: 40, width: 120, height: 55 })
  })

  it('places a bendpoint from the size Archi draws, where Archi’s export used -1', () => {
    // Centres (100, 67) and (380, 155); offsets (100, 0) and (-100, 80); weight ½.
    expect(connection('c-directed').bendpoints).toEqual([{ x: 240, y: 151 }])
    const exported = exchange(coverageExchange).views.find((v) => v.id === 'v-edges')!
    expect(exported.connections.find((c) => c.id === 'c-directed')!.bendpoints).toEqual([
      { x: 210, y: 137 },
    ])
  })

  it('places bendpoints between odd-sized shapes exactly where Archi’s export does', () => {
    // Integer centres decide the second case: fractional ones give x = 44, not 43.
    const rounding = (workspace: Workspace) =>
      workspace.views.find((v) => v.id === 'v-rounding')!.connections.map((c) => c.bendpoints)
    expect(rounding(coverage)).toEqual([
      [{ x: 84, y: 49 }],
      [
        { x: 43, y: 75 },
        { x: 92, y: 64 },
      ],
    ])
    expect(rounding(coverage)).toEqual(rounding(exchange(coverageExchange)))
  })

  it('reads appearance: colours with alpha, font, text placement and line width', () => {
    expect(node('o-adjuster').appearance).toEqual({
      fillColor: '#ffe0a080',
      lineColor: '#336699c8',
      fontName: 'Helvetica',
      fontSize: 14,
      fontStyle: ['italic'],
      fontColor: '#802020',
      textAlignment: 'left',
      textPosition: 'bottom',
    })
    expect(connection('c-directed').appearance).toEqual({ lineColor: '#008000', lineWidth: 3 })
    expect(node('o-group').appearance).toEqual({ textAlignment: 'right' })
    expect(node('o-note').appearance).toEqual({ textAlignment: 'center' })
  })

  it('reads groups, notes, lines and view references', () => {
    expect(node('o-group')).toMatchObject({
      kind: 'group',
      name: 'Grouped',
      documentation: 'A visual group with documentation.',
    })
    expect(node('o-note')).toMatchObject({
      kind: 'note',
      text: 'A note inside a group.',
      parent: 'o-group',
    })
    expect(connection('c-note-line')).toMatchObject({ kind: 'line', name: 'see' })
    expect(node('o-ref')).toMatchObject({ kind: 'view-ref', view: 'vp-layered' })
  })
})

describe('what it cannot hold, it says (#13)', () => {
  const problems = importArchimate(coverageNative).problems
  const found = (code: string) => problems.filter((p) => p.code === code)

  it('skips sketches and canvases by name', () => {
    expect(found('archimate.view-type-unsupported').map((p) => p.subject)).toEqual([
      's-sketch',
      'cv-canvas',
    ])
    const workspace = read(coverageNative)
    expect(workspace.views.map((v) => v.id)).not.toContain('s-sketch')
    expect(workspace.views).toHaveLength(26)
  })

  it('skips a relationship that ends on a relationship, and a line that ends on a line', () => {
    expect(found('archimate.dangling-relationship').map((p) => p.subject)).toEqual([
      'r-on-relation',
    ])
    expect(found('archimate.connection-on-connection')).toHaveLength(1)
  })

  it('skips an image, and reports the rest', () => {
    expect(found('archimate.node-type-unsupported')[0]?.message).toMatch(
      /o-image.*DiagramModelImage/,
    )
    expect(found('archimate.default-size')[0]?.message).toMatch(/^6 shapes/)
    expect(found('archimate.appearance-unsupported')[0]?.message).toMatch(/gradient/)
    expect(found('archimate.router-unsupported')).toHaveLength(1)
    expect(found('archimate.specialization-as-property')).toHaveLength(1)
    expect(found('archimate.folder-properties-skipped')[0]?.message).toMatch(/Actors/)
    expect(found('import.relationship-documentation-skipped')[0]?.message).toMatch(
      /^1 relationship/,
    )
    expect(found('archimate.model-purpose-skipped')).toHaveLength(1)
  })

  it('reports nothing else', () => {
    expect([...new Set(codes(coverageNative))].sort()).toEqual([
      'archimate.appearance-unsupported',
      'archimate.connection-on-connection',
      'archimate.dangling-relationship',
      'archimate.default-size',
      'archimate.folder-properties-skipped',
      'archimate.model-purpose-skipped',
      'archimate.node-type-unsupported',
      'archimate.router-unsupported',
      'archimate.specialization-as-property',
      'archimate.view-type-unsupported',
      'import.relationship-documentation-skipped',
    ])
    expect(codes(claimsNative)).toEqual(['archimate.model-purpose-skipped'])
  })

  it('refuses what is not an Archi model, and what is not XML', () => {
    expect(codes('<foo/>')).toEqual(['archimate.not-a-model'])
    expect(importArchimate('<archimate:model').ok).toBe(false)
  })
})

describe('round trips (#13)', () => {
  it('is byte-identical through canonical JSON', () => {
    const json = toCanonicalJson(read(coverageNative))
    const back = fromCanonicalJson(json)
    expect(back.problems).toEqual([])
    expect(toCanonicalJson(back.workspace!)).toBe(json)
  })

  it('exports to the exchange format and reads back the same model, but for alpha rounding', () => {
    const native = read(claimsNative)
    const back = exchange(exportExchange(native).xml)
    // The format holds opacity in whole percent, so Archi's 160 of 255 goes out
    // as 63% and comes back as 161: the one thing the trip cannot carry exactly.
    const crm = (workspace: Workspace) =>
      workspace.views.find((v) => v.id === 'v-landscape')!.nodes.find((n) => n.id === 'o-crm')!
    expect(crm(native).appearance?.fillColor).toBe('#e0e0e0a0')
    expect(crm(back).appearance?.fillColor).toBe('#e0e0e0a1')
    crm(back).appearance!.fillColor = '#e0e0e0a0'
    expect(comparable(back)).toEqual(comparable(native))
  })
})

describe('choosing the reader (#13)', () => {
  const file = (name: string, contents: string) => new File([contents], name)

  it('knows an Archi model from an exchange file by its namespace', () => {
    expect(isArchiModel(claimsNative)).toBe(true)
    expect(isArchiModel(claimsExchange)).toBe(false)
  })

  it('reads an Archi model whatever it is called, and an exchange file called .archimate', async () => {
    const asXml = await readWorkspaceFile(file('model.xml', claimsNative))
    expect(asXml.problems.map((p) => p.code)).toEqual(['archimate.model-purpose-skipped'])
    expect(asXml.workspace?.views).toHaveLength(3)
    const named = await readWorkspaceFile(file('model.archimate', claimsExchange))
    expect(named.problems.map((p) => p.code)).toEqual(['exchange.model-documentation-skipped'])
  })

  // #99: the choice was a substring search over the first 4 KB, so any of these
  // sent the file to the wrong reader, which returned an empty workspace, ok,
  // with nothing reported.
  it('goes by the root’s namespace, not by where the namespace is mentioned', async () => {
    const mentioned = claimsExchange.replace(
      '<model ',
      `<!-- converted from "${ARCHI_NAMESPACE}" by Archi --><model `,
    )
    expect(isArchiModel(mentioned)).toBe(false)
    const read = await readWorkspaceFile(file('model.xml', mentioned))
    expect(read.ok).toBe(true)
    expect(read.workspace?.elements.length).toBe(exchange(claimsExchange).elements.length)

    const singleQuoted = claimsNative.replace(
      `xmlns:archimate="${ARCHI_NAMESPACE}"`,
      `xmlns:archimate='${ARCHI_NAMESPACE}'`,
    )
    expect(singleQuoted).not.toBe(claimsNative)
    const longPreamble = claimsNative.replace(
      '<archimate:model',
      `<!-- ${'x'.repeat(5000)} -->\n<archimate:model`,
    )
    for (const text of [singleQuoted, longPreamble]) {
      const result = await readWorkspaceFile(file('model.archimate', text))
      expect(result.workspace?.views).toHaveLength(3)
    }
  })

  it('refuses the other format’s file in each reader, instead of reading it as empty', () => {
    const asExchange = importExchangeXml(claimsNative)
    expect(asExchange.ok).toBe(false)
    expect(asExchange.problems.map((p) => p.code)).toEqual(['exchange.wrong-namespace'])
    const asArchi = importArchimate(claimsExchange)
    expect(asArchi.ok).toBe(false)
    expect(asArchi.problems.map((p) => p.code)).toEqual(['archimate.wrong-namespace'])
  })

  it('does not call any other zip an Archi model', async () => {
    const result = await readWorkspaceFile(file('report.docx', 'PK\u0003\u0004rest'))
    expect(result.ok).toBe(false)
    expect(result.problems.map((p) => p.code)).toEqual(['file.archive-unrecognised'])
    expect(result.problems[0]!.message).not.toMatch(/Archi model saved/)
  })

  it('explains an Archi model saved as an archive with images', async () => {
    const result = await readWorkspaceFile(file('with-images.archimate', 'PK\u0003\u0004rest'))
    expect(result.ok).toBe(false)
    expect(result.problems.map((p) => p.code)).toEqual(['archimate.archive-unsupported'])
  })
})

describe('the branches only a damaged or unusual file reaches (#13)', () => {
  /** A minimal Archi model around `body`, which sits in the top-level Other folder. */
  const model = (body: string, extra = '') =>
    `<?xml version="1.0" encoding="UTF-8"?>
<archimate:model xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:archimate="http://www.archimatetool.com/archimate" name="M" id="m">
  <folder name="Business" id="top-b" type="business">
    <element xsi:type="archimate:BusinessActor" name="A" id="a"/>
    <element xsi:type="archimate:BusinessRole" name="B" id="b"/>
  </folder>
  <folder name="Other" id="top-o" type="other">${body}</folder>${extra}
</archimate:model>`
  const problemsOf = (xml: string) => importArchimate(xml).problems.map((p) => p.code)

  it('keeps the children of a skipped shape, placed where they were', () => {
    const workspace = read(
      model(`<element xsi:type="archimate:ArchimateDiagramModel" name="V" id="v">
        <child xsi:type="archimate:Group" id="g" name="G"><bounds x="100" y="100" width="300" height="300"/>
          <child xsi:type="archimate:DiagramModelImage" id="img"><bounds x="20" y="30" width="200" height="200"/>
            <child xsi:type="archimate:DiagramObject" id="n" archimateElement="a"><bounds x="5" y="7" width="120" height="55"/></child>
          </child>
        </child>
      </element>`),
    )
    const nodes = workspace.views[0]!.nodes
    expect(nodes.map((n) => n.id)).toEqual(['g', 'n'])
    // 20 + 5 and 30 + 7, relative to the group the image sat in.
    expect(nodes[1]).toMatchObject({
      parent: 'g',
      bounds: { x: 25, y: 37, width: 120, height: 55 },
    })
  })

  it('gives a folder whose id another object has a new one', () => {
    const workspace = read(model(`<folder name="Clash" id="a"/>`))
    expect(workspace.folders).toEqual([{ id: 'folder-a', name: 'Clash', root: 'other' }])
  })

  it('reports an unknown type, an unknown junction kind and access code, and a nameless property', () => {
    expect(
      problemsOf(
        model(`<element xsi:type="archimate:Gizmo" name="X" id="x"/>
          <element xsi:type="archimate:Junction" name="J" id="j" type="xor"/>
          <element xsi:type="archimate:AccessRelationship" id="r" source="a" target="b" accessType="9"/>
          <element xsi:type="archimate:BusinessEvent" name="E" id="e"><property value="orphan"/></element>`),
      ).sort(),
    ).toEqual([
      'archimate.access-type-unknown',
      'archimate.junction-kind-unknown',
      'archimate.property-no-key',
      'archimate.unknown-type',
    ])
  })

  it('reports an unknown viewpoint and top-level folder type, and keeps what they hold', () => {
    const result = importArchimate(
      model(
        `<element xsi:type="archimate:ArchimateDiagramModel" name="V" id="v" viewpoint="whiteboard"/>`,
        `<folder name="Odd" id="top-x" type="odd"><element xsi:type="archimate:Goal" name="G" id="g"/></folder>`,
      ),
    )
    expect(result.problems.map((p) => p.code).sort()).toEqual([
      'archimate.folder-type-unknown',
      'archimate.viewpoint-unknown',
    ])
    expect(result.workspace!.views[0]).not.toHaveProperty('viewpoint')
    expect(result.workspace!.elements.map((e) => e.id)).toContain('g')
  })

  it('keeps the first of two objects sharing an id, and the first specialization of two', () => {
    const result = importArchimate(
      model(
        `<element xsi:type="archimate:Goal" name="First" id="dup" profiles="p1 p2"/>
         <element xsi:type="archimate:Goal" name="Second" id="dup"/>`,
        `<profile name="One" id="p1" conceptType="Goal"/><profile name="Two" id="p2" conceptType="Goal"/>`,
      ),
    )
    expect(result.problems.map((p) => p.code).sort()).toEqual([
      'archimate.duplicate-id',
      'archimate.specialization-as-property',
      'archimate.specializations-dropped',
    ])
    expect(result.workspace!.elements.find((e) => e.id === 'dup')).toMatchObject({
      name: 'First',
      properties: { [SPECIALIZATION_KEY]: 'One' },
    })
  })

  it('turns a reference to a view it did not import into a note naming it', () => {
    const result = importArchimate(
      model(`<element xsi:type="archimate:SketchModel" name="Whiteboard" id="s"/>
        <element xsi:type="archimate:ArchimateDiagramModel" name="V" id="v">
          <child xsi:type="archimate:DiagramModelReference" id="ref" model="s"><bounds x="0" y="0" width="120" height="55"/></child>
        </element>`),
    )
    expect(result.workspace!.views[0]!.nodes[0]).toMatchObject({ kind: 'note', text: 'Whiteboard' })
    expect(result.problems.map((p) => p.code)).toContain('archimate.dangling-view-reference')
  })
})

describe('the exchange reader says what Archi’s export carried and it could not keep (#13)', () => {
  it('reports relationship documentation and the model’s documentation', () => {
    const found = importExchangeXml(coverageExchange).problems.map((p) => p.code)
    expect(found).toContain('import.relationship-documentation-skipped')
    expect(found).toContain('exchange.model-documentation-skipped')
  })
})

describe('the follow-ups from the #102 review (#103)', () => {
  const file = (name: string, contents: string) => new File([contents], name)

  it('reads an Archi model whose doctype has a bracket in its system id', async () => {
    const text = claimsNative.replace('?>', '?>\n<!DOCTYPE model SYSTEM "a[b.dtd">')
    expect(text).not.toBe(claimsNative)
    const result = await readWorkspaceFile(file('model.archimate', text))
    expect(result.workspace?.elements.length).toBe(read(claimsNative).elements.length)
  })

  it('reads a model in Archi’s legacy namespace natively, and the exchange reader refuses it', async () => {
    const legacy = claimsNative.replace(ARCHI_NAMESPACE, ARCHI_LEGACY_NAMESPACE)
    expect(legacy).not.toBe(claimsNative)
    const result = await readWorkspaceFile(file('old.archimate', legacy))
    expect(result.workspace?.elements.length).toBe(read(claimsNative).elements.length)
    expect(importExchangeXml(legacy).problems.map((p) => p.code)).toEqual([
      'exchange.wrong-namespace',
    ])
  })

  it('reads an exchange file with no namespace or a near miss, and says so', () => {
    const expected = exchange(claimsExchange).elements.length
    for (const namespace of ['', 'https://www.opengroup.org/xsd/archimate/3.0/']) {
      const text = claimsExchange.replace(
        'xmlns="http://www.opengroup.org/xsd/archimate/3.0/"',
        namespace ? `xmlns="${namespace}"` : '',
      )
      expect(text).not.toBe(claimsExchange)
      const result = importExchangeXml(text)
      expect(result.workspace?.elements.length, namespace).toBe(expected)
      expect(result.problems.map((p) => p.code)).toContain('exchange.namespace-unexpected')
    }
    expect(importExchangeXml(claimsExchange).problems.map((p) => p.code)).not.toContain(
      'exchange.namespace-unexpected',
    )
  })

  // #104: the fail-closed refusal sat ahead of not-a-model and told these files
  // they parse as XML and should be reported.
  it('calls a file with no element at all not a model, not an unreadable root', () => {
    for (const text of ['', 'hello world', '<?xml version="1.0"?><!-- nothing -->']) {
      expect(
        importArchimate(text).problems.map((p) => p.code),
        text,
      ).toEqual(['archimate.not-a-model'])
      expect(
        importExchangeXml(text).problems.map((p) => p.code),
        text,
      ).toEqual(['exchange.not-a-model'])
    }
  })

  it('knows an Archi zip whose name has trailing space', async () => {
    const result = await readWorkspaceFile(file('m.archimate ', 'PK\u0003\u0004rest'))
    expect(result.problems.map((p) => p.code)).toEqual(['archimate.archive-unsupported'])
  })
})
