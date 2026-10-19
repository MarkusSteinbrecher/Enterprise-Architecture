import { fileURLToPath } from 'node:url'
import type { Locator, Page } from '@playwright/test'
import { test, expect, importWithNothingToReport, startEmpty } from './support'

/**
 * Journey 16 — shaping a line by hand, and the view's router (#133), with the
 * browser's own pointer: a drag from a segment's handle makes one bend-point, a
 * drag of that bend-point moves it, a double-click removes it, and each is one
 * undo. Then the view switches to Manhattan, every line is drawn with only
 * horizontal and vertical segments, the handles go, and the router survives a
 * reload. The unit tests cannot see laid-out SVG: jsdom has no viewport, no
 * zoom and no hit testing, so whether a handle can be found and pressed where
 * it is drawn is only known here.
 */

const FIXTURE = fileURLToPath(new URL('../../src/io/fixtures/claims-platform.xml', import.meta.url))
const LANDSCAPE = { nodes: 45, connections: 40 } as const
const LINE = 'c-cust-ins'

type Point = { x: number; y: number }

/** A point `fraction` along an SVG path, in the page's coordinates. */
function pointAlong(path: Locator, fraction: number): Promise<Point> {
  return path.evaluate((el, f) => {
    const svg = el as SVGPathElement
    const p = svg.getPointAtLength(svg.getTotalLength() * f)
    const m = svg.getScreenCTM()!
    return { x: p.x * m.a + p.y * m.c + m.e, y: p.x * m.b + p.y * m.d + m.f }
  }, fraction)
}

async function centre(target: Locator): Promise<Point> {
  const box = (await target.boundingBox())!
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

async function drag(page: Page, from: Point, to: Point) {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 8 })
  await page.mouse.up()
}

/** The vertices of the line as drawn: its first path, M x,y L x,y …. */
function drawnRoute(page: Page, id: string): Promise<[number, number][]> {
  return page
    .locator(`[data-connection="${id}"] path`)
    .first()
    .evaluate((el) =>
      el
        .getAttribute('d')!
        .slice(1)
        .split('L')
        .map((pair) => pair.split(',').map(Number) as [number, number]),
    )
}

test('a line is bent, moved and straightened by hand, and a Manhattan view draws every line orthogonally (#133)', async ({
  page,
}) => {
  await startEmpty(page)
  // Nothing to report since relationship documentation is read (#95).
  await importWithNothingToReport(page, FIXTURE, { elements: 39, relationships: 48 })

  const tree = page.getByRole('tree', { name: 'Model tree' })
  await tree.getByRole('treeitem', { name: 'Views', exact: true }).click()
  await tree.getByRole('treeitem', { name: 'Landscapes' }).click()
  await tree.getByRole('treeitem', { name: 'Claims landscape' }).click()
  const canvas = page.getByTestId('view-canvas')
  await expect(canvas.locator('[data-node]')).toHaveCount(LANDSCAPE.nodes)
  await expect(canvas.locator('[data-connection]')).toHaveCount(LANDSCAPE.connections)

  // Select the straight line where it runs: one segment handle, no bend-point.
  expect(await drawnRoute(page, LINE)).toHaveLength(2)
  const hit = canvas.locator(`[data-line-hit="${LINE}"]`)
  const along = await pointAlong(hit, 0.3)
  await page.mouse.click(along.x, along.y)
  await expect(canvas.getByTestId('selection')).toHaveAttribute('data-selected', LINE)
  const handles = canvas.getByTestId('bend-handles')
  await expect(handles.locator('[data-segment]')).toHaveCount(1)
  await expect(handles.locator('[data-bendpoint]')).toHaveCount(0)

  // Add: drag the segment's handle away from the line. One bend-point, drawn through.
  const handle = await centre(handles.locator('[data-segment="0"]'))
  await drag(page, handle, { x: handle.x + 40, y: handle.y + 60 })
  await expect(handles.locator('[data-bendpoint]')).toHaveCount(1)
  await expect(handles.locator('[data-segment]')).toHaveCount(2)
  const bent = await drawnRoute(page, LINE)
  expect(bent).toHaveLength(3)

  // Move: drag the bend-point. Still one, somewhere else.
  const point = await centre(handles.locator('[data-bendpoint="0"]'))
  await drag(page, point, { x: point.x + 50, y: point.y })
  await expect.poll(() => drawnRoute(page, LINE)).not.toEqual(bent)
  const moved = await drawnRoute(page, LINE)
  expect(moved).toHaveLength(3)
  expect(moved[1]![0]).toBeGreaterThan(bent[1]![0])
  expect(moved[1]![1]).toBe(bent[1]![1])

  // Undo takes back the move alone, then the bend-point.
  await expect(page.locator('.view-screen__canvas')).toBeFocused()
  await page.keyboard.press('ControlOrMeta+z')
  await expect.poll(() => drawnRoute(page, LINE)).toEqual(bent)
  await page.keyboard.press('ControlOrMeta+z')
  await expect.poll(() => drawnRoute(page, LINE)).toHaveLength(2)

  // Redo it, then remove it with a double-click: straight again.
  await page.keyboard.press('ControlOrMeta+Shift+z')
  await expect.poll(() => drawnRoute(page, LINE)).toEqual(bent)
  // The line runs elsewhere now, so it is pressed where it is drawn.
  const onBent = await pointAlong(hit, 0.2)
  await page.mouse.click(onBent.x, onBent.y)
  await expect(canvas.getByTestId('selection')).toHaveAttribute('data-selected', LINE)
  await expect(handles.locator('[data-bendpoint]')).toHaveCount(1)
  await handles.locator('[data-bendpoint="0"]').dblclick()
  await expect(handles.locator('[data-bendpoint]')).toHaveCount(0)
  await expect.poll(() => drawnRoute(page, LINE)).toHaveLength(2)

  // Manhattan: some line is diagonal first, so the check below can fail.
  const routes = () =>
    canvas.locator('[data-connection]').evaluateAll((lines) =>
      lines.map((line) =>
        line
          .querySelector('path')!
          .getAttribute('d')!
          .slice(1)
          .split('L')
          .map((pair) => pair.split(',').map(Number)),
      ),
    )
  const diagonal = (route: number[][]) =>
    route.some((p, i) => i > 0 && p[0] !== route[i - 1]![0] && p[1] !== route[i - 1]![1])
  expect((await routes()).some(diagonal)).toBe(true)

  await page.getByRole('combobox', { name: 'Router' }).selectOption('manhattan')
  await expect.poll(async () => (await routes()).filter(diagonal).length).toBe(0)
  expect(await routes()).toHaveLength(LANDSCAPE.connections)
  const routed = await pointAlong(hit, 0.5)
  await page.mouse.click(routed.x, routed.y)
  await expect(canvas.getByTestId('selection')).toHaveAttribute('data-selected', LINE)
  await expect(handles).toHaveCount(0)

  // The router is part of the model: it is there after a reload.
  await page.reload()
  await expect(canvas.locator('[data-connection]')).toHaveCount(LANDSCAPE.connections)
  await expect(page.getByRole('combobox', { name: 'Router' })).toHaveValue('manhattan')
  expect((await routes()).filter(diagonal)).toEqual([])
  await expect(page.locator('.view-screen').getByRole('alert')).toHaveCount(0)
})
