import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { emptyWorkspace } from '@/model'
import { exportExchangeXml, loadDemoWorkspace, toCanonicalJson } from '@/io'
import { ModelStoreProvider } from '@/store'
import { renderApp } from '@/test/render'
import { TakeoverScreen } from './TakeoverScreen'

function demo() {
  return loadDemoWorkspace()
}

let createObjectURL: ReturnType<typeof vi.fn>

beforeEach(() => {
  createObjectURL = vi.fn(() => 'blob:test')
  vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL: vi.fn() })
  HTMLAnchorElement.prototype.click = vi.fn()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('first run', () => {
  it('offers exactly three actions', () => {
    renderApp(emptyWorkspace('ws-empty', 'Empty'))
    expect(screen.getByRole('heading', { name: 'Archipelago' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Start empty/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Import a file/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Explore the demo/ })).toBeInTheDocument()
    // Three, and no more: the empty state is not a place for a feature tour.
    expect(document.querySelectorAll('.first-run__action')).toHaveLength(3)
  })

  it('loads the demo in one click', async () => {
    renderApp(emptyWorkspace('ws-empty', 'Empty'))
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Explore the demo/ }))
    expect(screen.getByText('29 of 29 elements')).toBeInTheDocument()
  })

  it('starts empty without inventing a workspace', async () => {
    renderApp(emptyWorkspace('ws-empty', 'Empty'))
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Start empty/ }))
    expect(screen.getByText('0 of 0 elements')).toBeInTheDocument()
    expect(screen.getByText('LOCAL · SAVED')).toBeInTheDocument()
  })

  it('opens the import dialog from the first-run screen', async () => {
    renderApp(emptyWorkspace('ws-empty', 'Empty'))
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Import a file/ }))
    expect(screen.getByRole('dialog', { name: 'Import' })).toBeInTheDocument()
  })

  it('says how this browser saves', () => {
    renderApp(emptyWorkspace('ws-empty', 'Empty'))
    // jsdom has no File System Access API, which is the Firefox/Safari story.
    expect(screen.getByText(/saves by downloading a file/)).toBeInTheDocument()
  })
})

describe('import dialog', () => {
  async function openDialog() {
    renderApp(demo())
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Import' }))
    return { user, dialog: screen.getByRole('dialog', { name: 'Import' }) }
  }

  it('imports canonical JSON, replaces the model and closes', async () => {
    const { user, dialog } = await openDialog()
    const replacement = { ...emptyWorkspace('ws-in', 'Imported'), elements: demo().elements }
    await user.upload(
      within(dialog).getByLabelText('Choose a file to import'),
      new File([toCanonicalJson(replacement)], 'other.json', { type: 'application/json' }),
    )

    // A clean import needs no report: the dialog closes and the model is there.
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Import' })).not.toBeInTheDocument(),
    )
    expect(screen.getByText('29 of 29 elements')).toBeInTheDocument()
  })

  it('imports exchange XML', async () => {
    const { user, dialog } = await openDialog()
    await user.upload(
      within(dialog).getByLabelText('Choose a file to import'),
      new File([exportExchangeXml(demo())], 'archisurance.xml', { type: 'application/xml' }),
    )
    await waitFor(() => expect(screen.getByText('29 of 29 elements')).toBeInTheDocument())
  })

  it('counts an import as unsaved, because no file on disk matches it yet', async () => {
    const { user, dialog } = await openDialog()
    await user.upload(
      within(dialog).getByLabelText('Choose a file to import'),
      new File([exportExchangeXml(demo())], 'archisurance.xml', { type: 'application/xml' }),
    )
    await waitFor(() => expect(screen.getByText(/LOCAL · \d+ UNSAVED/)).toBeInTheDocument())
  })

  it('reports what it skipped instead of dropping it silently', async () => {
    const { user, dialog } = await openDialog()
    const broken = exportExchangeXml(demo()).replace(
      /xsi:type="Capability"/g,
      'xsi:type="Microservice"',
    )
    await user.upload(
      within(dialog).getByLabelText('Choose a file to import'),
      new File([broken], 'broken.xml', { type: 'application/xml' }),
    )

    // The dialog stays open when there is something to say.
    const report = await waitFor(() => document.querySelector('.import-report') as HTMLElement)
    expect(within(report).getByText(/errors/)).toBeInTheDocument()
    expect(within(report).getAllByText('error').length).toBeGreaterThan(0)
    expect(within(report).getAllByText(/is not an ArchiMate 3.2 element type/).length).toBe(5)
    // …and the 24 elements it could read are in the model.
    expect(screen.getByText('24 of 24 elements')).toBeInTheDocument()
  })

  it('explains a file that is not a model at all', async () => {
    const { user, dialog } = await openDialog()
    // The picker's accept list already turns away a .txt, so this is the case
    // that actually reaches us: something named .json that is not JSON.
    await user.upload(
      within(dialog).getByLabelText('Choose a file to import'),
      new File(['hello'], 'notes.json', { type: 'application/json' }),
    )
    const report = await waitFor(() => document.querySelector('.import-report') as HTMLElement)
    expect(within(report).getByText(/Nothing could be read from that file/)).toBeInTheDocument()
    // The model that was already open is untouched.
    expect(screen.getByText('29 of 29 elements')).toBeInTheDocument()
  })

  it('closes on Escape', async () => {
    const { user } = await openDialog()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Import' })).not.toBeInTheDocument()
  })
})

describe('saving', () => {
  it('saves from the header and clears the unsaved count', async () => {
    renderApp(demo())
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '+ Element' }))
    await user.type(screen.getByLabelText(/Name/), 'New thing')
    await user.click(screen.getByRole('button', { name: 'Create' }))
    expect(screen.getByText('LOCAL · 1 UNSAVED')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'SAVE FILE' }))
    await waitFor(() => expect(screen.getByText('LOCAL · SAVED')).toBeInTheDocument())
    expect(createObjectURL).toHaveBeenCalled()
  })

  it('saves with ⌘S and with Ctrl+S', async () => {
    renderApp(demo())
    const user = userEvent.setup()
    await user.keyboard('{Meta>}s{/Meta}')
    await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(1))
    await user.keyboard('{Control>}s{/Control}')
    await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(2))
  })

  it('confirms where the file went, then gets out of the way', async () => {
    renderApp(demo())
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'SAVE FILE' }))
    const notice = await screen.findByRole('status')
    expect(notice).toHaveTextContent(/Downloaded archisurance\.json/)

    await user.click(screen.getByRole('button', { name: 'DISMISS' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('exports exchange XML from the header', async () => {
    renderApp(demo())
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Export' }))
    const notice = await screen.findByRole('status')
    expect(notice).toHaveTextContent(/archisurance\.xml/)
  })
})

describe('second-tab takeover', () => {
  it('explains why the tab is read-only and offers to take over', async () => {
    render(
      <ModelStoreProvider initialWorkspace={demo()} ephemeral>
        <TakeoverScreen />
      </ModelStoreProvider>,
    )
    expect(
      screen.getByRole('heading', { name: 'This model is open in another tab' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/save over each other/)).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Take over here' }))
    // No lock manager under jsdom, so this resolves immediately; what matters is
    // that the button is wired and does not throw.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Take over here/ })).toBeEnabled(),
    )
  })
})
