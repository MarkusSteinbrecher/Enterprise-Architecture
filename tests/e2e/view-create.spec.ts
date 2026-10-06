import type { Page } from '@playwright/test'
import { test, expect, dirtyCount, loadDemo, saveWorkspaceFile } from './support'

/**
 * Journey 10 — a view made from scratch in a real browser (#130): made from the
 * model tree, named, two elements placed from the palette and named on the
 * canvas, connected (#129), and saved. The saved file is read back, so the
 * journey ends on what reached the disk, not on what the screen shows.
 */

/**
 * Press and release on the canvas at a point inside it, as a click that places.
 * Kept near the left: a selected shape opens its panel, which narrows the canvas.
 */
async function clickCanvas(page: Page, x: number, y: number) {
  const box = (await page.locator('.view-screen__canvas').boundingBox())!
  await page.mouse.click(box.x + x, box.y + y)
}

test('a view is made, two elements are placed and connected, and the file holds them (#130)', async ({
  page,
}, testInfo) => {
  await loadDemo(page)
  const tree = page.getByRole('tree', { name: 'Model tree' })

  // Made from the tree, opened ready to edit, its name selected.
  await tree.getByRole('treeitem', { name: 'Views', exact: true }).click()
  await page.getByRole('button', { name: '+ View' }).click()
  const name = page.getByRole('textbox', { name: 'View name' })
  await expect(name).toBeFocused()
  await page.keyboard.type('Claims overview')
  await page.keyboard.press('Enter')
  await expect(tree.getByRole('treeitem', { name: 'Claims overview' })).toBeVisible()

  // A Business Actor, placed with a click and named where it is drawn.
  const palette = page.getByRole('region', { name: 'Palette' })
  await palette.getByRole('button', { name: 'Business Actor' }).click()
  await clickCanvas(page, 40, 80)
  const editor = page.getByRole('textbox', { name: 'Element name' })
  await expect(editor).toBeFocused()
  await page.keyboard.type('Broker')
  await page.keyboard.press('Enter')
  await expect(editor).toBeHidden()

  // An Application Component. A name typed and then abandoned with Escape is
  // not taken: the field goes as Escape is handled, and the browser's blur as
  // it goes must not commit what was typed.
  await palette.getByRole('button', { name: 'Application Component' }).click()
  await clickCanvas(page, 60, 300)
  await expect(editor).toBeFocused()
  await page.keyboard.type('Throwaway')
  await page.keyboard.press('Escape')
  await expect(editor).toBeHidden()
  const canvas = page.getByTestId('view-canvas')
  await expect(canvas.locator('[data-node]')).toHaveCount(2)
  // Names read from the tree: the shape wraps a long name over lines of its own.
  await expect(tree.getByRole('treeitem', { name: 'Application Component' })).toBeVisible()
  await expect(tree.getByRole('treeitem', { name: 'Throwaway' })).toHaveCount(0)
  await page.keyboard.press('F2')
  await expect(editor).toBeFocused()
  await page.keyboard.type('Claims Portal')
  await page.keyboard.press('Enter')
  await expect(tree.getByRole('treeitem', { name: 'Claims Portal' })).toBeVisible()
  // The drawing shows the new name (wrapped, so one word of it).
  await expect(canvas).toContainText('Portal')

  // Connected: the portal is selected, so its connect handle is there.
  const portal = canvas.locator('[data-node]').nth(1)
  const broker = canvas.locator('[data-node]').nth(0)
  await expect(page.getByRole('complementary', { name: /Selected: Claims Portal/ })).toBeVisible()
  const handle = (await page.getByTestId('connect-handle').boundingBox())!
  const target = (await broker.boundingBox())!
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2)
  await page.mouse.down()
  await page.mouse.move(target.x + 10, target.y + 10, { steps: 6 })
  await expect(page.getByTestId('connect-target')).toBeVisible()
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 4 })
  await page.mouse.up()
  const menu = page.getByRole('dialog', { name: /^Connect Claims Portal to Broker/ })
  await menu
    .getByRole('region', { name: 'New relationship' })
    .getByRole('button')
    .filter({ hasText: 'Serving' })
    .click()
  await expect(canvas.locator('[data-connection]')).toHaveCount(1)
  expect(await portal.getAttribute('data-node')).toBeTruthy()

  // Saved: the file holds the view, its two drawings and the one line. A
  // download is a write the app cannot see finish, so the indicator does not
  // claim it (CLAUDE.md, Constraints), as in journey 5.
  const unsaved = await dirtyCount(page)
  const saved = JSON.parse(await saveWorkspaceFile(page, testInfo.outputPath('workspace.json')))
  expect(await dirtyCount(page)).toBe(unsaved)
  const view = saved.views.find((v: { name: string }) => v.name === 'Claims overview')
  expect(view).toBeTruthy()
  expect(view.nodes).toHaveLength(2)
  expect(view.connections).toHaveLength(1)
  const elements = new Map<string, { name: string; type: string }>(
    saved.elements.map((e: { id: string; name: string; type: string }) => [e.id, e]),
  )
  const drawn = view.nodes.map((n: { element: string }) => elements.get(n.element))
  expect(drawn.map((e: { name: string }) => e.name).sort()).toEqual(['Broker', 'Claims Portal'])
  const relationship = saved.relationships.find(
    (r: { id: string }) => r.id === view.connections[0].relationship,
  )
  expect(relationship).toMatchObject({ type: 'Serving' })
  expect(elements.get(relationship.source)?.name).toBe('Claims Portal')
  expect(elements.get(relationship.target)?.name).toBe('Broker')
  await expect(page.locator('.view-screen').getByRole('alert')).toHaveCount(0)
})
