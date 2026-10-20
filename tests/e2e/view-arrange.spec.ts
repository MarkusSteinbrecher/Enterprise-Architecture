import { fileURLToPath } from 'node:url'
import type { Page } from '@playwright/test'
import {
  test,
  expect,
  dirtyCount,
  importWithNothingToReport,
  importWorkspaceFile,
  saveWorkspaceFile,
  startEmpty,
  waitForPersistedWorkspace,
} from './support'

/**
 * Journey 19 — layout aids (#136), in a real browser: the grid with Archi's
 * defaults, a guide that snaps a shape and only within its threshold, align,
 * and z-order, each one command; then the arranged model saved, imported and
 * saved again byte for byte, with the drawing order in the file. The canvas is
 * fitted here, so the zoom is not 100%, and every screen distance is worked out
 * from the zoom the canvas really has.
 */

const FIXTURE = fileURLToPath(new URL('../../src/io/fixtures/claims-platform.xml', import.meta.url))
const CLAIMS = { elements: 39, relationships: 48 } as const

// This journey drives snapping, so it keeps Archi's defaults (see `snapping` in support.ts).
// A larger window than the default, so the shapes it drags are clear of the
// canvas edge, where a drag scrolls the view.
test.use({ snapping: true, viewport: { width: 1600, height: 1000 } })

/** Where a node is drawn, in view coordinates: its `<g>` is translated there. */
async function drawnAt(page: Page, id: string): Promise<{ x: number; y: number }> {
  const transform = await page
    .getByTestId('view-canvas')
    .locator(`[data-node="${id}"]`)
    .getAttribute('transform')
  const match = /translate\(([-\d.e]+) ([-\d.e]+)\)/.exec(transform ?? '')
  if (!match) throw new Error(`no translate on ${id}`)
  return { x: Number(match[1]), y: Number(match[2]) }
}

/** The canvas's zoom, from the transform of the group that holds the drawing. */
async function zoom(page: Page): Promise<number> {
  const transform = await page
    .getByTestId('view-canvas')
    .locator(':scope > g')
    .first()
    .getAttribute('transform')
  const match = /scale\(([-\d.e]+)\)/.exec(transform ?? '')
  if (!match) throw new Error('no scale on the drawing')
  return Number(match[1])
}

/**
 * Press on a node's middle and move it by (dx, dy) screen pixels; `hold` runs
 * before the release. The selection is cleared first: the panel a selection
 * opens narrows the canvas and would cover the shapes on its right.
 */
async function dragBy(page: Page, id: string, dx: number, dy: number, hold?: () => Promise<void>) {
  await page.locator('.view-screen__canvas').press('Escape')
  await expect(page.locator('.view-panel')).toHaveCount(0)
  const box = (await page.getByTestId('view-canvas').locator(`[data-node="${id}"]`).boundingBox())!
  const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + dx, from.y + dy, { steps: 6 })
  await hold?.()
  await page.mouse.up()
}

