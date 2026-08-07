import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { loadDemoWorkspace } from '@/io'
import { renderApp } from '@/test/render'
import { applyTheme } from '@/app/theme'
import { isTypingTarget } from './typing-target'

function demo() {
  return loadDemoWorkspace()
}

beforeEach(() => {
  applyTheme('light')
})

async function openPalette(user: ReturnType<typeof userEvent.setup>) {
  await user.keyboard('{Meta>}k{/Meta}')
  return screen.getByRole('dialog', { name: 'Command palette' })
}

describe('opening and closing', () => {
  it('opens from the header search button', async () => {
    renderApp(demo())
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Search elements, relations, actions/ }))
    expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument()
  })

  it('opens with ⌘K and with Ctrl+K', async () => {
    renderApp(demo())
    const user = userEvent.setup()
    await openPalette(user)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.keyboard('{Control>}k{/Control}')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('clears the query on reopen', async () => {
    renderApp(demo())
    const user = userEvent.setup()
    await openPalette(user)
    await user.keyboard('claim')
    expect(screen.getByRole('textbox')).toHaveValue('claim')

    await user.keyboard('{Escape}')
    await openPalette(user)
    expect(screen.getByRole('textbox')).toHaveValue('')
  })

  it('closes when the backdrop is clicked', async () => {
    const { container } = renderApp(demo())
    const user = userEvent.setup()
    await openPalette(user)
    const overlay = container.ownerDocument.querySelector('.palette-overlay')
    await user.click(overlay as Element)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('autofocuses the input', async () => {
    renderApp(demo())
    const user = userEvent.setup()
    await openPalette(user)
    expect(screen.getByRole('textbox')).toHaveFocus()
  })
})

describe('searching', () => {
  it('lists every element until a query narrows it', async () => {
    renderApp(demo())
    const user = userEvent.setup()
    await openPalette(user)
    expect(screen.getByText('29 elements indexed')).toBeInTheDocument()
    expect(screen.getAllByRole('option').length).toBeGreaterThan(29) // elements + actions

    await user.keyboard('claim')
    const names = screen.getAllByRole('option').map((row) => row.textContent ?? '')
    expect(names.some((name) => name.includes('Claim Handling'))).toBe(true)
    expect(names.some((name) => name.includes('Payment Gateway'))).toBe(false)
  })

  it('matches on type as well as name', async () => {
    renderApp(demo())
    const user = userEvent.setup()
    await openPalette(user)
    await user.keyboard('data object')
    const rows = screen.getAllByRole('option')
    expect(rows.length).toBe(4)
    expect(rows.every((row) => row.textContent?.includes('Data Object'))).toBe(true)
  })

  it('is case insensitive', async () => {
    renderApp(demo())
    const user = userEvent.setup()
    await openPalette(user)
    await user.keyboard('CRM')
    expect(screen.getAllByRole('option')[0]).toHaveTextContent('CRM System')
  })

  it('says so when nothing matches', async () => {
    renderApp(demo())
    const user = userEvent.setup()
    await openPalette(user)
    await user.keyboard('zzzz')
    expect(screen.getByText(/Nothing matches/)).toBeInTheDocument()
  })

  it('shows the type code badge and type name on each element row', async () => {
    renderApp(demo())
    const user = userEvent.setup()
    await openPalette(user)
    await user.keyboard('CRM System')
    const row = screen.getAllByRole('option')[0]!
    expect(within(row).getByText('AC')).toBeInTheDocument()
    expect(within(row).getByText('Application Component')).toBeInTheDocument()
  })
})

describe('running a result', () => {
  it('opens the top hit on Enter', async () => {
    renderApp(demo())
    const user = userEvent.setup()
    await openPalette(user)
    await user.keyboard('CRM System{Enter}')
    expect(screen.getByRole('heading', { name: 'CRM System' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens a hit on click', async () => {
    renderApp(demo())
    const user = userEvent.setup()
    await openPalette(user)
    await user.keyboard('Payment Gateway')
    await user.click(screen.getAllByRole('option')[0]!)
    expect(screen.getByRole('heading', { name: 'Payment Gateway' })).toBeInTheDocument()
  })

  it('walks the list with the arrow keys', async () => {
    renderApp(demo())
    const user = userEvent.setup()
    await openPalette(user)
    await user.keyboard('policy')

    const before = screen.getAllByRole('option')
    expect(before[0]).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowDown}')
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowUp}{ArrowUp}')
    // Wraps to the end rather than sticking at the top.
    const rows = screen.getAllByRole('option')
    expect(rows.at(-1)).toHaveAttribute('aria-selected', 'true')
  })

  it('offers actions below the element hits', async () => {
    renderApp(demo())
    const user = userEvent.setup()
    await openPalette(user)
    await user.keyboard('graph')
    const action = screen.getByRole('option', { name: /Go to graph/ })
    await user.click(action)
    expect(screen.getByRole('heading', { name: 'Dependency graph' })).toBeInTheDocument()
  })

  it('runs the theme action', async () => {
    renderApp(demo())
    const user = userEvent.setup()
    await openPalette(user)
    await user.keyboard('toggle theme')
    await user.click(screen.getByRole('option', { name: /Toggle theme/ }))
    expect(document.documentElement.dataset.theme).toBe('dark')
  })
})

describe('single-letter shortcuts', () => {
  it('jumps to the graph and back with g and i', async () => {
    renderApp(demo())
    const user = userEvent.setup()
    await user.keyboard('g')
    expect(screen.getByRole('heading', { name: 'Dependency graph' })).toBeInTheDocument()
    await user.keyboard('i')
    expect(screen.getByRole('heading', { name: 'Inventory' })).toBeInTheDocument()
  })

  it('does not navigate while the palette is open', async () => {
    renderApp(demo())
    const user = userEvent.setup()
    await openPalette(user)
    await user.keyboard('g')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveValue('g')
  })

  it('does not navigate while a text input has focus — the prototype gap', async () => {
    // A text field outside the palette: typing "graph" in it must not navigate.
    renderApp(demo())
    const user = userEvent.setup()
    const input = document.createElement('input')
    input.type = 'text'
    document.body.append(input)
    input.focus()

    await user.keyboard('graph')
    expect(screen.getByRole('heading', { name: 'Inventory' })).toBeInTheDocument()
    expect(input.value).toBe('graph')
    input.remove()
  })

  it('ignores modified keystrokes', async () => {
    renderApp(demo())
    const user = userEvent.setup()
    await user.keyboard('{Meta>}g{/Meta}')
    expect(screen.getByRole('heading', { name: 'Inventory' })).toBeInTheDocument()
  })
})

describe('isTypingTarget', () => {
  it('recognises the elements that swallow letters', () => {
    const text = document.createElement('input')
    const textarea = document.createElement('textarea')
    const select = document.createElement('select')
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    const range = document.createElement('input')
    range.type = 'range'
    // jsdom does not implement isContentEditable, so it is defined here directly.
    const editable = document.createElement('div')
    Object.defineProperty(editable, 'isContentEditable', { value: true })
    const button = document.createElement('button')

    expect(isTypingTarget(text)).toBe(true)
    expect(isTypingTarget(textarea)).toBe(true)
    expect(isTypingTarget(select)).toBe(true)
    expect(isTypingTarget(editable)).toBe(true)
    expect(isTypingTarget(checkbox)).toBe(false)
    expect(isTypingTarget(range)).toBe(false)
    expect(isTypingTarget(button)).toBe(false)
    expect(isTypingTarget(null)).toBe(false)
  })
})
