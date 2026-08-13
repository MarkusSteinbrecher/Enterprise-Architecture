import { test, expect, loadDemo, graphNodes, reportStats, DEMO } from './support'

/**
 * Journey 5 — the dependency graph lays out in a real browser.
 *
 * This harness exists for exactly this: its own docblock says the two things
 * most likely to break in production and nowhere else are the base path and the
 * production bundle — *"workers, code-split chunks, the 404 redirect"*. And then
 * no journey ever opened the graph, so #54 shipped a graph that failed in every
 * browser on six green checks. `elk.bundled.js` refuses to hand back a
 * constructor when it detects a worker scope, which no jsdom test can see,
 * because jsdom defines `document` and takes elkjs's other branch.
 *
 * So the assertions here are deliberately about *where* the work happened, not
 * only that pixels appeared: a unit test can prove `computeLayout` works, and
 * only a browser can prove the worker Vite built actually starts and answers.
 */

test('the demo lays out in the worker and draws every element', async ({ page }) => {
  // Record every Worker the app constructs. `runLayout` falls back to the main
  // thread whenever the worker is merely *unavailable*, so "nodes appeared" on
  // its own would stay green with the worker completely dead.
  await page.addInitScript(() => {
    const Native = window.Worker
    const urls: string[] = []
    Object.defineProperty(window, '__workerUrls', { value: urls })
    window.Worker = class extends Native {
      constructor(scriptUrl: string | URL, options?: WorkerOptions) {
        urls.push(String(scriptUrl))
        super(scriptUrl, options)
      }
    }
  })

  await loadDemo(page)
  await page.getByRole('link', { name: /Dependency graph/ }).click()
  await expect(page.getByRole('heading', { name: 'Dependency graph' })).toBeVisible()

  // One node per demo element, drawn on the canvas. This is the assertion that
  // fails against #54 — verified by reverting the fix, which draws none.
  await expect(graphNodes(page)).toHaveCount(DEMO.elements)

  // Only *after* something positive has landed is an absence worth asserting.
  // `toHaveCount(0)` on the error is satisfied by a page that has not rendered
  // yet, so ahead of the count above it passed happily while the graph was
  // broken — one-sided in exactly the way CLAUDE.md warns about.
  await expect(page.getByRole('alert')).toHaveCount(0)

  // `laying out…` is appended to the stats line until the layout lands, and the
  // export button is disabled for as long as there is nothing to export — both
  // are the screen's own record that a layout *result* arrived, not just that
  // the error branch stayed quiet.
  await expect(reportStats(page)).toHaveText(
    `${DEMO.elements} nodes · ${DEMO.relationships} relations · time point ${new Date().getFullYear()}`,
  )
  await expect(page.getByRole('button', { name: 'Export SVG' })).toBeEnabled()

  const workerUrls = await page.evaluate(
    () => (window as unknown as { __workerUrls: string[] }).__workerUrls,
  )
  expect(workerUrls).toEqual(expect.arrayContaining([expect.stringMatching(/layout\.worker/)]))
})
