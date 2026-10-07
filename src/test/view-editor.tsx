import { afterEach, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useNavigate, type NavigateFunction } from 'react-router-dom'
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
  { prepare, viewId = LANDSCAPE }: { prepare?: (store: ModelStore) => void; viewId?: string } = {},
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
  const navigator: { current?: NavigateFunction } = {}
  render(
    <MemoryRouter
      initialEntries={[`/view/${viewId}`]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ModelStoreContext.Provider value={value}>
        <Routes>
          <Route path="/view/:id" element={<ViewScreen />} />
        </Routes>
        <Navigator into={navigator} />
      </ModelStoreContext.Provider>
    </MemoryRouter>,
  )
  const user = userEvent.setup()
  /** The canvas element that takes the gestures: there even when the view is empty and draws nothing. */
  const surface = document.querySelector<HTMLElement>('.view-screen__canvas')!
  // The drawing; an empty view has none, and its tests use `surface`.
  const canvas = screen.queryByTestId('view-canvas') ?? surface
  const nodeEl = (id: string) => surface.querySelector(`[data-node="${id}"]`)!
  const view = (): View => store.view(viewId)!
  /** Go to a URL, as the model tree does when it selects an element (`?element=`). */
  const go = (to: string) => act(() => void navigator.current?.(to))
  return { store, dispatch, user, canvas, surface, nodeEl, view, go }
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

/** Drop `data` on `target` at `at`, as a drag from the model tree does; whether the target took it. */
export function drop(target: Element, data: Record<string, string>, at: { x: number; y: number }) {
  const transfer = {
    types: Object.keys(data),
    getData: (type: string) => data[type] ?? '',
    dropEffect: 'none',
  }
  const over = new MouseEvent('dragover', {
    bubbles: true,
    cancelable: true,
    clientX: at.x,
    clientY: at.y,
  })
  Object.defineProperty(over, 'dataTransfer', { value: transfer })
  const dropped = new MouseEvent('drop', {
    bubbles: true,
    cancelable: true,
    clientX: at.x,
    clientY: at.y,
  })
  Object.defineProperty(dropped, 'dataTransfer', { value: transfer })
  let accepted = false
  act(() => {
    accepted = !target.dispatchEvent(over)
    if (accepted) target.dispatchEvent(dropped)
  })
  return accepted
}

export async function click(user: User, target: Element, at: Point, keys?: string) {
  if (keys) await user.keyboard(`{${keys}>}`)
  await user.pointer([
    { keys: '[MouseLeft>]', target, coords: { clientX: at.x, clientY: at.y } },
    { keys: '[/MouseLeft]', target, coords: { clientX: at.x, clientY: at.y } },
  ])
  if (keys) await user.keyboard(`{/${keys}}`)
}

/** Hands the router's `navigate` to the test, which renders outside any route. */
// A test harness is never hot-reloaded, so fast refresh's one-kind-of-export rule does not apply.
// eslint-disable-next-line react-refresh/only-export-components
function Navigator({ into }: { into: { current?: NavigateFunction } }) {
  into.current = useNavigate()
  return null
}
