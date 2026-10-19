import { fileURLToPath } from 'node:url'
import type { Page } from '@playwright/test'
import { test, expect, importWorkspaceFile, startEmpty } from './support'

/**
 * Journey 15 — an element dragged in from the model tree brings its
 * relationships (#145), with Chromium's own drag and drop: a line to every
 * shape in the view that draws the other end, all undone by one undo; and with
 * the copy key held, the shape alone, as in Archi. The unit tests can only fake
 * the `dataTransfer` and the modifier keys the browser puts on a drag.
 *
 * Counts are from the fixture: Claims Engine has eight relationships, and the
 * landscape draws the other end of each, outside any nesting.
 */

const FIXTURE = fileURLToPath(new URL('../../src/io/fixtures/claims-platform.xml', import.meta.url))
const LANDSCAPE = { nodes: 45, connections: 40 } as const
const ENGINE_LINES = 8

async function dropEngine(page: Page) {
  const surface = page.locator('.view-screen__canvas')
  const area = (await surface.boundingBox())!
  // Zoomed out, the drawing leaves the canvas's top-right corner empty.
  await page
    .getByRole('tree', { name: 'Model tree' })
    .getByRole('treeitem', { name: 'Claims Engine' })
    .dragTo(surface, { targetPosition: { x: area.width - 40, y: 30 } })
}

test('a tree element dropped on a view draws its relationships, unless the copy key is held (#145)', async ({
  page,
}) => {
  await startEmpty(page)
  await importWorkspaceFile(page, FIXTURE)
  const report = page.getByRole('dialog', { name: 'Import' })
  await report.getByRole('button', { name: 'Done' }).click()
  await expect(report).toBeHidden()

  const tree = page.getByRole('tree', { name: 'Model tree' })
  await tree.getByRole('treeitem', { name: 'Views', exact: true }).click()
  await tree.getByRole('treeitem', { name: 'Landscapes' }).click()
  await tree.getByRole('treeitem', { name: 'Claims landscape' }).click()
  const canvas = page.getByTestId('view-canvas')
  await expect(canvas.locator('[data-node]')).toHaveCount(LANDSCAPE.nodes)
  await expect(canvas.locator('[data-connection]')).toHaveCount(LANDSCAPE.connections)
  await page.getByRole('button', { name: 'Zoom out' }).click()
  await page.getByRole('button', { name: 'Zoom out' }).click()
  await tree.getByRole('treeitem', { name: 'Application', exact: true }).click()
  await tree.getByRole('treeitem', { name: 'Claims applications' }).click()

  // An ordinary drag: the shape and a line for each relationship.
  await dropEngine(page)
  await expect(canvas.locator('[data-node]')).toHaveCount(LANDSCAPE.nodes + 1)
  await expect(canvas.locator('[data-connection]')).toHaveCount(
    LANDSCAPE.connections + ENGINE_LINES,
  )
  await expect(page.getByText(`${LANDSCAPE.connections + ENGINE_LINES} connections`)).toBeVisible()

  // One undo takes the shape and every line.
  await expect(page.locator('.view-screen__canvas')).toBeFocused()
  await page.keyboard.press('ControlOrMeta+z')
  await expect(canvas.locator('[data-node]')).toHaveCount(LANDSCAPE.nodes)
  await expect(canvas.locator('[data-connection]')).toHaveCount(LANDSCAPE.connections)

  // With the copy key held through the drag, the shape alone.
  await page.keyboard.down('Alt')
  await dropEngine(page)
  await page.keyboard.up('Alt')
  await expect(canvas.locator('[data-node]')).toHaveCount(LANDSCAPE.nodes + 1)
  await expect(page.getByText(`${LANDSCAPE.nodes + 1} nodes`)).toBeVisible()
  await expect(canvas.locator('[data-connection]')).toHaveCount(LANDSCAPE.connections)
  await expect(page.locator('.view-screen').getByRole('alert')).toHaveCount(0)
})
