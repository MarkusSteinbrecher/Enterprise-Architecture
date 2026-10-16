import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, screen, within } from '@testing-library/react'
import { SCREEN, click, setup } from '@/test/view-editor'
import { PALETTE_COLLAPSED_STORAGE_KEY } from './ViewScreen'

/**
 * The palette collapses to its glyphs (#146), so the canvas keeps its width
 * at 1280 px. Collapsed, the tools keep their names as tooltips and accessible
 * names, still arm and place, and the filter's button opens the palette with
 * the filter focused. The choice is the viewer's, remembered in localStorage.
 *
 * jsdom lays nothing out, so where the canvas starts is given to it: right of
 * the palette's column, open or collapsed.
 */

const palette = () => screen.getByRole('region', { name: 'Palette' })
const tool = (name: string) => within(palette()).getByRole('button', { name })
const EMPTY_SPOT = { x: 1600, y: 100 }
const blocked = () => {
  throw new DOMException('blocked', 'SecurityError')
}

beforeEach(() => localStorage.clear())

describe('collapsing the palette (#146)', () => {
  it('collapses to glyphs named by tooltip and accessible name, and back', async () => {
    const { user } = setup()
    expect(within(palette()).getByText('Business Actor')).toBeInTheDocument()
    const count = palette().querySelectorAll('[data-tool]').length

    await user.click(screen.getByRole('button', { name: 'Collapse palette' }))

    expect(palette()).toHaveClass('view-palette--collapsed')
    // No visible text names a tool; its name is on the button itself.
    expect(within(palette()).queryByText('Business Actor')).toBeNull()
    const actor = tool('Business Actor')
    expect(actor).toHaveAttribute('aria-label', 'Business Actor')
    expect(actor).toHaveAttribute('title', 'Business Actor')
    expect(actor.querySelector('svg')).not.toBeNull()
    // Every tool is still offered, each named.
    const tools = [...palette().querySelectorAll('[data-tool]')]
    expect(tools).toHaveLength(count)
    for (const button of tools) {
      expect(button.getAttribute('aria-label')).toBeTruthy()
      expect(button.getAttribute('aria-label')).toBe(button.getAttribute('title'))
      expect(button.textContent).toBe('')
    }
    // The button that was pressed keeps the focus as its name changes.
    const toggle = screen.getByRole('button', { name: 'Expand palette' })
    expect(toggle).toHaveFocus()
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await user.click(toggle)
    expect(palette()).not.toHaveClass('view-palette--collapsed')
    expect(within(palette()).getByText('Business Actor')).toBeInTheDocument()
    expect(palette().querySelectorAll('[data-tool]')).toHaveLength(count)
    expect(screen.getByRole('button', { name: 'Collapse palette' })).toHaveFocus()
  })

  it('remembers the choice for the next view the viewer opens', async () => {
    const first = setup()
    await first.user.click(screen.getByRole('button', { name: 'Collapse palette' }))
    expect(localStorage.getItem(PALETTE_COLLAPSED_STORAGE_KEY)).toBe('true')
    cleanup()

    const second = setup()
    expect(palette()).toHaveClass('view-palette--collapsed')
    await second.user.click(screen.getByRole('button', { name: 'Expand palette' }))
    expect(localStorage.getItem(PALETTE_COLLAPSED_STORAGE_KEY)).toBe('false')
    cleanup()

    setup()
    expect(palette()).not.toHaveClass('view-palette--collapsed')
  })

  it('opens expanded and still collapses when storage is blocked', async () => {
    localStorage.setItem(PALETTE_COLLAPSED_STORAGE_KEY, 'true')
    vi.spyOn(localStorage, 'getItem').mockImplementation(blocked)
    vi.spyOn(localStorage, 'setItem').mockImplementation(blocked)
    const { user } = setup()
    expect(palette()).not.toHaveClass('view-palette--collapsed')
    await user.click(screen.getByRole('button', { name: 'Collapse palette' }))
    expect(palette()).toHaveClass('view-palette--collapsed')
  })

  it('arms on a click and places on Enter while collapsed', async () => {
    localStorage.setItem(PALETTE_COLLAPSED_STORAGE_KEY, 'true')
    const { dispatch, user, surface, view, store } = setup()
    expect(palette()).toHaveClass('view-palette--collapsed')
    const count = view().nodes.length
    const typeOf = (index: number) => {
      const node = view().nodes[index]
      return node?.kind === 'element' ? store.element(node.element)?.type : undefined
    }

    await user.click(tool('Business Actor'))
    expect(tool('Business Actor')).toHaveAttribute('aria-pressed', 'true')
    await click(user, surface, EMPTY_SPOT)
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(typeOf(count)).toBe('BusinessActor')
    await user.keyboard('{Escape}')

    act(() => tool('Application Component').focus())
    await user.keyboard('{Enter}')
    expect(dispatch).toHaveBeenCalledTimes(2)
    expect(typeOf(count + 1)).toBe('ApplicationComponent')
  })

  it('opens from the filter’s button with the filter focused, and the filter places', async () => {
    localStorage.setItem(PALETTE_COLLAPSED_STORAGE_KEY, 'true')
    const { dispatch, user, view, store } = setup()
    expect(palette()).toHaveClass('view-palette--collapsed')
    expect(screen.queryByRole('searchbox', { name: /Find an element type/ })).toBeNull()

    await user.click(within(palette()).getByRole('button', { name: /Find an element type/ }))

    expect(palette()).not.toHaveClass('view-palette--collapsed')
    expect(screen.getByRole('searchbox', { name: /Find an element type/ })).toHaveFocus()
    const count = view().nodes.length
    await user.keyboard('business role{Enter}')
    expect(dispatch).toHaveBeenCalledTimes(1)
    const placed = view().nodes[count]
    expect(placed?.kind === 'element' && store.element(placed.element)?.type).toBe('BusinessRole')
  })

  it('keeps every shape where it was on screen as the canvas widens and narrows', async () => {
    const OPEN = 196
    const COLLAPSED = 52
    const { user, canvas } = setup()
    const left = () => (document.querySelector('.view-palette--collapsed') ? COLLAPSED : OPEN)
    // Where the canvas starts on screen follows the palette's column.
    vi.mocked(HTMLElement.prototype.getBoundingClientRect).mockImplementation(function (
      this: HTMLElement,
    ) {
      const isCanvas = this.classList.contains('view-screen__canvas')
      const x = isCanvas ? left() : 0
      const width = isCanvas ? SCREEN.width - x : 0
      const height = isCanvas ? SCREEN.height : 0
      return {
        x,
        y: 0,
        left: x,
        top: 0,
        right: x + width,
        bottom: height,
        width,
        height,
        toJSON: () => ({}),
      } as DOMRect
    })
    /** Where view point (0, 0) is drawn on screen, and at what zoom. */
    const origin = () => {
      const g = canvas.querySelector('g[transform^="translate"]')!
      const [, x, y, zoom] = /translate\(([-\d.e]+) ([-\d.e]+)\) scale\(([-\d.e]+)\)/.exec(
        g.getAttribute('transform')!,
      )!
      return { x: Number(x) + left(), y: Number(y), zoom: Number(zoom) }
    }
    const before = origin()

    await user.click(screen.getByRole('button', { name: 'Collapse palette' }))
    expect(palette()).toHaveClass('view-palette--collapsed')
    expect(origin()).toEqual(before)

    await user.click(screen.getByRole('button', { name: 'Expand palette' }))
    expect(palette()).not.toHaveClass('view-palette--collapsed')
    expect(origin()).toEqual(before)
  })
})
