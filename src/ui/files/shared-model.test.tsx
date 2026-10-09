import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toCanonicalJson } from '@/io'
import {
  DEFAULT_SETTINGS,
  LOCK_SCHEMA_VERSION,
  parseLock,
  serialiseLock,
  type SharedFolderSettings,
} from '@/io/shared-folder'
import type { StoredFolder } from '@/store/shared-folder-storage'
import { FakeDirectoryHandle } from '@/test/fake-directory'
import { smallWorkspace } from '@/test/fixtures'
import { renderApp } from '@/test/render'

/**
 * A model opened from a shared folder (#147, part 3), driven through the app.
 * Real timers with short timings (200 ms settle, 300 ms heartbeat): the fingerprints are `crypto.subtle`, which
 * resolves on its own clock, not on Vitest's.
 */

const TIMINGS = { settleMs: 200, heartbeatMs: 300, staleAfterMs: 1200, pollMs: 150 }

const memory = vi.hoisted(() => ({
  folders: [] as StoredFolder[],
  settings: undefined as SharedFolderSettings | undefined,
}))

vi.mock('@/store/shared-folder-storage', async () => {
  const { memoryStore: store, readSettings } = await import('@/io/shared-folder')
  const stores = new Map<string, ReturnType<typeof store>>()
  return {
    listFolders: async () => [...memory.folders],
    rememberFolder: async () => memory.folders[0]!,
    loadSettings: async () => memory.settings!,
    saveSettings: async (input: unknown) => {
      const result = readSettings(input)
      if (result.ok) memory.settings = result.settings
      return result
    },
    clientId: async () => 'client-markus',
    storedPerModel: (name: string) => {
      if (!stores.has(name)) stores.set(name, store())
      return stores.get(name)!
    },
  }
})

const MODEL = 'Landscape.json'
const LOCK = 'Landscape.json.lock'
let dir: FakeDirectoryHandle

const text = (name: string) => {
  const bytes = dir.files.get(name)
  return bytes && new TextDecoder().decode(bytes)
}
const put = (name: string, content: string | Uint8Array) =>
  dir.files.set(name, typeof content === 'string' ? new TextEncoder().encode(content) : content)
const anasLock = (seq = 0) =>
  serialiseLock({
    appVersion: '0.2.0',
    displayName: 'Ana',
    heartbeatAt: '2026-10-07T08:00:00.000Z',
    heartbeatSeq: seq,
    schemaVersion: LOCK_SCHEMA_VERSION,
    since: '2026-10-07T08:00:00.000Z',
    token: 'ana-1',
  })
const another = () => {
  const workspace = smallWorkspace()
  return toCanonicalJson({ ...workspace, name: 'Changed by Ana' })
}

beforeEach(() => {
  dir = new FakeDirectoryHandle('Architecture', { [MODEL]: toCanonicalJson(smallWorkspace()) })
  memory.folders = [{ key: 'k-1', name: 'Architecture', handle: dir.handle, openedAt: 1 }]
  memory.settings = { ...DEFAULT_SETTINGS, ...TIMINGS, displayName: 'Markus' }
  vi.stubGlobal('showDirectoryPicker', async () => dir.handle)
})

afterEach(() => vi.unstubAllGlobals())

const banner = () => screen.getByRole('region', { name: 'Shared model' })
const status = () => within(banner()).getByRole('status')
const saveState = () => document.querySelector('.save-state__label')?.textContent

/** Open the model from the folder screen, and wait for the settle delay to decide. */
async function openModel(user = userEvent.setup()) {
  renderApp(smallWorkspace(), { route: '/folder' })
  await user.click(await screen.findByRole('button', { name: 'Open Architecture' }))
  await user.click(await screen.findByRole('button', { name: `Open ${MODEL}` }))
  await screen.findByRole('heading', { name: 'Inventory' })
  await waitFor(() => expect(status()).not.toHaveTextContent('Taking'))
  return user
}

