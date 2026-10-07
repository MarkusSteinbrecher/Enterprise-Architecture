import { fileURLToPath } from 'node:url'
import { test, expect, importWorkspaceFile, startEmpty } from './support'

/**
 * Journey 11 — nesting asks what it means (#131), in a real browser: a shape
 * dragged into an element's shape with the mouse, the question answered from
 * the keyboard, and the relationship's connection kept in the view but not
 * drawn (#96); then a second question dismissed by a press outside it, which
 * must leave the keyboard with the canvas (#157). The canvas is laid out and
 * fitted here, which jsdom never does, so the drop is found by where the shapes
 * really are on screen.
 */

const FIXTURE = fileURLToPath(new URL('../../src/io/fixtures/claims-platform.xml', import.meta.url))
const LANDSCAPE = { connections: 40 } as const

test('a shape dropped into an element’s shape asks which relationship it means (#131)', async ({
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
  await expect(canvas.locator('[data-connection]')).toHaveCount(LANDSCAPE.connections)
  await expect(page.getByText(`${LANDSCAPE.connections} connections`)).toBeVisible()

  // Customer Data Hub, dragged into Claims Engine above its two functions.
  const hub = (await canvas.locator('[data-node="o-customer-hub"]').boundingBox())!
  const engine = (await canvas.locator('[data-node="o-engine"]').boundingBox())!
  await page.mouse.move(hub.x + hub.width / 2, hub.y + hub.height / 2)
  await page.mouse.down()
  await page.mouse.move(engine.x + engine.width * 0.2, engine.y + engine.height * 0.15, {
    steps: 8,
  })
  await expect(page.getByTestId('drop-target')).toBeVisible()
  await page.mouse.up()

  // The question, its first answer first in line: Enter takes it.
  const prompt = page.getByRole('dialog', { name: 'Nested in Claims Engine' })
  const first = prompt.getByRole('region', { name: 'New relationship' }).getByRole('button').first()
  await expect(first).toBeFocused()
  await expect(first).toContainText('Composition')
  await expect(first).toContainText('Claims Engine → Customer Data Hub')
  await page.keyboard.press('Enter')
  await expect(prompt).toBeHidden()

  // Nested, with one more connection in the view and none more drawn: the
  // nesting shows it (#96).
  await expect(canvas.locator('[data-node="o-customer-hub"]')).toHaveAttribute(
    'data-parent',
    'o-engine',
  )
  await expect(page.getByText(`${LANDSCAPE.connections + 1} connections`)).toBeVisible()
  await expect(canvas.locator('[data-connection]')).toHaveCount(LANDSCAPE.connections)
  // The canvas has the keyboard again.
  await expect(page.locator('.view-screen__canvas')).toBeFocused()

  // Claims Portal, dragged in beside it, and the question dismissed by a press
  // outside it: that answers none, and the press's own default must not take
  // the keyboard from the canvas once the overlay is gone (#157). Its Flow to
  // the engine is not a type a nesting means, so the question is asked.
  const portal = (await canvas.locator('[data-node="o-portal"]').boundingBox())!
  await page.mouse.move(portal.x + portal.width / 2, portal.y + portal.height / 2)
  await page.mouse.down()
  await page.mouse.move(engine.x + engine.width * 0.75, engine.y + engine.height * 0.15, {
    steps: 8,
  })
  await expect(page.getByTestId('drop-target')).toBeVisible()
  await page.mouse.up()
  await expect(prompt).toBeVisible()
  await page.mouse.click(4, 4)
  await expect(prompt).toBeHidden()
  await expect(canvas.locator('[data-node="o-portal"]')).toHaveAttribute('data-parent', 'o-engine')
  await expect(page.getByText(`${LANDSCAPE.connections + 1} connections`)).toBeVisible()
  await expect(page.locator('.view-screen__canvas')).toBeFocused()
})
