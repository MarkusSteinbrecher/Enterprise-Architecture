import { afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import claimsXml from '@/io/fixtures/claims-platform.xml?raw'
import { importExchangeXml } from '@/io'
import type { Point, View } from '@/model'
import { ModelStore, ModelStoreContext, type ModelStoreContextValue, type TabRole } from '@/store'
import { ViewScreen } from '@/ui/views/ViewScreen'

/**
 * The view editor's harness (#128, #129): the claims landscape on the canvas,
 * driven as a user drives it, with the store's own `dispatch` counted so "one
 * gesture, one command" is measured where the command is made.
 *
 * jsdom lays nothing out, so the canvas measures 0 × 0 and the viewport stays
 * at its origin and 100%: a client point is a view point.
 */

export const LANDSCAPE = 'v-landscape'

afterEach(() => {
  vi.restoreAllMocks()
})

/**
 * The canvas's box on screen. jsdom lays nothing out and reports 0 × 0, which
 * would put every pointer at the canvas edge and start auto-scroll on every
 * drag, so the canvas is given a screen-sized box at the origin.
 */
export const SCREEN = { width: 2000, height: 1500 }

export function setup(
  role: TabRole = 'writer',
  { prepare }: { prepare?: (store: ModelStore) => void } = {},
) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    const box = this.classList.contains('view-screen__canvas') ? SCREEN : { width: 0, height: 0 }
    return {
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: box.width,
      bottom: box.height,
      ...box,
      toJSON: () => ({}),
    } as DOMRect
  })
  const workspace = importExchangeXml(claimsXml, 'claims-platform.xml').workspace!
  const store = new ModelStore(workspace)
  prepare?.(store)
  const dispatch = vi.spyOn(store, 'dispatch')
  const value = { store, role, ready: true } as unknown as ModelStoreContextValue
  render(
    <MemoryRouter
      initialEntries={[`/view/${LANDSCAPE}`]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ModelStoreContext.Provider value={value}>
        <Routes>
          <Route path="/view/:id" element={<ViewScreen />} />
        </Routes>
      </ModelStoreContext.Provider>
    </MemoryRouter>,
  )
  const user = userEvent.setup()
  const canvas = screen.getByTestId('view-canvas')
  const nodeEl = (id: string) => canvas.querySelector(`[data-node="${id}"]`)!
  const view = (): View => store.view(LANDSCAPE)!
  return { store, dispatch, user, canvas, nodeEl, view }
}

/** Where a node is drawn: its `<g>` is translated to its absolute position. */
export function drawnAt(el: Element): Point {
  const match = /translate\(([-\d.e]+) ([-\d.e]+)\)/.exec(el.getAttribute('transform') ?? '')
  if (!match) throw new Error('no translate')
  return { x: Number(match[1]), y: Number(match[2]) }
}

export type User = ReturnType<typeof userEvent.setup>

/** Press on `target` at `from`, move through `to`, release there. */
export async function drag(user: User, target: Element, from: Point, ...to: Point[]) {
  const end = to[to.length - 1]!
  await user.pointer([
    { keys: '[MouseLeft>]', target, coords: { clientX: from.x, clientY: from.y } },
    ...to.map((p) => ({ target, coords: { clientX: p.x, clientY: p.y } })),
    { keys: '[/MouseLeft]', target, coords: { clientX: end.x, clientY: end.y } },
  ])
}

export async function click(user: User, target: Element, at: Point, keys?: string) {
  if (keys) await user.keyboard(`{${keys}>}`)
  await user.pointer([
    { keys: '[MouseLeft>]', target, coords: { clientX: at.x, clientY: at.y } },
    { keys: '[/MouseLeft]', target, coords: { clientX: at.x, clientY: at.y } },
  ])
  if (keys) await user.keyboard(`{/${keys}}`)
}
