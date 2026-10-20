import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen } from '@testing-library/react'
import { toCanonicalJson } from '@/io/canonical-json'
import { absoluteBounds, type View } from '@/model'
import { SCREEN, click, setup } from '@/test/view-editor'
import { clipboardFor } from './clipboard'

/**
 * Copy and paste on the canvas (#137), driven by the keys a user presses. The
 * rule is Archi 5.10's, posted on the issue; `clipboard.test.ts` holds it case
 * by case, and this file holds the canvas to it: which press pastes where, and
 * that one paste is one command.
 *
 * jsdom lays nothing out, so a client point is a view point. The Handle Claim
 * process is at (200, 150), and its own area at (210, 160) is clear of the
 * five shapes nested in it.
 */

const HANDLE = { x: 210, y: 160 }
const EMPTY_SPOT = { x: 1500, y: 1200 }

const key = (chord: string) => `{Meta>}${chord}{/Meta}`
const added = (before: View, after: View) => after.nodes.slice(before.nodes.length)
const selectedIds = () =>
  screen.queryAllByTestId('selection').map((s) => s.getAttribute('data-selected'))

describe('copy and paste on the canvas (#137)', () => {
  it('pastes copies at 10, 10 as one command, selects them, and one undo leaves the file as it was', async () => {
    const { store, dispatch, user, nodeEl, view } = setup()
    const before = view()
    const file = toCanonicalJson(store.snapshot())
    await click(user, nodeEl('o-handle'), HANDLE)
    await user.keyboard(key('c'))
    expect(dispatch).not.toHaveBeenCalled()
    await user.keyboard(key('v'))

    expect(dispatch).toHaveBeenCalledTimes(1)
    const pasted = added(before, view())
    expect(pasted).toHaveLength(6)
    const handle = absoluteBounds(before, 'o-handle')!
    expect(absoluteBounds(view(), pasted[0]!.id)).toEqual({
      ...handle,
      x: handle.x + 10,
      y: handle.y + 10,
    })
    // In the view it was copied from, the elements are drawn, so the paste makes copies.
    const element = pasted[0]!.kind === 'element' ? store.element(pasted[0]!.element) : undefined
    expect(element?.name).toBe('Handle Claim (copy)')
    expect(selectedIds()).toEqual([pasted[0]!.id])

    act(() => void store.undo())
    expect(toCanonicalJson(store.snapshot())).toBe(file)
  })

  it('pastes where the canvas was last pressed, then 10, 10 on from there', async () => {
    const { user, nodeEl, surface, view } = setup()
    await click(user, nodeEl('o-handle'), HANDLE)
    await user.keyboard(key('c'))
    await click(user, surface, EMPTY_SPOT)
    let before = view()
    await user.keyboard(key('v'))
    const first = added(before, view())[0]!
    expect(absoluteBounds(view(), first.id)).toMatchObject(EMPTY_SPOT)

    // The press was used up by that paste.
    before = view()
    await user.keyboard(key('v'))
    const second = added(before, view())[0]!
    expect(absoluteBounds(view(), second.id)).toMatchObject({
      x: EMPTY_SPOT.x + 10,
      y: EMPTY_SPOT.y + 10,
    })
  })

  it('forgets a press made before the copy', async () => {
    const { user, nodeEl, view } = setup()
    // The press that selects is a press on the canvas too, 60, 25 into the process.
    await click(user, nodeEl('o-handle'), { x: 260, y: 175 })
    await user.keyboard(key('c'))
    const before = view()
    await user.keyboard(key('v'))
    const handle = absoluteBounds(before, 'o-handle')!
    expect(absoluteBounds(view(), added(before, view())[0]!.id)).toMatchObject({
      x: handle.x + 10,
      y: handle.y + 10,
    })
  })

  it('draws the same elements again with Paste Special, ⇧⌘V', async () => {
    const { store, dispatch, user, nodeEl, view } = setup()
    const elements = store.elementList().length
    await click(user, nodeEl('o-handle'), HANDLE)
    await user.keyboard(key('c'))
    const before = view()
    await user.keyboard('{Meta>}{Shift>}v{/Shift}{/Meta}')
    expect(dispatch).toHaveBeenCalledTimes(1)
    const pasted = added(before, view())
    expect(pasted[0]).toMatchObject({ kind: 'element', element: 'bp-handle' })
    expect(store.elementList()).toHaveLength(elements)
  })

  it('draws the same elements again in a view that does not draw them', async () => {
    const { store, user, nodeEl, go } = setup()
    const elements = store.elementList().length
    await click(user, nodeEl('o-handle'), HANDLE)
    await user.keyboard(key('c'))
    go('/view/v-empty')
    const surface = document.querySelector<HTMLElement>('.view-screen__canvas')!
    expect(surface).toHaveAccessibleName('View Target state (to do)')
    await click(user, surface, { x: 100, y: 100 })
    await user.keyboard(key('v'))
    const target = store.view('v-empty')!
    expect(target.nodes).toHaveLength(6)
    expect(target.nodes[0]).toMatchObject({ element: 'bp-handle', bounds: { x: 100, y: 100 } })
    expect(target.connections).toHaveLength(5)
    expect(store.elementList()).toHaveLength(elements)
  })

  it('duplicates with ⌘D at 10, 10, and leaves the clipboard alone', async () => {
    const { store, dispatch, user, nodeEl, view } = setup()
    await click(user, nodeEl('o-goal'), { x: 1250, y: 70 })
    const before = view()
    await user.keyboard(key('d'))
    expect(dispatch).toHaveBeenCalledTimes(1)
    const [copy] = added(before, view())
    const goal = absoluteBounds(before, 'o-goal')!
    expect(absoluteBounds(view(), copy!.id)).toEqual({ ...goal, x: goal.x + 10, y: goal.y + 10 })
    expect(copy!.kind === 'element' && store.element(copy!.element)!.name).toBe(
      'Settle claims within five days (copy)',
    )
    expect(selectedIds()).toEqual([copy!.id])
    expect(clipboardFor(store).snapshot).toBeUndefined()
  })

  it('copies nothing with no shape selected, and leaves the browser its key', async () => {
    const { store, user, nodeEl, surface } = setup()
    await click(user, nodeEl('o-handle'), HANDLE)
    // A copy that is made, so the absences below are measured against a press that acts.
    expect(fireEvent.keyDown(surface, { key: 'c', metaKey: true })).toBe(false)
    const held = clipboardFor(store).snapshot
    expect(held?.nodes[0]?.id).toBe('o-handle')

    await user.keyboard('{Escape}')
    expect(selectedIds()).toEqual([])
    expect(fireEvent.keyDown(surface, { key: 'c', metaKey: true })).toBe(true)
    expect(fireEvent.keyDown(surface, { key: 'd', metaKey: true })).toBe(true)
    expect(clipboardFor(store).snapshot).toBe(held)
  })

  it('pastes nothing from an empty clipboard, and leaves the browser its key', async () => {
    const { dispatch, user, nodeEl, surface } = setup()
    await click(user, nodeEl('o-handle'), HANDLE)
    expect(fireEvent.keyDown(surface, { key: 'v', metaKey: true })).toBe(true)
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('does nothing in the middle of a drag', async () => {
    const { store, dispatch, user, nodeEl } = setup()
    await click(user, nodeEl('o-handle'), HANDLE)
    await user.keyboard(key('c'))
    expect(clipboardFor(store).snapshot).toBeDefined()
    await user.pointer({
      keys: '[MouseLeft>]',
      target: nodeEl('o-goal'),
      coords: { clientX: 1250, clientY: 70 },
    })
    await user.pointer({ target: nodeEl('o-goal'), coords: { clientX: 1290, clientY: 90 } })
    await user.keyboard(key('v'))
    await user.keyboard(key('d'))
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('leaves the viewport where it is, though no press on the canvas took it from the fit', async () => {
    // Measured, so the canvas fits its drawing as it opens, and would fit it again.
    for (const side of ['clientWidth', 'clientHeight'] as const) {
      vi.spyOn(HTMLElement.prototype, side, 'get').mockImplementation(function (this: HTMLElement) {
        if (!this.classList.contains('view-screen__canvas')) return 0
        return side === 'clientWidth' ? SCREEN.width : SCREEN.height
      })
    }
    const { surface, user, go, view } = setup()
    const drawn = () =>
      screen.getByTestId('view-canvas').querySelector('g')!.getAttribute('transform')
    const fitted = drawn()
    expect(fitted).not.toBe('translate(0 0) scale(1)')
    // Selected from the model tree, and the canvas reached by the keyboard.
    go('/view/v-landscape?element=g-settle')
    expect(selectedIds()).toEqual(['o-goal'])
    act(() => surface.focus())
    const before = view()
    await user.keyboard(key('d'))
    // The duplicate is drawn to the right of everything else, so the drawing has grown.
    expect(added(before, view())).toHaveLength(1)
    expect(drawn()).toBe(fitted)
  })

  it('does nothing in a tab that only reads the model', async () => {
    const { store, dispatch, user, nodeEl, surface } = setup('reader')
    await click(user, nodeEl('o-handle'), HANDLE)
    expect(surface).toHaveFocus()
    await user.keyboard(key('c'))
    await user.keyboard(key('d'))
    expect(clipboardFor(store).snapshot).toBeUndefined()
    expect(dispatch).not.toHaveBeenCalled()
  })
})

describe('text fields keep the browser’s own copy and paste (#137)', () => {
  /** A copy on the clipboard and a shape selected, so each chord would act on the canvas. */
  async function ready() {
    const harness = setup()
    const { store, user, nodeEl, surface, dispatch } = harness
    await click(user, nodeEl('o-handle'), HANDLE)
    await user.keyboard(key('c'))
    const held = clipboardFor(store).snapshot
    expect(held).toBeDefined()
    // On the canvas, each chord acts and takes the key from the browser.
    expect(fireEvent.keyDown(surface, { key: 'd', metaKey: true })).toBe(false)
    expect(dispatch).toHaveBeenCalledTimes(1)
    act(() => void store.undo())
    dispatch.mockClear()
    return { ...harness, held }
  }

  const chords = [
    { key: 'c', metaKey: true },
    { key: 'v', metaKey: true },
    { key: 'v', metaKey: true, shiftKey: true },
    { key: 'd', metaKey: true },
    { key: 'c', ctrlKey: true },
    { key: 'v', ctrlKey: true },
    { key: 'd', ctrlKey: true },
  ]

  for (const [name, open] of [
    [
      'the name typed on a shape',
      async ({ user, nodeEl }: Awaited<ReturnType<typeof ready>>) => {
        await click(user, nodeEl('o-handle'), HANDLE)
        await user.keyboard('{F2}')
        return screen.getByRole('textbox', { name: 'Element name' })
      },
    ],
    ['the view’s name', async () => screen.getByRole('textbox', { name: 'View name' })],
    [
      'the palette’s type filter',
      async () => screen.getByRole('searchbox', { name: 'Find an element type to place' }),
    ],
  ] as const) {
    it(`in ${name}`, async () => {
      const harness = await ready()
      const field = await open(harness)
      field.focus()
      for (const chord of chords) {
        expect(fireEvent.keyDown(field, chord), JSON.stringify(chord)).toBe(true)
      }
      expect(harness.dispatch).not.toHaveBeenCalled()
      expect(clipboardFor(harness.store).snapshot).toBe(harness.held)
    })
  }
})
