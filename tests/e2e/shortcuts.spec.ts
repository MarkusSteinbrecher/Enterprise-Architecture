import { test, expect, openApp, loadDemo } from './support'

/**
 * Journey — global shortcuts stand down under a dialog (#158).
 *
 * Every global binding runs through one window listener that checks for an open
 * modal first. The unit tests drive it in jsdom; this drives it with real key
 * presses in a real browser, where ⌘K and ⌘S also have defaults of their own.
 */

test('⌘K does nothing under a dialog, and opens the palette once it closes', async ({ page }) => {
  await openApp(page)
  await loadDemo(page)

  await page.getByRole('button', { name: 'Import' }).click()
  const importDialog = page.getByRole('dialog', { name: 'Import' })
  await expect(importDialog).toBeVisible()
  await page.keyboard.press('ControlOrMeta+k')
  await page.keyboard.press('g')
  // Presence first: the dialog is still up and still the only one.
  await expect(importDialog).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Command palette' })).toHaveCount(0)

  await page.keyboard.press('Escape')
  await expect(importDialog).toHaveCount(0)
  await page.keyboard.press('ControlOrMeta+k')
  const palette = page.getByRole('dialog', { name: 'Command palette' })
  await expect(palette).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(palette).toHaveCount(0)

  // And the bare letter that the dialog held back now acts.
  await page.keyboard.press('g')
  await expect(page.getByRole('heading', { name: 'Dependency graph' })).toBeVisible()
})
