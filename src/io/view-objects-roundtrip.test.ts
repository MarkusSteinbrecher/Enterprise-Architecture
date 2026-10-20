import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import viewObjects from './fixtures/view-objects.archimate?raw'
import editedXml from './fixtures/view-objects-edited.xml?raw'
import archiSave from './fixtures/view-objects-edited.archi.archimate?raw'
import archiSaveInput from './fixtures/view-objects-edited.archi.archimate.input-sha256?raw'
import archiExport from './fixtures/view-objects-edited.archi.xml?raw'
import { importArchimate } from './archimate-native'
import { exportExchange, importExchangeXml } from './exchange-format'
import type { View, Workspace } from '@/model'
import { editedViewObjects } from '@/test/edited-view-objects'
import {
  CARRIED_ONLY,
  LEGEND_AS_NOTE,
  compareViews,
  explainDifference,
  readArchiSave,
} from '@/test/view-oracle'

/**
 * The Archi oracle (#127) for notes, groups, view references and legends
 * (#134): Archipelago writes them, Archi 5.10 imports and saves them
 * (`view-objects-edited.archi.archimate`) and exports them again
 * (`view-objects-edited.archi.xml`), all by `scripts/fixtures/archi-roundtrip.sh`.
 */

const STALE =
  'view-objects-edited.xml is not what the writer now produces. Re-run scripts/fixtures/build-edited-view-objects.ts and then archi-roundtrip.sh (see the script).'
const UNSAVED =
  'view-objects-edited.archi.archimate was not made from the view-objects-edited.xml checked in. Re-run archi-roundtrip.sh.'

const LEGENDS = ['o-legend', 'o-new-legend', 'o-detail-legend']

function workspaceOf(result: { workspace?: Workspace; problems: unknown[] }): Workspace {
  if (!result.workspace) throw new Error(JSON.stringify(result.problems))
  return result.workspace
}

const nodesOf = (workspace: Workspace, viewId: string): View['nodes'] =>
  workspace.views.find((v) => v.id === viewId)!.nodes

