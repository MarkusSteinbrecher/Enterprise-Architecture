import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import claimsNative from './fixtures/claims-platform.archimate?raw'
import editedXml from './fixtures/claims-edited.xml?raw'
import archiSave from './fixtures/claims-edited.archi.archimate?raw'
import archiSaveInput from './fixtures/claims-edited.archi.archimate.input-sha256?raw'
import archiExport from './fixtures/claims-edited.archi.xml?raw'
import { exportExchange, importExchangeXml } from './exchange-format'
import { importArchimate } from './archimate-native'
import { absoluteBounds, childrenByParent, validate, type Bounds, type Workspace } from '@/model'
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

  it('keeps the documentation we wrote on a relationship and on the model (#95)', () => {
    const documented = (workspace: Workspace) =>
      workspace.relationships.find((r) => r.id === 'r-handle-register')?.documentation
    expect(documented(ours)).toBe('Every claim is registered before it is assessed.')
    expect(documented(archi)).toBe(documented(ours))
    // Archi reads the model's documentation as its purpose, which is where the
    // .archimate reader finds it.
    expect(ours.documentation).toMatch(/\S/)
    expect(archiSave).toContain(`<purpose>${ours.documentation}</purpose>`)
    expect(archi.documentation).toBe(ours.documentation)
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
        'v-scratch extra',
        'o-note-edited extra',
        'c-cust-as bendpoints',
        'c-info-ins bendpoints',
        'c-engine-claim bendpoints',
        'c-split-pay bendpoints',
        'c-crm-cust appearance.labelPosition',
        'c-req-goal appearance.lineWidth',
        'c-note-ref missing',
        'c-fraud-valuate extra',
        // Connected (#129): new relationships, a junction, a re-used relationship, a line.
        'c-hub-payment extra',
        'c-calc-customer extra',
        'c-rollout-req extra',
        'c-crm-req extra',
        'o-intake extra',
        'c-damage-intake extra',
        'c-intake-register extra',
        'c-intake-valuate extra',
        'c-claim-bo extra',
        'c-note-fraud extra',
        // Nested (#131): a shape moved into an element's shape, a new one placed in one.
        'o-host parent',
        'c-engine-host extra',
        'o-batch extra',
        'c-k8s-batch extra',
        // Arranged (#136): aligned, distributed, matched, and drawn in another order.
        'o-valuate bounds',
        'o-accept bounds',
        'o-as-payment bounds',
        'o-ai-portal bounds',
        'o-engine order',
        'o-g-platform order',
        'v-landscape order',
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

  it('keeps every relationship the connect menu made, and Archi’s rules reject none (#129)', () => {
    const made = [
      'r-hub-payment',
      'r-calc-customer',
      'r-rollout-req',
      'r-crm-req',
      'r-damage-intake',
      'r-intake-register',
      'r-intake-valuate',
    ]
    const ends = (w: Workspace, id: string) => {
      const r = w.relationships.find((x) => x.id === id)
      return r && `${r.type} ${r.source} → ${r.target}`
    }
    for (const id of made) expect(ends(archi, id), id).toBe(ends(ours, id))
    expect(new Set(made.map((id) => ends(ours, id)?.split(' ')[0])).size).toBe(5)
    // Re-used, not duplicated: one relationship from the data object to the business object.
    const claim = (w: Workspace) =>
      w.relationships.filter((r) => r.source === 'do-claim' && r.target === 'bo-claim')
    expect(claim(archi).map((r) => r.id)).toEqual(['r-claim-bo'])

    // Archi's command line cannot run its validator, so this is its check
    // (InvalidRelationsChecker → ArchimateModelUtils.isValidRelationship), as
    // validity.ts carries it: Archi's own matrix, and its junction rules.
    const invalid = (w: Workspace) =>
      validate(w).findings.filter((f) => f.code === 'relationship.invalid')
    expect(invalid(archi)).toEqual([])
    // It would see a junction joining two types, which no cell of the matrix shows.
    const mixed = {
      ...archi,
      relationships: archi.relationships.map((r) =>
        r.id === 'r-intake-valuate' ? { ...r, type: 'Flow' as const } : r,
      ),
    }
    expect(invalid(mixed).map((f) => f.subjectId)).toContain('r-intake-valuate')
  })

  it('keeps an aligned, distributed, matched and z-ordered view as it was arranged (#136)', () => {
    const order = (w: Workspace, parent: string | undefined) =>
      childrenByParent(w.views.find((v) => v.id === 'v-landscape')!)
        .get(parent)!
        .map((n) => n.id)
    // Ours first, so the comparison is not of two empty lists; then Archi's save, the same.
    const reordered: [string | undefined, string[]][] = [
      ['o-engine', ['o-host', 'o-calc', 'o-do-claim', 'o-rules']],
      ['o-k8s', ['o-runtime', 'o-batch', 'o-postgres']],
      ['o-g-platform', ['o-database', 'o-k8s', 'o-mainframe', 'o-backbone', 'o-hosting']],
    ]
    for (const [parent, ids] of reordered) {
      expect(order(ours, parent), parent).toEqual(ids)
      expect(order(archi, parent), parent).toEqual(ids)
    }
    expect(order(ours, undefined).slice(0, 3)).toEqual(['o-g-business', 'o-g-platform', 'o-g-apps'])
    expect(order(archi, undefined)).toEqual(order(ours, undefined))
    // And every drawing where the arrangement put it.
    const at = (w: Workspace, id: string) =>
      absoluteBounds(
        w.views.find((v) => v.id === 'v-landscape')!,
        id,
      )
    const placed: [string, Partial<Bounds>][] = [
      // In the process at (200, 150). Floored to the pixel, as draw2d floors: Accept's middle is at 52.5.
      ['o-valuate', { x: 200 + 407, y: 150 + 52 }],
      ['o-accept', { x: 200 + 213 }],
      ['o-as-payment', { width: 180 }],
      ['o-ai-portal', { height: 55 }],
    ]
    for (const [id, bounds] of placed) {
      expect(at(ours, id), id).toMatchObject(bounds)
      expect(at(archi, id), id).toEqual(at(ours, id))
    }
  })

  it('keeps what each nesting meant: the relationship chosen, its connection, and the nesting (#131)', () => {
    const ends = (w: Workspace, id: string) => {
      const r = w.relationships.find((x) => x.id === id)
      return r && `${r.type} ${r.source} → ${r.target}`
    }
    // Present in ours first, so the comparison is not of two absences.
    expect(ends(ours, 'r-engine-host')).toBe('Aggregation ac-engine → ac-host')
    expect(ends(ours, 'r-k8s-batch')).toBe('Composition n-k8s → ss-batch')
    for (const id of ['r-engine-host', 'r-k8s-batch'])
      expect(ends(archi, id), id).toBe(ends(ours, id))
    expect(archi.elements.find((e) => e.id === 'ss-batch')).toMatchObject({
      type: 'SystemSoftware',
      name: 'Claims Batch',
    })
    const saved = archi.views.find((v) => v.id === 'v-landscape')!
    const node = (id: string) => saved.nodes.find((n) => n.id === id)
    expect(node('o-host')?.parent).toBe('o-engine')
    expect(node('o-batch')?.parent).toBe('o-k8s')
    const drawing = (id: string) => saved.connections.find((c) => c.id === id)
    expect(drawing('c-engine-host')).toMatchObject({ source: 'o-engine', target: 'o-host' })
    expect(drawing('c-k8s-batch')).toMatchObject({ source: 'o-k8s', target: 'o-batch' })
  })

  it('keeps the lines a tree drop drew, one to each drawing of the other end (#145)', () => {
    const lines = (w: Workspace) =>
      w.views
        .find((v) => v.id === 'v-scratch')!
        .connections.filter((c) => c.target === 'o-s-rules')
        .map((c) => `${c.id} ${c.kind === 'relationship' ? c.relationship : 'line'} ${c.source}`)
        .sort()
    const drawn = [
      'c-s-engine-2-rules r-engine-rules o-s-engine-2',
      'c-s-engine-rules r-engine-rules o-s-engine',
    ]
    // Present in ours first, so the comparison is not of two absences.
    expect(lines(ours)).toEqual(drawn)
    expect(lines(archi)).toEqual(drawn)
  })

  it('keeps what the magic connector made: each new element, its relationship, and both drawings (#132)', () => {
    const ends = (w: Workspace, id: string) => {
      const r = w.relationships.find((x) => x.id === id)
      return r && `${r.type} ${r.source} → ${r.target}`
    }
    const kind = (w: Workspace, id: string) => {
      const e = w.elements.find((x) => x.id === id)
      return e && `${e.type} “${e.name}”`
    }
    const drawn = (w: Workspace, id: string) => {
      const c = w.views.find((v) => v.id === 'v-scratch')!.connections.find((x) => x.id === id)
      return c && `${c.kind === 'relationship' ? c.relationship : 'line'} ${c.source} → ${c.target}`
    }
    const at = (w: Workspace, id: string) =>
      w.views.find((v) => v.id === 'v-scratch')!.nodes.find((n) => n.id === id)?.bounds
    // Present in ours first, so the comparison is not of two absences.
    expect(kind(ours, 'bp-check-cover')).toBe('BusinessProcess “Check cover”')
    expect(kind(ours, 'j-serve')).toBe('Junction “”')
    expect(ends(ours, 'r-s-event-check')).toBe('Triggering be-claim-in → bp-check-cover')
    expect(ends(ours, 'r-s-intake-serve')).toBe('Serving as-intake → j-serve')
    expect(drawn(ours, 'c-s-event-check')).toBe('r-s-event-check o-s-event → o-s-check')
    expect(drawn(ours, 'c-s-intake-serve')).toBe('r-s-intake-serve o-s-intake → o-s-serve')
    expect(at(ours, 'o-s-check')).toMatchObject({ x: 760, y: 60 })
    expect(at(ours, 'o-s-serve')).toMatchObject({ x: 760, y: 300 })
    for (const id of ['bp-check-cover', 'j-serve']) expect(kind(archi, id), id).toBe(kind(ours, id))
    for (const id of ['r-s-event-check', 'r-s-intake-serve'])
      expect(ends(archi, id), id).toBe(ends(ours, id))
    for (const id of ['c-s-event-check', 'c-s-intake-serve'])
      expect(drawn(archi, id), id).toBe(drawn(ours, id))
    for (const id of ['o-s-check', 'o-s-serve']) expect(at(archi, id), id).toEqual(at(ours, id))
  })

  it('keeps what each paste drew: copies, the same elements again, and the nesting (#137)', () => {
    /** Each pasted shape as `parent: Type “name”`, the parent by id and the element by what it is. */
    const shapes = (w: Workspace, viewId: string, name: string) =>
      w.views
        .find((v) => v.id === viewId)!
        .nodes.filter((n) => n.id.startsWith(`${name}-node-`))
        .map((n) => {
          const e = n.kind === 'element' ? w.elements.find((x) => x.id === n.element) : undefined
          return `${n.id} in ${n.parent ?? 'the view'}: ${e ? `${e.id} ${e.type} “${e.name}”` : n.kind}`
        })
        .sort()
    const lines = (w: Workspace, viewId: string, name: string) =>
      w.views
        .find((v) => v.id === viewId)!
        .connections.filter((c) => c.id.startsWith(`${name}-conn-`))
        .map((c) => {
          const r =
            c.kind === 'relationship'
              ? w.relationships.find((x) => x.id === c.relationship)
              : undefined
          return `${c.source} → ${c.target}: ${r ? `${r.id} ${r.type} ${r.source} → ${r.target}` : c.kind}`
        })
        .sort()
    // Present in ours first, so the comparison is not of two absences.
    // Paste in the view the process is drawn in: copies, named as Archi names them.
    expect(shapes(ours, 'v-landscape', 'copy')).toEqual([
      'copy-node-1 in the view: copy-el-1 BusinessProcess “Handle Claim (copy)”',
      'copy-node-2 in copy-node-1: copy-el-2 BusinessProcess “Register (copy)”',
      'copy-node-3 in copy-node-1: copy-el-3 BusinessProcess “Accept (copy)”',
      'copy-node-4 in copy-node-1: copy-el-4 Junction “Junction (copy)”',
      'copy-node-5 in copy-node-1: copy-el-5 BusinessProcess “Valuate (copy)”',
      'copy-node-6 in copy-node-1: copy-el-6 BusinessProcess “Pay (copy)”',
    ])
    expect(lines(ours, 'v-landscape', 'copy')).toHaveLength(5)
    expect(lines(ours, 'v-landscape', 'copy')).toContain(
      'copy-node-2 → copy-node-3: copy-rel-1 Triggering copy-el-2 → copy-el-3',
    )
    // Paste Special in the same view: the goal and its requirement drawn again.
    expect(shapes(ours, 'v-landscape', 'special')).toEqual([
      'special-node-1 in the view: g-settle Goal “Settle claims within five days”',
      'special-node-2 in the view: r-rules Requirement “Assessment is rules-driven”',
    ])
    expect(lines(ours, 'v-landscape', 'special')).toEqual([
      'special-node-2 → special-node-1: r-req-goal Realization r-rules → g-settle',
    ])
    // Paste into a view that drew none of the cluster: drawn again, with what is
    // nested in it and the line the nesting hides. In the cluster's drawing order,
    // which the arrangement (#136) changed by sending Claims Batch backward.
    expect(shapes(ours, 'v-scratch', 'again')).toEqual([
      'again-node-1 in the view: n-k8s Node “Kubernetes Cluster”',
      'again-node-2 in again-node-1: ss-runtime SystemSoftware “Claims Runtime”',
      'again-node-3 in again-node-1: ss-batch SystemSoftware “Claims Batch”',
      'again-node-4 in again-node-1: ss-postgres SystemSoftware “PostgreSQL”',
    ])
    expect(lines(ours, 'v-scratch', 'again')).toEqual([
      'again-node-1 → again-node-2: r-k8s-runtime Composition n-k8s → ss-runtime',
      'again-node-1 → again-node-3: r-k8s-batch Composition n-k8s → ss-batch',
    ])
    for (const [viewId, name] of [
      ['v-landscape', 'copy'],
      ['v-landscape', 'special'],
      ['v-scratch', 'again'],
    ] as const) {
      expect(shapes(archi, viewId, name), name).toEqual(shapes(ours, viewId, name))
      expect(lines(archi, viewId, name), name).toEqual(lines(ours, viewId, name))
    }
  })

  it('keeps the bend-points the canvas added, moved and removed, as drawn (#133)', () => {
    const points = (w: Workspace, id: string) =>
      w.views.find((v) => v.id === 'v-landscape')!.connections.find((c) => c.id === id)?.bendpoints
    // Ours first, so the comparison is not of two absences: two added, rounded
    // to whole pixels; one of two removed; one moved; and one route straightened.
    expect(points(ours, 'c-cust-as')).toEqual([
      { x: 715, y: 470 },
      { x: 760, y: 471 },
    ])
    expect(points(ours, 'c-split-pay')).toEqual([{ x: 860, y: 270 }])
    expect(points(ours, 'c-engine-claim')).toEqual([{ x: 700, y: 455 }])
    expect(points(ours, 'c-info-ins')).toBeUndefined()
    for (const id of ['c-cust-as', 'c-split-pay', 'c-engine-claim', 'c-info-ins']) {
      expect(points(archi, id), id).toEqual(points(ours, id))
    }
  })

  it('names each difference Archi accounts for, and only those', () => {
    const named = explained
      .filter((d) => d.field !== 'extra')
      .map((d) => `${d.drawing} ${d.field}: ${reason(d.why)}`)
    expect(named.sort()).toEqual(
      [
        'c-crm-cust appearance.labelPosition: carried only',
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
        // The view made from scratch (#130): a new group, read as the others are.
        'o-s-group appearance.textAlignment: carried only',
        // Pasted (#137): each keeps the look of the shape it was copied from.
        'copy-node-1 appearance.textAlignment: carried only',
        'special-node-2 appearance.fontName: default font name',
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
        // Pasted (#137): the cluster drawn again, and Archi adds the same line for it.
        'relationship r-k8s-pg again-node-1 → again-node-4: nested connection',
      ].sort(),
    )
  })
})

