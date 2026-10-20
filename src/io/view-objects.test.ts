import { describe, expect, it } from 'vitest'
import viewObjects from './fixtures/view-objects.archimate?raw'
import { importArchimate } from './archimate-native'
import { fromCanonicalJson, toCanonicalJson } from './canonical-json'
import { exportExchange, importExchangeXml } from './exchange-format'
import { legendFeatureValue, parseLegendFeature } from './legend-feature'
import type { ImportResult } from './problems'
import { DEFAULT_LEGEND_OPTIONS, type LegendNode, type View, type Workspace } from '@/model'

/**
 * Notes, groups, view references and legends through every reader and writer
 * (#134). `view-objects.archimate` is Archi 5.10's own save of a model holding
 * one of each, and two legends: one at Archi's default options, one at others.
 * Variants of it are made here by replacing what one test is about, so every
 * other byte is still Archi's.
 */

function workspaceOf(result: ImportResult): Workspace {
  if (!result.workspace) throw new Error(JSON.stringify(result.problems))
  return result.workspace
}

const codes = (result: ImportResult) => result.problems.map((p) => p.code)
const view = (workspace: Workspace, id: string): View => workspace.views.find((v) => v.id === id)!
const node = (workspace: Workspace, viewId: string, id: string) =>
  view(workspace, viewId).nodes.find((n) => n.id === id)

/** The fixture with `from` replaced, failing loudly if it is not there. */
function variant(from: string, to: string): string {
  if (!viewObjects.includes(from)) throw new Error(`not in the fixture: ${from}`)
  return viewObjects.replace(from, to)
}

const DEFAULT_FEATURE = 'display=15,rows=15,offset=0,color=1,sort=1'
const OTHER_FEATURE = 'display=5,rows=3,offset=20,color=0,sort=0'

describe('Archi’s legend feature (#134)', () => {
  it('reads and writes Archi’s spelling, field for field', () => {
    expect(legendFeatureValue(DEFAULT_LEGEND_OPTIONS)).toBe(DEFAULT_FEATURE)
    const other = parseLegendFeature(OTHER_FEATURE)
    expect(other).toEqual({
      asWritten: true,
      options: {
        elements: true,
        relations: false,
        specializedElements: true,
        specializedRelations: false,
        rowsPerColumn: 3,
        widthOffset: 20,
        colours: 'none',
        sort: 'name',
      },
    })
    expect(legendFeatureValue(other.options)).toBe(OTHER_FEATURE)
  })

  it('reads as Archi’s regular expressions do: anywhere, with spaces, defaults where it finds none', () => {
    // `Matcher.find` is unanchored, and `\s*` allows spaces after the `=`.
    const { options, asWritten } = parseLegendFeature('sort= 0, xrows=4')
    expect(options).toMatchObject({ sort: 'name', rowsPerColumn: 4, colours: 'core' })
    expect(options.elements && options.relations).toBe(true)
    expect(asWritten).toBe(false)
  })

  it('clamps what is out of Archi’s bounds, and takes the default past Java’s int', () => {
    const { options, asWritten } = parseLegendFeature(
      'display=15,rows=0,offset=999,color=7,sort=-1',
    )
    expect(options).toMatchObject({
      rowsPerColumn: 1,
      widthOffset: 200,
      colours: 'user',
      sort: 'name',
    })
    expect(asWritten).toBe(false)
    expect(
      parseLegendFeature('display=15,rows=99999999999,offset=0,color=1,sort=1').options,
    ).toMatchObject({ rowsPerColumn: 15 })
  })

  it('takes every display bit Archi defines and ignores the rest', () => {
    const { options, asWritten } = parseLegendFeature('display=18,rows=15,offset=0,color=1,sort=1')
    expect(options).toMatchObject({
      elements: false,
      relations: true,
      specializedElements: false,
      specializedRelations: false,
    })
    expect(asWritten).toBe(false)
  })
})

