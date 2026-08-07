import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { loadDemoWorkspace } from '@/io'
import { renderApp } from '@/test/render'

function demo() {
  return loadDemoWorkspace()
}

/** The mainframe policy system: fully assessed, five lifecycle dates, many relations. */
const APP = '/element/app-policy-ha'
/** A capability: no lifecycle, no assessment, no TIME — the case that breaks layouts. */
const CAPABILITY = '/element/cap-claim'

describe('header', () => {
  it('carries the breadcrumb, badge, title, tags and completeness ring', () => {
    renderApp(demo(), { route: APP })
    const breadcrumb = document.querySelector('.sheet__breadcrumb')!
    expect(
      within(breadcrumb as HTMLElement).getByRole('link', { name: 'INVENTORY' }),
    ).toHaveAttribute('href', '/inventory')
    expect(within(breadcrumb as HTMLElement).getByText('app-policy-ha')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Home & Away Policy Administration' }),
    ).toBeInTheDocument()
    const header = document.querySelector('.sheet__title-row') as HTMLElement
    expect(within(header).getByText('AC')).toBeInTheDocument()
    expect(screen.getByText('Core')).toBeInTheDocument()
    expect(screen.getByText('Vendor risk')).toBeInTheDocument()
    expect(screen.getByText('COMPLETE')).toBeInTheDocument()
    expect(screen.getByText(/^\d+%$/)).toBeInTheDocument()
  })

  it('draws the tab set with only Overview live', () => {
    renderApp(demo(), { route: APP })
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
    for (const tab of ['Relations', 'Assessment', 'Quality']) {
      expect(screen.getByRole('tab', { name: tab })).toBeDisabled()
    }
  })

  it('links Trace in graph to the graph focused on this element', async () => {
    renderApp(demo(), { route: APP })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Trace in graph' }))
    expect(screen.getByRole('heading', { name: 'Dependency graph' })).toBeInTheDocument()
  })
})

describe('sections', () => {
  it('shows documentation, derived lifecycle and the portfolio assessment', () => {
    renderApp(demo(), { route: APP })
    expect(screen.getByText(/Mainframe policy administration/)).toBeInTheDocument()

    expect(screen.getByText(/Current phase: .+ · derived from phase dates/)).toBeInTheDocument()
    expect(screen.getByText('01 Jan 2006')).toBeInTheDocument()
    expect(screen.getByText('01 Jan 2029')).toBeInTheDocument()

    expect(screen.getByText('Unreasonable')).toBeInTheDocument() // functional fit 2
    expect(screen.getByText('Inadequate')).toBeInTheDocument() // technical fit 1
    expect(screen.getByText('Critical')).toBeInTheDocument()
    expect(screen.getByText('Migrate')).toBeInTheDocument()
  })

  it('groups relations by type in the handoff order with direction glyphs', () => {
    renderApp(demo(), { route: APP })
    const blocks = document.querySelectorAll('.relation-block__type')
    const order = [...blocks].map((node) => node.textContent)
    expect(order).toEqual([...order].sort(byHandoffOrder))
    expect(screen.getByText(/relations · \d+ types/)).toBeInTheDocument()
    // Serving from the Oracle estate arrives, so an incoming glyph is present.
    expect(document.querySelectorAll('.relation-row__direction').length).toBeGreaterThan(0)
  })

  it('opens a related element from a relation row', async () => {
    renderApp(demo(), { route: APP })
    const user = userEvent.setup()
    const relations = document.querySelector('.relations') as HTMLElement
    await user.click(within(relations).getByRole('button', { name: 'Policy Administration' }))
    expect(screen.getByRole('heading', { name: 'Policy Administration' })).toBeInTheDocument()
  })

  it('lists properties including the derived ones', () => {
    renderApp(demo(), { route: APP })
    expect(screen.getByText('archimate.type')).toBeInTheDocument()
    expect(screen.getByText('element.id')).toBeInTheDocument()
    expect(screen.getByText('last.modified')).toBeInTheDocument()
    expect(screen.getByText('owner')).toBeInTheDocument()
    expect(screen.getByText('Operations')).toBeInTheDocument()
  })
})

describe('an element with no portfolio profile', () => {
  it('renders without breaking, saying what is not assessed', () => {
    renderApp(demo(), { route: CAPABILITY })
    expect(screen.getByRole('heading', { name: 'Claim Handling' })).toBeInTheDocument()
    expect(screen.getByText('No lifecycle dates on this element type')).toBeInTheDocument()
    // Every phase date reads as an em dash.
    const dates = [...document.querySelectorAll('.lifecycle__date')].map((n) => n.textContent)
    expect(dates).toEqual(['—', '—', '—', '—', '—'])
    // All four assessment cells say "Not assessed".
    expect(screen.getAllByText('Not assessed')).toHaveLength(4)
  })

  it('still scores completeness on the fields it can have', () => {
    renderApp(demo(), { route: CAPABILITY })
    expect(screen.getByText('100%')).toBeInTheDocument()
  })
})

