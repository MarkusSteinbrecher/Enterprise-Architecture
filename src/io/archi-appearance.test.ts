import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import claimsNative from './fixtures/claims-platform.archimate?raw'
import editedXml from './fixtures/appearance-edited.xml?raw'
import archiSave from './fixtures/appearance-edited.archi.archimate?raw'
import archiSaveInput from './fixtures/appearance-edited.archi.archimate.input-sha256?raw'
import archiExport from './fixtures/appearance-edited.archi.xml?raw'
import { exportExchange, importExchangeXml } from './exchange-format'
import { importArchimate } from './archimate-native'
import type { Appearance, Workspace } from '@/model'
import { editedAppearance } from '@/test/edited-appearance'
import {
  ALPHA_PERCENT,
  CARRIED_ONLY,
  DEFAULT_FONT_NAME,
  DEFAULT_FONT_SIZE,
  NESTED_CONNECTION,
  NODE_LINE_WIDTH,
  compareViews,
  explainDifference,
  readArchiSave,
  type ViewDifference,
} from '@/test/view-oracle'

/**
 * The Archi oracle (#127) for appearance editing (#135): fills, fonts,
 * alignments and positions edited through the selection panel's operations,
 * resets, and the format painter, saved by Archipelago and opened by Archi
 * 5.10. `appearance-edited.archi.archimate` is Archi's own save of
 * `appearance-edited.xml`, made by `scripts/fixtures/archi-roundtrip.sh`.
 */

const STALE =
  'appearance-edited.xml is not what the writer now produces. Re-run scripts/fixtures/build-edited-appearance.ts and then archi-roundtrip.sh (see src/io/README.md).'
const UNSAVED =
  'appearance-edited.archi.archimate was not made from the appearance-edited.xml checked in. Re-run archi-roundtrip.sh (see src/io/README.md).'

const LANDSCAPE = 'v-landscape'

function appearanceIn(workspace: Workspace, id: string): Appearance | undefined {
  const view = workspace.views.find((v) => v.id === LANDSCAPE)!
  return [...view.nodes, ...view.connections].find((item) => item.id === id)?.appearance
}

function named(differences: (ViewDifference & { why: string | undefined })[]): string[] {
  return differences
    .filter((d) => d.field !== 'extra')
    .map((d) => `${d.drawing} ${d.field}: ${reason(d.why)}`)
    .sort()
}

