import { fileURLToPath } from 'node:url'
import type { Locator, Page } from '@playwright/test'
import { test, expect, importWithNothingToReport, startEmpty } from './support'

/**
 * Journey 17 — a view's appearance, edited from the selection panel, and the
 * format painter (#135), in a real browser: a fill typed for two shapes at once
 * is drawn on both and undone in one step, the browser's own colour picker sets
 * a fill, the painter paints one shape's look onto another with a press, Reset
 * all puts a shape back as the notation draws it, and what was edited is there
 * after a reload. jsdom draws nothing and has no colour picker, so whether the
 * shapes are really painted is only known here.
 *
 * The shapes are on the landscape's left half: an open panel narrows the
 * canvas, and covers what is drawn at its right edge.
 */

const FIXTURE = fileURLToPath(new URL('../../src/io/fixtures/claims-platform.xml', import.meta.url))
const LANDSCAPE = { nodes: 45, connections: 40 } as const

/** The fill a shape's body is drawn with. */
function fillOf(canvas: Locator, node: string): Promise<string | null> {
  return canvas.locator(`[data-node="${node}"] > [data-shape] [fill]`).first().getAttribute('fill')
}

/** Press a shape's body near its top-left corner, clear of its name and of anything nested. */
async function press(canvas: Locator, node: string, modifiers?: ['Shift']) {
  await canvas
    .locator(`[data-node="${node}"] > [data-shape] [fill]`)
    .first()
    .click({ position: { x: 8, y: 8 }, ...(modifiers ? { modifiers } : {}) })
}

/**
 * A drawing's appearance in the newest snapshot autosave has written to
 * IndexedDB, which is what a reload restores. An appearance edit changes no
 * count, so `waitForPersistedWorkspace` cannot tell that it has landed.
 */
function persistedAppearance(page: Page, node: string): Promise<unknown> {
  return page.evaluate(async (id) => {
    const databases = await indexedDB.databases()
    if (!databases.some((entry) => entry.name === 'archipelago')) return 'no database'
    return new Promise<unknown>((resolve, reject) => {
      const request = indexedDB.open('archipelago')
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const db = request.result
        if (!db.objectStoreNames.contains('snapshots')) {
          db.close()
          resolve('no snapshots')
          return
        }
        const all = db.transaction('snapshots', 'readonly').objectStore('snapshots').getAll()
        all.onerror = () => {
          db.close()
          reject(all.error)
        }
        all.onsuccess = () => {
          db.close()
          type Row = {
            savedAt: number
            workspace: { views: { id: string; nodes: { id: string; appearance?: unknown }[] }[] }
          }
          // Newest by time: each workspace numbers its own snapshots, and the
          // empty workspace the journey started from has some too.
          const rows = (all.result as Row[]).filter((row) =>
            row.workspace.views.some((v) => v.id === 'v-landscape'),
          )
          const newest = rows.reduce<Row | undefined>(
            (a, b) => (a && a.savedAt >= b.savedAt ? a : b),
            undefined,
          )
          const view = newest?.workspace.views.find((v) => v.id === 'v-landscape')
          resolve(view?.nodes.find((n) => n.id === id)?.appearance ?? 'none')
        }
      }
    })
  }, node)
}

async function undo(page: Page) {
  await page.locator('.view-screen__canvas').focus()
  await page.keyboard.press('ControlOrMeta+z')
}

