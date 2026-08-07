import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { emptyWorkspace } from '@/model'
import { loadDemoWorkspace } from '@/io'
import { renderApp } from '@/test/render'
import { syntheticWorkspace } from '@/test/fixtures'
import { VIRTUALISE_ABOVE } from './InventoryTable'

function demo() {
  return loadDemoWorkspace()
}

function rows() {
  // Every table row is a button whose accessible name starts with its type code.
  return screen.getAllByRole('button').filter((node) => node.className.startsWith('table__row'))
}

function cards() {
  return screen.getAllByRole('button').filter((node) => node.className.startsWith('card'))
}

describe('inventory list', () => {
  it('lists every element with the handoff columns', () => {
    renderApp(demo())
    expect(screen.getByText('29 of 29 elements')).toBeInTheDocument()
    expect(rows()).toHaveLength(29)

    const header = screen.getByRole('row')
    for (const column of [
      'Element',
      'Type',
      'Lifecycle',
      'Fit F / T',
      'Crit.',
      'Time',
      'Complete',
    ]) {
      expect(within(header).getByText(column)).toBeInTheDocument()
    }
  })

  it('shows derived lifecycle, assessments and completeness per row', () => {
    renderApp(demo())
    const row = rows().find((node) => node.textContent?.includes('CRM System'))!
    expect(within(row).getByText('AC')).toBeInTheDocument()
    expect(within(row).getByText('Application Component')).toBeInTheDocument()
    expect(within(row).getByText('Active')).toBeInTheDocument()
    expect(within(row).getByText('High')).toBeInTheDocument()
    expect(within(row).getByText('Migrate')).toBeInTheDocument()
  })

  it('renders an element that carries no portfolio profile', () => {
    renderApp(demo())
    const row = rows().find((node) => node.textContent?.includes('Claim Handling'))!
    expect(within(row).getByText('Capability')).toBeInTheDocument()
    // Undated elements are Active, unassessed criticality shows an em dash.
    expect(within(row).getByText('Active')).toBeInTheDocument()
    expect(within(row).getAllByText('—').length).toBeGreaterThan(0)
  })

  it('opens the fact sheet when a row is clicked', async () => {
    renderApp(demo())
    const user = userEvent.setup()
    await user.click(rows().find((node) => node.textContent?.includes('Payment Gateway'))!)
    expect(screen.getByRole('heading', { name: 'Payment Gateway' })).toBeInTheDocument()
  })

  it('switches to cards and back', async () => {
    renderApp(demo())
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'CARDS' }))
    expect(cards()).toHaveLength(29)
    expect(screen.queryByRole('row')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'TABLE' }))
    expect(rows()).toHaveLength(29)
  })
})

