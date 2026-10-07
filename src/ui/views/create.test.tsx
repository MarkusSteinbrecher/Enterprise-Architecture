import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, within } from '@testing-library/react'
import { toCanonicalJson } from '@/io/canonical-json'
import { ELEMENT_TYPES, absoluteBounds, type ElementNode, type ViewNode } from '@/model'
import type { ModelStore } from '@/store'
import { SCREEN, click, drop, setup, type User } from '@/test/view-editor'
import { ELEMENT_DRAG_TYPE } from './create'
import { fitViewport } from './geometry'

/**
 * Making things in a view (#130): the palette, placing, naming, drawing an
 * element the model already holds, and deleting one from the model. Driven
 * through the canvas as a user drives it; `dispatch` is the store's own, so
 * "one command" is counted where commands are made.
 *
 * jsdom lays nothing out: the viewport stays at the origin and 100%, so a
 * client point is a view point. The claims landscape ends at x 1410, so the
 * canvas right of x 1500 is empty.
 */

const model = (store: ModelStore) => toCanonicalJson(store.snapshot())
const EMPTY_SPOT = { x: 1600, y: 100 }

const tool = (name: string) =>
  within(screen.getByRole('region', { name: 'Palette' })).getByRole('button', { name })
const queryTool = (name: string) =>
  within(screen.getByRole('region', { name: 'Palette' })).queryByRole('button', { name })

/** The node the last command added. */
const newest = (nodes: readonly ViewNode[]) => nodes[nodes.length - 1]!

async function rename(user: User, name: string) {
  const input = screen.getByRole('textbox', { name: /^(Element|Group) name$/ })
  await user.clear(input)
  await user.type(input, `${name}{Enter}`)
}

