import { describe, expect, it } from 'vitest'
import { act, fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toCanonicalJson } from '@/io/canonical-json'
import {
  DEFAULT_LEGEND_OPTIONS,
  legendEntries,
  type GroupNode,
  type View,
  type ViewNode,
} from '@/model'
import type { ModelStore } from '@/store'
import { drawnWorkspace } from '@/test/fixtures'
import { renderApp } from '@/test/render'
import { click, drop, setup } from '@/test/view-editor'
import { ELEMENT_DRAG_TYPE, VIEW_DRAG_TYPE } from './create'

/**
 * Notes, groups, legends and view references on the canvas (#134), driven as
 * a user drives them. `dispatch` is the store's own, so "one command" is
 * counted where commands are made. The claims landscape ends at x 1410, so the
 * canvas right of x 1500 is empty; its Business group spans 20–1200 × 20–320,
 * with nothing drawn at (30, 300).
 */

const model = (store: ModelStore) => toCanonicalJson(store.snapshot())
const EMPTY_SPOT = { x: 1600, y: 100 }
const IN_BUSINESS_GROUP = { x: 30, y: 300 }

const tool = (name: string) =>
  within(screen.getByRole('region', { name: 'Palette' })).getByRole('button', { name })
const newest = (nodes: readonly ViewNode[]) => nodes[nodes.length - 1]!
const field = (name: string) => screen.getByRole('textbox', { name })
/** The canvas's own text editor, for a note, a group or an element's name. */
const inlineEditor = () => document.querySelector('.view-inline')

/** The types a legend's drawing lists, in the order drawn. */
const drawnEntries = (legend: Element) =>
  [...legend.querySelectorAll('[data-legend-entry]')].map((el) =>
    el.getAttribute('data-legend-entry'),
  )

/** The types the view draws, as the model works them out. */
const typesIn = (store: ModelStore, view: View) =>
  legendEntries(view, DEFAULT_LEGEND_OPTIONS, {
    elementType: (id) => store.element(id)?.type,
    relationshipType: (id) => store.relationship(id)?.type,
  }).map((entry) => entry.type)

describe('a legend (#134)', () => {
  it('is placed in one command, as Archi makes one, with no text to type; one undo takes it away', async () => {
    const { store, dispatch, user, surface, view } = setup()
    const before = model(store)
    await user.click(tool('Legend'))
    await click(user, surface, EMPTY_SPOT)

    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(newest(view().nodes)).toMatchObject({
      kind: 'legend',
      name: 'Legend',
      options: DEFAULT_LEGEND_OPTIONS,
      bounds: { ...EMPTY_SPOT, width: 210, height: 320 },
    })
    expect(inlineEditor()).toBeNull()
    expect(surface).toHaveFocus()
    // Double-click opens no editor either: there is no text.
    await user.dblClick(surface.querySelector(`[data-node="${newest(view().nodes).id}"]`)!)
    expect(inlineEditor()).toBeNull()

    act(() => void store.undo())
    expect(model(store)).toBe(before)
  })

  it('lists the element and relationship types the view draws, and gains one for a new type', async () => {
    const { store, dispatch, user, surface, view, nodeEl } = setup()
    await user.click(tool('Legend'))
    await click(user, surface, EMPTY_SPOT)
    const legend = newest(view().nodes)
    const listed = drawnEntries(nodeEl(legend.id))
    expect(listed.length).toBeGreaterThan(3)
    expect(listed).toEqual(typesIn(store, view()))
    // Every element type the view draws is there, once.
    const elementTypes = new Set(
      view().nodes.flatMap((n) => (n.kind === 'element' ? [store.element(n.element)!.type] : [])),
    )
    expect(listed.filter((type) => elementTypes.has(type as never)).sort()).toEqual(
      [...elementTypes].sort(),
    )
    expect(elementTypes.has('Gap')).toBe(false)

    // An element of a type the view does not draw yet: the legend gains it.
    await user.click(tool('Gap'))
    await click(user, surface, { x: 1600, y: 600 })
    await user.keyboard('{Enter}')
    expect(dispatch).toHaveBeenCalledTimes(2)
    const gained = drawnEntries(nodeEl(legend.id))
    expect(gained).toHaveLength(listed.length + 1)
    expect(gained).toContain('Gap')
    expect(gained).toEqual(typesIn(store, view()))

    // Another of a type it lists already adds nothing.
    await user.click(tool('Gap'))
    await click(user, surface, { x: 1600, y: 800 })
    await user.keyboard('{Enter}')
    expect(dispatch).toHaveBeenCalledTimes(3)
    expect(drawnEntries(nodeEl(legend.id))).toEqual(gained)

    // Undone, the new type goes again.
    act(() => void store.undo())
    act(() => void store.undo())
    expect(drawnEntries(nodeEl(legend.id))).toEqual(listed)
  })

  it('hands the keys to the canvas when placed from the keyboard, as it has no text', async () => {
    const { dispatch, user, surface, view } = setup()
    tool('Legend').focus()
    await user.keyboard('{Enter}')
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(newest(view().nodes)).toMatchObject({ kind: 'legend' })
    expect(surface).toHaveFocus()
  })

  it('says what it lists in the selection panel', async () => {
    const { user, surface, view } = setup('writer', { viewId: 'v-empty' })
    await user.click(tool('Legend'))
    await click(user, surface, { x: 100, y: 100 })
    expect(view().nodes).toHaveLength(1)
    expect(screen.getByRole('complementary', { name: 'Selected legend' })).toHaveTextContent(
      'This view draws no elements or relationships yet',
    )
  })
})

