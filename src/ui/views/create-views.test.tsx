import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import claimsXml from '@/io/fixtures/claims-platform.xml?raw'
import { importExchangeXml } from '@/io'
import { toCanonicalJson } from '@/io/canonical-json'
import type { Workspace } from '@/model'
import { ModelStore } from '@/store'
import { renderApp } from '@/test/render'
import { ELEMENT_DRAG_TYPE, NEW_VIEW_NAME } from './create'

/**
 * Creating, renaming and deleting views from the app's chrome (#130): the model
 * tree and the command palette, in the whole app. `dispatch` is spied on the
 * class, so the test counts the commands of the store the app made, and holds
 * that store (`mock.contexts`) to compare the workspace before and after.
 */

function claims(): Workspace {
  return importExchangeXml(claimsXml, 'claims-platform.xml').workspace!
}

let dispatch: MockInstance<ModelStore['dispatch']>
beforeEach(() => {
  localStorage.clear()
  dispatch = vi.spyOn(ModelStore.prototype, 'dispatch')
})
afterEach(() => vi.restoreAllMocks())

/** The app's store: the one the first command went to. */
const theStore = () => dispatch.mock.contexts[0] as ModelStore

function tree(): HTMLElement {
  return screen.getByRole('tree', { name: 'Model tree' })
}

function row(name: string): HTMLElement {
  const found = within(tree())
    .queryAllByRole('treeitem')
    .find((el) => el.querySelector('.tree__name')?.textContent === name)
  if (!found) throw new Error(`no tree row named ${name}`)
  return found
}

describe('a new view from the model tree (#130)', () => {
  it('is made in the selected folder of Views in one command, opens with its name focused, and is named in one more', async () => {
    renderApp(claims())
    const user = userEvent.setup()
    await user.click(row('Views'))
    await user.click(row('Landscapes'))
    expect(dispatch).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '+ View' }))

    expect(dispatch).toHaveBeenCalledTimes(1)
    const store = theStore()
    const made = store.viewList().find((v) => v.name === NEW_VIEW_NAME)!
    expect(made.folder).toBe('folder-views-landscapes')
    expect(made.nodes).toEqual([])
    const name = await screen.findByRole('textbox', { name: 'View name' })
    await waitFor(() => expect(name).toHaveFocus())
    expect(name).toHaveValue(NEW_VIEW_NAME)
    // Selected whole, so typing replaces it.
    expect((name as HTMLInputElement).selectionStart).toBe(0)
    expect((name as HTMLInputElement).selectionEnd).toBe(NEW_VIEW_NAME.length)

    await user.keyboard('Target state{Enter}')
    expect(dispatch).toHaveBeenCalledTimes(2)
    expect(store.view(made.id)!.name).toBe('Target state')
    // The canvas takes focus back, so the keyboard goes on editing.
    expect(screen.getByLabelText('View Target state')).toHaveFocus()
  })

  it('gives the new view’s name focus once, not again after each rename (#144 review)', async () => {
    renderApp(claims())
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '+ View' }))
    const name = await screen.findByRole('textbox', { name: 'View name' })
    await waitFor(() => expect(name).toHaveFocus())
    // Tab renames on the way out, and focus moves on: it does not come back.
    await user.keyboard('Target')
    await user.tab()
    expect(
      theStore()
        .viewList()
        .some((v) => v.name === 'Target'),
    ).toBe(true)
    expect(screen.getByRole('textbox', { name: 'View name' })).not.toHaveFocus()
    expect(screen.getByRole('combobox', { name: 'Viewpoint' })).toHaveFocus()
    // An undone rename remounts the field too, and leaves focus alone.
    act(() => void theStore().undo())
    expect(screen.getByRole('textbox', { name: 'View name' })).toHaveValue(NEW_VIEW_NAME)
    expect(screen.getByRole('textbox', { name: 'View name' })).not.toHaveFocus()
  })

  it('goes directly under Views when the selection is not in Views', async () => {
    renderApp(claims())
    const user = userEvent.setup()
    // A folder, but not one of Views: a view may not be filed there.
    await user.click(row('Application'))
    await user.click(row('Claims applications'))
    await user.click(screen.getByRole('button', { name: '+ View' }))
    const made = theStore()
      .viewList()
      .find((v) => v.name === NEW_VIEW_NAME)!
    expect(made).not.toHaveProperty('folder')
  })

  it('undoes to the workspace it started from, compared as canonical JSON', async () => {
    renderApp(claims())
    const user = userEvent.setup()
    // The store is reachable only once it has had a command; the fixture is what it started from.
    await user.click(screen.getByRole('button', { name: '+ View' }))
    await user.keyboard('Named{Enter}')
    const store = theStore()
    act(() => void store.undo())
    act(() => void store.undo())
    expect(toCanonicalJson(store.snapshot())).toBe(toCanonicalJson(claims()))
  })
})

