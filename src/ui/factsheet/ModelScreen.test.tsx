import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ModelStore } from '@/store'
import { smallWorkspace } from '@/test/fixtures'
import { renderApp, renderScreenAs } from '@/test/render'
import { ModelScreen } from './ModelScreen'

/**
 * The model's own sheet (#171), reached from the model tree's top entry as
 * Archi's Properties view is from its model node. `smallWorkspace` is named
 * ArchiSurance and documented "A small insurance landscape for tests."
 */

const DOC = 'A small insurance landscape for tests.'
/** Found by where it goes, so it is the same entry whatever the model is called. */
const modelEntry = () =>
  screen.getAllByRole('link').find((link) => link.getAttribute('href') === '/model')!
const docField = () => screen.getByRole('textbox', { name: 'Documentation' })
const undoButton = () => screen.getByRole('button', { name: 'Undo' })
const redoButton = () => screen.getByRole('button', { name: 'Redo' })

beforeEach(() => localStorage.clear())

describe('the model tree’s model entry (#171)', () => {
  it('opens the model’s sheet, and shows it as the current page there', async () => {
    renderApp(smallWorkspace())
    const user = userEvent.setup()
    expect(modelEntry()).toHaveTextContent('ArchiSurance')
    expect(modelEntry()).not.toHaveAttribute('aria-current')
    await user.click(modelEntry())
    expect(screen.getByRole('heading', { level: 1, name: 'ArchiSurance' })).toBeInTheDocument()
    expect(screen.getByText(DOC)).toBeInTheDocument()
    expect(modelEntry()).toHaveAttribute('aria-current', 'page')
  })

  it('follows a rename, since it shows the model’s name', async () => {
    renderApp(smallWorkspace(), { route: '/model' })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    const name = screen.getByRole('textbox', { name: 'Name' })
    await user.clear(name)
    await user.type(name, 'Client engagement')
    await user.tab()
    expect(modelEntry()).toHaveTextContent('Client engagement')
  })
})

describe('the model’s name (#171)', () => {
  it('shows an undo in the field while editing, so the next blur cannot commit the old name (#88)', async () => {
    renderApp(smallWorkspace(), { route: '/model' })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    const name = () => screen.getByRole('textbox', { name: 'Name' })
    await user.clear(name())
    await user.type(name(), 'Client engagement')
    await user.tab()
    expect(modelEntry()).toHaveTextContent('Client engagement')

    await user.click(undoButton())
    expect(modelEntry()).toHaveTextContent('ArchiSurance')
    expect(name()).toHaveValue('ArchiSurance')
    // Leaving the field again records nothing: there is nothing left to redo over.
    await user.click(name())
    await user.tab()
    expect(redoButton()).toBeEnabled()
  })
})

describe('the model’s counts (#171)', () => {
  it('are set in mono, as machine-readable content is (UI spec §2.1)', () => {
    renderApp(smallWorkspace(), { route: '/model' })
    const counts = screen.getByTestId('model-counts')
    expect(counts).toHaveTextContent(/^\d+ elements · \d+ relationships · \d+ views$/)
    expect(counts).toHaveClass('sheet__counts')
    // Vitest loads no CSS, so the rule is read off the stylesheet.
    const css = readFileSync(join(process.cwd(), 'src', 'ui', 'factsheet', 'factsheet.css'), 'utf8')
    const rule = /\.sheet__counts\s*\{([^}]*)\}/.exec(css)?.[1]
    expect(rule).toMatch(/font:[^;]*var\(--font-mono\)/)
  })
})

describe('the model’s documentation (#171)', () => {
  it('is edited as one command; undo and redo restore the text shown', async () => {
    renderApp(smallWorkspace(), { route: '/model' })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    expect(docField()).toHaveValue(DOC)
    await user.clear(docField())
    await user.type(docField(), 'Claims handling, as run today.')
    // Committed on leaving the field, never per keystroke.
    expect(undoButton()).toBeDisabled()
    await user.tab()
    expect(undoButton()).toBeEnabled()

    await user.click(undoButton())
    expect(docField()).toHaveValue(DOC)
    // One undo took the whole edit away.
    expect(undoButton()).toBeDisabled()
    await user.click(redoButton())
    expect(docField()).toHaveValue('Claims handling, as run today.')
  })

  it('cleared, is gone rather than empty: the sheet says there is none', async () => {
    renderApp(smallWorkspace(), { route: '/model' })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.clear(docField())
    await user.tab()
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.getByText('No documentation yet.')).toBeInTheDocument()
  })
})

describe('as a reader (#195)', () => {
  const sheet = (role: 'writer' | 'reader') =>
    renderScreenAs(role, new ModelStore(smallWorkspace()), {
      route: '/model',
      path: '/model',
      screen: <ModelScreen />,
    })
  const heading = () => screen.getByRole('heading', { level: 1, name: 'ArchiSurance' })

  it('cannot open edit mode: Edit is disabled', () => {
    sheet('reader')
    expect(heading()).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeDisabled()
  })

  it('leaves edit mode when the tab becomes a reader, so no field is left', async () => {
    const h = sheet('writer')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.getByRole('textbox', { name: 'Name' })).toBeInTheDocument()
    expect(docField()).toBeInTheDocument()
    h.as('reader')
    // Present first: the sheet is still there, as a reader's.
    expect(heading()).toBeInTheDocument()
    expect(screen.getByText(DOC)).toBeInTheDocument()
    expect(screen.queryAllByRole('textbox')).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Edit' })).toBeDisabled()
  })

  it('does not reopen edit mode when the tab can write again', async () => {
    const h = sheet('writer')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Edit' }))
    h.as('reader')
    h.as('writer')
    expect(screen.getByRole('button', { name: 'Edit' })).toBeEnabled()
    expect(screen.queryAllByRole('textbox')).toHaveLength(0)
  })
})