describe('Archi’s export of the model it saved, read by the exchange reader (#138)', () => {
  // Archi made both files in one run: it imported claims-edited.xml, saved the
  // model and exported it again. Archi keeps archipelago.style, so its export
  // carries our literal markers beside the whole style Archi computes for every
  // object. Read through our two readers, the two files must draw the same.
  const imported = importExchangeXml(archiExport)
  const exported = imported.workspace!
  const { workspace: saved } = readArchiSave(archiSave)
  const explained = compareViews(exported, saved).map((d) => ({
    ...d,
    why: explainDifference(d, exported, saved),
  }))

  it('reads all of Archi’s export, so nothing in it is left out of the comparison', () => {
    expect(exported.views.length).toBeGreaterThan(0)
    expect(imported.problems).toEqual([])
  })

  it('keeps the overrides we wrote and none of the defaults Archi wrote beside them', () => {
    const landscape = exported.views.find((v) => v.id === 'v-landscape')!
    const appearance = (id: string) =>
      [...landscape.nodes, ...landscape.connections].find((item) => item.id === id)?.appearance
    // Present first: the comparison below is not of two absences.
    expect(appearance('o-crm')).toEqual({ fillColor: '#e0e0e0a1' })
    expect(appearance('o-goal')).toEqual({ fillColor: '#ffe9a8' })
    // 12 points is the platform font's size, kept because we wrote it.
    expect(appearance('o-req')).toEqual({
      fontColor: '#5a1e8c',
      fontSize: 12,
      fontStyle: ['bold'],
    })
    expect(appearance('c-pay-ins')).toEqual({ lineColor: '#7a7a7a' })
    expect(explained.filter((d) => d.why === undefined)).toEqual([])
  })

  it('names each difference Archi accounts for, and only those', () => {
    const named = explained
      .filter((d) => d.field !== 'extra')
      .map((d) => `${d.drawing} ${d.field}: ${reason(d.why)}`)
    expect(named.sort()).toEqual(
      [
        // Our export carries it; Archi's own save never drew it (#133).
        'c-crm-cust appearance.labelPosition: carried only',
        'o-g-apps appearance.textAlignment: carried only',
        'o-g-business appearance.textAlignment: carried only',
        'o-g-platform appearance.textAlignment: carried only',
        'o-handle appearance.textAlignment: carried only',
        'o-note-biz appearance.textAlignment: carried only',
        'o-note-edited appearance.textAlignment: carried only',
        'o-req appearance.fontName: default font name',
        'o-rollout appearance.fontStyle: carried only',
        'o-rollout appearance.textAlignment: carried only',
        'o-s-group appearance.textAlignment: carried only',
        // Pasted (#137): each keeps the look of the shape it was copied from.
        'copy-node-1 appearance.textAlignment: carried only',
        'special-node-2 appearance.fontName: default font name',
      ].sort(),
    )
    // Archi's export leaves out every connection between nested shapes
    // (XMLModelExporter.isNestedConnection), including ones we drew (see the README).
    const left = explained
      .filter((d) => d.field === 'extra')
      .map((d) => {
        const [, relationship] = JSON.parse(String(d.archi)) as string[]
        return `${relationship}: ${reason(d.why)}`
      })
    expect(left.sort()).toEqual(
      [
        'r-engine-calc: nested connection',
        'r-engine-claim: nested connection',
        'r-engine-host: nested connection',
        'r-engine-rules: nested connection',
        'r-handle-accept: nested connection',
        'r-handle-pay2: nested connection',
        'r-handle-register: nested connection',
        'r-handle-valuate: nested connection',
        'r-k8s-batch: nested connection',
        'r-k8s-pg: nested connection',
        'r-k8s-runtime: nested connection',
        'r-mf-cics: nested connection',
        // Pasted (#137): the cluster drawn again in the scratch view, nested as before.
        'r-k8s-batch: nested connection',
        'r-k8s-pg: nested connection',
        'r-k8s-runtime: nested connection',
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
