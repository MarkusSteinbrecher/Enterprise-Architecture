import { test, expect, loadDemo, openApp, openElement } from './support'

/**
 * Journey — the ArchiMate guide (#149).
 *
 * The unit tests hold the guide's content to the model. This journey checks what
 * only a real browser and the production bundle can: a deep link to an entry
 * survives a hard refresh on the Pages base path, the browser scrolls the entry
 * into view, and the guide reflows in a narrow column without scrolling sideways.
 *
 * Manual counterpart: `tests/manual/guide.md`.
 */

test('a deep link to an entry survives a hard refresh and lands on it', async ({ page }) => {
  await openApp(page, 'guide#DataObject')

  await expect(page.getByRole('heading', { level: 1, name: 'ArchiMate guide' })).toBeVisible()
  const entry = page.locator('#DataObject')
  await expect(entry).toBeFocused()
  await expect(entry).toBeInViewport()

  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'ArchiMate guide' })).toBeVisible()
  await expect(page).toHaveURL(/\/Enterprise-Architecture\/guide#DataObject$/)
  await expect(page.locator('#DataObject')).toBeFocused()
  await expect(page.locator('#DataObject')).toBeInViewport()
})

test('the fact sheet opens the guide at its type', async ({ page }) => {
  await loadDemo(page)
  await openElement(page, 'CRM System')
  const typeLink = page.getByTitle(/Open the ArchiMate guide/)
  await expect(typeLink).toBeVisible()
  const href = await typeLink.getAttribute('href')
  const type = href?.slice(href.indexOf('#') + 1) ?? ''
  expect(type).not.toBe('')

  await typeLink.click()
  await expect(page.getByRole('heading', { level: 1, name: 'ArchiMate guide' })).toBeVisible()
  await expect(page.locator(`#${type}`)).toBeFocused()
  await expect(page.locator(`#${type}`)).toBeInViewport()
})

test('the guide reflows in a narrow column without scrolling sideways', async ({ page }) => {
  // The shell (nav, model tree) has no phone layout yet, so a phone-width window
  // leaves the guide no room at all. What the guide controls is its own reflow:
  // it is a size container, and here the shell leaves it less than 640px.
  await page.setViewportSize({ width: 760, height: 900 })
  await openApp(page, 'guide')

  const guide = page.locator('.guide')
  await expect(page.getByRole('heading', { level: 1, name: 'ArchiMate guide' })).toBeVisible()
  await expect(page.locator('#ApplicationComponent')).toBeAttached()
  const width = await guide.evaluate((el) => el.clientWidth)
  expect(width).toBeGreaterThan(200)
  expect(width).toBeLessThan(640)

  const overflow = await guide.evaluate((el) => el.scrollWidth - el.clientWidth)
  expect(overflow).toBe(0)

  // The framework collapsed to one column: its aspect headings gave way to labels in the cells.
  await expect(page.locator('.guide__fw-cell-label').first()).toBeVisible()
  await expect(page.locator('.guide__fw-row--head')).toBeHidden()
})