describe('notes, groups, view references and legends through Archi (#134)', () => {
  const ours = editedViewObjects()
  const { workspace: archi, problems: readProblems } = readArchiSave(archiSave)
  const differences = compareViews(ours, archi)
  const explained = differences.map((d) => ({ ...d, why: explainDifference(d, ours, archi) }))

  it('holds the checked-in file to what the writer writes today', () => {
    const { xml, problems } = exportExchange(ours)
    expect(problems.map((p) => p.code)).toEqual([
      'exchange.legend-carried',
      'exchange.legend-carried',
    ])
    expect(xml, STALE).toBe(editedXml)
  })

  it('holds Archi’s save to the file it was made from', () => {
    const hash = createHash('sha256').update(editedXml, 'utf8').digest('hex')
    expect(archiSaveInput.trim(), UNSAVED).toBe(hash)
  })

  it('starts from a workspace the edits really changed', () => {
    const unedited = workspaceOf(importArchimate(viewObjects))
    const edits = compareViews(unedited, ours).map((d) => `${d.drawing} ${d.field}`)
    expect(edits).toEqual(
      expect.arrayContaining([
        'o-note draws',
        'o-group draws',
        'o-new-note extra',
        'o-new-group extra',
        'o-new-note-in-group extra',
        'o-new-legend extra',
        'o-goal extra',
        'o-ref-main extra',
        'o-ref-detail-in-group extra',
        'c-note-legend extra',
      ]),
    )
  })

  it('reads all of Archi’s save, and finds nothing Archi’s own code does not explain', () => {
    expect(readProblems).toEqual([])
    expect(explained.filter((d) => d.why === undefined)).toEqual([])
    // What is explained: each legend, which Archi opens as a note, and the
    // alignment of shapes Archi was told none for.
    expect(new Set(explained.map((d) => d.why))).toEqual(new Set([LEGEND_AS_NOTE, CARRIED_ONLY]))
    expect(
      explained
        .filter((d) => d.why === LEGEND_AS_NOTE)
        .map((d) => d.drawing)
        .sort(),
    ).toEqual([...LEGENDS].sort())
  })

  it('keeps every note’s lines, every group’s name and documentation and every reference in Archi’s eyes', () => {
    const main = nodesOf(archi, 'v-main')
    const find = (id: string) => main.find((n) => n.id === id)
    expect(find('o-note')).toMatchObject({ kind: 'note', text: 'Edited\nthree\nlines' })
    expect(find('o-new-note')).toMatchObject({
      kind: 'note',
      text: 'A note made here,\non two lines',
    })
    expect(find('o-new-note-in-group')).toMatchObject({ kind: 'note', parent: 'o-new-group' })
    expect(find('o-group')).toMatchObject({
      kind: 'group',
      name: 'Front of house',
      documentation: 'Line one.\nLine two.',
    })
    expect(find('o-new-group')).toMatchObject({
      kind: 'group',
      name: 'Back office',
      documentation: 'Made in Archipelago.',
    })
    expect(find('o-ref-detail-in-group')).toMatchObject({
      kind: 'view-ref',
      view: 'v-detail',
      parent: 'o-new-group',
    })
    expect(nodesOf(archi, 'v-detail').find((n) => n.id === 'o-ref-main')).toMatchObject({
      kind: 'view-ref',
      view: 'v-main',
    })
  })

  /**
   * Archi's exchange import gives every note and group it makes the left
   * alignment its palette gives one (`ArchimateDiagramModelFactory.getNewObject`:
   * `provider.getDefaultTextAlignment()`), and writes it into its save. Left is
   * where Archipelago draws their text when it has none, so a shape we left at
   * our default comes back with it said out loud. That is the only difference allowed.
   */
  const SAID_OUT_LOUD = new Set(['note', 'group', 'legend'])
  const unlessSaidOutLoud = (back: Workspace) =>
    compareViews(ours, back).filter((d) => {
      const node = ours.views.flatMap((v) => v.nodes).find((n) => n.id === d.drawing)
      const outLoud =
        d.field === 'appearance.textAlignment' &&
        d.ours === undefined &&
        d.archi === 'left' &&
        node !== undefined &&
        SAID_OUT_LOUD.has(node.kind)
      return !outLoud
    })

  it('reads Archi’s save back with every legend a legend again, and every shape as we drew it', () => {
    const result = importArchimate(archiSave)
    expect(result.problems).toEqual([])
    const back = workspaceOf(result)
    expect(unlessSaidOutLoud(back)).toEqual([])
    expect(compareViews(ours, back).length).toBeGreaterThan(0)
    for (const id of LEGENDS) {
      const ourLegend = ours.views.flatMap((v) => v.nodes).find((n) => n.id === id)
      const legend = back.views.flatMap((v) => v.nodes).find((n) => n.id === id)
      expect(legend).toMatchObject({ kind: 'legend', name: 'Legend' })
      expect(legend).toMatchObject({ options: (ourLegend as { options: unknown }).options })
    }
  })

  it('keeps a legend Archi saved itself as Archi saved it, and reports a carried one that disagrees', () => {
    // Archi's save with its own legend feature on o-legend, as a legend made in
    // Archi carries one, beside the carried entry for the same shape.
    const shape = '<child xsi:type="archimate:Note" id="o-legend" textAlignment="1">'
    expect(archiSave).toContain(shape)
    const withFeature = (value: string) =>
      archiSave.replace(
        `${shape}\n        <bounds x="480" y="24" width="200" height="120"/>`,
        `<child xsi:type="archimate:Note" id="o-legend" name="Legend" textAlignment="1">\n        <bounds x="480" y="24" width="200" height="120"/>\n        <feature name="legend" value="${value}"/>`,
      )
    const same = importArchimate(withFeature('display=15,rows=15,offset=0,color=1,sort=1'))
    expect(same.problems).toEqual([])
    const other = importArchimate(withFeature('display=5,rows=3,offset=20,color=0,sort=0'))
    const legend = workspaceOf(other)
      .views.flatMap((v) => v.nodes)
      .find((n) => n.id === 'o-legend')
    expect(legend).toMatchObject({ kind: 'legend', options: { rowsPerColumn: 3, sort: 'name' } })
    expect(other.problems.map((p) => p.code)).toEqual(['exchange.carried-unreadable'])
  })

  it('reads Archi’s export of its save back as we drew it', () => {
    const result = importExchangeXml(archiExport)
    expect(result.problems).toEqual([])
    const back = workspaceOf(result)
    expect(compareViews(ours, back)).toEqual([])
    expect(back.views.flatMap((v) => v.nodes).filter((n) => n.kind === 'legend')).toHaveLength(3)
  })
})