describe('an edited appearance, saved by Archipelago and by Archi after it (#135)', () => {
  const ours = editedAppearance()
  const { workspace: archi, problems: readProblems } = readArchiSave(archiSave)
  const explained = compareViews(ours, archi).map((d) => ({
    ...d,
    why: explainDifference(d, ours, archi),
  }))

  it('holds the checked-in file to what the writer writes today', () => {
    const { xml, problems } = exportExchange(ours)
    expect(problems).toEqual([])
    expect(xml, STALE).toBe(editedXml)
  })

  it('reads its own file back as written: an underline both <style> and the copy say, once', () => {
    const back = importExchangeXml(editedXml)
    expect(back.problems).toEqual([])
    expect(editedXml).toContain('style="italic underline"')
    for (const id of ['o-portal', 'o-ai-portal', 'o-customer-hub', 'c-portal-engine']) {
      expect(appearanceIn(back.workspace!, id), id).toEqual(appearanceIn(ours, id))
    }
  })

  it('holds Archi’s save to the file it was made from', () => {
    const hash = createHash('sha256').update(editedXml, 'utf8').digest('hex')
    expect(archiSaveInput.trim(), UNSAVED).toBe(hash)
  })

  it('reads all of Archi’s save, so nothing in it is left out of the comparison', () => {
    expect(archi.views.length).toBeGreaterThan(0)
    expect(readProblems).toEqual([])
  })

  it('starts from a workspace the edits really changed, and only where they were made', () => {
    const unedited = importArchimate(claimsNative).workspace!
    const edits = compareViews(unedited, ours).map((d) => `${d.drawing} ${d.field}`)
    expect(edits.sort()).toEqual(
      [
        // Fills: three shapes in one command, and one with an alpha.
        'o-goal appearance.fillColor',
        'o-req appearance.fillColor',
        'o-rollout appearance.fillColor',
        'o-zurich appearance.fillColor',
        // Fonts.
        'o-portal appearance.fontName',
        'o-portal appearance.fontSize',
        'o-portal appearance.fontColor',
        'o-portal appearance.fontStyle',
        'o-ai-portal appearance.fontStyle',
        'o-as-claims appearance.fontSize',
        'o-as-claims appearance.fontStyle',
        'o-as-customer appearance.fontSize',
        'o-as-customer appearance.fontStyle',
        // Alignments and positions.
        'o-portal appearance.textAlignment',
        'o-customer-hub appearance.textAlignment',
        'o-as-claims appearance.textAlignment',
        'o-customer-hub appearance.textPosition',
        'o-do-customer appearance.textPosition',
        // A line.
        'c-portal-engine appearance.lineColor',
        'c-portal-engine appearance.lineWidth',
        'c-portal-engine appearance.fontColor',
        // Resets.
        'o-engine appearance.fillColor',
        'o-engine appearance.fontColor',
        'c-pay-ins appearance.lineColor',
        // Painted: the portal's look twice, an absence once, a line's look once.
        ...['fontName', 'fontSize', 'fontColor', 'fontStyle', 'textAlignment'].flatMap((f) => [
          `o-host appearance.${f}`,
          `o-do-claim appearance.${f}`,
        ]),
        'o-crm appearance.fillColor',
        'c-cust-as appearance.lineColor',
        'c-cust-as appearance.lineWidth',
        'c-cust-as appearance.fontColor',
      ].sort(),
    )
    // A reset and an absence painted leave no override at all, not an empty one.
    for (const id of ['c-pay-ins', 'o-crm']) {
      const view = ours.views.find((v) => v.id === LANDSCAPE)!
      const item = [...view.nodes, ...view.connections].find((i) => i.id === id)!
      expect(item, id).not.toHaveProperty('appearance')
    }
  })

  it('keeps every fill, font and line Archi can hold, as written', () => {
    // Ours first, so nothing below compares two absences.
    expect(appearanceIn(ours, 'o-goal')).toEqual({ fillColor: '#ffe9a8' })
    expect(appearanceIn(ours, 'o-zurich')).toEqual({ fillColor: '#33669980' })
    expect(appearanceIn(ours, 'c-portal-engine')).toEqual({
      fontColor: '#8c1e5a',
      lineColor: '#8c1e5a',
      lineWidth: 3,
    })
    for (const id of ['o-goal', 'o-req', 'o-rollout', 'o-zurich']) {
      expect(appearanceIn(archi, id), id).toEqual(appearanceIn(ours, id))
    }
    const font = ({ fontName, fontSize, fontColor }: Appearance = {}) => ({
      fontName,
      fontSize,
      fontColor,
    })
    expect(font(appearanceIn(ours, 'o-portal'))).toEqual({
      fontName: 'Georgia',
      fontSize: 14,
      fontColor: '#5a1e8c',
    })
    for (const id of ['o-portal', 'o-host', 'o-do-claim']) {
      expect(font(appearanceIn(archi, id)), id).toEqual(font(appearanceIn(ours, 'o-portal')))
    }
    for (const id of ['c-portal-engine', 'c-cust-as']) {
      const { lineColor, lineWidth, fontColor } = appearanceIn(archi, id) ?? {}
      expect({ lineColor, lineWidth, fontColor }, id).toEqual(appearanceIn(ours, 'c-portal-engine'))
    }
    // What was reset, and what was painted with an absence, Archi has no override for.
    expect(appearanceIn(archi, 'c-pay-ins')).toBeUndefined()
    expect(appearanceIn(archi, 'o-crm')).toBeUndefined()
    expect(appearanceIn(archi, 'o-engine')).not.toHaveProperty('fillColor')
  })

  it('finds every drawing in Archi’s save, and nothing Archi did not explain', () => {
    expect(explained.filter((d) => d.why === undefined)).toEqual([])
  })

  it('names each difference Archi accounts for, and only those', () => {
    expect(named(explained)).toEqual(
      [
        // Alignments, positions, underline and strikethrough: carried, not drawn by Archi.
        'o-portal appearance.textAlignment: carried only',
        'o-portal appearance.fontStyle: carried only',
        'o-host appearance.textAlignment: carried only',
        'o-host appearance.fontStyle: carried only',
        'o-do-claim appearance.textAlignment: carried only',
        'o-do-claim appearance.fontStyle: carried only',
        'o-customer-hub appearance.textAlignment: carried only',
        'o-customer-hub appearance.textPosition: carried only',
        'o-as-claims appearance.textAlignment: carried only',
        'o-do-customer appearance.textPosition: carried only',
        'o-ai-portal appearance.fontStyle: carried only',
        // Groups, notes and a process the claims model already aligned (#108).
        'o-g-business appearance.textAlignment: carried only',
        'o-g-apps appearance.textAlignment: carried only',
        'o-g-platform appearance.textAlignment: carried only',
        'o-handle appearance.textAlignment: carried only',
        'o-note-biz appearance.textAlignment: carried only',
        'o-note-ref appearance.textAlignment: carried only',
        // A size and style with no name, and a line's colour with no font at all.
        'o-as-claims appearance.fontName: default font name',
        'o-as-customer appearance.fontName: default font name',
        'c-portal-engine appearance.fontName: default font name',
        'c-portal-engine appearance.fontSize: default font size',
        'c-cust-as appearance.fontName: default font name',
        'c-cust-as appearance.fontSize: default font size',
        // The engine's line width, from the claims model, kept through its resets.
        'o-engine appearance.lineWidth: no shape line width',
      ].sort(),
    )
    expect(
      explained.filter((d) => d.field === 'extra').every((d) => d.why === NESTED_CONNECTION),
    ).toBe(true)
  })
})

