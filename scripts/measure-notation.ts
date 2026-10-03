/**
 * Rendering measurement for the ArchiMate notation (#77): 500 shapes in one SVG,
 * in real Chromium, at 1× and 4× CPU throttle.
 *
 * The gallery is a dev-only route, so this runs against the **dev server**,
 * whose React build is slower than production: the numbers are an upper bound.
 *
 * Usage: start `npx vite --port 5179`, then `npx vite-node scripts/measure-notation.ts`.
 * Exits non-zero if a bound fails.
 */
import { chromium } from '@playwright/test'

const URL =
  process.env.NOTATION_URL ??
  'http://localhost:5179/Enterprise-Architecture/dev/notation?stress=500'
const COUNT = 500

/** Budgets. The count is the lower bound: a page that rendered nothing is fast too. */
const BUDGET = { renderMs: { 1: 500, 4: 1500 }, frameP95Ms: { 1: 34, 4: 50 } } as const

let failed = false
const browser = await chromium.launch()
for (const throttle of [1, 4] as const) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle })
  await page.goto(URL)
  // Render start to the frame after paint, timed by the component itself: excludes
  // fetching the dev server's modules, which is not rendering.
  const renderMs = Number(
    await page.locator('[data-testid=stress][data-render-ms]').getAttribute('data-render-ms'),
  )
  const shapes = await page.locator('[data-testid=stress] [data-shape]').count()

  // Interactive: frame times while scrolling across the whole sheet and hovering.
  await page.evaluate(() => {
    const w = window as unknown as { __frames: number[]; __run: boolean }
    w.__frames = []
    w.__run = true
    let last = performance.now()
    const tick = (t: number) => {
      w.__frames.push(t - last)
      last = t
      if (w.__run) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
  for (let i = 0; i < 40; i++) {
    await page.mouse.move(100 + i * 30, 200 + (i % 10) * 50)
    await page.mouse.wheel(i % 2 ? 60 : 0, 80)
  }
  const frames = await page.evaluate(() => {
    const w = window as unknown as { __frames: number[]; __run: boolean }
    w.__run = false
    return w.__frames.slice(1).sort((a, b) => a - b)
  })
  const p50 = frames[Math.floor(frames.length * 0.5)] ?? NaN
  const p95 = frames[Math.floor(frames.length * 0.95)] ?? NaN

  const ok =
    shapes === COUNT &&
    renderMs > 0 &&
    renderMs < BUDGET.renderMs[throttle] &&
    frames.length > 10 &&
    p95 < BUDGET.frameP95Ms[throttle]
  if (!ok) failed = true
  console.log(
    JSON.stringify({
      throttle: `${throttle}x`,
      shapes,
      renderMs: Math.round(renderMs),
      frames: frames.length,
      frameP50Ms: +p50.toFixed(1),
      frameP95Ms: +p95.toFixed(1),
      budget: { renderMs: BUDGET.renderMs[throttle], frameP95Ms: BUDGET.frameP95Ms[throttle] },
      ok,
    }),
  )
  await page.close()
}
await browser.close()
process.exit(failed ? 1 : 0)
