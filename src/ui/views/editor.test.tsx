import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import claimsXml from '@/io/fixtures/claims-platform.xml?raw'
import { importExchangeXml } from '@/io'
import { absoluteBounds, type Point, type View } from '@/model'
import { ModelStore, ModelStoreContext, type ModelStoreContextValue, type TabRole } from '@/store'
import { ViewScreen } from './ViewScreen'

/**
 * The view editor (#128), driven through the canvas as a user drives it: real
 * pointer and key events, and the store's own `dispatch` counted, so "one
 * gesture, one command" is measured where the command is made.
 *
 * jsdom lays nothing out, so the canvas measures 0 × 0 and the viewport stays
 * at its origin and 100%: a client point is a view point.
 */

const LANDSCAPE = 'v-landscape'

afterEach(() => {
  vi.restoreAllMocks()
})

/**
 * The canvas's box on screen. jsdom lays nothing out and reports 0 × 0, which
 * would put every pointer at the canvas edge and start auto-scroll on every
 * drag, so the canvas is given a screen-sized box at the origin.
 */
const SCREEN = { width: 2000, height: 1500 }

function setup(role: TabRole = 'writer') {
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
function drawnAt(el: Element): Point {
  const match = /translate\(([-\d.e]+) ([-\d.e]+)\)/.exec(el.getAttribute('transform') ?? '')
  if (!match) throw new Error('no translate')
  return { x: Number(match[1]), y: Number(match[2]) }
}

type User = ReturnType<typeof userEvent.setup>

/** Press on `target` at `from`, move through `to`, release there. */
async function drag(user: User, target: Element, from: Point, ...to: Point[]) {
  const end = to[to.length - 1]!
  await user.pointer([
    { keys: '[MouseLeft>]', target, coords: { clientX: from.x, clientY: from.y } },
    ...to.map((p) => ({ target, coords: { clientX: p.x, clientY: p.y } })),
    { keys: '[/MouseLeft]', target, coords: { clientX: end.x, clientY: end.y } },
  ])
}

async function click(user: User, target: Element, at: Point, keys?: string) {
  if (keys) await user.keyboard(`{${keys}>}`)
  await user.pointer([
    { keys: '[MouseLeft>]', target, coords: { clientX: at.x, clientY: at.y } },
    { keys: '[/MouseLeft]', target, coords: { clientX: at.x, clientY: at.y } },
  ])
  if (keys) await user.keyboard(`{/${keys}}`)
}

describe('moving shapes (#128)', () => {
  it('moves a shape by a drag, as one command, and one undo puts it back', async () => {
    const { store, dispatch, user, nodeEl, view } = setup()
    const before = absoluteBounds(view(), 'o-customer')!
    expect(drawnAt(nodeEl('o-customer'))).toEqual({ x: before.x, y: before.y })

    await drag(user, nodeEl('o-customer'), { x: 60, y: 80 }, { x: 75, y: 85 }, { x: 90, y: 100 })

    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(absoluteBounds(view(), 'o-customer')).toMatchObject({
      x: before.x + 30,
      y: before.y + 20,
    })
    expect(drawnAt(nodeEl('o-customer'))).toEqual({ x: before.x + 30, y: before.y + 20 })

    act(() => void store.undo())
    expect(absoluteBounds(view(), 'o-customer')).toEqual(before)
    expect(drawnAt(nodeEl('o-customer'))).toEqual({ x: before.x, y: before.y })
  })

  it('opens the selection panel only once the press ends, so a drag keeps the canvas', async () => {
    const { user, nodeEl } = setup()
    await user.pointer({
      keys: '[MouseLeft>]',
      target: nodeEl('o-goal'),
      coords: { clientX: 1250, clientY: 70 },
    })
    // Selected at once, so it can be dragged; the panel waits.
    expect(screen.getAllByTestId('selection')).toHaveLength(1)
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    await user.pointer({
      keys: '[/MouseLeft]',
      target: nodeEl('o-goal'),
      coords: { clientX: 1250, clientY: 70 },
    })
    expect(screen.getByRole('complementary')).toBeInTheDocument()
  })

  it('records nothing for a drag that ends where it began', async () => {
    const { dispatch, user, nodeEl } = setup()
    await drag(user, nodeEl('o-customer'), { x: 60, y: 80 }, { x: 90, y: 100 }, { x: 60, y: 80 })
    expect(screen.getAllByTestId('selection').map((s) => s.getAttribute('data-selected'))).toEqual([
      'o-customer',
    ])
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('moves every selected shape together, Shift-click adding to the selection', async () => {
    const { dispatch, user, nodeEl, view } = setup()
    const goal = absoluteBounds(view(), 'o-goal')!
    const req = absoluteBounds(view(), 'o-req')!
    await click(user, nodeEl('o-goal'), { x: 1250, y: 70 })
    await click(user, nodeEl('o-req'), { x: 1250, y: 190 }, 'Shift')
    expect(screen.getAllByTestId('selection')).toHaveLength(2)

    await drag(user, nodeEl('o-req'), { x: 1250, y: 190 }, { x: 1270, y: 200 })
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(absoluteBounds(view(), 'o-goal')).toMatchObject({ x: goal.x + 20, y: goal.y + 10 })
    expect(absoluteBounds(view(), 'o-req')).toMatchObject({ x: req.x + 20, y: req.y + 10 })
  })

  it('carries a container’s children with it', async () => {
    const { user, nodeEl, view } = setup()
    const runtime = absoluteBounds(view(), 'o-runtime')!
    // o-k8s is at (180, 830); press on its own area, clear of its children.
    await drag(user, nodeEl('o-k8s'), { x: 190, y: 840 }, { x: 200, y: 850 }, { x: 205, y: 845 })
    expect(absoluteBounds(view(), 'o-runtime')).toMatchObject({
      x: runtime.x + 15,
      y: runtime.y + 5,
    })
    expect(drawnAt(nodeEl('o-runtime'))).toEqual({ x: runtime.x + 15, y: runtime.y + 5 })
  })

  it('takes a shape out of its group, keeping where it was dropped', async () => {
    const { dispatch, user, nodeEl, view } = setup()
    const scanner = absoluteBounds(view(), 'o-scanner')!
    expect(view().nodes.find((n) => n.id === 'o-scanner')!.parent).toBe('o-g-platform')
    // From (50, 870) inside o-g-platform to below every group.
    await drag(user, nodeEl('o-scanner'), { x: 50, y: 870 }, { x: 50, y: 1000 }, { x: 50, y: 1100 })
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(view().nodes.find((n) => n.id === 'o-scanner')!.parent).toBeUndefined()
    expect(absoluteBounds(view(), 'o-scanner')).toMatchObject({ x: scanner.x, y: scanner.y + 230 })
    expect(drawnAt(nodeEl('o-scanner'))).toEqual({ x: scanner.x, y: scanner.y + 230 })
  })

  it('puts a shape into the group it is dropped on, and shows where it will land', async () => {
    // (800, 840) is inside o-g-platform, between o-k8s and o-mainframe.
    const { user, nodeEl, view } = setup()
    const zurich = absoluteBounds(view(), 'o-zurich')!
    await user.pointer([
      { keys: '[MouseLeft>]', target: nodeEl('o-zurich'), coords: { clientX: 1250, clientY: 840 } },
      { target: nodeEl('o-zurich'), coords: { clientX: 800, clientY: 840 } },
    ])
    expect(screen.getByTestId('drop-target')).toBeInTheDocument()
    await user.pointer({
      keys: '[/MouseLeft]',
      target: nodeEl('o-zurich'),
      coords: { clientX: 800, clientY: 840 },
    })
    expect(view().nodes.find((n) => n.id === 'o-zurich')!.parent).toBe('o-g-platform')
    expect(absoluteBounds(view(), 'o-zurich')).toMatchObject({ x: zurich.x - 450, y: zurich.y })
    expect(screen.queryByTestId('drop-target')).not.toBeInTheDocument()
  })

  it('scrolls while a drag rests at the canvas edge, carrying the shape further', async () => {
    const { dispatch, user, nodeEl, view } = setup()
    const before = absoluteBounds(view(), 'o-goal')!
    const edge = { x: SCREEN.width - 2, y: 100 }
    await user.pointer([
      { keys: '[MouseLeft>]', target: nodeEl('o-goal'), coords: { clientX: 1250, clientY: 70 } },
      { target: nodeEl('o-goal'), coords: { clientX: edge.x, clientY: edge.y } },
    ])
    // Let the scroll run for a few frames with the pointer still at the edge.
    await act(() => new Promise((resolve) => setTimeout(resolve, 120)))
    await user.pointer({
      keys: '[/MouseLeft]',
      target: nodeEl('o-goal'),
      coords: { clientX: edge.x, clientY: edge.y },
    })
    expect(dispatch).toHaveBeenCalledTimes(1)
    // Without scrolling, the shape would land exactly the pointer's distance away.
    const moved = absoluteBounds(view(), 'o-goal')!.x - before.x
    expect(moved).toBeGreaterThan(edge.x - 1250)
  })

  it('carries the bend-points of a line whose ends both move', async () => {
    const { user, nodeEl, view, canvas } = setup()
    // c-net-mf runs from o-backbone to o-mainframe, both in o-g-platform, through two bend-points.
    const bends = view().connections.find((c) => c.id === 'c-net-mf')!.bendpoints!
    expect(bends.length).toBe(2)
    await click(user, nodeEl('o-g-platform'), { x: 30, y: 725 })
    await drag(user, nodeEl('o-g-platform'), { x: 30, y: 725 }, { x: 40, y: 745 })
    expect(view().connections.find((c) => c.id === 'c-net-mf')!.bendpoints).toEqual(
      bends.map((p) => ({ x: p.x + 10, y: p.y + 20 })),
    )
    const path = canvas.querySelector('[data-connection="c-net-mf"] path')!.getAttribute('d')!
    expect(path).toContain(`${bends[0]!.x + 10},${bends[0]!.y + 20}`)
  })

  it('nudges the selection with the arrow keys, one command a press', async () => {
    const { dispatch, user, nodeEl, view } = setup()
    const before = absoluteBounds(view(), 'o-goal')!
    await click(user, nodeEl('o-goal'), { x: 1250, y: 70 })
    await user.keyboard('{ArrowRight}')
    expect(absoluteBounds(view(), 'o-goal')).toMatchObject({ x: before.x + 1, y: before.y })
    await user.keyboard('{Shift>}{ArrowDown}{/Shift}')
    expect(absoluteBounds(view(), 'o-goal')).toMatchObject({ x: before.x + 1, y: before.y + 10 })
    expect(dispatch).toHaveBeenCalledTimes(2)
  })
})

describe('gestures that end early (#140 review)', () => {
  it('cancels a drag on Escape: nothing is committed and the selection stays', async () => {
    const { dispatch, user, nodeEl, view } = setup()
    const before = absoluteBounds(view(), 'o-goal')!
    await user.pointer([
      { keys: '[MouseLeft>]', target: nodeEl('o-goal'), coords: { clientX: 1250, clientY: 70 } },
      { target: nodeEl('o-goal'), coords: { clientX: 1290, clientY: 100 } },
    ])
    expect(drawnAt(nodeEl('o-goal'))).not.toEqual({ x: before.x, y: before.y })
    await user.keyboard('{Escape}')
    expect(drawnAt(nodeEl('o-goal'))).toEqual({ x: before.x, y: before.y })
    await user.pointer({
      keys: '[/MouseLeft]',
      target: nodeEl('o-goal'),
      coords: { clientX: 1290, clientY: 100 },
    })
    expect(dispatch).not.toHaveBeenCalled()
    expect(screen.getAllByTestId('selection')).toHaveLength(1)
  })

  it('drops a press released where the canvas could not see it', async () => {
    const { dispatch, user, nodeEl, view, canvas } = setup()
    const before = absoluteBounds(view(), 'o-goal')!
    await user.pointer({
      keys: '[MouseLeft>]',
      target: nodeEl('o-goal'),
      coords: { clientX: 1250, clientY: 70 },
    })
    // Released outside the canvas before the drag captured the pointer.
    await user.pointer({ keys: '[/MouseLeft]', target: document.body })
    // Hovering back with no button held must not drag the shape.
    await user.pointer({ target: canvas, coords: { clientX: 1300, clientY: 120 } })
    await user.pointer({ target: canvas, coords: { clientX: 1350, clientY: 170 } })
    expect(drawnAt(nodeEl('o-goal'))).toEqual({ x: before.x, y: before.y })
    expect(dispatch).not.toHaveBeenCalled()
    expect(screen.getByRole('complementary')).toBeInTheDocument()
  })

  it('forgets a held Space when the canvas loses focus', async () => {
    const { dispatch, user, nodeEl, canvas } = setup()
    const host = canvas.closest('.view-screen__canvas') as HTMLElement
    act(() => host.focus())
    await user.keyboard('{ }')
    // Space down, focus lost, Space released elsewhere: only the keydown is seen.
    fireEvent.keyDown(host, { key: ' ' })
    act(() => host.blur())
    await drag(user, nodeEl('o-goal'), { x: 1250, y: 70 }, { x: 1270, y: 90 })
    expect(dispatch).toHaveBeenCalledTimes(1)
  })

  // The commit is built on the store's view at release. Whether it used the
  // render's view instead cannot be seen from here: the canvas re-renders on
  // every store change before a release is handled, so the two are the same
  // (#140 review, finding 10, demoted). What can be seen is the outcome.
  it('keeps an edit made to the view while a drag was in progress', async () => {
    const { store, user, nodeEl, view } = setup()
    const goal = absoluteBounds(view(), 'o-goal')!
    const req = absoluteBounds(view(), 'o-req')!
    await user.pointer([
      { keys: '[MouseLeft>]', target: nodeEl('o-goal'), coords: { clientX: 1250, clientY: 70 } },
      { target: nodeEl('o-goal'), coords: { clientX: 1270, clientY: 80 } },
    ])
    // Something else changes the view while the drag is in progress.
    act(() => {
      store.updateNode(LANDSCAPE, 'o-req', (node) => ({
        ...node,
        bounds: { ...node.bounds, x: node.bounds.x + 5 },
      }))
    })
    await user.pointer({
      keys: '[/MouseLeft]',
      target: nodeEl('o-goal'),
      coords: { clientX: 1270, clientY: 80 },
    })
    expect(absoluteBounds(view(), 'o-goal')).toMatchObject({ x: goal.x + 20, y: goal.y + 10 })
    expect(absoluteBounds(view(), 'o-req')).toMatchObject({ x: req.x + 5 })
  })

  it('keeps the panel open on a press of what is already selected', async () => {
    const { user, nodeEl } = setup()
    await click(user, nodeEl('o-goal'), { x: 1250, y: 70 })
    expect(screen.getByRole('complementary')).toBeInTheDocument()
    await user.pointer({
      keys: '[MouseLeft>]',
      target: nodeEl('o-goal'),
      coords: { clientX: 1250, clientY: 70 },
    })
    expect(screen.getByRole('complementary')).toBeInTheDocument()
    await user.pointer({
      keys: '[/MouseLeft]',
      target: nodeEl('o-goal'),
      coords: { clientX: 1250, clientY: 70 },
    })
  })
})

describe('nudging a line’s end (#140 review)', () => {
  it('moves its bend-points by their weights, and back again, as Archi would', async () => {
    const { dispatch, user, nodeEl, view } = setup()
    // c-info-ins runs from o-info-svc through two bend-points (weights 1/3 and 2/3).
    const bends = view().connections.find((c) => c.id === 'c-info-ins')!.bendpoints!
    expect(bends).toHaveLength(2)
    await click(user, nodeEl('o-info-svc'), { x: 665, y: 65 })
    for (let i = 0; i < 10; i++) await user.keyboard('{ArrowRight}')
    expect(dispatch).toHaveBeenCalledTimes(10)
    // The source moved 10: the first point by 2/3 of it, the second by 1/3.
    expect(view().connections.find((c) => c.id === 'c-info-ins')!.bendpoints).toEqual([
      { x: Math.round(bends[0]!.x + 20 / 3), y: bends[0]!.y },
      { x: Math.round(bends[1]!.x + 10 / 3), y: bends[1]!.y },
    ])
    for (let i = 0; i < 10; i++) await user.keyboard('{ArrowLeft}')
    expect(view().connections.find((c) => c.id === 'c-info-ins')!.bendpoints).toEqual(bends)
  })
})

describe('selecting by lasso (#128)', () => {
  it('selects the shapes wholly inside the dragged rectangle', async () => {
    const { dispatch, user, canvas } = setup()
    await user.pointer([
      { keys: '[MouseLeft>]', target: canvas, coords: { clientX: 1230, clientY: 50 } },
      { target: canvas, coords: { clientX: 1420, clientY: 250 } },
    ])
    expect(screen.getByTestId('lasso')).toBeInTheDocument()
    await user.pointer({
      keys: '[/MouseLeft]',
      target: canvas,
      coords: { clientX: 1420, clientY: 250 },
    })
    expect(screen.getAllByTestId('selection').map((s) => s.getAttribute('data-selected'))).toEqual([
      'o-goal',
      'o-req',
    ])
    expect(screen.queryByTestId('lasso')).not.toBeInTheDocument()
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('adds to the selection when Shift is held', async () => {
    const { user, canvas, nodeEl } = setup()
    await click(user, nodeEl('o-zurich'), { x: 1250, y: 840 })
    await user.keyboard('{Shift>}')
    await user.pointer([
      { keys: '[MouseLeft>]', target: canvas, coords: { clientX: 1230, clientY: 50 } },
      { target: canvas, coords: { clientX: 1420, clientY: 250 } },
      { keys: '[/MouseLeft]', target: canvas, coords: { clientX: 1420, clientY: 250 } },
    ])
    await user.keyboard('{/Shift}')
    expect(screen.getAllByTestId('selection').map((s) => s.getAttribute('data-selected'))).toEqual([
      'o-zurich',
      'o-goal',
      'o-req',
    ])
  })

  it('clears the selection on a click on empty canvas', async () => {
    const { user, canvas, nodeEl } = setup()
    await click(user, nodeEl('o-goal'), { x: 1250, y: 70 })
    expect(screen.getAllByTestId('selection')).toHaveLength(1)
    await click(user, canvas, { x: 1220, y: 340 })
    expect(screen.queryAllByTestId('selection')).toHaveLength(0)
  })
})

describe('resizing (#128)', () => {
  it('resizes from a corner handle, as one command', async () => {
    const { dispatch, store, user, nodeEl, view } = setup()
    const before = absoluteBounds(view(), 'o-goal')!
    await click(user, nodeEl('o-goal'), { x: 1250, y: 70 })
    const handle = screen.getByTestId('handles').querySelector('[data-handle="se"]')!
    const corner = { x: before.x + before.width, y: before.y + before.height }
    await drag(user, handle, corner, { x: corner.x + 20, y: corner.y + 10 })
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(absoluteBounds(view(), 'o-goal')).toEqual({
      ...before,
      width: before.width + 20,
      height: before.height + 10,
    })
    act(() => void store.undo())
    expect(absoluteBounds(view(), 'o-goal')).toEqual(before)
  })

  it('keeps a container’s children where they were when it grows to the left', async () => {
    const { user, nodeEl, view } = setup()
    const k8s = absoluteBounds(view(), 'o-k8s')!
    const runtime = absoluteBounds(view(), 'o-runtime')!
    await click(user, nodeEl('o-k8s'), { x: 190, y: 840 })
    const handle = screen.getByTestId('handles').querySelector('[data-handle="w"]')!
    const edge = { x: k8s.x, y: k8s.y + k8s.height / 2 }
    await drag(user, handle, edge, { x: edge.x - 30, y: edge.y })
    expect(absoluteBounds(view(), 'o-k8s')).toMatchObject({ x: k8s.x - 30, width: k8s.width + 30 })
    expect(absoluteBounds(view(), 'o-runtime')).toEqual(runtime)
    expect(drawnAt(nodeEl('o-runtime'))).toEqual({ x: runtime.x, y: runtime.y })
  })

  it('hides the handles while the shape is dragged, and shows them where it lands', async () => {
    const { user, nodeEl } = setup()
    await click(user, nodeEl('o-goal'), { x: 1250, y: 70 })
    expect(screen.getByTestId('handles')).toBeInTheDocument()
    await user.pointer([
      { keys: '[MouseLeft>]', target: nodeEl('o-goal'), coords: { clientX: 1250, clientY: 70 } },
      { target: nodeEl('o-goal'), coords: { clientX: 1270, clientY: 90 } },
    ])
    expect(screen.queryByTestId('handles')).not.toBeInTheDocument()
    await user.pointer({
      keys: '[/MouseLeft]',
      target: nodeEl('o-goal'),
      coords: { clientX: 1270, clientY: 90 },
    })
    expect(screen.getByTestId('handles')).toBeInTheDocument()
  })

  it('offers handles only for a single selection', async () => {
    const { user, nodeEl } = setup()
    await click(user, nodeEl('o-goal'), { x: 1250, y: 70 })
    expect(screen.getByTestId('handles').querySelectorAll('[data-handle]')).toHaveLength(8)
    await click(user, nodeEl('o-req'), { x: 1250, y: 190 }, 'Shift')
    expect(screen.queryByTestId('handles')).not.toBeInTheDocument()
  })
})

describe('removing from the view (#128)', () => {
  it('removes the selected shapes and their connections, not the elements', async () => {
    const { dispatch, store, user, nodeEl, view, canvas } = setup()
    const element = 'ac-crm'
    const attached = view().connections.filter((c) => c.source === 'o-crm' || c.target === 'o-crm')
    expect(attached.length).toBeGreaterThan(0)
    await click(user, nodeEl('o-crm'), { x: 870, y: 510 })
    await user.keyboard('{Delete}')
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(canvas.querySelector('[data-node="o-crm"]')).toBeNull()
    for (const c of attached) expect(canvas.querySelector(`[data-connection="${c.id}"]`)).toBeNull()
    expect(store.element(element)).toBeDefined()

    act(() => void store.undo())
    expect(canvas.querySelector('[data-node="o-crm"]')).not.toBeNull()
    for (const c of attached) {
      expect(canvas.querySelector(`[data-connection="${c.id}"]`)).not.toBeNull()
    }
  })
})

describe('removing a container (#128)', () => {
  // o-k8s holds o-runtime and o-postgres.
  const inside = ['o-runtime', 'o-postgres']
  const touching = (view: View, ids: string[]) =>
    view.connections
      .filter((c) => ids.includes(c.source) || ids.includes(c.target))
      .map((c) => c.id)

  it('removes it with everything inside, as Archi’s Delete from View does', async () => {
    const { dispatch, store, user, nodeEl, view, canvas } = setup()
    const before = view()
    const lines = touching(before, ['o-k8s', ...inside])
    expect(lines.length).toBeGreaterThan(0)
    await click(user, nodeEl('o-k8s'), { x: 190, y: 840 })
    await user.keyboard('{Delete}')
    expect(dispatch).toHaveBeenCalledTimes(1)
    for (const id of ['o-k8s', ...inside]) {
      expect(canvas.querySelector(`[data-node="${id}"]`), id).toBeNull()
    }
    for (const id of lines)
      expect(
        view().connections.some((c) => c.id === id),
        id,
      ).toBe(false)
    expect(store.element('ss-runtime')).toBeDefined()
    act(() => void store.undo())
    expect(view()).toBe(before)
  })

  it('keeps what is inside on Shift+Delete, where it was drawn', async () => {
    const { dispatch, user, nodeEl, view, canvas } = setup()
    const before = view()
    const at = Object.fromEntries(inside.map((id) => [id, absoluteBounds(before, id)]))
    const kept = touching(before, inside).filter((id) => !touching(before, ['o-k8s']).includes(id))
    await click(user, nodeEl('o-k8s'), { x: 190, y: 840 })
    await user.keyboard('{Shift>}{Delete}{/Shift}')
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(canvas.querySelector('[data-node="o-k8s"]')).toBeNull()
    for (const id of inside) {
      expect(view().nodes.find((n) => n.id === id)?.parent, id).toBe('o-g-platform')
      expect(absoluteBounds(view(), id), id).toEqual(at[id])
      expect(drawnAt(nodeEl(id)), id).toEqual({ x: at[id]!.x, y: at[id]!.y })
    }
    for (const id of kept)
      expect(
        view().connections.some((c) => c.id === id),
        id,
      ).toBe(true)
  })
})

describe('a reader tab (#128)', () => {
  it('pans instead of moving, offers no handles, and ignores Delete', async () => {
    const { dispatch, user, nodeEl, view } = setup('reader')
    const before = absoluteBounds(view(), 'o-goal')!
    // A click still selects, so the selection, not its absence, is what is tested.
    await click(user, nodeEl('o-goal'), { x: 1250, y: 70 })
    expect(screen.getAllByTestId('selection')).toHaveLength(1)
    expect(screen.queryByTestId('handles')).not.toBeInTheDocument()
    await drag(user, nodeEl('o-goal'), { x: 1250, y: 70 }, { x: 1300, y: 120 })
    await user.keyboard('{Delete}{ArrowRight}')
    expect(absoluteBounds(view(), 'o-goal')).toEqual(before)
    expect(dispatch).not.toHaveBeenCalled()
  })
})