describe('the edited appearance back in Archipelago, after Archi saved it (#135)', () => {
  // Archi keeps archipelago.style: read with it, Archi's save gives back what
  // Archi cannot draw, so a model that went through Archi loses none of it.
  const ours = editedAppearance()
  const reopened = importArchimate(archiSave)
  const back = reopened.workspace!
  const explained = compareViews(ours, back).map((d) => ({
    ...d,
    why: explainDifference(d, ours, back),
  }))

  it('reads all of it', () => {
    expect(reopened.problems).toEqual([])
  })

  it('keeps every alignment, position, underline and strikethrough', () => {
    for (const id of ['o-portal', 'o-host', 'o-do-claim', 'o-customer-hub', 'o-ai-portal']) {
      expect(appearanceIn(ours, id), id).toBeDefined()
      expect(appearanceIn(back, id), id).toEqual(appearanceIn(ours, id))
    }
    expect(appearanceIn(back, 'o-portal')?.fontStyle).toEqual(['italic', 'underline'])
    expect(appearanceIn(back, 'o-customer-hub')).toMatchObject({
      textAlignment: 'left',
      textPosition: 'bottom',
    })
  })

  it('differs only where Archi’s import itself changed something', () => {
    expect(named(explained)).toEqual(
      [
        'o-as-claims appearance.fontName: default font name',
        'o-as-customer appearance.fontName: default font name',
        'c-portal-engine appearance.fontName: default font name',
        'c-portal-engine appearance.fontSize: default font size',
        'c-cust-as appearance.fontName: default font name',
        'c-cust-as appearance.fontSize: default font size',
        'o-engine appearance.lineWidth: no shape line width',
      ].sort(),
    )
    expect(explained.filter((d) => d.why === undefined)).toEqual([])
  })
})

describe('Archi’s export of the edited appearance, read by the exchange reader (#138)', () => {
  const imported = importExchangeXml(archiExport)
  const exported = imported.workspace!
  const { workspace: saved } = readArchiSave(archiSave)
  const explained = compareViews(exported, saved).map((d) => ({
    ...d,
    why: explainDifference(d, exported, saved),
  }))

  it('reads all of it, and draws what Archi’s save draws, apart from Archi’s reasons', () => {
    expect(exported.views.length).toBeGreaterThan(0)
    expect(imported.problems).toEqual([])
    expect(explained.filter((d) => d.why === undefined)).toEqual([])
  })

  it('keeps the underline Archi dropped, from the copy Archi kept', () => {
    expect(archiExport).toContain('"underline":true')
    expect(appearanceIn(exported, 'o-portal')?.fontStyle).toEqual(['italic', 'underline'])
  })
})

function reason(why: string | undefined): string {
  switch (why) {
    case CARRIED_ONLY:
      return 'carried only'
    case NODE_LINE_WIDTH:
      return 'no shape line width'
    case DEFAULT_FONT_NAME:
      return 'default font name'
    case DEFAULT_FONT_SIZE:
      return 'default font size'
    case ALPHA_PERCENT:
      return 'alpha as a percent'
    case NESTED_CONNECTION:
      return 'nested connection'
    default:
      return 'UNEXPLAINED'
  }
}
