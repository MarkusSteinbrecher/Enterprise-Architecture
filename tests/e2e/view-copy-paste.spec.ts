import { fileURLToPath } from 'node:url'
import type { Locator, Page } from '@playwright/test'
import { test, expect, importWithNothingToReport, startEmpty } from './support'

/**
 * Journey 18: copy and paste on the canvas (#137), with the keys a user presses
 * in a real browser. Copy, then a press on empty canvas and Paste, makes copies
 * where the press was, because the landscape already draws the process. Paste
 * Special draws the same elements again. Duplicate steps 10, 10 from the
 * original. A paste into a view that draws none of the process draws the same
 * elements. A text field keeps the browser's own copy and paste. The unit
 * tests cannot show what the browser does with these chords, and that is what
 * this journey checks.
 *
 * Counts are from the fixture: Handle Claim holds five shapes joined by five
 * lines, and the model holds 39 elements.
 */

const FIXTURE = fileURLToPath(new URL('../../src/io/fixtures/claims-platform.xml', import.meta.url))
const CLAIMS = { elements: 39, relationships: 48 } as const
const LANDSCAPE = { nodes: 45, connections: 40 } as const
const HANDLE = { nodes: 6, connections: 5 } as const

/**
 * Press on the canvas where the drawing leaves it empty, its top-right corner
 * zoomed out, and say where on the page that was.
 */
async function pressEmpty(page: Page) {
  const surface = page.locator('.view-screen__canvas')
  const area = (await surface.boundingBox())!
  const at = { x: area.width - 60, y: 40 }
  await surface.click({ position: at })
  return { x: area.x + at.x, y: area.y + at.y }
}

/** The model's size, as the navigation's footer gives it. */
const model = (page: Page, elements: number, relationships: number) =>
  expect(page.getByText(`${elements} elements · ${relationships} relations`)).toBeVisible()

async function counts(canvas: Locator, nodes: number, connections: number) {
  await expect(canvas.locator('[data-node]')).toHaveCount(nodes)
  await expect(canvas.locator('[data-connection]')).toHaveCount(connections)
}

test('copy, paste, Paste Special and Duplicate on the canvas, with text fields left alone (#137)', async ({
  page,
}) => {
  await startEmpty(page)
  await importWithNothingToReport(page, FIXTURE, CLAIMS)

  const tree = page.getByRole('tree', { name: 'Model tree' })
  await tree.getByRole('treeitem', { name: 'Views', exact: true }).click()
  await tree.getByRole('treeitem', { name: 'Landscapes' }).click()
  await tree.getByRole('treeitem', { name: 'Claims landscape' }).click()
  const canvas = page.getByTestId('view-canvas')
  await counts(canvas, LANDSCAPE.nodes, LANDSCAPE.connections)
  await page.getByRole('button', { name: 'Zoom out' }).click()
  await page.getByRole('button', { name: 'Zoom out' }).click()

  // Select Handle Claim on its own area, clear of the shapes nested in it.
  await canvas
    .locator('[data-node="o-handle"] > [data-shape] > rect')
    .first()
    .click({ position: { x: 4, y: 4 } })
  await expect(page.getByRole('complementary', { name: 'Selected: Handle Claim' })).toBeVisible()
  const surface = page.locator('.view-screen__canvas')
  await expect(surface).toBeFocused()
  await page.keyboard.press('ControlOrMeta+c')

  // Paste where the canvas was pressed: copies, since the landscape draws the process.
  await model(page, CLAIMS.elements, CLAIMS.relationships)
  const pressed = await pressEmpty(page)
  await page.keyboard.press('ControlOrMeta+v')
  await counts(canvas, LANDSCAPE.nodes + HANDLE.nodes, LANDSCAPE.connections + HANDLE.connections)
  await expect(
    page.getByRole('complementary', { name: 'Selected: Handle Claim (copy)' }),
  ).toBeVisible()
  await model(page, CLAIMS.elements + HANDLE.nodes, CLAIMS.relationships + HANDLE.connections)
  // The pasted process's top-left is where the press was, give or take the outline's 2 px.
  const pasted = (await page.getByTestId('selection').boundingBox())!
  expect(Math.abs(pasted.x - pressed.x)).toBeLessThan(3)
  expect(Math.abs(pasted.y - pressed.y)).toBeLessThan(3)

  // Paste Special: the same elements drawn again, so no new "(copy)".
  await page.keyboard.press('ControlOrMeta+Shift+v')
  await counts(
    canvas,
    LANDSCAPE.nodes + 2 * HANDLE.nodes,
    LANDSCAPE.connections + 2 * HANDLE.connections,
  )
  await expect(page.getByRole('complementary', { name: 'Selected: Handle Claim' })).toBeVisible()
  await model(page, CLAIMS.elements + HANDLE.nodes, CLAIMS.relationships + HANDLE.connections)

  // Duplicate the selection: copies again, 10, 10 from it.
  await page.keyboard.press('ControlOrMeta+d')
  await counts(
    canvas,
    LANDSCAPE.nodes + 3 * HANDLE.nodes,
    LANDSCAPE.connections + 3 * HANDLE.connections,
  )
  await expect(
    page.getByRole('complementary', { name: 'Selected: Handle Claim (copy)' }),
  ).toBeVisible()
  await model(
    page,
    CLAIMS.elements + 2 * HANDLE.nodes,
    CLAIMS.relationships + 2 * HANDLE.connections,
  )

  // A text field keeps the browser's own keys: the palette's type filter takes
  // a paste of what was copied in it, and the canvas pastes and duplicates nothing.
  const filter = page.getByRole('searchbox', { name: 'Find an element type to place' })
  await filter.fill('Process')
  await filter.selectText()
  await page.keyboard.press('ControlOrMeta+c')
  await filter.press('End')
  await page.keyboard.press('ControlOrMeta+v')
  await expect(filter).toHaveValue('ProcessProcess')
  await page.keyboard.press('ControlOrMeta+d')
  await page.keyboard.press('ControlOrMeta+Shift+v')
  await expect(filter).toBeFocused()
  await counts(
    canvas,
    LANDSCAPE.nodes + 3 * HANDLE.nodes,
    LANDSCAPE.connections + 3 * HANDLE.connections,
  )
  await filter.fill('')

  // Each paste was one command: three undos and the landscape is as it was.
  await surface.focus()
  for (let i = 0; i < 3; i++) await page.keyboard.press('ControlOrMeta+z')
  await counts(canvas, LANDSCAPE.nodes, LANDSCAPE.connections)
  await model(page, CLAIMS.elements, CLAIMS.relationships)

  // Into a view that draws none of the process: the same elements, drawn again.
  await tree.getByRole('treeitem', { name: 'Target state (to do)' }).click()
  await expect(page.getByRole('heading', { name: 'Target state (to do)' })).toBeVisible()
  await pressEmpty(page)
  await page.keyboard.press('ControlOrMeta+v')
  await counts(page.getByTestId('view-canvas'), HANDLE.nodes, HANDLE.connections)
  await expect(page.getByRole('complementary', { name: 'Selected: Handle Claim' })).toBeVisible()
  await model(page, CLAIMS.elements, CLAIMS.relationships)
  await expect(page.locator('.view-screen').getByRole('alert')).toHaveCount(0)
})
