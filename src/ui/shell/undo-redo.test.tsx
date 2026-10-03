import { act, fireEvent, renderHook, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Workspace } from '@/model'
import { ModelStore, ModelStoreContext, type ModelStoreContextValue, type TabRole } from '@/store'
import { drawnWorkspace, smallWorkspace } from '@/test/fixtures'
import { renderApp } from '@/test/render'
import { useUndoRedo } from './use-undo-redo'

/**
 * Undo and redo from the UI (#88, #31): the keyboard, the header's buttons and
 * the palette, all through `useUndoRedo`. Every case drives the real app, so a
 * binding that is defined but never reached fails here.
 */

/** `drawnWorkspace` with a second, empty Application folder to move things into. */
function withLegacy(): Workspace {
  const workspace = drawnWorkspace()
  workspace.folders.push({ id: 'f-legacy', name: 'Legacy', root: 'application' })
  return workspace
}

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

const undoButton = () => screen.getByRole('button', { name: 'Undo' })
const redoButton = () => screen.getByRole('button', { name: 'Redo' })

/** Cut Claim Handling Engine out of Claims apps and paste it into Legacy. */
async function moveEngineToLegacy(user: ReturnType<typeof userEvent.setup>) {
  await user.click(row('Application'))
  await user.click(row('Claims apps'))
  await user.click(row('Claim Handling Engine'))
  act(() => tree().focus())
  await user.keyboard('{Control>}x{/Control}')
  await user.click(row('Legacy'))
  act(() => tree().focus())
  await user.keyboard('{Control>}v{/Control}')
  expect(ownerFolder('Claim Handling Engine')).toBe('Legacy')
}

/** The row `name` is filed under: the nearest row above it one level up. */
function ownerFolder(name: string): string | null | undefined {
  const rows = within(tree()).getAllByRole('treeitem')
  const index = rows.indexOf(row(name))
  const level = Number(rows[index]!.getAttribute('aria-level'))
  const owner = rows
    .slice(0, index)
    .reverse()
    .find((r) => Number(r.getAttribute('aria-level')) === level - 1)
  return owner?.querySelector('.tree__name')?.textContent
}

beforeEach(() => localStorage.clear())