describe('Archi’s save of notes, groups, references and legends (#134)', () => {
  const result = importArchimate(viewObjects, 'view-objects.archimate')
  const workspace = workspaceOf(result)

  it('reads all of it: no content-unread, no skipped feature, no problem at all', () => {
    expect(result.problems).toEqual([])
  })

  it('keeps each legend, its name and its options', () => {
    expect(node(workspace, 'v-main', 'o-legend')).toEqual({
      id: 'o-legend',
      kind: 'legend',
      name: 'Legend',
      options: DEFAULT_LEGEND_OPTIONS,
      bounds: { x: 480, y: 24, width: 200, height: 120 },
      appearance: { textAlignment: 'left' },
    })
    expect((node(workspace, 'v-detail', 'o-detail-legend') as LegendNode).options).toEqual(
      parseLegendFeature(OTHER_FEATURE).options,
    )
  })

  it('keeps the note’s lines, the group’s documentation and the view reference', () => {
    expect(node(workspace, 'v-main', 'o-note')).toMatchObject({
      kind: 'note',
      text: 'First line\nSecond line',
    })
    expect(node(workspace, 'v-main', 'o-group')).toMatchObject({
      kind: 'group',
      name: 'Front office',
      documentation: 'Everything the customer touches.',
    })
    expect(node(workspace, 'v-main', 'o-ref')).toMatchObject({ kind: 'view-ref', view: 'v-detail' })
  })

  it('reports text on a legend, which Archi keeps and this model cannot hold', () => {
    const text = importArchimate(
      variant(
        `<feature name="legend" value="${DEFAULT_FEATURE}"/>`,
        `<feature name="legend" value="${DEFAULT_FEATURE}"/>\n        <content>Typed by hand</content>`,
      ),
    )
    expect(node(workspaceOf(text), 'v-main', 'o-legend')).toMatchObject({ kind: 'legend' })
    expect(text.problems).toHaveLength(1)
    expect(text.problems[0]).toMatchObject({ code: 'archimate.view-content-skipped' })
    expect(text.problems[0]!.message).toContain('text on a legend (1)')
  })

  it('reads options Archi would not write as Archi reads them, and says so', () => {
    const odd = importArchimate(variant(DEFAULT_FEATURE, 'display=15,rows=abc'))
    expect((node(workspaceOf(odd), 'v-main', 'o-legend') as LegendNode).options).toEqual(
      DEFAULT_LEGEND_OPTIONS,
    )
    expect(codes(odd)).toEqual(['archimate.legend-options-malformed'])
    expect(odd.problems[0]!.message).toMatch(/^1 legend holds options/)
  })

  it('reads a legend feature with no value as Archi’s defaults, and says so', () => {
    const empty = importArchimate(
      variant(`<feature name="legend" value="${DEFAULT_FEATURE}"/>`, '<feature name="legend"/>'),
    )
    expect((node(workspaceOf(empty), 'v-main', 'o-legend') as LegendNode).options).toEqual(
      DEFAULT_LEGEND_OPTIONS,
    )
    expect(codes(empty)).toEqual(['archimate.legend-options-malformed'])
  })

  it('reads the first legend feature, as Archi does, and reports a second', () => {
    const twice = importArchimate(
      variant(
        `<feature name="legend" value="${DEFAULT_FEATURE}"/>`,
        `<feature name="legend" value="${DEFAULT_FEATURE}"/>\n        <feature name="legend" value="${OTHER_FEATURE}"/>`,
      ),
    )
    expect((node(workspaceOf(twice), 'v-main', 'o-legend') as LegendNode).options).toEqual(
      DEFAULT_LEGEND_OPTIONS,
    )
    expect(codes(twice)).toEqual(['archimate.view-content-skipped'])
    expect(twice.problems[0]!.message).toContain('the feature “legend” on a legend (1)')
  })

  it('still reports a name on a plain note, which holds none here', () => {
    const named = importArchimate(
      variant(
        '<child xsi:type="archimate:Note" id="o-note" textAlignment="1">',
        '<child xsi:type="archimate:Note" id="o-note" name="Named" textAlignment="1">',
      ),
    )
    expect(codes(named)).toEqual(['import.content-unread'])
    expect(named.problems[0]!.message).toContain('o-note')
  })
})

/** The detail view in a parsed canonical file, whose views are in id order. */
interface RawNode {
  id: string
  options?: unknown
}
const detailOf = (raw: { views: { id: string; nodes: RawNode[] }[] }) =>
  raw.views.find((v) => v.id === 'v-detail')!

