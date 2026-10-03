import { fileURLToPath } from 'node:url'
import { test, expect, importWorkspaceFile, startEmpty } from './support'

/**
 * Journey 8 — an Archi model's folders in the model tree, in a real browser (#80).
 *
 * The fixture is our own model exported by real Archi 5.10. The journey walks
 * its folder structure, moves an element by native drag and drop — which only a
 * real browser dispatches, so jsdom's synthetic drag events prove the handlers
 * and this proves the gesture — and follows the selection between the tree, the
 * canvas and the fact sheet.
 */

const FIXTURE = fileURLToPath(new URL('../../src/io/fixtures/claims-platform.xml', import.meta.url))

test('the model tree shows folders, moves by drag and drop, and follows the selection', async ({
  page,
}) => {
  await startEmpty(page)
  await importWorkspaceFile(page, FIXTURE)
  await expect(page.getByRole('dialog', { name: 'Import' })).toBeHidden()

  const tree = page.getByRole('tree', { name: 'Model tree' })
  const item = (name: string | RegExp) => tree.getByRole('treeitem', { name, exact: true })

  // Folders, four deep, as Archi filed them.
  await item('Application').click()
  await item('Claims applications').click()
  await item('Legacy').click()
  await item('Host-based').click()
  const host = tree.getByRole('treeitem', { name: /Policy Host$/ })
  await expect(host).toHaveAttribute('aria-level', '5')

  // Drag Policy Host out of Host-based and into Claims applications.
  await host.dragTo(item('Claims applications'))
  await expect(page.getByTestId('tree-announcer')).toHaveText(
    'Moved “Policy Host” to “Claims applications”.',
  )
  await expect(host).toHaveAttribute('aria-level', '3')
  // Host-based is now empty, so it has nothing to open.
  await expect(item('Host-based')).not.toHaveAttribute('aria-expanded')

  // ⌘Z puts it back in Host-based, and ⇧⌘Z files it in Claims applications again (#88).
  await page.keyboard.press('ControlOrMeta+z')
  await expect(host).toHaveAttribute('aria-level', '5')
  await page.keyboard.press('ControlOrMeta+Shift+z')
  await expect(host).toHaveAttribute('aria-level', '3')

  // A drop into another group is refused: the element stays where it was.
  await item('Business').click()
  await host.dragTo(item('Business'))
  await expect(host).toHaveAttribute('aria-level', '3')

  // Tree → view → canvas → tree.
  await item('Views').click()
  await item('Landscapes').click()
  await item('Claims landscape').click()
  const canvas = page.getByTestId('view-canvas')
  await expect(canvas.locator('[data-node]').first()).toBeVisible()
  await host.click()
  await expect(page.getByRole('complementary', { name: 'Selected: Policy Host' })).toBeVisible()
  await expect(host).toHaveAttribute('aria-selected', 'true')

  // The engine is a container: its own corner, above the shapes nested in it.
  await canvas
    .locator('[data-node="o-engine"] > [data-shape] > rect')
    .first()
    .click({ position: { x: 6, y: 6 } })
  await expect(page.getByRole('complementary', { name: 'Selected: Claims Engine' })).toBeVisible()
  await expect(tree.getByRole('treeitem', { name: /Claims Engine$/ })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(host).toHaveAttribute('aria-selected', 'false')

  // The keyboard reaches the same places: End lands on the last row.
  await tree.focus()
  await page.keyboard.press('End')
  const active = await tree.getAttribute('aria-activedescendant')
  expect(active).toBeTruthy()
  await expect(page.locator(`[id="${active}"]`)).toBeVisible()
})
