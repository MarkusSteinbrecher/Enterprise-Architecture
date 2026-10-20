import claimsArchimate from '@/io/fixtures/claims-platform.archimate?raw'
import { importArchimate } from '@/io/archimate-native'
import {
  colourFromInput,
  fontNameFromInput,
  fontSizeFromInput,
  lineWidthFromInput,
  paintFormat,
  pickUpFormat,
  resetAppearance,
  setAppearanceField,
  setFontStyle,
  type Appearance,
  type AppearanceField,
  type Drawing,
  type FontStyle,
  type Workspace,
} from '@/model'
import { ModelStore } from '@/store/model-store'

/**
 * The claims landscape after its appearance was edited (#135): the source of
 * `src/io/fixtures/appearance-edited.xml`, which Archi 5.10 imports and saves
 * as `appearance-edited.archi.archimate` (the oracle, #127). Every edit is one
 * command, made with the operations the selection panel and the format painter
 * commit, and every typed value passes the guard the panel puts it through.
 *
 * Its own fixture rather than more edits to `edited-claims.ts`, so the
 * appearance oracle does not move when another slice regenerates that one.
 *
 *   npx vite-node scripts/fixtures/build-edited-appearance.ts
 *   scripts/fixtures/archi-roundtrip.sh src/io/fixtures/appearance-edited.xml …
 */
export function editedAppearance(): Workspace {
  const imported = importArchimate(claimsArchimate).workspace
  if (!imported) throw new Error('claims-platform.archimate did not import')
  const store = new ModelStore(imported)
  const view = 'v-landscape'
  const isJunction = (id: string) => store.element(id)?.type === 'Junction'
  const drawing = (id: string): Drawing => {
    const v = store.view(view)!
    const found = v.nodes.find((n) => n.id === id) ?? v.connections.find((c) => c.id === id)
    if (!found) throw new Error(`no drawing ${id}`)
    return found
  }
  /** One field over a selection, as the panel commits it: one command. */
  const set = <K extends AppearanceField>(ids: string[], field: K, value: Appearance[K]) => {
    if (value === undefined) throw new Error(`the guard turned down the value for ${field}`)
    store.updateView(view, (v) => setAppearanceField(v, new Set(ids), field, value, isJunction))
  }
  const reset = (ids: string[], field: AppearanceField) =>
    store.updateView(view, (v) => setAppearanceField(v, new Set(ids), field, undefined, isJunction))
  const style = (ids: string[], fontStyle: FontStyle) =>
    store.updateView(view, (v) => setFontStyle(v, new Set(ids), fontStyle, true, isJunction))
  const paint = (from: string, to: string) => {
    const format = pickUpFormat(drawing(from), isJunction)
    if (!format) throw new Error(`the painter cannot pick up from ${from}`)
    store.updateView(view, (v) => paintFormat(v, to, format, isJunction))
  }

  // Fills: three shapes in one command, typed in capitals without the #; one
  // with an alpha.
  set(['o-goal', 'o-req', 'o-rollout'], 'fillColor', colourFromInput('FFE9A8'))
  set(['o-zurich'], 'fillColor', colourFromInput('#33669980'))

  // Fonts: a name, a size, a colour and every style the format can say, and
  // strikethrough, which only archipelago.style carries.
  set(['o-portal'], 'fontName', fontNameFromInput(' Georgia '))
  set(['o-portal'], 'fontSize', fontSizeFromInput('14'))
  set(['o-portal'], 'fontColor', colourFromInput('#5A1E8C'))
  style(['o-portal'], 'italic')
  style(['o-portal'], 'underline')
  style(['o-ai-portal'], 'strikethrough')
  // A size and a colour with no name: Archi names the font its default.
  set(['o-as-claims', 'o-as-customer'], 'fontSize', fontSizeFromInput('12'))
  style(['o-as-claims', 'o-as-customer'], 'bold')

  // Alignments and positions, which the exchange format has no place for.
  set(['o-portal', 'o-customer-hub'], 'textAlignment', 'left')
  set(['o-as-claims'], 'textAlignment', 'right')
  set(['o-customer-hub'], 'textPosition', 'bottom')
  set(['o-do-customer'], 'textPosition', 'middle')

  // Lines: a connection's colour and width, which Archi reads.
  set(['c-portal-engine'], 'lineColor', colourFromInput('#8c1e5a'))
  set(['c-portal-engine'], 'lineWidth', lineWidthFromInput('3'))
  set(['c-portal-engine'], 'fontColor', colourFromInput('#8c1e5a'))

  // Reset: the engine's fill and font colour go, its line colour and font stay;
  // and every override of a line, at once.
  reset(['o-engine'], 'fillColor')
  reset(['o-engine'], 'fontColor')
  store.updateView(view, (v) => resetAppearance(v, new Set(['c-pay-ins'])))

  // The format painter: the portal's look onto two shapes; a function that
  // overrides nothing onto the CRM, whose alpha fill goes; and a line's onto a line.
  paint('o-portal', 'o-host')
  paint('o-portal', 'o-do-claim')
  paint('o-rules', 'o-crm')
  paint('c-portal-engine', 'c-cust-as')

  return store.snapshot()
}
