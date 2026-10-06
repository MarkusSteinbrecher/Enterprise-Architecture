import { describe, expect, it } from 'vitest'
import type { Workspace } from '@/model'
import { SPECIALIZATION_KEY, importArchimate } from './archimate-native'
import { importExchangeXml } from './exchange-format'
import type { ImportResult } from './problems'

/**
 * What the post-merge review of #98 found the readers losing without a word
 * (#100), one test per finding. Each asserts the problem by its code, so taking
 * the report out fails the test, and where the model can carry the data, that
 * it was carried.
 */

/** A minimal Archi model: two actors, a view folder, and `body` in Other. */
const archi = (body: string, extra = '') =>
  `<?xml version="1.0" encoding="UTF-8"?>
<archimate:model xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:archimate="http://www.archimatetool.com/archimate" name="M" id="m" version="5.0.0">
  <folder name="Business" id="top-b" type="business">
    <element xsi:type="archimate:BusinessActor" name="A" id="a"/>
    <element xsi:type="archimate:BusinessRole" name="B" id="b"/>
    <element xsi:type="archimate:Grouping" name="G" id="grouping"/>
  </folder>
  <folder name="Relations" id="top-r" type="relations">
    <element xsi:type="archimate:AssignmentRelationship" id="r" source="a" target="b"/>
  </folder>
  <folder name="Other" id="top-o" type="other">${body}</folder>${extra}
</archimate:model>`

/** A view around `children`, which may draw `a` (shape `sa`) and `b` (shape `sb`). */
const archiView = (children: string, attributes = 'id="v"') =>
  archi(
    `<element xsi:type="archimate:ArchimateDiagramModel" name="V" ${attributes}>${children}</element>`,
  )

const shapes = `
  <child xsi:type="archimate:DiagramObject" id="sa" archimateElement="a"><bounds x="0" y="0" width="120" height="55"/>
    <sourceConnection xsi:type="archimate:Connection" id="ok" source="sa" target="sb" archimateRelationship="r"/>
  </child>
  <child xsi:type="archimate:DiagramObject" id="sb" archimateElement="b"><bounds x="300" y="0" width="120" height="55"/>
    <sourceConnection xsi:type="archimate:Connection" id="reversed" source="sb" target="sa" archimateRelationship="r"/>
  </child>`

/** A minimal exchange-format model with the same two actors and relationship. */
const exchange = (extra: { elements?: string; relationships?: string; views?: string } = {}) =>
  `<?xml version="1.0" encoding="UTF-8"?>
<model xmlns="http://www.opengroup.org/xsd/archimate/3.0/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" identifier="m">
  <name xml:lang="en">M</name>
  <elements>
    <element identifier="a" xsi:type="BusinessActor"><name xml:lang="en">A</name></element>
    <element identifier="b" xsi:type="BusinessRole"><name xml:lang="en">B</name></element>${extra.elements ?? ''}
  </elements>
  <relationships>
    <relationship identifier="r" xsi:type="Assignment" source="a" target="b"/>${extra.relationships ?? ''}
  </relationships>
  <propertyDefinitions>
    <propertyDefinition identifier="pd-k" type="string"><name xml:lang="en">k</name></propertyDefinition>
    <propertyDefinition identifier="pd-sk" type="string"><name xml:lang="en"> k </name></propertyDefinition>
  </propertyDefinitions>${
    extra.views
      ? `
  <views><diagrams><view identifier="v" xsi:type="Diagram"><name xml:lang="en">V</name>${extra.views}</view></diagrams></views>`
      : ''
  }
</model>`

const exchangeShapes = `
  <node identifier="sa" elementRef="a" xsi:type="Element" x="0" y="0" w="120" h="55"/>
  <node identifier="sb" elementRef="b" xsi:type="Element" x="300" y="0" w="120" h="55"/>
  <connection identifier="ok" relationshipRef="r" xsi:type="Relationship" source="sa" target="sb"/>
  <connection identifier="reversed" relationshipRef="r" xsi:type="Relationship" source="sb" target="sa"/>`