describe('filtering', () => {
  it('filters by facet and updates the result line', async () => {
    renderApp(demo())
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /^Application 11$/ }))
    expect(screen.getByText('11 of 29 elements · 1 filter (AND)')).toBeInTheDocument()
    expect(rows()).toHaveLength(11)
  })

  it('ORs within a group and ANDs across groups', async () => {
    renderApp(demo())
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /^Application 11$/ }))
    await user.click(screen.getByRole('button', { name: /^Technology 4$/ }))
    expect(rows()).toHaveLength(15) // within the layer group, options OR

    await user.click(screen.getByRole('button', { name: /^Invest 4$/ }))
    // Now: (application OR technology) AND Invest.
    const names = rows().map((row) => row.textContent ?? '')
    expect(names).toHaveLength(4)
    expect(names.every((name) => name.includes('Invest'))).toBe(true)
  })

  it('switches to OR and NOT', async () => {
    renderApp(demo())
    const user = userEvent.setup()
    // Technology (4) and Invest (4 applications) are disjoint sets, so the three
    // modes give three visibly different answers over the same two facets.
    await user.click(screen.getByRole('button', { name: /^Technology 4$/ }))
    await user.click(screen.getByRole('button', { name: /^Invest 4$/ }))
    expect(rows()).toHaveLength(0) // AND: nothing is both

    await user.click(screen.getByRole('button', { name: 'OR' }))
    expect(screen.getByText(/2 filters \(OR\)/)).toBeInTheDocument()
    expect(rows()).toHaveLength(8)

    await user.click(screen.getByRole('button', { name: 'NOT' }))
    expect(rows()).toHaveLength(29 - 8)
    const remaining = rows().map((row) => row.textContent ?? '')
    expect(remaining.every((name) => !name.includes('Invest'))).toBe(true)
  })

  it('ANDs the name query on top of facets', async () => {
    renderApp(demo())
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /^Application 11$/ }))
    await user.type(screen.getByLabelText('Filter by name'), 'policy')
    // "Policy Administration" is a Capability, so the layer facet excludes it and
    // only the application named for a policy system survives.
    const names = rows().map((row) => row.textContent ?? '')
    expect(names).toHaveLength(1)
    expect(names[0]).toContain('Home & Away Policy Administration')
  })

  it('keeps facet counts global rather than co-filtered', async () => {
    renderApp(demo())
    const user = userEvent.setup()
    const technology = screen.getByRole('button', { name: /^Technology 4$/ })
    await user.click(screen.getByRole('button', { name: /^Application 11$/ }))
    // Selecting Application does not shrink the Technology count to zero.
    expect(technology).toHaveTextContent('4')
  })

  it('applies a saved search including its combinator', async () => {
    renderApp(demo())
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'OR' }))
    await user.click(screen.getByRole('button', { name: /End-of-life applications/ }))

    expect(screen.getByRole('button', { name: 'AND' })).toHaveAttribute('aria-pressed', 'true')
    const names = rows().map((row) => row.textContent ?? '')
    expect(names).toHaveLength(2)
    expect(names.some((name) => name.includes('Legal Aid Backoffice'))).toBe(true)
  })

  it('shows a chip per facet and removes one at a time', async () => {
    renderApp(demo())
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /^Application 11$/ }))
    await user.click(screen.getByRole('button', { name: /^Invest 4$/ }))
    expect(screen.getByRole('button', { name: 'Remove filter Layer app' })).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Remove filter Time classification Invest' }),
    )
    expect(screen.getByText(/1 filter \(AND\)/)).toBeInTheDocument()
    expect(rows()).toHaveLength(11)
  })

  it('clears facets and the query together', async () => {
    renderApp(demo())
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /^Application 11$/ }))
    await user.type(screen.getByLabelText('Filter by name'), 'crm')
    await user.click(screen.getByRole('button', { name: 'Clear' }))

    expect(screen.getByText('29 of 29 elements')).toBeInTheDocument()
    expect(screen.getByLabelText('Filter by name')).toHaveValue('')
  })

  it('says what to do when nothing matches', async () => {
    renderApp(demo())
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Filter by name'), 'zzzz')
    expect(screen.getByText(/No elements match this filter/)).toBeInTheDocument()
    expect(screen.getByText(/switch the combinator to OR/)).toBeInTheDocument()
  })
})

describe('filter state in the URL', () => {
  it('restores facets, combinator, query and view from a link', () => {
    renderApp(demo(), {
      route: '/inventory?q=policy&facets=layer:app&mode=OR&view=cards',
    })
    expect(screen.getByLabelText('Filter by name')).toHaveValue('policy')
    expect(screen.getByRole('button', { name: 'OR' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'CARDS' })).toHaveAttribute('aria-pressed', 'true')
    expect(cards()).toHaveLength(1)
  })

  it('ignores a nonsense mode rather than breaking the screen', () => {
    renderApp(demo(), { route: '/inventory?mode=XOR' })
    expect(screen.getByRole('button', { name: 'AND' })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('at 5,000 elements', () => {
  it('does not put the whole workspace in the DOM', () => {
    renderApp(syntheticWorkspace(5_000))
    expect(screen.getByText('5000 of 5000 elements')).toBeInTheDocument()
    // Virtualised above VIRTUALISE_ABOVE: the row count in the DOM is bounded by
    // the viewport, not by the model.
    expect(rows().length).toBeLessThan(VIRTUALISE_ABOVE)
  })

  it('renders small workspaces without the virtualiser', () => {
    renderApp(demo())
    expect(rows()).toHaveLength(29)
  })
})

describe('creating an element', () => {
  it('creates through the command stack and opens the fact sheet', async () => {
    renderApp(emptyWorkspace('ws-empty', 'Empty'))
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Load the demo workspace' }))
    await user.click(screen.getByRole('button', { name: '+ Element' }))

    await user.type(screen.getByLabelText(/Name/), 'Fraud Detection Service')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    expect(screen.getByRole('heading', { name: 'Fraud Detection Service' })).toBeInTheDocument()
    // One change for loading the demo, one for the new element.
    expect(screen.getByText('LOCAL · 2 UNSAVED')).toBeInTheDocument()
  })

  it('will not create an unnamed element', async () => {
    renderApp(demo())
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '+ Element' }))
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'New element' })).not.toBeInTheDocument()
  })
})
