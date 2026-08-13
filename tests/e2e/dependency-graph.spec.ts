import { test, expect, loadDemo, graphNodes, reportStats, DEMO } from './support'

/**
 * Journey 6 — the dependency graph lays out in a real browser.
 *
 * This harness exists for exactly this: its own docblock says the two things
 * most likely to break in production and nowhere else are the base path and the
 * production bundle — *"workers, code-split chunks, the 404 redirect"*. And then
 * no journey ever opened the graph, so #54 shipped a graph that failed in every
 * browser on six green checks. `elk.bundled.js` refuses to hand back a
 * constructor when it detects a worker scope, which no jsdom test can see,
 * because jsdom defines `document` and takes elkjs's other branch.
 *
 * So the assertions are about *where* the work happened, not only that pixels
 * appeared: a unit test can prove `computeLayout` works, and only a browser can
 * prove the worker Vite built actually starts and answers.
 */

test('the demo lays out in the worker and draws every element', async ({ page }) => {
  // `layoutOnMainThread` is the only dynamic `import('./elk-runner')` in the app
  // (layout.ts:157), and Rollup gives it its own ~1.4MB chunk; the worker bundles
  // a separate copy and never fetches this one. So "elk-runner was never
  // requested" is what distinguishes a layout the worker produced from one the
  // fallback produced — and the fallback draws an identical graph, which is why
  // counting nodes cannot tell them apart.
  const requested: string[] = []
  page.on('request', (request) => requested.push(request.url()))

  await loadDemo(page)
  await page.getByRole('link', { name: /Dependency graph/ }).click()
  await expect(page.getByRole('heading', { name: 'Dependency graph' })).toBeVisible()

  // One node per demo element, drawn on the canvas. This is the assertion that
  // fails against #54 — verified by reverting the fix, which draws none.
  await expect(graphNodes(page)).toHaveCount(DEMO.elements)

  // Only *after* something positive has landed is an absence worth asserting:
  // `toHaveCount(0)` is satisfied by a page that has not rendered yet, so ahead
  // of the count above this passed happily while the graph was broken. Scoped to
  // the canvas and pinned to its text, so a live region added elsewhere later
  // cannot fail this journey for an unrelated reason.
  await expect(page.locator('.graph__canvas').getByRole('alert')).toHaveCount(0)

  // `· laying out…` is appended to the stats line until the layout lands, and the
  // export button stays disabled while there is nothing to export — both are the
  // screen's own record that a layout *result* arrived, not merely that the error
  // branch stayed quiet. The year is matched loosely: the page computes its own
  // `new Date().getFullYear()`, so pinning the digits from the test process would
  // fail across local midnight on 31 December and reproduce nowhere.
  await expect(reportStats(page)).toHaveText(
    new RegExp(`^${DEMO.elements} nodes · ${DEMO.relationships} relations · time point \\d{4}$`),
  )
  await expect(page.getByRole('button', { name: 'Export SVG' })).toBeEnabled()

  // The graph is on screen and correct. If the main thread never loaded ELK,
  // the worker is the only thing that can have laid it out.
  expect(requested.filter((url) => /elk-runner/.test(url))).toEqual([])
})
