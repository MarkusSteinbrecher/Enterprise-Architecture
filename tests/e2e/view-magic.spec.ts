import type { Page } from '@playwright/test'
import { test, expect, DEMO, loadDemo, saveWorkspaceFile } from './support'

/**
 * Journey 17 — the magic connector in a real browser (#132): from a shape's
 * connect handle, a drag released on empty canvas opens the menu; it is driven
 * by the keyboard alone, and the choice makes a new element, its relationship
 * and both drawings as one undo. The saved file is read back, so the journey
 * ends on what reached the disk. jsdom cannot see this: whether the release
 * point on a laid-out, zoomed canvas is empty, and where focus goes as the
 * menu closes and the name opens, are only known here.
 */

async function clickCanvas(page: Page, x: number, y: number) {
  const box = (await page.locator('.view-screen__canvas').boundingBox())!
  await page.mouse.click(box.x + x, box.y + y)
}

test('a drag to empty canvas makes a new element and its relationship, as one undo (#132)', async ({
  page,
}, testInfo) => {
  await loadDemo(page)
  const tree = page.getByRole('tree', { name: 'Model tree' })
  await tree.getByRole('treeitem', { name: 'Views', exact: true }).click()
  await page.getByRole('button', { name: '+ View' }).click()
  await expect(page.getByRole('textbox', { name: 'View name' })).toBeFocused()
  await page.keyboard.type('Magic')
  await page.keyboard.press('Enter')
  await expect(tree.getByRole('treeitem', { name: 'Magic' })).toBeVisible()

  // A Business Actor, placed and named.
  const palette = page.getByRole('region', { name: 'Palette' })
  await palette.getByRole('button', { name: 'Business Actor' }).click()
  await clickCanvas(page, 40, 80)
  const editor = page.getByRole('textbox', { name: 'Element name' })
  await expect(editor).toBeFocused()
  await page.keyboard.type('Broker')
  await page.keyboard.press('Enter')
  const canvas = page.getByTestId('view-canvas')
  await expect(canvas.locator('[data-node]')).toHaveCount(1)

  // From its connect handle to empty canvas, well clear of the shape.
  const handle = (await page.getByTestId('connect-handle').boundingBox())!
  const box = (await page.locator('.view-screen__canvas').boundingBox())!
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + 320, box.y + 360, { steps: 8 })
  await expect(page.getByTestId('rubber-band')).toBeVisible()
  await expect(page.getByTestId('connect-target')).toHaveCount(0)
  await page.mouse.up()

  const menu = page.getByRole('dialog', { name: 'New element from Broker' })
  const types = menu.getByRole('region', { name: 'Relationship' }).getByRole('button')
  await expect(types.first()).toBeFocused()
  await expect(types.first()).toContainText('Composed of')

  // Down to "Assigned to", right into its element types, down to Business Role.
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await expect(types.nth(2)).toBeFocused()
  await expect(types.nth(2)).toContainText('Assigned to')
  await page.keyboard.press('ArrowRight')
  const panel = menu.getByRole('region', { name: 'Assigned to: new element' })
  const role = panel.getByRole('button', { name: 'Business Role', exact: true })
  await expect(panel.getByRole('button').first()).toBeFocused()
  for (let i = 0; i < 40 && !(await role.evaluate((el) => el === document.activeElement)); i++) {
    await page.keyboard.press('ArrowDown')
  }
  await expect(role).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(menu).toBeHidden()

  // Drawn and connected; its name opens for typing, and Escape keeps the one it has.
  await expect(canvas.locator('[data-node]')).toHaveCount(2)
  await expect(canvas.locator('[data-connection]')).toHaveCount(1)
  await expect(editor).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(editor).toBeHidden()
  await expect(page.locator('.view-screen__canvas')).toBeFocused()

  // One undo takes the element, the relationship and both drawings; one redo brings them back.
  await page.keyboard.press('ControlOrMeta+z')
  await expect(canvas.locator('[data-node]')).toHaveCount(1)
  await expect(canvas.locator('[data-connection]')).toHaveCount(0)
  await page.keyboard.press('ControlOrMeta+Shift+z')
  await expect(canvas.locator('[data-node]')).toHaveCount(2)
  await expect(canvas.locator('[data-connection]')).toHaveCount(1)

  const saved = JSON.parse(await saveWorkspaceFile(page, testInfo.outputPath('workspace.json')))
  expect(saved.elements).toHaveLength(DEMO.elements + 2)
  const elements = new Map<string, { name: string; type: string }>(
    saved.elements.map((e: { id: string; name: string; type: string }) => [e.id, e]),
  )
  const view = saved.views.find((v: { name: string }) => v.name === 'Magic')
  expect(view.nodes).toHaveLength(2)
  const relationship = saved.relationships.find(
    (r: { id: string }) => r.id === view.connections[0].relationship,
  )
  expect(relationship).toMatchObject({ type: 'Assignment' })
  expect(elements.get(relationship.source)).toMatchObject({ name: 'Broker' })
  expect(elements.get(relationship.target)).toMatchObject({
    type: 'BusinessRole',
    name: 'Business Role',
  })
  await expect(page.locator('.view-screen').getByRole('alert')).toHaveCount(0)
})
