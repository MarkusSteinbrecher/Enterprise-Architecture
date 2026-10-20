import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen } from '@testing-library/react'
import { absoluteBounds, drawingOrder, type ViewNode } from '@/model'
import type { ModelStore } from '@/store'
import { click, drag, setup } from '@/test/view-editor'
import { GRID_STORAGE_KEY } from './grid-preferences'

/**
 * Grid, guides, align, distribute, match size and z-order on the canvas
 * (#136), driven as a user drives them, with the store's `dispatch` counted.
 * jsdom lays nothing out, so a client point is a view point at 100%.
 */

const ARRANGE = 'v-arrange'

// The preference outlives a test within the file, as it outlives a page load.
beforeEach(() => localStorage.removeItem(GRID_STORAGE_KEY))

const note = (id: string, x: number, y: number, width: number, height: number, parent?: string) =>
  ({
    id,
    kind: 'note',
    text: id,
    bounds: { x, y, width, height },
    ...(parent ? { parent } : {}),
  }) as ViewNode

/** Three notes spread over the view, and a group holding two more. Nothing on a 12 grid. */
function arrangeView(store: ModelStore) {
  store.addView({
    id: ARRANGE,
    name: 'Arrange',
    properties: {},
    nodes: [
      note('n-a', 100, 101, 100, 55),
      // 140 wide, so its centre (470) is out of reach of n-a's when their left edges meet.
      note('n-b', 400, 203, 140, 55),
      note('n-c', 700, 311, 80, 40),
      {
        id: 'g',
        kind: 'group',
        name: 'Group',
        bounds: { x: 100, y: 600, width: 600, height: 300 },
      },
      note('n-in', 20, 30, 100, 50, 'g'),
      note('n-in2', 300, 100, 100, 50, 'g'),
    ],
    connections: [],
  })
}

const open = (options: { snapping?: boolean } = {}) =>
  setup('writer', { viewId: ARRANGE, prepare: arrangeView, ...options })

/** Select `ids` in order, the last becoming the primary selection. */
async function select(
  user: ReturnType<typeof open>['user'],
  nodeEl: (id: string) => Element,
  view: ReturnType<typeof open>['view'],
  ids: string[],
) {
  for (const [i, id] of ids.entries()) {
    const b = absoluteBounds(view(), id)!
    await click(user, nodeEl(id), { x: b.x + 5, y: b.y + 5 }, i === 0 ? undefined : 'Shift')
  }
}

const button = (name: string) => screen.getByRole('button', { name })

