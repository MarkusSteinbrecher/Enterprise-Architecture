import { describe, expect, it } from 'vitest'
import { act, fireEvent, screen, within } from '@testing-library/react'
import { toCanonicalJson } from '@/io/canonical-json'
import type { Appearance, ViewConnection, ViewNode, Workspace } from '@/model'
import { LANDSCAPE, click, setup } from '@/test/view-editor'

/**
 * Appearance editing and the format painter (#135), driven through the
 * selection panel and the canvas as a user drives them, with the store's own
 * `dispatch` counted so "one change, one command" is measured where the
 * command is made.
 *
 * The claims landscape: o-engine overrides its fill, line, font and style;
 * o-crm a fill with an alpha; o-goal and o-req override nothing; o-split is a
 * junction. jsdom lays nothing out, so a client point is a view point.
 */

const AT = {
  // Inside o-engine (220, 480, 400 × 160) and clear of the functions nested in it.
  'o-engine': { x: 230, y: 490 },
  'o-crm': { x: 870, y: 510 },
  'o-goal': { x: 1250, y: 70 },
  'o-req': { x: 1250, y: 190 },
  'o-split': { x: 545, y: 225 },
} as const
type Shape = keyof typeof AT

function harness(role: 'writer' | 'reader' = 'writer', options?: Parameters<typeof setup>[1]) {
  const h = setup(role, options)
  const select = async (...ids: Shape[]) => {
    const [first, ...rest] = ids
    await click(h.user, h.nodeEl(first!), AT[first!])
    for (const id of rest) await click(h.user, h.nodeEl(id), AT[id], 'Shift')
  }
  const drawing = (id: string): ViewNode | ViewConnection =>
    h.view().nodes.find((n) => n.id === id) ?? h.view().connections.find((c) => c.id === id)!
  const appearance = (id: string): Appearance | undefined => drawing(id).appearance
  const section = () => screen.getByRole('region', { name: 'Appearance' })
  const field = (label: string) => within(section()).getByLabelText(label) as HTMLInputElement
  const button = (name: string) => within(section()).getByRole('button', { name })
  /** Replace a typed field's text and press Enter. */
  const enter = async (label: string, text: string) => {
    await h.user.clear(field(label))
    await h.user.type(field(label), `${text}{Enter}`)
  }
  return { ...h, select, drawing, appearance, section, field, button, enter }
}

/** The canonical JSON of a workspace, as ADR 0004 defines equality. */
const canonical = (workspace: Workspace) => toCanonicalJson(workspace)

describe('the appearance section (#135)', () => {
  it('shows one drawing’s overrides, and the notation’s default where it has none', async () => {
    const { select, field, button, section } = harness()
    await select('o-engine')
    expect(field('Fill').value).toBe('#c9e7f7')
    expect(field('Line colour').value).toBe('#1d5c8c')
    expect(field('Font').value).toBe('Arial')
    expect(field('Font size').value).toBe('11')
    expect(field('Font colour').value).toBe('#0b2e4a')
    expect(button('Bold')).toHaveAttribute('aria-pressed', 'true')
    expect(button('Italic')).toHaveAttribute('aria-pressed', 'false')
    expect(field('Alignment')).toHaveValue('')
    expect(within(section()).getByRole('button', { name: 'Reset fill to default' })).toBeEnabled()
    expect(button('Reset alignment to default')).toBeDisabled()
  })

  it('shows a multi-selection’s values where they agree, and mixed where they do not', async () => {
    const { select, field, button } = harness()
    await select('o-engine', 'o-goal')
    expect(screen.getByRole('complementary', { name: 'Selected: 2 shapes' })).toBeInTheDocument()
    expect(field('Fill').value).toBe('')
    expect(field('Fill')).toHaveAttribute('placeholder', 'Mixed')
    expect(button('Bold')).toHaveAttribute('aria-pressed', 'mixed')
    expect(button('Reset fill to default')).toBeEnabled()
    // Neither overrides the alignment: one value, the default.
    expect(field('Alignment')).toHaveValue('')
    expect(button('Reset alignment to default')).toBeDisabled()
  })

  it('shows a list whose values differ as mixed, and keeps them until one is chosen', async () => {
    const { select, user, field, dispatch, appearance } = harness()
    await select('o-goal')
    await user.selectOptions(field('Alignment'), 'right')
    await select('o-goal', 'o-req')
    expect(field('Alignment')).toHaveValue('mixed')
    expect(within(field('Alignment')).getByRole('option', { selected: true })).toHaveTextContent(
      'Mixed',
    )
    await user.selectOptions(field('Alignment'), 'left')
    expect(dispatch).toHaveBeenCalledTimes(2)
    expect(appearance('o-goal')).toEqual({ textAlignment: 'left' })
    expect(appearance('o-req')).toEqual({ textAlignment: 'left' })
  })

  it('offers a shape and a junction together only the fields a junction has', async () => {
    const { select, section } = harness()
    await select('o-goal', 'o-split')
    const labels = within(section())
      .getAllByText(/./, { selector: 'label' })
      .map((label) => label.textContent)
    expect(labels).toEqual(['Fill', 'Line colour', 'Line width'])
  })
})

