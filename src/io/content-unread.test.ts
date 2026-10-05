import { describe, expect, it } from 'vitest'
import { importArchimate } from './archimate-native'
import { Ledger } from './consumption'
import { importExchangeXml } from './exchange-format'
import type { ImportResult } from './problems'

/**
 * The readers report every attribute and child element they did not consume
 * (#101). The probes here are things neither format defines, so no reader can
 * have a line for them: only the ledger can see them, and each test fails if it
 * is bypassed.
 */

const unread = (result: ImportResult) =>
  result.problems
    .filter((p) => p.code === 'import.content-unread')
    .map((p) => ({ subject: p.subject, message: p.message }))

const STRAY = 'stray="1"'
const CHILD = '<stray/>'

const archi = `<?xml version="1.0" encoding="UTF-8"?>
<archimate:model xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:archimate="http://www.archimatetool.com/archimate" name="M" id="m" version="5.0.0">
  <folder name="Business" id="top-b" type="business">
    <folder name="Actors" id="f" ${STRAY}>${CHILD}
      <element xsi:type="archimate:BusinessActor" name="A" id="a" ${STRAY}>${CHILD}</element>
    </folder>
    <element xsi:type="archimate:BusinessRole" name="B" id="b"/>
  </folder>
  <folder name="Relations" id="top-r" type="relations">
    <element xsi:type="archimate:AssignmentRelationship" id="r" source="a" target="b" ${STRAY}>${CHILD}</element>
  </folder>
  <folder name="Views" id="top-v" type="diagrams">
    <element xsi:type="archimate:ArchimateDiagramModel" name="V" id="v">
      <child xsi:type="archimate:DiagramObject" id="sa" targetConnections="ok" archimateElement="a" ${STRAY}>${CHILD}
        <bounds x="0" y="0" width="120" height="55"/>
        <sourceConnection xsi:type="archimate:Connection" id="ok" source="sa" target="sb" archimateRelationship="r" ${STRAY}>${CHILD}</sourceConnection>
      </child>
      <child xsi:type="archimate:DiagramObject" id="sb" archimateElement="b"><bounds x="300" y="0" width="120" height="55"/></child>
    </element>
  </folder>
</archimate:model>`

const exchange = `<?xml version="1.0" encoding="UTF-8"?>
<model xmlns="http://www.opengroup.org/xsd/archimate/3.0/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.opengroup.org/xsd/archimate/3.0/ x.xsd" identifier="m">
  <name xml:lang="en">M</name>
  <elements>
    <element identifier="a" xsi:type="BusinessActor" ${STRAY}><name xml:lang="en">A</name>${CHILD}</element>
    <element identifier="b" xsi:type="BusinessRole"><name xml:lang="en">B</name></element>
  </elements>
  <relationships>
    <relationship identifier="r" xsi:type="Assignment" source="a" target="b" ${STRAY}>${CHILD}</relationship>
  </relationships>
  <organizations>
    <item><label xml:lang="en">Business</label>
      <item identifier="f" ${STRAY}><label xml:lang="en">Actors</label>${CHILD}<item identifierRef="a"/></item>
    </item>
  </organizations>
  <views><diagrams><view identifier="v" xsi:type="Diagram"><name xml:lang="en">V</name>
    <node identifier="sa" elementRef="a" xsi:type="Element" x="0" y="0" w="120" h="55" ${STRAY}>${CHILD}</node>
    <node identifier="sb" elementRef="b" xsi:type="Element" x="300" y="0" w="120" h="55"/>
    <connection identifier="ok" relationshipRef="r" xsi:type="Relationship" source="sa" target="sb" ${STRAY}>${CHILD}</connection>
  </view></diagrams></views>
</model>`

