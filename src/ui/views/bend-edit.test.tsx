import { describe, expect, it } from 'vitest'
import { act, fireEvent, screen, within } from '@testing-library/react'
import { toCanonicalJson } from '@/io/canonical-json'
import type { Point } from '@/model'
import type { ModelStore } from '@/store'
import { click, drag, setup } from '@/test/view-editor'

/**
 * Shaping lines by hand, and the view's router (#133), driven on the canvas.
 * Archi's rules (`ManualBendpointEditPolicy`, GEF's `BendpointEditPolicy`): a
 * drag from a segment's middle handle makes one bend-point, a drag of a
 * bend-point moves it; a Manhattan view routes every line orthogonally and
 * offers no bend-point handles. Each edit is one command, and undo restores the
 * workspace byte for byte.
 *
 * jsdom lays nothing out: the viewport stays at the origin and 100%, so a
 * client point is a view point, and a handle's own coordinates say where to press.
 */

const model = (store: ModelStore) => toCanonicalJson(store.snapshot())
type Harness = ReturnType<typeof setup>

const STRAIGHT = 'c-cust-ins'
const BENT = 'c-info-ins'

/** The centre of a handle, from its own rectangle. */
function centreOf(el: Element): Point {
  const n = (name: string) => Number(el.getAttribute(name))
  return { x: n('x') + n('width') / 2, y: n('y') + n('height') / 2 }
}

async function selectLine(h: Harness, id: string) {
  const hit = h.canvas.querySelector(`[data-line-hit="${id}"]`)!
  // Press where the line runs: its first bend-point, or the middle of its route.
  const d = hit.getAttribute('d')!
  const points = d
    .slice(1)
    .split('L')
    .map((pair) => pair.split(',').map(Number) as [number, number])
  const [a, b] = [points[0]!, points[1]!]
  await click(h.user, hit, { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2 })
  expect(screen.getByTestId('selection')).toHaveAttribute('data-selected', id)
}

const handles = (h: Harness) => h.canvas.querySelector('[data-testid="bend-handles"]')
const segment = (h: Harness, i: number) => h.canvas.querySelector(`[data-segment="${i}"]`)!
const bendpoint = (h: Harness, i: number) => h.canvas.querySelector(`[data-bendpoint="${i}"]`)!
const bendsOf = (h: Harness, id: string) =>
  h.view().connections.find((c) => c.id === id)!.bendpoints

/** The drawn line's own path, as numbers: the first path in its drawing. */
function drawnRoute(container: Element): [number, number][] {
  const d = container.querySelector('path')!.getAttribute('d')!
  return d
    .slice(1)
    .split('L')
    .map((pair) => pair.split(',').map(Number) as [number, number])
}