describe('a change to the selection is one command (#135)', () => {
  it('sets a fill on three shapes as one command, and one undo restores each one’s own, none included', async () => {
    const { select, enter, field, dispatch, appearance, store } = harness()
    const before = {
      engine: appearance('o-engine'),
      crm: appearance('o-crm'),
    }
    await select('o-engine', 'o-crm', 'o-goal')
    await enter('Fill', '#123456')
    expect(dispatch).toHaveBeenCalledTimes(1)
    for (const id of ['o-engine', 'o-crm', 'o-goal']) {
      expect(appearance(id)?.fillColor, id).toBe('#123456')
    }

    act(() => void store.undo())
    // The field shows the undo: the three differ again.
    expect(field('Fill')).toHaveValue('')
    expect(field('Fill')).toHaveAttribute('placeholder', 'Mixed')
    expect(appearance('o-engine')).toEqual(before.engine)
    expect(appearance('o-crm')).toEqual({ fillColor: '#e0e0e0a1' })
    expect(appearance('o-crm')).toEqual(before.crm)
    // It had none, and has none again: not an empty object, no key at all.
    expect(store.view(LANDSCAPE)!.nodes.find((n) => n.id === 'o-goal')).not.toHaveProperty(
      'appearance',
    )
  })

  it('makes a choice, a style and a reset over a selection one command each', async () => {
    const { select, user, field, button, dispatch, appearance, store } = harness()
    await select('o-engine', 'o-goal')
    await user.selectOptions(field('Alignment'), 'right')
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(appearance('o-goal')).toEqual({ textAlignment: 'right' })
    expect(appearance('o-engine')?.textAlignment).toBe('right')

    // A mixed style is turned on everywhere.
    await user.click(button('Bold'))
    expect(dispatch).toHaveBeenCalledTimes(2)
    expect(appearance('o-goal')?.fontStyle).toEqual(['bold'])
    expect(button('Bold')).toHaveAttribute('aria-pressed', 'true')
    await user.click(button('Bold'))
    expect(dispatch).toHaveBeenCalledTimes(3)
    expect(appearance('o-goal')).toEqual({ textAlignment: 'right' })
    expect(appearance('o-engine')?.fontStyle).toBeUndefined()

    await user.click(button('Reset font colour to default'))
    expect(dispatch).toHaveBeenCalledTimes(4)
    expect(appearance('o-engine')).not.toHaveProperty('fontColor')

    act(() => void store.undo())
    expect(appearance('o-engine')?.fontColor).toBe('#0b2e4a')
  })

  it('records nothing for a field left as it was, a mixed one included', async () => {
    const { select, user, field, dispatch, appearance } = harness()
    await select('o-engine')
    await user.click(field('Fill'))
    await user.keyboard('{Enter}')
    await user.tab()
    // A mix shows as an empty field, and an empty field resets: unless it is left as it was.
    await select('o-engine', 'o-goal')
    await user.click(field('Fill'))
    await user.keyboard('{Enter}')
    await user.tab()
    expect(dispatch).not.toHaveBeenCalled()
    expect(appearance('o-engine')?.fillColor).toBe('#c9e7f7')
  })

  it('opens the panel for a multi-selection only once the press ends, so a drag keeps the canvas', async () => {
    const { select, user, nodeEl } = harness()
    await select('o-engine')
    await user.keyboard('{Shift>}')
    await user.pointer({
      keys: '[MouseLeft>]',
      target: nodeEl('o-goal'),
      coords: { clientX: AT['o-goal'].x, clientY: AT['o-goal'].y },
    })
    expect(screen.getAllByTestId('selection')).toHaveLength(2)
    expect(screen.queryByRole('complementary')).toBeNull()
    await user.pointer({
      keys: '[/MouseLeft]',
      target: nodeEl('o-goal'),
      coords: { clientX: AT['o-goal'].x, clientY: AT['o-goal'].y },
    })
    await user.keyboard('{/Shift}')
    expect(screen.getByRole('complementary', { name: 'Selected: 2 shapes' })).toBeInTheDocument()
  })

  it('closes the multi-selection panel, giving focus back to the canvas', async () => {
    const { select, user } = harness()
    await select('o-engine', 'o-goal')
    const panel = screen.getByRole('complementary', { name: 'Selected: 2 shapes' })
    await user.click(within(panel).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('complementary')).toBeNull()
    expect(document.querySelector('.view-screen__canvas')).toHaveFocus()
  })
})