describe('placing a new element from the palette (#130)', () => {
  it('places in one command, names in one more, and two undos restore the workspace', async () => {
    const { store, dispatch, user, surface, view, nodeEl } = setup()
    const before = model(store)
    const count = view().nodes.length

    await user.click(tool('Business Actor'))
    expect(tool('Business Actor')).toHaveAttribute('aria-pressed', 'true')
    await click(user, surface, EMPTY_SPOT)

    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(view().nodes).toHaveLength(count + 1)
    const node = newest(view().nodes) as ElementNode
    // Archi's default size, top-left at the click, at the top level.
    expect(node).toMatchObject({
      kind: 'element',
      bounds: { ...EMPTY_SPOT, width: 120, height: 55 },
    })
    expect(node).not.toHaveProperty('parent')
    expect(store.element(node.element)).toMatchObject({
      type: 'BusinessActor',
      name: 'Business Actor',
    })
    // One shot: the tool is put down once it has placed.
    expect(tool('Business Actor')).toHaveAttribute('aria-pressed', 'false')

    // Its name opens for typing at once.
    const input = screen.getByRole('textbox', { name: /^(Element|Group) name$/ })
    expect(input).toHaveFocus()
    expect(input).toHaveValue('Business Actor')
    await rename(user, 'Broker')
    expect(dispatch).toHaveBeenCalledTimes(2)
    expect(store.element(node.element)!.name).toBe('Broker')
    // The drawing shows the new name: a rename changes the element and not the view.
    expect(nodeEl(node.id).textContent).toContain('Broker')
    expect(surface).toHaveFocus()

    act(() => void store.undo())
    act(() => void store.undo())
    expect(model(store)).toBe(before)
  })

  it('leaves focus where the user moved it when a name is committed by leaving the field (#144 review)', async () => {
    const { store, user, surface, view } = setup()
    await user.click(tool('Business Actor'))
    await click(user, surface, EMPTY_SPOT)
    const node = newest(view().nodes) as ElementNode
    await user.type(screen.getByRole('textbox', { name: 'Element name' }), '{End} 2')

    // Clicking another field commits the name, and that field keeps the focus:
    // a Backspace there must not reach the canvas, where it deletes the selected shape.
    const filter = screen.getByRole('searchbox', { name: /Find an element type/ })
    await user.click(filter)
    expect(filter).toHaveFocus()
    expect(store.element(node.element)!.name).toBe('Business Actor 2')
    await user.keyboard('{Backspace}')
    expect(view().nodes.some((n) => n.id === node.id)).toBe(true)
  })

  it('places inside the container under the click, relative to it', async () => {
    const { store, user, surface, view } = setup('writer', {
      prepare: (s) =>
        s.addNode('v-landscape', {
          id: 'g-new',
          kind: 'group',
          name: 'Target',
          bounds: { x: 1600, y: 400, width: 300, height: 200 },
        }),
    })
    await user.click(tool('Application Component'))
    await click(user, surface, { x: 1650, y: 470 })
    const node = newest(view().nodes)
    expect(node.parent).toBe('g-new')
    expect(node.bounds).toEqual({ x: 50, y: 70, width: 120, height: 55 })
    expect(absoluteBounds(store.view('v-landscape')!, node.id)).toMatchObject({ x: 1650, y: 470 })
  })

  it('keeps the name it had when the typed one is empty, or on Escape, and records nothing', async () => {
    const { store, dispatch, user, surface, view } = setup()
    await user.click(tool('Business Role'))
    await click(user, surface, EMPTY_SPOT)
    const node = newest(view().nodes) as ElementNode
    await rename(user, '   ')
    expect(store.element(node.element)!.name).toBe('Business Role')

    await user.keyboard('{F2}')
    await user.keyboard('Typed then dropped{Escape}')
    expect(
      screen.queryByRole('textbox', { name: /^(Element|Group) name$/ }),
    ).not.toBeInTheDocument()
    expect(store.element(node.element)!.name).toBe('Business Role')
    expect(dispatch).toHaveBeenCalledTimes(1)
  })

  it('places a note and a group, each named in place', async () => {
    const { dispatch, user, surface, view } = setup()
    await user.click(tool('Note'))
    await click(user, surface, EMPTY_SPOT)
    const note = newest(view().nodes)
    expect(note).toMatchObject({ kind: 'note', text: '', bounds: { width: 185, height: 80 } })
    const text = screen.getByRole('textbox', { name: 'Note text' })
    // A note's Enter is a line break; ⌘/Ctrl+Enter commits.
    await user.type(text, 'Two{Enter}lines{Control>}{Enter}{/Control}')
    expect(view().nodes.find((n) => n.id === note.id)).toMatchObject({ text: 'Two\nlines' })
    expect(dispatch).toHaveBeenCalledTimes(2)

    await user.click(tool('Group'))
    await click(user, surface, { x: 1600, y: 600 })
    const group = newest(view().nodes)
    expect(group).toMatchObject({
      kind: 'group',
      name: 'Group',
      bounds: { width: 400, height: 140 },
    })
    await rename(user, 'Back office')
    expect(view().nodes.find((n) => n.id === group.id)).toMatchObject({ name: 'Back office' })
    expect(dispatch).toHaveBeenCalledTimes(4)
  })

  it('places an or-junction with no name to type', async () => {
    const { store, dispatch, user, surface, view } = setup()
    await user.click(tool('Or junction'))
    await click(user, surface, EMPTY_SPOT)
    const node = newest(view().nodes) as ElementNode
    expect(node.bounds).toMatchObject({ width: 15, height: 15 })
    expect(store.element(node.element)).toMatchObject({
      type: 'Junction',
      junctionKind: 'or',
      name: '',
    })
    expect(
      screen.queryByRole('textbox', { name: /^(Element|Group) name$/ }),
    ).not.toBeInTheDocument()
    expect(dispatch).toHaveBeenCalledTimes(1)
  })

  it('puts an armed tool down on Escape, and the next click places nothing', async () => {
    const { dispatch, user, surface } = setup()
    await user.click(tool('Business Actor'))
    expect(surface).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(tool('Business Actor')).toHaveAttribute('aria-pressed', 'false')
    await click(user, surface, EMPTY_SPOT)
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('places from the keyboard in the middle of the visible canvas, in an empty view', async () => {
    const { store, dispatch, user, view } = setup('writer', { viewId: 'v-empty' })
    tool('Capability').focus()
    await user.keyboard('{Enter}')
    expect(dispatch).toHaveBeenCalledTimes(1)
    const node = newest(view().nodes) as ElementNode
    // The canvas is 2000 × 1500 at 100%: centred on (1000, 750).
    expect(node.bounds).toEqual({ x: 940, y: 723, width: 120, height: 55 })
    expect(store.element(node.element)!.type).toBe('Capability')
    expect(screen.getByRole('textbox', { name: /^(Element|Group) name$/ })).toHaveFocus()
  })

  it('does not move the view when the keyboard places a shape (#144 review)', () => {
    // A canvas with a size, so the auto-fit runs: jsdom lays nothing out.
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(SCREEN.width)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(SCREEN.height)
    const { surface, view } = setup('writer', { viewId: 'v-empty' })
    // An empty view sits where fit puts nothing. Placing gives the drawing its
    // first bounds, which an auto-fit still in charge would centre on.
    const before = fitViewport(undefined, SCREEN.width, SCREEN.height)
    fireEvent.keyDown(tool('Capability'), { key: 'Enter' })
    expect(view().nodes).toHaveLength(1)
    expect(surface.querySelector('svg > g')!.getAttribute('transform')).toBe(
      `translate(${before.x} ${before.y}) scale(${before.zoom})`,
    )
  })

  it('places the first match of the type filter on Enter, matching each word typed', async () => {
    const { store, user, view } = setup('writer', { viewId: 'v-empty' })
    await user.type(screen.getByRole('searchbox', { name: /Find an element type/ }), 'app comp')
    expect(queryTool('Business Actor')).not.toBeInTheDocument()
    await user.keyboard('{Enter}')
    const node = newest(view().nodes) as ElementNode
    expect(store.element(node.element)!.type).toBe('ApplicationComponent')
  })

  it('offers no palette in a reader tab', () => {
    setup('reader')
    expect(screen.queryByRole('region', { name: 'Palette' })).not.toBeInTheDocument()
  })
})

describe('the palette and the viewpoint (#130)', () => {
  it('offers no Business Actor under Application Cooperation, and keeps the junctions', () => {
    setup('writer', {
      prepare: (s) =>
        s.updateView('v-landscape', (v) => ({ ...v, viewpoint: 'Application Cooperation' })),
    })
    expect(tool('Application Component')).toBeInTheDocument()
    expect(tool('Location')).toBeInTheDocument()
    expect(tool('And junction')).toBeInTheDocument()
    expect(tool('Or junction')).toBeInTheDocument()
    expect(tool('Grouping')).toBeInTheDocument()
    expect(queryTool('Business Actor')).not.toBeInTheDocument()
    expect(queryTool('Goal')).not.toBeInTheDocument()
  })

  it('offers every element type in a view with no viewpoint', () => {
    setup('writer', { viewId: 'v-data' })
    expect(screen.getByRole('combobox', { name: 'Viewpoint' })).toHaveValue('')
    for (const meta of ELEMENT_TYPES) {
      if (meta.type === 'Junction') continue
      expect(tool(meta.label)).toBeInTheDocument()
    }
    // Every type but the junction, which has two entries, and note and group.
    const palette = screen.getByRole('region', { name: 'Palette' })
    expect(palette.querySelectorAll('[data-tool]')).toHaveLength(ELEMENT_TYPES.length - 1 + 4)
  })

  it('takes no viewpoint it does not know from the select, as the guard on the write path', () => {
    const { store, dispatch } = setup('writer', {
      viewId: 'v-data',
      prepare: (s) => s.updateView('v-data', (v) => ({ ...v, viewpoint: 'Whiteboard' })),
    })
    const select = screen.getByRole('combobox', { name: 'Viewpoint' })
    // Shown as it is, not as None.
    expect(select).toHaveValue('Whiteboard')
    // The option is disabled; a value from anywhere but the list must still be refused.
    fireEvent.change(select, { target: { value: 'Whiteboard' } })
    const option = document.createElement('option')
    option.value = 'Made Up'
    select.appendChild(option)
    fireEvent.change(select, { target: { value: 'Made Up' } })
    expect(store.view('v-data')!.viewpoint).toBe('Whiteboard')
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('sets and clears the viewpoint as one command each, and the palette follows', async () => {
    const { store, dispatch, user } = setup('writer', { viewId: 'v-data' })
    const select = screen.getByRole('combobox', { name: 'Viewpoint' })
    await user.selectOptions(select, 'Application Cooperation')
    expect(store.view('v-data')!.viewpoint).toBe('Application Cooperation')
    expect(queryTool('Business Actor')).not.toBeInTheDocument()
    await user.selectOptions(select, 'None')
    expect(store.view('v-data')).not.toHaveProperty('viewpoint')
    expect(tool('Business Actor')).toBeInTheDocument()
    expect(dispatch).toHaveBeenCalledTimes(2)
  })
})

/** A drop as the browser sends it, with data a tree row put on the drag. */

describe('drawing an element the model holds (#130)', () => {
  it('draws the same element, not a copy, in one command, even where it is drawn already', () => {
    const { store, dispatch, surface, view } = setup()
    const elements = store.elementCount
    const drawings = view().nodes.filter((n) => n.kind === 'element' && n.element === 'ac-engine')
    expect(drawings.length).toBeGreaterThan(0)

    expect(drop(surface, { [ELEMENT_DRAG_TYPE]: 'ac-engine', 'text/plain': 'x' }, EMPTY_SPOT)).toBe(
      true,
    )

    expect(dispatch).toHaveBeenCalledTimes(1)
    const node = newest(view().nodes) as ElementNode
    expect(node).toMatchObject({
      kind: 'element',
      element: 'ac-engine',
      bounds: { ...EMPTY_SPOT, width: 120, height: 55 },
    })
    expect(store.elementCount).toBe(elements)
    expect(
      view().nodes.filter((n) => n.kind === 'element' && n.element === 'ac-engine'),
    ).toHaveLength(drawings.length + 1)
  })

  it('does not move the view when a drop draws the first shape (#144 review)', () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(SCREEN.width)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(SCREEN.height)
    const { surface, view } = setup('writer', { viewId: 'v-empty' })
    const before = fitViewport(undefined, SCREEN.width, SCREEN.height)
    expect(drop(surface, { [ELEMENT_DRAG_TYPE]: 'ac-engine' }, EMPTY_SPOT)).toBe(true)
    expect(view().nodes).toHaveLength(1)
    expect(surface.querySelector('svg > g')!.getAttribute('transform')).toBe(
      `translate(${before.x} ${before.y}) scale(${before.zoom})`,
    )
  })

  it('takes no drag that is not a model element', () => {
    const first = setup()
    expect(drop(first.surface, { 'text/plain': 'Claims' }, EMPTY_SPOT)).toBe(false)
    expect(first.dispatch).not.toHaveBeenCalled()
  })

  it('takes no drop in a reader tab', () => {
    const { surface, dispatch } = setup('reader')
    expect(drop(surface, { [ELEMENT_DRAG_TYPE]: 'ac-engine' }, EMPTY_SPOT)).toBe(false)
    expect(dispatch).not.toHaveBeenCalled()
  })
})

describe('removing and deleting an element (#130)', () => {
  it('Delete from model names the other views, removes every drawing, and one undo restores them', async () => {
    const { store, dispatch, user, canvas, surface, nodeEl } = setup()
    const before = model(store)
    const node = [...canvas.querySelectorAll('[data-node]')].find((el) =>
      store
        .view('v-landscape')!
        .nodes.some(
          (n) =>
            n.id === el.getAttribute('data-node') &&
            n.kind === 'element' &&
            n.element === 'ac-engine',
        ),
    )!
    await click(user, nodeEl(node.getAttribute('data-node')!), { x: 0, y: 0 })
    await user.click(screen.getByRole('button', { name: 'Delete from model…' }))
    const dialog = screen.getByRole('dialog', { name: 'Delete element from the model' })
    expect(within(dialog).getByText('Claim data')).toBeInTheDocument()
    expect(within(dialog).getByText(/relationships?,/)).toBeInTheDocument()
    expect(dispatch).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole('button', { name: 'Delete from model' }))
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(store.element('ac-engine')).toBeUndefined()
    expect(store.viewsDrawing('ac-engine')).toEqual([])
    for (const view of store.viewList()) {
      expect(view.nodes.some((n) => n.kind === 'element' && n.element === 'ac-engine')).toBe(false)
    }
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    // The panel that held the button is gone: the canvas takes focus, so keys still edit (#142, #144 review).
    expect(surface).toHaveFocus()

    act(() => void store.undo())
    expect(model(store)).toBe(before)
    expect(
      store
        .viewsDrawing('ac-engine')
        .map((v) => v.id)
        .sort(),
    ).toEqual(['v-data', 'v-landscape'])
  })

  it('Cancel deletes nothing', async () => {
    const { store, dispatch, user, nodeEl, view } = setup()
    const node = view().nodes.find((n) => n.kind === 'element' && n.element === 'ac-engine')!
    await click(user, nodeEl(node.id), { x: 0, y: 0 })
    await user.click(screen.getByRole('button', { name: 'Delete from model…' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(store.element('ac-engine')).toBeDefined()
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('Remove from view keeps the element in the model, and gives the canvas focus', async () => {
    const { store, dispatch, user, surface, nodeEl, view } = setup()
    const node = view().nodes.find((n) => n.kind === 'element' && n.element === 'ac-engine')!
    await click(user, nodeEl(node.id), { x: 0, y: 0 })
    await user.click(screen.getByRole('button', { name: 'Remove from view' }))
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(surface).toHaveFocus()
    expect(view().nodes.some((n) => n.id === node.id)).toBe(false)
    expect(store.element('ac-engine')).toBeDefined()
  })
})

describe('renaming in place (#130)', () => {
  it('renames a drawn element on F2 and on double-click, one command each', async () => {
    const { store, dispatch, user, nodeEl, view } = setup()
    const node = view().nodes.find((n) => n.kind === 'element' && n.element === 'ac-engine')!
    await click(user, nodeEl(node.id), { x: 0, y: 0 })
    await user.keyboard('{F2}')
    await rename(user, 'Claims Engine 2')
    expect(store.element('ac-engine')!.name).toBe('Claims Engine 2')
    await user.dblClick(nodeEl(node.id))
    await rename(user, 'Claims Engine 3')
    expect(store.element('ac-engine')!.name).toBe('Claims Engine 3')
    expect(dispatch).toHaveBeenCalledTimes(2)
  })

  it('renames the view from its header in one command; Escape puts the name back', async () => {
    const { store, dispatch, user } = setup()
    const field = screen.getByRole('textbox', { name: 'View name' })
    expect(field).toHaveValue('Claims landscape')
    await user.clear(field)
    await user.type(field, 'Claims, as is{Enter}')
    expect(store.view('v-landscape')!.name).toBe('Claims, as is')
    expect(dispatch).toHaveBeenCalledTimes(1)

    const again = screen.getByRole('textbox', { name: 'View name' })
    await user.clear(again)
    await user.type(again, 'Throwaway{Escape}')
    expect(again).toHaveValue('Claims, as is')
    expect(dispatch).toHaveBeenCalledTimes(1)
    // An empty name is not taken.
    await user.clear(again)
    await user.keyboard('{Enter}')
    expect(again).toHaveValue('Claims, as is')
    expect(dispatch).toHaveBeenCalledTimes(1)
    // An undone rename shows.
    act(() => void store.undo())
    expect(screen.getByRole('textbox', { name: 'View name' })).toHaveValue('Claims landscape')
  })
})