describe('adding, moving and removing a bend-point (#133)', () => {
  it('adds one bend-point by dragging a segment’s handle, in one command that undo takes back', async () => {
    const h = setup()
    const before = model(h.store)
    expect(bendsOf(h, STRAIGHT)).toBeUndefined()
    await selectLine(h, STRAIGHT)
    // A straight line: one segment, so one handle to make a bend-point, and none to move.
    expect(within(handles(h) as HTMLElement).queryAllByTitle(/double-click/)).toHaveLength(0)
    expect(handles(h)!.querySelectorAll('[data-segment]')).toHaveLength(1)
    h.dispatch.mockClear()

    await drag(
      h.user,
      segment(h, 0),
      centreOf(segment(h, 0)),
      { x: 260, y: 140 },
      { x: 300.4, y: 199.6 },
    )

    expect(h.dispatch).toHaveBeenCalledTimes(1)
    // One point, where the drag ended, in whole pixels as Archi stores them.
    expect(bendsOf(h, STRAIGHT)).toEqual([{ x: 300, y: 200 }])
    // The drawing goes through it, and the line stays selected with its new handles.
    const drawn = h.canvas.querySelector(`[data-connection="${STRAIGHT}"]`)!
    expect(drawnRoute(drawn)).toContainEqual([300, 200])
    expect(handles(h)!.querySelectorAll('[data-segment]')).toHaveLength(2)
    expect(handles(h)!.querySelectorAll('[data-bendpoint]')).toHaveLength(1)

    act(() => void h.store.undo())
    expect(model(h.store)).toBe(before)
  })

  it('makes the new point on the segment that was dragged, between the points it joins', async () => {
    const h = setup()
    const bends = bendsOf(h, BENT)!
    expect(bends.length).toBeGreaterThan(0)
    await selectLine(h, BENT)
    const last = bends.length
    await drag(h.user, segment(h, last), centreOf(segment(h, last)), { x: 900, y: 900 })
    expect(bendsOf(h, BENT)).toEqual([...bends, { x: 900, y: 900 }])
  })

  it('moves a bend-point in one command, and leaves the others where they were', async () => {
    const h = setup()
    const before = model(h.store)
    const bends = bendsOf(h, BENT)!
    await selectLine(h, BENT)
    h.dispatch.mockClear()
    await drag(h.user, bendpoint(h, 0), centreOf(bendpoint(h, 0)), { x: 777, y: 333 })
    expect(h.dispatch).toHaveBeenCalledTimes(1)
    expect(bendsOf(h, BENT)).toEqual([{ x: 777, y: 333 }, ...bends.slice(1)])
    act(() => void h.store.undo())
    expect(model(h.store)).toBe(before)
  })

  it('records nothing for a press on a handle that does not drag, or a drag that Escape cancels', async () => {
    const h = setup()
    await selectLine(h, BENT)
    h.dispatch.mockClear()
    await click(h.user, bendpoint(h, 0), centreOf(bendpoint(h, 0)))
    await click(h.user, segment(h, 0), centreOf(segment(h, 0)))
    const from = centreOf(segment(h, 0))
    await h.user.pointer([
      { keys: '[MouseLeft>]', target: segment(h, 0), coords: { clientX: from.x, clientY: from.y } },
      { target: segment(h, 0), coords: { clientX: 999, clientY: 999 } },
    ])
    await h.user.keyboard('{Escape}')
    await h.user.pointer([{ keys: '[/MouseLeft]', coords: { clientX: 999, clientY: 999 } }])
    expect(h.dispatch).not.toHaveBeenCalled()
  })

  it('records nothing for a bend-point dragged away and back to the pixel it started on', async () => {
    const h = setup()
    const bends = bendsOf(h, BENT)!
    await selectLine(h, BENT)
    h.dispatch.mockClear()
    const from = centreOf(bendpoint(h, 0))
    // A real drag, so the gesture commits, ending where it began once rounded.
    await drag(
      h.user,
      bendpoint(h, 0),
      from,
      { x: 900, y: 900 },
      { x: from.x + 0.3, y: from.y - 0.3 },
    )
    expect(h.dispatch).not.toHaveBeenCalled()
    expect(bendsOf(h, BENT)).toEqual(bends)
  })

  it('removes a bend-point on a double-click, in one command', async () => {
    const h = setup()
    const before = model(h.store)
    const bends = bendsOf(h, BENT)!
    await selectLine(h, BENT)
    h.dispatch.mockClear()
    await h.user.dblClick(bendpoint(h, 0))
    expect(h.dispatch).toHaveBeenCalledTimes(1)
    expect(bendsOf(h, BENT) ?? []).toEqual(bends.slice(1))
    act(() => void h.store.undo())
    expect(model(h.store)).toBe(before)
  })

  it('removes them all from the panel, leaving the line as one never bent, with focus on the canvas', async () => {
    const h = setup()
    const before = model(h.store)
    await selectLine(h, BENT)
    h.dispatch.mockClear()
    await h.user.click(screen.getByRole('button', { name: 'Remove bend-points' }))
    expect(h.dispatch).toHaveBeenCalledTimes(1)
    expect(h.view().connections.find((c) => c.id === BENT)).not.toHaveProperty('bendpoints')
    // The button went with the bend-points; the keyboard stays with the canvas.
    expect(screen.queryByRole('button', { name: 'Remove bend-points' })).toBeNull()
    expect(h.surface).toHaveFocus()
    act(() => void h.store.undo())
    expect(model(h.store)).toBe(before)
  })

  it('offers no Remove bend-points on a line that has none', async () => {
    const h = setup()
    await selectLine(h, STRAIGHT)
    expect(screen.getByRole('button', { name: 'Remove from view' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove bend-points' })).toBeNull()
  })

  it('offers no handles in a reader tab', async () => {
    const h = setup('reader')
    await selectLine(h, BENT)
    expect(handles(h)).toBeNull()
  })
})

describe('the view’s router (#133)', () => {
  const router = () => screen.getByRole('combobox', { name: 'Router' })

  it('switches to Manhattan in one command: every line horizontal and vertical, and no bend-point handles', async () => {
    const h = setup()
    const before = model(h.store)
    const bends = bendsOf(h, BENT)
    // Drawn through bend-points first, so some line is not orthogonal yet.
    const lines = () => [...h.canvas.querySelectorAll('[data-connection]')]
    const diagonal = (route: [number, number][]) =>
      route.some((p, i) => i > 0 && p[0] !== route[i - 1]![0] && p[1] !== route[i - 1]![1])
    expect(lines().some((line) => diagonal(drawnRoute(line)))).toBe(true)

    fireEvent.change(router(), { target: { value: 'manhattan' } })

    expect(h.dispatch).toHaveBeenCalledTimes(1)
    expect(h.view().router).toBe('manhattan')
    expect(lines().length).toBeGreaterThan(20)
    for (const line of lines()) {
      expect(diagonal(drawnRoute(line)), line.getAttribute('data-connection')!).toBe(false)
    }
    // The bend-points are ignored, not dropped: switching back draws them again.
    expect(bendsOf(h, BENT)).toEqual(bends)
    await selectLine(h, BENT)
    expect(handles(h)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Remove bend-points' })).toBeNull()

    act(() => void h.store.undo())
    expect(model(h.store)).toBe(before)
  })

  it('stores nothing for Manual: absent is the default', () => {
    const h = setup()
    fireEvent.change(router(), { target: { value: 'manhattan' } })
    fireEvent.change(router(), { target: { value: 'manual' } })
    expect(h.view()).not.toHaveProperty('router')
  })

  it('takes no router the model does not know from the select', () => {
    const h = setup()
    const select = router()
    const bogus = document.createElement('option')
    bogus.value = 'diagonal'
    select.append(bogus)
    fireEvent.change(select, { target: { value: 'diagonal' } })
    expect(h.dispatch).not.toHaveBeenCalled()
    expect(h.view()).not.toHaveProperty('router')
  })
})

describe('where a line’s label sits (#133)', () => {
  const label = () => screen.getByRole('combobox', { name: 'Label' })

  it('moves the label to an end in one command, and back to the middle as one never moved', async () => {
    const h = setup()
    const before = model(h.store)
    await selectLine(h, STRAIGHT)
    h.dispatch.mockClear()
    fireEvent.change(label(), { target: { value: 'source' } })
    expect(h.dispatch).toHaveBeenCalledTimes(1)
    expect(h.view().connections.find((c) => c.id === STRAIGHT)?.appearance?.labelPosition).toBe(
      'source',
    )
    fireEvent.change(label(), { target: { value: 'middle' } })
    expect(model(h.store)).toBe(before)
  })

  it('takes no position the model does not know from the select', async () => {
    const h = setup()
    await selectLine(h, STRAIGHT)
    h.dispatch.mockClear()
    const select = label()
    const bogus = document.createElement('option')
    bogus.value = 'above'
    select.append(bogus)
    fireEvent.change(select, { target: { value: 'above' } })
    expect(h.dispatch).not.toHaveBeenCalled()
  })
})