describe('legends in canonical JSON (#134)', () => {
  const workspace = workspaceOf(importArchimate(viewObjects))

  it('round-trips byte for byte, every option written', () => {
    const json = toCanonicalJson(workspace)
    const back = fromCanonicalJson(json)
    expect(back.problems).toEqual([])
    expect(toCanonicalJson(workspaceOf(back))).toBe(json)
    expect(node(workspaceOf(back), 'v-detail', 'o-detail-legend')).toEqual(
      node(workspace, 'v-detail', 'o-detail-legend'),
    )
    const written = detailOf(JSON.parse(json)).nodes.find((n) => n.id === 'o-detail-legend')!
    expect(Object.keys(written.options as object).sort()).toEqual(
      Object.keys(DEFAULT_LEGEND_OPTIONS).sort(),
    )
  })

  /** The canonical file with the detail legend's options replaced by `options`. */
  function withOptions(options: unknown) {
    const raw = JSON.parse(toCanonicalJson(workspace))
    detailOf(raw).nodes.find((n) => n.id === 'o-detail-legend')!.options = options
    const result = fromCanonicalJson(JSON.stringify(raw))
    return {
      result,
      options: (node(workspaceOf(result), 'v-detail', 'o-detail-legend') as LegendNode).options,
    }
  }

  it('takes Archi’s default for an option it cannot read, clamps one out of bounds, and names both', () => {
    const { result, options } = withOptions({
      ...parseLegendFeature(OTHER_FEATURE).options,
      relations: 'no',
      rowsPerColumn: 500,
      sort: 'size',
      extra: 1,
    })
    expect(options).toMatchObject({ relations: true, rowsPerColumn: 100, sort: 'category' })
    expect(options).toMatchObject({ widthOffset: 20, colours: 'none' })
    expect(codes(result)).toEqual(['json.invalid-legend-options'])
    expect(result.problems[0]!.message).toContain('relations, rowsPerColumn, sort, extra')
  })

  it('takes a fractional count, a missing option and missing options as Archi’s defaults, and says so', () => {
    const fraction = withOptions({
      ...DEFAULT_LEGEND_OPTIONS,
      widthOffset: 2.5,
      colours: undefined,
    })
    expect(fraction.options).toEqual(DEFAULT_LEGEND_OPTIONS)
    expect(fraction.result.problems[0]!.message).toContain('widthOffset, colours')
    const none = withOptions(undefined)
    expect(none.options).toEqual(DEFAULT_LEGEND_OPTIONS)
    expect(codes(none.result)).toEqual(['json.invalid-legend-options'])
  })
})

describe('legends in the exchange format (#134)', () => {
  const workspace = workspaceOf(importArchimate(viewObjects))
  const { xml, problems } = exportExchange(workspace)

  it('writes a legend as Archi’s export does, an empty label, and says what other tools will see', () => {
    expect(problems.map((p) => p.code)).toEqual([
      'exchange.legend-carried',
      'exchange.legend-carried',
    ])
    expect(problems[0]!.message).toContain('open its legend as an empty note')
    const legend = /<node identifier="o-legend"[^>]*>([\s\S]*?)<\/node>/.exec(xml)![0]
    expect(legend).toContain('xsi:type="Label"')
    expect(legend).not.toContain('<label')
    expect(xml).toContain(`"legend":"${DEFAULT_FEATURE}"`)
  })

  it('reads its own file back with every legend, note, group and reference as it was', () => {
    const back = importExchangeXml(xml)
    expect(back.problems).toEqual([])
    for (const id of ['v-main', 'v-detail']) {
      expect(view(workspaceOf(back), id).nodes).toEqual(view(workspace, id).nodes)
    }
  })

  /** Our file with the main legend's label text, or its carried entry, changed. */
  function readBack(from: string, to: string) {
    if (!xml.includes(from)) throw new Error(`not in the export: ${from}`)
    const result = importExchangeXml(xml.replace(from, to))
    return { result, legend: node(workspaceOf(result), 'v-main', 'o-legend') }
  }

  it('keeps a note that another tool gave text as a note, and reports the entry it could not apply', () => {
    const { result, legend } = readBack(
      /<node identifier="o-legend"[^>]*>/.exec(xml)![0],
      `${/<node identifier="o-legend"[^>]*>/.exec(xml)![0]}<label xml:lang="en">Typed in Archi</label>`,
    )
    expect(legend).toMatchObject({ kind: 'note', text: 'Typed in Archi' })
    expect(codes(result)).toEqual(['exchange.carried-unreadable'])
  })

  it('fails closed on a carried legend it would not write: the shape stays a note, and says so', () => {
    const odd = readBack(`"legend":"${DEFAULT_FEATURE}"`, '"legend":"display=15"')
    expect(odd.legend).toMatchObject({ kind: 'note', text: '' })
    expect(codes(odd.result)).toEqual(['exchange.carried-unreadable'])
    const notText = readBack(`"legend":"${DEFAULT_FEATURE}"`, '"legend":15')
    expect(notText.legend).toMatchObject({ kind: 'note' })
    expect(codes(notText.result)).toEqual(['exchange.carried-unreadable'])
    const badName = readBack('"name":"Legend"', '"name":7')
    expect(badName.legend).toMatchObject({ kind: 'note' })
    expect(codes(badName.result)).toEqual(['exchange.carried-unreadable'])
  })
})
