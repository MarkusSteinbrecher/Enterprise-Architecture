import { describe, expect, it } from 'vitest'
import { act, screen } from '@testing-library/react'
import { toCanonicalJson } from '@/io/canonical-json'
import type { ModelStore } from '@/store'
import { click, setup } from '@/test/view-editor'

/**
 * A relationship's documentation in the selection panel for a line (#171), as
 * Archi's Properties view edits it for a selected connection. The claims
 * landscape draws Assignment `r-cust-ins` as `c-cust-ins`, pressed at
 * (215, 87), and `r-ins-reg` as `c-reg-ins`, at (425, 87); neither is
 * documented in the fixture.
 */

const model = (store: ModelStore) => toCanonicalJson(store.snapshot())
const field = () => screen.getByRole('textbox', { name: 'Documentation' })
type Harness = ReturnType<typeof setup>
const lineHit = (h: Harness, id: string) => h.canvas.querySelector(`[data-line-hit="${id}"]`)!
const pressCustIns = (h: Harness) => click(h.user, lineHit(h, 'c-cust-ins'), { x: 215, y: 87 })
const pressRegIns = (h: Harness) => click(h.user, lineHit(h, 'c-reg-ins'), { x: 425, y: 87 })

describe('a relationship’s documentation in the line panel (#171)', () => {
  it('commits once, when the typing is done, as one update-relationship; undo and redo restore the text shown', async () => {
    const h = setup()
    const before = model(h.store)
    await pressCustIns(h)
    expect(field()).toHaveValue('')

    await h.user.type(field(), 'Every customer is an insurant.{Enter}Second line.')
    expect(h.dispatch).not.toHaveBeenCalled()
    await h.user.keyboard('{Control>}{Enter}{/Control}')
    expect(h.dispatch).toHaveBeenCalledTimes(1)
    expect(h.dispatch.mock.calls[0]![0]).toMatchObject({
      kind: 'update-relationship',
      after: { id: 'r-cust-ins' },
    })
    expect(h.store.relationship('r-cust-ins')?.documentation).toBe(
      'Every customer is an insurant.\nSecond line.',
    )
    // ⌘/Ctrl+Enter is done with the field: the canvas takes the keys again.
    expect(h.surface).toHaveFocus()

    act(() => void h.store.undo())
    expect(field()).toHaveValue('')
    expect(model(h.store)).toBe(before)
    act(() => void h.store.redo())
    expect(field()).toHaveValue('Every customer is an insurant.\nSecond line.')
  })

  it('clears to none, as on a relationship never documented', async () => {
    const h = setup('writer', {
      prepare: (s) => s.updateRelationship('r-cust-ins', (r) => ({ ...r, documentation: 'Old.' })),
    })
    await pressCustIns(h)
    expect(field()).toHaveValue('Old.')
    await h.user.clear(field())
    await h.user.keyboard('{Control>}{Enter}{/Control}')
    expect(h.dispatch).toHaveBeenCalledTimes(1)
    expect(h.store.relationship('r-cust-ins')).not.toHaveProperty('documentation')
  })

  it('records nothing for an unchanged field or Escape', async () => {
    const h = setup()
    await pressCustIns(h)
    await h.user.type(field(), 'Typed{Escape}')
    expect(field()).toHaveValue('')
    expect(h.surface).toHaveFocus()
    // Typed and typed away again: what is stored is unchanged, so leaving records nothing.
    await h.user.type(field(), 'x{Backspace}')
    await h.user.click(h.surface)
    expect(h.dispatch).not.toHaveBeenCalled()
  })

  it('keeps what was typed on the line it was typed for when a press on another line takes the panel', async () => {
    const h = setup()
    await pressCustIns(h)
    await h.user.type(field(), 'For the assignment')
    await pressRegIns(h)
    expect(h.store.relationship('r-cust-ins')?.documentation).toBe('For the assignment')
    expect(h.store.relationship('r-ins-reg')).not.toHaveProperty('documentation')
    // The next line's panel shows its own documentation, not the typing.
    expect(field()).toHaveValue('')
    expect(h.dispatch).toHaveBeenCalledTimes(1)
  })

  it('shows a reader the documentation, with nothing to edit', async () => {
    const h = setup('reader', {
      prepare: (s) =>
        s.updateRelationship('r-cust-ins', (r) => ({ ...r, documentation: 'Read me.' })),
    })
    await pressCustIns(h)
    const panel = screen.getByRole('complementary', { name: /Selected: .* relationship/ })
    expect(panel).toHaveTextContent('Read me.')
    expect(screen.queryByRole('textbox', { name: 'Documentation' })).not.toBeInTheDocument()
  })

  it('tells a reader when there is none', async () => {
    const h = setup('reader')
    await pressCustIns(h)
    const panel = screen.getByRole('complementary', { name: /Selected: .* relationship/ })
    expect(panel).toHaveTextContent('No documentation.')
  })
})