describe('the keyboard', () => {
  it('undoes a tree move with ⌘Z and re-applies it with ⇧⌘Z', async () => {
    renderApp(withLegacy())
    const user = userEvent.setup()
    await moveEngineToLegacy(user)

    await user.keyboard('{Meta>}z{/Meta}')
    expect(ownerFolder('Claim Handling Engine')).toBe('Claims apps')

    await user.keyboard('{Meta>}{Shift>}z{/Shift}{/Meta}')
    expect(ownerFolder('Claim Handling Engine')).toBe('Legacy')
  })

  it('takes Ctrl+Z, Ctrl+Shift+Z and Ctrl+Y too', async () => {
    renderApp(withLegacy())
    const user = userEvent.setup()
    await moveEngineToLegacy(user)

    await user.keyboard('{Control>}z{/Control}')
    expect(ownerFolder('Claim Handling Engine')).toBe('Claims apps')
    await user.keyboard('{Control>}y{/Control}')
    expect(ownerFolder('Claim Handling Engine')).toBe('Legacy')
    await user.keyboard('{Control>}z{/Control}')
    await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}')
    expect(ownerFolder('Claim Handling Engine')).toBe('Legacy')
  })

  it('leaves ⌘Z to a text field, and takes it again once focus leaves', async () => {
    renderApp(drawnWorkspace(), { route: '/element/app-claims' })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    const name = () => screen.getByRole('textbox', { name: 'Name' })

    // One model edit, committed on blur, so there is something to undo.
    await user.clear(name())
    await user.type(name(), 'Claims Engine')
    act(() => name().blur())
    expect(undoButton()).toHaveAttribute('title', 'Undo: Updated name of “Claims Engine”')

    // Typing in the field again: ⌘Z there is the browser's, not the model's.
    await user.click(name())
    await user.type(name(), ' 2')
    const event = new KeyboardEvent('keydown', {
      key: 'z',
      metaKey: true,
      bubbles: true,
      cancelable: true,
    })
    act(() => {
      name().dispatchEvent(event)
    })
    expect(event.defaultPrevented).toBe(false)
    expect(undoButton()).toHaveAttribute('title', 'Undo: Updated name of “Claims Engine”')
    expect(name()).toHaveValue('Claims Engine 2')

    // Outside the field the same keys undo the rename, and the field shows it —
    // an uncontrolled input would keep the undone name and commit it on blur.
    await user.clear(name())
    await user.type(name(), 'Claims Engine')
    act(() => name().blur())
    expect(document.activeElement).toBe(document.body)
    await user.keyboard('{Meta>}z{/Meta}')
    expect(name()).toHaveValue('Claim Handling Engine')
    act(() => name().focus())
    act(() => name().blur())
    expect(undoButton()).toBeDisabled()
  })

  it('shows an undone documentation or lifecycle date in the field still open for editing', async () => {
    renderApp(drawnWorkspace(), { route: '/element/app-claims' })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Edit' }))

    const documentation = () => screen.getByRole('textbox', { name: 'Documentation' })
    await user.type(documentation(), ' Retired.')
    act(() => documentation().blur())
    expect(documentation()).toHaveValue('New rules-driven claim assessment platform. Retired.')
    await user.keyboard('{Meta>}z{/Meta}')
    expect(documentation()).toHaveValue('New rules-driven claim assessment platform.')

    // A date field keeps focus after it commits and has no undo of its own, so
    // ⌘Z from inside it reaches the model, as it does from a select.
    const active = screen.getByLabelText('Active date')
    act(() => active.focus())
    fireEvent.change(active, { target: { value: '2028-06-01' } })
    expect(screen.getByLabelText('Active date')).toHaveValue('2028-06-01')
    expect(document.activeElement).toBe(screen.getByLabelText('Active date'))
    await user.keyboard('{Meta>}z{/Meta}')
    expect(screen.getByLabelText('Active date')).toHaveValue('2027-01-01')
  })

  it('undoes from a select, which has no undo of its own', async () => {
    renderApp(drawnWorkspace(), { route: '/element/app-claims' })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    const fit = screen.getByLabelText('Functional fit')
    await user.selectOptions(fit, '1')
    expect(fit).toHaveValue('1')

    act(() => fit.focus())
    await user.keyboard('{Meta>}z{/Meta}')
    expect(fit).toHaveValue('4')
  })

  it('does nothing under a modal dialog', async () => {
    renderApp(withLegacy())
    const user = userEvent.setup()
    await moveEngineToLegacy(user)

    // Not the palette: its own `open` flag would stop ⌘Z before the modal check.
    await user.click(screen.getByRole('link', { name: /^Inventory/ }))
    await user.click(screen.getByRole('button', { name: '+ Element' }))
    const dialog = screen.getByRole('dialog', { name: 'New element' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    // At the body, past the text-field guard, so only the modal check can stop it.
    fireEvent.keyDown(document.body, { key: 'z', metaKey: true })
    expect(ownerFolder('Claim Handling Engine')).toBe('Legacy')
    expect(undoButton()).toHaveAttribute('title', 'Undo: Moved “Claim Handling Engine”')
  })
})

describe('the header', () => {
  it('names the step in each tooltip and disables what the stack cannot do', async () => {
    renderApp(withLegacy())
    const user = userEvent.setup()
    await moveEngineToLegacy(user)

    expect(undoButton()).toBeEnabled()
    expect(undoButton()).toHaveAttribute('title', 'Undo: Moved “Claim Handling Engine”')
    expect(redoButton()).toBeDisabled()
    expect(redoButton()).toHaveAttribute('title', 'Nothing to redo')

    await user.click(undoButton())
    expect(ownerFolder('Claim Handling Engine')).toBe('Claims apps')
    expect(redoButton()).toBeEnabled()
    expect(redoButton()).toHaveAttribute('title', 'Redo: Moved “Claim Handling Engine”')
    expect(undoButton()).toBeDisabled()
    expect(undoButton()).toHaveAttribute('title', 'Nothing to undo')

    await user.click(redoButton())
    expect(ownerFolder('Claim Handling Engine')).toBe('Legacy')
    expect(undoButton()).toBeEnabled()
    expect(redoButton()).toBeDisabled()
  })

  it('moves the save-state counter on every step, undo and redo included', async () => {
    renderApp(withLegacy())
    const user = userEvent.setup()
    await moveEngineToLegacy(user)
    expect(screen.getByText('LOCAL · 1 UNSAVED')).toBeInTheDocument()
    await user.click(undoButton())
    expect(screen.getByText('LOCAL · 2 UNSAVED')).toBeInTheDocument()
    await user.click(redoButton())
    expect(screen.getByText('LOCAL · 3 UNSAVED')).toBeInTheDocument()
  })
})

describe('the palette', () => {
  it('offers the step by name, and runs it', async () => {
    renderApp(withLegacy())
    const user = userEvent.setup()
    await moveEngineToLegacy(user)

    await user.keyboard('{Control>}k{/Control}')
    await user.keyboard('undo')
    const option = screen.getByRole('option', { name: /Undo: Moved “Claim Handling Engine”/ })
    await user.click(option)
    expect(ownerFolder('Claim Handling Engine')).toBe('Claims apps')

    await user.keyboard('{Control>}k{/Control}')
    await user.keyboard('redo')
    expect(
      screen.getByRole('option', { name: /Redo: Moved “Claim Handling Engine”/ }),
    ).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await user.keyboard('{Control>}k{/Control}')
    await user.keyboard('undo')
    expect(screen.queryByRole('option', { name: /Undo:/ })).not.toBeInTheDocument()
  })
})

describe('useUndoRedo', () => {
  function wrapper(role: TabRole, store: ModelStore) {
    const value = { store, role, ready: true } as unknown as ModelStoreContextValue
    return function Wrapper({ children }: { children: React.ReactNode }) {
      return <ModelStoreContext.Provider value={value}>{children}</ModelStoreContext.Provider>
    }
  }

  it('undoes and redoes for the writer', () => {
    const store = new ModelStore(smallWorkspace())
    store.rename('Renamed')
    const { result } = renderHook(() => useUndoRedo(), { wrapper: wrapper('writer', store) })
    expect(result.current.undoLabel).toBe('Renamed workspace to “Renamed”')
    act(() => result.current.undo())
    expect(store.name).not.toBe('Renamed')
    expect(result.current.redoLabel).toBe('Renamed workspace to “Renamed”')
  })

  it('gives a reader tab nothing to undo, and ignores the call if made anyway', () => {
    const store = new ModelStore(smallWorkspace())
    store.rename('Renamed')
    const undo = vi.spyOn(store, 'undo')
    const { result } = renderHook(() => useUndoRedo(), { wrapper: wrapper('reader', store) })
    expect(store.canUndo).toBe(true)
    expect(result.current.undoLabel).toBeUndefined()
    act(() => result.current.undo())
    expect(undo).not.toHaveBeenCalled()
    expect(store.name).toBe('Renamed')
  })
})
