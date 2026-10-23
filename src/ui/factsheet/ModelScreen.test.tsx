import { beforeEach, describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { smallWorkspace } from '@/test/fixtures'
import { renderApp } from '@/test/render'

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
