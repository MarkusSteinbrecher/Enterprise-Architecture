import { fileURLToPath } from 'node:url'
import { test, expect, importWithNothingToReport, importWorkspaceFile, startEmpty } from './support'

/**
 * Journey 9 — an Archi model file opens in a real browser (#13).
 *
 * The fixture is a `.archimate` saved by Archi 5.10, imported through the
 * dialog as a user's file would be. Reading it is where `.archimate` support
 * differs from the exchange path: the file is sniffed by its content, and its
 * coordinates are relative, so a wrong offset puts nested shapes outside their
 * parents. The counts are hard-coded from the fixture, not read from `src/`.
 *
 * Manual counterpart: `tests/manual/archimate-import.md`.
 */

const FIXTURE = fileURLToPath(
  new URL('../../src/io/fixtures/claims-platform.archimate', import.meta.url),
)
const MODEL = { elements: 39, relationships: 48 } as const
// One more connection than the exchange export, which leaves out the one Archi
// hides inside its nesting (c-k8s-runtime). The view keeps it; the canvas, like
// Archi, does not draw it (#96).
const LANDSCAPE = { nodes: 45, connections: 41, drawn: 40 } as const

test('an Archi .archimate file imports, files its folders and draws its views', async ({
  page,
}) => {
  await startEmpty(page)
  // Nothing to report since the purpose became the model's documentation (#95).
  await importWithNothingToReport(page, FIXTURE, MODEL)

  const tree = page.getByRole('tree', { name: 'Model tree' })
  const item = (name: string) => tree.getByRole('treeitem', { name, exact: true })
  await item('Application').click()
  await item('Claims applications').click()
  await item('Legacy').click()
  await item('Host-based').click()
  await expect(tree.getByRole('treeitem', { name: /Policy Host$/ })).toHaveAttribute(
    'aria-level',
    '5',
  )

  await item('Views').click()
  await item('Landscapes').click()
  await item('Claims landscape').click()
  await expect(page.getByRole('heading', { name: 'Claims landscape' })).toBeVisible()
  const canvas = page.getByTestId('view-canvas')
  await expect(canvas.locator('[data-node]')).toHaveCount(LANDSCAPE.nodes)
  await expect(page.getByText(`${LANDSCAPE.connections} connections`)).toBeVisible()
  await expect(canvas.locator('[data-connection]')).toHaveCount(LANDSCAPE.drawn)
  await expect(canvas.locator('[data-connection="c-k8s-runtime"]')).toHaveCount(0)
  await expect(page.locator('.view-screen').getByRole('alert')).toHaveCount(0)

  // Relative bounds, resolved: a shape nested two deep sits inside its parent.
  const inner = (await canvas.locator('[data-node="o-register"]').boundingBox())!
  const outer = (await canvas.locator('[data-node="o-handle"]').boundingBox())!
  expect(inner.x).toBeGreaterThan(outer.x)
  expect(inner.y).toBeGreaterThan(outer.y)
  expect(inner.x + inner.width).toBeLessThan(outer.x + outer.width)
  expect(inner.y + inner.height).toBeLessThan(outer.y + outer.height)
})

/**
 * Journey 9b — an Archi model saved with images opens (#97). Archi saves such a
 * model as a zip archive, which is inflated by the browser's own
 * DecompressionStream: jsdom tests run Node's, so only a real browser shows the
 * archive opens where users open it. The fixture is Archi 5.10's own save.
 */
const ARCHIVE = fileURLToPath(
  new URL('../../src/io/fixtures/archi-images.archimate', import.meta.url),
)

test('an Archi model saved with images opens, and its report names each image', async ({
  page,
}) => {
  await startEmpty(page)
  await importWorkspaceFile(page, ARCHIVE)

  const dialog = page.getByRole('dialog', { name: 'Import' })
  await expect(dialog).toContainText('3 elements · 2 relationships')
  await expect(dialog).toContainText('shape "o-engine" shows the image “images/actor.png”')
  await expect(dialog).toContainText('The archive holds 2 images')
  await dialog.getByRole('button', { name: 'Done' }).click()
  await expect(dialog).toBeHidden()

  const tree = page.getByRole('tree', { name: 'Model tree' })
  const item = (name: string) => tree.getByRole('treeitem', { name, exact: true })
  await item('Views').click()
  await item('Claims, illustrated').click()
  await expect(page.getByRole('heading', { name: 'Claims, illustrated' })).toBeVisible()
  // The two image boxes are skipped; the group, its two shapes, the actor and the note are drawn.
  await expect(page.getByTestId('view-canvas').locator('[data-node]')).toHaveCount(5)
})