function workspaceOf(result: ImportResult): Workspace {
  if (!result.workspace) throw new Error(JSON.stringify(result.problems))
  return result.workspace
}

const found = (result: ImportResult, code: string) => result.problems.filter((p) => p.code === code)

describe('the .archimate reader reports what it cannot carry (#100)', () => {
  it('1: keeps the first of a repeated property key, and says so', () => {
    const result = importArchimate(
      archi(`<element xsi:type="archimate:Goal" name="G" id="g">
        <property key="k" value="1"/><property key="k" value="2"/><property key="other" value="x"/>
      </element>`),
    )
    expect(workspaceOf(result).elements.find((e) => e.id === 'g')!.properties).toEqual({
      k: '1',
      other: 'x',
    })
    expect(found(result, 'import.property-repeated')).toMatchObject([
      { subject: 'g', message: expect.stringContaining('"k"') },
    ])
  })

  it('2: keeps an own Specialization property over a specialization, and says so', () => {
    const result = importArchimate(
      archi(
        `<element xsi:type="archimate:Goal" name="G" id="g" profiles="p1">
          <property key="${SPECIALIZATION_KEY}" value="mine"/>
        </element>`,
        `<profile name="One" id="p1" conceptType="Goal"/>`,
      ),
    )
    expect(workspaceOf(result).elements.find((e) => e.id === 'g')!.properties).toEqual({
      [SPECIALIZATION_KEY]: 'mine',
    })
    expect(found(result, 'archimate.specialization-shadowed')).toMatchObject([
      { subject: 'g', message: expect.stringContaining('One') },
    ])
    expect(found(result, 'archimate.specialization-as-property')).toEqual([])
  })

  it('2: reports a specialization the file does not define', () => {
    const result = importArchimate(
      archi(
        `<element xsi:type="archimate:Goal" name="G" id="g" profiles="nowhere p1"/>`,
        `<profile name="One" id="p1" conceptType="Goal"/>`,
      ),
    )
    expect(found(result, 'archimate.specialization-unknown')).toMatchObject([
      { subject: 'g', message: expect.stringContaining('"nowhere"') },
    ])
    // The one it does define is still kept.
    expect(workspaceOf(result).elements.find((e) => e.id === 'g')!.properties).toEqual({
      [SPECIALIZATION_KEY]: 'One',
    })
  })

  it('3: reports documentation and properties on a top-level folder', () => {
    const result = importArchimate(
      archi(
        '',
        `<folder name="Views" id="top-v" type="diagrams">
          <documentation>What the views are for.</documentation>
          <property key="owner" value="EA"/>
        </folder>`,
      ),
    )
    expect(found(result, 'archimate.top-folder-documentation-skipped')).toMatchObject([
      { message: expect.stringContaining('Views') },
    ])
    expect(found(result, 'archimate.folder-properties-skipped')).toMatchObject([
      { message: expect.stringContaining('Views') },
    ])
  })

  it('4: reports what shapes and lines carry that they cannot hold here', () => {
    const result = importArchimate(
      archiView(`
        <child xsi:type="archimate:DiagramObject" id="sa" archimateElement="a"><bounds x="0" y="0" width="120" height="55"/>
          <feature name="labelExpression" value="\${name}"/>
          <sourceConnection xsi:type="archimate:DiagramModelConnection" id="line" source="sa" target="note">
            <documentation>Why this line</documentation>
            <property key="k" value="v"/>
          </sourceConnection>
          <sourceConnection xsi:type="archimate:Connection" id="ok" source="sa" target="sb" archimateRelationship="r">
            <feature name="labelExpression" value="x"/>
          </sourceConnection>
        </child>
        <child xsi:type="archimate:DiagramObject" id="sb" archimateElement="b"><bounds x="300" y="0" width="120" height="55"/></child>
        <child xsi:type="archimate:Note" id="note"><bounds x="0" y="100" width="185" height="80"/>
          <content>Text</content><property key="k" value="v"/>
        </child>
        <child xsi:type="archimate:Group" id="group" name="G"><bounds x="0" y="200" width="400" height="140"/>
          <documentation>kept</documentation><property key="k" value="v"/><mystery/>
        </child>`),
    )
    const [report, ...rest] = found(result, 'archimate.view-content-skipped')
    expect(rest).toEqual([])
    for (const what of [
      'a label expression on an element’s shape (1)',
      'a label expression on a relationship’s connection (1)',
      'documentation on a line (1)',
      'properties on a line (1)',
      'properties on a note (1)',
      'properties on a group (1)',
    ]) {
      expect(report?.message).toContain(what)
    }
    // Something Archi would not write is not a known loss: the ledger reports it (#101).
    expect(report?.message).not.toContain('mystery')
    expect(found(result, 'import.content-unread')).toMatchObject([
      { subject: 'group', message: expect.stringContaining('1 shape (group) carries <mystery>') },
    ])
    // What a group does hold is kept, and is not reported.
    const group = workspaceOf(result).views[0]!.nodes.find((n) => n.id === 'group')
    expect(group).toMatchObject({ documentation: 'kept' })
    expect(report?.message).not.toContain('documentation on a group')
  })

  it('5: reports an opacity with no colour to apply it to', () => {
    const result = importArchimate(
      archiView(`
        <child xsi:type="archimate:DiagramObject" id="sa" archimateElement="a" alpha="100"><bounds x="0" y="0" width="120" height="55"/>
          <feature name="lineAlpha" value="50"/>
        </child>
        <child xsi:type="archimate:DiagramObject" id="sb" archimateElement="b" alpha="255"><bounds x="300" y="0" width="120" height="55"/></child>`),
    )
    const [report] = found(result, 'archimate.appearance-unsupported')
    expect(report?.message).toContain('alpha without fillColor')
    expect(report?.message).toContain('lineAlpha without lineColor')
    // Fully opaque is Archi's default, so alpha="255" alone loses nothing.
    const opaque = importArchimate(
      archiView(
        `<child xsi:type="archimate:DiagramObject" id="sb" archimateElement="b" alpha="255"><bounds x="0" y="0" width="120" height="55"/></child>`,
      ),
    )
    expect(found(opaque, 'archimate.appearance-unsupported')).toEqual([])
  })

  it('6: reports a view without an id', () => {
    const result = importArchimate(archiView('', 'viewpoint="layered"'))
    expect(workspaceOf(result).views).toEqual([])
    expect(found(result, 'archimate.view-no-id')).toMatchObject([
      { severity: 'error', message: expect.stringContaining('“V”') },
    ])
  })

  it('7: reports malformed bounds, offsets and display values, apart from Archi’s default size', () => {
    const result = importArchimate(
      archiView(`
        <child xsi:type="archimate:DiagramObject" id="sa" archimateElement="a" fillColor="red" textAlignment="3"><bounds x="1e" y="0" width="abc" height="55"/>
          <sourceConnection xsi:type="archimate:Connection" id="ok" source="sa" target="sb" archimateRelationship="r">
            <bendpoint startX="?" startY="0" endX="0" endY="0"/>
          </sourceConnection>
        </child>
        <child xsi:type="archimate:DiagramObject" id="sb" archimateElement="b"><bounds x="300" y="0" width="120" height="55"/></child>`),
    )
    const [report] = found(result, 'archimate.value-malformed')
    for (const name of ['x', 'width', 'startX']) expect(report?.message).toContain(name)
    expect(found(result, 'archimate.default-size')).toEqual([])
    const node = workspaceOf(result).views[0]!.nodes.find((n) => n.id === 'sa')!
    expect(node.bounds).toEqual({ x: 0, y: 0, width: 120, height: 55 })

    // listed() names only the first three; the colour, the line alpha (a
    // feature, as Archi stores it) and the alignment are there too.
    const display = importArchimate(
      archiView(
        `<child xsi:type="archimate:DiagramObject" id="sa" archimateElement="a" fillColor="red" textAlignment="3"><bounds x="0" y="0" width="120" height="55"/>
          <feature name="lineAlpha" value="half"/>
        </child>`,
      ),
    )
    expect(found(display, 'archimate.value-malformed')[0]?.message).toMatch(
      /\(fillColor, lineAlpha, textAlignment\)/,
    )
  })

  it('8: reports an attribute or child element an element or relationship carries and is not read', () => {
    const result = importArchimate(
      archi(`<element xsi:type="archimate:Goal" name="G" id="g" colour="blue">
          <feature name="weight" value="3"/>
        </element>
        <element xsi:type="archimate:AssociationRelationship" id="assoc" source="a" target="b" strength="++">
          <extra/>
        </element>`),
    )
    const messages = result.problems
      .filter((p) => p.code === 'import.content-unread')
      .map((p) => [p.subject, p.message])
    expect(messages).toEqual([
      ['g', expect.stringContaining('the feature “weight”')],
      ['g', expect.stringContaining('the attribute “colour”')],
      ['assoc', expect.stringContaining('<extra>')],
      // `strength` belongs to an influence; on an association it is not read.
      ['assoc', expect.stringContaining('the attribute “strength”')],
    ])
  })

  it('9: reads an absent text alignment on a note, a group and a Grouping as centred, as Archi draws it', () => {
    const at = (x: number) => `<bounds x="${x}" y="0" width="120" height="55"/>`
    const workspace = workspaceOf(
      importArchimate(
        archiView(`
          <child xsi:type="archimate:Note" id="note">${at(0)}<content>N</content></child>
          <child xsi:type="archimate:Group" id="group" name="G">${at(200)}</child>
          <child xsi:type="archimate:DiagramObject" id="grouping" archimateElement="grouping">${at(400)}</child>
          <child xsi:type="archimate:Note" id="left" textAlignment="1">${at(600)}<content>N</content></child>
          <child xsi:type="archimate:DiagramObject" id="actor" archimateElement="a">${at(800)}</child>`),
      ),
    )
    const alignment = Object.fromEntries(
      workspace.views[0]!.nodes.map((n) => [n.id, n.appearance?.textAlignment]),
    )
    expect(alignment).toEqual({
      note: 'center',
      group: 'center',
      grouping: 'center',
      left: 'left',
      // Archipelago already centres an element's name, so nothing needs saying.
      actor: undefined,
    })
  })

  it('10: skips a connection whose shapes do not draw its relationship’s ends, and says so', () => {
    const result = importArchimate(archiView(shapes))
    expect(workspaceOf(result).views[0]!.connections.map((c) => c.id)).toEqual(['ok'])
    expect(found(result, 'archimate.connection-mismatch')).toMatchObject([
      { subject: 'v', message: expect.stringContaining('"reversed"') },
    ])
  })

  it('11: keeps names, keys, values and documentation exactly as written', () => {
    const workspace = workspaceOf(
      importArchimate(
        archi(`<element xsi:type="archimate:Goal" name="  spaced  " id="g">
          <documentation>  indented
</documentation>
          <property key=" k " value=" v "/><property key="k" value="v"/>
        </element>`),
      ),
    )
    expect(workspace.elements.find((e) => e.id === 'g')).toMatchObject({
      name: '  spaced  ',
      documentation: '  indented\n',
      properties: { ' k ': ' v ', k: 'v' },
    })
  })

  it('12: names the documented relationships it imported, and counts no skipped one', () => {
    const result = importArchimate(
      archi(`<element xsi:type="archimate:ServingRelationship" id="kept" source="a" target="b"><documentation>d</documentation></element>
        <element xsi:type="archimate:ServingRelationship" id="kept" source="a" target="b"><documentation>twin</documentation></element>
        <element xsi:type="archimate:ServingRelationship" id="dangling" source="a" target="nowhere"><documentation>d</documentation></element>`),
    )
    expect(found(result, 'import.relationship-documentation-skipped')).toMatchObject([
      {
        subject: 'kept',
        message: expect.stringMatching(/^1 relationship has documentation \("kept"\)/),
      },
    ])
  })
})

