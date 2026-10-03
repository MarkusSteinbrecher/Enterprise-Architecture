import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { test, expect, importWorkspaceFile, startEmpty } from './support'

/**
 * Journey 7 — an Archi model's diagram opens and draws in a real browser (#79).
 *
 * The fixture is our own model exported by real Archi 5.10 (#76). It is
 * imported through the app's import dialog, as a user's file would be, and the
 * view is reached by the way a user would reach it: the nav, then the list.
 *
 * Counts are hard-coded from the fixture rather than read from `src/`, so the
 * test cannot agree with the code by construction.
 */

const FIXTURE = fileURLToPath(new URL('../../src/io/fixtures/claims-platform.xml', import.meta.url))
const LANDSCAPE = { nodes: 45, connections: 40, relationships: 38 } as const

test('an imported Archi view draws every node and connection', async ({ page }, testInfo) => {
  await startEmpty(page)
  await importWorkspaceFile(page, FIXTURE)
  // An import with nothing to report closes its own dialog.
  await expect(page.getByRole('dialog', { name: 'Import' })).toBeHidden()

  await page.getByRole('link', { name: /^Views/ }).click()
  await page.getByRole('link', { name: 'Claims landscape' }).click()
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
