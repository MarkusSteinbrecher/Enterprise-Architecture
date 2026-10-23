import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test, expect, importWithNothingToReport, saveWorkspaceFile, startEmpty } from './support'

/**
 * Journey 21 — documenting a relationship and the model itself (#171), where
 * Archi does: a connection's documentation in the panel of the line selected
 * on a diagram, the model's on the sheet its tree entry opens. Each edit is
 * one undo, the relationship's text then shows under its row on the element's
 * fact sheet, and both reach the file SAVE FILE writes.
 */

const FIXTURE = fileURLToPath(new URL('../../src/io/fixtures/claims-platform.xml', import.meta.url))
const LINE = 'c-cust-ins'

test('a relationship and the model are documented where Archi documents them (#171)', async ({
  page,
}, testInfo) => {
  await startEmpty(page)
  await importWithNothingToReport(page, FIXTURE, { elements: 39, relationships: 48 })

  const tree = page.getByRole('tree', { name: 'Model tree' })
  await tree.getByRole('treeitem', { name: 'Views', exact: true }).click()
  await tree.getByRole('treeitem', { name: 'Landscapes' }).click()
  await tree.getByRole('treeitem', { name: 'Claims landscape' }).click()
  const canvas = page.getByTestId('view-canvas')
  await expect(canvas.locator(`[data-connection="${LINE}"]`)).toHaveCount(1)

  // Select the Customer → Insurant assignment by a press on the line.
  const hit = canvas.locator(`[data-line-hit="${LINE}"]`)
  const at = await hit.evaluate((el) => {
    const path = el as SVGPathElement
    const p = path.getPointAtLength(path.getTotalLength() * 0.3)
    const m = path.getScreenCTM()!
    return { x: p.x * m.a + p.y * m.c + m.e, y: p.x * m.b + p.y * m.d + m.f }
  })
  await page.mouse.click(at.x, at.y)
  const panel = page.getByRole('complementary', { name: /Selected: Assignment relationship/ })
  await expect(panel).toContainText('Customer → Insurant')

  const lineDoc = panel.getByRole('textbox', { name: 'Documentation' })
  await expect(lineDoc).toHaveValue('')
  await lineDoc.click()
  await page.keyboard.type('Every customer acts as an insurant.')
  await page.keyboard.press('ControlOrMeta+Enter')
  // Done with the field: the canvas has the keys, so ⌘Z undoes the model.
  await expect(lineDoc).not.toBeFocused()
  await expect(lineDoc).toHaveValue('Every customer acts as an insurant.')
  await page.keyboard.press('ControlOrMeta+z')
  await expect(lineDoc).toHaveValue('')
  await page.keyboard.press('ControlOrMeta+Shift+z')
  await expect(lineDoc).toHaveValue('Every customer acts as an insurant.')

  // The fact sheet shows it under the relation's row.
  await page.getByRole('link', { name: /^Inventory/ }).click()
  await page.getByRole('button', { name: 'BA Customer Business Actor' }).click()
  await expect(page.getByRole('heading', { name: 'Customer', exact: true })).toBeVisible()
  await expect(page.locator('.relation-entry__doc')).toContainText(
    'Every customer acts as an insurant.',
  )

  // The model's own entry, above the tree, opens its sheet.
  const modelEntry = page.locator('a.model-tree__model')
  await modelEntry.click()
  await expect(page).toHaveURL(/\/model$/)
  await expect(modelEntry).toHaveAttribute('aria-current', 'page')
  await page.getByRole('button', { name: 'Edit' }).click()
  const modelDoc = page.getByRole('textbox', { name: 'Documentation' })
  await modelDoc.fill('Claims handling as it runs today.')
  await page.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByText('Claims handling as it runs today.')).toBeVisible()

  const saved = JSON.parse(
    await saveWorkspaceFile(page, join(testInfo.outputDir, 'documented.json')),
  ) as {
    documentation?: string
    relationships: { id: string; documentation?: string }[]
  }
  expect(saved.documentation).toBe('Claims handling as it runs today.')
  expect(saved.relationships.find((r) => r.id === 'r-cust-ins')?.documentation).toBe(
    'Every customer acts as an insurant.',
  )
})