describe('reset to default (#135)', () => {
  it('takes each list’s Default as no override, never as an empty value or zero', async () => {
    const { select, user, field, drawing } = harness()
    await select('o-goal')
    await user.selectOptions(field('Alignment'), 'right')
    await user.selectOptions(field('Position'), 'bottom')
    await user.selectOptions(field('Line width'), '3')
    expect(drawing('o-goal').appearance).toEqual({
      lineWidth: 3,
      textAlignment: 'right',
      textPosition: 'bottom',
    })
    await user.selectOptions(field('Alignment'), '')
    expect(drawing('o-goal').appearance).toEqual({ lineWidth: 3, textPosition: 'bottom' })
    await user.selectOptions(field('Position'), '')
    expect(drawing('o-goal').appearance).toEqual({ lineWidth: 3 })
    await user.selectOptions(field('Line width'), '')
    expect(drawing('o-goal')).not.toHaveProperty('appearance')
  })

  it('shows a width no option names, as another tool may have written it', async () => {
    const { select, field } = harness('writer', {
      prepare: (store) =>
        store.updateNode(LANDSCAPE, 'o-goal', (node) => ({
          ...node,
          appearance: { lineWidth: 1 },
        })),
    })
    await select('o-goal')
    expect(field('Line width')).toHaveValue('1')
    expect(within(field('Line width')).getByRole('option', { selected: true })).toHaveTextContent(
      '1 px',
    )
  })

  it('removes the field, so a reset drawing’s canonical JSON is that of one never edited', async () => {
    const { select, enter, button, dispatch, store, drawing } = harness()
    const never = canonical(store.snapshot())
    await select('o-goal')
    await enter('Fill', '#ff0000')
    await enter('Font size', '14')
    expect(drawing('o-goal').appearance).toEqual({ fillColor: '#ff0000', fontSize: 14 })
    expect(canonical(store.snapshot())).not.toBe(never)

    await select('o-goal')
    await act(async () => button('Reset fill to default').click())
    await act(async () => button('Reset font size to default').click())
    expect(dispatch).toHaveBeenCalledTimes(4)
    expect(drawing('o-goal')).not.toHaveProperty('appearance')
    expect(canonical(store.snapshot())).toBe(never)
  })

  it('takes away one override and keeps the others, without writing the default', async () => {
    const { select, user, button, appearance } = harness()
    await select('o-engine')
    await user.click(button('Reset fill to default'))
    expect(appearance('o-engine')).toEqual({
      fontColor: '#0b2e4a',
      fontName: 'Arial',
      fontSize: 11,
      fontStyle: ['bold'],
      lineColor: '#1d5c8c',
    })
  })

  it('resets a field emptied by hand, as the reset button does', async () => {
    const { select, user, field, appearance } = harness()
    await select('o-engine')
    await user.clear(field('Font'))
    await user.keyboard('{Enter}')
    expect(appearance('o-engine')).not.toHaveProperty('fontName')
  })

  it('resets every override at once, and leaves the drawing as one never edited', async () => {
    const { select, user, button, store, dispatch } = harness()
    // A copy: the snapshot shares the store's own drawings.
    const expected = structuredClone(store.snapshot())
    const engine = expected.views
      .find((v) => v.id === LANDSCAPE)!
      .nodes.find((n) => n.id === 'o-engine')!
    delete engine.appearance
    await select('o-engine')
    await user.click(button('Reset all'))
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(canonical(store.snapshot())).toBe(canonical(expected))
  })

  it('gives focus to the field it reset, and to the canvas after a reset of everything', async () => {
    const { select, user, button, field } = harness()
    await select('o-engine')
    await user.click(button('Reset fill to default'))
    expect(button('Reset fill to default')).toBeDisabled()
    expect(field('Fill')).toHaveFocus()
    await user.selectOptions(field('Alignment'), 'left')
    await user.click(button('Reset alignment to default'))
    expect(button('Reset alignment to default')).toBeDisabled()
    expect(field('Alignment')).toHaveFocus()
    await user.click(button('Reset all'))
    expect(button('Reset all')).toBeDisabled()
    expect(document.querySelector('.view-screen__canvas')).toHaveFocus()
  })
})

