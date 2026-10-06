import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import claimsNative from './fixtures/claims-platform.archimate?raw'
import editedXml from './fixtures/claims-edited.xml?raw'
import archiSave from './fixtures/claims-edited.archi.archimate?raw'
import archiSaveInput from './fixtures/claims-edited.archi.archimate.input-sha256?raw'
import { exportExchange } from './exchange-format'
import { importArchimate } from './archimate-native'
import { editedClaims } from '@/test/edited-claims'
import {
  ALPHA_PERCENT,
  CARRIED_ONLY,
  DEFAULT_FONT_NAME,
  NESTED_CONNECTION,
  NODE_LINE_WIDTH,
  compareViews,
  explainDifference,
  readArchiSave,
} from '@/test/view-oracle'

/**
 * The Archi oracle (#127, ADR 0008): an edited view that Archipelago saves must
 * open in Archi 5.10 as it was drawn. `claims-edited.archi.archimate` is Archi's
 * own save of `claims-edited.xml`, made by `scripts/fixtures/archi-roundtrip.sh`.
 */

const STALE =
  'claims-edited.xml is not what the writer now produces. Re-run scripts/fixtures/build-edited-claims.ts and then archi-roundtrip.sh (see src/io/README.md).'
const UNSAVED =
  'claims-edited.archi.archimate was not made from the claims-edited.xml checked in. Re-run archi-roundtrip.sh (see src/io/README.md).'

describe('an edited view, saved by Archipelago and by Archi after it (#127)', () => {
  const ours = editedClaims()
  const { workspace: archi, problems: readProblems } = readArchiSave(archiSave)
  const differences = compareViews(ours, archi)
  const explained = differences.map((d) => ({ ...d, why: explainDifference(d, ours, archi) }))

  it('holds the checked-in file to what the writer writes today', () => {
    const { xml, problems } = exportExchange(ours)
    expect(problems).toEqual([])
    expect(xml, STALE).toBe(editedXml)
  })

  it('holds Archi’s save to the file it was made from', () => {
    // A writer change that regenerates only the xml would otherwise leave the
    // oracle comparing against Archi's save of the file before it (#139 review).
    const hash = createHash('sha256').update(editedXml, 'utf8').digest('hex')
    expect(archiSaveInput.trim(), UNSAVED).toBe(hash)
  })

  it('reads all of Archi’s save, so nothing in it is left out of the comparison', () => {
    expect(archi.views.length).toBeGreaterThan(0)
    expect(readProblems).toEqual([])
  })

  it('starts from a workspace the edits really changed', () => {
    const unedited = importArchimate(claimsNative).workspace!
    const edits = compareViews(unedited, ours).map((d) => `${d.drawing} ${d.field}`)
    expect(edits).toEqual(
      expect.arrayContaining([
        'o-customer bounds',
        'o-claim-bo bounds',
        'o-k8s bounds',
        'o-calc bounds',
        'c-calc-pay bendpoints',
        'o-scanner parent',
        'o-do-claim parent',
        'o-do-claim bounds',
        'o-goal appearance.fillColor',
        'o-req appearance.fontSize',
        'o-rollout appearance.textAlignment',
        'o-note-ref missing',
        'o-fraud extra',
        'o-note-edited extra',
        'c-cust-as bendpoints',
        'c-info-ins bendpoints',
        'c-engine-claim bendpoints',
        'c-req-goal appearance.lineWidth',
        'c-note-ref missing',
        'c-fraud-valuate extra',
      ]),
    )
    // o-k8s grew to the left, and its children stayed where they were drawn (#128).
    expect(edits).not.toContain('o-runtime bounds')
    expect(edits).not.toContain('o-postgres bounds')
  })

  it('finds every drawing in Archi’s save, and nothing Archi did not explain', () => {
    const view = ours.views.find((v) => v.id === 'v-landscape')!
    const saved = archi.views.find((v) => v.id === 'v-landscape')!
    expect(saved.nodes.map((n) => n.id)).toEqual(
      expect.arrayContaining(view.nodes.map((n) => n.id)),
    )
    expect(saved.connections.map((c) => c.id)).toEqual(
      expect.arrayContaining(view.connections.map((c) => c.id)),
    )
    expect(explained.filter((d) => d.why === undefined)).toEqual([])
  })

  it('names each difference Archi accounts for, and only those', () => {
    const named = explained
      .filter((d) => d.field !== 'extra')
      .map((d) => `${d.drawing} ${d.field}: ${reason(d.why)}`)
    expect(named.sort()).toEqual(
      [
        'o-crm appearance.fillColor: alpha as a percent',
        'o-engine appearance.lineWidth: no shape line width',
        'o-g-apps appearance.textAlignment: carried only',
        'o-g-business appearance.textAlignment: carried only',
        'o-g-platform appearance.textAlignment: carried only',
        'o-handle appearance.textAlignment: carried only',
        'o-note-biz appearance.textAlignment: carried only',
        'o-note-edited appearance.textAlignment: carried only',
        'o-req appearance.fontName: default font name',
        'o-rollout appearance.fontStyle: carried only',
        'o-rollout appearance.textAlignment: carried only',
      ].sort(),
    )
    // Archi's ids for the connections it added are its own, so they are named by what they draw.
    const added = explained
      .filter((d) => d.field === 'extra')
      .map((d) => {
        const [kind, relationship, source, target] = JSON.parse(String(d.archi)) as string[]
        return `${kind} ${relationship} ${source} → ${target}: ${reason(d.why)}`
      })
    expect(added.sort()).toEqual(
      [
        'relationship r-engine-calc o-engine → o-calc: nested connection',
        'relationship r-engine-rules o-engine → o-rules: nested connection',
        'relationship r-handle-accept o-handle → o-accept: nested connection',
        'relationship r-handle-pay2 o-handle → o-pay: nested connection',
        'relationship r-handle-register o-handle → o-register: nested connection',
        'relationship r-handle-valuate o-handle → o-valuate: nested connection',
        'relationship r-k8s-pg o-k8s → o-postgres: nested connection',
        'relationship r-mf-cics o-mainframe → o-cics: nested connection',
      ].sort(),
    )
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
    case ALPHA_PERCENT:
      return 'alpha as a percent'
    case NESTED_CONNECTION:
      return 'nested connection'
    default:
      return 'UNEXPLAINED'
  }
}