test('a fill set for two shapes at once is one undo, the painter paints with a press, and both survive a reload (#135)', async ({
  page,
}) => {
  await startEmpty(page)
  await importWithNothingToReport(page, FIXTURE, { elements: 39, relationships: 48 })
  const tree = page.getByRole('tree', { name: 'Model tree' })
  await tree.getByRole('treeitem', { name: 'Views', exact: true }).click()
  await tree.getByRole('treeitem', { name: 'Landscapes' }).click()
  await tree.getByRole('treeitem', { name: 'Claims landscape' }).click()
  const canvas = page.getByTestId('view-canvas')
  await expect(canvas.locator('[data-node]')).toHaveCount(LANDSCAPE.nodes)
  await expect(canvas.locator('[data-connection]')).toHaveCount(LANDSCAPE.connections)

  const engineFill = '#c9e7f7'
  const customerFill = await fillOf(canvas, 'o-customer')
  expect(await fillOf(canvas, 'o-engine')).toBe(engineFill)
  // The customer is drawn in the notation's own colour: a token, not a hex.
  expect(customerFill).toMatch(/^var\(--/)

  // One shape: its overrides.
  await press(canvas, 'o-engine')
  const appearance = page.getByRole('region', { name: 'Appearance' })
  await expect(appearance.getByLabel('Fill', { exact: true })).toHaveValue(engineFill)

  // Two: a fill that differs is mixed. Typed once, drawn on both, one command.
  await press(canvas, 'o-customer', ['Shift'])
  await expect(page.getByRole('complementary', { name: 'Selected: 2 shapes' })).toBeVisible()
  const fill = appearance.getByLabel('Fill', { exact: true })
  await expect(fill).toHaveValue('')
  await expect(fill).toHaveAttribute('placeholder', 'Mixed')
  await fill.fill('#336699')
  await fill.press('Enter')
  await expect.poll(() => fillOf(canvas, 'o-engine')).toBe('#336699')
  expect(await fillOf(canvas, 'o-customer')).toBe('#336699')

  // An invalid colour stores nothing.
  await fill.fill('not a colour')
  await fill.press('Enter')
  await expect(fill).toHaveAttribute('aria-invalid', 'true')
  expect(await fillOf(canvas, 'o-customer')).toBe('#336699')

  // One undo puts each back: the engine's own fill, and none on the customer.
  await undo(page)
  await expect.poll(() => fillOf(canvas, 'o-engine')).toBe(engineFill)
  expect(await fillOf(canvas, 'o-customer')).toBe(customerFill)

  // The browser's colour picker, on the customer alone.
  await press(canvas, 'o-customer')
  await expect(page.getByRole('complementary', { name: 'Selected: Customer' })).toBeVisible()
  await appearance.getByLabel('Pick fill').fill('#00ff00')
  await expect.poll(() => fillOf(canvas, 'o-customer')).toBe('#00ff00')

  // The painter: the engine's look onto the portal, with a press.
  const portalFill = await fillOf(canvas, 'o-portal')
  expect(portalFill).not.toBe(engineFill)
  await press(canvas, 'o-engine')
  await appearance.getByRole('button', { name: 'Format painter' }).click()
  await expect(page.getByRole('status')).toContainText('Format painter')
  await press(canvas, 'o-portal')
  await expect.poll(() => fillOf(canvas, 'o-portal')).toBe(engineFill)
  await page.getByRole('status').getByRole('button', { name: 'Done' }).click()
  await expect(page.getByRole('status')).toHaveCount(0)
  await expect(page.locator('.view-screen__canvas')).toBeFocused()

  // Reset all: drawn as the notation draws it again.
  await press(canvas, 'o-portal')
  await appearance.getByRole('button', { name: 'Reset all' }).click()
  await expect.poll(() => fillOf(canvas, 'o-portal')).toBe(portalFill)

  // The picked fill is part of the model: it is there after a reload, and the
  // reset shape has no override.
  const stored = { timeout: 15_000 }
  await expect.poll(() => persistedAppearance(page, 'o-portal'), stored).toBe('none')
  await expect
    .poll(() => persistedAppearance(page, 'o-customer'), stored)
    .toEqual({
      fillColor: '#00ff00',
    })
  await page.reload()
  await expect(canvas.locator('[data-node]')).toHaveCount(LANDSCAPE.nodes)
  expect(await fillOf(canvas, 'o-customer')).toBe('#00ff00')
  expect(await fillOf(canvas, 'o-portal')).toBe(portalFill)
  await expect(page.locator('.view-screen').getByRole('alert')).toHaveCount(0)
})