describe('the colour guard (#135)', () => {
  it('stores nothing for an invalid colour, and says why', async () => {
    const { select, enter, field, dispatch, appearance } = harness()
    await select('o-goal')
    for (const typed of ['#zz', '#', 'red', '#12345']) {
      await enter('Fill', typed)
      expect(field('Fill'), typed).toHaveAttribute('aria-invalid', 'true')
      expect(appearance('o-goal'), typed).toBeUndefined()
    }
    expect(dispatch).not.toHaveBeenCalled()
    expect(screen.getByText('A colour as hex, such as #1f6feb.')).toBeInTheDocument()
  })

  it('puts the stored colour back on Escape, and forgets the mistake', async () => {
    const { select, user, field } = harness()
    await select('o-engine')
    await user.clear(field('Fill'))
    await user.type(field('Fill'), 'nope{Enter}')
    expect(field('Fill')).toHaveAttribute('aria-invalid', 'true')
    await user.keyboard('{Escape}')
    expect(field('Fill')).toHaveValue('#c9e7f7')
    expect(field('Fill')).not.toHaveAttribute('aria-invalid')
    expect(field('Fill')).toHaveFocus()
  })

  it('keeps the colour a drawing had when the one typed over it is invalid', async () => {
    const { select, enter, dispatch, appearance } = harness()
    await select('o-engine')
    await enter('Line colour', 'blue')
    expect(dispatch).not.toHaveBeenCalled()
    expect(appearance('o-engine')?.lineColor).toBe('#1d5c8c')
  })

  it('stores a typed colour as the model holds one: lower-case, with its #', async () => {
    const { select, enter, appearance } = harness()
    await select('o-goal')
    await enter('Font colour', 'AB12CD')
    expect(appearance('o-goal')).toEqual({ fontColor: '#ab12cd' })
  })

  it('takes a picked colour once, when the picker closes, and keeps the override’s alpha', async () => {
    const { select, section, dispatch, appearance } = harness()
    await select('o-crm')
    const swatch = within(section()).getByLabelText('Pick fill') as HTMLInputElement
    expect(swatch.value).toBe('#e0e0e0')
    // Moving inside the picker fires `input`: nothing is stored until it closes.
    fireEvent.input(swatch, { target: { value: '#00ff00' } })
    expect(dispatch).not.toHaveBeenCalled()
    fireEvent.change(swatch, { target: { value: '#00ff00' } })
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(appearance('o-crm')).toEqual({ fillColor: '#00ff00a1' })
  })

  it('stores nothing for a font size that is not whole points', async () => {
    const { select, enter, dispatch, field } = harness()
    await select('o-goal')
    await enter('Font size', '10.5')
    expect(field('Font size')).toHaveAttribute('aria-invalid', 'true')
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('never carries a draft typed for one drawing onto the next one selected', async () => {
    const { select, user, field, go, view, appearance, dispatch } = harness()
    await select('o-req')
    // o-req and o-goal both have no fill, so the field shows the same either way.
    await user.clear(field('Fill'))
    await user.type(field('Fill'), '#123456')
    const goal = view().nodes.find((n) => n.id === 'o-goal')!
    if (goal.kind !== 'element') throw new Error('o-goal draws no element')
    // The model tree selects another drawing without a press on the canvas.
    go(`/view/${LANDSCAPE}?element=${goal.element}`)
    expect(
      screen.getByRole('complementary', { name: 'Selected: Settle claims within five days' }),
    ).toBeInTheDocument()
    const fill = field('Fill')
    expect(fill.value).toBe('')
    act(() => fill.blur())
    expect(appearance('o-goal')).toBeUndefined()
    expect(dispatch).not.toHaveBeenCalled()
  })
})

describe('the format painter (#135)', () => {
  it('paints exactly the source’s overrides onto each shape pressed, one command each', async () => {
    const { select, user, button, nodeEl, dispatch, appearance } = harness()
    await select('o-engine')
    const source = appearance('o-engine')
    await user.click(button('Format painter'))
    expect(button('Format painter')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('Format painter')

    // o-crm's fill had an alpha; it takes the engine's, whole.
    await click(user, nodeEl('o-crm'), AT['o-crm'])
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(appearance('o-crm')).toEqual(source)
    await click(user, nodeEl('o-goal'), AT['o-goal'])
    expect(dispatch).toHaveBeenCalledTimes(2)
    expect(appearance('o-goal')).toEqual(source)
    // Painting selects nothing: the source is still the selection.
    expect(screen.getAllByTestId('selection').map((s) => s.getAttribute('data-selected'))).toEqual([
      'o-engine',
    ])
  })

  it('copies the absence of an override as an absence', async () => {
    const { select, user, button, nodeEl, store, drawing } = harness()
    await select('o-req')
    await user.click(button('Format painter'))
    await click(user, nodeEl('o-engine'), AT['o-engine'])
    expect(drawing('o-engine')).not.toHaveProperty('appearance')
    // One undo gives every override back.
    act(() => void store.undo())
    expect(drawing('o-engine').appearance?.fillColor).toBe('#c9e7f7')
  })

  it('paints from a shape onto a line only what a line has', async () => {
    const { select, user, button, surface, appearance } = harness()
    await select('o-engine')
    await user.click(button('Format painter'))
    const line = surface.querySelector('[data-line-hit="c-pay-ins"]')!
    await click(user, line, { x: 0, y: 0 })
    expect(appearance('c-pay-ins')).toEqual({
      fontColor: '#0b2e4a',
      fontName: 'Arial',
      fontSize: 11,
      fontStyle: ['bold'],
      lineColor: '#1d5c8c',
    })
  })

  it('neither picks up from a junction nor paints onto one, as Archi', async () => {
    const { select, user, button, nodeEl, section, dispatch } = harness()
    await select('o-split')
    expect(within(section()).queryByRole('button', { name: 'Format painter' })).toBeNull()
    await select('o-engine')
    await user.click(button('Format painter'))
    await click(user, nodeEl('o-split'), AT['o-split'])
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('stops on Escape, and a press then selects again', async () => {
    const { select, user, button, nodeEl, dispatch } = harness()
    await select('o-engine')
    await user.click(button('Format painter'))
    expect(screen.getByRole('status')).toBeInTheDocument()
    ;(document.querySelector('.view-screen__canvas') as HTMLElement).focus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('status')).toBeNull()
    // The selection is kept: Escape put the painter down, nothing else.
    expect(screen.getAllByTestId('selection')).toHaveLength(1)
    await click(user, nodeEl('o-goal'), AT['o-goal'])
    expect(dispatch).not.toHaveBeenCalled()
    expect(screen.getAllByTestId('selection').map((s) => s.getAttribute('data-selected'))).toEqual([
      'o-goal',
    ])
  })

  it('stops on Done, which gives focus back to the canvas', async () => {
    const { select, user, button } = harness()
    await select('o-engine')
    await user.click(button('Format painter'))
    await user.click(within(screen.getByRole('status')).getByRole('button', { name: 'Done' }))
    expect(screen.queryByRole('status')).toBeNull()
    expect(button('Format painter')).toHaveAttribute('aria-pressed', 'false')
    expect(document.querySelector('.view-screen__canvas')).toHaveFocus()
  })

  it('is put down when a palette tool is armed, and puts the tool down when picked up', async () => {
    const { select, user, button } = harness()
    await select('o-engine')
    await user.click(button('Format painter'))
    const note = screen.getAllByRole('button', { name: /^Note/ })[0]!
    await user.click(note)
    expect(note).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('status')).toBeNull()
    await user.click(button('Format painter'))
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(note).toHaveAttribute('aria-pressed', 'false')
  })
})

describe('a reader (#135)', () => {
  it('sees the appearance and can change none of it', async () => {
    const { select, field, section } = harness('reader')
    await select('o-engine')
    expect(field('Fill').value).toBe('#c9e7f7')
    expect(field('Fill')).toBeDisabled()
    expect(within(section()).queryByRole('button', { name: /Reset/ })).toBeNull()
    expect(within(section()).queryByRole('button', { name: 'Format painter' })).toBeNull()
  })
})
