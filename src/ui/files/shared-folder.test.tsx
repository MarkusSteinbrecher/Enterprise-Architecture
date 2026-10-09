import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadDemoWorkspace } from '@/io'
import { DEFAULT_SETTINGS, readSettings, type SharedFolderSettings } from '@/io/shared-folder'
import { emptyWorkspace } from '@/model'
import type { StoredFolder } from '@/store/shared-folder-storage'
import { FakeDirectoryHandle } from '@/test/fake-directory'
import { renderApp } from '@/test/render'
import { SHARED_FOLDERS_SWITCH } from './shared-folder-switch'

/**
 * The way into a shared folder (#147, part 2): criteria 1 and 16 in jsdom.
 * A real directory handle cannot be stored in fake-indexeddb, so the storage
 * module is replaced by a memory; the browser journey stores real handles.
 */

const memory = vi.hoisted(() => ({
  folders: [] as StoredFolder[],
  settings: undefined as SharedFolderSettings | undefined,
}))

vi.mock('@/store/shared-folder-storage', () => ({
  listFolders: async () => [...memory.folders].sort((a, b) => b.openedAt - a.openedAt),
  rememberFolder: async (handle: FileSystemDirectoryHandle) => {
    const found = memory.folders.find((f) => f.handle === handle)
    if (found) return found
    const folder = { key: `k-${memory.folders.length + 1}`, name: handle.name, handle, openedAt: 1 }
    memory.folders.push(folder)
    return folder
  },
  loadSettings: async () => memory.settings ?? DEFAULT_SETTINGS,
  saveSettings: async (input: unknown) => {
    const result = readSettings(input)
    if (result.ok) memory.settings = result.settings
    return result
  },
}))

let dir: FakeDirectoryHandle

beforeEach(() => {
  memory.folders = []
  memory.settings = undefined
  dir = new FakeDirectoryHandle('Architecture', {
    'Landscape.json': '{}',
    'Landscape.json.lock': '{}',
    'Landscape-DESKTOP7.json': '{}',
    'Claims.json': '{}',
    '.archipelago-log-c1.jsonl': '',
  })
})

afterEach(() => {
  localStorage.clear()
  vi.unstubAllGlobals()
})

const switchOn = () => localStorage.setItem(SHARED_FOLDERS_SWITCH, 'on')
const withPicker = (pick: () => Promise<unknown> = async () => dir.handle) =>
  vi.stubGlobal('showDirectoryPicker', pick)

async function openImportDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Import' }))
  return screen.getByRole('dialog', { name: 'Import' })
}

describe('until part 3, the way in is switched off', () => {
  it('sends /folder to the inventory, and offers nothing in the import dialog', async () => {
    withPicker()
    renderApp(loadDemoWorkspace(), { route: '/folder' })
    expect(await screen.findByRole('heading', { name: 'Inventory' })).toBeInTheDocument()
    const dialog = await openImportDialog(userEvent.setup())
    expect(within(dialog).getByRole('button', { name: 'Choose a file…' })).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: /shared folder/ })).toBeNull()
  })
})

describe('in Firefox and Safari (criterion 16)', () => {
  beforeEach(switchOn)

  it('offers no folder action, and says why, in the import dialog and on first run', async () => {
    renderApp(loadDemoWorkspace())
    const dialog = await openImportDialog(userEvent.setup())
    expect(within(dialog).getByText(/Shared folders need a Chromium browser/)).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: /shared folder/ })).toBeNull()
  })

  it('says why on first run', () => {
    renderApp(emptyWorkspace('ws', 'Empty'))
    expect(screen.getByRole('button', { name: /Start empty/ })).toBeInTheDocument()
    expect(screen.getByText(/Shared folders need a Chromium browser/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Open the shared folder' })).toBeNull()
  })

  it('says why on the folder screen itself', () => {
    renderApp(loadDemoWorkspace(), { route: '/folder' })
    expect(screen.getByRole('note')).toHaveTextContent(/need a Chromium browser/)
    expect(screen.queryByRole('button', { name: 'Open folder…' })).toBeNull()
  })
})