describe('views in the model tree (#130)', () => {
  it('renames a view on F2 in one command', async () => {
    renderApp(claims())
    const user = userEvent.setup()
    await user.click(row('Views'))
    await user.click(row('Claim data'))
    act(() => tree().focus())
    await user.keyboard('{F2}')
    const input = within(tree()).getByRole('textbox', { name: 'View name' })
    await user.clear(input)
    await user.type(input, 'Claim data model{Enter}')
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(theStore().view('v-data')!.name).toBe('Claim data model')
    expect(row('Claim data model')).toBeInTheDocument()
  })

  it('deletes the open view on Delete, through the store’s cascade, and leaves its screen', async () => {
    renderApp(claims(), { route: '/view/v-data' })
    const user = userEvent.setup()
    await screen.findByLabelText('View Claim data')
    await user.click(row('Claim data'))
    act(() => tree().focus())
    await user.keyboard('{Delete}')
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(dispatch.mock.calls[0]![0]).toMatchObject({ kind: 'remove-view' })
    expect(theStore().view('v-data')).toBeUndefined()
    expect(await screen.findByRole('heading', { name: 'Inventory' })).toBeInTheDocument()
    expect(within(tree()).queryByText('Claim data')).not.toBeInTheDocument()
  })

  it('puts the element id on an element row’s drag, so a canvas can draw that element', async () => {
    renderApp(claims())
    const user = userEvent.setup()
    await user.click(row('Application'))
    await user.click(row('Claims applications'))
    const data = new Map<string, string>()
    const transfer = {
      setData: (type: string, value: string) => data.set(type, value),
      effectAllowed: 'none',
    }
    fireEvent.dragStart(row('Claims Engine'), { dataTransfer: transfer })
    expect(data.get(ELEMENT_DRAG_TYPE)).toBe('ac-engine')
    expect(transfer.effectAllowed).toBe('copyMove')
    // A folder row is moved within the tree only.
    data.clear()
    fireEvent.dragStart(row('Legacy'), { dataTransfer: transfer })
    expect(data.has(ELEMENT_DRAG_TYPE)).toBe(false)
    expect(transfer.effectAllowed).toBe('move')
  })
})

describe('creating from the command palette (#130)', () => {
  async function runAction(user: ReturnType<typeof userEvent.setup>, label: string) {
    await user.keyboard('{Control>}k{/Control}')
    await user.type(screen.getByRole('combobox', { name: /Jump to element/ }), label)
    await user.click(screen.getByRole('option', { name: new RegExp(label) }))
  }

  it('New view makes a view under Views and opens it with its name focused', async () => {
    renderApp(claims())
    const user = userEvent.setup()
    await runAction(user, 'New view')
    expect(dispatch).toHaveBeenCalledTimes(1)
    const made = theStore()
      .viewList()
      .find((v) => v.name === NEW_VIEW_NAME)!
    expect(made).not.toHaveProperty('folder')
    const name = await screen.findByRole('textbox', { name: 'View name' })
    await waitFor(() => expect(name).toHaveFocus())
  })

  it('New element in view… lands in the palette’s type filter, on a view only', async () => {
    renderApp(claims(), { route: '/view/v-data' })
    const user = userEvent.setup()
    // Opened from the canvas, which the palette gives focus back to as it closes.
    act(() => screen.getByLabelText('View Claim data').focus())
    await runAction(user, 'New element in view')
    await waitFor(() =>
      expect(screen.getByRole('searchbox', { name: /Find an element type/ })).toHaveFocus(),
    )
    await user.keyboard('data object{Enter}')
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('textbox', { name: /^(Element|Group) name$/ })).toHaveFocus()
  })

  it('takes New element in view… away when the view is left', async () => {
    renderApp(claims(), { route: '/view/v-data' })
    const user = userEvent.setup()
    await screen.findByLabelText('View Claim data')
    await user.keyboard('{Control>}k{/Control}')
    await user.type(screen.getByRole('combobox', { name: /Jump to element/ }), 'New')
    expect(screen.getByRole('option', { name: /New element in view/ })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('link', { name: /Inventory/ }))
    await screen.findByRole('heading', { name: 'Inventory' })
    await user.keyboard('{Control>}k{/Control}')
    await user.type(screen.getByRole('combobox', { name: /Jump to element/ }), 'New')
    expect(screen.getByRole('option', { name: /New view/ })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /New element in view/ })).not.toBeInTheDocument()
  })
})
