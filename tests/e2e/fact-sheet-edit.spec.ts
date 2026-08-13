import {
  test,
  expect,
  loadDemo,
  openElement,
  assessmentCell,
  dirtyCount,
  waitForPersistedWorkspace,
  DEMO,
} from './support'

/**
 * Journey 4 — editing a fact sheet.
 *
 * An edit has to do three things at once: change what the sheet shows, add one
 * line of history, and move the save-state counter by exactly one. The counter
 * is the app's trust surface — it promises "this many changes are not in your
 * file" — so it is asserted on every step rather than at the end.
 *
 * **Not yet covered: undo and redo.** Issue #19 specifies this journey as
 * edit → undo → redo. The store has had both since #4, but neither is reachable
 * from the UI — no shortcut, no palette action — so there is nothing to drive.
 * Tracked in #31, which extends this spec to the full journey.
 *
 * Manual counterpart: `tests/manual/fact-sheet-edit.md`.
 */

const ELEMENT = 'CRM System'

test('changing a fit rating updates the sheet, the history and the dirty counter', async ({
  page,
}) => {
  await loadDemo(page)
  await openElement(page, ELEMENT)

  const functionalFit = assessmentCell(page, 'Functional fit')
  await expect(functionalFit).toContainText('Unreasonable')
  await expect(page.getByText('No changes to this element in this session.')).toBeVisible()

  const before = await dirtyCount(page)

  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await functionalFit.getByRole('combobox').selectOption({ label: 'Perfect' })

  // One edit, one command, one step on the counter.
  expect(await dirtyCount(page)).toBe(before + 1)

  await page.getByRole('button', { name: 'Done', exact: true }).click()
  await expect(functionalFit).toContainText('Perfect')

  // History names what changed rather than saying "modified".
  await expect(page.locator('.history__text').first()).toHaveText(
    `Updated assessment of “${ELEMENT}”`,
  )
})

test('two edits are two steps, and both survive a reload', async ({ page }) => {
  await loadDemo(page)
  await openElement(page, ELEMENT)

  const before = await dirtyCount(page)
  await page.getByRole('button', { name: 'Edit', exact: true }).click()

  await assessmentCell(page, 'Functional fit').getByRole('combobox').selectOption({
    label: 'Perfect',
  })
  await assessmentCell(page, 'Technical fit').getByRole('combobox').selectOption({
    label: 'Fully adequate',
  })
  expect(await dirtyCount(page)).toBe(before + 2)

  await page.getByRole('button', { name: 'Done', exact: true }).click()

  // Browser storage is a cache, but it has to survive the tab closing.
  await waitForPersistedWorkspace(page, DEMO.elements)
  await page.reload()

  await expect(page.getByRole('heading', { name: ELEMENT, exact: true })).toBeVisible()
  await expect(assessmentCell(page, 'Functional fit')).toContainText('Perfect')
  await expect(assessmentCell(page, 'Technical fit')).toContainText('Fully adequate')
  // A restored snapshot is not a file. Browser storage is a cache — Safari
  // evicts it after seven days — so a workspace that has only ever lived there
  // matches nothing on disk and must not present as SAVED, however many sessions
  // it has survived (#24). The edit above survives; the counter says it is still
  // unwritten, which is the honest reading of both facts.
  expect(await dirtyCount(page)).toBe(1)
})

test('the fact sheet returns to the inventory with its filters intact', async ({ page }) => {
  await loadDemo(page)
  await page.getByLabel('Filter by name').fill('crm')

  await openElement(page, ELEMENT)
  // The breadcrumb, not the nav item — it carries the filters back.
  await page.getByRole('link', { name: 'INVENTORY', exact: true }).click()

  await expect(page.getByLabel('Filter by name')).toHaveValue('crm')
})
