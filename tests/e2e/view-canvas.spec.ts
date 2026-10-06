import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import type { Locator } from '@playwright/test'
import { test, expect, importWorkspaceFile, startEmpty } from './support'

/**
 * Journey 7 — an Archi model's diagram opens and draws in a real browser (#79).
 *
 * The fixture is our own model exported by real Archi 5.10 (#76). It is
 * imported through the app's import dialog, as a user's file would be, and the
 * view is reached by the way a user would reach it: through the model tree.
 *
 * Counts are hard-coded from the fixture rather than read from `src/`, so the
 * test cannot agree with the code by construction.
 */

const FIXTURE = fileURLToPath(new URL('../../src/io/fixtures/claims-platform.xml', import.meta.url))
const LANDSCAPE = { nodes: 45, connections: 40, relationships: 38 } as const

test('an imported Archi view draws every node and connection', async ({ page }, testInfo) => {
  await startEmpty(page)
  await importWorkspaceFile(page, FIXTURE)
  // Archi exports the model's purpose as its documentation, which has nowhere
  // to go yet, so the report stays open to say so (#13).
  const dialog = page.getByRole('dialog', { name: 'Import' })
  await expect(dialog).toContainText('documentation was not imported')
  await dialog.getByRole('button', { name: 'Done' }).click()
  await expect(dialog).toBeHidden()

  const tree = page.getByRole('tree', { name: 'Model tree' })
  await tree.getByRole('treeitem', { name: 'Views', exact: true }).click()
  await tree.getByRole('treeitem', { name: 'Landscapes' }).click()
  await tree.getByRole('treeitem', { name: 'Claims landscape' }).click()
  await expect(page.getByRole('heading', { name: 'Claims landscape' })).toBeVisible()

  const canvas = page.getByTestId('view-canvas')
  // Presence first: the node count is what proves the drawing landed.
  await expect(canvas.locator('[data-node]')).toHaveCount(LANDSCAPE.nodes)
  await expect(canvas.locator('[data-connection]')).toHaveCount(LANDSCAPE.connections)
  await expect(canvas.locator('[data-connection] [data-relationship]')).toHaveCount(
    LANDSCAPE.relationships,
  )
  // Only now is an absence worth asserting.
  await expect(page.locator('.view-screen').getByRole('alert')).toHaveCount(0)

  // Fit put the whole drawing on screen and filled it: inside the canvas on every
  // side, and spanning most of it in at least one direction. The second half is
  // what failed when fit ran before the canvas had its height (a 10% thumbnail
  // in the corner is "inside" too).
  const canvasBox = (await canvas.boundingBox())!
  const drawn = (await canvas.locator('[data-view-drawing]').boundingBox())!
  expect(drawn.x).toBeGreaterThanOrEqual(canvasBox.x)
  expect(drawn.y).toBeGreaterThanOrEqual(canvasBox.y)
  expect(drawn.x + drawn.width).toBeLessThanOrEqual(canvasBox.x + canvasBox.width)
  expect(drawn.y + drawn.height).toBeLessThanOrEqual(canvasBox.y + canvasBox.height)
  expect(Math.max(drawn.width / canvasBox.width, drawn.height / canvasBox.height)).toBeGreaterThan(
    0.85,
  )

  // Selecting a shape shows its summary, and the fact sheet is one click away.
  await canvas
    .locator('[data-node="o-engine"] > [data-shape] > rect')
    .first()
    .click({ position: { x: 8, y: 30 } })
  const panel = page.getByRole('complementary', { name: 'Selected: Claims Engine' })
  await expect(panel).toBeVisible()

  // SVG export: every node and connection, and no theme variable left unresolved.
  const svgDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export SVG' }).click()
  const svgPath = testInfo.outputPath('claims-landscape.svg')
  await (await svgDownload).saveAs(svgPath)
  const svg = await readFile(svgPath, 'utf8')
  expect(svg.match(/data-node="/g)).toHaveLength(LANDSCAPE.nodes)
  expect(svg.match(/data-connection="/g)).toHaveLength(LANDSCAPE.connections)
  expect(svg).not.toContain('var(--')

  // PNG export: a real PNG of real size, which only a browser can rasterise.
  const pngDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export PNG' }).click()
  const png = await readFile(await (await pngDownload).path())
  expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  // Width from the IHDR chunk: twice the exported SVG's width.
  const svgWidth = Number(/width="(\d+)"/.exec(svg)![1])
  expect(png.readUInt32BE(16)).toBe(svgWidth * 2)
  await expect(page.locator('.view-screen').getByRole('alert')).toHaveCount(0)

  // And back to the element: its fact sheet lists the views it appears in.
  await panel.getByRole('button', { name: 'Open fact sheet' }).click()
  await expect(page.getByRole('heading', { name: 'Claims Engine', exact: true })).toBeVisible()
  await page
    .getByRole('link', { name: 'Claim data' })
    .or(page.getByRole('link', { name: 'Claims landscape' }))
    .first()
    .click()
  await expect(canvas.locator('[data-node]').first()).toBeVisible()
  await expect(page.getByTestId('selection')).toBeVisible()
})

/** The drawn position of a node: its `<g>` is translated to its absolute view coordinates. */
async function drawnAt(node: Locator): Promise<{ x: number; y: number }> {
  const transform = (await node.getAttribute('transform')) ?? ''
  const match = /translate\(([-\d.e]+) ([-\d.e]+)\)/.exec(transform)
  if (!match) throw new Error(`no translate in "${transform}"`)
  return { x: Number(match[1]), y: Number(match[2]) }
}

test('a shape dragged in a real browser moves, and undo puts it back (#128)', async ({ page }) => {
  await startEmpty(page)
  await importWorkspaceFile(page, FIXTURE)
  const dialog = page.getByRole('dialog', { name: 'Import' })
  await dialog.getByRole('button', { name: 'Done' }).click()
  const tree = page.getByRole('tree', { name: 'Model tree' })
  await tree.getByRole('treeitem', { name: 'Views', exact: true }).click()
  await tree.getByRole('treeitem', { name: 'Landscapes' }).click()
  await tree.getByRole('treeitem', { name: 'Claims landscape' }).click()

  const canvas = page.getByTestId('view-canvas')
  await expect(canvas.locator('[data-node]')).toHaveCount(LANDSCAPE.nodes)
  // A shape in the middle of the canvas: a drag near the edge would scroll the
  // view as well, which is right, but not what this journey measures.
  const shape = canvas.locator('[data-node="o-as-customer"]')
  const before = await drawnAt(shape)
  const scale = Number(
    /scale\(([-\d.e]+)\)/.exec((await canvas.locator('g').first().getAttribute('transform'))!)![1],
  )

  const box = (await shape.boundingBox())!
  const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 20, from.y + 10, { steps: 4 })
  await page.mouse.move(from.x + 40, from.y + 20, { steps: 4 })
  await page.mouse.up()

  const after = { x: before.x + Math.round(40 / scale), y: before.y + Math.round(20 / scale) }
  await expect.poll(() => drawnAt(shape)).toEqual(after)
  await expect(page.getByTestId('selection')).toBeVisible()

  await page.keyboard.press('ControlOrMeta+z')
  await expect.poll(() => drawnAt(shape)).toEqual(before)
  await expect(page.locator('.view-screen').getByRole('alert')).toHaveCount(0)
})

test('two shapes connected in a real browser, with only valid types offered, and undo takes it back (#129)', async ({
  page,
}) => {
  await startEmpty(page)
  await importWorkspaceFile(page, FIXTURE)
  await page.getByRole('dialog', { name: 'Import' }).getByRole('button', { name: 'Done' }).click()
  const tree = page.getByRole('tree', { name: 'Model tree' })
  await tree.getByRole('treeitem', { name: 'Views', exact: true }).click()
  await tree.getByRole('treeitem', { name: 'Landscapes' }).click()
  await tree.getByRole('treeitem', { name: 'Claims landscape' }).click()

  const canvas = page.getByTestId('view-canvas')
  await expect(canvas.locator('[data-connection]')).toHaveCount(LANDSCAPE.connections)

  // Selecting the source opens its panel, which narrows the canvas: every box
  // is measured after that, where the pointer will really find it.
  const source = canvas.locator('[data-node="o-customer-hub"]')
  await source.click()
  await expect(
    page.getByRole('complementary', { name: /Selected: Customer Data Hub/ }),
  ).toBeVisible()
  const handle = (await page.getByTestId('connect-handle').boundingBox())!
  const target = (await canvas.locator('[data-node="o-as-payment"]').boundingBox())!

  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2)
  await page.mouse.down()
  await page.mouse.move(target.x + 10, target.y + 10, { steps: 6 })
  await expect(page.getByTestId('connect-target')).toBeVisible()
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 4 })
  await page.mouse.up()

  // Application Component → Application Service: Realization and Serving, not Composition.
  const menu = page.getByRole('dialog', { name: /^Connect Customer Data Hub to / })
  const offered = menu.getByRole('region', { name: 'New relationship' }).getByRole('button')
  await expect(offered.filter({ hasText: 'Serving' })).toHaveCount(1)
  await expect(offered.filter({ hasText: 'Composition' })).toHaveCount(0)
  await offered.filter({ hasText: 'Serving' }).click()
  await expect(menu).toBeHidden()

  await expect(canvas.locator('[data-connection]')).toHaveCount(LANDSCAPE.connections + 1)
  await expect(
    page.getByRole('complementary', { name: /Selected: Serving relationship/ }),
  ).toBeVisible()

  await page.keyboard.press('ControlOrMeta+z')
  await expect(canvas.locator('[data-connection]')).toHaveCount(LANDSCAPE.connections)
  await expect(page.locator('.view-screen').getByRole('alert')).toHaveCount(0)
})