describe('a group’s name and documentation (#134)', () => {
  const group = (view: () => View) => view().nodes.find((n) => n.id === 'o-g-business') as GroupNode

  it('commits each field once, when the typing is done, and one undo each restores them', async () => {
    const { store, dispatch, user, surface, view, nodeEl } = setup()
    const before = model(store)
    await click(user, nodeEl('o-g-business'), IN_BUSINESS_GROUP)
    expect(field('Name')).toHaveValue('Business')

    await user.clear(field('Name'))
    await user.type(field('Name'), 'Front office')
    expect(dispatch).not.toHaveBeenCalled()
    await user.keyboard('{Enter}')
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(group(view).name).toBe('Front office')
    // Enter is done with the field: the canvas takes the keys again.
    expect(surface).toHaveFocus()

    await user.click(field('Documentation'))
    await user.type(field('Documentation'), 'Customer side.{Enter}Second line.')
    expect(dispatch).toHaveBeenCalledTimes(1)
    // Leaving the field commits it, and leaves focus where the user put it.
    await user.click(field('Name'))
    expect(dispatch).toHaveBeenCalledTimes(2)
    expect(group(view).documentation).toBe('Customer side.\nSecond line.')
    expect(field('Name')).toHaveFocus()

    act(() => void store.undo())
    // The field still open shows the undone value.
    expect(field('Documentation')).toHaveValue('')
    act(() => void store.undo())
    expect(field('Name')).toHaveValue('Business')
    expect(model(store)).toBe(before)
  })

  it('records nothing for an unchanged field, an empty name, or Escape', async () => {
    const { dispatch, user, surface, view, nodeEl } = setup()
    await click(user, nodeEl('o-g-business'), IN_BUSINESS_GROUP)
    await user.click(field('Name'))
    await user.click(field('Documentation'))
    await user.clear(field('Name'))
    await user.keyboard('{Enter}')
    expect(group(view).name).toBe('Business')
    // The slip is not left on show: the field holds the name the group kept.
    expect(field('Name')).toHaveValue('Business')
    await user.type(field('Documentation'), 'Typed{Escape}')
    expect(field('Documentation')).toHaveValue('')
    expect(surface).toHaveFocus()
    // Typed and typed away again: the field holds what is stored, so leaving it records nothing.
    await user.type(field('Documentation'), 'x{Backspace}')
    await user.type(field('Name'), 'x{Backspace}')
    await user.click(field('Documentation'))
    await user.click(surface)
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('clears documentation to none, as on a group never documented', async () => {
    const { user, view, nodeEl } = setup('writer', {
      prepare: (s) =>
        s.updateNode('v-landscape', 'o-g-business', (n) => ({ ...n, documentation: 'Old.' })),
    })
    await click(user, nodeEl('o-g-business'), IN_BUSINESS_GROUP)
    await user.clear(field('Documentation'))
    await user.keyboard('{Control>}{Enter}{/Control}')
    expect(group(view)).not.toHaveProperty('documentation')
  })

  it('keeps what was typed when a press on another shape takes the panel away first', async () => {
    const { dispatch, user, surface, view, nodeEl } = setup()
    await click(user, nodeEl('o-g-business'), IN_BUSINESS_GROUP)
    await user.type(field('Documentation'), 'Not lost')
    // A press on a shape selects it at once, and the panel goes before focus moves.
    await click(user, nodeEl('o-customer'), { x: 100, y: 100 })
    expect(screen.queryByRole('textbox', { name: 'Documentation' })).not.toBeInTheDocument()
    expect(group(view).documentation).toBe('Not lost')
    expect(dispatch).toHaveBeenCalledTimes(1)
    // The field went with the panel: focus is on the canvas the press landed on,
    // not dropped to <body> (#187 review).
    expect(surface).toHaveFocus()
  })

  it('shows a reader the documentation, with nothing to edit', async () => {
    const { user, nodeEl } = setup('reader', {
      prepare: (s) =>
        s.updateNode('v-landscape', 'o-g-business', (n) => ({ ...n, documentation: 'Read me.' })),
    })
    await click(user, nodeEl('o-g-business'), IN_BUSINESS_GROUP)
    const panel = screen.getByRole('complementary', { name: 'Selected group' })
    expect(panel).toHaveTextContent('Read me.')
    expect(within(panel).queryByRole('textbox', { name: 'Name' })).not.toBeInTheDocument()
    expect(within(panel).queryByRole('textbox', { name: 'Documentation' })).not.toBeInTheDocument()
    // The appearance section (#135) shows a reader its values, in fields that are
    // all disabled: still nothing to edit.
    const fields = within(panel).getAllByRole('textbox')
    expect(fields.length).toBeGreaterThan(0)
    for (const field of fields) expect(field).toBeDisabled()
  })
})

describe('a note’s text, edited in place (#134)', () => {
  it('keeps its lines, commits once on ⌘/Ctrl+Enter, and one undo restores it', async () => {
    const { store, dispatch, user, nodeEl, view } = setup()
    const before = view().nodes.find((n) => n.id === 'o-note-biz')
    await user.dblClick(nodeEl('o-note-biz'))
    const text = field('Note text')
    expect(text.tagName).toBe('TEXTAREA')
    await user.clear(text)
    await user.type(text, 'One{Enter}two')
    expect(dispatch).not.toHaveBeenCalled()
    await user.keyboard('{Meta>}{Enter}{/Meta}')
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(view().nodes.find((n) => n.id === 'o-note-biz')).toMatchObject({ text: 'One\ntwo' })
    act(() => void store.undo())
    expect(view().nodes.find((n) => n.id === 'o-note-biz')).toEqual(before)
  })
})

describe('a view reference dragged in from the model tree (#134)', () => {
  it('draws a reference to the view in one command, at Archi’s size, in the container there', () => {
    const { store, dispatch, surface, view } = setup()
    const before = model(store)
    expect(drop(surface, { [VIEW_DRAG_TYPE]: 'v-data', 'text/plain': 'Data' }, EMPTY_SPOT)).toBe(
      true,
    )
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(newest(view().nodes)).toMatchObject({
      kind: 'view-ref',
      view: 'v-data',
      bounds: { ...EMPTY_SPOT, width: 120, height: 55 },
    })
    expect(newest(view().nodes)).not.toHaveProperty('parent')
    expect(screen.getByRole('complementary', { name: 'Selected view reference' })).toBeVisible()
    expect(surface).toHaveFocus()

    drop(surface, { [VIEW_DRAG_TYPE]: 'v-data' }, IN_BUSINESS_GROUP)
    expect(newest(view().nodes)).toMatchObject({ kind: 'view-ref', parent: 'o-g-business' })
    act(() => void store.undo())
    act(() => void store.undo())
    expect(model(store)).toBe(before)
  })

  it('draws nothing for the view itself, as Archi refuses it, nor for a view not in the model', () => {
    const { dispatch, surface, view } = setup()
    const count = view().nodes.length
    drop(surface, { [VIEW_DRAG_TYPE]: 'v-landscape' }, EMPTY_SPOT)
    drop(surface, { [VIEW_DRAG_TYPE]: 'v-gone' }, EMPTY_SPOT)
    expect(dispatch).not.toHaveBeenCalled()
    expect(view().nodes).toHaveLength(count)
    // The element drop beside it still works, so the refusal is the view's own.
    drop(surface, { [ELEMENT_DRAG_TYPE]: 'ac-engine' }, EMPTY_SPOT)
    expect(dispatch).toHaveBeenCalledTimes(1)
  })

  it('takes no view in a reader tab', () => {
    const { surface, dispatch } = setup('reader')
    expect(drop(surface, { [VIEW_DRAG_TYPE]: 'v-data' }, EMPTY_SPOT)).toBe(false)
    expect(dispatch).not.toHaveBeenCalled()
  })
})

describe('text fields keep their own undo while they have focus (#134, as #31)', () => {
  /** ⌘Z pressed in `target`: whether the app took it from the browser. */
  const commandZ = (target: Element) => {
    const event = new KeyboardEvent('keydown', {
      key: 'z',
      metaKey: true,
      bubbles: true,
      cancelable: true,
    })
    act(() => void target.dispatchEvent(event))
    return event.defaultPrevented
  }
  const undoButton = () => screen.getByRole('button', { name: 'Undo' })

  it('leaves ⌘Z to the note’s editor and the group’s fields, and takes it again outside them', async () => {
    renderApp(drawnWorkspace(), { route: '/view/view-landscape' })
    const user = userEvent.setup()
    const surface = document.querySelector('.view-screen__canvas')!
    const nodeEl = (id: string) => surface.querySelector(`[data-node="${id}"]`)!

    // One model edit, so there is something the app could undo.
    await click(user, nodeEl('g-claims'), { x: 590, y: 390 })
    await user.type(field('Documentation'), 'Claims side.')
    await user.click(field('Name'))
    const edited = undoButton().getAttribute('title')
    expect(edited).toBe('Undo: Edited view “Claims landscape”')

    // Typing in a field again: ⌘Z there is the browser's, and the model keeps its edit.
    await user.click(field('Documentation'))
    await user.type(field('Documentation'), ' More')
    expect(commandZ(field('Documentation'))).toBe(false)
    expect(field('Documentation')).toHaveValue('Claims side. More')
    await user.type(field('Name'), ' 2')
    expect(commandZ(field('Name'))).toBe(false)
    expect(undoButton()).toHaveAttribute('title', edited!)

    // The same for the note's editor on the canvas.
    await user.dblClick(nodeEl('n-note'))
    await user.type(field('Note text'), '{End} Soon.')
    expect(commandZ(field('Note text'))).toBe(false)
    expect(field('Note text')).toHaveValue('Rules engine goes live 2027. Soon.')
    await user.keyboard('{Meta>}{Enter}{/Meta}')
    expect(nodeEl('n-note').textContent).toContain('Soon.')

    // Outside the fields, ⌘Z is the model's again.
    expect(commandZ(surface)).toBe(true)
    expect(nodeEl('n-note').textContent).toContain('2027.')
    expect(nodeEl('n-note').textContent).not.toContain('Soon.')
  })
})

describe('a view row in the model tree (#134)', () => {
  it('carries the view’s id on its drag, which the open view’s canvas draws as a reference', async () => {
    renderApp(drawnWorkspace(), { route: '/view/view-landscape' })
    const user = userEvent.setup()
    const tree = screen.getByRole('tree', { name: 'Model tree' })
    const row = (name: string) =>
      within(tree)
        .getAllByRole('treeitem')
        .find((el) => el.querySelector('.tree__name')?.textContent === name)!
    await user.click(row('Views'))
    await user.click(row('Landscapes'))
    const data = new Map<string, string>()
    const transfer = {
      setData: (type: string, value: string) => data.set(type, value),
      effectAllowed: 'none',
    }
    fireEvent.dragStart(row('Claim data'), { dataTransfer: transfer })
    expect(data.get(VIEW_DRAG_TYPE)).toBe('view-detail')
    expect(data.has(ELEMENT_DRAG_TYPE)).toBe(false)
    expect(transfer.effectAllowed).toBe('copyMove')

    const surface = document.querySelector('.view-screen__canvas')!
    const count = surface.querySelectorAll('[data-kind="view-ref"]').length
    expect(drop(surface, Object.fromEntries(data), { x: 900, y: 100 })).toBe(true)
    expect(surface.querySelectorAll('[data-kind="view-ref"]')).toHaveLength(count + 1)
  })
})