test('the grid, guides, align and z-order arrange a view, each as one command (#136)', async ({
  page,
}, testInfo) => {
  await startEmpty(page)
  await importWithNothingToReport(page, FIXTURE, CLAIMS)
  const tree = page.getByRole('tree', { name: 'Model tree' })
  await tree.getByRole('treeitem', { name: 'Views', exact: true }).click()
  await tree.getByRole('treeitem', { name: 'Landscapes' }).click()
  await tree.getByRole('treeitem', { name: 'Claims landscape' }).click()
  const canvas = page.getByTestId('view-canvas')
  await expect(canvas.locator('[data-node]')).toHaveCount(45)
  const button = (name: string) => page.getByRole('button', { name, exact: true })

  // Archi's defaults: the grid hidden, snapping to it and to guides on.
  await expect(button('Grid Visible')).toHaveAttribute('aria-pressed', 'false')
  await expect(button('Snap to Grid')).toHaveAttribute('aria-pressed', 'true')
  await expect(button('Snap to Alignment Guides')).toHaveAttribute('aria-pressed', 'true')
  await button('Grid Visible').click()
  await expect(page.getByTestId('grid')).toBeVisible()

  // A preference, so it outlives a reload.
  await waitForPersistedWorkspace(page, CLAIMS.elements)
  await page.reload()
  await expect(canvas.locator('[data-node]')).toHaveCount(45)
  await expect(button('Grid Visible')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('grid')).toBeVisible()

  const z = await zoom(page)
  expect(z).toBeLessThan(1)
  // Fit puts the right-hand column, which these drags use, at the canvas's
  // edge, where a drag scrolls the view (#128): a plain wheel pans it inward.
  const area = (await page.locator('.view-screen__canvas').boundingBox())!
  await page.mouse.move(area.x + area.width / 2, area.y + area.height / 2)
  await page.mouse.wheel(400, 0)
  await expect
    .poll(async () => (await canvas.locator('[data-node="o-zurich"]').boundingBox())!.x)
    .toBeLessThan(area.x + area.width - 400)

  // The grid on, guides off: Zurich, at the top level, ends on a 12 grid.
  await button('Snap to Alignment Guides').click()
  let dirty = await dirtyCount(page)
  await dragBy(page, 'o-zurich', 37, 23)
  await expect.poll(() => dirtyCount(page)).toBe(dirty + 1)
  const snapped = await drawnAt(page, 'o-zurich')
  expect([snapped.x % 12, snapped.y % 12]).toEqual([0, 0])

  // The grid off: it ends where it was let go.
  await button('Snap to Grid').click()
  dirty = await dirtyCount(page)
  await dragBy(page, 'o-zurich', 37, 23)
  await expect.poll(() => dirtyCount(page)).toBe(dirty + 1)
  expect(await drawnAt(page, 'o-zurich')).toEqual({
    x: snapped.x + Math.round(37 / z),
    y: snapped.y + Math.round(23 / z),
  })

  // Guides on: Zurich's left edge brought 3 screen pixels right of the platform
  // group's right edge (x 1200) snaps onto it, and the guide shows while dragging.
  await button('Snap to Alignment Guides').click()
  const before = await drawnAt(page, 'o-zurich')
  const toEdge = (gap: number) => Math.round((1200 - before.x) * z) + gap
  await dragBy(page, 'o-zurich', toEdge(3), 0, async () => {
    await expect(page.getByTestId('guide')).toHaveAttribute('data-at', '1200')
  })
  await expect(page.getByTestId('guide')).toHaveCount(0)
  expect((await drawnAt(page, 'o-zurich')).x).toBe(1200)
  // 7 screen pixels away is past the threshold: no guide, and no snap.
  await dragBy(page, 'o-zurich', 7, 0, async () => {
    await expect(canvas.locator('[data-node="o-zurich"]')).not.toHaveAttribute(
      'transform',
      /^translate\(1200 /,
    )
    await expect(page.getByTestId('guide')).toHaveCount(0)
  })
  expect((await drawnAt(page, 'o-zurich')).x).toBe(1200 + Math.round(7 / z))

  // Align Left: Customer, then Insurant, the primary; one command. Panned back
  // first, as the left-hand shapes went under the palette.
  await page.mouse.move(area.x + area.width / 2, area.y + area.height / 2)
  await page.mouse.wheel(-400, 0)
  await expect
    .poll(async () => (await canvas.locator('[data-node="o-customer"]').boundingBox())!.x)
    .toBeGreaterThan(area.x)
  // On the shape's own box, as journey 7 clicks one: a press elsewhere in its
  // bounds can find the group drawn behind it.
  const click = (id: string, modifiers?: ['Shift']) =>
    canvas
      .locator(`[data-node="${id}"] > [data-shape] > rect`)
      .first()
      .click({ position: { x: 8, y: 30 }, ...(modifiers ? { modifiers } : {}) })
  await click('o-customer')
  await click('o-insurant', ['Shift'])
  await expect(page.locator('[data-selected="o-customer"]:not([data-primary])')).toHaveCount(1)
  await expect(page.locator('[data-selected="o-insurant"][data-primary]')).toHaveCount(1)
  await expect(page.getByTestId('selection')).toHaveCount(2)
  dirty = await dirtyCount(page)
  expect((await drawnAt(page, 'o-customer')).x).toBeLessThan((await drawnAt(page, 'o-insurant')).x)
  await button('Align Left').click()
  await expect.poll(() => dirtyCount(page)).toBe(dirty + 1)
  expect((await drawnAt(page, 'o-customer')).x).toBe((await drawnAt(page, 'o-insurant')).x)

  // Bring To Front: Rules Evaluation, drawn under Premium Calculation in the engine, now over it.
  const engineChildren = () =>
    canvas
      .locator('[data-parent="o-engine"]')
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-node')))
  expect(await engineChildren()).toEqual(['o-rules', 'o-calc'])
  await click('o-rules')
  dirty = await dirtyCount(page)
  await button('Bring To Front').click()
  await expect.poll(() => dirtyCount(page)).toBe(dirty + 1)
  expect(await engineChildren()).toEqual(['o-calc', 'o-rules'])
  await expect(button('Bring To Front')).toHaveAttribute('aria-disabled', 'true')
  await expect(button('Bring To Front')).toBeFocused()

  // Saved, imported and saved again: the same bytes, the engine's children in their new order.
  const first = await saveWorkspaceFile(page, testInfo.outputPath('arranged.json'))
  const landscape = (
    JSON.parse(first) as {
      views: { id: string; nodes: { id: string; parent?: string }[] }[]
    }
  ).views.find((v) => v.id === 'v-landscape')!
  expect(landscape.nodes.filter((n) => n.parent === 'o-engine').map((n) => n.id)).toEqual([
    'o-calc',
    'o-rules',
  ])
  await importWorkspaceFile(page, testInfo.outputPath('arranged.json'))
  await expect(page.getByRole('dialog', { name: 'Import' })).toBeHidden()
  const second = await saveWorkspaceFile(page, testInfo.outputPath('arranged-again.json'))
  expect(second).toBe(first)
})