describe('the exchange reader reports what it cannot carry (#100)', () => {
  const property = (ref: string, value: string) =>
    `<property propertyDefinitionRef="${ref}"><value xml:lang="en">${value}</value></property>`

  it('1: keeps the first of a repeated property name, and says so', () => {
    const result = importExchangeXml(
      exchange({
        elements: `<element identifier="g" xsi:type="Goal"><name xml:lang="en">G</name>
          <properties>${property('pd-k', '1')}${property('pd-k', '2')}</properties></element>`,
      }),
    )
    expect(workspaceOf(result).elements.find((e) => e.id === 'g')!.properties).toEqual({ k: '1' })
    expect(found(result, 'import.property-repeated')).toMatchObject([{ subject: 'g' }])
  })

  it('10: skips a connection whose nodes do not draw its relationship’s ends, and says so', () => {
    const result = importExchangeXml(exchange({ views: exchangeShapes }))
    expect(workspaceOf(result).views[0]!.connections.map((c) => c.id)).toEqual(['ok'])
    expect(found(result, 'exchange.connection-mismatch')).toMatchObject([
      { subject: 'v', message: expect.stringContaining('"reversed"') },
    ])
  })

  it('11: keeps names, property names and values exactly as written, so they do not merge', () => {
    const result = importExchangeXml(
      exchange({
        elements: `<element identifier="g" xsi:type="Goal"><name xml:lang="en">  spaced  </name>
          <documentation xml:lang="en"> d </documentation>
          <properties>${property('pd-sk', ' v ')}${property('pd-k', 'v')}</properties></element>`,
      }),
    )
    expect(found(result, 'import.property-repeated')).toEqual([])
    expect(workspaceOf(result).elements.find((e) => e.id === 'g')).toMatchObject({
      name: '  spaced  ',
      documentation: ' d ',
      properties: { ' k ': ' v ', k: 'v' },
    })
  })

  it('12: names the documented relationships it imported, and counts no skipped one', () => {
    const result = importExchangeXml(
      exchange({
        relationships: `
          <relationship identifier="kept" xsi:type="Serving" source="a" target="b"><documentation xml:lang="en">d</documentation></relationship>
          <relationship identifier="dangling" xsi:type="Serving" source="a" target="nowhere"><documentation xml:lang="en">d</documentation></relationship>`,
      }),
    )
    expect(found(result, 'import.relationship-documentation-skipped')).toMatchObject([
      {
        subject: 'kept',
        message: expect.stringMatching(/^1 relationship has documentation \("kept"\)/),
      },
    ])
  })
})

