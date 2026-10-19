import { fileURLToPath } from 'node:url'
import type { Locator, Page } from '@playwright/test'
import {
  test,
  expect,
  importWithNothingToReport,
  startEmpty,
  waitForPersistedWorkspace,
} from './support'

/**
 * Journey 14 — the palette collapses (#146), in a 1280 px window, where the
 * nav, the tree, the palette and the selection panel left the canvas about
 * 325 px. Collapsed, the canvas gains the palette's width and no shape moves
 * on screen, whether the drawing was still auto-fitted or not; the choice
 * survives a reload, and a tool still places from the keyboard. Only a laid-out
 * page can show that nothing moved: jsdom has no layout.
 */

const FIXTURE = fileURLToPath(new URL('../../src/io/fixtures/claims-platform.xml', import.meta.url))
/** The fixture's element count, from the file, not from `src/`. */
const CLAIMS_ELEMENTS = 39

test.use({ viewport: { width: 1280, height: 800 } })

async function openLandscape(page: Page) {
  const tree = page.getByRole('tree', { name: 'Model tree' })
  await tree.getByRole('treeitem', { name: 'Views', exact: true }).click()
  await tree.getByRole('treeitem', { name: 'Landscapes' }).click()
  await tree.getByRole('treeitem', { name: 'Claims landscape' }).click()
  await expect(page.getByTestId('view-canvas').locator('[data-node]')).toHaveCount(45)
}

async function box(locator: Locator) {
  const found = await locator.boundingBox()
  if (!found) throw new Error('not laid out')
  return found
}

test('the palette collapses to glyphs, the canvas widens, and nothing moves on screen (#146)', async ({
  page,
}) => {
  await startEmpty(page)
  // Nothing to report since relationship documentation is read (#95).
  await importWithNothingToReport(page, FIXTURE, { elements: CLAIMS_ELEMENTS, relationships: 48 })
  await openLandscape(page)

  const palette = page.getByRole('region', { name: 'Palette' })
  const surface = page.locator('.view-screen__canvas')
  const engine = page.getByTestId('view-canvas').locator('[data-node="o-engine"]')
  // Opened fitted: the viewport still follows the canvas, the case most likely to jump.
  const wide = await box(palette)
  const canvasBefore = await box(surface)
  const engineBefore = await box(engine)
  await expect(palette.getByText('Business Actor')).toBeVisible()

  await palette.getByRole('button', { name: 'Collapse palette' }).click()
  await expect(palette.getByRole('button', { name: 'Expand palette' })).toBeFocused()
  await expect(palette.getByText('Business Actor')).toHaveCount(0)
  const narrow = await box(palette)
  expect(narrow.width).toBeLessThan(60)
  const canvasAfter = await box(surface)
  expect(canvasAfter.width).toBeCloseTo(canvasBefore.width + wide.width - narrow.width, 0)
  expect(await box(engine)).toEqual(engineBefore)
  // Each glyph is named as its tooltip.
  await expect(
    palette.getByRole('button', { name: 'Business Actor', exact: true }),
  ).toHaveAttribute('title', 'Business Actor')

  // Remembered: a reload opens the editor collapsed. The model must be in
  // IndexedDB first, or the reload opens on nothing.
  await waitForPersistedWorkspace(page, CLAIMS_ELEMENTS)
  await page.reload()
  await expect(page.getByTestId('view-canvas').locator('[data-node]')).toHaveCount(45)
  await expect(palette.getByRole('button', { name: 'Expand palette' })).toBeVisible()

  // Panned first, with the wheel, so the viewport is the user's: expanding still moves nothing.
  const fitted = await box(engine)
  const area = await box(surface)
  await page.mouse.move(area.x + area.width / 2, area.y + area.height / 2)
  await page.mouse.wheel(-40, -30)
  await expect.poll(async () => (await box(engine)).x).toBeCloseTo(fitted.x + 40, 0)
  const panned = await box(engine)
  await palette.getByRole('button', { name: 'Expand palette' }).click()
  await expect(palette.getByText('Business Actor')).toBeVisible()
  expect(await box(engine)).toEqual(panned)

  // Collapsed again, a glyph still places from the keyboard and opens its name.
  await palette.getByRole('button', { name: 'Collapse palette' }).click()
  await palette.getByRole('button', { name: 'Business Actor', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('textbox', { name: 'Element name' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('view-canvas').locator('[data-node]')).toHaveCount(46)

  // The filter's button opens the palette with the filter focused.
  await palette.getByRole('button', { name: 'Find an element type to place' }).click()
  await expect(
    palette.getByRole('searchbox', { name: 'Find an element type to place' }),
  ).toBeFocused()
  await expect(page.locator('.view-screen').getByRole('alert')).toHaveCount(0)
})