describe('opening a shared folder (criterion 1)', () => {
  beforeEach(() => {
    switchOn()
    withPicker()
  })

  it('asks for the name on the lock first, then lists the models without reading them', async () => {
    const read = vi.spyOn(dir, 'getFileHandle')
    renderApp(loadDemoWorkspace(), { route: '/folder' })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Open folder…' }))

    const form = await screen.findByRole('form', { name: 'Your name on the lock' })
    expect(within(form).getByRole('button', { name: 'Continue' })).toBeDisabled()
    await user.type(within(form).getByLabelText(/Your name/), '  Markus ')
    await user.click(within(form).getByRole('button', { name: 'Continue' }))
    expect(memory.settings?.displayName).toBe('Markus')

    const models = await screen.findByRole('region', { name: 'Models in Architecture' })
    const rows = within(models).getAllByRole('listitem')
    expect(rows.map((row) => row.textContent)).toEqual([
      'Claims.json',
      'Landscape.json',
      'Landscape-DESKTOP7.json may be a copy of Landscape.json kept by the sync client',
    ])
    expect(read).not.toHaveBeenCalled()
  })

  it('goes straight to the models once the name is set', async () => {
    memory.settings = { ...DEFAULT_SETTINGS, displayName: 'Markus' }
    renderApp(loadDemoWorkspace(), { route: '/folder' })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Open folder…' }))
    expect(
      await screen.findByRole('region', { name: 'Models in Architecture' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('form', { name: 'Your name on the lock' })).toBeNull()
  })

  it('offers a folder opened before without the picker, asking permission from the click', async () => {
    memory.settings = { ...DEFAULT_SETTINGS, displayName: 'Markus' }
    memory.folders = [{ key: 'k-1', name: 'Architecture', handle: dir.handle, openedAt: 1 }]
    dir.permission = 'prompt'
    const picker = vi.fn(async () => dir.handle)
    withPicker(picker)
    renderApp(loadDemoWorkspace(), { route: '/folder' })
    const before = await screen.findByRole('region', { name: 'Folders opened before' })
    expect(dir.requests).toBe(0)

    await userEvent.setup().click(within(before).getByRole('button', { name: 'Open Architecture' }))
    expect(
      await screen.findByRole('region', { name: 'Models in Architecture' }),
    ).toBeInTheDocument()
    expect(dir.requests).toBe(1)
    expect(picker).not.toHaveBeenCalled()
  })

  it('says so when the browser is not allowed to write there', async () => {
    memory.folders = [{ key: 'k-1', name: 'Architecture', handle: dir.handle, openedAt: 1 }]
    dir.permission = 'prompt'
    dir.answer = 'denied'
    renderApp(loadDemoWorkspace(), { route: '/folder' })
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Open Architecture' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/did not allow Archipelago to write/)
    expect(screen.queryByRole('region', { name: 'Models in Architecture' })).toBeNull()
  })

  it('does nothing when the picker is cancelled, and reports a picker that fails', async () => {
    withPicker(async () => {
      throw new DOMException('cancelled', 'AbortError')
    })
    renderApp(loadDemoWorkspace(), { route: '/folder' })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Open folder…' }))
    await waitFor(() => expect(memory.folders).toEqual([]))
    expect(screen.queryByRole('alert')).toBeNull()

    withPicker(async () => {
      throw new DOMException('blocked', 'SecurityError')
    })
    await user.click(screen.getByRole('button', { name: 'Open folder…' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not be opened: blocked/)
  })

  it('is reached from the import dialog, which closes', async () => {
    renderApp(loadDemoWorkspace())
    const user = userEvent.setup()
    const dialog = await openImportDialog(user)
    await user.click(within(dialog).getByRole('button', { name: 'Open a shared folder…' }))
    expect(screen.queryByRole('dialog', { name: 'Import' })).toBeNull()
    expect(screen.getByRole('heading', { name: 'Shared folder' })).toBeInTheDocument()
  })

  it('is reached from first run, past it', async () => {
    renderApp(emptyWorkspace('ws', 'Empty'))
    await userEvent.setup().click(screen.getByRole('link', { name: 'Open the shared folder' }))
    expect(screen.getByRole('heading', { name: 'Shared folder' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Start empty/ })).toBeNull()
  })
})
