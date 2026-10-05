import { describe, expect, it } from 'vitest'
import coverage from './fixtures/archi-coverage.archimate?raw'
import claims from './fixtures/claims-platform.archimate?raw'
import attributes from './fixtures/relationship-attributes.archimate?raw'

/**
 * A fixture that says it was saved by Archi must hold only what Archi writes
 * (CLAUDE.md). The rule was a line of text for #98, and #100's hand-written
 * fixture still hid three reader bugs behind it: Archi omits a plain line's
 * `xsi:type`, writes a bendpoint at 0, 0 as `<bendpoint/>`, and keeps `lineAlpha`
 * and `gradient` as features, never attributes. Re-saving with Archi 5.10 removed
 * every spelling below, so each one in a fixture is a hand edit Archi would not
 * have made. `scripts/fixtures/export-with-archi.sh` re-saves the fixtures.
 */

/** What Archi 5.10's serializer never writes, each seen removed by its re-save (#100). */
const NOT_ARCHIS: readonly { what: string; pattern: RegExp }[] = [
  { what: 'a bounds coordinate at its default 0', pattern: /<bounds\b[^>]*\s(?:x|y)=["']0["']/ },
  {
    what: 'a bounds size at its default -1',
    pattern: /<bounds\b[^>]*\s(?:width|height)=["']-1["']/,
  },
  {
    what: 'a bendpoint offset at its default 0',
    pattern: /<bendpoint\b[^>]*\s(?:startX|startY|endX|endY)=["']0["']/,
  },
  {
    what: 'a shape’s text alignment at its default, centre',
    pattern: /<child\b[^>]*\stextAlignment=["']2["']/,
  },
  {
    what: 'a shape’s text position at its default, top',
    pattern: /<child\b[^>]*\stextPosition=["']0["']/,
  },
  {
    what: 'a plain line’s xsi:type, which is the reference’s own type',
    pattern: /<sourceConnection\b[^>]*\sxsi:type=["']archimate:DiagramModelConnection["']/,
  },
  {
    what: 'lineAlpha or gradient as an attribute; Archi keeps them as <feature>s',
    pattern: /<child\b[^>]*\s(?:lineAlpha|gradient)=/,
  },
]

/**
 * Each spelling of `xml` that Archi would not have written, with its line. The
 * whole text is scanned, not line by line: a start tag wrapped over two lines is
 * still one tag.
 */
function notArchis(xml: string): string[] {
  const found: string[] = []
  for (const { what, pattern } of NOT_ARCHIS) {
    for (const match of xml.matchAll(new RegExp(pattern.source, 'g'))) {
      found.push(`line ${xml.slice(0, match.index).split('\n').length}: ${what}`)
    }
  }
  return found
}

describe('fixtures said to be saved by Archi hold only what Archi writes (#100)', () => {
  it.each([
    ['archi-coverage.archimate', coverage],
    ['claims-platform.archimate', claims],
    ['relationship-attributes.archimate', attributes],
  ])('%s', (_, xml) => {
    // Something Archi does write is there, so an empty or unread file cannot pass.
    expect(xml).toContain('xmlns:archimate="http://www.archimatetool.com/archimate"')
    expect(notArchis(xml)).toEqual([])
  })

  it('catches each hand edit #100’s re-save removed, whatever the attribute order or quotes', () => {
    const edits = [
      `<bounds x="40" y="0" width="120" height="55"/>`,
      `<bounds height='55' width='-1' x='40' y='40'/>`,
      `<bendpoint endX="80" startX="0"/>`,
      `<child xsi:type="archimate:Note" id="n" textAlignment="2">`,
      `<child id="o" textPosition='0' xsi:type="archimate:DiagramObject">`,
      `<sourceConnection id="l" xsi:type="archimate:DiagramModelConnection" source="a" target="b"/>`,
      `<child xsi:type="archimate:DiagramObject" id="o" lineAlpha="200">`,
      `<child id="o" gradient="1" xsi:type="archimate:DiagramObject">`,
      // A start tag wrapped over two lines is still one tag.
      `<bounds x="40"\n        width="-1" height="55"/>`,
    ]
    for (const edit of edits) expect(notArchis(edit), edit).toHaveLength(1)
  })

  it('leaves alone what Archi does write', () => {
    for (const written of [
      `<bounds x="40" y="40"/>`,
      `<bounds width="15" height="15"/>`,
      `<bendpoint/>`,
      `<bendpoint startX="100" endX="-100" endY="80"/>`,
      `<bendpoint startX="10" endY="20"/>`,
      `<child xsi:type="archimate:Note" id="n" textAlignment="1" textPosition="2">`,
      `<sourceConnection id="l" source="a" target="b"/>`,
      `<sourceConnection xsi:type="archimate:Connection" id="c" source="a" target="b"/>`,
      `<feature name="lineAlpha" value="200"/>`,
    ]) {
      expect(notArchis(written), written).toEqual([])
    }
  })
})