describe('both readers report what they did not read, at every level (#101)', () => {
  for (const [reader, result, levels] of [
    [
      'importArchimate',
      () => importArchimate(archi),
      [
        ['element', 'a'],
        ['relationship', 'r'],
        ['shape', 'sa'],
        ['connection', 'ok'],
        ['folder', 'f'],
      ],
    ],
    [
      'importExchangeXml',
      () => importExchangeXml(exchange),
      [
        ['element', 'a'],
        ['relationship', 'r'],
        ['view node', 'sa'],
        ['connection', 'ok'],
        ['folder', 'f'],
      ],
    ],
  ] as const) {
    describe(reader, () => {
      for (const [noun, id] of levels) {
        it(`reports an unknown attribute and an unknown child on a ${noun}`, () => {
          expect(unread(result())).toEqual(
            expect.arrayContaining([
              {
                subject: id,
                message: `1 ${noun} (${id}) carries the attribute “stray”, which Archipelago does not read. It was not imported.`,
              },
              {
                subject: id,
                message: `1 ${noun} (${id}) carries <stray>, which Archipelago does not read. It was not imported.`,
              },
            ]),
          )
        })
      }

      it('reports nothing else: what it ignores on purpose is not reported', () => {
        // Present first, so the absence below is not a page that never loaded.
        expect(result().ok).toBe(true)
        expect(unread(result())).toHaveLength(10)
      })
    })
  }
})

/** Every checked-in model file, so a fixture added later is covered without a line here. */
const FILES = import.meta.glob<string>(['./fixtures/*.{xml,archimate}', './demo/*.xml'], {
  query: '?raw',
  import: 'default',
  eager: true,
})

describe('the checked-in files hold nothing the readers leave unread (#101)', () => {
  it('finds both formats, in both folders', () => {
    expect(Object.keys(FILES)).toEqual(
      expect.arrayContaining([
        './fixtures/archi-coverage.archimate',
        './fixtures/archi-coverage.xml',
        './demo/archisurance.xml',
      ]),
    )
  })
  for (const [path, text] of Object.entries(FILES)) {
    it(path, () => {
      const result = path.endsWith('.archimate') ? importArchimate(text) : importExchangeXml(text)
      expect(result.ok).toBe(true)
      expect(unread(result)).toEqual([])
    })
  }
})

describe('marking is not reading (#101: the nearest bypass)', () => {
  it('reports a key the reader looked at and did not mark', () => {
    const raw = { '@id': 'x', '@kept': 'yes', '@peeked': 'no' }
    const ledger = new Ledger()
    // Read both; only one lands anywhere.
    expect(raw['@kept']).toBe('yes')
    expect(raw['@peeked']).toBe('no')
    ledger.use(raw, '@id', '@kept')
    expect(
      ledger.unread(raw, 'x', { ignored: [], subjectOf: () => undefined }).map((u) => u.what),
    ).toEqual(['the attribute “peeked”'])
  })

  it('reports a definition the reader read and then discarded', () => {
    // A specialization with no name, and a property definition with no name:
    // each reader fetches the id, finds nothing to key it by, and moves on.
    const native = importArchimate(
      archi.replace(
        '</archimate:model>',
        '<profile id="p-nameless" conceptType="Goal"/></archimate:model>',
      ),
    )
    expect(unread(native)).toContainEqual({
      subject: 'p-nameless',
      message: expect.stringMatching(/^1 specialization \(p-nameless\) carries the attribute “id”/),
    })
    const xml = importExchangeXml(
      exchange.replace(
        '<organizations>',
        '<propertyDefinitions><propertyDefinition identifier="pd-nameless" type="string"/></propertyDefinitions><organizations>',
      ),
    )
    expect(unread(xml)).toContainEqual({
      subject: 'pd-nameless',
      message: expect.stringMatching(
        /^1 property definition \(pd-nameless\) carries the attribute “identifier”/,
      ),
    })
  })

  it('checks under a key it marked: reading a shape’s bounds is not reading all of them', () => {
    const result = importArchimate(
      archi.replace('width="120" height="55"/>', 'width="120" height="55" depth="9"/>'),
    )
    expect(unread(result)).toContainEqual({
      subject: 'sa',
      message: expect.stringMatching(/^1 shape’s bounds \(sa\) carries the attribute “depth”/),
    })
  })
})