async function addElement(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole('link', { name: /^Inventory/ }))
  await user.click(screen.getByRole('button', { name: '+ Element' }))
  await user.type(screen.getByLabelText(/Name/), name)
  await user.click(screen.getByRole('button', { name: 'Create' }))
}

describe('opening a model from a shared folder (criteria 2, 3)', () => {
  it('shows it read-only while it takes the lock, then editable, with a lock naming the user', async () => {
    const user = userEvent.setup()
    renderApp(smallWorkspace(), { route: '/folder' })
    await user.click(await screen.findByRole('button', { name: 'Open Architecture' }))
    await user.click(await screen.findByRole('button', { name: `Open ${MODEL}` }))
    await screen.findByRole('heading', { name: 'Inventory' })
    expect(status()).toHaveTextContent(`Taking ${MODEL} for editing`)
    expect(screen.getByRole('button', { name: '+ Element' })).toBeDisabled()

    await waitFor(() => expect(status()).toHaveTextContent(`Editing ${MODEL} in Architecture`))
    expect(screen.getByRole('button', { name: '+ Element' })).toBeEnabled()
    expect(parseLock(dir.files.get(LOCK)!)).toMatchObject({ displayName: 'Markus' })
    expect(saveState()).toBe('LOCAL · SAVED')
  })

  it('opens a model someone else holds read-only, naming them, and no command can change it', async () => {
    put(LOCK, anasLock())
    await openModel()
    expect(status()).toHaveTextContent(`${MODEL} is read-only: Ana is editing it.`)
    expect(screen.getByRole('button', { name: '+ Element' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Take over…' })).toBeNull()
  })

  it('says so when the lock carries this user’s own name', async () => {
    put(
      LOCK,
      serialiseLock({
        ...parseLock(anasLock())!,
        displayName: 'Markus',
        token: 'markus-elsewhere',
      }),
    )
    await openModel()
    expect(status()).toHaveTextContent(
      'locked by you (Markus) in another browser or on another machine',
    )
  })

  it('offers takeover once this machine has watched the lock go stale', async () => {
    put(LOCK, anasLock())
    const user = await openModel()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Take over…' })).toBeVisible(), {
      timeout: 3000,
    })
    await user.click(screen.getByRole('button', { name: 'Take over…' }))
    await user.click(within(banner()).getByRole('button', { name: 'Take over' }))
    await waitFor(() => expect(status()).toHaveTextContent(`Editing ${MODEL}`))
    expect(parseLock(dir.files.get(LOCK)!)?.displayName).toBe('Markus')
    expect(text('.archipelago-log-client-markus.jsonl')).toContain('"action":"takeover"')
  })

  it('unlocks after a confirmation, logged, and then offers Edit', async () => {
    put(LOCK, anasLock())
    const user = await openModel()
    await user.click(screen.getByRole('button', { name: 'Unlock…' }))
    await user.click(within(banner()).getByRole('button', { name: 'Unlock' }))
    await waitFor(() => expect(dir.files.has(LOCK)).toBe(false))
    expect(text('.archipelago-log-client-markus.jsonl')).toContain('"previousOwner":"Ana"')
    await user.click(await screen.findByRole('button', { name: 'Edit' }))
    await waitFor(() => expect(status()).toHaveTextContent(`Editing ${MODEL}`))
  })
})

describe('saving (criteria 6, 7, 8)', () => {
  it('writes the file through the guard and marks the model saved', async () => {
    const user = await openModel()
    await addElement(user, 'Fraud Detection')
    expect(saveState()).toBe('LOCAL · 1 UNSAVED')
    await user.click(screen.getByRole('button', { name: 'SAVE FILE' }))
    await waitFor(() => expect(saveState()).toBe('LOCAL · SAVED'))
    expect(text(MODEL)).toContain('Fraud Detection')
  })

  it('refuses when the file changed, marks nothing saved, and overwrites only after two confirmations', async () => {
    const user = await openModel()
    await addElement(user, 'Fraud Detection')
    put(MODEL, another())
    await user.click(screen.getByRole('button', { name: 'SAVE FILE' }))
    const dialog = await screen.findByRole('dialog', { name: 'The file changed on disk' })
    // Not saved, either way. Which label depends on whether a heartbeat saw the
    // change before the save's own check did, and on a slow runner one can.
    expect(['LOCAL · 1 UNSAVED', 'FILE CHANGED ON DISK']).toContain(saveState())
    expect(text(MODEL)).toContain('Changed by Ana')

    await user.click(within(dialog).getByRole('button', { name: 'Overwrite anyway…' }))
    const sure = screen.getByRole('dialog', { name: `Overwrite ${MODEL}` })
    expect(text(MODEL)).toContain('Changed by Ana')
    await user.click(within(sure).getByRole('button', { name: 'Overwrite' }))
    await waitFor(() => expect(saveState()).toBe('LOCAL · SAVED'))
    expect(text(MODEL)).toContain('Fraud Detection')
    expect(text('.archipelago-log-client-markus.jsonl')).toContain('"action":"overwrite"')
  })

  it('saves as a copy, leaves the original alone, and carries on in the copy', async () => {
    const user = await openModel()
    await addElement(user, 'Fraud Detection')
    put(MODEL, another())
    await user.click(screen.getByRole('button', { name: 'SAVE FILE' }))
    const dialog = await screen.findByRole('dialog', { name: 'The file changed on disk' })
    await user.click(within(dialog).getByRole('button', { name: 'Save as copy' }))
    await waitFor(() => expect(status()).toHaveTextContent('(copy Markus'))
    const copy = [...dir.files.keys()].find((name) => name.includes('(copy Markus'))!
    expect(text(copy)).toContain('Fraud Detection')
    expect(text(MODEL)).toContain('Changed by Ana')
    expect(saveState()).toBe('LOCAL · SAVED')
  })

  it('marks nothing saved when close() rejects', async () => {
    const user = await openModel()
    await addElement(user, 'Fraud Detection')
    dir.rejectNextClose = MODEL
    await user.click(screen.getByRole('button', { name: 'SAVE FILE' }))
    await waitFor(() => expect(screen.getByText(/Could not save Landscape.json/)).toBeVisible())
    expect(saveState()).toBe('LOCAL · 1 UNSAVED')
  })
})

describe('while the model is open (criteria 5, 12, 13, 14)', () => {
  it('becomes read-only within a heartbeat when the lock is taken, keeping the edits for a copy', async () => {
    const user = await openModel()
    await addElement(user, 'Fraud Detection')
    put(LOCK, anasLock())
    await waitFor(() => expect(status()).toHaveTextContent('You no longer hold'), { timeout: 2000 })
    expect(status()).toHaveTextContent('Ana took it over')
    await user.click(screen.getByRole('link', { name: /^Inventory/ }))
    expect(screen.getByRole('button', { name: '+ Element' })).toBeDisabled()
    expect(saveState()).toBe('LOCAL · 1 UNSAVED')

    await user.click(within(banner()).getByRole('button', { name: 'Save as copy' }))
    await waitFor(() => expect([...dir.files.keys()].some((n) => n.includes('(copy'))).toBe(true))
    expect(text(MODEL)).not.toContain('Fraud Detection')
  })

  it('lets a writer who lost the lock save from the header, which offers only a copy', async () => {
    const user = await openModel()
    await addElement(user, 'Fraud Detection')
    put(LOCK, anasLock())
    await waitFor(() => expect(status()).toHaveTextContent('You no longer hold'), { timeout: 2000 })
    await user.click(screen.getByRole('button', { name: 'SAVE FILE' }))
    const dialog = screen.getByRole('dialog', { name: 'This model is read-only here' })
    expect(within(dialog).queryByRole('button', { name: 'Overwrite anyway…' })).toBeNull()
    expect(within(dialog).getByRole('button', { name: 'Save as copy' })).toBeInTheDocument()
  })

  it('never reloads over unsaved edits when the lock comes back, and says the file moved on', async () => {
    const user = await openModel()
    await addElement(user, 'Fraud Detection')
    put(LOCK, anasLock())
    await waitFor(() => expect(status()).toHaveTextContent('You no longer hold'), { timeout: 2000 })
    // Ana saves and closes; the lock is free again.
    put(MODEL, another())
    dir.files.delete(LOCK)
    await user.click(
      await within(banner()).findByRole('button', { name: 'Edit' }, { timeout: 2000 }),
    )
    await waitFor(() => expect(status()).toHaveTextContent(`Editing ${MODEL}`), { timeout: 2000 })
    expect(saveState()).toBe('FILE CHANGED ON DISK')
    await user.click(screen.getByRole('link', { name: /^Inventory/ }))
    expect(screen.getAllByText('Fraud Detection').length).toBeGreaterThan(0)
    expect(text(MODEL)).toContain('Changed by Ana')
  })

  it('gives the lock back when another file is imported in its place', async () => {
    const user = await openModel()
    expect(dir.files.has(LOCK)).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Import' }))
    const dialog = screen.getByRole('dialog', { name: 'Import' })
    await user.upload(
      within(dialog).getByLabelText('Choose a file to import'),
      new File([toCanonicalJson(smallWorkspace())], 'other.json', { type: 'application/json' }),
    )
    await waitFor(() => expect(dir.files.has(LOCK)).toBe(false))
    expect(screen.queryByRole('region', { name: 'Shared model' })).toBeNull()
  })

  it('leaves "saved" with a blocking notice when the file changes under the lock', async () => {
    await openModel()
    expect(saveState()).toBe('LOCAL · SAVED')
    put(MODEL, another())
    const notice = await screen.findByRole(
      'dialog',
      { name: `${MODEL} changed on disk` },
      {
        timeout: 2000,
      },
    )
    expect(saveState()).toBe('FILE CHANGED ON DISK')
    await userEvent.setup().click(within(notice).getByRole('button', { name: 'Keep editing' }))
    expect(saveState()).toBe('FILE CHANGED ON DISK')
  })

  it('lists a conflict copy that appears, and forgets it when dismissed', async () => {
    const user = await openModel()
    put('Landscape-DESKTOP7.json', '{}')
    const copies = await within(banner()).findByLabelText(
      'Possible conflict copies',
      {},
      {
        timeout: 2000,
      },
    )
    expect(copies).toHaveTextContent('Landscape-DESKTOP7.json')
    await user.click(
      within(copies).getByRole('button', { name: 'Dismiss Landscape-DESKTOP7.json' }),
    )
    await waitFor(() =>
      expect(within(banner()).queryByLabelText('Possible conflict copies')).toBeNull(),
    )
    await act(() => new Promise((resolve) => setTimeout(resolve, 700)))
    expect(within(banner()).queryByLabelText('Possible conflict copies')).toBeNull()
  })

  it('reloads a changed model for a reader with nothing unsaved', async () => {
    put(LOCK, anasLock())
    await openModel()
    put(MODEL, another())
    await waitFor(
      () => expect(screen.getByText(/changed in the folder and was reloaded/)).toBeVisible(),
      {
        timeout: 2000,
      },
    )
    expect(saveState()).toBe('LOCAL · SAVED')
  })

  it('gives the lock back on Close', async () => {
    const user = await openModel()
    expect(dir.files.has(LOCK)).toBe(true)
    await user.click(within(banner()).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(dir.files.has(LOCK)).toBe(false))
    expect(screen.queryByRole('region', { name: 'Shared model' })).toBeNull()
  })
})
