import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadDemoWorkspace } from '@/io'
import { renderApp } from '@/test/render'

/**
 * No global shortcut acts under a modal dialog (#158).
 *
 * A dialog is what the keys are for while it is open. ⌘K skipped the check the
 * undo and single-letter bindings had: the palette opened over the nesting
 * prompt, and placing an element from it dropped the move the prompt was
 * asking about, while the Escape that closed the palette also answered the
 * prompt. Each binding here is driven with a dialog open, at the body, past the
 * text-field guards, so only the modal check can stop it. The same press is
 * then repeated with the dialog closed, and must act: a binding that never
 * fires at all would otherwise pass as guarded.
 *
 * The last test lists every listener for keys on the window or the document,
 * so a new global binding fails here until it has a row.
 */

let createObjectURL: ReturnType<typeof vi.fn>

beforeEach(() => {
  createObjectURL = vi.fn(() => 'blob:test')
  vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL: vi.fn() })
  HTMLAnchorElement.prototype.click = vi.fn()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

type User = ReturnType<typeof userEvent.setup>

const undoButton = () => screen.getByRole('button', { name: 'Undo' })
const redoButton = () => screen.getByRole('button', { name: 'Redo' })

/** One undoable change: a new element, made from the inventory. */
async function makeAChange(user: User) {
  await user.click(screen.getByRole('button', { name: '+ Element' }))
  await user.type(screen.getByLabelText(/Name/), 'Shortcut probe')
  await user.click(screen.getByRole('button', { name: 'Create' }))
  expect(undoButton()).toBeEnabled()
}

interface Binding {
  readonly name: string
  readonly key: KeyboardEventInit
  readonly route: string
  readonly prepare?: (user: User) => Promise<void>
  /** Has the binding done what it does? */
  readonly acted: () => boolean
}

const BINDINGS: readonly Binding[] = [
  {
    name: '⌘K opens the palette',
    key: { key: 'k', metaKey: true },
    route: '/inventory',
    acted: () => screen.queryByRole('dialog', { name: 'Command palette' }) !== null,
  },
  {
    name: 'Ctrl+K opens the palette',
    key: { key: 'k', ctrlKey: true },
    route: '/inventory',
    acted: () => screen.queryByRole('dialog', { name: 'Command palette' }) !== null,
  },
  ...[
    { name: '⌘Z undoes', key: { key: 'z', metaKey: true } },
    { name: 'Ctrl+Z undoes', key: { key: 'z', ctrlKey: true } },
  ].map((b) => ({
    ...b,
    route: '/inventory',
    prepare: makeAChange,
    acted: () => !redoButton().hasAttribute('disabled'),
  })),
  ...[
    { name: '⇧⌘Z redoes', key: { key: 'z', metaKey: true, shiftKey: true } },
    { name: 'Ctrl+Y redoes', key: { key: 'y', ctrlKey: true } },
  ].map((b) => ({
    ...b,
    route: '/inventory',
    prepare: async (user: User) => {
      await makeAChange(user)
      await user.click(undoButton())
      expect(redoButton()).toBeEnabled()
    },
    acted: () => redoButton().hasAttribute('disabled'),
  })),
  {
    name: 'g opens the graph',
    key: { key: 'g' },
    route: '/inventory',
    acted: () => screen.queryByRole('heading', { name: 'Dependency graph' }) !== null,
  },
  {
    name: 'i opens the inventory',
    key: { key: 'i' },
    route: '/graph',
    acted: () => screen.queryByRole('heading', { name: 'Inventory' }) !== null,
  },
  {
    name: '⌘S saves',
    key: { key: 's', metaKey: true },
    route: '/inventory',
    acted: () => createObjectURL.mock.calls.length > 0,
  },
  {
    name: 'Ctrl+S saves',
    key: { key: 's', ctrlKey: true },
    route: '/inventory',
    acted: () => createObjectURL.mock.calls.length > 0,
  },
]

describe('the global shortcuts, under a modal dialog (#158)', () => {
  it.each(BINDINGS)('$name, but not while a dialog is open', async (binding) => {
    renderApp(loadDemoWorkspace(), { route: binding.route })
    const user = userEvent.setup()
    await binding.prepare?.(user)
    expect(binding.acted()).toBe(false)

    // Any modal will do; the import dialog is in the header on every screen.
    await user.click(screen.getByRole('button', { name: 'Import' }))
    const dialog = screen.getByRole('dialog', { name: 'Import' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    fireEvent.keyDown(document.body, binding.key)
    // A save is asynchronous: give one that slipped through the time to land.
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(binding.acted()).toBe(false)
    expect(screen.getByRole('dialog', { name: 'Import' })).toBe(dialog)

    // Closed, the same press acts, so the one above was stopped by the guard.
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Import' })).not.toBeInTheDocument()
    fireEvent.keyDown(document.body, binding.key)
    await waitFor(() => expect(binding.acted()).toBe(true))
  })
})

describe('every listener for keys on the window or the document', () => {
  /** Files whose global bindings `BINDINGS` drives. */
  const GLOBAL = ['src/ui/files/FileWorkspaceProvider.tsx', 'src/ui/palette/PaletteProvider.tsx']
  /** Listeners that exist only while their own modal or menu is open, and serve it. */
  const OWNED = [
    'src/ui/common/use-focus-trap.ts', // the open modal's Tab trap
    'src/ui/factsheet/AddRelationDialog.tsx', // the dialog's Escape
    'src/ui/files/ImportDialog.tsx', // the dialog's Escape
    'src/ui/inventory/CreateElementDialog.tsx', // the dialog's Escape
    'src/ui/shell/WorkspaceSwitcher.tsx', // its menu's Escape, while open
    'src/ui/views/ConnectDialogs.tsx', // the dialogs' Escape
  ]

  const listening = execFileSync('git', ['ls-files', 'src'], { encoding: 'utf8' })
    .split('\n')
    .filter((path) => /\.tsx?$/.test(path) && !/\.test\.tsx?$/.test(path))
    .filter((path) =>
      /\b(window|document)(\.body)?\.addEventListener\(\s*['"]key(down|up|press)['"]/.test(
        readFileSync(path, 'utf8'),
      ),
    )

  it('finds the listeners it classifies', () => {
    expect(listening).toEqual(expect.arrayContaining(GLOBAL))
  })

  it('has each one classified, so a new global binding needs a row above', () => {
    // A new file here listens to every key on the page. If it binds a
    // shortcut, check `isModalOpen()` and add rows to BINDINGS; if it serves
    // only an open modal or menu of its own, list it in OWNED.
    expect(listening.filter((path) => !GLOBAL.includes(path) && !OWNED.includes(path))).toEqual([])
  })
})