describe('the follow-ups from the #106 review', () => {
  it('refuses a <model> holding only whitespace, which untrimmed is not empty', () => {
    for (const xml of ['<?xml version="1.0"?>\n<model> </model>', '<model>\n</model>']) {
      const result = importExchangeXml(xml)
      expect(result.ok).toBe(false)
      expect(result.problems.map((p) => p.code)).toEqual(['exchange.not-a-model'])
    }
  })

  it('keeps a bendpoint at 0, 0 written with a line break inside, and a folder’s empty property', () => {
    const result = importArchimate(
      archiView(`
        <child xsi:type="archimate:DiagramObject" id="sa" archimateElement="a"><bounds x="0" y="0" width="120" height="55"/>
          <sourceConnection xsi:type="archimate:Connection" id="ok" source="sa" target="sb" archimateRelationship="r"><bendpoint>
          </bendpoint></sourceConnection>
        </child>
        <child xsi:type="archimate:DiagramObject" id="sb" archimateElement="b"><bounds x="300" y="0" width="120" height="55"/></child>`),
    )
    // Midway between the two centres, 60,27 and 360,27.
    expect(workspaceOf(result).views[0]!.connections[0]!.bendpoints).toEqual([{ x: 210, y: 27 }])

    const folder = importArchimate(
      archi(`<folder name="F" id="f"><property>\n</property></folder>`),
    )
    expect(found(folder, 'archimate.folder-properties-skipped')).toMatchObject([
      { message: expect.stringContaining('(F)') },
    ])
  })

  it('names every specialization an own Specialization property shadows', () => {
    const result = importArchimate(
      archi(
        `<element xsi:type="archimate:Goal" name="G" id="g" profiles="p1 p2">
          <property key="${SPECIALIZATION_KEY}" value="mine"/>
        </element>`,
        `<profile name="One" id="p1" conceptType="Goal"/><profile name="Two" id="p2" conceptType="Goal"/>`,
      ),
    )
    expect(found(result, 'archimate.specialization-shadowed')[0]?.message).toContain('“One”, “Two”')
  })

  it('reports nothing else about a duplicate it skipped', () => {
    const result = importArchimate(
      archi(`<element xsi:type="archimate:Goal" name="G" id="g"><feature name="x" value="1"/></element>
        <element xsi:type="archimate:Goal" name="G2" id="g" colour="red"><feature name="x" value="1"/>
          <property key="k" value="1"/><property key="k" value="2"/></element>
        <element xsi:type="archimate:AssignmentRelationship" id="r" source="a" target="b" stray="1"/>
        <element xsi:type="archimate:ArchimateDiagramModel" name="V" id="v"/>
        <element xsi:type="archimate:ArchimateDiagramModel" name="V2" id="v"><property key="k" value="1"/><property key="k" value="2"/></element>`),
    )
    expect(result.problems.map((p) => [p.code, p.subject]).sort()).toEqual([
      ['archimate.duplicate-id', 'g'],
      ['archimate.duplicate-id', 'r'],
      ['archimate.duplicate-id', 'v'],
      ['import.content-unread', 'g'],
    ])
    expect(found(result, 'import.content-unread')[0]?.message).toMatch(/^1 element \(g\)/)
  })

  it('tallies no value of a connection it skipped', () => {
    const result = importArchimate(
      archiView(`
        <child xsi:type="archimate:DiagramObject" id="sa" archimateElement="a"><bounds x="0" y="0" width="120" height="55"/>
          <sourceConnection xsi:type="archimate:Connection" id="ok" source="sa" target="sb" archimateRelationship="r"/>
          <sourceConnection xsi:type="archimate:Connection" id="ok" source="sa" target="sb" archimateRelationship="r" lineColor="red" odd="1"/>
          <sourceConnection xsi:type="archimate:Connection" id="gone" source="sa" target="sb" archimateRelationship="nowhere" fancy="1">
            <bendpoint startX="1e"/>
          </sourceConnection>
        </child>
        <child xsi:type="archimate:DiagramObject" id="sb" archimateElement="b"><bounds x="300" y="0" width="120" height="55"/></child>`),
    )
    expect(result.problems.map((p) => p.code).sort()).toEqual([
      'archimate.dangling-view-connection',
      'archimate.duplicate-connection-id',
    ])
  })
})