describe('the grid (#136)', () => {
  it('starts with Archi’s defaults: grid hidden, snapping to the grid and to guides on', () => {
    open({ snapping: true })
    expect(button('Grid Visible')).toHaveAttribute('aria-pressed', 'false')
    expect(button('Snap to Grid')).toHaveAttribute('aria-pressed', 'true')
    expect(button('Snap to Alignment Guides')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('spinbutton', { name: 'Grid size' })).toHaveValue(12)
    expect(screen.queryByTestId('grid')).toBeNull()
  })

  it('ends a dragged shape on grid coordinates with the grid on, and where it is released with it off', async () => {
    const { dispatch, user, nodeEl, view } = open({ snapping: true })
    // n-a's corner, (100, 101), dragged by (30, 20) to (130, 121): the nearest lines are 132 and 120.
    await drag(user, nodeEl('n-a'), { x: 150, y: 120 }, { x: 165, y: 130 }, { x: 180, y: 140 })
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(absoluteBounds(view(), 'n-a')).toMatchObject({ x: 132, y: 120 })

    await user.click(button('Snap to Grid'))
    expect(button('Snap to Grid')).toHaveAttribute('aria-pressed', 'false')
    // From (132, 120) by (31, 17): off the grid, exactly where it was let go.
    await drag(user, nodeEl('n-a'), { x: 150, y: 120 }, { x: 170, y: 130 }, { x: 181, y: 137 })
    expect(absoluteBounds(view(), 'n-a')).toMatchObject({ x: 163, y: 137 })
  })

  it('snaps a shape dropped into a group to the group’s grid', async () => {
    const { user, nodeEl, view } = open({ snapping: true })
    await user.click(button('Snap to Alignment Guides'))
    // Into the group at (100, 600): the corner lands at (130, 721), which is
    // (30, 121) from the group's corner. 30 is half-way between 24 and 36, and
    // the IEEE remainder takes the even multiple, 24; 121 goes to 120.
    await drag(user, nodeEl('n-c'), { x: 710, y: 320 }, { x: 400, y: 600 }, { x: 140, y: 730 })
    const c = view().nodes.find((n) => n.id === 'n-c')!
    expect(c.parent).toBe('g')
    expect(c.bounds).toMatchObject({ x: 24, y: 120 })
    expect(c.bounds.x % 12).toBe(0)
    expect(c.bounds.y % 12).toBe(0)
  })

  it('snaps a resized edge to the grid', async () => {
    const { user, nodeEl, view } = open({ snapping: true })
    await select(user, nodeEl, view, ['n-a'])
    const handle = document.querySelector('[data-handle="e"]')!
    // The right edge, at 200, dragged 27 to 227: the nearest line is 228.
    await drag(user, handle, { x: 200, y: 128 }, { x: 215, y: 128 }, { x: 227, y: 128 })
    expect(absoluteBounds(view(), 'n-a')).toMatchObject({ x: 100, width: 128 })
  })

  it('shows and hides the grid, under the drawing, and remembers it', async () => {
    const { user } = open()
    await user.click(button('Grid Visible'))
    const grid = screen.getByTestId('grid')
    expect(button('Grid Visible')).toHaveAttribute('aria-pressed', 'true')
    // Not part of the drawing, so no export draws it.
    expect(grid.closest('[data-view-drawing]')).toBeNull()
    expect(grid.querySelector('pattern')).toHaveAttribute('width', '12')
    expect(JSON.parse(localStorage.getItem(GRID_STORAGE_KEY)!)).toMatchObject({ visible: true })

    await user.click(button('Grid Visible'))
    expect(screen.queryByTestId('grid')).toBeNull()
    expect(JSON.parse(localStorage.getItem(GRID_STORAGE_KEY)!)).toMatchObject({ visible: false })
  })

  it('stops drawing the grid once its lines would be closer than 4 screen pixels', async () => {
    const { user } = open()
    await user.click(button('Grid Visible'))
    expect(screen.getByTestId('grid')).toBeInTheDocument()
    // 12 × 1.2⁻⁶ = 4.02 px still draws; one more step, 3.35 px, does not.
    for (let i = 0; i < 6; i++) await user.click(button('Zoom out'))
    expect(screen.getByTestId('grid')).toBeInTheDocument()
    await user.click(button('Zoom out'))
    expect(screen.queryByTestId('grid')).toBeNull()
  })

  it('takes a typed grid size only in Archi’s range, and snaps to it', async () => {
    const { user, nodeEl, view } = open({ snapping: true })
    await user.click(button('Snap to Alignment Guides'))
    const field = screen.getByRole('spinbutton', { name: 'Grid size' })
    // Cleared, then 3: below Archi's 5, so the grid stays 12; leaving the field shows 12 again.
    await user.clear(field)
    await user.type(field, '3')
    expect(JSON.parse(localStorage.getItem(GRID_STORAGE_KEY)!)).toMatchObject({ size: 12 })
    fireEvent.blur(field)
    expect(field).toHaveValue(12)
    await user.clear(field)
    expect(JSON.parse(localStorage.getItem(GRID_STORAGE_KEY)!)).toMatchObject({ size: 12 })
    await user.type(field, '50')
    expect(JSON.parse(localStorage.getItem(GRID_STORAGE_KEY)!)).toMatchObject({ size: 50 })
    await user.clear(field)
    await user.type(field, '101')
    // 1 and 101 are refused; 10 on the way was taken.
    expect(JSON.parse(localStorage.getItem(GRID_STORAGE_KEY)!)).toMatchObject({ size: 10 })
    await user.clear(field)
    await user.type(field, '50')
    // (100, 101) by (30, 20) is (130, 121): on a 50 grid, (150, 100).
    await drag(user, nodeEl('n-a'), { x: 150, y: 120 }, { x: 165, y: 130 }, { x: 180, y: 140 })
    expect(absoluteBounds(view(), 'n-a')).toMatchObject({ x: 150, y: 100 })
  })

  it('still toggles with storage blocked, from Archi’s defaults', async () => {
    const blocked = () => {
      throw new Error('blocked')
    }
    vi.stubGlobal('localStorage', {
      getItem: blocked,
      setItem: blocked,
      removeItem: blocked,
      clear: blocked,
      key: blocked,
      length: 0,
    })
    try {
      const { user } = open({ snapping: true })
      expect(button('Snap to Grid')).toHaveAttribute('aria-pressed', 'true')
      await user.click(button('Grid Visible'))
      expect(screen.getByTestId('grid')).toBeInTheDocument()
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

describe('alignment guides (#136)', () => {
  /** n-a (100 wide, left edge 100) dragged across by `dx`, toward n-b's left edge at 400. */
  async function dragAcross(dx: number) {
    const { user, nodeEl, view } = open({ snapping: true })
    await user.click(button('Snap to Grid'))
    expect(button('Snap to Alignment Guides')).toHaveAttribute('aria-pressed', 'true')
    await user.pointer([
      { keys: '[MouseLeft>]', target: nodeEl('n-a'), coords: { clientX: 150, clientY: 120 } },
      { target: nodeEl('n-a'), coords: { clientX: 150 + dx / 2, clientY: 120 } },
      { target: nodeEl('n-a'), coords: { clientX: 150 + dx, clientY: 120 } },
    ])
    const shown = screen.queryAllByTestId('guide').map((g) => g.getAttribute('data-at'))
    await user.pointer({
      keys: '[/MouseLeft]',
      target: nodeEl('n-a'),
      coords: { clientX: 150 + dx, clientY: 120 },
    })
    expect(screen.queryAllByTestId('guide')).toHaveLength(0)
    return { x: absoluteBounds(view(), 'n-a')!.x, shown }
  }

  it.each([295, 305])(
    'snaps an edge 5 px from another’s onto it, and shows the guide (dx %i)',
    async (dx) => {
      expect(await dragAcross(dx)).toEqual({ x: 400, shown: ['400'] })
    },
  )

  it.each([294, 306])('leaves an edge 6 px away where it was released (dx %i)', async (dx) => {
    expect(await dragAcross(dx)).toEqual({ x: 100 + dx, shown: [] })
  })

  it('takes the threshold in screen pixels at the canvas’s zoom', async () => {
    const { store, user, nodeEl, view } = open({ snapping: true })
    await user.click(button('Snap to Grid'))
    // At 120% (zoomed about the origin, as jsdom's canvas measures 0 × 0) a
    // view point is 1.2 screen pixels: 5 view units is 6 on screen, too far,
    // and 4 is 4.8, near enough.
    await user.click(button('Zoom in'))
    expect(screen.getByLabelText('Zoom level')).toHaveTextContent('120%')
    const across = async (viewDx: number) => {
      const from = { x: 150 * 1.2, y: 120 * 1.2 }
      await drag(
        user,
        nodeEl('n-a'),
        from,
        { x: from.x + viewDx * 0.6, y: from.y },
        {
          x: from.x + viewDx * 1.2,
          y: from.y,
        },
      )
      return absoluteBounds(view(), 'n-a')!.x
    }
    expect(await across(295)).toBe(395)
    act(() => void store.undo())
    expect(await across(296)).toBe(400)
  })

  it('takes the guides away when Escape cancels the drag', async () => {
    const { user, nodeEl, surface } = open({ snapping: true })
    await user.click(button('Snap to Grid'))
    await user.pointer([
      { keys: '[MouseLeft>]', target: nodeEl('n-a'), coords: { clientX: 150, clientY: 120 } },
      { target: nodeEl('n-a'), coords: { clientX: 300, clientY: 120 } },
      { target: nodeEl('n-a'), coords: { clientX: 447, clientY: 120 } },
    ])
    expect(screen.getAllByTestId('guide')).toHaveLength(1)
    fireEvent.keyDown(surface, { key: 'Escape' })
    expect(screen.queryAllByTestId('guide')).toHaveLength(0)
  })

  it('does not snap to shapes with alignment guides off', async () => {
    localStorage.setItem(GRID_STORAGE_KEY, JSON.stringify({ snap: false, guides: false }))
    const { user, nodeEl, view } = open({ snapping: true })
    expect(button('Snap to Alignment Guides')).toHaveAttribute('aria-pressed', 'false')
    await drag(user, nodeEl('n-a'), { x: 150, y: 120 }, { x: 300, y: 120 }, { x: 447, y: 120 })
    expect(absoluteBounds(view(), 'n-a')!.x).toBe(397)
  })
})

describe('align, distribute and match size (#136)', () => {
  const ACTIONS = [
    'Align Left',
    'Align Center',
    'Align Right',
    'Align Top',
    'Align Middle',
    'Align Bottom',
    'Distribute Horizontally',
    'Distribute Vertically',
    'Match Width',
    'Match Height',
    'Bring To Front',
    'Bring Forward',
    'Send Backward',
    'Send To Back',
  ]

  it.each(ACTIONS)('“%s” is one command, and one undo takes it back', async (name) => {
    const { store, dispatch, user, nodeEl, view } = open()
    await select(user, nodeEl, view, ['n-a', 'n-b', 'n-c'])
    const before = view()
    expect(button(name)).toHaveAttribute('aria-disabled', 'false')
    await user.click(button(name))
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(view()).not.toEqual(before)
    act(() => void store.undo())
    expect(view()).toEqual(before)
  })

  it('aligns to the shape selected last, outlined as the primary selection', async () => {
    const { user, nodeEl, view } = open()
    // One shape alone is not marked: there is nothing for it to be primary over.
    await select(user, nodeEl, view, ['n-a'])
    expect(screen.getByTestId('selection')).not.toHaveAttribute('data-primary')
    await select(user, nodeEl, view, ['n-c', 'n-a', 'n-b'])
    const outlined = screen.getAllByTestId('selection')
    expect(
      outlined.map((s) => [s.getAttribute('data-selected'), s.hasAttribute('data-primary')]),
    ).toEqual([
      ['n-c', false],
      ['n-a', false],
      ['n-b', true],
    ])
    await user.click(button('Align Left'))
    expect([view().nodes[0]!.bounds.x, view().nodes[2]!.bounds.x]).toEqual([400, 400])
  })

  it('leaves align and distribute off until they apply, and a press on one then does nothing', async () => {
    const { dispatch, user, nodeEl, view } = open()
    await select(user, nodeEl, view, ['n-a'])
    for (const name of ['Align Left', 'Distribute Horizontally', 'Match Width']) {
      expect(button(name)).toHaveAttribute('aria-disabled', 'true')
      await user.click(button(name))
    }
    expect(dispatch).not.toHaveBeenCalled()

    // Two in one parent align; distribute needs three.
    await select(user, nodeEl, view, ['n-a', 'n-b'])
    expect(button('Align Left')).toHaveAttribute('aria-disabled', 'false')
    expect(button('Distribute Horizontally')).toHaveAttribute('aria-disabled', 'true')

    // Across two parents nothing aligns, as GEF refuses; match size does not mind.
    await select(user, nodeEl, view, ['n-a', 'n-in'])
    expect(button('Align Left')).toHaveAttribute('aria-disabled', 'true')
    expect(button('Match Width')).toHaveAttribute('aria-disabled', 'false')
    await user.click(button('Align Left'))
    expect(dispatch).not.toHaveBeenCalled()
  })
})

describe('z-order (#136)', () => {
  it('brings a shape to the front of its parent, keeping focus on the button that is then off', async () => {
    const { dispatch, user, nodeEl, view, surface } = open()
    await select(user, nodeEl, view, ['n-in'])
    const drawn = () =>
      [...surface.querySelectorAll('[data-parent="g"]')].map((el) => el.getAttribute('data-node'))
    expect(drawn()).toEqual(['n-in', 'n-in2'])

    await user.click(button('Bring To Front'))
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(drawn()).toEqual(['n-in2', 'n-in'])
    expect(drawingOrder(view()).map((n) => n.id)).toEqual([
      'n-a',
      'n-b',
      'n-c',
      'g',
      'n-in2',
      'n-in',
    ])
    // At the front now, so the button no longer applies, and focus stays on it.
    expect(button('Bring To Front')).toHaveAttribute('aria-disabled', 'true')
    expect(button('Bring To Front')).toHaveFocus()
    await user.click(button('Bring To Front'))
    expect(dispatch).toHaveBeenCalledTimes(1)

    await user.click(button('Send To Back'))
    expect(drawn()).toEqual(['n-in', 'n-in2'])
  })
})

describe('in a reader tab (#136)', () => {
  it('has no layout aids, and draws no grid even when the viewer chose one', () => {
    localStorage.setItem(GRID_STORAGE_KEY, JSON.stringify({ visible: true }))
    setup('reader', { viewId: ARRANGE, prepare: arrangeView })
    expect(screen.getByTestId('view-canvas')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Align' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Snap to Grid' })).toBeNull()
    expect(screen.queryByTestId('grid')).toBeNull()
  })
})
