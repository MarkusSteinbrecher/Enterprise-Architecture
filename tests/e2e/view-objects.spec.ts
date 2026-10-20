import { fileURLToPath } from 'node:url'
import type { Page } from '@playwright/test'
import { test, expect, importWorkspaceFile, modelCounts, startEmpty } from './support'

/**
 * Journey 18 — notes, groups, legends and view references in a real browser
 * (#134). Archi's own save of a model with a legend opens with nothing to
 * report and the legend drawn from the view's types. A note is placed and given
 * two lines in place, a group is placed and documented in the panel, a view is
 * dragged in from the model tree with Chromium's own drag and drop, and an
 * element of a new type makes the legend gain an entry. ⌘Z inside a text field
 * stays the field's, and outside it undoes the model, one edit at a time.
 */

const FIXTURE = fileURLToPath(
  new URL('../../src/io/fixtures/view-objects.archimate', import.meta.url),
)
/** The Main view as Archi saved it: five shapes, one nested, and a legend. */
const MAIN = { nodes: 6, connections: 2 } as const

async function clickCanvas(page: Page, x: number, y: number) {
  const box = (await page.locator('.view-screen__canvas').boundingBox())!
  await page.mouse.click(box.x + x, box.y + y)
}

const legendEntries = (page: Page) =>
  page.getByTestId('view-canvas').locator('[data-node="o-legend"] [data-legend-entry]')

test('notes, groups, legends and view references are made and kept (#134)', async ({ page }) => {
  await startEmpty(page)
  // Nothing to report: the dialog closes on its own once the model has landed.
  await importWorkspaceFile(page, FIXTURE)
  await expect(modelCounts(page)).toContainText('3 elements · 1 relation')
  await expect(page.getByRole('dialog', { name: 'Import' })).toBeHidden()

  const tree = page.getByRole('tree', { name: 'Model tree' })
  await tree.getByRole('treeitem', { name: 'Views', exact: true }).click()
  await tree.getByRole('treeitem', { name: 'Main' }).click()
  const canvas = page.getByTestId('view-canvas')
  await expect(canvas.locator('[data-node]')).toHaveCount(MAIN.nodes)
  await expect(canvas.locator('[data-kind="legend"]')).toHaveCount(1)
  // The legend lists what the view draws: two element types and one relationship type.
  await expect(legendEntries(page)).toHaveText([
    'Business Actor',
    'Application Component',
    'Serving relation',
  ])

  // Zoomed out, the drawing leaves the right of the canvas empty.
  await page.getByRole('button', { name: 'Zoom out' }).click()
  await page.getByRole('button', { name: 'Zoom out' }).click()
  const palette = page.getByRole('region', { name: 'Palette' })
  const area = (await page.locator('.view-screen__canvas').boundingBox())!

  // A note, its two lines typed in place; ⌘Z in the field is the field's.
  await palette.getByRole('button', { name: 'Note', exact: true }).click()
  await clickCanvas(page, area.width - 260, 40)
  const text = page.getByRole('textbox', { name: 'Note text' })
  await expect(text).toBeFocused()
  await page.keyboard.type('First')
  await page.keyboard.press('Enter')
  await page.keyboard.type('second oops')
  // The browser undoes some of the typing, in steps of its own; the model keeps the note.
  await page.keyboard.press('ControlOrMeta+z')
  await expect(text).not.toHaveValue('First\nsecond oops')
  await expect(text).toBeFocused()
  await expect(canvas.locator('[data-node]')).toHaveCount(MAIN.nodes + 1)
  await text.fill('First\nsecond')
  await page.keyboard.press('ControlOrMeta+Enter')
  await expect(text).toBeHidden()
  const note = canvas.locator('[data-kind="note"]').last()
  await expect(note).toContainText('First')
  await expect(note).toContainText('second')

  // A group, documented in the selection panel; committed when the field is left.
  await palette.getByRole('button', { name: 'Group', exact: true }).click()
  await clickCanvas(page, area.width - 420, area.height - 160)
  await page.keyboard.press('Enter')
  const documentation = page.getByRole('textbox', { name: 'Documentation' })
  await documentation.click()
  await page.keyboard.type('Back office.')
  await page.getByRole('textbox', { name: 'Name', exact: true }).click()
  await expect(page.getByText(`${MAIN.nodes + 2} nodes`)).toBeVisible()
  // Escape leaves the field for the canvas, and a second one closes the panel.
  await page.keyboard.press('Escape')
  await expect(page.locator('.view-screen__canvas')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('complementary', { name: 'Selected group' })).toBeHidden()

  // The Detail view, dragged in from the model tree, draws a reference to it.
  await tree
    .getByRole('treeitem', { name: 'Detail' })
    .dragTo(page.locator('.view-screen__canvas'), {
      targetPosition: { x: area.width - 120, y: area.height / 2 },
    })
  await expect(canvas.locator('[data-kind="view-ref"]')).toHaveCount(2)
  await expect(page.getByRole('complementary', { name: 'Selected view reference' })).toBeVisible()

  // An element of a type the view does not draw: the legend gains it.
  await palette.getByRole('button', { name: 'Goal', exact: true }).click()
  await clickCanvas(page, 40, area.height - 80)
  await page.keyboard.press('Enter')
  await expect(legendEntries(page)).toHaveText([
    'Business Actor',
    'Application Component',
    'Goal',
    'Serving relation',
  ])

  // Outside the fields, undo takes the edits back one at a time: the goal, the
  // reference, the group's documentation, its placing, the note's text, the note.
  await expect(page.locator('.view-screen__canvas')).toBeFocused()
  await page.keyboard.press('ControlOrMeta+z')
  await expect(legendEntries(page)).toHaveCount(3)
  await page.keyboard.press('ControlOrMeta+z')
  await expect(canvas.locator('[data-kind="view-ref"]')).toHaveCount(1)
  for (let i = 0; i < 4; i += 1) await page.keyboard.press('ControlOrMeta+z')
  await expect(canvas.locator('[data-node]')).toHaveCount(MAIN.nodes)
  await expect(page.locator('.view-screen').getByRole('alert')).toHaveCount(0)

  // A legend placed from the palette lists the same.
  await palette.getByRole('button', { name: 'Legend', exact: true }).click()
  await clickCanvas(page, area.width - 260, 40)
  await expect(canvas.locator('[data-kind="legend"]')).toHaveCount(2)
  await expect(
    canvas.locator('[data-kind="legend"]').last().locator('[data-legend-entry]'),
  ).toHaveCount(3)
})
