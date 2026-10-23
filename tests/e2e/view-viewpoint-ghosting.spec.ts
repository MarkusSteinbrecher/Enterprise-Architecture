import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { test, expect, importWithNothingToReport, startEmpty } from './support'

/**
 * Journey 21 — a viewpoint ghosts what it does not allow (#194). An imported
 * view is given Application Cooperation: Customer, a Business Actor, is drawn
 * ghosted, and so is its row in the model tree; Claims Portal, an Application
 * Component, is not. The SVG export carries the ghosting as a number. With the
 * viewpoint cleared, Customer is drawn as before.
 *
 * Opacity is read as the browser computes it, which the unit tests cannot: the
 * shape's `opacity` attribute holds a token (`var(--ghost-opacity)`), and only
 * a real browser resolves one there.
 */

const FIXTURE = fileURLToPath(new URL('../../src/io/fixtures/claims-platform.xml', import.meta.url))

test('a viewpoint ghosts a disallowed shape and greys its tree row; None draws it again (#194)', async ({
  page,
}) => {
  await startEmpty(page)
  await importWithNothingToReport(page, FIXTURE, { elements: 39, relationships: 48 })

  const tree = page.getByRole('tree', { name: 'Model tree' })
  await tree.getByRole('treeitem', { name: 'Views', exact: true }).click()
  await tree.getByRole('treeitem', { name: 'Landscapes' }).click()
  await tree.getByRole('treeitem', { name: 'Claims landscape' }).click()
  await page.getByRole('searchbox', { name: 'Filter the model tree' }).fill('Customer')
  const canvas = page.getByTestId('view-canvas')
  const customer = canvas.locator('[data-node="o-customer"]')
  const portal = canvas.locator('[data-node="o-portal"]')
  const customerRow = tree.getByRole('treeitem', { name: 'BA Customer', exact: true })
  await expect(customer).toBeVisible()
  await expect(customer).toHaveCSS('opacity', '1')
  await expect(customerRow).not.toHaveClass(/tree__row--greyed/)
  // The greying is a colour, so it is read as the browser computes it: the class
  // alone passes with the stylesheet rule gone. `--ink3` must differ from the
  // name's own colour, or the check below could not tell greyed from not.
  const customerName = customerRow.locator('.tree__name')
  const plain = await customerName.evaluate((el) => getComputedStyle(el).color)
  const grey = await page.evaluate(() => {
    const probe = document.body.appendChild(document.createElement('span'))
    probe.style.color = 'var(--ink3)'
    const colour = getComputedStyle(probe).color
    probe.remove()
    return colour
  })
  expect(grey).not.toBe(plain)

  // Application Cooperation: Customer ghosted, at the token's opacity; Claims Portal not.
  const viewpoint = page.getByRole('combobox', { name: 'Viewpoint' })
  await viewpoint.selectOption('Application Cooperation')
  await expect(customer).toHaveAttribute('data-ghost', 'true')
  await expect(customer).toHaveCSS('opacity', '0.4')
  await expect(portal).toBeVisible()
  await expect(portal).toHaveCSS('opacity', '1')
  await expect(portal).not.toHaveAttribute('data-ghost')
  await expect(customerRow).toHaveClass(/tree__row--greyed/)
  await expect(customerName).toHaveCSS('color', grey)

  // The export writes the ghosting as a number, not as a token a file cannot resolve.
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export SVG' }).click()
  const svg = await readFile((await (await download).path())!, 'utf8')
  // The built stylesheet spells the token `.4`; any spelling of the number will do.
  const opacity = /<g data-node="o-customer"[^>]* opacity="([^"]+)"/.exec(svg)?.[1]
  expect(Number(opacity)).toBe(0.4)
  expect(svg).not.toContain('var(--ghost-opacity)')

  // None: drawn as before, and the tree row no longer greyed.
  await viewpoint.selectOption('None')
  await expect(customer).toBeVisible()
  await expect(customer).toHaveCSS('opacity', '1')
  await expect(customer).not.toHaveAttribute('data-ghost')
  await expect(canvas.locator('[data-ghost]')).toHaveCount(0)
  await expect(customerRow).toBeVisible()
  await expect(customerRow).not.toHaveClass(/tree__row--greyed/)
  await expect(customerName).toHaveCSS('color', plain)
  await expect(page.locator('.view-screen').getByRole('alert')).toHaveCount(0)
})