describe('the exchange reader reports malformed values (#107)', () => {
  const malformed = (result: ImportResult) => {
    const [report, ...rest] = found(result, 'exchange.value-malformed')
    expect(rest).toEqual([])
    return report?.message ?? ''
  }
  const view = (result: ImportResult) => workspaceOf(result).views[0]!
  const read = (views: string) => importExchangeXml(exchange({ views }))
  const node = (attributes: string) =>
    `<node identifier="sa" elementRef="a" xsi:type="Element" ${attributes}/>
     <node identifier="sb" elementRef="b" xsi:type="Element" x="300" y="0" w="120" h="55"/>`

  it('reads a malformed position as 0 and keeps the node, naming the attribute', () => {
    const result = read(node('x="abc" y="20" w="120" h="55"'))
    expect(view(result).nodes.find((n) => n.id === 'sa')?.bounds).toEqual({
      x: 0,
      y: 20,
      width: 120,
      height: 55,
    })
    expect(malformed(result)).toContain('(x)')
    expect(found(result, 'exchange.node-no-bounds')).toEqual([])
  })

  it('reads a malformed size as the default, not as Archi’s -1, naming the attribute', () => {
    const result = read(node('x="0" y="0" w="wide" h="55"'))
    expect(view(result).nodes.find((n) => n.id === 'sa')?.bounds).toEqual({
      x: 0,
      y: 0,
      width: 120,
      height: 55,
    })
    expect(malformed(result)).toContain('(w)')
    expect(found(result, 'exchange.default-size')).toEqual([])
  })

  it('still skips a node with no position at all', () => {
    const result = read(node('y="0" w="120" h="55"'))
    expect(view(result).nodes.map((n) => n.id)).toEqual(['sb'])
    expect(found(result, 'exchange.node-no-bounds')).toHaveLength(1)
    expect(found(result, 'exchange.value-malformed')).toEqual([])
  })

  it('drops a bendpoint without two numbers, and an empty one, naming what was wrong', () => {
    const result = read(`${node('x="0" y="0" w="120" h="55"')}
      <connection identifier="ok" relationshipRef="r" xsi:type="Relationship" source="sa" target="sb">
        <bendpoint x="1e" y="5"/><bendpoint x="150" y="100"/><bendpoint/>
      </connection>`)
    expect(view(result).connections[0]?.bendpoints).toEqual([{ x: 150, y: 100 }])
    expect(malformed(result)).toContain('(x, y)')
  })

  it('counts nothing on a connection it skipped', () => {
    const result = read(`${node('x="0" y="0" w="120" h="55"')}
      <connection identifier="gone" relationshipRef="nowhere" xsi:type="Relationship" source="sa" target="sb">
        <bendpoint x="1e" y="5"/>
      </connection>`)
    expect(found(result, 'exchange.dangling-view-connection')).toHaveLength(1)
    expect(found(result, 'exchange.value-malformed')).toEqual([])
  })

  it('reads a colour, line width, font size or font style it cannot read as not set, naming each', () => {
    const result = read(
      `${node(`x="0" y="0" w="120" h="55"`).replace(
        '/>',
        `><style lineWidth="0">
          <fillColor r="10" g="red" b="30"/><lineColor r="10" g="20"/>
          <font name="Serif" size="big" style="bold blink"><color r="1" g="2" b="3"/></font>
        </style></node>`,
      )}`,
    )
    const appearance = view(result).nodes.find((n) => n.id === 'sa')?.appearance
    expect(appearance).toEqual({ fontName: 'Serif', fontStyle: ['bold'], fontColor: '#010203' })
    // `g` is malformed on the fill; `b` is missing from the line colour.
    for (const name of ['b', 'g', 'lineWidth', 'size', 'style']) {
      expect(malformed(result)).toMatch(new RegExp(`[(, ]${name}[,)]`))
    }
    expect(found(result, 'import.content-unread')).toEqual([])
  })

  it('counts a colour out of the schema’s range, and says what it did with each (#112 review)', () => {
    const styled = (style: string) =>
      read(node('x="0" y="0" w="120" h="55"').replace('/>', `><style>${style}</style></node>`))
    const clamped = styled('<fillColor r="300" g="0" b="0" a="150"/>')
    // Clamped and kept: 300 is 255, an opacity of 150 is opaque.
    expect(view(clamped).nodes.find((n) => n.id === 'sa')?.appearance).toEqual({
      fillColor: '#ff0000',
    })
    expect(malformed(clamped)).toContain('(a, r)')
    expect(malformed(clamped)).toContain('a colour component out of range was clamped')

    // A malformed opacity keeps its colour, opaque, and the message says so.
    const opaque = styled('<lineColor r="1" g="2" b="3" a="half"/>')
    expect(view(opaque).nodes.find((n) => n.id === 'sa')?.appearance).toEqual({
      lineColor: '#010203',
    })
    expect(malformed(opaque)).toContain('(a)')
    expect(malformed(opaque)).toContain('a malformed opacity read as opaque')
  })

  it('reads plain as no font style: it is the schema’s word for none, not a malformed one', () => {
    const result = read(
      node('x="0" y="0" w="120" h="55"').replace(
        '/>',
        '><style><font name="Serif" style="plain italic"/></style></node>',
      ),
    )
    // Present first, so the absence below is about this file.
    expect(view(result).nodes.find((n) => n.id === 'sa')?.appearance?.fontStyle).toEqual(['italic'])
    expect(found(result, 'exchange.value-malformed')).toEqual([])
  })

  it('shares one measured() with the native reader', async () => {
    const native = await import('./archimate-native?raw')
    const views = await import('./exchange-views?raw')
    for (const source of [native.default, views.default]) {
      expect(source).not.toMatch(/^function (measured|num|bump|entries)\(/m)
    }
  })
})