describe('the losses the ledger found in files the readers already took', () => {
  it('reports a second language, which a reader that takes the first one drops', () => {
    const result = importExchangeXml(
      exchange.replace(
        '<name xml:lang="en">A</name>',
        '<name xml:lang="en">A</name><name xml:lang="de">A-de</name>',
      ),
    )
    expect(unread(result)).toContainEqual({
      subject: 'a',
      message: expect.stringMatching(/^1 element \(a\) carries a second <name>/),
    })
  })

  it('reports an exchange property with no value, and a root group’s documentation', () => {
    const result = importExchangeXml(
      exchange
        .replace(
          '<organizations>',
          '<propertyDefinitions><propertyDefinition identifier="pd-k" type="string"><name xml:lang="en">k</name></propertyDefinition></propertyDefinitions><organizations>',
        )
        .replace(
          '<name xml:lang="en">B</name>',
          '<name xml:lang="en">B</name><properties><property propertyDefinitionRef="pd-k"/></properties>',
        )
        .replace(
          '<label xml:lang="en">Business</label>',
          '<label xml:lang="en">Business</label><documentation xml:lang="en">Lost</documentation>',
        ),
    )
    expect(unread(result)).toEqual(
      expect.arrayContaining([
        {
          subject: 'b',
          message: expect.stringMatching(
            /^1 element \(b\) carries a property with no <value> \(“k”\)/,
          ),
        },
        { subject: undefined, message: expect.stringMatching(/^1 folder carries <documentation>/) },
      ]),
    )
  })

  it('reports Archi model metadata and a specialization no imported concept uses', () => {
    const result = importArchimate(
      archi.replace(
        '</archimate:model>',
        '<metadata><entry key="k" value="v"/></metadata><profile name="Unused" id="p-unused" conceptType="Goal"/></archimate:model>',
      ),
    )
    expect(unread(result)).toEqual(
      expect.arrayContaining([
        { subject: 'm', message: expect.stringMatching(/^The model carries <metadata>/) },
        {
          subject: 'm',
          message: expect.stringMatching(
            /^The model carries an unused specialization \(“Unused”\)/,
          ),
        },
      ]),
    )
  })

  it('reports text where a reader expects an element: bounds written as words are not a position', () => {
    const result = importArchimate(
      archi.replace('<bounds x="0" y="0" width="120" height="55"/>', '<bounds>left, top</bounds>'),
    )
    expect(unread(result)).toContainEqual({
      subject: 'sa',
      message: expect.stringMatching(/^1 shape \(sa\) carries text in <bounds>/),
    })
  })

  it('ignores only where the reason holds: a version on an element is not the file’s version', () => {
    const result = importArchimate(archi.replace('name="B" id="b"', 'name="B" id="b" version="2"'))
    expect(unread(result)).toContainEqual({
      subject: 'b',
      message: expect.stringMatching(/^1 element \(b\) carries the attribute “version”/),
    })
  })

  it('reports nothing for what it skipped, and still checks what it kept inside it', () => {
    const result = importArchimate(
      archi.replace(
        '<child xsi:type="archimate:DiagramObject" id="sb"',
        `<child xsi:type="archimate:DiagramModelImage" id="img" ${STRAY}><bounds x="0" y="100" width="50" height="50"/>
          <child xsi:type="archimate:Note" id="inner" ${STRAY}><bounds x="0" y="0" width="10" height="10"/></child>
        </child>
        <child xsi:type="archimate:DiagramObject" id="sb"`,
      ),
    )
    const messages = unread(result).map((u) => u.message)
    expect(messages).toContainEqual(
      expect.stringMatching(/^2 shapes \(sa, inner\) carry the attribute “stray”/),
    )
    expect(messages.join('\n')).not.toContain('img')
  })
})
