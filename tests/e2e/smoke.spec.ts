import {
  test,
  expect,
  openApp,
  startEmpty,
  loadDemo,
  DEMO,
  waitForPersistedWorkspace,
} from './support'

/**
 * Journey 1 — smoke.
 *
 * Does the thing GitHub Pages serves actually come up? The base path, the two
 * themes, and a deep link that survives a hard refresh are the three ways this
 * app has to break in production without breaking in a unit test.
 *
 * Manual counterpart: `tests/manual/smoke.md`.
 */

test('the app boots on the Pages base path', async ({ page }) => {
  await openApp(page)

  await expect(page).toHaveTitle('Archipelagooo')
  expect(new URL(page.url()).pathname).toMatch(/^\/Enterprise-Architecture\//)

  // A cold browser has no workspace, so this is the first-run screen.
  await expect(page.getByRole('heading', { name: 'Archipelago' })).toBeVisible()
  // Self-hosted fonts, not a CDN: the wordmark must not fall back to a system face.
  await expect(page.locator('body')).toHaveCSS('font-family', /Space Grotesk/)
})

test.fixme('a cold boot goes straight to first run', async ({ page }) => {
  // Fails today, deliberately recorded rather than deleted: a cold boot renders
  // the read-only takeover screen, then the empty shell (which rewrites the URL
  // to /inventory), and only then first run. Issue #32 — un-fixme when fixed.
  const headings: string[] = []
  await page.addInitScript(() => {
    const seen: string[] = []
    Object.defineProperty(window, '__headings', { value: seen })
    const record = () => {
      const heading = document.querySelector('h1')?.textContent ?? ''
      if (heading && seen[seen.length - 1] !== heading) seen.push(heading)
    }
    document.addEventListener('DOMContentLoaded', () => {
      new MutationObserver(record).observe(document.body, { childList: true, subtree: true })
      record()
    })
  })

  await openApp(page)
  await expect(page.getByRole('heading', { name: 'Archipelago' })).toBeVisible()

  headings.push(
    ...(await page.evaluate(() => (window as unknown as { __headings: string[] }).__headings)),
  )
  expect(headings).toEqual(['Archipelago'])
  expect(new URL(page.url()).pathname).toBe('/Enterprise-Architecture/')
})

test('both themes render and the choice survives a reload', async ({ page }) => {
  await startEmpty(page)

  const html = page.locator('html')
  const body = page.locator('body')

  // Playwright reports a light colour scheme, so the app resolves to light.
  await expect(html).toHaveAttribute('data-theme', 'light')
  const light = await body.evaluate((node) => getComputedStyle(node).backgroundColor)

  await page.getByRole('button', { name: 'Switch to dark theme' }).click()
  await expect(html).toHaveAttribute('data-theme', 'dark')
  const dark = await body.evaluate((node) => getComputedStyle(node).backgroundColor)

  // tokens.css is the single source of colour; if it did not apply, these match.
  expect(dark).not.toBe(light)
  expect(light).not.toBe('rgba(0, 0, 0, 0)')
  expect(dark).not.toBe('rgba(0, 0, 0, 0)')

  await page.reload()
  await expect(html).toHaveAttribute('data-theme', 'dark')
})

test('a deep link survives a hard refresh', async ({ page }) => {
  await loadDemo(page)
  await waitForPersistedWorkspace(page, DEMO.elements)

  // Pages serves this through the 404 redirect; vite preview through its SPA
  // fallback. Either way the route has to come back, not a blank page.
  await openApp(page, 'inventory?facets=layer%3Aapp&view=cards')

  await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'CARDS' })).toHaveAttribute('aria-pressed', 'true')
})