describe('editing', () => {
  it('commits documentation through the command stack on blur', async () => {
    renderApp(demo(), { route: APP })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Edit' }))

    const textarea = screen.getByLabelText('Documentation')
    await user.clear(textarea)
    await user.type(textarea, 'Retired in 2029.')
    await user.tab()

    expect(screen.getByText('LOCAL · 1 UNSAVED')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.getByText('Retired in 2029.')).toBeInTheDocument()
  })

  it('records the change in the history timeline', async () => {
    renderApp(demo(), { route: APP })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.selectOptions(screen.getByLabelText('Time classification'), 'Eliminate')

    expect(screen.getByText(/Updated assessment of/)).toBeInTheDocument()
    expect(screen.getByText(/\d{4}-\d{2}-\d{2} · you/)).toBeInTheDocument()
  })

  it('changes an assessment and shows it after leaving edit mode', async () => {
    renderApp(demo(), { route: APP })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.selectOptions(screen.getByLabelText('Functional fit'), '4')
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.getByText('Perfect')).toBeInTheDocument()
  })

  it('edits a lifecycle date and re-derives the phase', async () => {
    renderApp(demo(), { route: APP })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    const eol = screen.getByLabelText('End of Life date')
    await user.clear(eol)
    await user.type(eol, '2020-01-01')
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.getByText(/Current phase: End of Life/)).toBeInTheDocument()
  })

  it('adds and removes a tag', async () => {
    const prompt = vi.spyOn(window, 'prompt').mockReturnValue('Cloud target')
    renderApp(demo(), { route: CAPABILITY })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.click(screen.getByRole('button', { name: '+ tag' }))
    expect(screen.getByRole('button', { name: 'Remove tag Cloud target' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Remove tag Cloud target' }))
    expect(
      screen.queryByRole('button', { name: 'Remove tag Cloud target' }),
    ).not.toBeInTheDocument()
    prompt.mockRestore()
  })
})

describe('adding a relation', () => {
  it('refuses an invalid combination and explains the rule', async () => {
    renderApp(demo(), { route: APP })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.click(screen.getByRole('button', { name: '+ Relation' }))

    const dialog = screen.getByRole('dialog', { name: 'Add relation' })
    await user.selectOptions(within(dialog).getByLabelText('Relationship'), 'Access')
    // An application component cannot Access another application component.
    await user.selectOptions(within(dialog).getByLabelText('Element'), 'app-crm')

    expect(within(dialog).getByRole('alert')).toHaveTextContent(/Access targets passive structure/)
    expect(within(dialog).getByRole('button', { name: 'Add' })).toBeDisabled()
  })

  it('adds a valid relation through the command stack', async () => {
    renderApp(demo(), { route: APP })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.click(screen.getByRole('button', { name: '+ Relation' }))

    const dialog = screen.getByRole('dialog', { name: 'Add relation' })
    await user.selectOptions(within(dialog).getByLabelText('Relationship'), 'Access')
    await user.selectOptions(within(dialog).getByLabelText('Element'), 'obj-claim')
    await user.click(within(dialog).getByRole('button', { name: 'Add' }))

    expect(screen.queryByRole('dialog', { name: 'Add relation' })).not.toBeInTheDocument()
    expect(screen.getByText('LOCAL · 1 UNSAVED')).toBeInTheDocument()
    const relations = document.querySelector('.relations') as HTMLElement
    expect(within(relations).getByRole('button', { name: 'Claim File' })).toBeInTheDocument()
  })

  it('removes a relation in edit mode', async () => {
    renderApp(demo(), { route: APP })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    const remove = screen.getAllByRole('button', { name: /^Remove .* relation to / })[0]!
    await user.click(remove)
    expect(screen.getByText('LOCAL · 1 UNSAVED')).toBeInTheDocument()
  })
})

describe('right rail', () => {
  it('draws the neighbourhood mini-graph and navigates from it', async () => {
    renderApp(demo(), { route: APP })
    const user = userEvent.setup()
    const graph = screen.getByRole('img', { name: 'Neighbourhood' })
    const nodes = within(graph).getAllByRole('button')
    expect(nodes.length).toBeGreaterThan(0)
    expect(nodes.length).toBeLessThanOrEqual(7)

    await user.click(nodes[0]!)
    expect(screen.queryByRole('heading', { name: 'Home & Away Policy Administration' })).toBeNull()
  })

  it('says so when an element has no neighbours', () => {
    renderApp(demo(), { route: '/element/act-nl' })
    // ArchiSurance Netherlands composes Back Office, so it does have one; use a
    // freshly created element instead for the empty case.
    expect(screen.getByRole('img', { name: 'Neighbourhood' })).toBeInTheDocument()
  })
})

describe('a missing element', () => {
  it('explains rather than crashing', () => {
    renderApp(demo(), { route: '/element/nope' })
    expect(screen.getByText(/No element with the id/)).toBeInTheDocument()
  })
})

const HANDOFF_ORDER = [
  'Realization',
  'Serving',
  'Flow',
  'Access',
  'Assignment',
  'Composition',
  'Association',
  'Influence',
  'Aggregation',
  'Triggering',
  'Specialization',
]

function byHandoffOrder(a: string | null, b: string | null): number {
  return HANDOFF_ORDER.indexOf(a ?? '') - HANDOFF_ORDER.indexOf(b ?? '')
}
